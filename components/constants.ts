
import type { SubjectData } from './types';

export const INITIAL_DATA: SubjectData[] = [
  { 
    subject: "Chemistry", 
    goals: [ 
      { 
        id: "g1", 
        name: "Get A in Chem", 
        days: 48,
      }, 
      { 
        id: "g2", 
        name: "Ace Stoichiometry Test", 
        days: 3,
      } 
    ] 
  },
  { 
    subject: "Biology", 
    goals: [ 
      { 
        id: "g3", 
        name: "Ace Cells Test Plan", 
        days: 3,
      } 
    ] 
  },
  { 
    subject: "Math", 
    goals: [ 
      { 
        id: "g4", 
        name: "Learn Calculus Basics", 
        days: 21,
      } 
    ] 
  },
];
