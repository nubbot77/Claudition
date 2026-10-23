/**
 * Mock InterviewState objects for every screen, for the dev preview at /__preview?screen=<name>.
 * Content comes from two real interviews on the local backend (see sample-data.ts); the technical round, the
 * coding problem, the MCQ section and the Amazon loop scores are written to match them, since the backend did
 * not keep those payloads. Timestamps are rebased against "now" each time the fixtures are built, so round
 * clocks and "elapsed" timers show believable values.
 */
import type {
  BlueprintRound,
  CodingProblem,
  CompanyBlueprint,
  Health,
  InterviewState,
  InterviewSummary,
  KokoroVoice,
  McqSection,
  PublicStep,
  RoundProgress,
  RoundScore,
  TranscriptEntry,
  Verdict,
} from "../types";
import {
  amazonBlueprint,
  amazonProfile,
  amazonReport,
  amazonReportSpeech,
  amazonTranscript,
  deloitteBlueprint,
  deloitteProfile,
  deloitteReport,
  deloitteReportSpeech,
  deloitteRoundScores,
  deloitteTranscript,
} from "./sample-data";

export type ScreenName =
  | "research"
  | "thinking"
  | "error"
  | "show_blueprint"
  | "ask_question"
  | "ask_question_follow_up"
  | "ask_question_design"
  | "present_coding_problem"
  | "present_mcq_section"
  | "gd_turns"
  | "gd_turns_mid"
  | "gd_turns_concluded"
  | "round_feedback"
  | "round_feedback_last"
  | "final_report"
  | "final_report_empty"
  | "ended"
  | "loading"
  | "offline"
  | "not_found";

export interface Fixture {
  name: ScreenName;
  label: string;
  description: string;
  state: InterviewState | null;
  loadError?: string | null;
  notFound?: boolean;
}

/** Every preview screen: fixtures plus "home" (real HomePage, stubbed API) and "kit" (design reference). */
export type PreviewScreen = ScreenName | "home" | "kit";

export interface ScreenGroup {
  label: string;
  screens: { name: PreviewScreen; label: string }[];
}

/** Screen switcher order. */
export const SCREEN_GROUPS: ScreenGroup[] = [
  { label: "Reference", screens: [{ name: "kit", label: "Design kit (tokens, components, motion)" }] },
  { label: "Setup", screens: [{ name: "home", label: "Home / setup form" }] },
  {
    label: "Interviewer status",
    screens: [
      { name: "research", label: "Researching the company" },
      { name: "thinking", label: "Thinking after an answer" },
      { name: "error", label: "Interviewer error" },
    ],
  },
  { label: "Plan", screens: [{ name: "show_blueprint", label: "Interview plan (blueprint)" }] },
  {
    label: "Rounds",
    screens: [
      { name: "present_mcq_section", label: "Aptitude MCQ section" },
      { name: "gd_turns", label: "Group discussion: opening" },
      { name: "gd_turns_mid", label: "Group discussion: mid-way" },
      { name: "gd_turns_concluded", label: "Group discussion: concluded" },
      { name: "present_coding_problem", label: "Coding problem" },
      { name: "ask_question", label: "Technical question (2 of 4)" },
      { name: "ask_question_follow_up", label: "Technical follow-up" },
      { name: "ask_question_design", label: "System design question" },
    ],
  },
  {
    label: "Results",
    screens: [
      { name: "round_feedback", label: "Round feedback" },
      { name: "round_feedback_last", label: "Round feedback (last round)" },
      { name: "final_report", label: "Final report" },
      { name: "final_report_empty", label: "Final report (ended early, 0)" },
      { name: "ended", label: "Ended without a report" },
    ],
  },
  {
    label: "Page states",
    screens: [
      { name: "loading", label: "Loading" },
      { name: "offline", label: "Server unreachable" },
      { name: "not_found", label: "Interview not found" },
    ],
  },
];

/* ---------------------------------------------------------------------------------------------- */
/* Static extras                                                                                   */
/* ---------------------------------------------------------------------------------------------- */

export const PREVIEW_KOKORO_VOICES: KokoroVoice[] = [
  { id: "af_heart", label: "Heart (US, female)" },
  { id: "af_bella", label: "Bella (US, female)" },
  { id: "am_michael", label: "Michael (US, male)" },
  { id: "bf_emma", label: "Emma (UK, female)" },
  { id: "bm_george", label: "George (UK, male)" },
];

export const PREVIEW_HEALTH: Health = {
  claude_found: true,
  auth: { loggedIn: true, authMethod: "claude.ai", subscriptionType: "pro" },
  languages: ["python", "javascript"],
  tts: {
    available: true,
    loaded: true,
    device: "cuda",
    error: null,
    voices: PREVIEW_KOKORO_VOICES.map((v) => v.id),
  },
};

const DELOITTE_ID = "cc4064fb-cdb8-4f70-af0b-095c2ce6fb68";
const AMAZON_ID = "4044bfc7-2cf6-4c98-927a-63b9ca7999e0";

export function previewInterviewList(now = Date.now()): InterviewSummary[] {
  return [
    {
      id: "preview-flipkart",
      company: "Flipkart",
      role: "SDE 1, Backend",
      experience: "0-1 years",
      status: "ready",
      created_at: iso(now, 42),
    },
    {
      id: DELOITTE_ID,
      company: "Deloitte USI",
      role: "Analyst - Software Engineering",
      experience: "fresher",
      status: "finished",
      created_at: "2026-10-22T09:11:05+00:00",
    },
    {
      id: AMAZON_ID,
      company: "Amazon",
      role: "SDE 1",
      experience: "fresher",
      status: "finished",
      created_at: "2026-10-22T09:04:14+00:00",
    },
    {
      id: "preview-infosys",
      company: "Infosys",
      role: "Systems Engineer (Specialist Programmer)",
      experience: "fresher",
      status: "error",
      created_at: "2026-10-21T16:37:52+00:00",
    },
  ];
}

const technicalRound: BlueprintRound = {
  id: "r4-technical",
  order: 4,
  type: "technical",
  name: "Technical Interview",
  duration_min: 20,
  focus: ["SQL and DBMS", "OOP with examples", "expense tracker deep dive (JWT, schema)", "REST API design"],
  difficulty: "medium",
  confidence: "medium",
  question_budget: 4,
  sources: (deloitteBlueprint.rounds.find((r) => r.id === "r3-coding") ?? deloitteBlueprint.rounds[0]).sources,
  notes:
    "Project deep dive, SQL and OOP, as reported for on-campus Analyst drives. Four main questions, up to two follow-ups each.",
};

/** The real Deloitte plan plus the technical interview that the short test run skipped. */
const deloitteFullBlueprint: CompanyBlueprint = {
  ...deloitteBlueprint,
  summary: `${deloitteBlueprint.summary.split(" This mock")[0]} This mock runs the full campus loop in 5 rounds: a 5-question aptitude section, a group discussion, one coding problem, a technical interview and HR.`,
  rounds: [
    ...deloitteBlueprint.rounds.filter((r) => r.id !== "r4-hr"),
    technicalRound,
    ...deloitteBlueprint.rounds.filter((r) => r.id === "r4-hr").map((r) => ({ ...r, order: 5 })),
  ],
};

const warehouseProblem: CodingProblem = {
  title: "Warehouse Delivery Route",
  statement:
    "An Amazon fulfilment centre floor is modelled as an R x C grid. Each cell is open floor (.), a shelf (#), the robot's start (S) or the drop point (D). The robot moves one cell up, down, left or right per step and cannot pass through shelves.\n\nPrint the minimum number of steps the robot needs to reach D from S, or -1 if D cannot be reached.\n\nInput: the first line holds R and C. Each of the next R lines holds a string of C characters.\nOutput: a single integer.",
  constraints: [
    "1 ≤ R, C ≤ 1000",
    "The grid contains exactly one S and exactly one D",
    "Read from standard input and print to standard output",
  ],
  examples: [
    { input: "3 4\nS..#\n.#..\n...D", expected_output: "5" },
    { input: "2 2\nS#\n#D", expected_output: "-1" },
    { input: "1 5\nS...D", expected_output: "4" },
  ],
  hidden_test_count: 8,
  languages: ["python", "javascript"],
  starter_code: [
    {
      language: "python",
      code: 'import sys\nfrom collections import deque\n\n\ndef main():\n    data = sys.stdin.read().split()\n    r, c = int(data[0]), int(data[1])\n    grid = data[2:2 + r]\n    # Print the minimum number of steps from S to D, or -1\n\n\nif __name__ == "__main__":\n    main()\n',
    },
    {
      language: "javascript",
      code: 'const lines = require("fs").readFileSync(0, "utf8").trim().split("\\n");\nconst [r, c] = lines[0].split(" ").map(Number);\nconst grid = lines.slice(1, 1 + r);\n// Print the minimum number of steps from S to D, or -1\n',
    },
  ],
  time_limit_min: 35,
};

const aptitudeSection: McqSection = {
  name: "Online Assessment - General Aptitude and Fundamentals",
  time_limit_min: 5,
  questions: [
    {
      id: "q1",
      question:
        "A and B together can finish a piece of work in 12 days. A alone can finish it in 20 days. In how many days can B alone finish it?",
      options: ["24 days", "30 days", "32 days", "36 days"],
    },
    {
      id: "q2",
      question: "Find the next number in the series: 3, 7, 15, 31, 63, ?",
      options: ["95", "117", "127", "128"],
    },
    {
      id: "q3",
      question: "Choose the word closest in meaning to METICULOUS.",
      options: ["Careless", "Thorough", "Hasty", "Generous"],
    },
    {
      id: "q4",
      question: "Which SQL clause filters groups after aggregation?",
      options: ["WHERE", "HAVING", "ORDER BY", "LIMIT"],
    },
    {
      id: "q5",
      question:
        "Which OOP feature lets a subclass provide its own implementation of a method that its parent class already defines?",
      options: ["Encapsulation", "Abstraction", "Method overriding", "Method overloading"],
    },
  ],
};

const GD_TOPIC = "Technology is the most effective weapon against financial crimes";
const GD_PERSONAS: Record<string, string> = {
  "Rohan Mehta": "tech optimist, cites Indian fintech",
  "Sneha Kulkarni": "regulation-first sceptic",
  "Arjun Reddy": "people-and-policy pragmatist",
};

const PRIYA = "Priya Nair, Senior Consultant - Technology";
const TECH_Q1 =
  "Hi, I'm Priya, a senior consultant in the technology practice. This round covers your projects, SQL and some OOP. Let's start with your expense tracker. You used JWT for authentication. Walk me through what happens from the moment a user logs in to an authenticated API call, and tell me where the token lives on the client.";
const TECH_A1 =
  "When the user logs in, the React app posts the email and password to a FastAPI login endpoint. The backend checks the bcrypt hash in PostgreSQL and, if it matches, signs a JWT with the user ID and a 30-minute expiry. The frontend stores it in localStorage and sends it as a Bearer token in the Authorization header. A FastAPI dependency verifies the token on every protected route and loads the user.";
const TECH_F1 = "You said localStorage. What's the risk of keeping the token there, and what would you change?";
const TECH_A1F =
  "Any script on the page can read localStorage, so a single XSS bug could leak the token. I'd move it to an httpOnly, Secure, SameSite cookie so JavaScript can't read it, add CSRF protection on state-changing requests, and keep the access token short-lived with a refresh token.";
const TECH_Q2 =
  "Good. Let's move to databases. In your expense tracker a user can have thousands of expenses. Write a SQL query that returns each user's total spend per category for the current month, and tell me which index you'd add to keep it fast.";
const TECH_A2 =
  "For the query:\n\nSELECT user_id, category_id, SUM(amount) AS total\nFROM expenses\nWHERE spent_at >= date_trunc('month', CURRENT_DATE)\nGROUP BY user_id, category_id;\n\nI'd add a composite index on (user_id, spent_at), so each user's rows for the month come from one index range scan. If the table grows large I'd make it covering by including category_id and amount.";
const TECH_F2 =
  "Your query returns category IDs. The dashboard needs category names, and some expenses don't have a category yet. How do you change the query so those expenses still show up?";

const NEHA = "Neha Kapoor, SDE-3 (Loop Interviewer)";
const DESIGN_Q1 =
  "Let's design a parking system for a multi-level mall garage. Start with the main classes and how they relate. Then walk me through how a car gets a spot when it enters, and what happens when the garage is full. Sketch your classes in the scratchpad as you go.";

/* ---------------------------------------------------------------------------------------------- */
/* Helpers                                                                                         */
/* ---------------------------------------------------------------------------------------------- */

const MIN = 60_000;

function iso(now: number, minutesAgo: number): string {
  return new Date(now - minutesAgo * MIN).toISOString();
}

/** Shifts entries so the last one lands `endMinutesAgo` before now, keeping the real gaps between them. */
function rebase(entries: TranscriptEntry[], now: number, endMinutesAgo: number): TranscriptEntry[] {
  if (!entries.length) return [];
  const last = Date.parse(entries[entries.length - 1].at);
  const shift = now - endMinutesAgo * MIN - last;
  return entries.map((e) => ({ ...e, at: new Date(Date.parse(e.at) + shift).toISOString() }));
}

function line(
  now: number,
  minutesAgo: number,
  role: TranscriptEntry["role"],
  speaker: string,
  text: string,
  roundId: string | null,
): TranscriptEntry {
  return { role, speaker, text, round_id: roundId, at: iso(now, minutesAgo) };
}

function emptyStep(overrides: Partial<PublicStep> & Pick<PublicStep, "action">): PublicStep {
  return {
    speech_text: "",
    question_kind: null,
    interviewer_name: null,
    round_id: null,
    round_type: null,
    blueprint: null,
    coding_problem: null,
    mcq_section: null,
    gd: null,
    round_score: null,
    report: null,
    ...overrides,
  };
}

function progressFor(round: BlueprintRound, overrides: Partial<RoundProgress>): RoundProgress {
  return {
    round_id: round.id,
    round_name: round.name,
    round_type: round.type,
    unit: "question",
    budget: round.question_budget ?? 4,
    used: 1,
    follow_ups: 0,
    max_follow_ups: 2,
    elapsed_min: 1,
    duration_min: round.duration_min,
    must_wrap_up: false,
    must_conclude_gd: false,
    instruction: "",
    ...overrides,
  };
}

function roundOf(blueprint: CompanyBlueprint, id: string): BlueprintRound {
  const found = blueprint.rounds.find((r) => r.id === id);
  if (!found) throw new Error(`fixture round ${id} missing`);
  return found;
}

function baseState(overrides: Partial<InterviewState> & Pick<InterviewState, "id" | "profile">): InterviewState {
  return {
    status: "ready",
    progress: ["Session ready (claude-opus-5-5)", "Session cost estimate so far $0.418 (counts toward your plan's usage)"],
    error: null,
    step: null,
    transcript: [],
    round_scores: [],
    blueprint: null,
    thinking_since: null,
    round_progress: null,
    ...overrides,
  };
}

function briefScore(
  round: BlueprintRound,
  score: number,
  verdict: Verdict,
  rubric: [criterion: string, weight: number, score: number, comment: string][],
  strengths: string[],
  gaps: string[],
  modelAnswer: string,
): RoundScore {
  return {
    round_id: round.id,
    round_name: round.name,
    score,
    verdict,
    rubric: rubric.map(([criterion, weight, s, comment]) => ({ criterion, weight, score: s, comment })),
    strengths,
    gaps,
    model_answer: modelAnswer,
  };
}

/* Deloitte transcript slices (indices into the real 29-entry transcript). 0 = welcome, 1-4 = aptitude. */
const D_GD_OPEN_END = 8; // + moderator intro, Rohan, Sneha
const D_GD_MID_END = 11; // + candidate, Sneha, Arjun
const D_GD_CLOSE_END = 13; // + candidate, moderator closes
const D_GD_END = 16; // + summary, thanks, score
const D_CODING_END = 22; // coding round incl. score
const D_HR_END = 28; // HR round incl. score

/* ---------------------------------------------------------------------------------------------- */
/* Fixtures                                                                                        */
/* ---------------------------------------------------------------------------------------------- */

export function buildFixtures(now = Date.now()): Record<ScreenName, Fixture> {
  const scoresBefore = (roundId: string) => {
    const idx = deloitteRoundScores.findIndex((s) => s.round_id === roundId);
    return deloitteRoundScores.slice(0, idx === -1 ? deloitteRoundScores.length : idx);
  };

  /* Technical round (Deloitte, full plan). Round started 8.2 minutes ago. */
  const tech = roundOf(deloitteFullBlueprint, "r4-technical");
  const beforeTech = rebase(deloitteTranscript.slice(0, D_CODING_END), now, 9.5);
  const techQ1Step = emptyStep({
    action: "ask_question",
    question_kind: "main",
    speech_text: TECH_Q1,
    interviewer_name: PRIYA,
    round_id: tech.id,
    round_type: "technical",
  });
  const techLines = {
    q1: line(now, 8.2, "interviewer", PRIYA, TECH_Q1, tech.id),
    a1: line(now, 6.4, "candidate", "You", TECH_A1, tech.id),
    f1: line(now, 5.9, "interviewer", PRIYA, TECH_F1, tech.id),
    a1f: line(now, 4.6, "candidate", "You", TECH_A1F, tech.id),
    q2: line(now, 4.1, "interviewer", PRIYA, TECH_Q2, tech.id),
    a2: line(now, 1.6, "candidate", "You", TECH_A2, tech.id),
    f2: line(now, 1.1, "interviewer", PRIYA, TECH_F2, tech.id),
  };
  const techBase = {
    id: "preview-technical",
    profile: deloitteProfile,
    blueprint: deloitteFullBlueprint,
    round_scores: deloitteRoundScores.filter((s) => s.round_id !== "r4-hr"),
  };

  /* Amazon design round: rounds 1-4 scored (written for the preview), round 5 just started. */
  const amazonRounds = [...amazonBlueprint.rounds].sort((a, b) => a.order - b.order);
  const design = roundOf(amazonBlueprint, "r5-ood-design");
  const amazonScores: RoundScore[] = [
    briefScore(
      amazonRounds[0],
      74,
      "lean_hire",
      [
        ["Correctness of answers", 0.4, 80, "Passed 3/3 examples and 7/8 hidden tests; failed the 1000x1000 timing case."],
        ["Depth and reasoning", 0.3, 70, "Chose BFS and explained why, but missed the visit-on-enqueue optimisation."],
        ["Communication clarity", 0.3, 70, "Clear approach, quiet while debugging."],
      ],
      ["Recognised the grid as an unweighted graph straight away."],
      ["Marked cells visited on dequeue, which re-queues cells on large grids."],
      "BFS from S with a deque; mark cells visited when enqueued; O(R*C) time and space.",
    ),
    briefScore(
      amazonRounds[1],
      81,
      "hire",
      [
        ["Customer focus", 0.4, 85, "Escalated the delayed shipment and informed the customer first."],
        ["Ownership", 0.3, 80, "Took the follow-up task rather than handing it off."],
        ["Judgement under ambiguity", 0.3, 76, "Two answers favoured speed over checking the data."],
      ],
      ["Consistently put the customer impact first."],
      ["Rushed two scenarios without checking the dashboard data offered."],
      "Read the full scenario, check the data provided, act for the customer, then escalate with specifics.",
    ),
    briefScore(
      amazonRounds[2],
      68,
      "lean_hire",
      [
        ["Correctness of answers", 0.4, 72, "Working sliding-window solution after one hint."],
        ["Depth and reasoning", 0.3, 65, "Complexity stated, edge cases only when prompted."],
        ["Communication clarity", 0.3, 66, "Explained the approach, went silent while coding."],
      ],
      ["Recovered quickly after the hint on window shrinking."],
      ["Needed a hint to shrink the window from the left.", "Did not test the empty-string case."],
      "Track last-seen index per character; move the left pointer past repeats; answer is the max window length.",
    ),
    briefScore(
      amazonRounds[3],
      77,
      "hire",
      [
        ["STAR structure", 0.35, 80, "Clear situation and task; results mostly quantified."],
        ["Leadership Principle fit", 0.4, 78, "Strong Ownership and Bias for Action stories."],
        ["Self-awareness", 0.25, 70, "The failure story blamed the team more than it reflected."],
      ],
      ["Ownership story with a measurable result (report time cut from 2 days to 3 hours)."],
      ["Disagree and Commit story lacked the commit part."],
      "Pick one story per principle; give a number in every Result and say 'I', not 'we'.",
    ),
  ];
  const amazonScoredIds = new Set(amazonScores.map((s) => s.round_id));
  const amazonPast = rebase(
    [
      ...amazonTranscript.slice(0, 2),
      ...amazonRounds
        .filter((r) => amazonScoredIds.has(r.id))
        .map((r, i) => {
          const s = amazonScores[i];
          return {
            role: "system" as const,
            speaker: "Score",
            text: `${s.round_name}: ${s.score}/100 (${s.verdict})`,
            round_id: r.id,
            at: new Date(Date.parse(amazonTranscript[1].at) + (i + 1) * 22 * MIN).toISOString(),
          };
        }),
    ],
    now,
    1.2,
  );

  const deloitteFinished = baseState({
    id: "preview-final-report",
    profile: deloitteProfile,
    status: "finished",
    blueprint: deloitteBlueprint,
    transcript: rebase(deloitteTranscript, now, 0.2),
    round_scores: deloitteRoundScores,
  });

  const fixtures: Fixture[] = [
    {
      name: "research",
      label: "Researching the company",
      description: "First 3-8 minutes: no plan yet, live progress log from the research agents.",
      state: baseState({
        id: "preview-research",
        profile: deloitteProfile,
        status: "thinking",
        thinking_since: iso(now, 3.2),
        progress: [
          "Session ready (claude-opus-5-5)",
          "Delegating to process-researcher: Deloitte USI campus interview process",
          "Delegating to question-researcher: Deloitte USI analyst interview questions",
          "Delegating to jd-analyst: Analyst - Software Engineering job description",
          " ↳ Searching: Deloitte USI analyst campus hiring process 2026",
          " ↳ Reading: https://faceprep.in/article/deloitte-recruitment-process-for-freshers-in-detail-face-prep/",
          " ↳ Searching: Deloitte USI group discussion round freshers",
          " ↳ Reading: https://www.geeksforgeeks.org/interview-experiences/deloitte-usi-interview-experience-for-analyst-on-campus-2024/",
          " ↳ Reading: https://cpt.hitbullseye.com/Deloitte-Test-Pattern.php",
          " ↳ Searching: Deloitte USI HR interview questions freshers",
          " ↳ Reading: https://jobrise.io/en/blog/deloitte-interview-questions-freshers-2026/",
        ],
      }),
    },
    {
      name: "thinking",
      label: "Thinking after an answer",
      description: "Answer sent in the technical round; the interviewer is preparing the next step.",
      state: baseState({
        ...techBase,
        id: "preview-thinking",
        status: "thinking",
        thinking_since: iso(now, 0.35),
        progress: ["Session ready (claude-opus-5-5)"],
        step: techQ1Step,
        transcript: [...beforeTech, techLines.q1, { ...techLines.a1, at: iso(now, 0.35) }],
        round_progress: progressFor(tech, {
          used: 1,
          elapsed_min: 8.2,
          instruction:
            "Main question 1 of 4 asked. At most 2 follow-up(s) on the current one. Mark question_kind on every question step.",
        }),
      }),
    },
    {
      name: "error",
      label: "Interviewer error",
      description: "The orchestrator call failed; the candidate can retry the last event.",
      state: baseState({
        ...techBase,
        id: "preview-error",
        status: "error",
        error: "claude -p timed out after 300s",
        step: techQ1Step,
        transcript: [...beforeTech, techLines.q1, techLines.a1],
        round_progress: progressFor(tech, { used: 1, elapsed_min: 8.2 }),
      }),
    },
    {
      name: "show_blueprint",
      label: "Interview plan",
      description: "Research done: the plan, sources, focus areas, conflicts and question bank (real Deloitte data).",
      state: baseState({
        id: "preview-blueprint",
        profile: deloitteProfile,
        blueprint: deloitteBlueprint,
        transcript: rebase(deloitteTranscript.slice(0, 1), now, 0.3),
        step: emptyStep({ action: "show_blueprint", speech_text: deloitteTranscript[0].text, blueprint: deloitteBlueprint }),
      }),
    },
    {
      name: "ask_question",
      label: "Technical question (2 of 4)",
      description: "Main question 2 of 4 in the technical round, after one follow-up on question 1.",
      state: baseState({
        ...techBase,
        step: { ...techQ1Step, speech_text: TECH_Q2 },
        transcript: [...beforeTech, techLines.q1, techLines.a1, techLines.f1, techLines.a1f, techLines.q2],
        round_progress: progressFor(tech, {
          used: 2,
          follow_ups: 0,
          elapsed_min: 8.2,
          instruction:
            "Main question 2 of 4 asked. At most 2 follow-up(s) on the current one. Mark question_kind on every question step.",
        }),
      }),
    },
    {
      name: "ask_question_follow_up",
      label: "Technical follow-up",
      description: "A follow-up on main question 2 (question_kind: follow_up); the answer contains SQL.",
      state: baseState({
        ...techBase,
        id: "preview-technical-follow-up",
        step: { ...techQ1Step, question_kind: "follow_up", speech_text: TECH_F2 },
        transcript: [
          ...beforeTech,
          techLines.q1,
          techLines.a1,
          techLines.f1,
          techLines.a1f,
          techLines.q2,
          techLines.a2,
          techLines.f2,
        ],
        round_progress: progressFor(tech, {
          used: 2,
          follow_ups: 1,
          elapsed_min: 8.2,
          instruction:
            "Main question 2 of 4 asked. At most 1 follow-up(s) on the current one. Mark question_kind on every question step.",
        }),
      }),
    },
    {
      name: "ask_question_design",
      label: "System design question",
      description: "Amazon loop round 5 (object-oriented / light design) with the scratchpad; rounds 1-4 scored.",
      state: baseState({
        id: "preview-design",
        profile: amazonProfile,
        blueprint: amazonBlueprint,
        round_scores: amazonScores,
        transcript: [...amazonPast, line(now, 0.6, "interviewer", NEHA, DESIGN_Q1, design.id)],
        step: emptyStep({
          action: "ask_question",
          question_kind: "main",
          speech_text: DESIGN_Q1,
          interviewer_name: NEHA,
          round_id: design.id,
          round_type: "system_design",
        }),
        round_progress: progressFor(design, {
          used: 1,
          elapsed_min: 0.6,
          instruction:
            "Main question 1 of 3 asked. At most 2 follow-up(s) on the current one. Mark question_kind on every question step.",
        }),
      }),
    },
    {
      name: "present_coding_problem",
      label: "Coding problem",
      description: "Amazon OA coding round: problem statement, examples, editor, run and submit.",
      state: baseState({
        id: "preview-coding",
        profile: amazonProfile,
        blueprint: amazonBlueprint,
        transcript: rebase(amazonTranscript.slice(0, 2), now, 3.4),
        step: emptyStep({
          action: "present_coding_problem",
          speech_text: amazonTranscript[1].text,
          interviewer_name: amazonTranscript[1].speaker,
          round_id: "r1-oa-coding",
          round_type: "coding",
          coding_problem: warehouseProblem,
        }),
        round_progress: progressFor(roundOf(amazonBlueprint, "r1-oa-coding"), {
          unit: "problem",
          used: 1,
          elapsed_min: 3.4,
          instruction: "All 1 problems used. At most 2 more follow-up(s) on the current one, then round_feedback.",
        }),
      }),
    },
    {
      name: "present_mcq_section",
      label: "Aptitude MCQ section",
      description: "Deloitte online assessment: 5 questions, 5-minute section timer.",
      state: baseState({
        id: "preview-mcq",
        profile: deloitteProfile,
        blueprint: deloitteBlueprint,
        transcript: rebase(deloitteTranscript.slice(0, 2), now, 0.2),
        step: emptyStep({
          action: "present_mcq_section",
          speech_text: deloitteTranscript[1].text,
          interviewer_name: deloitteTranscript[1].speaker,
          round_id: "r1-aptitude",
          round_type: "aptitude_mcq",
          mcq_section: aptitudeSection,
        }),
        round_progress: progressFor(roundOf(deloitteBlueprint, "r1-aptitude"), {
          unit: "mcq_section",
          used: 1,
          elapsed_min: 0.2,
          instruction: "Every MCQ section in this round has exactly 5 questions.",
        }),
      }),
    },
    gdFixture(now, "gd_turns", "Group discussion: opening", "Moderator introduces the topic; two panelists open.", {
      end: D_GD_OPEN_END,
      speech: deloitteTranscript[5].text,
      utterances: [6, 7],
      used: 0,
      concluded: false,
    }),
    gdFixture(now, "gd_turns_mid", "Group discussion: mid-way", "After the candidate's first point; panel responds.", {
      end: D_GD_MID_END,
      speech: "",
      utterances: [9, 10],
      used: 1,
      concluded: false,
    }),
    gdFixture(
      now,
      "gd_turns_concluded",
      "Group discussion: concluded",
      "Moderator closes the GD and asks for the candidate's summary.",
      { end: D_GD_CLOSE_END, speech: deloitteTranscript[12].text, utterances: [], used: 2, concluded: true },
    ),
    {
      name: "round_feedback",
      label: "Round feedback",
      description: "Coding round scored 91 (strong hire): rubric, strengths, gaps, model answer.",
      state: baseState({
        id: "preview-feedback",
        profile: deloitteProfile,
        blueprint: deloitteBlueprint,
        transcript: rebase(deloitteTranscript.slice(0, D_CODING_END), now, 0.1),
        round_scores: scoresBefore("r4-hr"),
        step: emptyStep({
          action: "round_feedback",
          speech_text: deloitteTranscript[20].text,
          interviewer_name: deloitteTranscript[20].speaker,
          round_id: "r3-coding",
          round_type: "coding",
          round_score: deloitteRoundScores.find((s) => s.round_id === "r3-coding") ?? null,
        }),
      }),
    },
    {
      name: "round_feedback_last",
      label: "Round feedback (last round)",
      description: "HR round scored 77; the next action leads to the final report.",
      state: baseState({
        id: "preview-feedback-last",
        profile: deloitteProfile,
        blueprint: deloitteBlueprint,
        transcript: rebase(deloitteTranscript.slice(0, D_HR_END), now, 0.1),
        round_scores: deloitteRoundScores,
        step: emptyStep({
          action: "round_feedback",
          speech_text: deloitteTranscript[26].text,
          interviewer_name: deloitteTranscript[26].speaker,
          round_id: "r4-hr",
          round_type: "hr",
          round_score: deloitteRoundScores.find((s) => s.round_id === "r4-hr") ?? null,
        }),
      }),
    },
    {
      name: "final_report",
      label: "Final report",
      description: "Overall 82 (hire), four round scores, top strengths and gaps, 7-day prep plan.",
      state: {
        ...deloitteFinished,
        step: emptyStep({ action: "final_report", speech_text: deloitteReportSpeech, report: deloitteReport }),
      },
    },
    {
      name: "final_report_empty",
      label: "Final report (ended early)",
      description: "Amazon session ended during round 1: overall 0, one unscored round, prep plan only.",
      state: baseState({
        id: "preview-final-report-empty",
        profile: amazonProfile,
        status: "finished",
        blueprint: amazonBlueprint,
        transcript: rebase(amazonTranscript, now, 0.2),
        step: emptyStep({ action: "final_report", speech_text: amazonReportSpeech, report: amazonReport }),
      }),
    },
    {
      name: "ended",
      label: "Ended without a report",
      description: "Finished state with no report payload: falls back to the scores collected so far.",
      state: {
        ...deloitteFinished,
        id: "preview-ended",
        transcript: rebase(deloitteTranscript.slice(0, D_GD_END), now, 0.2),
        round_scores: scoresBefore("r3-coding"),
      },
    },
    {
      name: "loading",
      label: "Loading",
      description: "First fetch of the interview has not returned yet.",
      state: null,
    },
    {
      name: "offline",
      label: "Server unreachable",
      description: "First fetch failed; the page keeps retrying.",
      state: null,
      loadError: "Can't reach the interview server. Is the backend running on port 8000?",
    },
    {
      name: "not_found",
      label: "Interview not found",
      description: "Unknown id, or the server was reset.",
      state: null,
      notFound: true,
    },
  ];

  return Object.fromEntries(fixtures.map((f) => [f.name, f])) as Record<ScreenName, Fixture>;
}

function gdFixture(
  now: number,
  name: ScreenName,
  label: string,
  description: string,
  opts: { end: number; speech: string; utterances: number[]; used: number; concluded: boolean },
): Fixture {
  const gdRound = roundOf(deloitteBlueprint, "r2-gd");
  const transcript = rebase(deloitteTranscript.slice(0, opts.end), now, 0.1);
  const moderator = deloitteTranscript[5].speaker;
  const budget = gdRound.question_budget ?? 2;
  return {
    name,
    label,
    description,
    state: baseState({
      id: `preview-${name}`,
      profile: deloitteProfile,
      blueprint: deloitteBlueprint,
      transcript,
      round_scores: deloitteRoundScores.filter((s) => s.round_id === "r1-aptitude"),
      step: emptyStep({
        action: "gd_turns",
        speech_text: opts.speech,
        interviewer_name: moderator,
        round_id: gdRound.id,
        round_type: "group_discussion",
        gd: {
          topic: GD_TOPIC,
          concluded: opts.concluded,
          utterances: opts.utterances.map((i) => {
            const e = deloitteTranscript[i];
            return { speaker: e.speaker, persona: GD_PERSONAS[e.speaker] ?? "", text: e.text };
          }),
        },
      }),
      round_progress: progressFor(gdRound, {
        unit: "contribution",
        budget,
        used: opts.used,
        elapsed_min: Math.round(((Date.parse(transcript[transcript.length - 1].at) - Date.parse(transcript[5].at)) / MIN + 0.1) * 10) / 10,
        must_wrap_up: opts.concluded,
        instruction: opts.concluded
          ? "The GD is concluded. Return round_feedback for this round now."
          : `Conclude the GD after ${budget - opts.used} more candidate contribution(s).`,
      }),
    }),
  };
}
