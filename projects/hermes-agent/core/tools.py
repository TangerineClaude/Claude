"""
Tool registry — lets Claude call external APIs mid-conversation.

Built-in (always on):
  get_datetime   current UTC time

Optional (enabled when env var is set):
  web_search     Exa AI web search      — requires EXA_API_KEY
  scrape_url     Firecrawl page scrape  — requires FIRECRAWL_API_KEY
"""

import json
import logging
import os
import urllib.request
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Executors
# ---------------------------------------------------------------------------

def _web_search(query: str, num_results: int = 5) -> str:
    payload = json.dumps({
        "query": query,
        "numResults": min(max(num_results, 1), 10),
        "contents": {"text": {"maxCharacters": 800}},
    }).encode()
    req = urllib.request.Request(
        "https://api.exa.ai/search",
        data=payload,
        headers={
            "x-api-key": os.environ["EXA_API_KEY"],
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
    results = data.get("results", [])
    if not results:
        return "No results found."
    lines = []
    for r in results:
        lines.append(f"**{r.get('title', 'Untitled')}**  {r.get('url', '')}")
        lines.append(r.get("text", "")[:600])
        lines.append("")
    return "\n".join(lines).strip()


def _scrape_url(url: str) -> str:
    payload = json.dumps({"url": url, "formats": ["markdown"]}).encode()
    req = urllib.request.Request(
        "https://api.firecrawl.dev/v1/scrape",
        data=payload,
        headers={
            "Authorization": f"Bearer {os.environ['FIRECRAWL_API_KEY']}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    content = data.get("data", {}).get("markdown", "")
    return content[:8000] if content else "No content could be scraped from that URL."


def _get_datetime(_: dict) -> str:
    return datetime.now(timezone.utc).strftime("UTC %Y-%m-%d %H:%M:%S (%A)")


# ---------------------------------------------------------------------------
# Claude tool schema definitions
# ---------------------------------------------------------------------------

_SCHEMAS: dict[str, dict] = {
    "web_search": {
        "name": "web_search",
        "description": (
            "Search the web for current information using Exa AI. "
            "Use for news, recent events, or facts that may have changed."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "num_results": {
                    "type": "integer",
                    "description": "Number of results to return (1-10)",
                    "default": 5,
                },
            },
            "required": ["query"],
        },
    },
    "scrape_url": {
        "name": "scrape_url",
        "description": "Fetch and return the full markdown content of a web page.",
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "Full URL to scrape"},
            },
            "required": ["url"],
        },
    },
    "get_datetime": {
        "name": "get_datetime",
        "description": "Get the current UTC date and time.",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
}

_EXECUTORS = {
    "web_search": lambda inp: _web_search(inp["query"], inp.get("num_results", 5)),
    "scrape_url": lambda inp: _scrape_url(inp["url"]),
    "get_datetime": _get_datetime,
}


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

class ToolRegistry:
    """Manages available tools and executes them on Claude's behalf."""

    def __init__(self):
        self._enabled: set[str] = {"get_datetime"}
        if os.environ.get("EXA_API_KEY"):
            self._enabled.add("web_search")
            logger.info("Tool enabled: web_search (Exa)")
        if os.environ.get("FIRECRAWL_API_KEY"):
            self._enabled.add("scrape_url")
            logger.info("Tool enabled: scrape_url (Firecrawl)")

    def get_claude_tools(self) -> list[dict]:
        return [_SCHEMAS[n] for n in self._enabled if n in _SCHEMAS]

    def execute(self, tool_name: str, tool_input: dict) -> str:
        if tool_name not in self._enabled:
            return f"Tool '{tool_name}' is not enabled."
        executor = _EXECUTORS.get(tool_name)
        if not executor:
            return f"No executor registered for '{tool_name}'."
        try:
            result = executor(tool_input)
            logger.info("Tool executed: %s", tool_name)
            return result
        except Exception as exc:
            logger.error("Tool %s failed: %s", tool_name, exc)
            return f"Tool error: {exc}"

    def list_enabled(self) -> list[str]:
        return sorted(self._enabled)
