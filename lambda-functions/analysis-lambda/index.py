"""AWS Lambda entry point for ILA content moderation."""

from __future__ import annotations

import csv
import base64
import io
import json
import logging
import math
import os
import urllib.parse
from datetime import datetime, timezone
from typing import Any

import boto3

from moderation import FALLBACK_REASON, ModelResponseError, fallback as safe_fallback
from moderation import normalize as normalize_result
from ollama_client import OllamaError, call_ollama as request_ollama


LOGGER = logging.getLogger(__name__)
try:
    LOGGER.setLevel(os.environ.get("LOG_LEVEL", "INFO").upper())
except ValueError:
    LOGGER.setLevel(logging.INFO)
SUPPORTED_EXTENSIONS = {".txt", ".json", ".csv"}

_api_key_cache: str | None = None
_clients: dict[str, Any] = {}
_last_ollama_status = "unknown"
_last_ollama_checked_at: str | None = None


class BadEventError(ValueError):
    """The Lambda event does not contain a usable S3 record."""


class UnsupportedObjectError(ValueError):
    """The S3 object cannot be converted to supported text."""


class EmptyContentError(ValueError):
    """The S3 object contains no useful text."""


class S3ObjectError(RuntimeError):
    """The configured S3 object could not be read."""


class SecretRetrievalError(RuntimeError):
    """The configured API key could not be retrieved."""


class EventPublishError(RuntimeError):
    """EventBridge rejected the moderation result."""


def _client(service: str) -> Any:
    if service not in _clients:
        _clients[service] = boto3.client(service)
    return _clients[service]


def _positive_int(name: str, default: int) -> int:
    try:
        value = int(os.environ.get(name, str(default)))
    except ValueError:
        LOGGER.warning("invalid_integer_config name=%s using_default=%d", name, default)
        return default
    return value if value > 0 else default


def _threshold() -> float:
    try:
        value = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.70"))
    except ValueError:
        LOGGER.warning("invalid_confidence_threshold using_default=0.70")
        return 0.70
    if not math.isfinite(value):
        LOGGER.warning("invalid_confidence_threshold using_default=0.70")
        return 0.70
    return max(0.0, min(1.0, value))


def get_api_key() -> str:
    """Retrieve and warm-execution-cache the Ollama API key."""
    global _api_key_cache
    auth_mode = os.environ.get("OLLAMA_AUTH_MODE", "secrets_manager").strip().lower()
    if auth_mode == "none":
        return ""
    if auth_mode == "environment":
        local_key = os.environ.get("OLLAMA_API_KEY", "").strip()
        if not local_key:
            raise SecretRetrievalError("OLLAMA_API_KEY is not configured for environment authentication.")
        return local_key
    if auth_mode != "secrets_manager":
        raise SecretRetrievalError("OLLAMA_AUTH_MODE must be secrets_manager, environment, or none.")
    if _api_key_cache is not None:
        return _api_key_cache
    secret_name = os.environ.get("OLLAMA_SECRET_NAME", "ila/ollama_api_key").strip()
    if not secret_name:
        raise SecretRetrievalError("OLLAMA_SECRET_NAME is not configured.")
    try:
        response = _client("secretsmanager").get_secret_value(SecretId=secret_name)
        value = response.get("SecretString")
        if value is None and response.get("SecretBinary") is not None:
            binary = response["SecretBinary"]
            value = binary.decode("utf-8") if isinstance(binary, bytes) else str(binary)
    except Exception as exc:
        LOGGER.error("secret_retrieval_failed secret_name=%s error_type=%s", secret_name, type(exc).__name__)
        raise SecretRetrievalError("Unable to retrieve the Ollama API key.") from exc
    if not isinstance(value, str) or not value.strip():
        raise SecretRetrievalError("The Ollama secret is empty.")
    value = value.strip()
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        parsed = None
    if isinstance(parsed, dict):
        value = str(parsed.get("api_key", "")).strip()
    if not value:
        raise SecretRetrievalError("The Ollama secret does not contain api_key.")
    _api_key_cache = value
    return value


def _json_strings(value: Any) -> list[str]:
    """Collect human-readable string values from a JSON document."""
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        result: list[str] = []
        for child in value.values():
            result.extend(_json_strings(child))
        return result
    if isinstance(value, list):
        result = []
        for child in value:
            result.extend(_json_strings(child))
        return result
    return []


def extract_text(bucket: str, key: str) -> str:
    """Read a supported S3 object and return bounded UTF-8 text."""
    extension = os.path.splitext(key)[1].lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise UnsupportedObjectError(f"Unsupported file type: {extension or 'none'}.")
    max_chars = _positive_int("MAX_CHARS", 8000)
    max_bytes = max_chars * 4
    try:
        response = _client("s3").get_object(Bucket=bucket, Key=key)
    except Exception as exc:
        raise S3ObjectError("Unable to read the S3 object.") from exc
    body = response.get("Body")
    if body is None:
        raise EmptyContentError("S3 returned an object without a body.")
    raw = body.read(max_bytes + 1)
    if len(raw) > max_bytes:
        LOGGER.info("content_truncated bucket=%s key=%s max_chars=%d", bucket, key, max_chars)
        raw = raw[:max_bytes]
    text = raw.decode("utf-8-sig", errors="replace")
    if extension == ".json":
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError as exc:
            raise UnsupportedObjectError("The JSON object is malformed.") from exc
        text = "\n".join(part for part in _json_strings(parsed) if part.strip())
    elif extension == ".csv":
        try:
            rows = csv.reader(io.StringIO(text))
            text = "\n".join(" | ".join(cell for cell in row if cell.strip()) for row in rows)
        except csv.Error as exc:
            raise UnsupportedObjectError("The CSV object is malformed.") from exc
    text = text.strip()
    if not text:
        raise EmptyContentError("The object contains no textual content.")
    return text[:max_chars]


def call_ollama(text: str) -> dict[str, Any]:
    """Call the configured Ollama endpoint using the cached secret."""
    try:
        timeout_seconds = float(os.environ.get("OLLAMA_TIMEOUT_SECONDS", "15"))
    except ValueError:
        timeout_seconds = 15.0
    return request_ollama(
        text,
        url=os.environ.get("OLLAMA_URL", "https://ollama.com/api/chat"),
        model=os.environ.get("OLLAMA_MODEL", "llama3.1:8b"),
        api_key=get_api_key(),
        timeout_seconds=max(0.1, timeout_seconds),
    )


def fallback(reason: str = FALLBACK_REASON) -> dict[str, Any]:
    return safe_fallback(reason)


def normalize(raw_response: Any) -> dict[str, Any]:
    return normalize_result(raw_response, _threshold())


def _set_ollama_status(status: str) -> None:
    global _last_ollama_status, _last_ollama_checked_at
    _last_ollama_status = status
    _last_ollama_checked_at = datetime.now(timezone.utc).isoformat()


def moderate_text(text: str) -> dict[str, Any]:
    """Moderate bounded text using the same model and normalization path for every transport."""
    try:
        raw = call_ollama(text)
        result = normalize(raw)
        _set_ollama_status("online")
        LOGGER.info(
            "moderation_completed channel=direct decision=%s severity=%s confidence=%.3f",
            result["decision"], result["severity"], result["confidence"],
        )
        return result
    except SecretRetrievalError as exc:
        _set_ollama_status("misconfigured")
        LOGGER.error("moderation_unavailable channel=direct error_type=%s", type(exc).__name__)
        return fallback()
    except OllamaError as exc:
        _set_ollama_status("offline")
        LOGGER.error("moderation_unavailable channel=direct error_type=%s", type(exc).__name__)
        return fallback()
    except (ModelResponseError, ValueError) as exc:
        _set_ollama_status("error")
        LOGGER.error("moderation_invalid_response channel=direct error_type=%s", type(exc).__name__)
        return fallback()
    except Exception as exc:
        _set_ollama_status("error")
        LOGGER.exception("moderation_unexpected_error channel=direct error_type=%s", type(exc).__name__)
        return fallback()


def moderate_object(bucket: str, key: str) -> dict[str, Any]:
    """Extract, classify, and normalize one S3 object, failing safely."""
    try:
        text = extract_text(bucket, key)
        LOGGER.info("content_extracted bucket=%s key=%s chars=%d", bucket, key, len(text))
        return moderate_text(text)
    except (EmptyContentError, UnsupportedObjectError) as exc:
        LOGGER.warning("content_referred_for_review bucket=%s key=%s reason_type=%s", bucket, key, type(exc).__name__)
        return fallback(f"Content could not be analyzed: {exc}")
    except S3ObjectError as exc:
        LOGGER.error("s3_read_failed bucket=%s key=%s error_type=%s", bucket, key, type(exc).__name__)
        return fallback("Content could not be retrieved; human review required.")
    except Exception as exc:
        LOGGER.exception("moderation_unexpected_error bucket=%s key=%s error_type=%s", bucket, key, type(exc).__name__)
        return fallback()


def publish(bucket: str, key: str, result: dict[str, Any]) -> dict[str, Any]:
    """Publish a sanitized, structured ModerationResult to EventBridge."""
    detail = {
        "bucket": bucket, "key": key, "decision": result["decision"],
        "confidence": result["confidence"], "categories": result["categories"],
        "severity": result["severity"], "reason": result["reason"],
        "escalate": result["escalate"], "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    entry = {
        "Source": "ila.moderation", "DetailType": "ModerationResult",
        "Detail": json.dumps(detail, separators=(",", ":")),
        "EventBusName": os.environ.get("EVENT_BUS_NAME", "ila-event-bus"),
    }
    try:
        response = _client("events").put_events(Entries=[entry])
    except Exception as exc:
        LOGGER.error("event_publish_failed bucket=%s key=%s error_type=%s", bucket, key, type(exc).__name__)
        raise EventPublishError("Unable to publish the moderation result.") from exc
    if not isinstance(response, dict) or response.get("FailedEntryCount", 0):
        LOGGER.error("event_publish_rejected bucket=%s key=%s", bucket, key)
        raise EventPublishError("EventBridge rejected the moderation result.")
    LOGGER.info("event_published bucket=%s key=%s", bucket, key)
    return detail


def publish_http(request_id: str, result: dict[str, Any]) -> dict[str, Any]:
    """Publish an HTTP-origin result without storing or emitting the submitted content."""
    detail = {
        "channel": "http",
        "requestId": request_id,
        "decision": result["decision"],
        "confidence": result["confidence"],
        "categories": result["categories"],
        "severity": result["severity"],
        "reason": result["reason"],
        "escalate": result["escalate"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    entry = {
        "Source": "ila.moderation",
        "DetailType": "ModerationResult",
        "Detail": json.dumps(detail, separators=(",", ":")),
        "EventBusName": os.environ.get("EVENT_BUS_NAME", "ila-event-bus"),
    }
    try:
        response = _client("events").put_events(Entries=[entry])
    except Exception as exc:
        LOGGER.error("event_publish_failed channel=http error_type=%s", type(exc).__name__)
        raise EventPublishError("Unable to publish the moderation result.") from exc
    if not isinstance(response, dict) or response.get("FailedEntryCount", 0):
        raise EventPublishError("EventBridge rejected the moderation result.")
    LOGGER.info("event_published channel=http request_id=%s", request_id)
    return detail


def _http_response(status_code: int, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": os.environ.get("API_ALLOWED_ORIGIN", "http://localhost:5173"),
            "Vary": "Origin",
        },
        "body": json.dumps(payload),
    }


def _http_request(event: dict[str, Any]) -> tuple[str, str]:
    request_context = event.get("requestContext", {})
    http_context = request_context.get("http", {}) if isinstance(request_context, dict) else {}
    method = str(http_context.get("method") or event.get("httpMethod") or "").upper()
    path = str(event.get("rawPath") or event.get("path") or "/")
    return method, path.rstrip("/") or "/"


def _is_http_event(event: Any) -> bool:
    if not isinstance(event, dict):
        return False
    request_context = event.get("requestContext")
    return "httpMethod" in event or (
        isinstance(request_context, dict) and isinstance(request_context.get("http"), dict)
    )


def _parse_http_content(event: dict[str, Any]) -> str:
    body = event.get("body")
    if not isinstance(body, str):
        raise ValueError("Request body must be a JSON object.")
    if event.get("isBase64Encoded") is True:
        try:
            body = base64.b64decode(body, validate=True).decode("utf-8")
        except (ValueError, UnicodeDecodeError) as exc:
            raise ValueError("Request body is not valid base64-encoded UTF-8.") from exc
    try:
        payload = json.loads(body)
    except json.JSONDecodeError as exc:
        raise ValueError("Request body must contain valid JSON.") from exc
    if not isinstance(payload, dict) or not isinstance(payload.get("content"), str):
        raise ValueError("Request JSON must contain a string field named content.")
    return payload["content"]


def http_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Serve the synchronous frontend API through API Gateway HTTP API."""
    method, path = _http_request(event)
    if method == "GET" and path.endswith("/api/health"):
        auth_mode = os.environ.get("OLLAMA_AUTH_MODE", "secrets_manager").strip().lower()
        configured = bool(os.environ.get("OLLAMA_URL", "").strip() and os.environ.get("OLLAMA_MODEL", "").strip())
        if auth_mode == "secrets_manager":
            configured = configured and bool(os.environ.get("OLLAMA_SECRET_NAME", "").strip())
        elif auth_mode == "environment":
            configured = configured and bool(os.environ.get("OLLAMA_API_KEY", "").strip())
        elif auth_mode != "none":
            configured = False
        return _http_response(200, {
            "status": "ok",
            "api": True,
            "ollamaConfigured": configured,
            "ollamaStatus": _last_ollama_status,
            "lastOllamaCheck": _last_ollama_checked_at,
            "eventPipeline": "configured" if os.environ.get("EVENT_BUS_NAME", "").strip() else "not_configured",
            "maxChars": _positive_int("MAX_CHARS", 8000),
        })
    if method == "POST" and path.endswith("/api/moderate"):
        try:
            content = _parse_http_content(event)
        except ValueError as exc:
            return _http_response(400, {"error": "invalid_request", "message": str(exc)})
        if not content.strip():
            return _http_response(400, {"error": "empty_content", "message": "Content must not be empty."})
        max_chars = _positive_int("MAX_CHARS", 8000)
        if len(content) > max_chars:
            return _http_response(413, {
                "error": "content_too_large",
                "message": f"Content exceeds the {max_chars}-character limit.",
                "maxChars": max_chars,
            })
        result = moderate_text(content.strip())
        if os.environ.get("PUBLISH_HTTP_EVENTS", "true").strip().lower() == "true":
            request_id = getattr(context, "aws_request_id", "unknown")
            try:
                publish_http(request_id, result)
            except EventPublishError as exc:
                return _http_response(502, {
                    "error": "event_publish_failed",
                    "message": str(exc),
                    "result": result,
                })
        return _http_response(200, result)
    return _http_response(404, {"error": "not_found", "message": "API route not found."})


def _s3_records(event: Any) -> list[tuple[str, str]]:
    if not isinstance(event, dict) or not isinstance(event.get("Records"), list) or not event["Records"]:
        raise BadEventError("Expected a non-empty S3 Records array.")
    records: list[tuple[str, str]] = []
    for record in event["Records"]:
        try:
            bucket = record["s3"]["bucket"]["name"]
            encoded_key = record["s3"]["object"]["key"]
        except (KeyError, TypeError) as exc:
            raise BadEventError("An S3 record is missing its bucket or object key.") from exc
        if not isinstance(bucket, str) or not bucket.strip() or not isinstance(encoded_key, str) or not encoded_key:
            raise BadEventError("An S3 record contains an empty bucket or object key.")
        records.append((bucket, urllib.parse.unquote_plus(encoded_key)))
    return records


def lambda_handler(event: Any, context: Any) -> dict[str, Any]:
    """Handle one or more S3 records and report per-object moderation status."""
    request_id = getattr(context, "aws_request_id", "unknown")
    LOGGER.info("invocation_started request_id=%s", request_id)
    if _is_http_event(event):
        return http_handler(event, context)
    try:
        records = _s3_records(event)
    except BadEventError as exc:
        LOGGER.warning("bad_event request_id=%s reason=%s", request_id, exc)
        return {"statusCode": 400, "body": json.dumps({"error": "invalid_s3_event", "message": str(exc)})}
    outcomes = []
    publish_failed = False
    for bucket, key in records:
        LOGGER.info("s3_object_identified bucket=%s key=%s", bucket, key)
        result = moderate_object(bucket, key)
        outcome: dict[str, Any] = {"bucket": bucket, "key": key, **result}
        try:
            publish(bucket, key, result)
            outcome["published"] = True
        except EventPublishError as exc:
            outcome["published"] = False
            outcome["publish_error"] = str(exc)
            publish_failed = True
        outcomes.append(outcome)
    if publish_failed:
        # S3 invokes Lambda asynchronously; raising is required for Lambda retry/DLQ handling.
        raise EventPublishError("One or more moderation results could not be published.")
    return {"statusCode": 200, "body": json.dumps({"processed": len(outcomes), "results": outcomes})}
