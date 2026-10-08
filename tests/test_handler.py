from __future__ import annotations

import io
import json
from types import SimpleNamespace

import index
from ollama_client import OllamaNetworkError


SAFE_RESULT = {
    "decision": "approved",
    "confidence": 0.98,
    "categories": [],
    "severity": "low",
    "reason": "No violation detected.",
    "escalate": False,
}


class FakeS3:
    def __init__(self, body):
        self.body = body

    def get_object(self, **kwargs):
        return {"Body": io.BytesIO(self.body)}


class FakeEvents:
    def __init__(self):
        self.entries = []

    def put_events(self, Entries):
        self.entries.extend(Entries)
        return {"FailedEntryCount": 0, "Entries": [{"EventId": "event-1"}]}


def test_empty_content_fails_safely(monkeypatch):
    monkeypatch.setitem(index._clients, "s3", FakeS3(b"  "))
    result = index.moderate_object("bucket", "empty.txt")
    assert result["decision"] == "review"
    assert result["escalate"] is True


def test_s3_error_fails_safely(monkeypatch):
    class BrokenS3:
        def get_object(self, **kwargs):
            raise RuntimeError("simulated S3 failure")

    monkeypatch.setitem(index._clients, "s3", BrokenS3())
    result = index.moderate_object("bucket", "missing.txt")
    assert result["decision"] == "review"
    assert result["reason"] == "Content could not be retrieved; human review required."


def test_malformed_ollama_json_fails_safely(monkeypatch):
    monkeypatch.setattr(index, "extract_text", lambda *_: "hello")
    monkeypatch.setattr(index, "call_ollama", lambda *_: {"message": {"content": "not-json"}})
    result = index.moderate_object("bucket", "item.txt")
    assert result["decision"] == "review"
    assert result["confidence"] == 0.0


def test_json_object_extracts_nested_text(monkeypatch):
    payload = json.dumps({"title": "Hello", "items": [{"body": "World"}], "count": 2}).encode()
    monkeypatch.setitem(index._clients, "s3", FakeS3(payload))
    assert index.extract_text("bucket", "post.json") == "Hello\nWorld"


def test_malformed_s3_event_returns_400():
    response = index.lambda_handler({"Records": [{"not_s3": {}}]}, SimpleNamespace(aws_request_id="test"))
    assert response["statusCode"] == 400
    assert json.loads(response["body"])["error"] == "invalid_s3_event"


def test_eventbridge_payload_has_routing_fields_and_no_content(monkeypatch):
    events = FakeEvents()
    monkeypatch.setitem(index._clients, "events", events)
    monkeypatch.setenv("EVENT_BUS_NAME", "test-bus")
    detail = index.publish("input-bucket", "folder/post.txt", SAFE_RESULT)
    entry = events.entries[0]
    wire_detail = json.loads(entry["Detail"])
    assert entry["Source"] == "ila.moderation"
    assert entry["DetailType"] == "ModerationResult"
    assert entry["EventBusName"] == "test-bus"
    assert wire_detail == detail
    assert set(detail) == {"bucket", "key", "decision", "confidence", "categories", "severity", "reason", "escalate", "timestamp"}
    assert "content" not in detail


def test_handler_decodes_key_and_publishes(monkeypatch):
    seen = {}
    events = FakeEvents()

    def moderate(bucket, key):
        seen.update(bucket=bucket, key=key)
        return SAFE_RESULT

    monkeypatch.setattr(index, "moderate_object", moderate)
    monkeypatch.setitem(index._clients, "events", events)
    event = {"Records": [{"s3": {"bucket": {"name": "input"}, "object": {"key": "folder%2Fhello+world.txt"}}}]}
    response = index.lambda_handler(event, SimpleNamespace(aws_request_id="test"))
    assert response["statusCode"] == 200
    assert seen == {"bucket": "input", "key": "folder/hello world.txt"}
    assert json.loads(response["body"])["results"][0]["published"] is True


def test_handler_raises_when_eventbridge_publish_fails(monkeypatch):
    class BrokenEvents:
        def put_events(self, Entries):
            return {"FailedEntryCount": 1, "Entries": [{"ErrorCode": "InternalFailure"}]}

    monkeypatch.setattr(index, "moderate_object", lambda *_: SAFE_RESULT)
    monkeypatch.setitem(index._clients, "events", BrokenEvents())
    event = {"Records": [{"s3": {"bucket": {"name": "input"}, "object": {"key": "post.txt"}}}]}
    try:
        index.lambda_handler(event, SimpleNamespace(aws_request_id="test"))
    except index.EventPublishError as exc:
        assert "could not be published" in str(exc)
    else:
        raise AssertionError("EventBridge failure must raise so Lambda can retry")


def test_secret_json_is_cached(monkeypatch):
    class Secrets:
        calls = 0

        def get_secret_value(self, **kwargs):
            self.calls += 1
            return {"SecretString": '{"api_key":"top-secret"}'}

    secrets = Secrets()
    monkeypatch.setattr(index, "_api_key_cache", None)
    monkeypatch.setitem(index._clients, "secretsmanager", secrets)
    assert index.get_api_key() == "top-secret"
    assert index.get_api_key() == "top-secret"
    assert secrets.calls == 1


def http_event(method, path, body=None):
    event = {
        "version": "2.0",
        "rawPath": path,
        "requestContext": {"http": {"method": method, "path": path}},
    }
    if body is not None:
        event["body"] = json.dumps(body)
    return event


def test_http_health_is_honest_about_unchecked_ollama(monkeypatch):
    monkeypatch.setattr(index, "_last_ollama_status", "unknown")
    monkeypatch.setattr(index, "_last_ollama_checked_at", None)
    monkeypatch.setenv("OLLAMA_URL", "http://localhost:11434/api/chat")
    monkeypatch.setenv("OLLAMA_MODEL", "test-model")
    monkeypatch.setenv("OLLAMA_AUTH_MODE", "none")
    response = index.lambda_handler(http_event("GET", "/api/health"), SimpleNamespace(aws_request_id="test"))
    payload = json.loads(response["body"])
    assert response["statusCode"] == 200
    assert payload["api"] is True
    assert payload["ollamaConfigured"] is True
    assert payload["ollamaStatus"] == "unknown"


def test_http_moderation_reuses_normalized_backend_and_publishes(monkeypatch):
    events = FakeEvents()
    monkeypatch.setattr(index, "moderate_text", lambda text: SAFE_RESULT)
    monkeypatch.setitem(index._clients, "events", events)
    monkeypatch.setenv("PUBLISH_HTTP_EVENTS", "true")
    response = index.lambda_handler(
        http_event("POST", "/api/moderate", {"content": "Hello world"}),
        SimpleNamespace(aws_request_id="request-123"),
    )
    assert response["statusCode"] == 200
    assert json.loads(response["body"]) == SAFE_RESULT
    detail = json.loads(events.entries[0]["Detail"])
    assert detail["channel"] == "http"
    assert detail["requestId"] == "request-123"
    assert "content" not in detail


def test_http_rejects_empty_and_oversized_content(monkeypatch):
    empty = index.lambda_handler(
        http_event("POST", "/api/moderate", {"content": "   "}),
        SimpleNamespace(aws_request_id="test"),
    )
    monkeypatch.setenv("MAX_CHARS", "4")
    large = index.lambda_handler(
        http_event("POST", "/api/moderate", {"content": "12345"}),
        SimpleNamespace(aws_request_id="test"),
    )
    assert empty["statusCode"] == 400
    assert json.loads(empty["body"])["error"] == "empty_content"
    assert large["statusCode"] == 413
    assert json.loads(large["body"])["error"] == "content_too_large"


def test_http_ollama_failure_returns_fail_safe_review(monkeypatch):
    monkeypatch.setenv("PUBLISH_HTTP_EVENTS", "false")
    monkeypatch.setattr(index, "call_ollama", lambda *_: (_ for _ in ()).throw(OllamaNetworkError("offline")))
    response = index.lambda_handler(
        http_event("POST", "/api/moderate", {"content": "Test content"}),
        SimpleNamespace(aws_request_id="test"),
    )
    payload = json.loads(response["body"])
    assert response["statusCode"] == 200
    assert payload["decision"] == "review"
    assert payload["escalate"] is True
    assert index._last_ollama_status == "offline"
