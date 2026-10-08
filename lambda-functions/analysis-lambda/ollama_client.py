"""Small standard-library client for Ollama's chat API."""

from __future__ import annotations

import json
import socket
import urllib.error
import urllib.request
from typing import Any

from moderation import SYSTEM_PROMPT, build_user_message


class OllamaError(RuntimeError):
    """Base class for safe, expected Ollama failures."""


class OllamaTimeoutError(OllamaError):
    """The Ollama request exceeded its configured timeout."""


class OllamaHTTPError(OllamaError):
    """Ollama returned a non-success HTTP response."""


class OllamaNetworkError(OllamaError):
    """Ollama could not be reached."""


def call_ollama(text: str, *, url: str, model: str, api_key: str = "", timeout_seconds: float = 15.0) -> dict[str, Any]:
    """Call Ollama deterministically and return its decoded response envelope."""
    payload = {
        "model": model, "stream": False, "format": "json",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_message(text)},
        ],
        "options": {"temperature": 0, "seed": 0},
    }
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    request = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            body = response.read()
    except (TimeoutError, socket.timeout) as exc:
        raise OllamaTimeoutError("Ollama request timed out.") from exc
    except urllib.error.HTTPError as exc:
        raise OllamaHTTPError(f"Ollama returned HTTP {exc.code}.") from exc
    except urllib.error.URLError as exc:
        if isinstance(exc.reason, (TimeoutError, socket.timeout)):
            raise OllamaTimeoutError("Ollama request timed out.") from exc
        raise OllamaNetworkError("Ollama could not be reached.") from exc
    except OSError as exc:
        raise OllamaNetworkError("Ollama could not be reached.") from exc
    if not body:
        raise OllamaError("Ollama returned an empty response body.")
    try:
        decoded = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise OllamaError("Ollama returned an invalid JSON response body.") from exc
    if not isinstance(decoded, dict):
        raise OllamaError("Ollama response body was not a JSON object.")
    return decoded
