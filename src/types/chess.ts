export type DifficultyLevel = 'BEGINNER' | 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export type PlayerColor = 'w' | 'b';

export type OpponentType = 'ai' | 'human';

export type BoardViewMode = '3d' | '2d';

export type CameraPreset = 'angled' | 'top';

export type AppView =
  | 'dashboard'
  | 'play'
  | 'analysis'
  | 'puzzles'
  | 'openings'
  | 'history'
  | 'profile'
  | 'settings';

export type TimeCategory = 'Bullet' | 'Blitz' | 'Rapid' | 'Custom' | 'Untimed';

export interface TimeControlPreset {
  id: string;
  label: string;
  category: TimeCategory;
  initialSeconds: number;
  incrementSeconds: number;
}

export interface GameResultInfo {
  winner: 'w' | 'b' | 'draw';
  reason: string;
}

export interface ActiveGameState {
  id: string;
  fen: string;
  startingFen: string;
  pgn: string;
  opponentType?: OpponentType;
  difficulty: DifficultyLevel;
  playerColor: PlayerColor;
  timeControl: TimeControlPreset;
  whiteTimeMs: number;
  blackTimeMs: number;
  startedAt: number;
  status: 'playing' | 'completed';
  result?: GameResultInfo;
}

export interface MatchRecord {
  id: string;
  date: string;
  opponentType?: OpponentType;
  difficulty: DifficultyLevel;
  playerColor: PlayerColor;
  result: 'win' | 'loss' | 'draw';
  resultReason: string;
  winner: 'w' | 'b' | 'draw';
  totalMoves: number;
  pgn: string;
  startingFen: string;
  finalFen: string;
  timeControlLabel: string;
  durationSeconds: number;
  accuracy?: number;
}

export type MoveClassification =
  | 'best'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'missed_win';

export interface AnalyzedMove {
  ply: number;
  moveNumber: number;
  color: PlayerColor;
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  /** Evaluation in centipawns from White's perspective */
  evalBeforeCp: number;
  evalAfterCp: number;
  mateBefore?: number;
  mateAfter?: number;
  bestMoveUci: string;
  bestMoveSan: string;
  classification: MoveClassification;
  cpLoss: number;
  comment: string;
}

export interface GameAnalysisReport {
  whiteAccuracy: number;
  blackAccuracy: number;
  openingAccuracy: number;
  endgameAccuracy: number;
  counts: Record<MoveClassification, number>;
  whiteCounts: Record<MoveClassification, number>;
  blackCounts: Record<MoveClassification, number>;
  moves: AnalyzedMove[];
  summary: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt?: string;
  target: number;
  progress: number;
}

export interface RatingPoint {
  date: string;
  rating: number;
  result: 'win' | 'loss' | 'draw';
}

export interface UserProfile {
  username: string;
  avatarUrl: string;
  estimatedRating: number;
  xp: number;
  currentStreak: number;
  bestStreak: number;
  ratingHistory: RatingPoint[];
  achievements: Achievement[];
}

export type BoardThemeId = 'classic' | 'obsidian' | 'emerald' | 'slate';

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  lightSquare: string;
  darkSquare: string;
  highlightSelected: string;
  highlightLastMove: string;
  border: string;
}

export interface AppSettings {
  boardTheme: BoardThemeId;
  boardViewMode: BoardViewMode;
  cameraPreset: CameraPreset;
  soundEnabled: boolean;
  showLegalMoves: boolean;
  showCoordinates: boolean;
  autoQueen: boolean;
  animationSpeedMs: number;
}

export interface PuzzleProgress {
  solvedIds: string[];
  failedIds: string[];
  attempts: number;
  solvedCount: number;
  currentStreak: number;
  bestStreak: number;
  dailyCompletedDate?: string;
}

export interface EngineEvaluation {
  cp: number;
  mate?: number;
  depth: number;
  bestMoveUci: string;
  pv: string[];
  altMoveUci?: string;
  altCp?: number;
  altMate?: number;
  altPv?: string[];
}

export interface HintInsight {
  bestMoveUci: string;
  bestMoveSan: string;
  altMoveUci?: string;
  altMoveSan?: string;
  evalText: string;
  reason: string;
  tacticalAlert?: string;
  checkmateThreat?: string;
  pvLineSan: string[];
  coachAdvice?: string;
  coachError?: string;
}
