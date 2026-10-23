export type RoundType =
  | "aptitude_mcq"
  | "coding"
  | "technical"
  | "system_design"
  | "behavioral"
  | "hr"
  | "managerial"
  | "group_discussion";

export type Action =
  | "show_blueprint"
  | "ask_question"
  | "present_coding_problem"
  | "present_mcq_section"
  | "gd_turns"
  | "round_feedback"
  | "final_report";

export type Verdict = "strong_hire" | "hire" | "lean_hire" | "lean_no_hire" | "no_hire";
export type Difficulty = "easy" | "medium" | "hard";
export type Confidence = "low" | "medium" | "high";
export type Language = "python" | "javascript" | "java" | "cpp";

export interface Source {
  url: string;
  title: string;
  date: string | null;
}

export interface BlueprintRound {
  id: string;
  order: number;
  type: RoundType;
  name: string;
  duration_min: number;
  focus: string[];
  difficulty: Difficulty;
  confidence: Confidence;
  /** Main questions (conversational), problems (coding), questions per section (aptitude) or candidate
   * contributions before the GD concludes. Absent on blueprints made by older backends. */
  question_budget?: number;
  sources: Source[];
  notes: string;
}

export interface QuestionRef {
  question: string;
  round_type: RoundType;
  source_url: string | null;
}

export interface CompanyBlueprint {
  company: string;
  role: string;
  level: string;
  summary: string;
  rounds: BlueprintRound[];
  focus_areas: string[];
  question_bank: QuestionRef[];
  conflicts: string[];
}

export interface TestCase {
  input: string;
  expected_output: string;
}

export interface StarterCode {
  language: string;
  code: string;
}

export interface CodingProblem {
  title: string;
  statement: string;
  constraints: string[];
  examples: TestCase[];
  hidden_test_count: number;
  languages: Language[];
  starter_code: StarterCode[];
  time_limit_min: number;
}

export interface McqQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface McqSection {
  name: string;
  time_limit_min: number;
  questions: McqQuestion[];
}

export interface GdUtterance {
  speaker: string;
  persona: string;
  text: string;
}

export interface GdState {
  topic: string;
  utterances: GdUtterance[];
  concluded: boolean;
}

export interface RubricItem {
  criterion: string;
  weight: number;
  score: number;
  comment: string;
}

export interface RoundScore {
  round_id: string;
  round_name: string;
  score: number;
  verdict: Verdict;
  rubric: RubricItem[];
  strengths: string[];
  gaps: string[];
  model_answer: string;
}

export interface DayPlan {
  day: number;
  focus: string;
  tasks: string[];
}

export interface FinalReport {
  overall_score: number;
  verdict: Verdict;
  summary: string;
  round_scores: RoundScore[];
  top_strengths: string[];
  top_gaps: string[];
  prep_plan_7d: DayPlan[];
}

export type QuestionKind = "main" | "follow_up";

export interface PublicStep {
  action: Action;
  /** On ask_question steps: a new main question or a follow-up on the current one. */
  question_kind?: QuestionKind | null;
  speech_text: string;
  interviewer_name: string | null;
  round_id: string | null;
  round_type: RoundType | null;
  blueprint: CompanyBlueprint | null;
  coding_problem: CodingProblem | null;
  mcq_section: McqSection | null;
  gd: GdState | null;
  round_score: RoundScore | null;
  report: FinalReport | null;
}

export type InterviewStatus = "thinking" | "ready" | "error" | "finished";
export type TranscriptRole = "interviewer" | "candidate" | "panelist" | "system";

export interface TranscriptEntry {
  role: TranscriptRole;
  speaker: string;
  text: string;
  round_id: string | null;
  at: string;
}

export interface InterviewProfile {
  company: string;
  role: string;
  experience: string;
  job_description: string;
  resume_text: string;
  notes: string;
}

/** What `used` / `budget` count in a round. */
export type RoundProgressUnit = "question" | "problem" | "contribution" | "mcq_section";

/** Server-side budget for the current round (null outside a round: research, plan, feedback, report). */
export interface RoundProgress {
  round_id: string;
  round_name: string;
  round_type: RoundType;
  /** Sent by the backend; optional so older payloads still type-check. */
  unit?: RoundProgressUnit;
  budget: number;
  used: number;
  follow_ups: number;
  max_follow_ups: number;
  elapsed_min: number;
  duration_min: number;
  must_wrap_up: boolean;
  must_conclude_gd: boolean;
  instruction: string;
}

export interface InterviewState {
  id: string;
  profile: InterviewProfile;
  status: InterviewStatus;
  progress: string[];
  error: string | null;
  step: PublicStep | null;
  transcript: TranscriptEntry[];
  round_scores: RoundScore[];
  blueprint: CompanyBlueprint | null;
  thinking_since: string | null;
  round_progress: RoundProgress | null;
}

export interface InterviewSummary {
  id: string;
  company: string;
  role: string;
  experience: string;
  status: InterviewStatus;
  created_at: string;
}

export interface Health {
  claude_found: boolean;
  auth: {
    loggedIn: boolean;
    authMethod: string;
    subscriptionType?: string;
  };
  languages: string[];
  /** Neural interviewer voice (Kokoro). Absent on older backends. */
  tts?: TtsStatus;
}

export interface TtsStatus {
  available: boolean;
  loaded: boolean;
  device: "cuda" | "cpu" | null;
  error: string | null;
  voices: string[];
}

export interface KokoroVoice {
  id: string;
  label: string;
}

export interface TtsRequest {
  text: string;
  voice?: string;
  speed?: number;
}

export interface CodeRunRequest {
  language: Language;
  code: string;
  tests: TestCase[];
}

export interface TestResult {
  input: string;
  expected_output: string;
  actual_output: string;
  passed: boolean;
  stderr: string;
  time_ms: number;
  timed_out: boolean;
}

export interface CodeRunResult {
  language: string;
  compile_error: string | null;
  results: TestResult[];
  passed_count: number;
  total: number;
}

export type AnswerMode = "voice" | "text";

export interface CandidateAnswerPayload {
  text: string;
  answer_mode: AnswerMode;
  seconds_taken: number;
}

export interface CodeSubmittedPayload {
  language: Language;
  code: string;
  explanation: string;
}

export interface McqDonePayload {
  answers: Record<string, number | null>;
  seconds_taken: number;
}

export type EmptyPayload = Record<string, never>;

export type InterviewEvent =
  | { type: "begin_rounds"; payload: EmptyPayload }
  | { type: "candidate_answer"; payload: CandidateAnswerPayload }
  | { type: "code_submitted"; payload: CodeSubmittedPayload }
  | { type: "mcq_section_done"; payload: McqDonePayload }
  | { type: "gd_user_spoke"; payload: { text: string } }
  | { type: "continue"; payload: EmptyPayload }
  | { type: "time_up"; payload: { round_id: string } }
  | { type: "end_interview"; payload: EmptyPayload };
