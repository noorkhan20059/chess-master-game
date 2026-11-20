import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PieceSymbol, Square } from 'chess.js';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { PlayerColor } from '../../types/chess';
import { squareToWorld } from './boardCoords';

interface ChessPiece3DProps {
  pieceId: string;
  type: PieceSymbol;
  color: PlayerColor;
  square: Square;
  fromSquare?: Square;
  moveSeq: number;
  isSelected: boolean;
  isHovered: boolean;
  isCheckmatedKing: boolean;
  isDying?: boolean;
  justPromoted?: boolean;
  animationDurationSec: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  onSquarePointerClick: (sq: Square) => void;
  onSquareHover: (sq: Square | null) => void;
}

export const ChessPiece3D: React.FC<ChessPiece3DProps> = ({
  type,
  color,
  square,
  fromSquare,
  moveSeq,
  isSelected,
  isHovered,
  isCheckmatedKing,
  isDying = false,
  justPromoted = false,
  animationDurationSec,
  geometry,
  material,
  onSquarePointerClick,
  onSquareHover,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);

  const [targetX, , targetZ] = squareToWorld(square);
  const startWorldRef = useRef<[number, number]>([targetX, targetZ]);
  const endWorldRef = useRef<[number, number]>([targetX, targetZ]);
  const travelProgressRef = useRef<number>(1);
  const lastMoveSeqRef = useRef<number>(moveSeq);
  const dyingProgressRef = useRef<number>(0);
  const promoProgressRef = useRef<number>(justPromoted ? 0 : 1);

  useEffect(() => {
    if (isDying) {
      dyingProgressRef.current = 0;
      return;
    }

    if (moveSeq !== lastMoveSeqRef.current && fromSquare && animationDurationSec > 0.01) {
      const [fx, , fz] = squareToWorld(fromSquare);
      startWorldRef.current = [fx, fz];
      endWorldRef.current = [targetX, targetZ];
      travelProgressRef.current = 0;
    } else if (moveSeq !== lastMoveSeqRef.current) {
      startWorldRef.current = [targetX, targetZ];
      endWorldRef.current = [targetX, targetZ];
      travelProgressRef.current = 1;
      if (groupRef.current) {
        groupRef.current.position.set(targetX, 0, targetZ);
      }
    }
    lastMoveSeqRef.current = moveSeq;
    if (justPromoted) {
      promoProgressRef.current = 0;
    }
  }, [moveSeq, fromSquare, targetX, targetZ, isDying, justPromoted, animationDurationSec]);

  useFrame((_, delta) => {
    const grp = groupRef.current;
    if (!grp) return;
    const dt = Math.min(delta, 0.05);

    if (isDying) {
      dyingProgressRef.current = Math.min(1, dyingProgressRef.current + dt / 0.24);
      const p = dyingProgressRef.current;
      const scale = Math.max(0.001, 1 - p * p);
      grp.scale.setScalar(scale);
      grp.position.y = p * 0.25;
      grp.rotation.y += dt * 4;
      return;
    }

    // Smooth travel arc between squares
    if (travelProgressRef.current < 1) {
      const dur = Math.max(0.14, animationDurationSec);
      travelProgressRef.current = Math.min(1, travelProgressRef.current + dt / dur);
      const t = travelProgressRef.current;
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const [sx, sz] = startWorldRef.current;
      const [ex, ez] = endWorldRef.current;
      grp.position.x = THREE.MathUtils.lerp(sx, ex, ease);
      grp.position.z = THREE.MathUtils.lerp(sz, ez, ease);

      const lift = type === 'n' ? 0.78 : 0.34;
      grp.position.y = Math.sin(ease * Math.PI) * lift;

      const dx = ex - sx;
      const dz = ez - sz;
      const lean = Math.sin(ease * Math.PI) * 0.08;
      grp.rotation.x = Math.sign(dz) * lean;
      grp.rotation.z = -Math.sign(dx) * lean;
    } else {
      grp.position.x = THREE.MathUtils.damp(grp.position.x, targetX, 18, dt);
      grp.position.z = THREE.MathUtils.damp(grp.position.z, targetZ, 18, dt);

      const targetY = isSelected ? 0.21 : isHovered ? 0.065 : 0;
      grp.position.y = THREE.MathUtils.damp(grp.position.y, targetY, 15, dt);

      grp.rotation.x = THREE.MathUtils.damp(grp.rotation.x, 0, 14, dt);
      const targetTiltZ = isCheckmatedKing ? 0.42 : 0;
      grp.rotation.z = THREE.MathUtils.damp(grp.rotation.z, targetTiltZ, 10, dt);
    }

    // Promotion pop feedback
    if (promoProgressRef.current < 1) {
      promoProgressRef.current = Math.min(1, promoProgressRef.current + dt / 0.32);
      const pop = 1 + Math.sin(promoProgressRef.current * Math.PI) * 0.22;
      grp.scale.setScalar(pop);
    } else {
      grp.scale.setScalar(THREE.MathUtils.damp(grp.scale.x, 1, 14, dt));
    }
  });

  const baseRotationY = color === 'w' ? 0 : Math.PI;

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (isDying) return;
    e.stopPropagation();
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (isDying) return;
    e.stopPropagation();
    if (!pointerDownPos.current) return;
    const dist = Math.hypot(
      e.clientX - pointerDownPos.current.x,
      e.clientY - pointerDownPos.current.y
    );
    pointerDownPos.current = null;
    if (dist < 7) {
      onSquarePointerClick(square);
    }
  };

  return (
    <group
      ref={groupRef}
      position={[targetX, 0, targetZ]}
      rotation={[0, baseRotationY, 0]}
    >
      <mesh
        geometry={geometry}
        material={material}
        castShadow
        receiveShadow
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerOver={(e) => {
          if (isDying) return;
          e.stopPropagation();
          onSquareHover(square);
        }}
        onPointerOut={(e) => {
          if (isDying) return;
          e.stopPropagation();
          onSquareHover(null);
        }}
      />
    </group>
  );
};
