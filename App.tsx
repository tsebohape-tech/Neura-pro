

import React, { useState, useMemo, useEffect, useRef } from "react";
import { GoogleGenAI, Chat, Content, FunctionDeclaration, Type, GenerateContentResponse, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Timeline } from "./components/Timeline";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { CreateGoalModal } from "./components/CreateGoalModal";
import { Dashboard } from "./components/Dashboard";
import { SettingsModal } from "./components/SettingsModal";
import type { SubjectData, ChatMessageData, Goal, Milestone, StrategyState, UserProfile, GoalFormPayload, StrategyResponse, User, SimulationStageData, PlanUpdateProposal } from './types';
import { createChatSession, generateLearningPlan, generateImage, streamStrategySimulation, getText, proposePlanUpdateTool } from "./services/geminiService";
import { getInitialProfile, convertStrategyToMilestones, encode, decode, decodeAudioData } from "./utils";
// import { Auth } from "./components/Auth";
import { PricingModal } from "./components/PricingModal";
// import { ProfileSetup } from "./components/ProfileSetup";
import { PlanReviewBar } from "./components/PlanReviewBar";
import { SimulationProgress } from "./components/SimulationProgress";
import { SimulationStageDisplay } from "./components/SimulationStage";


interface ActiveGoal extends Goal {
  subject: string;
}

const SIMULATION_STAGES: { [key: string]: { key: string, title: string } } = {
    context_verification: { key: 'S1', title: 'Verifying' },
    diagnostic_analysis: { key: 'S2', title: 'Analyzing' },
    strategic_design: { key: 'S3', title: 'Designing' },
    feasibility_forecasting: { key: 'S4', title: 'Forecasting' },
    strategic_synthesis: { key: 'S5', title: 'Synthesizing' },
};

const SIMULATION_MILESTONES: Milestone[] = Object.values(SIMULATION_STAGES).map(s => ({
    key: s.key,
    title: s.title,
    steps: [],
    state: 'pending',
}));


const markMilestoneAsCompleteTool: FunctionDeclaration = {
    name: 'markMilestoneAsComplete',
    description: 'Marks a milestone as complete after the student has passed the end-of-chapter test for it.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            milestoneKey: {
                type: Type.STRING,
                description: 'The key of the milestone that has just been completed (e.g., "T1", "T2").',
            },
        },
        required: ['milestoneKey'],
    },
};

const scheduleSpacedRepetitionTool: FunctionDeclaration = {
    name: 'scheduleSpacedRepetition',
    description: 'Schedules a future review session for a specific topic to enhance long-term retention.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            milestoneKey: {
                type: Type.STRING,
                description: 'The key of the milestone to be reviewed in the future (e.g., "T1").',
            },
            delayInDays: {
                type: Type.NUMBER,
                description: 'The number of days from now when the review should occur (e.g., 3, 7, 14).',
            }
        },
        required: ['milestoneKey', 'delayInDays'],
    },
};

// --- Mock Data for Development ---
const MOCK_PHYSICS_GOAL: SubjectData[] = [
    {
        subject: "Physics",
        goals: [
            {
                id: "mock-physics-1",
                name: "Master Newtonian Mechanics",
                days: 45,
                plan: [
                    { key: "M1", title: "Kinematics", state: "active", steps: [{ text: "Understand velocity and acceleration.", completed: false }], deadline: "Jul 15", duration_days: 10 },
                    { key: "M2", title: "Newton's Laws", state: "pending", steps: [], deadline: "Jul 25", duration_days: 10 },
                    { key: "M3", title: "Work and Energy", state: "pending", steps: [], deadline: "Aug 5", duration_days: 11 },
                    { key: "M4", title: "Momentum", state: "pending", steps: [], deadline: "Aug 15", duration_days: 10 },
                    { key: "GA", title: "Goal Achieved", state: "goal", steps: [] },
                ],
            }
        ]
    }
];


interface AuthenticatedAppProps {
    user: User;
    profile: UserProfile;
    data: SubjectData[];
    onDataChange: React.Dispatch<React.SetStateAction<SubjectData[]>>;
    onLogout: () => void;
    onSubscribe: () => void;
    onSaveProfile: (profile: UserProfile) => void;
}

const getSimulationSubtitle = (stage?: SimulationStageData): string => {
    if (!stage) return "Initializing...";
    switch (stage.phase) {
        case 'context_verification':
            const sources = stage.artifacts?.verified_sources ?? 0;
            return `${sources} source${sources === 1 ? '' : 's'} verified...`;
        case 'diagnostic_analysis':
            const weakness = stage.artifacts?.weaknesses?.[0];
            return weakness ? `Accounting for constraints like "${weakness}"...` : 'Identifying strengths and weaknesses...';
        case 'strategic_design':
            const method = stage.artifacts?.methods?.[0];
            return method ? `Integrating methods like "${method}"...` : 'Structuring milestones...';
        case 'feasibility_forecasting':
            const risk = stage.artifacts?.risk_level;
            return risk ? `Forecasting a ${risk} risk level...` : 'Calculating feasibility...';
        case 'strategic_synthesis':
            const count = stage.artifacts?.milestone_count;
            return count ? `Finalizing ${count} milestones...` : 'Synthesizing plan...';
        default:
            return stage.narration;
    }
}


function AuthenticatedApp({ user, profile, data, onDataChange, onLogout, onSubscribe, onSaveProfile }: AuthenticatedAppProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeGoalId, setActiveGoalId] = useState<string | null>("mock-physics-1");
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{strategy: StrategyResponse, sources: any[]} | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(profile);
  const [showPricing, setShowPricing] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [simulationState, setSimulationState] = useState<StrategyState | null>(null);
  const [isLiveSessionActive, setIsLiveSessionActive] = useState(false);
  const [pendingPlanUpdate, setPendingPlanUpdate] = useState<PlanUpdateProposal | null>(null);


  const chatRef = useRef<Chat | null>(null);
  const refinementChatRef = useRef<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const liveSessionRef = useRef<any>(null);
  const audioResourcesRef = useRef<{
    inputAudioContext: AudioContext | null;
    outputAudioContext: AudioContext | null;
    micStream: MediaStream | null;
    scriptProcessor: ScriptProcessorNode | null;
    outputSources: Set<AudioBufferSourceNode>;
  }>({ inputAudioContext: null, outputAudioContext: null, micStream: null, scriptProcessor: null, outputSources: new Set() });
  const liveTranscriptRef = useRef({ input: '', output: '' });

  const activeGoal = useMemo<ActiveGoal | null>(() => {
    if (!activeGoalId) return null;
    for (const s of data) {
      const found = s.goals.find((g) => g.id === activeGoalId);
      if (found) return { subject: s.subject, ...found };
    }
    return null;
  }, [activeGoalId, data]);
  
  const totalGoals = useMemo(() => data.reduce((acc, s) => acc + s.goals.length, 0), [data]);

  useEffect(() => {
    if (activeGoal && activeGoal.plan && !pendingPlan && !simulationState) {
      
      const systemInstruction = `You are Neura, an autonomous, highly intelligent, neuroscience-backed expert AI teacher and learning coach. Your persona is a blend of a kind, brilliant teacher and a world-class strategist. Your tone is always warm, encouraging, intelligent, and focused. Your ultimate goal is to ensure the student achieves true mastery and confidence.

## 🧬 Scientific Reasoning & Research Rules (Updated — Flexible, Verified, Contextual)

Neura bases every decision on **verified, neuroscience-backed evidence** and **sound cognitive reasoning** — never assumptions or popularity.
You are free to reference **any peer-reviewed, academic, or government source** that strengthens the accuracy and scientific basis of the plan, as long as it aligns with the student’s profile, goal, and resources.

---

### 1. 🔍 **Dynamic Scientific Discovery**

You are not limited to a fixed list of theories or journals.
When building strategies, dynamically search for and apply **the most relevant and current neuroscience findings, pedagogical frameworks, and cognitive models** that suit the learner’s specific situation.

This includes, but is not limited to:

* Cognitive and Educational Neuroscience (e.g. neuroplasticity, memory consolidation, attention control, reward systems)
* Pedagogical Science (e.g. constructivism, inquiry-based learning, project-based learning, metacognition)
* Evidence-Based Learning Strategies (e.g. retrieval practice, spacing, interleaving, elaboration, cognitive load management)
* Motivation, Focus, and Emotional Regulation Research
* Learning differences and SEN-related neuroscience (e.g. dyslexia, ADHD, autism)
* Subject-specific pedagogy (e.g. conceptual scaffolding in math, visualization in biology, argumentation frameworks in history)

If the goal involves a highly specialized domain (e.g. university-level AI or physics), you may include domain-specific educational research or cognition-in-STEM findings.

---

### 2. 🧩 **Contextual Adaptation**

Each learner’s situation is unique.
Always adapt your reasoning and chosen research findings to the **student’s real context**, which includes:

* Their **academic profile** (grade, syllabus, subject)
* Their **learning preferences and constraints** (SEN, available time, goals)
* Their **uploaded resources**
* Their **environment** (school, country, or curriculum system)

For example:

* A Cambridge IGCSE student → align with IGCSE examiner reports and syllabus structure.
* A learner with ADHD → include focus and attention scaffolding strategies supported by executive function research.
* A student with short timelines → emphasize high-yield neuroscience strategies for accelerated learning (like retrieval + interleaving).

---

### 3. 🧠 **Source Verification Protocol**

You must always verify and rank sources by credibility before using them in reasoning or narration.

Preferred source hierarchy:

1. **Peer-reviewed journals or meta-analyses**
   (e.g. *Nature*, *Frontiers in Education*, *APA PsycNet*, *Elsevier*, *Oxford Academic*)
2. **Government and accredited institutional reports**
   (e.g. *U.S. Department of Education*, *OECD*, *UNESCO*, national exam boards)
3. **Reputable academic publishers or education organizations**
   (e.g. *Cambridge Assessment*, *Harvard Graduate School of Education*)
4. **High-trust educational summaries** (only if citing primary sources)
   (e.g. Learning Scientists, Edutopia, etc., if properly referenced)

Reject sources that are:

* Personal blogs, unverified self-published materials, or anecdotal “study tips.”
* Outdated or untraceable references.
* Commercial claims not supported by scientific evidence.

When referencing findings, describe the principle and its impact — you don’t need to cite academic-style references unless the system requires citation formatting.
Example narration:

> “I’m drawing from recent cognitive science research showing that retrieval practice activates hippocampal memory consolidation more effectively than re-reading.”

---

### 4. 💬 **Interactive Clarification & Data Completion**

If information in the profile or goal form is incomplete, ambiguous, or inconsistent:

* **Pause your reasoning** and ask the student a clarifying question before proceeding.
* Wait for their answer, then continue seamlessly with updated reasoning.

For example:

> “I see you want an A in Chemistry, but your syllabus type isn’t specified. Could you confirm whether you follow the Cambridge 0620 syllabus or another one?”

After receiving clarification:

> “Got it — aligning with Cambridge 0620 now. I’ll verify the exam date and ensure your plan fits the available timeframe.”

This ensures that the plan is:

* Built on verified, real-world information;
* Tailored to the student’s exact circumstances;
* Continuously refined through dialogue.

---

### 5. 🔄 **Reasoning Integrity & Transparency**

At every stage of reasoning, explain what you’re doing and why — like a transparent cognitive scientist.
Avoid vague language. Instead:

* Justify your actions with logical or scientific reasoning.
* Mention which cognitive or educational mechanisms guide your decision.
* Describe how this choice improves retention, focus, or understanding.

For example:

> “I’m incorporating spaced retrieval and interleaving because research shows these techniques enhance durable memory and prevent over-reliance on short-term recall.”

---

### 6. 🧩 **When Conflicting Research Appears**

If studies or findings disagree:

* Compare **sample size**, **methodological rigor**, and **recency**.
* Favor large-scale meta-analyses or systematic reviews over isolated studies.
* Mention the uncertainty clearly in narration if it affects your confidence.

Example:

> “Some studies suggest interleaving benefits only advanced learners, while others find universal improvement. Given your current mastery level, I’ll apply a gradual mix to test which pattern works best.”

---

### 7. 🧬 **Principle of Scientific Evolution**

Science evolves — so should Neura.
Always remain open to new evidence, methods, and research.
Your reasoning should reflect this adaptability:

> “I’ll continue updating this plan as new findings emerge or as I observe your performance data.”

---

### 8. 🧭 **Outcome**

By following these rules, Neura ensures that every learning plan is:

* Scientifically justified
* Verified and context-specific
* Adaptively intelligent
* Transparent and conversational

Neura is not just retrieving knowledge — she’s *reasoning like a living educational scientist* who partners with the student to build mastery.

---

### ABSOLUTE FORMATTING RULES (MANDATORY)
1.  **NO HORIZONTAL RULES:** Under NO circumstances use markdown horizontal rules (\`---\`, \`***\`, etc.). You MUST separate sections ONLY with blank lines (vertical whitespace) as defined in the Spacing System. This is a critical, non-negotiable instruction.
2.  **HEADING LEVELS:**
    *   Use a Level-2 Heading \`##\` for major new topics, always prefaced with the \`🧠\` emoji. (Example: \`## 🧠 Key Concept: Velocity\`)
    *   Use a Level-3 Heading \`###\` for summaries, always prefaced with the \`📝\` emoji. (Example: \`### 📝 Key Takeaways\`)

### CURRENT LEARNING PLAN
You MUST strictly follow this learning plan. The 'active' milestone is the current focus.
${JSON.stringify(activeGoal.plan, null, 2)}

### 🧠 Neura’s Typography System
Each visual and structural cue has a *cognitive purpose* — to mirror how your working memory and attention process information.

#### 🎯 1. **Hierarchy Encoding**
This is the “architecture” of the text — how I use formatting to build a mental map.

*   **Bold**: Used for **key terms**, **definitions**, and **commands** to anchor crucial memory targets.
*   *Italics*: Used for *processes*, *analogies*, and *nuances* to signal a softer conceptual or emotional tone.
*   UPPERCASE: Used for scientific terms/acronyms like DNA, ATP, CELL THEORY to distinguish them.
*   Emoji tags (✅ / 🔬 / 🧠 / ⚡): Used to create *semantic anchors* for quick pattern recognition.


**Specific Emoji Tags to Use:**
*   🧠 **Key Concept:** Use for introducing a new core idea or theory.
*   💡 **Example / Analogy:** Use when providing a concrete example or illustrative analogy.
*   ❓ **Question for you:** Use when asking the student a direct question to check understanding.
*   ✅ **Excellent!** or 👍 **Good start!:** Use for positive reinforcement.
*   🤔 **Let's think about this:** Use when a student's answer is incorrect, to gently pivot to the diagnostic process.
*   📝 **Summary / Key Takeaways:** Use at the end of a topic to summarize the main points.

#### 🧩 2. **Block Structuring**
I use visual “chunks” — tables, short lists, and clean separations — to reduce cognitive load. Each block serves a learning function:

*   **Tables**: To compare & contrast, building schemas efficiently.
*   **Lists (1–2–3)**: For step-by-step sequencing.
*   **Analogies**: To connect abstract science to concrete memory.
*   **Mini Tests**: For metacognitive feedback, allowing instant self-assessment.

This keeps working memory below its overload threshold (usually 4–7 elements).

**Specific Block Structures to Use:**
*   **Paragraphs:** Always leave a blank line between paragraphs for readability.
*   **Lists**: Use bullet points (*) for unordered lists and numbered lists (1., 2.) for steps or sequences. Ensure proper spacing.
*   **Definitions:** Present definitions on a new line, using this exact format:
    > **Term:** *A clear and concise definition of the term.*
*   **Code & Formulas:** Always place code, mathematical formulas, or structured data inside triple-backtick code blocks for clear separation and formatting.
    \`\`\`python
    # Example code block
    def calculate_moles(mass, molar_mass):
      return mass / molar_mass
    \`\`\`
*   **Tables:** Use markdown table formatting for comparisons or structured data.

#### 📘 3. **Pedagogical Rhythm**
I write in a **3-phase cognitive rhythm**:

1. **Input** — short, chunked conceptual teaching
2. **Pattern** — analogy or diagram to encode meaning
3. **Output** — quick recall check or past paper tie-in

This rhythm follows how long-term retention stabilizes — alternating between *understanding*, *visualizing*, and *retrieving.* This protocol is detailed further in the "Interactive Teaching Protocol" section.

#### ⚙️ 4. **Typographic Intelligence**
Every font cue is deliberate:

* **Bold = anchor term** → what you’d put on flashcards
* *Italics = cognitive bridge* → helps you relate the idea to something known
* Tables = schema formation (for comparison learning)
* Emojis = emotional tagging → faster recall and engagement

I call this **Cognitive Typography**, and it’s one of Neura’s core teaching engines — tuned to *optimize your attention flow while learning fast and deeply.*


### ✨ Neura's Spacing System

Spacing is one of Neura’s most carefully tuned design layers.
It’s not just “aesthetic”; it’s **neurocognitive spacing** — engineered to manage *attention, rhythm, and retention*.

Let’s break it down.

#### 🧠 1. The Principle: “One Concept, One Breath”

Every **visual gap = one cognitive breath.**

Your brain processes text rhythmically, like music — it needs pauses to encode meaning. So Neura’s spacing follows this pattern:

*   **Micro-spacing** (approx. ½ a line break): Use between related points to keep them visually linked but mentally separable.
*   **Mesospacing** (approx. 1 full line break): Use between sections (e.g., from a definition to an example) to give the brain time to consolidate before a context shift.
*   **Macro-spacing** (approx. 2 full line breaks): Use between major conceptual blocks to reset attention and prevent cognitive overload.

This follows the **“segmentation effect”** in cognitive psychology — chunking content reduces intrinsic load.

#### 🔬 2. Optimal Line Density

I target **5–7 lines per visual unit** before a break.
Why?
Because working memory holds roughly **4 ± 1 elements** before fatigue begins.
After 7 lines, comprehension drops sharply — spacing acts like a reset button.

#### 📐 3. Vertical + Horizontal Logic

* **Vertical spacing** = regulates pacing (like breathing in reading).
* **Horizontal spacing** (indentation, bullet offsets) = structures hierarchy and depth of thought.

Together, they create what I call **Cognitive Flow Layout** — the reader never feels “crammed,” yet the continuity is intact.

#### 🎯 4. Exam-Mode Compression

When we switch to **exam-style notes or revision summaries**, I compress spacing intentionally:

* Narrower gaps
* Denser bullets
* Tighter visual rhythm

→ This trains your **rapid retrieval mode**, mimicking exam conditions where time pressure is high.

#### ✨ TL;DR — Neura’s Spacing Rules

*   **One concept per visual block:** This helps to avoid cognitive overload.
*   **Leave white space for recall:** This aids in memory consolidation.
*   **Never stack dense paragraphs:** This prevents cognitive fatigue.
*   **Adjust spacing to the task:** The spacing should differ for learning (more space) versus testing (more compressed). This is context-adaptive design.

### INTERACTIVE TEACHING & CORRECTION PROTOCOL
Your primary role is to execute the learning plan, but more importantly, to act as a dynamic coach who adapts the strategy based on the student's real-time performance. A plan is a hypothesis; your job is to test it and pivot when necessary.

**1. Presenting New Information:**
*   Start with a clear heading (e.g., \`## 🧠 Key Concept: Newton's First Law\`).
*   Explain the concept in clear, simple paragraphs. Teach in small, manageable chunks.
*   Provide an example using the \`💡\` signpost.
*   After each chunk, ask targeted questions to check for understanding using the \`❓\` signpost.

**2. Handling Student Responses & Error Detection (EDP) — MANDATORY**
*   **If Correct:** Provide specific positive feedback (e.g., \`✅ Excellent! You correctly identified the net force.\`).
*   **If Incorrect:** If at any point the student provides a wrong answer, shows hesitation, or expresses low confidence, you MUST immediately halt and activate the Error Detection Protocol.
    1.  **Do not** give the answer directly.
    2.  Start with the \`🤔 **Let's think about this...**\` signpost.
    3.  Gently state what part of the concept might be tricky. (e.g., *It seems like the idea of 'net force' is the tricky part. Let's break it down.*)
    4.  **Perform the 4 Core Checks** by asking targeted micro-questions in a numbered list until you are fully confident of the error's source.
        - Conceptual Check: "Can you explain the definition of [key term] in your own words?"
        - Procedural Check: "Walk me through the steps you took to get that answer."
        - Calculational Check: "Let's check the math. What is [simpler calculation]?"
        - Misinterpretation Check: "What did the question ask you to find?"
    5.  **State Your Diagnosis:** After your questions, clearly state your finding. Example: "Okay, thank you. It looks like the core concept of molar ratios is the tricky part, but your calculation steps are perfect. Let's quickly rebuild that foundational idea."
    6.  **Targeted Correction:** Based *only* on your confirmed diagnosis, apply the specific remedy (re-teaching, walkthroughs, drills).
    7.  **Post-Correction & Mastery Loop:** After correction, **immediately test the corrected skill** with a fresh, similar question. Do not move on until mastery is confirmed.

**3. End-of-Milestone Assessment:**
*   Once all steps for the milestone are taught successfully, administer a comprehensive "end of chapter test" to assess mastery.
*   Mark the test. If they struggle, provide detailed corrections and run "correction drills" by looping back to the EDP.
*   ONLY after the student has demonstrated full comprehension by passing the test, you MUST call the \`markMilestoneAsComplete\` function.
*   After marking a milestone complete, provide a summary under a \`### 📝 Key Takeaways\` heading.

### PIVOTING & ADAPTATION (STRATEGIC)
While teaching, you are constantly gathering data on the student.
*   Observe: Pay attention to how long it takes them to grasp concepts, common errors they make, and which teaching methods or resources seem most effective.
*   Identify Deviations: If you notice the student is struggling significantly, progressing much faster than planned, or if a planned method is ineffective, you must propose a change.
*   Propose a Pivot: To propose a change, you MUST call the \`proposePlanUpdate\` function. Provide a clear, encouraging \`reasoning\` for the student. For example: "I've noticed we're spending more time on stoichiometry than planned, and the textbook seems more effective. I recommend we adjust the timeline to ensure we cover it thoroughly."

### EVALUATION & CONTROL (MILESTONE REVIEW PROTOCOL)
After you have successfully called the \`markMilestoneAsComplete\` function, you MUST immediately initiate a "Milestone Review" before starting the next milestone.
1.  Performance Analysis: Internally review the chat history for the just-completed milestone. Note common errors, time taken, and conceptual struggles.
2.  Solicit Feedback: Ask the student for their feedback: "Great work finishing that milestone! Before we move on, how did you feel about [Topic]? Was anything particularly easy or difficult?"
3.  Research & Adapt (if needed): If the review (your analysis + student feedback) reveals a persistent weakness (e.g., student struggles with abstract concepts), you should rely on your general knowledge and pedagogical expertise to suggest alternative teaching methods.
4.  Propose Pivot: Based on your research and the review, if you believe a change to the plan for *future* milestones is necessary, you MUST use the \`proposePlanUpdate\` function to suggest the change. Explain your reasoning clearly, citing your research.
5.  Transition: Once the review is complete (and any plan updates are handled), smoothly transition to the next active milestone.

### HANDLING EXTERNAL RESOURCES (URLs)
If the user provides a URL, you should state that you cannot access external websites or specific URLs directly. You can, however, discuss the general topics mentioned in the URL if the user provides a summary.

The student has just confirmed the plan. Your first task is to greet them, state the title of the first active milestone and its first step, and begin teaching.`;
      
      const tools = [markMilestoneAsCompleteTool, scheduleSpacedRepetitionTool, proposePlanUpdateTool];
      
      const history: Content[] = messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
      }));

      // NOTE: Temporarily disabling googleSearch due to API limitations with function calling.
      chatRef.current = createChatSession(systemInstruction, history, tools, false);
      
      const isFirstTurnAfterConfirmation = messages.length === 1 && messages[0].type === 'strategy';
      if (messages.length === 0 || isFirstTurnAfterConfirmation) {
        handleSend("Let's begin.", false, true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGoal, pendingPlan, simulationState]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  const handleCreateGoal = async (payload: GoalFormPayload) => {
    if (user.subscriptionStatus === 'free' && totalGoals >= 1) {
      setShowPricing(true);
      return;
    }
    setShowCreate(false);
    setMessages([]); // Clear previous chat history for the new goal session

    const deadlineDate = new Date(payload.deadline_iso);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(23, 59, 59, 999);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    const newGoal: Goal = {
      id: `g${Date.now()}`,
      name: payload.goal_text,
      days: days,
      measurement: payload.goal_text,
      resources: payload.resources.map(r => ({ name: r.title_detected, mimeType: 'unknown' })),
      studyTimeCommitment: `${payload.hours_per_day} hours per day, ${payload.days_per_week} days a week`,
      plan: SIMULATION_MILESTONES.map(m => ({ ...m, state: 'pending' })),
    };
    
    onDataChange(currentData => {
        const subjectIndex = currentData.findIndex(s => s.subject === payload.subject);
        if (subjectIndex > -1) {
            const newData = [...currentData];
            newData[subjectIndex] = { ...newData[subjectIndex], goals: [...newData[subjectIndex].goals, newGoal] };
            return newData;
        } else {
            return [...currentData, { subject: payload.subject, goals: [newGoal] }];
        }
    });
    
    setActiveGoalId(newGoal.id);

    // This function will now manage its own state for the simulation process
    // and return the final state object when complete.
    const processSimulation = async (): Promise<StrategyState> => {
        const stream = streamStrategySimulation(payload, userProfile);
        let completedStageKeys = new Set<string>();

        let currentSimulationState: StrategyState = {
            currentTitle: 'Formulating Strategy...',
            currentStatus: 'Initiating simulation...',
            stages: [],
            showDetails: false,
        };
        // Set the initial state for the UI
        setSimulationState(currentSimulationState);


        for await (const stage of stream) {
            const stageKey = SIMULATION_STAGES[stage.phase]?.key;
            if (stageKey) {
                completedStageKeys.add(stageKey);
            }
            
            // Create the new state based on the previous state within this scope
            currentSimulationState = {
                ...currentSimulationState,
                currentStatus: stage.status,
                stages: [...currentSimulationState.stages, stage],
            };
            // Update the UI
            setSimulationState(currentSimulationState);


            // Update the timeline bar
            onDataChange(currentData => currentData.map(s => ({
                ...s,
                goals: s.goals.map(g => {
                    if (g.id === newGoal.id) {
                        const newPlan = g.plan?.map(m => {
                            if (m.key === stageKey) return { ...m, state: 'active' as const };
                            if (completedStageKeys.has(m.key)) return { ...m, state: 'done' as const };
                            return m;
                        })
                        return { ...g, plan: newPlan };
                    }
                    return g;
                })
            })));
        }
        return currentSimulationState;
    };

    const processPlanGeneration = async () => {
        const { strategy, groundingMetadata } = await generateLearningPlan(payload, userProfile);
        const webSources = groundingMetadata?.groundingChunks?.map((c: any) => ({ uri: c.web.uri, title: c.web.title })) ?? [];
        return { strategy, sources: webSources };
    };


    try {
        const [simulationResult, planResult] = await Promise.all([
            processSimulation(),
            processPlanGeneration(),
        ]);
        
        setPendingPlan({ strategy: planResult.strategy, sources: planResult.sources });
        
        // After simulation, clear the timeline until the plan is confirmed.
        onDataChange(currentData => currentData.map(s => ({
            ...s,
            goals: s.goals.map(g => {
                if (g.id === newGoal.id) {
                    return { ...g, plan: [] };
                }
                return g;
            })
        })));

        const refinementSystemInstruction = `You are Neura. You have just proposed the following study plan JSON to a student. The student may now ask for adjustments or ask questions.

        CURRENT PLAN:
        ${JSON.stringify(planResult.strategy, null, 2)}

        YOUR TASK:
        1.  **If the student requests a change** (e.g., "make milestone 2 easier", "add a topic"), you MUST modify the plan and return the ENTIRE, UPDATED learning strategy as a single JSON object. Strictly adhere to the original JSON schema. Do not add any other text.
        2.  **If the student asks a question** (e.g., "is this the full plan?", "why is M1 so long?") or makes a comment, respond conversationally as a helpful AI tutor. When responding conversationally, use clear, well-formatted markdown with paragraph breaks (double newlines) to ensure readability. DO NOT return JSON in this case.`;

        refinementChatRef.current = createChatSession(refinementSystemInstruction);

        const finalStrategyMessage: ChatMessageData = {
            id: `strat-${Date.now()}`,
            role: 'assistant',
            content: '',
            type: 'strategy',
            strategyState: {
                ...simulationResult,
                currentTitle: 'Your Strategic Pathway',
                currentStatus: 'Ready for review',
            },
            strategy: planResult.strategy,
            sources: planResult.sources,
        };
        
        setMessages([finalStrategyMessage]);
        setSimulationState(null); // End simulation, show the final card

    } catch (error) {
        console.error("Error during strategy formulation:", error);
        setMessages(msgs => [...msgs, { 
            id: `err-${Date.now()}`,
            role: 'assistant', 
            type: 'text', 
            content: `I'm sorry, I ran into an issue while creating your plan.\n\n**Error:**\n\`${error instanceof Error ? error.message : String(error)}\`\n\nPlease try creating the goal again with a clearer objective or check the console for more details.` 
        }]);
        setSimulationState(null);
    }
  };

  const confirmPlan = () => {
    if (!pendingPlan || !activeGoalId) return;
    
    const newPlanMilestones = convertStrategyToMilestones(pendingPlan.strategy);

    onDataChange(currentData => currentData.map(s => ({
        ...s,
        goals: s.goals.map(g => g.id === activeGoalId ? { 
            ...g, 
            strategy: pendingPlan.strategy, 
            plan: newPlanMilestones,
        } : g)
    })));
    
    // Clear all messages except the confirmed strategy card to start the session clean
    setMessages(msgs => msgs.filter(m => m.type === 'strategy'));
    setPendingPlan(null);
    refinementChatRef.current = null;
  };

  const handleSend = async (text: string, isEditing = false, isAutomatedFirstMessage = false) => {
    setIsLoading(true);

    if (pendingPlan && /confirm|let's start|begin|ok start/i.test(text)) {
        confirmPlan();
        setIsLoading(false);
        return;
    }
    
    if (!isEditing && !isAutomatedFirstMessage) {
      const userMessage: ChatMessageData = { id: `msg-${Date.now()}`, role: "user", content: text };
      setMessages((prev) => [...prev, userMessage]);
    }
    
    // Add a placeholder for the assistant's response to show the thinking indicator.
    // This is crucial for the streaming animation to have a target to render into.
    const assistantMessageId = `assist-${Date.now()}`;
    const assistantPlaceholder: ChatMessageData = { id: assistantMessageId, role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantPlaceholder]);

    if (text.startsWith('/image ')) {
        const prompt = text.substring(7);
        try {
            const imageData = await generateImage(prompt);
            const imageMessage: ChatMessageData = {
                id: `img-${Date.now()}`,
                role: 'assistant',
                content: `data:image/jpeg;base64,${imageData}`,
                type: 'image',
            };
            setMessages(prev => prev.map(m => m.id === assistantMessageId ? imageMessage : m));
        } catch (error) {
            console.error("Error generating image:", error);
            const errorMessage = `${error instanceof Error ? error.message : 'Sorry, I could not generate an image for that.'}`;
            setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: errorMessage } : m));
        } finally {
            setIsLoading(false);
        }
        return;
    }

    const chatSession = pendingPlan ? refinementChatRef.current : chatRef.current;
    if (!chatSession) {
        setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
        setIsLoading(false);
        return;
    }

    try {
        if (pendingPlan) {
            // Non-streaming for plan refinement
            const result = await chatSession.sendMessage({ message: text });
            const responseText = getText(result);
            setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: responseText } : m));
        } else {
            // Streaming for main chat
            const stream = await chatSession.sendMessageStream({ message: text });
            let fullResponseText = '';
            
            for await (const chunk of stream) {
                const chunkText = getText(chunk);
                if (chunkText) {
                    fullResponseText += chunkText;
                    setMessages(prev => {
                        return prev.map(msg => 
                            msg.id === assistantMessageId 
                            ? { ...msg, content: fullResponseText } 
                            : msg
                        );
                    });
                }
            }
        }

    } catch (error) {
        console.error("Error sending message:", error);
        const errorMessage = `Sorry, I encountered an error. ${error instanceof Error ? error.message : ''}`;
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? { ...m, content: errorMessage } : m));
    } finally {
        setIsLoading(false);
    }
  };

   const handleAcceptUpdate = () => {
    if (!pendingPlanUpdate || !activeGoalId) return;

    onDataChange(currentData => {
        return currentData.map(s => ({
            ...s,
            goals: s.goals.map(g => {
                if (g.id === activeGoalId && g.plan) {
                    const newPlan = g.plan.map(m => {
                        if (m.key === pendingPlanUpdate.milestoneKey) {
                            const updatedMilestone = { ...m };
                            const changes = pendingPlanUpdate.changes;
                            if (changes.duration_days) {
                                updatedMilestone.duration_days = changes.duration_days.to;
                            }
                            // Reconstruct steps based on changes
                            let focusText = `Focus: ${(changes.focus?.to || m.steps.find(step => step.text.startsWith('Focus:'))?.text.replace('Focus: ', '').split(', ') || []).join(', ')}`;
                            let methodsText = `Methods: ${(changes.methods?.to || m.steps.find(step => step.text.startsWith('Methods:'))?.text.replace('Methods: ', '').split(', ') || []).join(', ')}`;
                            let assessmentText = `Assessment: ${changes.assessment?.to || m.steps.find(step => step.text.startsWith('Assessment:'))?.text.replace('Assessment: ', '') || ''}`;
                            
                            updatedMilestone.steps = [
                                { text: focusText, completed: false },
                                { text: methodsText, completed: false },
                                { text: assessmentText, completed: false },
                            ];

                            return updatedMilestone;
                        }
                        return m;
                    });
                    return { ...g, plan: newPlan };
                }
                return g;
            })
        }));
    });
    
    // Remove the proposal card
    setMessages(prev => prev.filter(m => m.type !== 'plan_update_proposal'));
    handleSend(`Great, I've updated the plan for milestone ${pendingPlanUpdate.milestoneKey}. Let's continue with the new approach.`, false, true);
    setPendingPlanUpdate(null);
  };
  
  const handleDeclineUpdate = () => {
     if (!pendingPlanUpdate) return;
     setMessages(prev => prev.filter(m => m.type !== 'plan_update_proposal'));
     handleSend(`Okay, we'll stick to the original plan for now. Let me know if you change your mind.`, false, true);
     setPendingPlanUpdate(null);
  }

  const stopLiveSession = () => {
    setIsLiveSessionActive(false);

    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }

    const { micStream, scriptProcessor, inputAudioContext, outputAudioContext, outputSources } = audioResourcesRef.current;
    
    micStream?.getTracks().forEach(track => track.stop());
    scriptProcessor?.disconnect();
    inputAudioContext?.close();
    outputAudioContext?.close();
    outputSources.forEach(source => source.stop());

    audioResourcesRef.current = {
      inputAudioContext: null,
      outputAudioContext: null,
      micStream: null,
      scriptProcessor: null,
      outputSources: new Set(),
    };
  };

  const startLiveSession = async () => {
    if (!activeGoal) return;
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsLiveSessionActive(true);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioResourcesRef.current.inputAudioContext = inputAudioContext;
        audioResourcesRef.current.outputAudioContext = outputAudioContext;

        let nextStartTime = 0;

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
                audioResourcesRef.current.micStream = stream;
                const source = inputAudioContext.createMediaStreamSource(stream);
                const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                audioResourcesRef.current.scriptProcessor = scriptProcessor;

                scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                  const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                  const int16 = new Int16Array(inputData.length);
                  for (let i = 0; i < inputData.length; i++) {
                    int16[i] = inputData[i] * 32768;
                  }
                  const pcmBlob: GenAIBlob = {
                    data: encode(new Uint8Array(int16.buffer)),
                    mimeType: 'audio/pcm;rate=16000',
                  };

                  sessionPromise.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                  });
                };
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputAudioContext.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              if (message.serverContent?.outputTranscription) {
                liveTranscriptRef.current.output += message.serverContent.outputTranscription.text;
              }
              if (message.serverContent?.inputTranscription) {
                liveTranscriptRef.current.input += message.serverContent.inputTranscription.text;
              }
              if (message.serverContent?.turnComplete) {
                const userInput = liveTranscriptRef.current.input.trim();
                const modelOutput = liveTranscriptRef.current.output.trim();
                
                setMessages(prev => {
                  const newMessages: ChatMessageData[] = [];
                  if (userInput) {
                    newMessages.push({ id: `live-user-${Date.now()}`, role: 'user', content: userInput });
                  }
                  if (modelOutput) {
                    newMessages.push({ id: `live-model-${Date.now()}`, role: 'assistant', content: modelOutput });
                  }
                  return [...prev, ...newMessages];
                });

                liveTranscriptRef.current = { input: '', output: '' };
              }

              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio && outputAudioContext.state === 'running') {
                nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContext.destination);
                source.addEventListener('ended', () => {
                  audioResourcesRef.current.outputSources.delete(source);
                });
                source.start(nextStartTime);
                nextStartTime += audioBuffer.duration;
                audioResourcesRef.current.outputSources.add(source);
              }
            },
            onerror: (e: ErrorEvent) => {
              console.error("Live session error:", e);
              stopLiveSession();
            },
            onclose: (e: CloseEvent) => {
              stopLiveSession();
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: `You are Neura, an expert AI tutor for ${activeGoal.subject}. Keep your responses concise and conversational.`
          },
        });
        
        liveSessionRef.current = await sessionPromise;
    } catch (err) {
        console.error("Error accessing microphone:", err);
        alert(`Error accessing microphone:\n${err instanceof Error ? err.message : 'The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.'}`);
        stopLiveSession();
    }
  };

  const toggleLiveSession = () => {
      if (isLiveSessionActive) {
          stopLiveSession();
      } else {
          startLiveSession();
      }
  };
  
  const handleFileSelect = (file: File) => {
    console.log("File selected:", file.name);
     setMessages((prev) => [...prev, { id: `msg-${Date.now()}`, role: "user", content: `(Attached file: ${file.name})` }]);
  };
  
  const handleSaveProfileInSettings = (newProfile: UserProfile) => {
    setUserProfile(newProfile); 
    onSaveProfile(newProfile); 
    setShowSettings(false);
  };

  const handleInternalSubscribe = () => {
      onSubscribe();
      setShowPricing(false);
  }

  const handleSaveEdit = (messageId: string, newContent: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const updatedMessages = messages.slice(0, messageIndex + 1).map((msg, index) => {
        if (index === messageIndex) {
            return { ...msg, content: newContent };
        }
        return msg;
    });
    
    setMessages(updatedMessages);
    setEditingMessageId(null);
    
    handleSend(newContent, true);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
  };

  const simulationProgressValue = useMemo(() => {
    if (!simulationState) return 0;
    const totalStages = SIMULATION_MILESTONES.length;
    const completedStages = simulationState.stages.length;
    // Leave a small sliver at the end until it's fully complete
    const progress = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;
    return Math.min(progress, 98);
  }, [simulationState]);

  const latestSimulationStage = useMemo(() => {
    if (!simulationState || simulationState.stages.length === 0) return undefined;
    return simulationState.stages[simulationState.stages.length - 1];
  }, [simulationState]);

  return (
    <div className="h-screen w-screen bg-black flex flex-col font-sans text-white overflow-hidden">
      <Header 
        onToggleSidebar={() => setSidebarOpen(p => !p)} 
        sidebarOpen={sidebarOpen} 
        onOpenSettings={() => setShowSettings(true)}
        onLogout={onLogout}
        userEmail={user.email}
        isLiveSessionActive={isLiveSessionActive}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
            open={sidebarOpen} 
            data={data} 
            activeGoalId={activeGoalId} 
            onSelectGoal={(id) => { setActiveGoalId(id); setMessages([]); setPendingPlan(null); setSimulationState(null); refinementChatRef.current = null; }}
            onOpenCreate={() => setShowCreate(true)}
            onToggle={() => setSidebarOpen(p => !p)}
        />
        <main className="flex-1 flex flex-col bg-black text-white">
            {totalGoals === 0 ? (
                <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
                    <div className="px-4 py-2 border-b border-white/10">
                        <p className="text-sm text-white/60">No Active Goal</p>
                        <h1 className="text-lg font-semibold text-white/90">Create a Goal to Begin</h1>
                    </div>
                    <div className="px-4 md:px-6 pt-4">
                        <Timeline />
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <button 
                            className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 hover:bg-white/10 transition-colors"
                            onClick={() => setShowCreate(true)}
                            aria-label="Create new goal"
                        >
                            <svg viewBox="0 0 24" className="h-8 w-8 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                        <h2 className="text-xl font-bold text-white/90">Create a goal to get started</h2>
                        <p className="text-white/60 mt-2 max-w-sm">
                            Click the '+' in the sidebar or the button below to define your first learning objective and start your personalized journey.
                        </p>
                         <button 
                            className="mt-6 px-5 py-2.5 rounded-lg bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                            onClick={() => setShowCreate(true)}
                        >
                            Create Goal
                        </button>
                    </div>
                     <div className="px-4 md:px-6 pb-4">
                        <ChatInput onSend={()=>{}} onFileSelect={()=>{}} isLoading={false} disabled={true} isLiveSessionActive={false} onToggleLiveSession={() => {}} />
                    </div>
                </div>
            ) : !activeGoal ? (
                <Dashboard data={data} onSelectGoal={(id) => setActiveGoalId(id)} onOpenCreate={() => setShowCreate(true)} />
            ) : (
                <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full overflow-hidden">
                    <div className="px-4 py-2 border-b border-white/10">
                        <p className="text-sm text-white/60">Working on: {activeGoal.subject}</p>
                        <h1 className="text-lg font-semibold text-white/90 truncate">{activeGoal.name}</h1>
                    </div>
                    <div className="px-4 md:px-6 pt-4 relative z-10">
                        {simulationState ? (
                           <div>
                                <SimulationProgress 
                                    title={latestSimulationStage?.status || simulationState.currentStatus}
                                    subtitle={getSimulationSubtitle(latestSimulationStage)}
                                    progress={simulationProgressValue}
                                    onShowDetails={() => {
                                        // This button is now vestigial as details are in the card, but we can leave the state update
                                        setSimulationState(s => s ? {...s, showDetails: !s.showDetails} : null)
                                    }}
                                />
                           </div>
                        ) : (
                            <Timeline milestones={activeGoal.plan} />
                        )}
                    </div>
                    <div ref={chatContainerRef} className="flex-1 p-4 md:p-6 overflow-y-auto">
                        <div className="w-full flex flex-col gap-5">
                            {messages.map((msg, index) => {
                                const isLastMessage = index === messages.length - 1;
                                const isStreamingMessage = isLastMessage && isLoading && msg.role === 'assistant';
                                return (
                                    <ChatMessage 
                                        key={msg.id} 
                                        {...msg} 
                                        isEditing={editingMessageId === msg.id}
                                        onStartEdit={() => setEditingMessageId(msg.id)}
                                        onCancelEdit={handleCancelEdit}
                                        onSaveEdit={handleSaveEdit}
                                        onAcceptUpdate={handleAcceptUpdate}
                                        onDeclineUpdate={handleDeclineUpdate}
                                        isStreaming={isStreamingMessage}
                                    />
                                )
                            })}
                        </div>
                    </div>
                    <div className="px-4 md:px-6 pb-4">
                        {pendingPlan ? (
                            <PlanReviewBar 
                                onSend={handleSend} 
                                isLoading={isLoading} 
                            />
                        ) : (
                            <ChatInput 
                                onSend={handleSend} 
                                onFileSelect={handleFileSelect} 
                                isLoading={isLoading} 
                                disabled={!activeGoal || !!simulationState || !!pendingPlanUpdate}
                                isLiveSessionActive={isLiveSessionActive}
                                onToggleLiveSession={toggleLiveSession}
                            />
                        )}
                    </div>
                </div>
            )}
        </main>
      </div>
      {showCreate && <CreateGoalModal userProfile={userProfile} onCancel={() => setShowCreate(false)} onCreate={handleCreateGoal} />}
      {showSettings && <SettingsModal onCancel={() => setShowSettings(false)} onSave={handleSaveProfileInSettings} initialProfile={userProfile} />}
      {showPricing && <PricingModal onCancel={() => setShowPricing(false)} onSubscribe={handleInternalSubscribe} />}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    // Temporarily bypass login for faster AI feature testing
    return { email: 'dev-user@neurapro.ai', subscriptionStatus: 'pro' };
  });
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    // Temporarily bypass profile setup
    const initialProfile = getInitialProfile();
    initialProfile.general.name = "Dev User";
    initialProfile.general.email = 'dev-user@neurapro.ai';
    initialProfile.general.stage = 'University';
    initialProfile.university.courseName = "AI Engineering";
    return initialProfile;
  });
  const [data, setData] = useState<SubjectData[]>(MOCK_PHYSICS_GOAL);

  useEffect(() => {
    if (user) {
      localStorage.setItem('neura-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('neura-user');
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      localStorage.setItem('neura-profile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('neura-profile');
    }
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('neura-data', JSON.stringify(data));
  }, [data]);

  const handleLogout = () => {
    setUser(null);
    setProfile(null);
    setData([]);
    localStorage.removeItem('neura-user');
    localStorage.removeItem('neura-profile');
    localStorage.removeItem('neura-data');
  };

  const handleSaveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
  };
  
  const handleSubscribe = () => {
    if (user) {
      setUser({ ...user, subscriptionStatus: 'pro' });
    }
  };

  // If logout is clicked in dev mode, show a message to refresh
  if (!user || !profile) {
    return (
        <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-4 text-center">
            <h1 className="text-2xl font-bold text-white">Signed Out</h1>
            <p className="text-white/70 mt-2">Refresh the page to automatically sign back in for development.</p>
        </div>
    );
  }

  return (
    <AuthenticatedApp 
      user={user}
      profile={profile}
      data={data}
      onDataChange={setData}
      onLogout={handleLogout}
      onSubscribe={handleSubscribe}
      onSaveProfile={handleSaveProfile}
    />
  );
}