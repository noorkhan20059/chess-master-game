import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Chess, PieceSymbol, Square } from 'chess.js';
import { Canvas } from '@react-three/fiber';
import { Arrow } from 'react-chessboard';
import { Eye, RotateCcw, Video } from 'lucide-react';
import { chessSounds } from '../../lib/audio/soundEffects';
import { findCheckedKingSquare, isPromotionMove } from '../../lib/chess/chessUtils';
import { getPieceGeometries } from '../../lib/three/pieceGeometries';
import { getBoardTextureSet } from '../../lib/three/woodTextures';
import { BoardThemeId, CameraPreset, PlayerColor } from '../../types/chess';
import { FILES, indicesToSquare } from './boardCoords';
import { ChessBoard3D } from './ChessBoard3D';
import { ChessCamera } from './ChessCamera';
import { ChessLighting } from './ChessLighting';
import { ChessPiece3D } from './ChessPiece3D';

export interface ChessScene3DProps {
  fen: string;
  orientation?: 'white' | 'black';
  boardTheme?: BoardThemeId;
  cameraPreset?: CameraPreset;
  onCameraPresetChange?: (preset: CameraPreset) => void;
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
  onFallbackTo2D?: () => void;
}

interface ActivePieceItem {
  id: string;
  type: PieceSymbol;
  color: PlayerColor;
  square: Square;
  fromSquare?: Square;
  moveSeq: number;
  justPromoted?: boolean;
}

interface DyingPieceItem {
  key: string;
  type: PieceSymbol;
  color: PlayerColor;
  square: Square;
}

interface PendingPromotion {
  from: Square;
  to: Square;
  color: PlayerColor;
}

const PROMOTION_PIECES: Array<{ type: PieceSymbol; label: string; glyphW: string; glyphB: string }> = [
  { type: 'q', label: 'Queen', glyphW: '♕', glyphB: '♛' },
  { type: 'r', label: 'Rook', glyphW: '♖', glyphB: '♜' },
  { type: 'b', label: 'Bishop', glyphW: '♗', glyphB: '♝' },
  { type: 'n', label: 'Knight', glyphW: '♘', glyphB: '♞' },
];

function extractBoardPieces(chess: Chess): Array<{ square: Square; type: PieceSymbol; color: PlayerColor }> {
  const board = chess.board();
  const list: Array<{ square: Square; type: PieceSymbol; color: PlayerColor }> = [];
  for (let r = 0; r < 8; r++) {
    const rankIdx = 7 - r;
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f];
      if (cell) {
        list.push({
          square: indicesToSquare(f, rankIdx),
          type: cell.type,
          color: cell.color,
        });
      }
    }
  }
  return list;
}

function detectSoftwareRenderer(gl: THREE.WebGLRenderer): boolean {
  try {
    const ctx = gl.getContext();
    const debugInfo = ctx.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return false;
    const rendererStr = String(ctx.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? '');
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
  } catch {
    return false;
  }
}

interface InnerSceneProps {
  boardTheme: BoardThemeId;
  orientation: 'white' | 'black';
  cameraPreset: CameraPreset;
  cameraResetNonce: number;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  selectedSquare: Square | null;
  legalTargets: Array<{ to: Square; isCapture: boolean }>;
  lastMove: { from: string; to: string } | null;
  checkedKingSquare: Square | null;
  checkmatedKingSquare: Square | null;
  hoveredSquare: Square | null;
  highlightSquares?: Record<string, React.CSSProperties>;
  arrows: Arrow[];
  pieces: ActivePieceItem[];
  dyingPieces: DyingPieceItem[];
  animationDurationSec: number;
  isSoftwareGl: boolean;
  onSquarePointerClick: (sq: Square) => void;
  onSquareHover: (sq: Square | null) => void;
}

const InnerChessWorld: React.FC<InnerSceneProps> = React.memo(
  ({
    boardTheme,
    orientation,
    cameraPreset,
    cameraResetNonce,
    showCoordinates,
    showLegalMoves,
    selectedSquare,
    legalTargets,
    lastMove,
    checkedKingSquare,
    checkmatedKingSquare,
    hoveredSquare,
    highlightSquares,
    arrows,
    pieces,
    dyingPieces,
    animationDurationSec,
    isSoftwareGl,
    onSquarePointerClick,
    onSquareHover,
  }) => {
    const geometries = useMemo(() => getPieceGeometries(), []);
    const textures = useMemo(() => getBoardTextureSet(boardTheme), [boardTheme]);

    const pieceMaterials = useMemo(() => {
      const white = new THREE.MeshPhysicalMaterial({
        color: '#F7F1E4',
        map: textures.whitePiece.map,
        roughnessMap: textures.whitePiece.roughnessMap,
        bumpMap: textures.whitePiece.bumpMap,
        bumpScale: 0.004,
        roughness: 0.22,
        metalness: 0.02,
        clearcoat: 0.55,
        clearcoatRoughness: 0.14,
      });
      const black = new THREE.MeshPhysicalMaterial({
        color: '#222020',
        map: textures.blackPiece.map,
        roughnessMap: textures.blackPiece.roughnessMap,
        bumpMap: textures.blackPiece.bumpMap,
        bumpScale: 0.005,
        roughness: 0.2,
        metalness: 0.08,
        clearcoat: 0.72,
        clearcoatRoughness: 0.12,
      });
      return { white, black };
    }, [textures]);

    useEffect(() => {
      return () => {
        pieceMaterials.white.dispose();
        pieceMaterials.black.dispose();
      };
    }, [pieceMaterials]);

    return (
      <>
        <ChessLighting isSoftwareGl={isSoftwareGl} />
        <ChessCamera
          orientation={orientation}
          cameraPreset={cameraPreset}
          resetNonce={cameraResetNonce}
        />

        <ChessBoard3D
          boardTheme={boardTheme}
          orientation={orientation}
          showCoordinates={showCoordinates}
          showLegalMoves={showLegalMoves}
          selectedSquare={selectedSquare}
          legalTargets={legalTargets}
          lastMove={lastMove}
          checkedKingSquare={checkedKingSquare}
          hoveredSquare={hoveredSquare}
          highlightSquares={highlightSquares}
          arrows={arrows}
          onSquarePointerClick={onSquarePointerClick}
          onSquareHover={onSquareHover}
        />

        {pieces.map((p) => (
          <ChessPiece3D
            key={p.id}
            pieceId={p.id}
            type={p.type}
            color={p.color}
            square={p.square}
            fromSquare={p.fromSquare}
            moveSeq={p.moveSeq}
            isSelected={selectedSquare === p.square}
            isHovered={hoveredSquare === p.square}
            isCheckmatedKing={checkmatedKingSquare === p.square}
            justPromoted={p.justPromoted}
            animationDurationSec={animationDurationSec}
            geometry={geometries[p.type]}
            material={p.color === 'w' ? pieceMaterials.white : pieceMaterials.black}
            onSquarePointerClick={onSquarePointerClick}
            onSquareHover={onSquareHover}
          />
        ))}

        {dyingPieces.map((dp) => (
          <ChessPiece3D
            key={dp.key}
            pieceId={dp.key}
            type={dp.type}
            color={dp.color}
            square={dp.square}
            moveSeq={0}
            isSelected={false}
            isHovered={false}
            isCheckmatedKing={false}
            isDying
            animationDurationSec={0.24}
            geometry={geometries[dp.type]}
            material={dp.color === 'w' ? pieceMaterials.white : pieceMaterials.black}
            onSquarePointerClick={() => {}}
            onSquareHover={() => {}}
          />
        ))}
      </>
    );
  }
);

export const ChessScene3D: React.FC<ChessScene3DProps> = ({
  fen,
  orientation = 'white',
  boardTheme = 'classic',
  cameraPreset = 'angled',
  onCameraPresetChange,
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
  onFallbackTo2D,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [hoveredSquare, setHoveredSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [localCameraPreset, setLocalCameraPreset] = useState<CameraPreset>(cameraPreset);
  const [cameraResetNonce, setCameraResetNonce] = useState(0);
  const [isSoftwareGl, setIsSoftwareGl] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    setLocalCameraPreset(cameraPreset);
  }, [cameraPreset]);

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  // Clear stale selection whenever position updates
  useEffect(() => {
    setSelectedSquare(null);
    setPendingPromotion(null);
  }, [fen]);

  // Piece reconciliation & move diff engine for physical animations
  const piecesRef = useRef<ActivePieceItem[] | null>(null);
  const nextIdCounter = useRef(1);
  const moveSeqCounter = useRef(1);
  const prevFenRef = useRef<string | null>(null);
  const [dyingPieces, setDyingPieces] = useState<DyingPieceItem[]>([]);

  const { pieces, newlyCaptured } = useMemo<{
    pieces: ActivePieceItem[];
    newlyCaptured: DyingPieceItem[];
  }>(() => {
    const targetList = extractBoardPieces(chess);

    if (!piecesRef.current || prevFenRef.current === fen) {
      if (!piecesRef.current) {
        const initial: ActivePieceItem[] = targetList.map((item) => ({
          id: `piece-${nextIdCounter.current++}`,
          type: item.type,
          color: item.color,
          square: item.square,
          moveSeq: 0,
        }));
        piecesRef.current = initial;
        prevFenRef.current = fen;
      }
      return { pieces: piecesRef.current, newlyCaptured: [] };
    }

    const prevPieces = piecesRef.current;
    const prevBySq = new Map<Square, ActivePieceItem>();
    prevPieces.forEach((p) => prevBySq.set(p.square, p));

    const matchedPrevIds = new Set<string>();
    const newlyMatchedByTargetSq = new Map<Square, ActivePieceItem>();
    const capturedQueue: DyingPieceItem[] = [];
    const seq = moveSeqCounter.current++;

    if (lastMove && lastMove.from && lastMove.to) {
      const fromSq = lastMove.from as Square;
      const toSq = lastMove.to as Square;
      const movingOld = prevBySq.get(fromSq);
      const targetNew = targetList.find((t) => t.square === toSq);

      if (movingOld && targetNew && movingOld.color === targetNew.color) {
        matchedPrevIds.add(movingOld.id);
        newlyMatchedByTargetSq.set(toSq, {
          id: movingOld.id,
          type: targetNew.type,
          color: targetNew.color,
          square: toSq,
          fromSquare: fromSq,
          moveSeq: seq,
          justPromoted: movingOld.type === 'p' && targetNew.type !== 'p',
        });

        // Capture on destination square
        const victim = prevBySq.get(toSq);
        if (victim && victim.id !== movingOld.id) {
          matchedPrevIds.add(victim.id);
          capturedQueue.push({
            key: `dying-${victim.id}-${seq}`,
            type: victim.type,
            color: victim.color,
            square: victim.square,
          });
        } else if (movingOld.type === 'p' && fromSq[0] !== toSq[0]) {
          // En passant capture: victim was on [toFile, fromRank]
          const epSq = `${toSq[0]}${fromSq[1]}` as Square;
          const epVictim = prevBySq.get(epSq);
          if (epVictim && epVictim.color !== movingOld.color) {
            matchedPrevIds.add(epVictim.id);
            capturedQueue.push({
              key: `dying-${epVictim.id}-${seq}`,
              type: epVictim.type,
              color: epVictim.color,
              square: epVictim.square,
            });
          }
        }

        // Castling simultaneous Rook animation
        if (movingOld.type === 'k') {
          const fromF = FILES.indexOf(fromSq[0] as (typeof FILES)[number]);
          const toF = FILES.indexOf(toSq[0] as (typeof FILES)[number]);
          if (Math.abs(fromF - toF) === 2) {
            const rank = fromSq[1];
            const rookFrom = `${toF > fromF ? 'h' : 'a'}${rank}` as Square;
            const rookTo = `${toF > fromF ? 'f' : 'd'}${rank}` as Square;
            const rookOld = prevBySq.get(rookFrom);
            const rookNew = targetList.find((t) => t.square === rookTo && t.type === 'r');
            if (rookOld && rookNew) {
              matchedPrevIds.add(rookOld.id);
              newlyMatchedByTargetSq.set(rookTo, {
                id: rookOld.id,
                type: 'r',
                color: rookNew.color,
                square: rookTo,
                fromSquare: rookFrom,
                moveSeq: seq,
              });
            }
          }
        }
      }
    }

    // Reconcile remaining stationary pieces on identical squares
    for (const t of targetList) {
      if (newlyMatchedByTargetSq.has(t.square)) continue;
      const sameSqOld = prevBySq.get(t.square);
      if (
        sameSqOld &&
        !matchedPrevIds.has(sameSqOld.id) &&
        sameSqOld.type === t.type &&
        sameSqOld.color === t.color
      ) {
        matchedPrevIds.add(sameSqOld.id);
        newlyMatchedByTargetSq.set(t.square, {
          ...sameSqOld,
          fromSquare: undefined,
          justPromoted: false,
        });
      }
    }

    // Match any remaining relocated pieces (e.g. Undo or position swap) by type & color
    const unusedOld = prevPieces.filter((p) => !matchedPrevIds.has(p.id));
    const result: ActivePieceItem[] = [];

    for (const t of targetList) {
      const matched = newlyMatchedByTargetSq.get(t.square);
      if (matched) {
        result.push(matched);
        continue;
      }
      const fallbackIdx = unusedOld.findIndex(
        (u) => u.type === t.type && u.color === t.color
      );
      if (fallbackIdx >= 0) {
        const [reused] = unusedOld.splice(fallbackIdx, 1);
        result.push({
          id: reused.id,
          type: t.type,
          color: t.color,
          square: t.square,
          fromSquare: reused.square,
          moveSeq: seq,
        });
      } else {
        result.push({
          id: `piece-${nextIdCounter.current++}`,
          type: t.type,
          color: t.color,
          square: t.square,
          moveSeq: 0,
        });
      }
    }

    piecesRef.current = result;
    prevFenRef.current = fen;

    return { pieces: result, newlyCaptured: capturedQueue };
  }, [chess, fen, lastMove]);

  useEffect(() => {
    if (newlyCaptured.length === 0) return;
    setDyingPieces((prev) => [...prev, ...newlyCaptured]);
    const timer = window.setTimeout(() => {
      setDyingPieces((prev) =>
        prev.filter((d) => !newlyCaptured.some((n) => n.key === d.key))
      );
    }, 280);
    return () => window.clearTimeout(timer);
  }, [newlyCaptured]);

  const canControlTurn = useMemo(() => {
    if (!interactive || chess.isGameOver()) return false;
    if (allowedTurn === 'both') return true;
    return chess.turn() === allowedTurn;
  }, [interactive, chess, allowedTurn]);

  const legalTargets = useMemo(() => {
    if (!selectedSquare || !canControlTurn) return [];
    const moves = chess.moves({ square: selectedSquare, verbose: true });
    return moves.map((m) => ({
      to: m.to,
      isCapture: Boolean(m.captured) || m.flags.includes('e'),
    }));
  }, [selectedSquare, canControlTurn, chess]);

  useEffect(() => {
    if (!hoveredSquare || !canControlTurn) {
      document.body.style.cursor = 'auto';
      return;
    }
    const piece = chess.get(hoveredSquare);
    const isSelectablePiece = Boolean(piece && piece.color === chess.turn());
    const isLegalDest = legalTargets.some((t) => t.to === hoveredSquare);
    document.body.style.cursor = isSelectablePiece || isLegalDest ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoveredSquare, canControlTurn, chess, legalTargets]);

  const checkedKingSquare = useMemo(() => findCheckedKingSquare(chess), [chess]);
  const checkmatedKingSquare = useMemo(
    () => (chess.isCheckmate() ? checkedKingSquare : null),
    [chess, checkedKingSquare]
  );

  const tryExecuteMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol): boolean => {
      if (!onMoveAttempt || !canControlTurn || from === to) return false;

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

  const handleSquarePointerClick = useCallback(
    (sq: Square) => {
      if (!canControlTurn) return;

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
        chessSounds.playSelect();
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

  const handlePresetClick = (preset: CameraPreset) => {
    setLocalCameraPreset(preset);
    onCameraPresetChange?.(preset);
    setCameraResetNonce((n) => n + 1);
  };

  const animationDurationSec =
    animationSpeedMs <= 0 ? 0 : Math.max(0.18, Math.min(0.45, (animationSpeedMs / 1000) * 1.45));

  return (
    <div className="space-y-2.5 select-none">
      {/* 3D Viewport Container */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[10/9] lg:aspect-square rounded-xl overflow-hidden border border-[#2C3238] bg-[#0E1114] shadow-[0_22px_55px_rgba(0,0,0,0.72)]">
        {contextLost ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#14171A] space-y-3">
            <p className="text-sm font-semibold text-[#F5F5F5]">
              3D WebGL Context Unavailable
            </p>
            <p className="text-xs text-[#A3A3A3] max-w-xs">
              Your browser paused or could not initialize hardware 3D graphics. You can switch to Classic 2D View or reload the 3D scene.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setContextLost(false)}
                className="px-3.5 py-2 rounded-lg bg-[#1C2024] border border-[#323942] text-xs font-medium text-[#F5F5F5] hover:border-[#D4AF37] cursor-pointer"
              >
                Retry 3D View
              </button>
              {onFallbackTo2D && (
                <button
                  type="button"
                  onClick={onFallbackTo2D}
                  className="px-3.5 py-2 rounded-lg bg-[#D4AF37] text-[#111315] text-xs font-semibold hover:bg-[#E2C04D] cursor-pointer"
                >
                  Switch to 2D Board
                </button>
              )}
            </div>
          </div>
        ) : (
          <Canvas
            shadows="percentage"
            dpr={[1, 2]}
            camera={{ fov: 40, near: 0.2, far: 80, position: [0, 7.6, 8.4] }}
            gl={{
              antialias: true,
              powerPreference: 'high-performance',
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.05,
            }}
            onCreated={({ gl }) => {
              const soft = detectSoftwareRenderer(gl);
              setIsSoftwareGl(soft);

              const canvas = gl.domElement;
              const onLost = (e: Event) => {
                e.preventDefault();
                setContextLost(true);
              };
              const onRestored = () => {
                setContextLost(false);
              };
              canvas.addEventListener('webglcontextlost', onLost);
              canvas.addEventListener('webglcontextrestored', onRestored);
            }}
          >
            <InnerChessWorld
              boardTheme={boardTheme}
              orientation={orientation}
              cameraPreset={localCameraPreset}
              cameraResetNonce={cameraResetNonce}
              showCoordinates={showCoordinates}
              showLegalMoves={showLegalMoves}
              selectedSquare={selectedSquare}
              legalTargets={legalTargets}
              lastMove={lastMove}
              checkedKingSquare={checkedKingSquare}
              checkmatedKingSquare={checkmatedKingSquare}
              hoveredSquare={hoveredSquare}
              highlightSquares={highlightSquares}
              arrows={arrows}
              pieces={pieces}
              dyingPieces={dyingPieces}
              animationDurationSec={animationDurationSec}
              isSoftwareGl={isSoftwareGl}
              onSquarePointerClick={handleSquarePointerClick}
              onSquareHover={setHoveredSquare}
            />
          </Canvas>
        )}

        {/* Solid-surface Pawn Promotion Dialog (no backdrop-blur over WebGL canvas) */}
        {pendingPromotion && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center bg-[#090B0D]/80 rounded-xl"
            role="dialog"
            aria-label="Choose promotion piece"
          >
            <div className="bg-[#1C2024] border border-[#D4AF37]/70 rounded-xl p-4 shadow-2xl">
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

      {/* Compact 3D Camera Controls Bar underneath viewport (never occludes board) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#1C2024] border border-[#282D34] text-[11px]">
        <span className="text-[#8D959E]">Drag to orbit · Scroll to zoom · Click piece to move</span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handlePresetClick('angled')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
              localCameraPreset === 'angled'
                ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37] font-semibold'
                : 'bg-[#111315] border-[#2C3238] text-[#A3A3A3] hover:text-[#F5F5F5]'
            }`}
          >
            <Video className="w-3 h-3" />
            <span>3D Angled</span>
          </button>

          <button
            type="button"
            onClick={() => handlePresetClick('top')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
              localCameraPreset === 'top'
                ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37] font-semibold'
                : 'bg-[#111315] border-[#2C3238] text-[#A3A3A3] hover:text-[#F5F5F5]'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Top-Down</span>
          </button>

          <button
            type="button"
            onClick={() => setCameraResetNonce((n) => n + 1)}
            title="Reset camera angle"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#111315] border border-[#2C3238] text-[#A3A3A3] hover:text-[#F5F5F5] hover:border-[#D4AF37] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Camera</span>
          </button>
        </div>
      </div>
    </div>
  );
};
