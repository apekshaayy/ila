"""Test configuration that imports the Lambda source directory directly."""

from __future__ import annotations

import sys
from pathlib import Path


LAMBDA_DIR = Path(__file__).resolve().parents[1] / "lambda-functions" / "analysis-lambda"
sys.path.insert(0, str(LAMBDA_DIR))
