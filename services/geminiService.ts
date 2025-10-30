import { GoogleGenAI, Chat, Type, GenerateContentResponse, Content, FunctionDeclaration, Modality, Tool } from "@google/genai";
import type { Goal, Milestone, RawMilestone, GoalFormPayload, StrategyResponse, UserProfile, SimulationStageData, AIFoundResource } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Safely extracts and concatenates all text parts from a Gemini API response.
 * This avoids using the `.text` accessor which can log warnings when non-text
 * parts (like `thoughtSignature`) are present in the response.
 */
export function getText(response: GenerateContentResponse): string {
    return response.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('') ?? '';
}

export function createChatSession(
    systemInstruction: string,
    history?: Content[],
    functionDeclarations?: FunctionDeclaration[],
    useGoogleSearch?: boolean
): Chat {
    const tools: Tool[] = [];
    if (functionDeclarations && functionDeclarations.length > 0) {
        tools.push({ functionDeclarations });
    }
    if (useGoogleSearch) {
        tools.push({ googleSearch: {} });
    }

    const chat = ai.chats.create({
        model: 'gemini-2.5-pro', // Upgraded for more complex reasoning
        config: {
            systemInstruction: systemInstruction,
            tools: tools.length > 0 ? tools : undefined,
        },
        history: history || [],
    });
    return chat;
}

export async function* streamStrategySimulation(payload: GoalFormPayload, profile: UserProfile): AsyncGenerator<SimulationStageData> {
    const prompt = `You are Neura, an autonomous AI teacher and strategist.
Your job is to formulate a neuroscience-backed strategic learning plan for the student based on their Profile and Goal Form.

The plan must be:
- Scientifically justified
- Contextually accurate
- Strategically feasible
- Personalized for the student’s unique profile, resources, and timeline

You reason like an educational neuroscientist, narrate like an intelligent mentor, and think like a strategic planner.
You must also ask clarifying questions when data is incomplete or inconsistent.

### INPUTS
1.  **Student Profile:** ${JSON.stringify(profile, null, 2)}
2.  **Goal Form:** ${JSON.stringify(payload, null, 2)}

### PHASES (Stream one JSON object per phase)

Each phase should be streamed as one JSON object, wrapped between NEURA_TICK_START and NEURA_TICK_END.
Each JSON must include:
- "phase" (string)
- "status" (string)
- "narration" (string, conversational explanation of what you’re doing and why)
- "evidence" (array of scientific or pedagogical mechanisms referenced)
- "artifacts" (structured outputs for that phase)

You must stream your thought process sequentially through all five phases.

---

#### PHASE 1 — Context Verification
*   **status:** "Verifying your information…"
*   **narration (example):** "I’m verifying your goal, syllabus, timeline, and uploaded resources for completeness and accuracy. I’ll cross-check your details with official education sources where possible and identify any missing or inconsistent data before proceeding.”
*   **streamed JSON example:**
    NEURA_TICK_START
    {
      "phase": "context_verification",
      "status": "Verifying your information…",
      "narration": "I’m aligning your goal and verifying your data before simulation.",
      "evidence": ["source credibility ranking", "context verification"],
      "artifacts": {
        "missing_info": ["syllabus_type"],
        "invalid_entries": [],
        "verified_sources": 2,
        "risk_flag": "low"
      }
    }
    NEURA_TICK_END

---

#### PHASE 2 — Diagnostic Analysis
*   **status:** "Analyzing your learning profile…"
*   **narration (example):** "Now I’m identifying your strengths, weaknesses, and constraints. I’ll use your study time, SEN details, and academic stage to estimate cognitive load, risk factors, and key learning opportunities.”
*   **streamed JSON example:**
    NEURA_TICK_START
    {
      "phase": "diagnostic_analysis",
      "status": "Analyzing your learning profile…",
      "narration": "I’m mapping your academic strengths, weaknesses, and available study time to identify constraints.",
      "evidence": ["Cognitive Load Theory", "Motivational Regulation", "Neuroplasticity"],
      "artifacts": {
        "strengths": ["consistent study time", "good resources"],
        "weaknesses": ["short timeline"],
        "opportunities": ["early syllabus completion"],
        "threats": ["exam proximity"],
        "risk_level": "moderate"
      }
    }
    NEURA_TICK_END

---

#### PHASE 3 — Strategic Design
*   **status:** "Designing your plan…"
*   **narration (example):** "I’m designing your milestone structure and matching each stage to proven neuroscience-backed learning methods. Each method I choose—like retrieval practice or interleaving—will have a clear purpose that fits your cognitive profile and timeline.”
*   **streamed JSON example:**
    NEURA_TICK_START
    {
      "phase": "strategic_design",
      "status": "Designing your plan…",
      "narration": "I’m creating your milestones and linking each one to cognitive principles that enhance retention.",
      "evidence": ["Spacing Effect", "Retrieval Practice", "Dual Coding"],
      "artifacts": {
        "milestones": 4,
        "methods": ["retrieval", "interleaving", "elaboration"],
        "time_distribution": "balanced"
      }
    }
    NEURA_TICK_END

---

#### PHASE 4 — Feasibility & Forecasting
*   **status:** "Forecasting your success likelihood…"
*   **narration (example):** "I’m forecasting the workload and evaluating whether this plan is realistically achievable within your timeline. This includes comparing required study hours against your available time and highlighting any bottlenecks.”
*   **streamed JSON example:**
    NEURA_TICK_START
    {
      "phase": "feasibility_forecasting",
      "status": "Forecasting your success likelihood…",
      "narration": "I’m projecting potential challenges and setting performance benchmarks to ensure success.",
      "evidence": ["Time-on-task modeling", "Performance forecasting", "Cognitive Fatigue Research"],
      "artifacts": {
        "estimated_total_hours": 80,
        "available_hours": 65,
        "risk_level": "medium",
        "kpis": ["weekly retention rate", "topic mastery percent"]
      }
    }
    NEURA_TICK_END

---

#### PHASE 5 — Strategic Synthesis
*   **status:** "Finalizing your plan…"
*   **narration (example):** "I’m finalizing your plan now, combining your verified data, diagnostic findings, and neuroscience-backed strategies into a cohesive structure. This plan includes milestones, methods, and key performance indicators so I can later evaluate and adapt it during your learning journey.”
*   **streamed JSON example:**
    NEURA_TICK_START
    {
      "phase": "strategic_synthesis",
      "status": "Finalizing your plan…",
      "narration": "I’ve built a neuroscience-backed plan with milestones, methods, and KPIs for ongoing adaptation.",
      "evidence": ["Integrated Cognitive Design", "Active Recall Framework"],
      "artifacts": {
        "plan_ready": true,
        "milestone_count": 4,
        "kpi_set": ["focus consistency", "retention", "progress rate"]
      }
    }
    NEURA_TICK_END

After streaming all 5 phases, you are done with this part of the task. Do not output anything else.
`;
    
    try {
        const responseStream = await ai.models.generateContentStream({
            model: "gemini-2.5-pro",
            contents: prompt,
        });

        let buffer = '';
        const startDelimiter = 'NEURA_TICK_START';
        const endDelimiter = 'NEURA_TICK_END';

        for await (const chunk of responseStream) {
            buffer += getText(chunk);
            let startIndex = buffer.indexOf(startDelimiter);
            let endIndex = buffer.indexOf(endDelimiter);

            while (startIndex !== -1 && endIndex > startIndex) {
                const jsonString = buffer.substring(startIndex + startDelimiter.length, endIndex);
                try {
                    const parsed = JSON.parse(jsonString);
                    yield parsed as SimulationStageData;
                } catch (e) {
                    console.error("Failed to parse simulation stage JSON:", e, "Raw string:", jsonString);
                }
                buffer = buffer.substring(endIndex + endDelimiter.length);
                startIndex = buffer.indexOf(startDelimiter);
                endIndex = buffer.indexOf(endDelimiter);
            }
        }
    } catch (error) {
        console.error("Error during strategy simulation stream:", error);
        throw new Error("Failed to simulate the learning strategy.");
    }
}


export async function generateLearningPlan(payload: GoalFormPayload, profile: UserProfile): Promise<{ strategy: StrategyResponse, groundingMetadata: any }> {
    const prompt = `You are Neura, an autonomous AI teacher and learning strategist. Your expertise is in cognitive science, evidence-based pedagogy, and curriculum design. Your mission is to create a proactive, confidence-building learning plan—one that not only teaches the material but actively anticipates and strengthens the student against common pitfalls.

### CORE INSTRUCTIONS
1.  **DYNAMIC MILESTONES:** Do NOT use rigid weekly blocks. Instead, create a series of logical "milestones". A milestone is a coherent chunk of learning that can span any number of days (e.g., 3, 5, 10) based on its content's complexity and the student's available time.
2.  **MULTI-FACETED RESEARCH (MANDATORY):** You MUST use the \`googleSearch\` tool for comprehensive research covering two critical areas:
    a.  **Pedagogical Research:** Find recent (last 5-10 years), peer-reviewed research on the most effective teaching and learning strategies for the student's specific subject and context (e.g., "effective pedagogy for high school chemistry stoichiometry", "neuroscience of learning for ADHD students").
    b.  **Pitfall Analysis:** Search for common student misconceptions, errors, and difficulties related to the subject. Actively look for official resources like examiner reports (e.g., from Cambridge, Edexcel, IB) which detail common mistakes in exams.
3.  **PROACTIVE PLAN DESIGN:** Your plan's design must be "proactive." This means the learning \`methods\` and \`assessment\` for each milestone MUST be explicitly designed to build resilience against and prevent the common pitfalls you identified in your research. For example, if students commonly make sign errors in physics calculations, a method could be "Error Analysis Journal focusing on sign conventions" and the assessment could be "Problem set with traps for common sign errors."
4.  **CITE ALL SOURCES:** The findings from ALL your research (both pedagogy and pitfalls/examiner reports) MUST be reflected in the \`scientific_basis\` section of your output. For each source, you MUST provide a citation, a brief description of how it informs your plan's design, and the direct URI to the source.

### YOUR INPUTS
1.  **Student Profile:** ${JSON.stringify(profile, null, 2)}
2.  **Goal Form:** ${JSON.stringify(payload, null, 2)}

### YOUR THINKING PROCESS
1.  **Context & Feasibility:** Analyze inputs, estimate required vs. available hours, and determine a feasibility risk level.
2.  **Syllabus Deconstruction:** Break down the subject matter from the provided resources into a logical sequence of topics and sub-topics.
3.  **Pedagogical & Pitfall Research (via Google Search):** Conduct targeted searches for BOTH evidence-based teaching methods AND common student errors, misconceptions, and examiner reports for the subject.
4.  **Proactive Milestone Formulation:** Group topics into milestones. For each one, design the \`methods\` and \`assessment\` to directly counteract the identified pitfalls and employ the researched pedagogical techniques. Explicitly state this connection in your reasoning.
5.  **Synthesize & Output:** Assemble the complete plan into the specified JSON format, ensuring the \`scientific_basis\` section is thoroughly populated with citations for all your research findings.

### OUTPUT FORMAT
Return ONLY a single, valid JSON object that strictly adheres to the schema below. Do not include markdown formatting or any other text.

\`\`\`json
{
  "subject": "Chemistry (IGCSE 0620)",
  "goal": "Get an A by 20 Oct 2025",
  "feasibility": {
    "required_hours": 118,
    "available_hours": 100,
    "risk": "medium",
    "recommendation": "Increase to 1.5h/day or extend deadline."
  },
  "strategy_overview": {
    "approach": "A proactive, confidence-building plan combining retrieval practice and error analysis to build resilience against common misconceptions in stoichiometry, based on cognitive science and examiner reports.",
    "reasoning": "This approach is selected to maximize long-term retention and build resilience against frequent exam errors, directly targeting weaknesses identified in official examiner feedback for the Chemistry syllabus."
  },
  "milestones": [
    {
      "key": "M1",
      "title": "Foundations: Atomic Structure & Bonding",
      "duration_days": 8,
      "focus": ["The atom", "Electron configuration", "Ionic and Covalent bonding"],
      "methods": ["Dual coding for atomic models", "Concept mapping for bonding types", "Daily retrieval practice quiz"],
      "assessment": "End-of-milestone test with mixed concept questions."
    },
    {
      "key": "M2",
      "title": "The Mole & Stoichiometry",
      "duration_days": 12,
      "focus": ["Avogadro's constant", "Molar mass calculations", "Reacting masses and volumes"],
      "methods": ["Worked-example fading", "Interleaving practice sets", "Error analysis journal targeting common calculation mistakes from examiner reports"],
      "assessment": "Problem set featuring multi-step stoichiometric calculations, including distractors based on common errors."
    }
  ],
  "scientific_basis": [
    {
      "citation": "Dunlosky, J., Rawson, K. A., et al. (2013). Improving Students’ Learning With Effective Learning Techniques.",
      "description": "This meta-analysis confirms the high utility of retrieval practice and spaced repetition, which are the backbone of the assessment and review strategy in this plan.",
      "uri": "https://journals.sagepub.com/doi/full/10.1177/1529100612453266"
    },
    {
       "citation": "Cambridge International (2022). IGCSE Chemistry 0620 Examiner Report.",
       "description": "This report highlights that students frequently lose marks on stoichiometry by using incorrect mole ratios. This plan's 'Error Analysis Journal' in Milestone 2 directly addresses this pitfall.",
       "uri": "https://www.cambridgeinternational.org/Images/12345-example-examiner-report.pdf"
    }
  ]
}
\`\`\`
`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        
        let jsonString = getText(response);
        
        const jsonMatch = jsonString.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonString = jsonMatch[1];
        }

        try {
            const parsedJson = JSON.parse(jsonString) as StrategyResponse;

            if (!parsedJson || !parsedJson.feasibility || !parsedJson.milestones) {
                 console.error("Parsed JSON is not in the expected StrategyResponse format:", parsedJson);
                 throw new Error("The model returned a strategy in an unexpected format.");
            }

            return {
                strategy: parsedJson,
                groundingMetadata: response.candidates?.[0]?.groundingMetadata
            };

        } catch (parseError) {
            console.error("JSON Parse error:", parseError);
            console.error("Original model response:", getText(response));
            throw new Error("Failed to parse the learning strategy from the model's response.");
        }

    } catch (error) {
        console.error("Error generating learning plan:", error);
        throw new Error("Failed to generate a learning plan. The model may be unable to provide a structured plan for this topic.");
    }
}


export async function generatePlanReport(plan: Milestone[], goal: Pick<Goal, 'name'> & { subject: string }, sources: any[]): Promise<string> {
    const sourcesText = sources.length > 0
        ? `\n**Sources Consulted:**\n${sources.map(s => `- [${s.title || 'Untitled'}](${s.uri})`).join('\n')}`
        : "";

    const prompt = `You are Neura, an expert AI tutor. You have just completed your research and formulated the following strategic learning plan for a student.

Student's Goal: "${goal.name}"
Subject: ${goal.subject}
The Plan (JSON format):
${JSON.stringify(plan, null, 2)}

Your task is now to write a comprehensive and encouraging report to present this plan to the student. The report must be beautifully formatted, professional, and easy to read.

Follow these instructions:
1.  **Introduction**: Start with a brief, encouraging introduction that acknowledges the student's goal.
2.  **Main Title**: Create a main, descriptive title for the plan.
3.  **Body**: For each milestone in the plan, use its title as a bolded heading. Underneath each heading, list out the steps as a bulleted or numbered list.
4.  **Formatting**: Use markdown for all formatting. Specifically:
    * Use a single hash ('#') for the main title.
    * Use double asterisks ('**') for bolding milestone titles.
    * Use hyphens ('-') for unordered list items (the steps).
5.  **Conclusion**: End with a brief concluding remark, and mention that you also consulted external sources if they are provided below. Do not ask the user to confirm the plan; the UI will handle that.
6.  **Tone**: Maintain a supportive, expert, and slightly formal tone.

${sourcesText}

Now, generate the complete report based on the JSON plan provided.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return getText(response);
    } catch (error) {
        console.error("Error generating plan report:", error);
        return "I was unable to format the plan for display. However, the core plan has been created. Please press 'Confirm Plan' to proceed.";
    }
}

export async function generateImage(prompt: string): Promise<string> {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0 && response.generatedImages[0].image.imageBytes) {
            return response.generatedImages[0].image.imageBytes;
        }
        
        throw new Error("No image data found in the model's response.");

    } catch (error) {
        console.error("Error generating image:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Sorry, I was unable to generate an image. ${errorMessage}`);
    }
}

export async function transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
    try {
        const audioPart = {
            inlineData: {
                mimeType,
                data: base64Audio,
            },
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [audioPart, { text: "Please transcribe this audio." }] },
        });

        return getText(response).trim();
    } catch (error) {
        console.error("Error transcribing audio:", error);
        throw new Error("I was unable to transcribe the audio. Please try again.");
    }
}

export async function findRelevantResources(goal: string, subject: string, profile: UserProfile): Promise<AIFoundResource[]> {
    const profileContext = `The student is at the '${profile.general.stage}' stage. Specific details: ${JSON.stringify(profile[profile.general.stage.toLowerCase().replace(' ', '') as keyof UserProfile] || {})}`;

    const prompt = `Based on the following student goal and profile, use Google Search to find up to 3 highly relevant, official academic resources (like syllabi, official curriculum documents, or past paper repositories). For each resource, provide a direct URI link, a concise title, and a brief description of why it's relevant.

Student Profile Context: ${profileContext}
Subject: "${subject}"
Goal: "${goal}"

Return ONLY a single, valid JSON array that strictly adheres to this schema. Do not add any other text or markdown formatting.
\`\`\`json
[
  {
    "title": "Example: IGCSE Chemistry (0620) Syllabus",
    "uri": "https://www.cambridgeinternational.org/...",
    "description": "The official syllabus document outlining all topics and assessment objectives for the course."
  }
]
\`\`\`
If no relevant official resources can be found, return an empty array [].
`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        let jsonString = getText(response);
        const jsonMatch = jsonString.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch && jsonMatch[1]) {
            jsonString = jsonMatch[1];
        }

        if (!jsonString.trim().startsWith('[')) {
             console.warn("AI Resource Finder did not return a valid JSON array string.", jsonString);
             return [];
        }

        const parsed = JSON.parse(jsonString) as AIFoundResource[];
        return parsed;

    } catch (error) {
        console.error("Error finding relevant resources:", error);
        return [];
    }
}

export const proposePlanUpdateTool: FunctionDeclaration = {
    name: 'proposePlanUpdate',
    description: 'Proposes a change to the current learning plan based on student performance or new information. Use this if the student is struggling, advancing faster than expected, or if a different teaching method seems more effective.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            milestoneKey: {
                type: Type.STRING,
                description: 'The key of the milestone to be updated (e.g., "M1", "M2").',
            },
            reasoning: {
                type: Type.STRING,
                description: 'A clear, student-facing explanation for why this change is being recommended. E.g., "I noticed we are spending more time on this topic, so I recommend extending the deadline to ensure we cover it thoroughly."'
            },
            newDurationDays: {
                type: Type.NUMBER,
                description: 'Optional. The proposed new duration in days for the milestone.'
            },
            newFocus: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Optional. A new list of focus topics for the milestone.'
            },
            newMethods: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Optional. A new list of teaching methods for the milestone.'
            },
            newAssessment: {
                type: Type.STRING,
                description: 'Optional. A new assessment method for the milestone.'
            },
        },
        required: ['milestoneKey', 'reasoning'],
    },
};