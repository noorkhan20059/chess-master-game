import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Chess, PieceSymbol, Square } from 'chess.js';
import { Arrow, Chessboard, defaultArrowOptions, PieceDropHandlerArgs, SquareHandlerArgs } from 'react-chessboard';
import { BOARD_THEMES } from '../../data/themes';
import { findCheckedKingSquare, isPromotionMove } from '../../lib/chess/chessUtils';
import { BoardThemeId, PlayerColor } from '../../types/chess';

interface PromotionPending {
  from: Square;
  to: Square;
  color: PlayerColor;
}

interface InteractiveBoardProps {
  fen: string;
  orientation?: 'white' | 'black';
  boardTheme?: BoardThemeId;
  interactive?: boolean;
  allowedTurn?: PlayerColor | 'both';
  showLegalMoves?: boolean;
  showCoordinates?: boolean;
  autoQueen?: boolean;
  animationSpeedMs?: number;
  lastMove?: { from: string; to: string } | null;
  arrows?: Arrow[];
  highlightSquares?: Record<string, React.CSSProperties>;
  onMoveAttempt?: (move: { from: Square; to: Square; promotion?: PieceSymbol }) => boolean;
  boardId?: string;
}

const PROMOTION_PIECES: Array<{ type: PieceSymbol; label: string; glyphW: string; glyphB: string }> = [
  { type: 'q', label: 'Queen', glyphW: '♕', glyphB: '♛' },
  { type: 'r', label: 'Rook', glyphW: '♖', glyphB: '♜' },
  { type: 'b', label: 'Bishop', glyphW: '♗', glyphB: '♝' },
  { type: 'n', label: 'Knight', glyphW: '♘', glyphB: '♞' },
];

export const InteractiveBoard: React.FC<InteractiveBoardProps> = ({
  fen,
  orientation = 'white',
  boardTheme = 'classic',
  interactive = true,
  allowedTurn = 'both',
  showLegalMoves = true,
  showCoordinates = true,
  autoQueen = false,
  animationSpeedMs = 180,
  lastMove = null,
  arrows = [],
  highlightSquares,
  onMoveAttempt,
  boardId = 'main-board',
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PromotionPending | null>(null);

  const theme = BOARD_THEMES[boardTheme] ?? BOARD_THEMES.classic;

  useEffect(() => {
    setSelectedSquare(null);
    setPendingPromotion(null);
  }, [fen]);

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const canControlTurn = useMemo(() => {
    if (!interactive || chess.isGameOver()) return false;
    if (allowedTurn === 'both') return true;
    return chess.turn() === allowedTurn;
  }, [interactive, chess, allowedTurn]);

  const legalTargets = useMemo(() => {
    if (!selectedSquare || !canControlTurn) return [];
    return chess.moves({ square: selectedSquare, verbose: true });
  }, [selectedSquare, canControlTurn, chess]);

  const checkedKingSquare = useMemo(() => findCheckedKingSquare(chess), [chess]);

  const computedSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: theme.highlightLastMove };
      styles[lastMove.to] = { backgroundColor: theme.highlightLastMove };
    }

    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: theme.highlightSelected,
        boxShadow: 'inset 0 0 0 2px #D4AF37',
      };
    }

    if (showLegalMoves && legalTargets.length > 0) {
      for (const move of legalTargets) {
        const hasTargetPiece = Boolean(chess.get(move.to));
        styles[move.to] = {
          ...(styles[move.to] ?? {}),
          background: hasTargetPiece
            ? 'radial-gradient(circle, transparent 60%, rgba(212, 175, 55, 0.72) 63%, rgba(212, 175, 55, 0.72) 74%, transparent 77%)'
            : 'radial-gradient(circle, rgba(212, 175, 55, 0.75) 20%, transparent 23%)',
        };
      }
    }

    if (checkedKingSquare) {
      styles[checkedKingSquare] = {
        ...(styles[checkedKingSquare] ?? {}),
        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.85) 0%, rgba(185, 28, 28, 0.55) 65%, transparent 100%)',
      };
    }

    if (highlightSquares) {
      for (const [sq, customStyle] of Object.entries(highlightSquares)) {
        styles[sq] = { ...(styles[sq] ?? {}), ...customStyle };
      }
    }

    return styles;
  }, [lastMove, selectedSquare, showLegalMoves, legalTargets, chess, checkedKingSquare, theme, highlightSquares]);

  const tryExecuteMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol): boolean => {
      if (!onMoveAttempt || !canControlTurn) return false;
      if (from === to) return false;

      if (!promotion && isPromotionMove(chess, from, to)) {
        if (autoQueen) {
          return onMoveAttempt({ from, to, promotion: 'q' });
        }
        setPendingPromotion({ from, to, color: chess.turn() });
        return false;
      }

      const ok = onMoveAttempt({ from, to, promotion });
      if (ok) {
        setSelectedSquare(null);
      }
      return ok;
    },
    [onMoveAttempt, canControlTurn, chess, autoQueen]
  );

  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!targetSquare || !canControlTurn) return false;
      return tryExecuteMove(sourceSquare as Square, targetSquare as Square);
    },
    [canControlTurn, tryExecuteMove]
  );

  const handleSquareClick = useCallback(
    ({ square }: SquareHandlerArgs) => {
      if (!canControlTurn) return;
      const sq = square as Square;

      if (selectedSquare) {
        if (selectedSquare === sq) {
          setSelectedSquare(null);
          return;
        }
        const isLegalTarget = legalTargets.some((m) => m.to === sq);
        if (isLegalTarget) {
          tryExecuteMove(selectedSquare, sq);
          return;
        }
      }

      const piece = chess.get(sq);
      if (piece && piece.color === chess.turn()) {
        setSelectedSquare(sq);
      } else {
        setSelectedSquare(null);
      }
    },
    [canControlTurn, selectedSquare, legalTargets, tryExecuteMove, chess]
  );

  const handlePromotionChoice = (promo: PieceSymbol) => {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    setPendingPromotion(null);
    setSelectedSquare(null);
    onMoveAttempt?.({ from, to, promotion: promo });
  };

  return (
    <div className="relative w-full aspect-square select-none">
      <div
        className="w-full h-full rounded-lg overflow-hidden shadow-[0_18px_45px_rgba(0,0,0,0.65)]"
        style={{ border: `2px solid ${theme.border}` }}
      >
        <Chessboard
          options={{
            id: boardId,
            position: fen,
            boardOrientation: orientation,
            allowDragging: canControlTurn,
            showNotation: showCoordinates,
            showAnimations: true,
            animationDurationInMs: animationSpeedMs,
            allowDrawingArrows: false,
            arrows,
            arrowOptions: {
              ...defaultArrowOptions,
              colors: {
                ...defaultArrowOptions.colors,
                default: '#D4AF37',
                shift: '#22C55E',
                ctrl: '#EF4444',
              },
              color: '#D4AF37',
              secondaryColor: '#22C55E',
              tertiaryColor: '#EF4444',
              opacity: 0.85,
              activeOpacity: 0.95,
            },
            boardStyle: {
              width: '100%',
              height: '100%',
            },
            darkSquareStyle: { backgroundColor: theme.darkSquare },
            lightSquareStyle: { backgroundColor: theme.lightSquare },
            darkSquareNotationStyle: { color: theme.lightSquare, fontSize: '11px', fontWeight: 600 },
            lightSquareNotationStyle: { color: theme.darkSquare, fontSize: '11px', fontWeight: 600 },
            squareStyles: computedSquareStyles,
            canDragPiece: ({ square }) => {
              if (!canControlTurn || !square) return false;
              const p = chess.get(square as Square);
              return Boolean(p && p.color === chess.turn());
            },
            onPieceDrop: handlePieceDrop,
            onSquareClick: handleSquareClick,
          }}
        />
      </div>

      {pendingPromotion && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 rounded-lg"
          role="dialog"
          aria-label="Choose promotion piece"
        >
          <div className="bg-[#1C2024] border border-[#D4AF37]/60 rounded-xl p-4 shadow-2xl">
            <p className="text-xs font-medium text-[#A3A3A3] mb-3 text-center">Promote Pawn</p>
            <div className="grid grid-cols-4 gap-2">
              {PROMOTION_PIECES.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handlePromotionChoice(item.type)}
                  className="flex flex-col items-center justify-center w-14 h-16 rounded-lg bg-[#111315] border border-[#2C3238] hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors cursor-pointer"
                >
                  <span className="text-3xl leading-none text-[#F5F5F5]">
                    {pendingPromotion.color === 'w' ? item.glyphW : item.glyphB}
                  </span>
                  <span className="text-[11px] text-[#A3A3A3] mt-1">{item.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPendingPromotion(null)}
              className="mt-3 w-full py-1.5 text-xs text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
