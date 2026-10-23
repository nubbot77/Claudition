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
- Interviews, transcripts and scores are stored in a local SQLite database (`backend/data/`, not committed).

## Requirements

- **Claude Code** installed and signed in with **your own** Claude subscription (Pro or Max)
- **Python 3.11+** with [uv](https://docs.astral.sh/uv/)
- **Node.js 20+**
- **Chrome or Edge** for voice answers (other browsers can type)
- Optional: an NVIDIA GPU (4 GB is enough) for the Kokoro voice; it also runs on the CPU

## Setup

1. Install Claude Code and sign in:

   ```bash
   npm install -g @anthropic-ai/claude-code
   claude auth login
   claude auth status
   ```

   `claude auth status` should show `"authMethod": "claude.ai"`. Unset `ANTHROPIC_API_KEY` in your shell if you don't want API billing (the backend also strips it from the Claude subprocess).

2. Clone and start the backend:

   ```bash
   git clone https://github.com/nubbot77/Claudition.git
   cd Claudition/backend
   uv sync
   uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

   The first `uv sync` downloads about 1.9 GB (ONNX Runtime GPU and the CUDA/cuDNN runtime wheels for the voice). No system CUDA install is needed.

3. In a second terminal, start the frontend:

   ```bash
   cd Claudition/frontend
   npm install
   npm run dev
   ```

4. Open http://localhost:5173.

### Optional: neural voice (Kokoro)

Download the model files (~350 MB) into `backend/data/models/` once:

```bash
cd backend
uv run python scripts/download_tts_models.py
```

Without them the app uses browser voices. To keep Kokoro off the GPU, set `TTS_DEVICE=cpu` before starting the backend. Kokoro is capped at 1 GB of GPU memory and handles one request at a time.

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
backend/app/
  main.py            FastAPI routes
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
