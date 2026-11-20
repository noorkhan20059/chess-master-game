import React from 'react';
import { AlertTriangle, Lightbulb, ShieldAlert, Sparkles } from 'lucide-react';
import { DIFFICULTY_CONFIGS } from '../../data/themes';
import { formatEvalLabel, getEvalBarPercent } from '../../lib/analysis/gameAnalyzer';
import { DifficultyLevel, EngineEvaluation, HintInsight } from '../../types/chess';

interface AIAssistantPanelProps {
  difficulty: DifficultyLevel;
  engineReady: boolean;
  engineError: string | null;
  isThinking: boolean;
  isHintLoading: boolean;
  isGameOver: boolean;
  isPlayerTurn: boolean;
  liveEval: EngineEvaluation | null;
  hint: HintInsight | null;
  onRequestHint: () => void;
  onClearHint: () => void;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  difficulty,
  engineReady,
  engineError,
  isThinking,
  isHintLoading,
  isGameOver,
  isPlayerTurn,
  liveEval,
  hint,
  onRequestHint,
  onClearHint,
}) => {
  const diffCfg = DIFFICULTY_CONFIGS[difficulty];
  const whitePercent = liveEval ? getEvalBarPercent(liveEval.cp, liveEval.mate) : 50;
  const evalLabel = liveEval ? formatEvalLabel(liveEval.cp, liveEval.mate) : '0.00';

  return (
    <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[#F5F5F5]">Stockfish Engine Assistant</h3>
          <p className="text-xs text-[#A3A3A3]">
            {diffCfg.label} (~{diffCfg.eloEstimate}) ·{' '}
            {!engineReady ? 'Loading engine...' : isThinking ? 'Calculating move...' : 'Ready'}
          </p>
        </div>

        <button
          type="button"
          disabled={!engineReady || isGameOver || !isPlayerTurn || isThinking || isHintLoading}
          onClick={onRequestHint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-[#111315] text-xs font-semibold hover:bg-[#E2C04D] disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>{isHintLoading ? 'Analyzing...' : 'Hint'}</span>
        </button>
      </div>

      {engineError && (
        <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40 text-xs text-[#FCA5A5]">
          {engineError}
        </div>
      )}

      {/* Position Evaluation Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#A3A3A3]">Position Evaluation</span>
          <span className="font-mono tabular-nums font-semibold text-[#F5F5F5]">
            {evalLabel}
            {liveEval && liveEval.depth > 0 ? ` · depth ${liveEval.depth}` : ''}
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-[#111315] border border-[#2C3238] overflow-hidden flex">
          <div
            className="h-full bg-[#F0D9B5] transition-all duration-300"
            style={{ width: `${whitePercent}%` }}
          />
          <div
            className="h-full bg-[#2B3036] transition-all duration-300 flex-1"
          />
        </div>
      </div>

      {/* Hint Insight Display */}
      {hint ? (
        <div className="p-3.5 rounded-xl bg-[#111315] border border-[#D4AF37]/45 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <span className="text-xs font-semibold text-[#D4AF37]">
                Best Move: <span className="font-mono text-[#F5F5F5]">{hint.bestMoveSan}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={onClearHint}
              className="text-[11px] text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
            >
              Hide
            </button>
          </div>

          <p className="text-xs text-[#D4D4D8] leading-relaxed">{hint.reason}</p>

          {hint.coachAdvice && (
            <div className="pt-1.5 border-t border-[#252A30] text-xs text-[#F5F5F5] leading-relaxed">
              <span className="font-semibold text-[#D4AF37]">Grandmaster Coach: </span>
              {hint.coachAdvice}
            </div>
          )}

          {hint.coachError && (
            <p className="text-[11px] text-[#FCA5A5]">
              Coach unavailable: {hint.coachError}
            </p>
          )}

          {hint.altMoveSan && (
            <p className="text-xs text-[#A3A3A3]">
              Alternative option:{' '}
              <span className="font-mono font-medium text-[#22C55E]">{hint.altMoveSan}</span>
            </p>
          )}

          {hint.pvLineSan.length > 1 && (
            <p className="text-[11px] text-[#8D959E] font-mono">
              Line: {hint.pvLineSan.join(' ')}
            </p>
          )}

          {hint.tacticalAlert && (
            <div className="flex items-start gap-2 pt-1 text-xs text-[#F59E0B]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{hint.tacticalAlert}</span>
            </div>
          )}

          {hint.checkmateThreat && (
            <div className="flex items-start gap-2 pt-1 text-xs text-[#EF4444]">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{hint.checkmateThreat}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-[#8D959E] leading-relaxed">
          Click <strong className="text-[#D4AF37] font-medium">Hint</strong> on your turn for real Stockfish move suggestions, alternative lines, and threat detection.
        </p>
      )}
    </div>
  );
};
