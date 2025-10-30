export interface PlanStep {
  text: string;
  completed: boolean;
}

export interface RawMilestone {
  key: string;
  title: string;
  steps: string[];
}

export interface Milestone {
  key: string;
  title: string;
  steps: PlanStep[];
  state: 'done' | 'active' | 'pending' | 'goal';
  deadline?: string; // For hover tooltip
  duration_days?: number;
}

export interface Resource {
    name: string;
    mimeType: string;
    data?: string; // base64 encoded string
}

// --- New Strategy Response Types (from prompt) ---

export interface FeasibilityReport {
    required_hours?: number;
    available_hours?: number;
    risk: 'low' | 'medium' | 'high';
    recommendation: string;
}

export interface StrategyOverview {
    approach: string;
    reasoning: string;
}

export interface PlanMilestone {
    key: string; // "M1", "M2"
    title: string; // "Atomic Structure & Bonding"
    duration_days: number;
    focus: string[];
    methods: string[];
    assessment: string;
}

export interface ScientificBasis {
    citation: string;
    description: string;
    uri?: string;
}

export interface StrategyResponse {
    subject: string;
    goal: string;
    feasibility: FeasibilityReport;
    strategy_overview: StrategyOverview;
    milestones: PlanMilestone[];
    scientific_basis: ScientificBasis[];
}


export interface Goal {
  id: string;
  name:string;
  days: number;
  plan?: Milestone[];
  strategy?: StrategyResponse; // Holds the new structured plan
  measurement?: string;
  resources?: Resource[];
  studyTimeCommitment?: string;
}

export interface SubjectData {
  subject: string;
  goals: Goal[];
}

export type ChatMessageRole = 'user' | 'assistant';


export interface SimulationArtifacts {
    [key: string]: any;
}

export interface SimulationStageData {
    phase: string;
    status: string;
    narration: string;
    evidence: string[];
    artifacts: SimulationArtifacts;
}

export interface StrategyState {
  currentTitle: string;
  currentStatus: string;
  stages: SimulationStageData[];
  showDetails: boolean;
}

export interface PlanUpdateProposal {
  milestoneKey: string;
  reasoning: string;
  changes: {
    duration_days?: { from: number; to: number };
    focus?: { from: string[]; to: string[] };
    methods?: { from: string[]; to: string[] };
    assessment?: { from: string; to: string };
  };
}

// FIX: Renamed interface to avoid name collision with the ChatMessage component.
// The 'strategy' type now holds all possible data. 'strategyState' is always present,
// while 'strategy' and 'sources' are added once generation is complete.
export interface ChatMessageData {
  id: string;
  role: ChatMessageRole;
  content: string;
  type?: 'text' | 'strategy' | 'image' | 'plan_update_proposal';
  strategyState?: StrategyState;
  strategy?: StrategyResponse;
  sources?: any[];
  planUpdateProposal?: PlanUpdateProposal;
}

// --- New User Profile Types ---

export type Stage = '' | 'Primary' | 'High School' | 'University' | 'Professional Studies';

export interface GeneralInfo {
  name: string;
  email: string;
  country: string;
  timezone: string;
  usage: 'Full-time' | 'Part-time' | 'Other';
  usageOther: string;
  stage: Stage;
}

export interface PrimaryData {
  schoolName: string;
  grade: string;
  syllabus: string;
  subjects: string[];
}

export interface HighSchoolData {
  schoolName: string;
  grade: string;
  syllabus: string;
  subjects: string[];
  examSeries: 'May/June' | 'Oct/Nov' | 'Jan' | '';
  examYear: string;
  targetGrades: { subject: string; grade: string }[];
}

export interface UniversityData {
  institution: string;
  courseName: string;
  yearOfStudy: string;
  modules: string[];
  assessmentType: 'Exam' | 'Coursework' | 'Practical' | 'Mixed' | '';
}

export interface ProfessionalData {
  field: string;
  qualification: string;
  examDate: string;
  modules: string[];
}

export interface LearningPreferences {
  studyHours: string;
  // weeklySchedule: { day: string; start: string; end: string }[]; // Simplified for now
  preferredMode: string[];
  devices: string[];
  motivation: string;
  motivationOther: string;
  limitations: string[];
}

export interface SENData {
  hasSEN: boolean;
  condition: string;
  conditionOther: string;
  accommodations: string;
  notes: string;
}

export interface GuardianInfo {
  name: string;
  email: string;
  phone: string;
  relationship: string;
}

export interface UserProfile {
  general: GeneralInfo;
  primary: PrimaryData;
  highSchool: HighSchoolData;
  university: UniversityData;
  professional: ProfessionalData;
  learningPreferences: LearningPreferences;
  sen: SENData;
  guardian: GuardianInfo;
}


// --- New Goal Intake Form Types ---

export interface ResourceMetadata {
  framework_code?: string;
  paper?: string;
  session?: string;
  year?: number;
  publisher?: string;
  fileType?: 'PDF' | 'DOCX' | 'TXT' | 'URL';
  uri?: string;
}

export type ResourceSourceType = 'syllabus' | 'past_paper' | 'examiner_report' | 'marking_scheme' | 'textbook' | 'notes' | 'unknown';
export type ResourceAuthority = 'official' | 'publisher_textbook' | 'teacher_notes' | 'student_notes' | 'unknown';

export interface ClassifiedResource {
  id: string; // auto-generated client-side
  source_type: ResourceSourceType;
  title_detected: string;
  metadata: ResourceMetadata;
  authority: ResourceAuthority;
  // This property is for client-side use only and won't be in the final JSON payload
  file?: File;
}

export interface AIFoundResource {
  title: string;
  uri: string;
  description: string;
}

export interface SmartSuggestion {
    label: string;
    status: 'added' | 'pending';
}

export interface Feasibility {
    estimated_hours_required?: number;
    nudge?: string;
}

export interface GoalFormPayload {
  subject: string;
  subject_focus: string[];
  goal_text: string;
  deadline_iso: string;
  hours_per_day: number;
  days_per_week: number;
  resources: Omit<ClassifiedResource, 'file'>[];
  suggestions: SmartSuggestion[];
  feasibility: Feasibility;
}

// --- Auth Types ---
export interface User {
    email: string;
    subscriptionStatus: 'free' | 'pro';
}