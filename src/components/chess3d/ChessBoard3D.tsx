import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Square } from 'chess.js';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Arrow } from 'react-chessboard';
import { createCoordinateLabelTexture, getBoardTextureSet } from '../../lib/three/woodTextures';
import { BoardThemeId } from '../../types/chess';
import {
  FILES,
  FRAME_INNER_HALF,
  FRAME_OUTER_HALF,
  FRAME_THICKNESS,
  indicesToSquare,
  isLightSquare,
  RANKS,
  squareToWorld,
  TILE_HEIGHT,
  TILE_WIDTH,
} from './boardCoords';

interface ChessBoard3DProps {
  boardTheme: BoardThemeId;
  orientation: 'white' | 'black';
  showCoordinates: boolean;
  showLegalMoves: boolean;
  selectedSquare: Square | null;
  legalTargets: Array<{ to: Square; isCapture: boolean }>;
  lastMove: { from: string; to: string } | null;
  checkedKingSquare: Square | null;
  hoveredSquare: Square | null;
  highlightSquares?: Record<string, React.CSSProperties>;
  arrows: Arrow[];
  onSquarePointerClick: (sq: Square) => void;
  onSquareHover: (sq: Square | null) => void;
}

function createBeveledTileGeometry(): THREE.ExtrudeGeometry {
  const half = TILE_WIDTH / 2 - 0.014;
  const r = 0.025;
  const shape = new THREE.Shape();
  shape.moveTo(-half + r, -half);
  shape.lineTo(half - r, -half);
  shape.quadraticCurveTo(half, -half, half, -half + r);
  shape.lineTo(half, half - r);
  shape.quadraticCurveTo(half, half, half - r, half);
  shape.lineTo(-half + r, half);
  shape.quadraticCurveTo(-half, half, -half, half - r);
  shape.lineTo(-half, -half + r);
  shape.quadraticCurveTo(-half, -half, -half + r, -half);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: TILE_HEIGHT - 0.024,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.014,
    bevelSegments: 2,
    curveSegments: 3,
  });

  // Rotate so extrusion goes down from y = 0 to y = -TILE_HEIGHT
  geo.rotateX(Math.PI / 2);
  geo.computeBoundingBox();
  if (geo.boundingBox) {
    const maxY = geo.boundingBox.max.y;
    geo.translate(0, -maxY, 0);
  }
  geo.computeVertexNormals();
  return geo;
}

const BoardArrow3D: React.FC<{ arrow: Arrow; index: number }> = ({ arrow, index }) => {
  const [fx, , fz] = squareToWorld(arrow.startSquare);
  const [tx, , tz] = squareToWorld(arrow.endSquare);

  const { midX, midZ, length, angle } = useMemo(() => {
    const dx = tx - fx;
    const dz = tz - fz;
    const len = Math.hypot(dx, dz);
    const ang = Math.atan2(dx, dz);
    return {
      midX: (fx + tx) / 2,
      midZ: (fz + tz) / 2,
      length: len,
      angle: ang,
    };
  }, [fx, fz, tx, tz]);

  if (length < 0.1) return null;
  const headLen = 0.3;
  const shaftLen = Math.max(0.05, length - headLen * 0.85);
  const yHeight = 0.065 + index * 0.02;
  const color = arrow.color || '#D4AF37';

  return (
    <group position={[midX, yHeight, midZ]} rotation={[0, angle, 0]}>
      {/* Shaft */}
      <mesh position={[0, 0, -headLen * 0.35]}>
        <boxGeometry args={[0.11, 0.026, shaftLen]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.45}
          roughness={0.3}
          metalness={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Arrowhead */}
      <mesh position={[0, 0, length / 2 - headLen * 0.45]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.17, headLen, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.5}
          transparent
          opacity={0.92}
        />
      </mesh>
    </group>
  );
};

export const ChessBoard3D: React.FC<ChessBoard3DProps> = ({
  boardTheme,
  orientation,
  showCoordinates,
  showLegalMoves,
  selectedSquare,
  legalTargets,
  lastMove,
  checkedKingSquare,
  hoveredSquare,
  highlightSquares,
  arrows,
  onSquarePointerClick,
  onSquareHover,
}) => {
  const textures = useMemo(() => getBoardTextureSet(boardTheme), [boardTheme]);

  const tileGeo = useMemo(() => createBeveledTileGeometry(), []);
  useEffect(() => () => tileGeo.dispose(), [tileGeo]);

  const materials = useMemo(() => {
    const light = new THREE.MeshStandardMaterial({
      map: textures.lightTile.map,
      roughnessMap: textures.lightTile.roughnessMap,
      bumpMap: textures.lightTile.bumpMap,
      bumpScale: 0.008,
      roughness: 0.44,
      metalness: 0.04,
    });
    const dark = new THREE.MeshStandardMaterial({
      map: textures.darkTile.map,
      roughnessMap: textures.darkTile.roughnessMap,
      bumpMap: textures.darkTile.bumpMap,
      bumpScale: 0.009,
      roughness: 0.4,
      metalness: 0.05,
    });
    const frame = new THREE.MeshPhysicalMaterial({
      map: textures.frame.map,
      roughnessMap: textures.frame.roughnessMap,
      bumpMap: textures.frame.bumpMap,
      bumpScale: 0.006,
      roughness: 0.28,
      metalness: 0.08,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
    });
    const gold = new THREE.MeshStandardMaterial({
      color: '#D4AF37',
      roughness: 0.26,
      metalness: 0.88,
    });
    return { light, dark, frame, gold };
  }, [textures]);

  useEffect(() => {
    return () => {
      materials.light.dispose();
      materials.dark.dispose();
      materials.frame.dispose();
      materials.gold.dispose();
    };
  }, [materials]);

  // Coordinate label textures
  const coordTextures = useMemo(() => {
    const filesMap: Record<string, THREE.CanvasTexture> = {};
    const ranksMap: Record<string, THREE.CanvasTexture> = {};
    FILES.forEach((f) => {
      filesMap[f] = createCoordinateLabelTexture(f.toUpperCase());
    });
    RANKS.forEach((r) => {
      ranksMap[r] = createCoordinateLabelTexture(r);
    });
    return { filesMap, ranksMap };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(coordTextures.filesMap).forEach((t) => t.dispose());
      Object.values(coordTextures.ranksMap).forEach((t) => t.dispose());
    };
  }, [coordTextures]);

  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const handleTilePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleTilePointerUp = (sq: Square, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!pointerDownPos.current) return;
    const dist = Math.hypot(
      e.clientX - pointerDownPos.current.x,
      e.clientY - pointerDownPos.current.y
    );
    pointerDownPos.current = null;
    if (dist < 7) {
      onSquarePointerClick(sq);
    }
  };

  const legalTargetMap = useMemo(() => {
    const m = new Map<Square, boolean>();
    legalTargets.forEach((t) => m.set(t.to, t.isCapture));
    return m;
  }, [legalTargets]);

  const checkHaloRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (checkHaloRef.current) {
      const pulse = 0.65 + 0.35 * Math.sin(clock.getElapsedTime() * 5.2);
      const mat = checkHaloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.42 + pulse * 0.28;
    }
  });

  const squaresList = useMemo(() => {
    const list: Array<{ sq: Square; light: boolean; x: number; z: number }> = [];
    for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
      for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
        const sq = indicesToSquare(fileIdx, rankIdx);
        const [x, , z] = squareToWorld(sq);
        list.push({
          sq,
          light: isLightSquare(fileIdx, rankIdx),
          x,
          z,
        });
      }
    }
    return list;
  }, []);

  const borderCenter = (FRAME_INNER_HALF + FRAME_OUTER_HALF) / 2;
  const borderWidth = FRAME_OUTER_HALF - FRAME_INNER_HALF;
  const fullSpan = FRAME_OUTER_HALF * 2;
  const coordRotY = orientation === 'white' ? 0 : Math.PI;

  return (
    <group>
      {/* Solid recessed board core underneath the 64 individual tiles */}
      <mesh position={[0, -TILE_HEIGHT - 0.095, 0]} receiveShadow castShadow material={materials.frame}>
        <boxGeometry args={[FRAME_OUTER_HALF * 2, 0.21, FRAME_OUTER_HALF * 2]} />
      </mesh>

      {/* Four raised dark walnut frame rails wrapping the 8x8 tile grid */}
      {/* North rail (-Z) */}
      <mesh
        position={[0, -0.145, -borderCenter]}
        receiveShadow
        castShadow
        material={materials.frame}
      >
        <boxGeometry args={[fullSpan, FRAME_THICKNESS, borderWidth]} />
      </mesh>
      {/* South rail (+Z) */}
      <mesh
        position={[0, -0.145, borderCenter]}
        receiveShadow
        castShadow
        material={materials.frame}
      >
        <boxGeometry args={[fullSpan, FRAME_THICKNESS, borderWidth]} />
      </mesh>
      {/* West rail (-X) */}
      <mesh
        position={[-borderCenter, -0.145, 0]}
        receiveShadow
        castShadow
        material={materials.frame}
      >
        <boxGeometry args={[borderWidth, FRAME_THICKNESS, FRAME_INNER_HALF * 2]} />
      </mesh>
      {/* East rail (+X) */}
      <mesh
        position={[borderCenter, -0.145, 0]}
        receiveShadow
        castShadow
        material={materials.frame}
      >
        <boxGeometry args={[borderWidth, FRAME_THICKNESS, FRAME_INNER_HALF * 2]} />
      </mesh>

      {/* Subtle gold brass trim inlay framing the 8x8 playing surface */}
      {[
        { pos: [0, 0.008, -FRAME_INNER_HALF] as [number, number, number], args: [FRAME_INNER_HALF * 2 + 0.03, 0.016, 0.03] as [number, number, number] },
        { pos: [0, 0.008, FRAME_INNER_HALF] as [number, number, number], args: [FRAME_INNER_HALF * 2 + 0.03, 0.016, 0.03] as [number, number, number] },
        { pos: [-FRAME_INNER_HALF, 0.008, 0] as [number, number, number], args: [0.03, 0.016, FRAME_INNER_HALF * 2] as [number, number, number] },
        { pos: [FRAME_INNER_HALF, 0.008, 0] as [number, number, number], args: [0.03, 0.016, FRAME_INNER_HALF * 2] as [number, number, number] },
      ].map((strip, idx) => (
        <mesh key={idx} position={strip.pos} material={materials.gold}>
          <boxGeometry args={strip.args} />
        </mesh>
      ))}

      {/* Outer subtle gold corner accents */}
      {[
        [-FRAME_OUTER_HALF + 0.06, 0.027, -FRAME_OUTER_HALF + 0.06],
        [FRAME_OUTER_HALF - 0.06, 0.027, -FRAME_OUTER_HALF + 0.06],
        [-FRAME_OUTER_HALF + 0.06, 0.027, FRAME_OUTER_HALF - 0.06],
        [FRAME_OUTER_HALF - 0.06, 0.027, FRAME_OUTER_HALF - 0.06],
      ].map((pos, idx) => (
        <mesh key={idx} position={pos as [number, number, number]} material={materials.gold}>
          <boxGeometry args={[0.1, 0.01, 0.1]} />
        </mesh>
      ))}

      {/* 64 Individual Beveled 3D Wood Tiles */}
      {squaresList.map(({ sq, light, x, z }) => {
        const isSelected = selectedSquare === sq;
        const isLastMove = lastMove?.from === sq || lastMove?.to === sq;
        const isChecked = checkedKingSquare === sq;
        const isHovered = hoveredSquare === sq;
        const isLegalCapture = legalTargetMap.get(sq);
        const isLegal = showLegalMoves && isLegalCapture !== undefined;
        const hasExternalHighlight = Boolean(highlightSquares && highlightSquares[sq]);

        return (
          <group key={sq} position={[x, 0, z]}>
            <mesh
              geometry={tileGeo}
              material={light ? materials.light : materials.dark}
              receiveShadow
              onPointerDown={handleTilePointerDown}
              onPointerUp={(e) => handleTilePointerUp(sq, e)}
              onPointerOver={(e) => {
                e.stopPropagation();
                onSquareHover(sq);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                onSquareHover(null);
              }}
            />

            {/* Last move translucent amber highlight */}
            {isLastMove && !isSelected && (
              <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.93, 0.93]} />
                <meshBasicMaterial color="#D4AF37" transparent opacity={0.28} depthWrite={false} />
              </mesh>
            )}

            {/* Selected square gold glow + rim */}
            {isSelected && (
              <group position={[0, 0.005, 0]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.94, 0.94]} />
                  <meshBasicMaterial color="#D4AF37" transparent opacity={0.34} depthWrite={false} />
                </mesh>
                <mesh position={[0, 0.001, -0.445]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.94, 0.05]} />
                  <meshBasicMaterial color="#F5D76E" transparent opacity={0.92} depthWrite={false} />
                </mesh>
                <mesh position={[0, 0.001, 0.445]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.94, 0.05]} />
                  <meshBasicMaterial color="#F5D76E" transparent opacity={0.92} depthWrite={false} />
                </mesh>
                <mesh position={[-0.445, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.05, 0.94]} />
                  <meshBasicMaterial color="#F5D76E" transparent opacity={0.92} depthWrite={false} />
                </mesh>
                <mesh position={[0.445, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[0.05, 0.94]} />
                  <meshBasicMaterial color="#F5D76E" transparent opacity={0.92} depthWrite={false} />
                </mesh>
              </group>
            )}

            {/* External puzzle/hint highlight */}
            {hasExternalHighlight && !isSelected && (
              <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.38, 0.46, 32]} />
                <meshBasicMaterial color="#D4AF37" transparent opacity={0.85} depthWrite={false} />
              </mesh>
            )}

            {/* Hover subtle highlight */}
            {isHovered && !isSelected && (
              <mesh position={[0, 0.0045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.92, 0.92]} />
                <meshBasicMaterial color="#F5F5F5" transparent opacity={0.1} depthWrite={false} />
              </mesh>
            )}

            {/* Legal move indicator */}
            {isLegal && (
              <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                {isLegalCapture ? (
                  <ringGeometry args={[0.33, 0.43, 32]} />
                ) : (
                  <circleGeometry args={[0.145, 24]} />
                )}
                <meshBasicMaterial
                  color={isLegalCapture ? '#EF4444' : '#E6C35A'}
                  transparent
                  opacity={isLegalCapture ? 0.78 : 0.72}
                  depthWrite={false}
                />
              </mesh>
            )}

            {/* Checked King crimson pulsing warning */}
            {isChecked && (
              <mesh ref={checkHaloRef} position={[0, 0.007, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.46, 32]} />
                <meshBasicMaterial color="#EF4444" transparent opacity={0.62} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Coordinate Markers along the walnut border */}
      {showCoordinates && (
        <group>
          {FILES.map((file, idx) => {
            const x = idx - 3.5;
            const zEdge = orientation === 'white' ? borderCenter : -borderCenter;
            return (
              <mesh
                key={`file-${file}`}
                position={[x, 0.028, zEdge]}
                rotation={[-Math.PI / 2, 0, coordRotY]}
              >
                <planeGeometry args={[0.34, 0.34]} />
                <meshBasicMaterial
                  map={coordTextures.filesMap[file]}
                  transparent
                  opacity={0.92}
                  depthWrite={false}
                />
              </mesh>
            );
          })}

          {RANKS.map((rank, idx) => {
            const z = 3.5 - idx;
            const xEdge = orientation === 'white' ? -borderCenter : borderCenter;
            return (
              <mesh
                key={`rank-${rank}`}
                position={[xEdge, 0.028, z]}
                rotation={[-Math.PI / 2, 0, coordRotY]}
              >
                <planeGeometry args={[0.34, 0.34]} />
                <meshBasicMaterial
                  map={coordTextures.ranksMap[rank]}
                  transparent
                  opacity={0.92}
                  depthWrite={false}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {/* 3D Hint / Best-Move Arrows */}
      {arrows.map((arrow, idx) => (
        <BoardArrow3D
          key={`${arrow.startSquare}-${arrow.endSquare}-${idx}`}
          arrow={arrow}
          index={idx}
        />
      ))}
    </group>
  );
};
