import React, { Suspense, lazy } from 'react';
import { PieceSymbol, Square } from 'chess.js';
import { Arrow } from 'react-chessboard';
import { BoardThemeId, BoardViewMode, CameraPreset, PlayerColor } from '../../types/chess';
import { InteractiveBoard } from './InteractiveBoard';

const ChessScene3D = lazy(() =>
  import('../chess3d/ChessScene3D').then((m) => ({ default: m.ChessScene3D }))
);

interface AdaptiveChessBoardProps {
  viewMode: BoardViewMode;
  fen: string;
  orientation?: 'white' | 'black';
  boardTheme?: BoardThemeId;
  cameraPreset?: CameraPreset;
  onCameraPresetChange?: (preset: CameraPreset) => void;
  onSwitchViewMode?: (mode: BoardViewMode) => void;
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

const Board3DSkeleton: React.FC = () => (
  <div className="w-full aspect-[4/3] sm:aspect-[10/9] lg:aspect-square rounded-xl border border-[#2C3238] bg-[#0E1114] flex flex-col items-center justify-center gap-3 p-6 text-center">
    <div className="w-10 h-10 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
    <p className="text-xs font-medium text-[#A3A3A3]">
      Crafting 3D tournament chessboard &amp; Staunton pieces...
    </p>
  </div>
);

export const AdaptiveChessBoard: React.FC<AdaptiveChessBoardProps> = ({
  viewMode,
  fen,
  orientation = 'white',
  boardTheme = 'classic',
  cameraPreset = 'angled',
  onCameraPresetChange,
  onSwitchViewMode,
  interactive = true,
  allowedTurn = 'both',
  showLegalMoves = true,
  showCoordinates = true,
  autoQueen = false,
  animationSpeedMs = 220,
  lastMove = null,
  arrows = [],
  highlightSquares,
  onMoveAttempt,
  boardId = 'main-board',
}) => {
  if (viewMode === '2d') {
    return (
      <InteractiveBoard
        fen={fen}
        orientation={orientation}
        boardTheme={boardTheme}
        interactive={interactive}
        allowedTurn={allowedTurn}
        showLegalMoves={showLegalMoves}
        showCoordinates={showCoordinates}
        autoQueen={autoQueen}
        animationSpeedMs={animationSpeedMs}
        lastMove={lastMove}
        arrows={arrows}
        highlightSquares={highlightSquares}
        onMoveAttempt={onMoveAttempt}
        boardId={boardId}
      />
    );
  }

  return (
    <Suspense fallback={<Board3DSkeleton />}>
      <ChessScene3D
        fen={fen}
        orientation={orientation}
        boardTheme={boardTheme}
        cameraPreset={cameraPreset}
        onCameraPresetChange={onCameraPresetChange}
        interactive={interactive}
        allowedTurn={allowedTurn}
        showLegalMoves={showLegalMoves}
        showCoordinates={showCoordinates}
        autoQueen={autoQueen}
        animationSpeedMs={animationSpeedMs}
        lastMove={lastMove}
        arrows={arrows}
        highlightSquares={highlightSquares}
        onMoveAttempt={onMoveAttempt}
        onFallbackTo2D={() => onSwitchViewMode?.('2d')}
      />
    </Suspense>
  );
};
