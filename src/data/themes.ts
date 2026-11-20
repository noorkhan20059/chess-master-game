import { BoardTheme, BoardThemeId, DifficultyLevel, TimeControlPreset } from '../types/chess';

export const BOARD_THEMES: Record<BoardThemeId, BoardTheme> = {
  classic: {
    id: 'classic',
    name: 'Classic Walnut',
    lightSquare: '#F0D9B5',
    darkSquare: '#B58863',
    highlightSelected: 'rgba(212, 175, 55, 0.55)',
    highlightLastMove: 'rgba(212, 175, 55, 0.32)',
    border: '#3D2B1F',
  },
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian Gold',
    lightSquare: '#E5DEC9',
    darkSquare: '#6E5A44',
    highlightSelected: 'rgba(212, 175, 55, 0.58)',
    highlightLastMove: 'rgba(212, 175, 55, 0.34)',
    border: '#2B251D',
  },
  emerald: {
    id: 'emerald',
    name: 'Tournament Felt',
    lightSquare: '#EEEED2',
    darkSquare: '#4E7855',
    highlightSelected: 'rgba(212, 175, 55, 0.55)',
    highlightLastMove: 'rgba(186, 202, 68, 0.45)',
    border: '#263D2B',
  },
  slate: {
    id: 'slate',
    name: 'Slate Marble',
    lightSquare: '#DCE1E8',
    darkSquare: '#5C6B7D',
    highlightSelected: 'rgba(212, 175, 55, 0.55)',
    highlightLastMove: 'rgba(212, 175, 55, 0.32)',
    border: '#27303A',
  },
};

export interface DifficultyConfig {
  id: DifficultyLevel;
  label: string;
  eloEstimate: number;
  skillLevel: number;
  depth: number;
  moveTimeMs: number;
  multiPv: number;
  description: string;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  BEGINNER: {
    id: 'BEGINNER',
    label: 'Beginner',
    eloEstimate: 750,
    skillLevel: 1,
    depth: 2,
    moveTimeMs: 200,
    multiPv: 3,
    description: 'Gentle pace with occasional natural inaccuracies and coaching hints.',
  },
  EASY: {
    id: 'EASY',
    label: 'Easy',
    eloEstimate: 1050,
    skillLevel: 4,
    depth: 4,
    moveTimeMs: 320,
    multiPv: 2,
    description: 'Develops pieces cleanly and spots straightforward captures.',
  },
  MEDIUM: {
    id: 'MEDIUM',
    label: 'Medium',
    eloEstimate: 1450,
    skillLevel: 9,
    depth: 7,
    moveTimeMs: 520,
    multiPv: 1,
    description: 'Solid positional play with sharper tactical awareness.',
  },
  HARD: {
    id: 'HARD',
    label: 'Hard',
    eloEstimate: 1850,
    skillLevel: 15,
    depth: 11,
    moveTimeMs: 850,
    multiPv: 1,
    description: 'Deep calculation and strong punishing responses to inaccuracies.',
  },
  EXPERT: {
    id: 'EXPERT',
    label: 'Expert',
    eloEstimate: 2350,
    skillLevel: 20,
    depth: 15,
    moveTimeMs: 1350,
    multiPv: 1,
    description: 'Full-strength Stockfish 19 search for master-level preparation.',
  },
};

export const TIME_CONTROL_PRESETS: TimeControlPreset[] = [
  { id: 'bullet-1-0', label: '1 + 0', category: 'Bullet', initialSeconds: 60, incrementSeconds: 0 },
  { id: 'bullet-2-1', label: '2 + 1', category: 'Bullet', initialSeconds: 120, incrementSeconds: 1 },
  { id: 'blitz-3-0', label: '3 + 0', category: 'Blitz', initialSeconds: 180, incrementSeconds: 0 },
  { id: 'blitz-3-2', label: '3 + 2', category: 'Blitz', initialSeconds: 180, incrementSeconds: 2 },
  { id: 'blitz-5-0', label: '5 + 0', category: 'Blitz', initialSeconds: 300, incrementSeconds: 0 },
  { id: 'blitz-5-3', label: '5 + 3', category: 'Blitz', initialSeconds: 300, incrementSeconds: 3 },
  { id: 'rapid-10-0', label: '10 + 0', category: 'Rapid', initialSeconds: 600, incrementSeconds: 0 },
  { id: 'rapid-15-10', label: '15 + 10', category: 'Rapid', initialSeconds: 900, incrementSeconds: 10 },
  { id: 'rapid-30-0', label: '30 + 0', category: 'Rapid', initialSeconds: 1800, incrementSeconds: 0 },
  { id: 'untimed', label: 'Unlimited', category: 'Untimed', initialSeconds: 0, incrementSeconds: 0 },
];

export const AVATAR_OPTIONS = [
  {
    id: 'gold-knight',
    label: 'Gold Knight',
    url: '/src/assets/images/avatar_gold_knight_1795092687183.jpg',
  },
  {
    id: 'obsidian-king',
    label: 'Obsidian King',
    url: '/src/assets/images/avatar_obsidian_king_1795092687055.jpg',
  },
];

export const SALON_BACKDROP_URL = '/src/assets/images/chess_salon_backdrop_1795092686957.jpg';
export const PUZZLES_STUDY_URL = '/src/assets/images/tactical_puzzles_study_1795092686923.jpg';
