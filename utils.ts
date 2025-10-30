
import type { UserProfile, StrategyResponse, Milestone, PlanMilestone } from './types';

export const cls = (...xs: (string | boolean | undefined)[]): string => xs.filter(Boolean).join(" ");

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // The result includes the mime type header, so we split it off
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(blob);
  });
};


export const getInitialProfile = (): UserProfile => ({
  general: {
    name: '',
    email: '',
    country: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    usage: 'Part-time',
    usageOther: '',
    stage: '',
  },
  primary: {
    schoolName: '',
    grade: '',
    syllabus: '',
    subjects: [],
  },
  highSchool: {
    schoolName: '',
    grade: '',
    syllabus: '',
    subjects: [],
    examSeries: '',
    examYear: '',
    targetGrades: [],
  },
  university: {
    institution: '',
    courseName: '',
    yearOfStudy: '',
    modules: [],
    assessmentType: '',
  },
  professional: {
    field: '',
    qualification: '',
    examDate: '',
    modules: [],
  },
  learningPreferences: {
    studyHours: '10',
    preferredMode: [],
    devices: [],
    motivation: '',
    motivationOther: '',
    limitations: [],
  },
  sen: {
    hasSEN: false,
    condition: '',
    conditionOther: '',
    accommodations: '',
    notes: '',
  },
  guardian: {
    name: '',
    email: '',
    phone: '',
    relationship: '',
  },
});

/**
 * Converts the new dynamic strategy response into the milestone format
 * required by the Timeline component. It calculates cumulative deadlines
 * for each milestone based on its specific duration.
 */
export const convertStrategyToMilestones = (strategy: StrategyResponse): Milestone[] => {
  let cumulativeDays = 0;
  const today = new Date();

  const milestones: Milestone[] = strategy.milestones.map((planMilestone: PlanMilestone, index: number) => {
    cumulativeDays += planMilestone.duration_days;
    const deadlineDate = new Date(today);
    deadlineDate.setDate(today.getDate() + cumulativeDays);
    
    return {
      key: planMilestone.key,
      title: planMilestone.title,
      duration_days: planMilestone.duration_days,
      deadline: deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      steps: [
        { text: `Focus: ${planMilestone.focus.join(', ')}`, completed: false },
        { text: `Methods: ${planMilestone.methods.join(', ')}`, completed: false },
        { text: `Assessment: ${planMilestone.assessment}`, completed: false },
      ],
      state: index === 0 ? 'active' : 'pending',
    };
  });

  // Add a final 'Goal Achieved' milestone
  milestones.push({
    key: 'GA',
    title: 'Goal Achieved',
    steps: [],
    state: 'goal',
  });

  return milestones;
};


// --- Audio Helpers for Live API ---

export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
