import React, { useState } from 'react';
import { Bot, Users, X } from 'lucide-react';
import { DIFFICULTY_CONFIGS, TIME_CONTROL_PRESETS } from '../../data/themes';
import { DifficultyLevel, OpponentType, PlayerColor, TimeControlPreset } from '../../types/chess';

interface GameSetupModalProps {
  open: boolean;
  initialDifficulty: DifficultyLevel;
  onClose: () => void;
  onStartGame: (config: {
    opponentType: OpponentType;
    difficulty: DifficultyLevel;
    playerColor: PlayerColor;
    timeControl: TimeControlPreset;
  }) => void;
}

const DIFFICULTIES: DifficultyLevel[] = ['BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT'];

export const GameSetupModal: React.FC<GameSetupModalProps> = ({
  open,
  initialDifficulty,
  onClose,
  onStartGame,
}) => {
  const [opponentType, setOpponentType] = useState<OpponentType>('ai');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialDifficulty);
  const [colorChoice, setColorChoice] = useState<'w' | 'b' | 'random'>('w');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('blitz-5-0');
  const [customMinutes, setCustomMinutes] = useState<number>(10);
  const [customIncrement, setCustomIncrement] = useState<number>(5);

  if (!open) return null;

  const handleConfirm = () => {
    const resolvedColor: PlayerColor =
      opponentType === 'human'
        ? 'w'
        : colorChoice === 'random'
        ? Math.random() < 0.5
          ? 'w'
          : 'b'
        : colorChoice;

    let timeControl: TimeControlPreset;
    if (selectedPresetId === 'custom') {
      const mins = Math.max(1, Math.min(180, Number(customMinutes) || 10));
      const inc = Math.max(0, Math.min(60, Number(customIncrement) || 0));
      timeControl = {
        id: `custom-${mins}-${inc}`,
        label: `${mins} + ${inc}`,
        category: 'Custom',
        initialSeconds: mins * 60,
        incrementSeconds: inc,
      };
    } else {
      timeControl =
        TIME_CONTROL_PRESETS.find((t) => t.id === selectedPresetId) ?? TIME_CONTROL_PRESETS[4];
    }

    onStartGame({ opponentType, difficulty, playerColor: resolvedColor, timeControl });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-label="Configure new chess match"
    >
      <div className="w-full max-w-xl bg-[#1C2024] border border-[#2F363E] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[#282D34] flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-[#F5F5F5]">
              {opponentType === 'ai' ? 'New Match vs Stockfish' : 'New Local 2-Player Match'}
            </h2>
            <p className="text-xs text-[#A3A3A3]">
              {opponentType === 'ai'
                ? 'Select opponent mode, engine strength, side, and time control'
                : 'Pass-and-play chess on one shared 3D/2D board with dual clocks'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close match setup"
            className="p-2 rounded-lg text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#252A30] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Opponent Mode Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-[#D4AF37]">Opponent Mode</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setOpponentType('ai')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                  opponentType === 'ai'
                    ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#F5F5F5]'
                    : 'bg-[#111315] border-[#282D34] text-[#A3A3A3] hover:border-[#3E4650]'
                }`}
              >
                <Bot className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <div>
                  <p className="text-xs font-semibold">Play vs AI</p>
                  <p className="text-[11px] text-[#8D959E]">Stockfish 19 Engine</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOpponentType('human')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                  opponentType === 'human'
                    ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#F5F5F5]'
                    : 'bg-[#111315] border-[#282D34] text-[#A3A3A3] hover:border-[#3E4650]'
                }`}
              >
                <Users className="w-4 h-4 text-[#D4AF37] shrink-0" />
                <div>
                  <p className="text-xs font-semibold">Pass &amp; Play</p>
                  <p className="text-[11px] text-[#8D959E]">2 Human Players</p>
                </div>
              </button>
            </div>
          </div>

          {/* Difficulty Selection (AI Mode) */}
          {opponentType === 'ai' && (
            <>
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-[#D4AF37]">Engine Difficulty</label>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {DIFFICULTIES.map((level) => {
                    const cfg = DIFFICULTY_CONFIGS[level];
                    const active = difficulty === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDifficulty(level)}
                        className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#F5F5F5]'
                            : 'bg-[#111315] border-[#282D34] text-[#A3A3A3] hover:border-[#3E4650]'
                        }`}
                      >
                        <p className="text-xs font-semibold">{cfg.label}</p>
                        <p className="font-mono tabular-nums text-[11px] text-[#D4AF37] mt-0.5">
                          ~{cfg.eloEstimate}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-[#A3A3A3]">{DIFFICULTY_CONFIGS[difficulty].description}</p>
              </div>

              {/* Side Selection */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-[#D4AF37]">Play As</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'w' as const, label: 'White (First)' },
                    { id: 'random' as const, label: 'Random' },
                    { id: 'b' as const, label: 'Black (Second)' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setColorChoice(opt.id)}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                        colorChoice === opt.id
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#F5F5F5]'
                          : 'bg-[#111315] border-[#282D34] text-[#A3A3A3] hover:border-[#3E4650]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Time Control Selection */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-[#D4AF37]">Time Control</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TIME_CONTROL_PRESETS.map((preset) => {
                const active = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`py-2 px-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#F5F5F5]'
                        : 'bg-[#111315] border-[#282D34] text-[#A3A3A3] hover:border-[#3E4650]'
                    }`}
                  >
                    <span className="text-[11px] text-[#8D959E] block">{preset.category}</span>
                    <span className="font-mono tabular-nums text-xs font-semibold">{preset.label}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setSelectedPresetId('custom')}
                className={`py-2 px-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  selectedPresetId === 'custom'
                    ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#F5F5F5]'
                    : 'bg-[#111315] border-[#282D34] text-[#A3A3A3] hover:border-[#3E4650]'
                }`}
              >
                <span className="text-[11px] text-[#8D959E] block">Custom</span>
                <span className="font-mono tabular-nums text-xs font-semibold">
                  {customMinutes} + {customIncrement}
                </span>
              </button>
            </div>

            {selectedPresetId === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] text-[#A3A3A3] mb-1">Minutes per side</label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-[#2E353D] text-sm font-mono tabular-nums text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#A3A3A3] mb-1">Increment (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={customIncrement}
                    onChange={(e) => setCustomIncrement(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-[#2E353D] text-sm font-mono tabular-nums text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#282D34] flex items-center justify-end gap-3 bg-[#171A1E]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-lg bg-[#D4AF37] text-[#111315] text-xs font-semibold hover:bg-[#E2C04D] transition-colors cursor-pointer"
          >
            Start Match
          </button>
        </div>
      </div>
    </div>
  );
};
