# OpenClaw — macOS Big Sur Setup Guide

**Target machine:** iMac Late 2014 · macOS Big Sur 11.7.11 · Intel x86_64 · 8 GB RAM  
**LLM backend:** OpenRouter (https://openrouter.ai/api/v1)  
**Constraints:** No Docker, no guaranteed Homebrew bottles

---

## ⚠️ STOP: Read All Warnings Before Running Anything

### WARNING 1 — Intel Mac Compatibility (HIGH RISK)

Recent OpenClaw releases have shipped as **arm64-only** native binaries and may
crash on Intel Macs. Your 2014 iMac is Intel x86\_64.

**What this means:**
- If OpenClaw is distributed purely as a prebuilt native macOS app, you cannot
  run it on your machine at all without a source build.
- If it is distributed as an npm package (JavaScript + Node.js), the Node.js
  runtime handles the architecture and this concern goes away at the JS layer.
  Any native add-ons bundled inside the package could still be arm64-only.

**Before running `npm install`, verify:**

```bash
npm pack openclaw --dry-run 2>&1 | grep -i arch
```

or check the package's published `package.json` for `cpu` / `os` fields:

```bash
npm info openclaw cpu os engines
```

If the output shows `arm64` only (and no `x64`), **stop here** — the npm
package will refuse to install on your machine.

---

### WARNING 2 — Node.js 22 on macOS Big Sur (MODERATE RISK)

OpenClaw requires **Node.js 22.16 or higher** (it uses ES2024 features and
native Fetch API streaming; Node 18 and Node 20 cause runtime failures).

Node.js 22 officially targets macOS 11.0+ as a build minimum, but there is a
known GitHub issue (#58427) where the Node 22 installer rejects Big Sur at
runtime. The pre-built binary *may* work, but it is not guaranteed.

**Mitigation:** Install via NVM and compile from source if the binary fails.
Source compilation on an 8 GB machine takes roughly 30–60 minutes and requires
Xcode Command Line Tools.

---

### WARNING 3 — Xcode Command Line Tools Required

NVM and source builds both require `xcode-select`. If you have not installed
CLT, the very first step will fail.

```bash
# Check if already installed:
xcode-select -p
# Expected output: /Library/Developer/CommandLineTools
```

If that path is missing, run (and wait for the GUI installer to finish):

```bash
xcode-select --install
```

Do not proceed past this step until `xcode-select -p` returns a valid path.

---

### WARNING 4 — Homebrew Bottles Are Unreliable on Big Sur

Big Sur is end-of-life. Homebrew no longer ships pre-built bottles for it.
Formulae fall back to compiling from source, which often fails on EOL systems.
**Do not use Homebrew for Node.js.** Use NVM instead (covered below).

---

## Step 1 — Verify Xcode Command Line Tools

Run this on your Mac:

```bash
xcode-select -p
```

**Expected:** `/Library/Developer/CommandLineTools`

If missing:
```bash
xcode-select --install
# A GUI dialog will appear. Click Install and wait (~5 minutes).
# Then verify again:
xcode-select -p
```

**Do not continue past here if this fails.**

---

## Step 2 — Install NVM

NVM (Node Version Manager) installs Node.js into your home directory and does
not rely on Homebrew bottles.

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

After the script finishes, reload your shell config. On Big Sur the default
shell is zsh:

```bash
source ~/.zshrc
```

If you use bash instead:
```bash
source ~/.bash_profile
```

Verify NVM is active:

```bash
nvm --version
# Expected: something like 0.39.7
```

**Do not continue if `nvm: command not found`.**  
If that happens: open a new Terminal window and try again. If still failing,
check that `~/.zshrc` (or `~/.bash_profile`) contains these lines and re-source:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

---

## Step 3 — Install Node.js 22 via NVM

### Attempt A — Pre-built binary (fast, try this first)

```bash
nvm install 22.16.0
nvm use 22.16.0
node --version
```

Expected: `v22.16.0`

If `node --version` prints the right version, skip Attempt B.

### Attempt B — Compile from source (if binary fails)

This takes 30–60 minutes. Your machine must stay awake the whole time.

```bash
nvm install -s 22.16.0
nvm use 22.16.0
node --version
```

**If source compilation fails with linker errors:** Node 22 may not be buildable
on Big Sur's SDK. In that case this entire setup is blocked at the OS level and
an OS upgrade is the only solution.

### Make Node 22 the default

```bash
nvm alias default 22.16.0
```

---

## Step 4 — Verify Architecture Compatibility

Before installing OpenClaw, check that the npm package supports Intel (x64):

```bash
npm info openclaw cpu os engines
```

If the `cpu` field shows only `arm64` and not `x64`, **stop here** and report
the output — the package will not install on your machine.

If the field is empty or includes `x64`, continue.

---

## Step 5 — Install OpenClaw

```bash
npm install -g openclaw
```

Verify:

```bash
openclaw --version
```

If you get `command not found` after a successful install, NVM's global bin
directory may not be in your PATH. Fix:

```bash
export PATH="$(npm bin -g):$PATH"
# Then add that export line to your ~/.zshrc to persist it.
```

---

## Step 6 — Configure OpenClaw for OpenRouter

OpenClaw has built-in OpenRouter support. Configuration is done via environment
variables or an interactive setup wizard.

### Option A — Setup wizard (recommended for first run)

```bash
openclaw setup
```

When prompted for provider, select **OpenRouter**. You will need:
- Your OpenRouter API key (from https://openrouter.ai/keys)
- A model identifier in the format `openrouter/<author>/<slug>`, e.g.
  `openrouter/anthropic/claude-3.5-sonnet`

### Option B — Environment variable configuration

Find where OpenClaw stores its config:

```bash
openclaw --config-path 2>/dev/null || echo "check ~/.config/openclaw or ~/.openclaw"
```

Then set the following in your shell (and in the launchd plist below):

```
OPENCLAW_LLM_PROVIDER=openrouter
OPENCLAW_OPENROUTER_API_KEY=<your-key-here>
OPENCLAW_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENCLAW_MODEL=openrouter/anthropic/claude-3.5-sonnet
```

Exact variable names may differ — run `openclaw --help` or check
`openclaw config --list` for the authoritative list.

---

## Step 7 — Test OpenClaw Runs

Before creating the persistent service, confirm it starts:

```bash
openclaw start
```

Open your browser to:

```
http://127.0.0.1:18789
```

If you see the OpenClaw dashboard, the service is working. Stop it with
`Ctrl-C` before proceeding to the next step.

---

## Step 8 — Create the launchd Plist (Persistent Service)

This makes OpenClaw start at login and restart automatically on crash.

### 8a — Find the full path to the `openclaw` binary

```bash
which openclaw
```

Copy the output (e.g. `/Users/yourname/.nvm/versions/node/v22.16.0/bin/openclaw`).
You will paste it into the plist below.

### 8b — Create the plist file

Replace `YOUR_USERNAME`, `BINARY_PATH`, and `YOUR_OPENROUTER_KEY` with real
values. Open a text editor and save the file at exactly this path:

```
~/Library/LaunchAgents/ai.openclaw.service.plist
```

Contents:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.service</string>

    <key>ProgramArguments</key>
    <array>
        <string>/Users/YOUR_USERNAME/.nvm/versions/node/v22.16.0/bin/openclaw</string>
        <string>start</string>
    </array>

    <key>EnvironmentVariables</key>
    <dict>
        <key>HOME</key>
        <string>/Users/YOUR_USERNAME</string>
        <key>PATH</key>
        <string>/Users/YOUR_USERNAME/.nvm/versions/node/v22.16.0/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>OPENCLAW_LLM_PROVIDER</key>
        <string>openrouter</string>
        <key>OPENCLAW_OPENROUTER_API_KEY</key>
        <string>YOUR_OPENROUTER_KEY</string>
        <key>OPENCLAW_OPENROUTER_BASE_URL</key>
        <string>https://openrouter.ai/api/v1</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/Users/YOUR_USERNAME/Library/Logs/openclaw.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/YOUR_USERNAME/Library/Logs/openclaw.error.log</string>
</dict>
</plist>
```

### 8c — Load the service

```bash
launchctl load ~/Library/LaunchAgents/ai.openclaw.service.plist
```

### 8d — Verify it started

```bash
launchctl list | grep openclaw
```

A PID number in the first column means it is running. A dash (`-`) means it
failed to start — check the log:

```bash
tail -50 ~/Library/Logs/openclaw.error.log
```

---

## Managing the Service

| Action | Command |
|--------|---------|
| Stop | `launchctl unload ~/Library/LaunchAgents/ai.openclaw.service.plist` |
| Start | `launchctl load ~/Library/LaunchAgents/ai.openclaw.service.plist` |
| View logs | `tail -f ~/Library/Logs/openclaw.log` |
| View errors | `tail -f ~/Library/Logs/openclaw.error.log` |
| Reload after config change | unload then load |

---

## Access OpenClaw in Your Browser

Once the service is running, open:

```
http://127.0.0.1:18789
```

This address is bound to localhost only — it is not accessible from other
devices on your network.

---

## If It Doesn't Work

### Node.js 22 binary fails on Big Sur
→ Try source compilation: `nvm install -s 22.16.0`

### npm package rejects your architecture
→ The current OpenClaw release does not support Intel Macs. Check the
  OpenClaw GitHub releases page for an older version that includes x64 support,
  or wait for an updated release.

### launchd service starts then immediately exits
→ `tail ~/Library/Logs/openclaw.error.log` — most likely a missing env var or
  wrong binary path in the plist.

### Port 18789 not reachable
→ Confirm the process is running: `lsof -i :18789`

---

*Guide generated for: iMac Late 2014 · macOS Big Sur 11.7.11 · Intel x86\_64*
