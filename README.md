# Claudition

**AI mock interviews that copy a real company's hiring process, run locally on your own Claude Code subscription.**

You enter a company, a role, your experience level, the job description and your resume. Claudition sends research agents to find how that company actually interviews, builds a cited round-by-round blueprint, and then runs the whole drive in your browser: timed aptitude MCQs, a coding round with hidden tests, voice technical / HR / system-design interviews, and a group discussion with AI participants. Every round is scored against a rubric, and you get a final report with a 7-day prep plan.

> Source-available under the [PolyForm Noncommercial 1.0.0](LICENSE) license: free for personal, educational and non-profit use; commercial use is not permitted.

## Features

- **Company research with sources.** Parallel Haiku subagents search the web for the company's real rounds and reported questions. The blueprint shows source URLs, a confidence level per round, and conflicts between sources. Blueprints are cached for 90 days.
- **Seven round types:** aptitude MCQ, coding, technical, system design, behavioral, HR, group discussion, in the company's real order.
- **Coding round:** Monaco editor; your code runs locally in a separate process with timeouts against example and hidden tests (Python and JavaScript, plus Java and C++ when `javac`/`g++` are installed). Hidden tests and MCQ answers never reach the browser.
- **Voice:** answer by speaking (Web Speech API in Chrome/Edge) or typing. The interviewer speaks with Edge Natural voices or the open-source Kokoro neural TTS on your GPU, with automatic CPU fallback.
- **Honest scoring:** per-round rubric scores with strengths, gaps and a model answer, plus a printable final report.
- **Question budgets enforced by the server,** so rounds stay the length you set.

## How it works

```
React (Vite)  ──/api──>  FastAPI  ──subprocess──>  claude -p   (your own Claude Code login)
                                                   ├─ Opus 5.5:   research synthesis, round scoring, final report
                                                   ├─ Sonnet 5.5: round setup and interview questions
                                                   └─ Haiku 5.5 subagents: web research, JD analysis
```

- The backend drives the official `claude` CLI in headless mode. Each interview is one Claude Code session; the backend sends events (your answer, code results, MCQ grades) and the model replies through `--json-schema`, so every reply is a validated `OrchestratorStep` JSON object (`backend/app/schemas.py`) that the UI renders.
- A persistent `stream-json` process keeps the session warm between turns, and a lean system prompt replaces Claude Code's default coding-agent prompt to save tokens.
- Interviews, transcripts and scores stay on your machine in a local SQLite database (`backend/data/`).

## Quick start

You need three things installed, plus a Claude **Pro or Max** subscription:

| Tool | Install |
|---|---|
| [Node.js 20+](https://nodejs.org) | installer from nodejs.org |
| [uv](https://docs.astral.sh/uv/) (Python manager; installs Python for you) | Windows: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 \| iex"`<br>macOS/Linux: `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| [Claude Code](https://code.claude.com) | `npm install -g @anthropic-ai/claude-code` |

Then clone and start:

```bash
git clone https://github.com/nubbot77/Claudition.git
cd Claudition
```

| Windows | macOS / Linux |
|---|---|
| `start.cmd` (or double-click it) | `./start.sh` |

The start script:

1. checks that Claude Code, uv and Node are installed, and tells you the install command if one is missing;
2. signs you in to Claude Code if needed (`claude auth login`, opens your browser; use your own Pro/Max account);
3. installs the backend and frontend and builds the interface (first run takes a few minutes);
4. starts Claudition and opens **http://127.0.0.1:8000**.

Run the same command next time; it skips what's already done. Stop with `Ctrl+C`. The **System status** card on the home page shows whether Claude Code is signed in and which coding languages and voice are available.

Use **Chrome or Edge** to answer by voice (Web Speech API); other browsers can type answers.

### Optional: neural interviewer voice

By default the interviewer uses your browser's voices (Edge's "Natural" voices sound best). For the open-source Kokoro neural voice:

| Windows | macOS / Linux |
|---|---|
| `start.cmd -Voice` | `./start.sh --voice` |

This downloads about 1.9 GB once (ONNX Runtime with CUDA/cuDNN wheels, no system CUDA needed) plus the ~350 MB model. It runs on an NVIDIA GPU (4 GB is enough, capped at 1 GB of GPU memory) or on the CPU. Set `TTS_DEVICE=cpu` to keep it off the GPU.

### Optional: more coding languages

Python and JavaScript always work. Java and C++ appear automatically when `javac`/`java` and `g++` are on your PATH.

### Optional: choose the models

Claudition uses Opus for research and judging and Sonnet for asking questions. To use other models (for example if your plan has no Opus, or to stretch your usage limits), set these before starting:

```bash
CLAUDITION_JUDGE_MODEL=claude-sonnet-5-5        # research, round scores, final report
CLAUDITION_INTERVIEWER_MODEL=claude-sonnet-5-5  # round setup and questions
```

(On Windows PowerShell: `$env:CLAUDITION_JUDGE_MODEL = "claude-sonnet-5-5"`.)

### Manual setup (developers)

```bash
cd backend && uv sync                      # add --extra voice for Kokoro
uv run uvicorn app.main:app --port 8000
cd frontend && npm install && npm run dev  # hot-reload UI on http://localhost:5173
```

## Troubleshooting

| Problem | Fix |
|---|---|
| "Claude Code isn't signed in" | Run `claude auth login`, sign in with your Pro/Max account, reload the page. `claude auth status` should show `"authMethod": "claude.ai"`. |
| Interviews fail with a usage-limit error | You hit your plan's 5-hour limit. Wait for the reset, then press Retry; the interview resumes where it stopped. |
| `start.ps1` cannot be loaded (execution policy) | Use `start.cmd`, which runs it with a one-time bypass. |
| Port 8000 is in use | Windows: `.\start.ps1 -Port 8010`. macOS/Linux: `PORT=8010 ./start.sh`. |
| Microphone doesn't work | Use Chrome or Edge and allow microphone access for `127.0.0.1`. |
| `ANTHROPIC_API_KEY` is set | Fine: Claudition removes it for Claude calls so your subscription is used, never API billing. |

## Usage limits and terms

Claudition runs the official, unmodified `claude` CLI signed in with your own subscription, for your own use. It never reads or stores your Claude credentials. Each interview turn counts toward your plan's usage limits; a full 6-round interview uses a noticeable share of a Pro plan's 5-hour window.

**Do not host Claudition for other people on your subscription.** Anthropic's terms don't allow routing other users' requests through your plan. Everyone who uses it should run their own copy with their own Claude login.

## Tests

```bash
cd backend
uv run pytest -q                  # unit + end-to-end tests with a fake orchestrator
uv run python scripts/spike.py    # live check: subscription auth, structured output, subagents, --resume
```

## Project layout

```
start.cmd / start.ps1 / start.sh   one-command setup and launch
backend/app/
  main.py            FastAPI routes; serves the built UI
  interview.py       interview state machine, prompt building, grading
  claude_runner.py   claude CLI subprocess, persistent sessions, structured output
  routing.py         which model handles which turn
  budget.py          per-round question budgets
  schemas.py         Pydantic models -> JSON schema for --json-schema
  rubrics.py         scoring rubrics per round type
  code_runner.py     local code execution with timeouts
  tts.py             Kokoro neural TTS (GPU with CPU fallback)
  prompts/orchestrator.md, agents.json
frontend/src/        React + TypeScript UI (shadcn/ui, Motion, Monaco)
```

## Disclaimer

Claudition is an independent project and is not affiliated with or endorsed by Anthropic. Interview blueprints are built from public web sources and may be incomplete or out of date; scores are practice feedback, not a hiring prediction.

## License

[PolyForm Noncommercial License 1.0.0](LICENSE). You may use, modify and share Claudition for personal, educational, research and non-profit purposes. Commercial use, including offering it as a paid product or service, is not permitted.
