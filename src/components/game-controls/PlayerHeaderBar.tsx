import React from 'react';
import { PieceSymbol } from 'chess.js';
import { formatClockMs } from '../../lib/chess/chessUtils';
import { PlayerColor } from '../../types/chess';

interface PlayerHeaderBarProps {
  name: string;
  subtitle: string;
  avatarUrl: string;
  color: PlayerColor;
  isTurn: boolean;
  isThinking?: boolean;
  capturedPieces: PieceSymbol[];
  materialAdvantage: number;
  timeMs: number;
  untimed: boolean;
}

const PIECE_UNICODE_LIGHT: Record<PieceSymbol, string> = {
  q: '♕',
  r: '♖',
  b: '♗',
  n: '♘',
  p: '♙',
  k: '♔',
};

const PIECE_UNICODE_DARK: Record<PieceSymbol, string> = {
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
  k: '♚',
};

export const PlayerHeaderBar: React.FC<PlayerHeaderBarProps> = ({
  name,
  subtitle,
  avatarUrl,
  color,
  isTurn,
  isThinking = false,
  capturedPieces,
  materialAdvantage,
  timeMs,
  untimed,
}) => {
  const isLowTime = !untimed && timeMs <= 20000;
  // White captures Black pieces (dark glyphs), Black captures White pieces (light glyphs)
  const glyphs = color === 'w' ? PIECE_UNICODE_DARK : PIECE_UNICODE_LIGHT;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-colors ${
        isTurn
          ? 'bg-[#1C2024] border-[#D4AF37]/60'
          : 'bg-[#16191D] border-[#252A30]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={avatarUrl}
          alt={name}
          referrerPolicy="no-referrer"
          className="w-9 h-9 rounded-lg object-cover border border-[#2F363E] shrink-0 bg-[#111315]"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[#F5F5F5] truncate">{name}</span>
            {isTurn && (
              <span className="text-[11px] font-medium text-[#D4AF37] whitespace-nowrap">
                {isThinking ? 'Thinking...' : 'To move'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#A3A3A3]">
            <span className="truncate">{subtitle}</span>
            {capturedPieces.length > 0 && (
              <span className="text-sm leading-none tracking-tight text-[#D1D5DB] truncate">
                {capturedPieces.map((p, idx) => (
                  <span key={`${p}-${idx}`}>{glyphs[p]}</span>
                ))}
              </span>
            )}
            {materialAdvantage > 0 && (
              <span className="font-mono tabular-nums text-[11px] font-semibold text-[#D4AF37]">
                +{materialAdvantage}
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className={`px-3 py-1.5 rounded-lg border font-mono tabular-nums text-sm md:text-base font-semibold shrink-0 ${
          untimed
            ? 'bg-[#111315] border-[#282D34] text-[#A3A3A3]'
            : isLowTime && isTurn
            ? 'bg-[#EF4444]/15 border-[#EF4444]/60 text-[#EF4444]'
            : isTurn
            ? 'bg-[#111315] border-[#D4AF37] text-[#F5F5F5]'
            : 'bg-[#111315] border-[#282D34] text-[#9CA3AF]'
        }`}
      >
        {untimed ? '∞' : formatClockMs(timeMs)}
      </div>
    </div>
  );
};
