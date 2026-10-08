import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

from sympy import content

import boto3

s3 = boto3.client("s3")
secrets = boto3.client("secretsmanager")
events = boto3.client("events")

OLLAMA_URL = os.environ.get("OLLAMA_URL", "https://ollama.com/api/chat")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama2-7b-chat")
SECRET_NAME = os.environ.get("OLLAMA_SECRET_NAME", "ila/ollama_api_key")
EVENT_BUS_NAME = os.environ.get("EVENT_BUS_NAME", "ila-event-bus")

MAX_CHARS = 4000
CONFIDENCE_THRESH = 0.7

SEVERE = {"rape_threats", "child_abuse"}
HIGH = {"self_harm", "animal_abuse"}
ALWAYS_REJECT = SEVERE | HIGH

SYSTEM_PROMPT = """
You are a content moderation classifier. Your job is to analyze the following content and determine if it violates platform policy. 

Check for these categories (use description):

- Misinformation: false, inaccurate, or misleading information that is spread without any malicious intent to decieve or cause harm.
- Spams or scams: the practice of sending mass, unwanted messages to cast a wide net and deliver a fradulent trap.
- Hate speech: attempts or intention to vilify, humiliate, or incite hatred against an individual or group based on protected characterestics like gender, sexual orientation, race, ethinicity, or religion.
- Bullying or harassment: involve repeated, unwelcome behavior meant to intimidate, humiliate, or harm a person.
- Violence: communicated intent to inflict harm, fear, or damage against someone.
- Sexually explict content: material describing or depicting sexual acts, sexual conducts, sexual innuendos, or intimate body parts in a direct, graphic, or detailed manner, meant to create nuisance.
- Rape threats: SEVERE. Always route to "rejected" with max confidence if detected, and flag for immediate human escalation.
- Child Abuse: SEVERE. Always route to "rejected" with max confidence if detected, and flag for immediate human escalation and mandatory reporting review.
- Self-harm content: HIGH. Content depicting, encouraging, or providing
methods for self-harm or suicide. Always route to "rejected" with max confidence if detected, and flag for immediate human escalation.
- Animal abuse: HIGH. Content depicting or encouraging cruelty or harm to animals. Always route to "rejected" with max confidence if detected, and flag for immediate human escalation.

Content to analyse: wrapped in <content> tags.

Respond ONLY with valid JSON in this exact format, nothing else:
{
"decision": "approved" | "rejected" | "review",
"confidence": <float 0.0 to 1.0>,
"categories": [<list of violated categories, empty if none>],
"severity": "low" | "medium" | "high" | "severe",
"reason": "<one sentence explanation>",
"escalate": <true | false>
}

Rules:

- Rape threats and Child Abuse (SEVERE), and Self-harm content and Animal abuse (HIGH): if detected even with partial confidence, set decision="rejected" and escalate=true — never route these to "review" or "approved" regardless of ambiguity.
- Before categorizing, conduct a basic sentiment analysis & gain insights regarding intended sarcasm, hyperbole, or satire.
- If content violates one or more categories with high confidence → “rejected”
- If content is within guardrails → “approved”
- If content is ambiguous, borderline → “review”
- Never guess. If unsure between:
    - “rejected” and “review” → “rejected”
    - “approved” and “review” → “approved”
    - “rejected” and “approved” → “review”
"""

_api_key_cache = None

def get_api_key():
    ...

def extract_text():
    ...

def call_ollama(text):
    ...

def fallback(reason):
    ...

def normalize(raw_text):
    ...

def moderate_object(bucket, key):
    ...

def publish(bucket, key, result):
    ...

def lambda_handler(event, context):
    ...