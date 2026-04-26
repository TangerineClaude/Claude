"""
Hermes Telegram Gateway

A private Telegram bot that routes every message through HermesAgent.
Only responds to user IDs listed in TELEGRAM_ALLOWED_USERS — everyone
else receives "Access denied."

Required env vars:
  TELEGRAM_BOT_TOKEN      from @BotFather
  TELEGRAM_ALLOWED_USERS  comma-separated Telegram user IDs, e.g. "123456789"

Optional:
  OPENAI_API_KEY          enables voice memo transcription via Whisper
"""

import asyncio
import base64
import logging
import mimetypes
import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from core import HermesAgent

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BOT_TOKEN: str = os.environ.get("TELEGRAM_BOT_TOKEN", "")

ALLOWED_USERS: set[int] = {
    int(uid.strip())
    for uid in os.environ.get("TELEGRAM_ALLOWED_USERS", "").split(",")
    if uid.strip().isdigit()
}

OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")

# Initialised in main() so startup errors are clearly visible
agent: HermesAgent | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_allowed(update: Update) -> bool:
    if not ALLOWED_USERS:
        logger.warning("TELEGRAM_ALLOWED_USERS is empty — bot is open to everyone!")
        return True
    return (update.effective_user is not None) and (update.effective_user.id in ALLOWED_USERS)


def _agent_ready() -> bool:
    return agent is not None


def _session_id(update: Update) -> str:
    """Stable session key per Telegram user — persists conversation memory."""
    return f"tg-{update.effective_user.id}"


async def _send_long(update: Update, text: str) -> None:
    """Send a reply, splitting into ≤4096-char chunks (Telegram's limit)."""
    limit = 4096
    for i in range(0, max(len(text), 1), limit):
        await update.message.reply_text(text[i : i + limit])


async def _transcribe_voice(file_path: str) -> str:
    """Transcribe a .ogg voice file using OpenAI Whisper API."""
    if not OPENAI_API_KEY:
        return "[Voice transcription unavailable — set OPENAI_API_KEY in .env to enable it]"
    try:
        import openai
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        with open(file_path, "rb") as f:
            result = await client.audio.transcriptions.create(model="whisper-1", file=f)
        logger.info("Voice transcribed: %d chars", len(result.text))
        return result.text
    except Exception as exc:
        logger.error("Transcription failed: %s", exc)
        return f"[Transcription error: {exc}]"


def _build_image_blocks(file_path: str, caption: str | None) -> list:
    """Build a Claude content-block list that includes a base64 image."""
    mime = mimetypes.guess_type(file_path)[0] or "image/jpeg"
    with open(file_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    return [
        {"type": "image", "source": {"type": "base64", "media_type": mime, "data": b64}},
        {"type": "text", "text": caption or "Describe this image and offer any relevant analysis."},
    ]


# ---------------------------------------------------------------------------
# Command handlers
# ---------------------------------------------------------------------------

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_allowed(update):
        await update.message.reply_text("Access denied.")
        return
    await update.message.reply_text(
        "✅ Hermes is online.\n\n"
        "Send me any message — text, voice memo, photo, or file.\n\n"
        "Commands:\n"
        "/clear  — wipe conversation memory\n"
        "/status — show session info\n"
        "/tools  — list enabled tools"
    )


async def cmd_clear(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_allowed(update):
        await update.message.reply_text("Access denied.")
        return
    agent.clear_session(_session_id(update))
    await update.message.reply_text("🗑 Conversation memory cleared.")


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_allowed(update):
        await update.message.reply_text("Access denied.")
        return
    info = agent.session_info(_session_id(update))
    lines = [
        f"Session: {info['session_id']}",
        f"Messages: {info['message_count']}",
    ]
    if info.get("channels_used"):
        lines.append(f"Channels used: {', '.join(info['channels_used'])}")
    if info.get("last_activity"):
        import datetime
        ts = datetime.datetime.fromtimestamp(info["last_activity"], tz=datetime.timezone.utc)
        lines.append(f"Last activity: {ts.strftime('%Y-%m-%d %H:%M UTC')}")
    await update.message.reply_text("\n".join(lines))


async def cmd_tools(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_allowed(update):
        await update.message.reply_text("Access denied.")
        return
    enabled = agent.tools.list_enabled()
    if enabled:
        await update.message.reply_text(
            "🔧 Enabled tools:\n" + "\n".join(f"  • {t}" for t in enabled)
        )
    else:
        await update.message.reply_text(
            "No optional tools enabled.\n"
            "Add EXA_API_KEY or FIRECRAWL_API_KEY to .env to enable them."
        )


# ---------------------------------------------------------------------------
# Message handlers
# ---------------------------------------------------------------------------

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_allowed(update):
        await update.message.reply_text("Access denied.")
        return
    if not _agent_ready():
        await update.message.reply_text("Agent not ready — check server logs.")
        return

    await context.bot.send_chat_action(update.effective_chat.id, ChatAction.TYPING)

    result = agent.process(message=update.message.text, session_id=_session_id(update))
    await _send_long(update, result.message)


async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_allowed(update):
        await update.message.reply_text("Access denied.")
        return

    await context.bot.send_chat_action(update.effective_chat.id, ChatAction.TYPING)

    tg_file = await context.bot.get_file(update.message.voice.file_id)
    with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        await tg_file.download_to_drive(tmp_path)
        transcript = await _transcribe_voice(tmp_path)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    await update.message.reply_text(f'🎤 Transcribed: "{transcript}"')

    result = agent.process(message=transcript, session_id=_session_id(update))
    await _send_long(update, result.message)


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_allowed(update):
        await update.message.reply_text("Access denied.")
        return

    await context.bot.send_chat_action(update.effective_chat.id, ChatAction.UPLOAD_PHOTO)

    # Telegram gives multiple resolutions; take the largest
    photo = update.message.photo[-1]
    tg_file = await context.bot.get_file(photo.file_id)
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        await tg_file.download_to_drive(tmp_path)
        blocks = _build_image_blocks(tmp_path, update.message.caption)
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    result = agent.process(message=blocks, session_id=_session_id(update))
    await _send_long(update, result.message)


async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_allowed(update):
        await update.message.reply_text("Access denied.")
        return

    await context.bot.send_chat_action(update.effective_chat.id, ChatAction.TYPING)

    doc = update.message.document
    filename = doc.file_name or "file"
    mime = doc.mime_type or "application/octet-stream"

    _TEXT_MIMES = {"text/", "application/json", "application/xml", "application/javascript"}
    _TEXT_EXTS = {".txt", ".md", ".py", ".js", ".ts", ".json", ".yaml", ".yml", ".csv", ".log", ".sh"}
    is_text = (
        any(mime.startswith(m) for m in _TEXT_MIMES)
        or Path(filename).suffix.lower() in _TEXT_EXTS
    )

    if is_text and doc.file_size and doc.file_size <= 500_000:
        tg_file = await context.bot.get_file(doc.file_id)
        suffix = Path(filename).suffix or ".txt"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp_path = tmp.name
        try:
            await tg_file.download_to_drive(tmp_path)
            file_content = Path(tmp_path).read_text(errors="replace")[:12_000]
        finally:
            Path(tmp_path).unlink(missing_ok=True)

        caption = update.message.caption or f"Analyse this file: '{filename}'"
        message = f"{caption}\n\n```\n{file_content}\n```"
    else:
        caption = update.message.caption or ""
        message = (
            f"The user sent a file: {filename} (type: {mime}, "
            f"size: {doc.file_size or '?'} bytes). "
            + (f"Caption: {caption}. " if caption else "")
            + "Acknowledge receipt and let them know if they should send a plain-text file."
        )

    result = agent.process(message=message, session_id=_session_id(update))
    await _send_long(update, result.message)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    global agent

    # ── Pre-flight checks ────────────────────────────────────────────────────
    errors = []
    if not BOT_TOKEN:
        errors.append("TELEGRAM_BOT_TOKEN is missing — get it from @BotFather and add to .env")

    provider = os.environ.get("HERMES_PROVIDER", "anthropic").lower()
    if provider == "gemini" and not os.environ.get("GEMINI_API_KEY"):
        errors.append("GEMINI_API_KEY is missing — get a free key from aistudio.google.com")
    elif provider == "openrouter" and not os.environ.get("OPENROUTER_API_KEY"):
        errors.append("OPENROUTER_API_KEY is missing — get it from openrouter.ai")
    elif provider == "anthropic" and not os.environ.get("ANTHROPIC_API_KEY"):
        errors.append("ANTHROPIC_API_KEY is missing — get it from console.anthropic.com")

    if errors:
        print("\n❌ Cannot start — fix these issues in your .env file:\n")
        for e in errors:
            print(f"  • {e}")
        print()
        raise SystemExit(1)

    if not ALLOWED_USERS:
        logger.warning(
            "TELEGRAM_ALLOWED_USERS is empty — the bot will respond to anyone. "
            "Set it to your Telegram user ID to make this private."
        )

    # ── Initialise agent ─────────────────────────────────────────────────────
    try:
        agent = HermesAgent()
        logger.info("Agent ready — provider=%s model=%s", agent.provider, agent.model)
    except Exception as exc:
        print(f"\n❌ Failed to initialise agent: {exc}\n")
        raise SystemExit(1)

    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("clear", cmd_clear))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("tools", cmd_tools))

    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.add_handler(MessageHandler(filters.VOICE, handle_voice))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_document))

    logger.info(
        "Hermes Telegram Gateway started. Allowed users: %s",
        ALLOWED_USERS if ALLOWED_USERS else "ALL (no restriction!)",
    )
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
