import React, { useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import {
  Box,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Grid2x2,
  Swords,
} from 'lucide-react';
import { CHESS_OPENINGS, ChessOpening } from '../../data/openings';
import { AppSettings, PlayerColor } from '../../types/chess';
import { AdaptiveChessBoard } from '../chessboard/AdaptiveChessBoard';

interface OpeningsViewProps {
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  onPracticePosition: (fen: string, pgn: string, playerColor: PlayerColor) => void;
}

export const OpeningsView: React.FC<OpeningsViewProps> = ({
  settings,
  onUpdateSettings,
  onPracticePosition,
}) => {
  const [selectedOpeningId, setSelectedOpeningId] = useState<string>(CHESS_OPENINGS[0].id);
  const [variationIdx, setVariationIdx] = useState<number>(-1); // -1 = main line
  const [ply, setPly] = useState<number>(0);

  const opening: ChessOpening = useMemo(
    () => CHESS_OPENINGS.find((o) => o.id === selectedOpeningId) ?? CHESS_OPENINGS[0],
    [selectedOpeningId]
  );

  const activeMoves = useMemo(() => {
    if (variationIdx >= 0 && opening.variations[variationIdx]) {
      return opening.variations[variationIdx].moves.map((san) => ({
        san,
        explanation: `${opening.variations[variationIdx].name}: ${opening.variations[variationIdx].summary}`,
      }));
    }
    return opening.moves;
  }, [opening, variationIdx]);

  const positions = useMemo(() => {
    const chess = new Chess();
    const list: Array<{ fen: string; pgn: string; from: string; to: string; san: string }> = [
      { fen: chess.fen(), pgn: '', from: '', to: '', san: 'Start' },
    ];
    for (const step of activeMoves) {
      const moved = chess.move(step.san);
      if (!moved) break;
      list.push({
        fen: chess.fen(),
        pgn: chess.pgn(),
        from: moved.from,
        to: moved.to,
        san: moved.san,
      });
    }
    return list;
  }, [activeMoves]);

  const safePly = Math.min(ply, positions.length - 1);
  const currentPos = positions[safePly] ?? positions[0];
  const currentNote = safePly > 0 ? activeMoves[safePly - 1] : null;

  const handleSelectOpening = (id: string) => {
    setSelectedOpeningId(id);
    setVariationIdx(-1);
    setPly(0);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5">
        <h1 className="font-display text-2xl font-bold text-[#F5F5F5]">Chess Openings Library</h1>
        <p className="text-xs text-[#A3A3A3] mt-1">
          Study classical theory move-by-move, explore variations, and spar against Stockfish from any line
        </p>
      </div>

      {/* Opening Selector Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CHESS_OPENINGS.map((item) => {
          const active = item.id === opening.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectOpening(item.id)}
              className={`text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                active
                  ? 'bg-[#D4AF37]/15 border-[#D4AF37]'
                  : 'bg-[#1C2024] border-[#282D34] hover:border-[#3E4650]'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-[#A3A3A3]">
                <span className="font-mono">{item.eco}</span>
                <span>{item.side}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-[#F5F5F5] truncate">{item.name}</p>
              <p className="text-[11px] text-[#D4AF37] mt-0.5">{item.difficulty}</p>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Lesson Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Board & Step Controls */}
        <div className="lg:col-span-6 space-y-3">
          <div className="max-w-[560px] mx-auto w-full flex items-center justify-between">
            <span className="text-xs text-[#A3A3A3]">
              {opening.name} ({opening.side})
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
              fen={currentPos.fen}
              orientation={opening.side === 'Black' ? 'black' : 'white'}
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
              lastMove={currentPos.from ? { from: currentPos.from, to: currentPos.to } : null}
            />
          </div>

          <div className="max-w-[540px] mx-auto w-full flex items-center justify-between bg-[#1C2024] border border-[#282D34] rounded-xl px-3 py-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPly(0)}
                disabled={safePly === 0}
                aria-label="Start position"
                className="p-2 rounded-lg text-[#F5F5F5] hover:bg-[#111315] disabled:opacity-35 cursor-pointer"
              >
                <ChevronFirst className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPly((p) => Math.max(0, p - 1))}
                disabled={safePly === 0}
                aria-label="Previous move"
                className="p-2 rounded-lg text-[#F5F5F5] hover:bg-[#111315] disabled:opacity-35 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPly((p) => Math.min(positions.length - 1, p + 1))}
                disabled={safePly >= positions.length - 1}
                aria-label="Next move"
                className="p-2 rounded-lg text-[#F5F5F5] hover:bg-[#111315] disabled:opacity-35 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPly(positions.length - 1)}
                disabled={safePly >= positions.length - 1}
                aria-label="Final move"
                className="p-2 rounded-lg text-[#F5F5F5] hover:bg-[#111315] disabled:opacity-35 cursor-pointer"
              >
                <ChevronLast className="w-4 h-4" />
              </button>
            </div>

            <span className="font-mono tabular-nums text-xs text-[#A3A3A3]">
              Move {safePly} / {positions.length - 1}
            </span>

            <button
              type="button"
              onClick={() =>
                onPracticePosition(
                  currentPos.fen,
                  currentPos.pgn,
                  opening.side === 'Black' ? 'b' : 'w'
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-[#111315] text-xs font-semibold hover:bg-[#E2C04D] cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Spar vs AI</span>
            </button>
          </div>
        </div>

        {/* Annotations, Ideas, Mistakes & Variations */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5 space-y-4">
            <div>
              <p className="text-xs text-[#D4AF37] font-medium">
                ECO {opening.eco} · Played by {opening.side} · {opening.difficulty}
              </p>
              <h2 className="font-display text-xl font-bold text-[#F5F5F5] mt-1">{opening.name}</h2>
              <p className="text-xs text-[#C4C4C4] leading-relaxed mt-2">{opening.summary}</p>
            </div>

            {/* Line / Variation Switcher */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setVariationIdx(-1);
                  setPly(1);
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  variationIdx === -1
                    ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]'
                    : 'bg-[#111315] border-[#282D34] text-[#A3A3A3] hover:text-[#F5F5F5]'
                }`}
              >
                Main Line
              </button>
              {opening.variations.map((v, idx) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => {
                    setVariationIdx(idx);
                    setPly(Math.min(6, v.moves.length));
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                    variationIdx === idx
                      ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]'
                      : 'bg-[#111315] border-[#282D34] text-[#A3A3A3] hover:text-[#F5F5F5]'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>

            {/* Interactive Move Strip */}
            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-[#111315] border border-[#252A30]">
              {activeMoves.map((m, idx) => {
                const movePly = idx + 1;
                const active = safePly === movePly;
                return (
                  <button
                    key={`${m.san}-${idx}`}
                    type="button"
                    onClick={() => setPly(movePly)}
                    className={`px-2 py-1 rounded font-mono text-xs transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#D4AF37] text-[#111315] font-semibold'
                        : 'text-[#E5E5E5] hover:bg-[#24292F]'
                    }`}
                  >
                    {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ''}
                    {m.san}
                  </button>
                );
              })}
            </div>

            {/* Current Move Explanation */}
            <div className="p-3.5 rounded-xl bg-[#111315] border border-[#282D34]">
              <p className="text-xs font-semibold text-[#D4AF37]">
                {currentNote ? `Move ${safePly}: ${currentNote.san}` : 'Starting Position'}
              </p>
              <p className="text-xs text-[#D4D4D8] mt-1 leading-relaxed">
                {currentNote
                  ? currentNote.explanation
                  : 'Step forward through the moves above to see the strategic purpose behind every move.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold text-[#22C55E]">Strategic Ideas</h3>
              <ul className="space-y-2 text-xs text-[#C4C4C4] leading-relaxed">
                {opening.strategicIdeas.map((idea) => (
                  <li key={idea}>• {idea}</li>
                ))}
              </ul>
            </div>

            <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold text-[#EF4444]">Common Mistakes</h3>
              <ul className="space-y-2 text-xs text-[#C4C4C4] leading-relaxed">
                {opening.commonMistakes.map((mistake) => (
                  <li key={mistake}>• {mistake}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
