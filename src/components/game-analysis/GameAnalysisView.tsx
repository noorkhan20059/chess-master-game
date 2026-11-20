import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import {
  Box,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  FlipVertical2,
  Grid2x2,
  Play,
  Upload,
} from 'lucide-react';
import { Arrow } from 'react-chessboard';
import { DIFFICULTY_CONFIGS } from '../../data/themes';
import { useStockfish } from '../../hooks/useStockfish';
import {
  analyzeGameWithStockfish,
  cpToWhiteWinPercent,
  formatEvalLabel,
} from '../../lib/analysis/gameAnalyzer';
import { parsePgnSafe } from '../../lib/chess/chessUtils';
import {
  AnalyzedMove,
  AppSettings,
  GameAnalysisReport,
  MatchRecord,
  MoveClassification,
} from '../../types/chess';
import { AdaptiveChessBoard } from '../chessboard/AdaptiveChessBoard';

interface GameAnalysisViewProps {
  selectedMatch: MatchRecord | null;
  history: MatchRecord[];
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  onSelectMatch: (match: MatchRecord) => void;
  onToast: (msg: string, tone?: 'success' | 'error' | 'info') => void;
}

const CLASSIFICATION_STYLES: Record<
  MoveClassification,
  { label: string; colorClass: string }
> = {
  best: { label: 'Best', colorClass: 'text-[#22C55E]' },
  good: { label: 'Good', colorClass: 'text-[#60A5FA]' },
  inaccuracy: { label: 'Inaccuracy', colorClass: 'text-[#F59E0B]' },
  mistake: { label: 'Mistake', colorClass: 'text-[#FB923C]' },
  blunder: { label: 'Blunder', colorClass: 'text-[#EF4444]' },
  missed_win: { label: 'Missed Win', colorClass: 'text-[#D4AF37]' },
};

export const GameAnalysisView: React.FC<GameAnalysisViewProps> = ({
  selectedMatch,
  history,
  settings,
  onUpdateSettings,
  onSelectMatch,
  onToast,
}) => {
  const { engine, engineReady } = useStockfish();
  const [pgnInput, setPgnInput] = useState('');
  const [customPgn, setCustomPgn] = useState<string | null>(null);
  const [report, setReport] = useState<GameAnalysisReport | null>(null);
  const [coachSummary, setCoachSummary] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [activePly, setActivePly] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const cancelRef = useRef(false);

  const activePgn = customPgn ?? selectedMatch?.pgn ?? '';
  const activeStartingFen = customPgn ? undefined : selectedMatch?.startingFen;

  const baseFrames = useMemo(() => {
    if (!activePgn) return [];
    const parsed = parsePgnSafe(activePgn);
    if (!parsed.ok) return [];
    const replay = new Chess(activeStartingFen || undefined);
    const frames: Array<{
      ply: number;
      fen: string;
      san: string;
      from: string;
      to: string;
    }> = [{ ply: 0, fen: replay.fen(), san: 'Start', from: '', to: '' }];

    parsed.moves.forEach((m, idx) => {
      replay.move(m.san);
      frames.push({
        ply: idx + 1,
        fen: replay.fen(),
        san: m.san,
        from: m.from,
        to: m.to,
      });
    });
    return frames;
  }, [activePgn, activeStartingFen]);

  useEffect(() => {
    setReport(null);
    setCoachSummary(null);
    setActivePly(baseFrames.length > 0 ? baseFrames.length - 1 : 0);
    setProgress({ done: 0, total: 0 });
    cancelRef.current = true;
    setAnalyzing(false);
  }, [activePgn, baseFrames.length]);

  const runAnalysis = async () => {
    if (!activePgn || !engineReady) return;
    cancelRef.current = false;
    setAnalyzing(true);
    setCoachSummary(null);
    setProgress({ done: 0, total: Math.max(1, baseFrames.length - 1) });

    try {
      const result = await analyzeGameWithStockfish(
        engine,
        activePgn,
        activeStartingFen,
        (done, total) => setProgress({ done, total }),
        () => cancelRef.current
      );
      if (!cancelRef.current) {
        setReport(result);
        onToast('Stockfish game analysis complete.', 'success');

        try {
          const res = await fetch('/api/match-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pgn: activePgn,
              whiteAccuracy: result.whiteAccuracy,
              blackAccuracy: result.blackAccuracy,
              counts: result.counts,
              resultReason: selectedMatch?.resultReason ?? 'Completed Game',
            }),
          });
          const data = (await res.json()) as { summary?: string };
          if (res.ok && data.summary) {
            setCoachSummary(data.summary);
          }
        } catch {
          // Stockfish numerical report remains complete even if coach endpoint is unavailable
        }
      }
    } catch (err) {
      if (!cancelRef.current) {
        onToast(err instanceof Error ? err.message : 'Analysis failed.', 'error');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLoadCustomPgn = () => {
    const parsed = parsePgnSafe(pgnInput);
    if (!parsed.ok) {
      onToast(parsed.error, 'error');
      return;
    }
    setCustomPgn(pgnInput.trim());
    setPgnInput('');
    onToast('PGN loaded for analysis.', 'success');
  };

  const currentFrame = baseFrames[activePly] ?? baseFrames[0];
  const currentAnalyzedMove: AnalyzedMove | undefined =
    report && activePly > 0 ? report.moves[activePly - 1] : undefined;

  const bestMoveArrows: Arrow[] = useMemo(() => {
    if (!currentAnalyzedMove) return [];
    const uci = currentAnalyzedMove.bestMoveUci;
    if (!uci || uci.length < 4) return [];
    if (uci === currentAnalyzedMove.uci) return [];
    return [
      {
        startSquare: uci.slice(0, 2),
        endSquare: uci.slice(2, 4),
        color: '#22C55E',
      },
    ];
  }, [currentAnalyzedMove]);

  const orientation: 'white' | 'black' =
    ((selectedMatch?.playerColor ?? 'w') === 'w') !== flipped ? 'white' : 'black';

  // SVG Evaluation Chart points
  const chartPoints = useMemo(() => {
    if (!report || report.moves.length === 0) return '';
    const w = 460;
    const h = 110;
    const pts = report.moves.map((m, idx) => {
      const x = report.moves.length === 1 ? w / 2 : (idx / (report.moves.length - 1)) * w;
      const winPct = cpToWhiteWinPercent(m.evalAfterCp);
      const y = h - (winPct / 100) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `0,${h} ${pts.join(' ')} ${w},${h}`;
  }, [report]);

  const chartLinePoints = useMemo(() => {
    if (!report || report.moves.length === 0) return '';
    const w = 460;
    const h = 110;
    return report.moves
      .map((m, idx) => {
        const x = report.moves.length === 1 ? w / 2 : (idx / (report.moves.length - 1)) * w;
        const winPct = cpToWhiteWinPercent(m.evalAfterCp);
        const y = h - (winPct / 100) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [report]);

  return (
    <div className="space-y-6">
      {/* Header & Match Selector */}
      <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F5F5F5]">Game Analysis Studio</h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Inspect every move with Stockfish 19 centipawn evaluation, accuracy scores, and best continuations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {history.length > 0 && (
            <select
              value={customPgn ? '' : selectedMatch?.id ?? ''}
              onChange={(e) => {
                const found = history.find((m) => m.id === e.target.value);
                if (found) {
                  setCustomPgn(null);
                  onSelectMatch(found);
                }
              }}
              aria-label="Select saved match"
              className="px-3 py-2 rounded-lg bg-[#111315] border border-[#2C3238] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="" disabled>
                Choose a saved match...
              </option>
              {history.map((m) => (
                <option key={m.id} value={m.id}>
                  {new Date(m.date).toLocaleDateString()} ·{' '}
                  {m.opponentType === 'human'
                    ? 'Pass & Play'
                    : `vs ${DIFFICULTY_CONFIGS[m.difficulty].label}`}{' '}
                  ({m.result.toUpperCase()})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            disabled={!activePgn || !engineReady || analyzing}
            onClick={runAnalysis}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#111315] text-xs font-semibold hover:bg-[#E2C04D] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {analyzing
                ? `Analyzing ${progress.done}/${progress.total}...`
                : report
                ? 'Re-Analyze Game'
                : 'Run Engine Analysis'}
            </span>
          </button>
        </div>
      </div>

      {/* Paste PGN Bar */}
      <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={pgnInput}
          onChange={(e) => setPgnInput(e.target.value)}
          placeholder="Or paste any PGN string here (e.g. 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6)..."
          className="flex-1 px-3.5 py-2 rounded-lg bg-[#111315] border border-[#2C3238] font-mono text-xs text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
        />
        <button
          type="button"
          onClick={handleLoadCustomPgn}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#111315] border border-[#2C3238] text-xs font-semibold text-[#F5F5F5] hover:border-[#D4AF37] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>Load PGN</span>
        </button>
      </div>

      {!activePgn ? (
        <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-10 text-center space-y-2">
          <p className="text-sm font-semibold text-[#F5F5F5]">No match selected for analysis</p>
          <p className="text-xs text-[#A3A3A3] max-w-md mx-auto">
            Complete a match against Stockfish, choose one from your history dropdown above, or paste a PGN to unlock move-by-move engine evaluation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Replay Board & Controls */}
          <div className="lg:col-span-6 space-y-3">
            <div className="max-w-[560px] mx-auto w-full flex items-center justify-between">
              <span className="text-xs text-[#A3A3A3]">
                {currentFrame ? `Move ${currentFrame.ply}: ${currentFrame.san}` : 'Replay Board'}
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
                fen={currentFrame?.fen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
                orientation={orientation}
                boardTheme={settings.boardTheme}
                cameraPreset={settings.cameraPreset}
                onCameraPresetChange={(preset) =>
                  onUpdateSettings({ ...settings, cameraPreset: preset })
                }
                onSwitchViewMode={(mode) =>
                  onUpdateSettings({ ...settings, boardViewMode: mode })
                }
                interactive={false}
                showCoordinates={settings.showCoordinates}
                animationSpeedMs={settings.animationSpeedMs}
                lastMove={
                  currentFrame && currentFrame.from
                    ? { from: currentFrame.from, to: currentFrame.to }
                    : null
                }
                arrows={bestMoveArrows}
              />
            </div>

            {/* Replay Controls */}
            <div className="max-w-[540px] mx-auto w-full flex items-center justify-between bg-[#1C2024] border border-[#282D34] rounded-xl px-3 py-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActivePly(0)}
                  disabled={activePly === 0}
                  aria-label="First move"
                  className="p-2 rounded-lg text-[#F5F5F5] hover:bg-[#111315] disabled:opacity-35 cursor-pointer"
                >
                  <ChevronFirst className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActivePly((p) => Math.max(0, p - 1))}
                  disabled={activePly === 0}
                  aria-label="Previous move"
                  className="p-2 rounded-lg text-[#F5F5F5] hover:bg-[#111315] disabled:opacity-35 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActivePly((p) => Math.min(baseFrames.length - 1, p + 1))}
                  disabled={activePly >= baseFrames.length - 1}
                  aria-label="Next move"
                  className="p-2 rounded-lg text-[#F5F5F5] hover:bg-[#111315] disabled:opacity-35 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActivePly(baseFrames.length - 1)}
                  disabled={activePly >= baseFrames.length - 1}
                  aria-label="Last move"
                  className="p-2 rounded-lg text-[#F5F5F5] hover:bg-[#111315] disabled:opacity-35 cursor-pointer"
                >
                  <ChevronLast className="w-4 h-4" />
                </button>
              </div>

              <span className="font-mono tabular-nums text-xs text-[#A3A3A3]">
                Ply {activePly} / {Math.max(0, baseFrames.length - 1)}
              </span>

              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                aria-label="Flip board"
                className="p-2 rounded-lg text-[#A3A3A3] hover:text-[#D4AF37] hover:bg-[#111315] cursor-pointer"
              >
                <FlipVertical2 className="w-4 h-4" />
              </button>
            </div>

            {/* Active Move Feedback Card */}
            {currentAnalyzedMove && (
              <div className="max-w-[540px] mx-auto w-full bg-[#1C2024] border border-[#282D34] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-[#F5F5F5]">
                    {currentAnalyzedMove.moveNumber}
                    {currentAnalyzedMove.color === 'w' ? '.' : '...'} {currentAnalyzedMove.san}
                  </span>
                  <span
                    className={`font-semibold ${
                      CLASSIFICATION_STYLES[currentAnalyzedMove.classification].colorClass
                    }`}
                  >
                    {CLASSIFICATION_STYLES[currentAnalyzedMove.classification].label} ·{' '}
                    {formatEvalLabel(currentAnalyzedMove.evalAfterCp, currentAnalyzedMove.mateAfter)}
                  </span>
                </div>
                <p className="text-xs text-[#C4C4C4]">{currentAnalyzedMove.comment}</p>
                {currentAnalyzedMove.bestMoveSan !== currentAnalyzedMove.san && (
                  <p className="text-xs text-[#22C55E]">
                    Best engine move: <span className="font-mono">{currentAnalyzedMove.bestMoveSan}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: Accuracy Report, Eval Graph, Move-by-Move Table */}
          <div className="lg:col-span-6 space-y-4">
            {analyzing && (
              <div className="bg-[#1C2024] border border-[#D4AF37]/50 rounded-xl p-5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#D4AF37]">Stockfish Deep Evaluation</span>
                  <span className="font-mono tabular-nums text-[#F5F5F5]">
                    {progress.done} / {progress.total} moves
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#111315] overflow-hidden">
                  <div
                    className="h-full bg-[#D4AF37] transition-all duration-200"
                    style={{
                      width: `${progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {report ? (
              <>
                {/* Accuracy & Phase Breakdown */}
                <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-[#111315] border border-[#252A30]">
                      <p className="text-[11px] text-[#A3A3A3]">White Accuracy</p>
                      <p className="mt-1 font-mono tabular-nums text-lg font-bold text-[#F5F5F5]">
                        {report.whiteAccuracy}%
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#111315] border border-[#252A30]">
                      <p className="text-[11px] text-[#A3A3A3]">Black Accuracy</p>
                      <p className="mt-1 font-mono tabular-nums text-lg font-bold text-[#F5F5F5]">
                        {report.blackAccuracy}%
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#111315] border border-[#252A30]">
                      <p className="text-[11px] text-[#A3A3A3]">Opening</p>
                      <p className="mt-1 font-mono tabular-nums text-lg font-bold text-[#D4AF37]">
                        {report.openingAccuracy}%
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-[#111315] border border-[#252A30]">
                      <p className="text-[11px] text-[#A3A3A3]">Endgame</p>
                      <p className="mt-1 font-mono tabular-nums text-lg font-bold text-[#D4AF37]">
                        {report.endgameAccuracy}%
                      </p>
                    </div>
                  </div>

                  {/* Classification Summary */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center pt-2 border-t border-[#252A30]">
                    {(
                      ['best', 'good', 'inaccuracy', 'mistake', 'blunder', 'missed_win'] as MoveClassification[]
                    ).map((cls) => (
                      <div key={cls} className="py-1.5">
                        <p className={`font-mono tabular-nums text-base font-bold ${CLASSIFICATION_STYLES[cls].colorClass}`}>
                          {report.counts[cls]}
                        </p>
                        <p className="text-[11px] text-[#A3A3A3]">
                          {CLASSIFICATION_STYLES[cls].label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {coachSummary && (
                    <div className="p-3.5 rounded-lg bg-[#111315] border border-[#D4AF37]/40 text-xs text-[#E5E5E5] leading-relaxed">
                      <span className="font-semibold text-[#D4AF37]">Grandmaster Takeaway: </span>
                      {coachSummary}
                    </div>
                  )}
                </div>

                {/* Position Evaluation Graph */}
                <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#F5F5F5]">Evaluation Advantage Graph</span>
                    <span className="text-[#A3A3A3]">Click chart to jump to move</span>
                  </div>
                  <svg
                    viewBox="0 0 460 110"
                    className="w-full h-28 bg-[#111315] rounded-lg border border-[#252A30] cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      const idx = Math.round(ratio * (report.moves.length - 1));
                      setActivePly(idx + 1);
                    }}
                  >
                    <line x1="0" y1="55" x2="460" y2="55" stroke="#2D333B" strokeDasharray="4 4" />
                    {chartPoints && (
                      <polygon points={chartPoints} fill="rgba(240, 217, 181, 0.25)" />
                    )}
                    {chartLinePoints && (
                      <polyline
                        fill="none"
                        stroke="#D4AF37"
                        strokeWidth="2"
                        points={chartLinePoints}
                      />
                    )}
                    {activePly > 0 && report.moves.length > 0 && (
                      <line
                        x1={
                          report.moves.length === 1
                            ? 230
                            : ((activePly - 1) / (report.moves.length - 1)) * 460
                        }
                        y1="0"
                        x2={
                          report.moves.length === 1
                            ? 230
                            : ((activePly - 1) / (report.moves.length - 1)) * 460
                        }
                        y2="110"
                        stroke="#22C55E"
                        strokeWidth="1.5"
                      />
                    )}
                  </svg>
                </div>

                {/* Move-by-Move Breakdown Table */}
                <div className="bg-[#1C2024] border border-[#282D34] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#282D34]">
                    <h3 className="text-xs font-semibold text-[#F5F5F5]">Move-by-Move Engine Log</h3>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#252A30]">
                    {report.moves.map((m) => {
                      const active = activePly === m.ply;
                      const style = CLASSIFICATION_STYLES[m.classification];
                      return (
                        <button
                          key={m.ply}
                          type="button"
                          onClick={() => setActivePly(m.ply)}
                          className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                            active ? 'bg-[#D4AF37]/15' : 'hover:bg-[#24292F]/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono tabular-nums text-xs text-[#7E8690] w-8">
                              {m.moveNumber}
                              {m.color === 'w' ? '.' : '...'}
                            </span>
                            <span className="font-mono text-xs font-semibold text-[#F5F5F5] w-14">
                              {m.san}
                            </span>
                            <span className={`text-xs font-medium ${style.colorClass}`}>
                              {style.label}
                            </span>
                          </div>
                          <span className="font-mono tabular-nums text-xs text-[#A3A3A3] shrink-0">
                            {formatEvalLabel(m.evalAfterCp, m.mateAfter)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              !analyzing && (
                <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-6 space-y-3">
                  <h2 className="font-display text-lg font-bold text-[#F5F5F5]">
                    Ready for Deep Engine Review
                  </h2>
                  <p className="text-xs text-[#A3A3A3] leading-relaxed">
                    Click <strong className="text-[#D4AF37]">Run Engine Analysis</strong> above to evaluate all{' '}
                    <span className="font-mono tabular-nums text-[#F5F5F5]">
                      {Math.max(0, baseFrames.length - 1)}
                    </span>{' '}
                    half-moves using Stockfish 19 and uncover inaccuracies, blunders, and missed tactical wins.
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
