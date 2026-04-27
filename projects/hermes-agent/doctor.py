"""
hermes doctor — diagnose your Hermes Agent installation.

Run: python doctor.py
"""

import importlib.util
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE = Path(__file__).parent
ENV_FILE = BASE / ".env"

PASS = "✅"
FAIL = "❌"
WARN = "⚠️ "

issues: list[str] = []
warnings: list[str] = []


def check(label: str, ok: bool, fix: str, warn_only: bool = False) -> None:
    if ok:
        print(f"  {PASS}  {label}")
    else:
        sym = WARN if warn_only else FAIL
        print(f"  {sym}  {label}")
        print(f"        Fix: {fix}")
        if warn_only:
            warnings.append(label)
        else:
            issues.append(label)


# ---------------------------------------------------------------------------
# 1. Python version
# ---------------------------------------------------------------------------
print("\n── Python ──────────────────────────────────────────────────────────")
ver = sys.version_info
check(
    f"Python {ver.major}.{ver.minor}.{ver.micro}",
    ver >= (3, 11),
    "Install Python 3.11 or newer: https://python.org/downloads",
)

# ---------------------------------------------------------------------------
# 2. Required packages
# ---------------------------------------------------------------------------
print("\n── Packages ────────────────────────────────────────────────────────")
REQUIRED_PACKAGES = {
    "anthropic": "anthropic",
    "fastapi": "fastapi",
    "telegram": "python-telegram-bot",
    "openai": "openai",
    "google.generativeai": "google-generativeai",
    "dotenv": "python-dotenv",
    "pydantic": "pydantic",
}
for import_name, pip_name in REQUIRED_PACKAGES.items():
    installed = importlib.util.find_spec(import_name) is not None
    check(
        f"{pip_name}",
        installed,
        f"pip install {pip_name}   (or: pip install -r requirements.txt)",
    )

# ---------------------------------------------------------------------------
# 3. .env file
# ---------------------------------------------------------------------------
print("\n── Configuration (.env) ────────────────────────────────────────────")
check(
    ".env file exists",
    ENV_FILE.exists(),
    "cp .env.example .env   then fill in your keys",
)

# Load env vars
env_vars: dict[str, str] = {}
if ENV_FILE.exists():
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env_vars[k.strip()] = v.strip()
    # Also load into os.environ for API tests below
    for k, v in env_vars.items():
        if k not in os.environ:
            os.environ[k] = v

provider = env_vars.get("HERMES_PROVIDER", os.environ.get("HERMES_PROVIDER", "anthropic")).lower()
check(
    f"HERMES_PROVIDER={provider}",
    provider in ("anthropic", "openrouter", "gemini"),
    "Set HERMES_PROVIDER to one of: anthropic, openrouter, gemini",
)

bot_token = env_vars.get("TELEGRAM_BOT_TOKEN", "")
check(
    "TELEGRAM_BOT_TOKEN is set",
    bool(bot_token),
    "Message @BotFather on Telegram → /newbot → copy the token into .env",
)

allowed = env_vars.get("TELEGRAM_ALLOWED_USERS", "")
check(
    "TELEGRAM_ALLOWED_USERS is set",
    bool(allowed),
    "Message @userinfobot on Telegram to get your user ID, add it to .env",
    warn_only=True,
)

# Provider-specific key
if provider == "gemini":
    gemini_key = env_vars.get("GEMINI_API_KEY", "")
    check(
        "GEMINI_API_KEY is set",
        bool(gemini_key),
        "Go to aistudio.google.com → Get API key → paste into .env",
    )
elif provider == "openrouter":
    or_key = env_vars.get("OPENROUTER_API_KEY", "")
    check(
        "OPENROUTER_API_KEY is set",
        bool(or_key),
        "Go to openrouter.ai → Dashboard → Keys → Create Key → paste into .env",
    )
elif provider == "anthropic":
    ant_key = env_vars.get("ANTHROPIC_API_KEY", "")
    check(
        "ANTHROPIC_API_KEY is set",
        bool(ant_key),
        "Go to console.anthropic.com → API Keys → Create Key → paste into .env",
    )

# ---------------------------------------------------------------------------
# 4. Telegram token connectivity test
# ---------------------------------------------------------------------------
print("\n── Telegram connectivity ────────────────────────────────────────────")
if bot_token:
    try:
        url = f"https://api.telegram.org/bot{bot_token}/getMe"
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read())
        bot_name = data["result"].get("username", "?")
        check(f"Bot token valid — @{bot_name}", True, "")
    except urllib.error.HTTPError as e:
        check(
            "Bot token valid",
            False,
            "Token is invalid or revoked. Go to @BotFather → /revoke → get a new token → update .env",
        )
    except Exception as e:
        check("Telegram reachable", False, f"Network error: {e}")
else:
    print(f"  {WARN}  Skipped — no bot token set")

# ---------------------------------------------------------------------------
# 5. AI provider connectivity test
# ---------------------------------------------------------------------------
print(f"\n── AI provider ({provider}) ────────────────────────────────────────")
if provider == "gemini":
    gemini_key = env_vars.get("GEMINI_API_KEY", "") or os.environ.get("GEMINI_API_KEY", "")
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel("gemini-2.0-flash")
            resp = model.generate_content("Reply with just the word: OK")
            check("Gemini API key valid and reachable", "OK" in resp.text or len(resp.text) > 0, "")
        except Exception as e:
            check(
                "Gemini API key valid",
                False,
                f"Key may be invalid or revoked ({e}). "
                "Go to aistudio.google.com → delete old key → Get API key → update .env",
            )
    else:
        print(f"  {WARN}  Skipped — no Gemini key set")

elif provider == "openrouter":
    or_key = env_vars.get("OPENROUTER_API_KEY", "") or os.environ.get("OPENROUTER_API_KEY", "")
    if or_key:
        try:
            req = urllib.request.Request(
                "https://openrouter.ai/api/v1/models",
                headers={"Authorization": f"Bearer {or_key}"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                check("OpenRouter API key valid", resp.status == 200, "")
        except Exception as e:
            check("OpenRouter API key valid", False, f"Key may be invalid: {e}")
    else:
        print(f"  {WARN}  Skipped — no OpenRouter key set")

elif provider == "anthropic":
    ant_key = env_vars.get("ANTHROPIC_API_KEY", "") or os.environ.get("ANTHROPIC_API_KEY", "")
    if ant_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=ant_key)
            client.models.list()
            check("Anthropic API key valid", True, "")
        except Exception as e:
            check(
                "Anthropic API key valid",
                False,
                f"Key may be invalid: {e}. Check console.anthropic.com",
            )
    else:
        print(f"  {WARN}  Skipped — no Anthropic key set")

# ---------------------------------------------------------------------------
# 6. Summary
# ---------------------------------------------------------------------------
print("\n── Summary ─────────────────────────────────────────────────────────")
if not issues:
    print(f"\n  {PASS}  All checks passed — run the bot with:\n")
    print("      python telegram_gateway.py\n")
else:
    print(f"\n  {FAIL}  {len(issues)} issue(s) must be fixed before the bot can start:\n")
    for i, issue in enumerate(issues, 1):
        print(f"    {i}. {issue}")
    print()

if warnings:
    print(f"  {WARN}  {len(warnings)} warning(s) (bot can run, but review these):\n")
    for w in warnings:
        print(f"    • {w}")
    print()
