import { AVATAR_OPTIONS, DIFFICULTY_CONFIGS } from '../../data/themes';
import {
  Achievement,
  ActiveGameState,
  AppSettings,
  DifficultyLevel,
  MatchRecord,
  PuzzleProgress,
  UserProfile,
} from '../../types/chess';

const STORAGE_VERSION = 1;
const KEYS = {
  VERSION: 'aicm_version',
  PROFILE: 'aicm_profile',
  SETTINGS: 'aicm_settings',
  HISTORY: 'aicm_history',
  ACTIVE_GAME: 'aicm_active_game',
  PUZZLES: 'aicm_puzzles',
  SELECTED_DIFFICULTY: 'aicm_difficulty',
};

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_victory',
    title: 'First Victory',
    description: 'Win your first match against the Stockfish engine.',
    target: 1,
    progress: 0,
  },
  {
    id: 'checkmate_master',
    title: 'Checkmate Master',
    description: 'Deliver 3 victories by checkmate.',
    target: 3,
    progress: 0,
  },
  {
    id: 'puzzle_solver',
    title: 'Puzzle Solver',
    description: 'Solve 5 tactical chess puzzles.',
    target: 5,
    progress: 0,
  },
  {
    id: 'ten_games',
    title: '10 Games Played',
    description: 'Complete 10 full matches against AI opponents.',
    target: 10,
    progress: 0,
  },
  {
    id: 'winning_streak',
    title: 'Winning Streak',
    description: 'Achieve 3 consecutive victories.',
    target: 3,
    progress: 0,
  },
  {
    id: 'expert_challenger',
    title: 'Expert Challenger',
    description: 'Defeat the AI on Hard or Expert difficulty.',
    target: 1,
    progress: 0,
  },
];

export function getDefaultProfile(): UserProfile {
  return {
    username: 'Grandmaster Guest',
    avatarUrl: AVATAR_OPTIONS[0].url,
    estimatedRating: 1050,
    xp: 0,
    currentStreak: 0,
    bestStreak: 0,
    ratingHistory: [{ date: new Date().toISOString(), rating: 1050, result: 'draw' }],
    achievements: DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a })),
  };
}

export function getDefaultSettings(): AppSettings {
  return {
    boardTheme: 'classic',
    boardViewMode: '3d',
    cameraPreset: 'angled',
    soundEnabled: true,
    showLegalMoves: true,
    showCoordinates: true,
    autoQueen: false,
    animationSpeedMs: 220,
  };
}

export function getDefaultPuzzleProgress(): PuzzleProgress {
  return {
    solvedIds: [],
    failedIds: [],
    attempts: 0,
    solvedCount: 0,
    currentStreak: 0,
    bestStreak: 0,
  };
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function ensureVersion() {
  if (!isBrowser()) return;
  try {
    const raw = window.localStorage.getItem(KEYS.VERSION);
    if (raw !== String(STORAGE_VERSION)) {
      window.localStorage.setItem(KEYS.VERSION, String(STORAGE_VERSION));
    }
  } catch {
    // ignore storage quota/privacy restrictions
  }
}

function safeRead<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  ensureVersion();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    if (parsed === null || parsed === undefined) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  ensureVersion();
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export function loadProfile(): UserProfile {
  const def = getDefaultProfile();
  const stored = safeRead<Partial<UserProfile>>(KEYS.PROFILE, def);
  const mergedAchievements = DEFAULT_ACHIEVEMENTS.map((base) => {
    const existing = stored.achievements?.find((a) => a.id === base.id);
    return existing ? { ...base, ...existing } : { ...base };
  });
  return {
    ...def,
    ...stored,
    achievements: mergedAchievements,
    ratingHistory:
      Array.isArray(stored.ratingHistory) && stored.ratingHistory.length > 0
        ? stored.ratingHistory
        : def.ratingHistory,
  };
}

export function saveProfile(profile: UserProfile): void {
  safeWrite(KEYS.PROFILE, profile);
}

export function loadSettings(): AppSettings {
  return { ...getDefaultSettings(), ...safeRead<Partial<AppSettings>>(KEYS.SETTINGS, {}) };
}

export function saveSettings(settings: AppSettings): void {
  safeWrite(KEYS.SETTINGS, settings);
}

export function loadMatchHistory(): MatchRecord[] {
  const list = safeRead<MatchRecord[]>(KEYS.HISTORY, []);
  return Array.isArray(list) ? list : [];
}

export function saveMatchHistory(history: MatchRecord[]): void {
  safeWrite(KEYS.HISTORY, history);
}

export function loadActiveGame(): ActiveGameState | null {
  const stored = safeRead<ActiveGameState | null>(KEYS.ACTIVE_GAME, null);
  if (!stored || !stored.fen || !stored.timeControl) return null;
  return stored;
}

export function saveActiveGame(game: ActiveGameState | null): void {
  if (!isBrowser()) return;
  if (!game) {
    try {
      window.localStorage.removeItem(KEYS.ACTIVE_GAME);
    } catch {
      // ignore
    }
    return;
  }
  safeWrite(KEYS.ACTIVE_GAME, game);
}

export function loadPuzzleProgress(): PuzzleProgress {
  return { ...getDefaultPuzzleProgress(), ...safeRead<Partial<PuzzleProgress>>(KEYS.PUZZLES, {}) };
}

export function savePuzzleProgress(progress: PuzzleProgress): void {
  safeWrite(KEYS.PUZZLES, progress);
}

export function loadSelectedDifficulty(): DifficultyLevel {
  const val = safeRead<DifficultyLevel>(KEYS.SELECTED_DIFFICULTY, 'MEDIUM');
  return DIFFICULTY_CONFIGS[val] ? val : 'MEDIUM';
}

export function saveSelectedDifficulty(difficulty: DifficultyLevel): void {
  safeWrite(KEYS.SELECTED_DIFFICULTY, difficulty);
}

export function syncAchievementsAndProgression(
  profile: UserProfile,
  history: MatchRecord[],
  puzzleProgress: PuzzleProgress,
  latestMatch?: MatchRecord
): UserProfile {
  const updated = { ...profile };

  if (latestMatch) {
    if (latestMatch.opponentType !== 'human') {
      const oppElo = DIFFICULTY_CONFIGS[latestMatch.difficulty].eloEstimate;
      const expected = 1 / (1 + Math.pow(10, (oppElo - updated.estimatedRating) / 400));
      const score = latestMatch.result === 'win' ? 1 : latestMatch.result === 'draw' ? 0.5 : 0;
      const kFactor = 28;
      const nextRating = Math.max(400, Math.round(updated.estimatedRating + kFactor * (score - expected)));
      updated.estimatedRating = nextRating;

      updated.ratingHistory = [
        ...updated.ratingHistory.slice(-29),
        { date: latestMatch.date, rating: nextRating, result: latestMatch.result },
      ];
    }

    const xpEarned =
      latestMatch.result === 'win' ? 120 : latestMatch.result === 'draw' ? 65 : 30;
    updated.xp += xpEarned;

    if (latestMatch.opponentType !== 'human') {
      if (latestMatch.result === 'win') {
        updated.currentStreak += 1;
        updated.bestStreak = Math.max(updated.bestStreak, updated.currentStreak);
      } else if (latestMatch.result === 'loss') {
        updated.currentStreak = 0;
      }
    }
  }

  const aiHistory = history.filter((m) => m.opponentType !== 'human');
  const wins = aiHistory.filter((m) => m.result === 'win').length;
  const checkmateWins = aiHistory.filter(
    (m) => m.result === 'win' && m.resultReason.toLowerCase().includes('checkmate')
  ).length;
  const expertOrHardWins = aiHistory.filter(
    (m) => m.result === 'win' && (m.difficulty === 'HARD' || m.difficulty === 'EXPERT')
  ).length;

  const nowIso = new Date().toISOString();

  updated.achievements = updated.achievements.map((ach) => {
    let progress = ach.progress;
    if (ach.id === 'first_victory') progress = Math.min(ach.target, wins);
    if (ach.id === 'checkmate_master') progress = Math.min(ach.target, checkmateWins);
    if (ach.id === 'puzzle_solver') progress = Math.min(ach.target, puzzleProgress.solvedIds.length);
    if (ach.id === 'ten_games') progress = Math.min(ach.target, history.length);
    if (ach.id === 'winning_streak') progress = Math.min(ach.target, updated.bestStreak);
    if (ach.id === 'expert_challenger') progress = Math.min(ach.target, expertOrHardWins);

    const unlockedAt =
      ach.unlockedAt ?? (progress >= ach.target ? nowIso : undefined);
    return { ...ach, progress, unlockedAt };
  });

  return updated;
}

export function getPlayerLevel(xp: number): { level: number; currentXp: number; nextLevelXp: number; title: string } {
  const level = Math.floor(xp / 250) + 1;
  const currentXp = xp % 250;
  const nextLevelXp = 250;
  const titles = [
    'Club Novice',
    'Tactical Apprentice',
    'Positional Strategist',
    'Candidate Master',
    'FIDE Contender',
    'International Master',
    'Grandmaster',
  ];
  const title = titles[Math.min(titles.length - 1, Math.floor((level - 1) / 2))];
  return { level, currentXp, nextLevelXp, title };
}

export function resetAllStoredData(): void {
  if (!isBrowser()) return;
  Object.values(KEYS).forEach((k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      // ignore
    }
  });
}
