"""Minimal local HTTP adapter for the Lambda API handlers.

This server is for local development only. Production uses API Gateway via template.yaml.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace


LAMBDA_DIR = Path(__file__).resolve().parents[1] / "lambda-functions" / "analysis-lambda"
sys.path.insert(0, str(LAMBDA_DIR))

import index  # noqa: E402


class ApiHandler(BaseHTTPRequestHandler):
    server_version = "ILADevAPI/1.0"

    def _send_lambda_response(self, response: dict) -> None:
        status = int(response.get("statusCode", 500))
        body = str(response.get("body", ""))
        encoded = body.encode("utf-8")
        self.send_response(status)
        for name, value in response.get("headers", {}).items():
            self.send_header(name, str(value))
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _event(self, method: str, body: str | None = None) -> dict:
        event = {
            "version": "2.0",
            "rawPath": self.path.split("?", 1)[0],
            "requestContext": {"http": {"method": method, "path": self.path}},
            "headers": {name.lower(): value for name, value in self.headers.items()},
        }
        if body is not None:
            event["body"] = body
        return event

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", os.environ["API_ALLOWED_ORIGIN"])
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        context = SimpleNamespace(aws_request_id=str(uuid.uuid4()))
        self._send_lambda_response(index.lambda_handler(self._event("GET"), context))

    def do_POST(self) -> None:  # noqa: N802
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        max_bytes = index._positive_int("MAX_CHARS", 8000) * 4 + 4096
        if length > max_bytes:
            self._send_lambda_response(index._http_response(413, {
                "error": "content_too_large",
                "message": "Request body exceeds the local API limit.",
            }))
            return
        body = self.rfile.read(length).decode("utf-8", errors="replace")
        context = SimpleNamespace(aws_request_id=str(uuid.uuid4()))
        self._send_lambda_response(index.lambda_handler(self._event("POST", body), context))

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write(f"[ILA API] {self.address_string()} {fmt % args}\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run ILA's frontend API locally.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()

    os.environ.setdefault("OLLAMA_URL", "http://localhost:11434/api/chat")
    os.environ.setdefault("OLLAMA_MODEL", "llama3.1:8b")
    os.environ.setdefault("OLLAMA_AUTH_MODE", "none")
    os.environ.setdefault("EVENT_BUS_NAME", "")
    os.environ.setdefault("PUBLISH_HTTP_EVENTS", "false")
    os.environ.setdefault("API_ALLOWED_ORIGIN", "http://localhost:5173")

    server = ThreadingHTTPServer((args.host, args.port), ApiHandler)
    print(f"ILA local API listening on http://{args.host}:{args.port}")
    print("Routes: GET /api/health, POST /api/moderate")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nILA local API stopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
