"""Run ILA moderation locally without AWS deployment."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


LAMBDA_DIR = Path(__file__).resolve().parents[1] / "lambda-functions" / "analysis-lambda"
sys.path.insert(0, str(LAMBDA_DIR))

from moderation import fallback, normalize  # noqa: E402
from ollama_client import OllamaError, call_ollama  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Moderate text with ILA and a local or hosted Ollama endpoint.")
    parser.add_argument("text", help="Text to moderate")
    parser.add_argument("--url", default=os.environ.get("OLLAMA_URL", "http://localhost:11434/api/chat"))
    parser.add_argument("--model", default=os.environ.get("OLLAMA_MODEL", "llama3.1:8b"))
    parser.add_argument("--timeout", type=float, default=float(os.environ.get("OLLAMA_TIMEOUT_SECONDS", "15")))
    parser.add_argument(
        "--mock",
        choices=["approved", "rejected", "review"],
        help="Exercise normalization without contacting Ollama (for demos/tests).",
    )
    args = parser.parse_args()

    if args.mock:
        categories = ["harassment"] if args.mock == "rejected" else []
        raw = {
            "decision": args.mock,
            "confidence": 0.95 if args.mock != "review" else 0.5,
            "categories": categories,
            "severity": "medium" if args.mock != "approved" else "low",
            "reason": "Synthetic local demonstration result.",
            "escalate": args.mock == "review",
        }
        result = normalize(raw, float(os.environ.get("CONFIDENCE_THRESHOLD", "0.70")))
    else:
        try:
            response = call_ollama(
                args.text,
                url=args.url,
                model=args.model,
                api_key=os.environ.get("OLLAMA_API_KEY", ""),
                timeout_seconds=args.timeout,
            )
            result = normalize(response, float(os.environ.get("CONFIDENCE_THRESHOLD", "0.70")))
        except (OllamaError, ValueError) as exc:
            print(f"Moderation service unavailable ({type(exc).__name__}); returning fail-safe result.", file=sys.stderr)
            result = fallback()

    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
