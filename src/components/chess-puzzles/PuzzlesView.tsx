import React, { useEffect, useMemo, useState } from 'react';
import { Chess, PieceSymbol, Square } from 'chess.js';
import { Box, CheckCircle2, ChevronRight, Grid2x2, Lightbulb, RotateCcw } from 'lucide-react';
import { Arrow } from 'react-chessboard';
import { CHESS_PUZZLES, ChessPuzzle, PuzzleDifficulty, PuzzleTheme } from '../../data/puzzles';
import { chessSounds } from '../../lib/audio/soundEffects';
import { AppSettings, PuzzleProgress } from '../../types/chess';
import { AdaptiveChessBoard } from '../chessboard/AdaptiveChessBoard';

interface PuzzlesViewProps {
  initialPuzzleId?: string | null;
  puzzleProgress: PuzzleProgress;
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  onUpdateProgress: (next: PuzzleProgress) => void;
  onToast: (msg: string, tone?: 'success' | 'error' | 'info') => void;
}

const DIFFICULTY_FILTERS: Array<'All' | PuzzleDifficulty> = [
  'All',
  'Beginner',
  'Intermediate',
  'Advanced',
];

const THEME_FILTERS: Array<'All' | PuzzleTheme> = [
  'All',
  'Checkmate in 1',
  'Checkmate in 2',
  'Fork',
  'Pin',
  'Skewer',
  'Discovered Attack',
  'Tactical Combination',
];

export const PuzzlesView: React.FC<PuzzlesViewProps> = ({
  initialPuzzleId,
  puzzleProgress,
  settings,
  onUpdateSettings,
  onUpdateProgress,
  onToast,
}) => {
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | PuzzleDifficulty>('All');
  const [themeFilter, setThemeFilter] = useState<'All' | PuzzleTheme>('All');

  const filteredPuzzles = useMemo(() => {
    return CHESS_PUZZLES.filter((p) => {
      if (difficultyFilter !== 'All' && p.difficulty !== difficultyFilter) return false;
      if (themeFilter !== 'All' && p.theme !== themeFilter) return false;
      return true;
    });
  }, [difficultyFilter, themeFilter]);

  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string>(
    initialPuzzleId || CHESS_PUZZLES[0].id
  );

  useEffect(() => {
    if (initialPuzzleId) {
      setSelectedPuzzleId(initialPuzzleId);
    }
  }, [initialPuzzleId]);

  const activePuzzle: ChessPuzzle = useMemo(() => {
    return (
      CHESS_PUZZLES.find((p) => p.id === selectedPuzzleId) ??
      filteredPuzzles[0] ??
      CHESS_PUZZLES[0]
    );
  }, [selectedPuzzleId, filteredPuzzles]);

  const [fen, setFen] = useState(activePuzzle.fen);
  const [stepIndex, setStepIndex] = useState(0);
  const [hintTier, setHintTier] = useState<0 | 1 | 2>(0);
  const [status, setStatus] = useState<'solving' | 'wrong' | 'solved'>('solving');
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    setFen(activePuzzle.fen);
    setStepIndex(0);
    setHintTier(0);
    setStatus('solving');
    setLastMove(null);
  }, [activePuzzle]);

  const playerColor = useMemo(() => new Chess(activePuzzle.fen).turn(), [activePuzzle]);

  const expectedMoveDetails = useMemo(() => {
    const expectedSan = activePuzzle.solutionSan[stepIndex];
    if (!expectedSan) return null;
    try {
      const c = new Chess(fen);
      const m = c.move(expectedSan);
      return m ? { from: m.from, to: m.to, san: m.san } : null;
    } catch {
      return null;
    }
  }, [activePuzzle, stepIndex, fen]);

  const hintArrows: Arrow[] = useMemo(() => {
    if (hintTier < 2 || !expectedMoveDetails) return [];
    return [
      {
        startSquare: expectedMoveDetails.from,
        endSquare: expectedMoveDetails.to,
        color: '#D4AF37',
      },
    ];
  }, [hintTier, expectedMoveDetails]);

  const hintSquares = useMemo(() => {
    if (hintTier === 1 && expectedMoveDetails) {
      return {
        [expectedMoveDetails.from]: {
          boxShadow: 'inset 0 0 0 3px #D4AF37',
        },
      };
    }
    return undefined;
  }, [hintTier, expectedMoveDetails]);

  const handleMoveAttempt = ({
    from,
    to,
    promotion,
  }: {
    from: Square;
    to: Square;
    promotion?: PieceSymbol;
  }): boolean => {
    if (status === 'solved') return false;

    const chess = new Chess(fen);
    let played;
    try {
      played = chess.move({ from, to, promotion });
    } catch {
      return false;
    }
    if (!played) return false;

    const expectedSan = activePuzzle.solutionSan[stepIndex];
    if (played.san === expectedSan) {
      // Correct move!
      if (chess.inCheck()) chessSounds.playCheck();
      else if (played.captured) chessSounds.playCapture();
      else chessSounds.playMove();

      setFen(chess.fen());
      setLastMove({ from: played.from, to: played.to });
      setHintTier(0);
      setStatus('solving');

      const nextIdx = stepIndex + 1;
      if (nextIdx >= activePuzzle.solutionSan.length) {
        // Puzzle Solved!
        setStatus('solved');
        chessSounds.playVictory();
        const alreadySolved = puzzleProgress.solvedIds.includes(activePuzzle.id);
        const nextSolvedIds = alreadySolved
          ? puzzleProgress.solvedIds
          : [...puzzleProgress.solvedIds, activePuzzle.id];
        const nextStreak = puzzleProgress.currentStreak + 1;

        onUpdateProgress({
          ...puzzleProgress,
          solvedIds: nextSolvedIds,
          attempts: puzzleProgress.attempts + 1,
          solvedCount: puzzleProgress.solvedCount + 1,
          currentStreak: nextStreak,
          bestStreak: Math.max(puzzleProgress.bestStreak, nextStreak),
        });
        onToast(`Solved "${activePuzzle.title}"!`, 'success');
      } else {
        // Auto-play opponent's forced reply after 450ms
        setStepIndex(nextIdx);
        const replySan = activePuzzle.solutionSan[nextIdx];
        window.setTimeout(() => {
          const replyChess = new Chess(chess.fen());
          const replyMove = replyChess.move(replySan);
          if (replyMove) {
            chessSounds.playMove();
            setFen(replyChess.fen());
            setLastMove({ from: replyMove.from, to: replyMove.to });
            setStepIndex(nextIdx + 1);
          }
        }, 450);
      }
      return true;
    } else {
      // Incorrect tactical move
      chessSounds.playError();
      setStatus('wrong');
      onUpdateProgress({
        ...puzzleProgress,
        failedIds: puzzleProgress.failedIds.includes(activePuzzle.id)
          ? puzzleProgress.failedIds
          : [...puzzleProgress.failedIds, activePuzzle.id],
        attempts: puzzleProgress.attempts + 1,
        currentStreak: 0,
      });
      return false;
    }
  };

  const handleNextPuzzle = () => {
    const list = filteredPuzzles.length > 0 ? filteredPuzzles : CHESS_PUZZLES;
    const idx = list.findIndex((p) => p.id === activePuzzle.id);
    const next = list[(idx + 1) % list.length];
    setSelectedPuzzleId(next.id);
  };

  const successRate =
    puzzleProgress.attempts > 0
      ? Math.round((puzzleProgress.solvedCount / puzzleProgress.attempts) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header + Stats */}
      <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F5F5F5]">Tactical Chess Puzzles</h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Sharpen pattern recognition across mates, forks, pins, skewers, and discovered attacks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs">
          <div>
            <span className="text-[#A3A3A3] block">Solved</span>
            <span className="font-mono tabular-nums text-base font-bold text-[#22C55E]">
              {puzzleProgress.solvedIds.length} / {CHESS_PUZZLES.length}
            </span>
          </div>
          <div>
            <span className="text-[#A3A3A3] block">Success Rate</span>
            <span className="font-mono tabular-nums text-base font-bold text-[#F5F5F5]">
              {successRate}%
            </span>
          </div>
          <div>
            <span className="text-[#A3A3A3] block">Puzzle Streak</span>
            <span className="font-mono tabular-nums text-base font-bold text-[#D4AF37]">
              {puzzleProgress.currentStreak}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-[#1C2024] border border-[#282D34]">
          {DIFFICULTY_FILTERS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficultyFilter(d)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                difficultyFilter === d
                  ? 'bg-[#D4AF37] text-[#111315] font-semibold'
                  : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <select
          value={themeFilter}
          onChange={(e) => setThemeFilter(e.target.value as 'All' | PuzzleTheme)}
          aria-label="Filter puzzle motif"
          className="px-3 py-2 rounded-lg bg-[#1C2024] border border-[#282D34] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
        >
          {THEME_FILTERS.map((t) => (
            <option key={t} value={t}>
              Motif: {t}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Board */}
        <div className="lg:col-span-6 space-y-3">
          <div className="max-w-[560px] mx-auto w-full flex items-center justify-between">
            <span className="text-xs text-[#A3A3A3]">
              {playerColor === 'w' ? 'White to move' : 'Black to move'}
            </span>
            <div className="inline-flex items-center p-0.5 rounded-lg bg-[#1C2024] border border-[#282D34]">
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, boardViewMode: '3d' })}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  settings.boardViewMode === '3d'
                    ? 'bg-[#D4AF37] text-[#111315]'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, boardViewMode: '2d' })}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  settings.boardViewMode === '2d'
                    ? 'bg-[#D4AF37] text-[#111315]'
                    : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
                }`}
              >
                <Grid2x2 className="w-3.5 h-3.5" />
                <span>2D</span>
              </button>
            </div>
          </div>

          <div className="max-w-[560px] mx-auto w-full">
            <AdaptiveChessBoard
              viewMode={settings.boardViewMode}
              fen={fen}
              orientation={playerColor === 'w' ? 'white' : 'black'}
              boardTheme={settings.boardTheme}
              cameraPreset={settings.cameraPreset}
              onCameraPresetChange={(preset) =>
                onUpdateSettings({ ...settings, cameraPreset: preset })
              }
              onSwitchViewMode={(mode) =>
                onUpdateSettings({ ...settings, boardViewMode: mode })
              }
              interactive={status !== 'solved'}
              allowedTurn={playerColor}
              showLegalMoves={settings.showLegalMoves}
              showCoordinates={settings.showCoordinates}
              autoQueen={false}
              animationSpeedMs={settings.animationSpeedMs}
              lastMove={lastMove}
              arrows={hintArrows}
              highlightSquares={hintSquares}
              onMoveAttempt={handleMoveAttempt}
            />
          </div>
        </div>

        {/* Puzzle Coaching & Catalog */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-[#D4AF37]">
                  {activePuzzle.difficulty} · {activePuzzle.theme} · Rating {activePuzzle.rating}
                </p>
                <h2 className="font-display text-xl font-bold text-[#F5F5F5] mt-1">
                  {activePuzzle.title}
                </h2>
              </div>
              <span className="text-xs font-medium text-[#A3A3A3] whitespace-nowrap">
                {playerColor === 'w' ? 'White to move' : 'Black to move'}
              </span>
            </div>

            {status === 'wrong' && (
              <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40 text-xs text-[#FCA5A5]">
                Not the strongest move in this position. Look for a forcing check, capture, or double attack.
              </div>
            )}

            {status === 'solved' && (
              <div className="p-4 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/40 space-y-2">
                <div className="flex items-center gap-2 text-[#22C55E] text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Puzzle Solved</span>
                </div>
                <p className="text-xs text-[#E5E5E5] leading-relaxed">{activePuzzle.explanation}</p>
              </div>
            )}

            {hintTier >= 1 && status !== 'solved' && (
              <div className="p-3.5 rounded-xl bg-[#111315] border border-[#D4AF37]/45 space-y-1">
                <p className="text-xs font-semibold text-[#D4AF37]">
                  {hintTier === 1 ? 'Tactical Hint (Piece Highlighted)' : 'Solution Arrow Revealed'}
                </p>
                <p className="text-xs text-[#D4D4D8]">{activePuzzle.hintText}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={status === 'solved'}
                onClick={() => setHintTier((t) => (t < 2 ? ((t + 1) as 1 | 2) : 2))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111315] border border-[#2C3238] text-xs font-semibold text-[#D4AF37] hover:border-[#D4AF37] disabled:opacity-40 cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{hintTier === 0 ? 'Show Hint' : hintTier === 1 ? 'Show Move Arrow' : 'Arrow Shown'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFen(activePuzzle.fen);
                  setStepIndex(0);
                  setHintTier(0);
                  setStatus('solving');
                  setLastMove(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111315] border border-[#2C3238] text-xs font-medium text-[#F5F5F5] hover:border-[#D4AF37] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleNextPuzzle}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#111315] text-xs font-semibold hover:bg-[#E2C04D] ml-auto cursor-pointer"
              >
                <span>Next Puzzle</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Puzzle Selection List */}
          <div className="bg-[#1C2024] border border-[#282D34] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#282D34] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#F5F5F5]">Curated Puzzle Collection</span>
              <span className="font-mono tabular-nums text-[#A3A3A3]">
                {filteredPuzzles.length} puzzles
              </span>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-[#252A30]">
              {filteredPuzzles.map((p) => {
                const isSolved = puzzleProgress.solvedIds.includes(p.id);
                const isSelected = p.id === activePuzzle.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPuzzleId(p.id)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected ? 'bg-[#D4AF37]/15' : 'hover:bg-[#24292F]/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#F5F5F5] truncate">{p.title}</p>
                      <p className="text-[11px] text-[#A3A3A3]">
                        {p.difficulty} · {p.theme} · <span className="font-mono">{p.rating}</span>
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium shrink-0 ${
                        isSolved ? 'text-[#22C55E]' : 'text-[#7E8690]'
                      }`}
                    >
                      {isSolved ? 'Solved' : 'Open'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
