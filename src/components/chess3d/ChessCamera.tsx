import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CameraPreset } from '../../types/chess';

interface ChessCameraProps {
  orientation: 'white' | 'black';
  cameraPreset: CameraPreset;
  resetNonce: number;
}

export const ChessCamera: React.FC<ChessCameraProps> = ({
  orientation,
  cameraPreset,
  resetNonce,
}) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera, size } = useThree();

  const targetPosRef = useRef(new THREE.Vector3(0, 7.9, 8.6));
  const animatingRef = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const mobileScale = aspect < 1.05 ? 1.18 : 1.0;
    const zSign = orientation === 'white' ? 1 : -1;

    if (cameraPreset === 'top') {
      targetPosRef.current.set(0, 12.2 * mobileScale, zSign * 0.45);
    } else {
      targetPosRef.current.set(0, 7.6 * mobileScale, zSign * 8.4 * mobileScale);
    }

    if (!initializedRef.current) {
      camera.position.copy(targetPosRef.current);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0.15, 0);
        controlsRef.current.update();
      }
      initializedRef.current = true;
      animatingRef.current = false;
    } else {
      animatingRef.current = true;
    }
  }, [orientation, cameraPreset, resetNonce, size.width, size.height, camera]);

  useFrame((_, delta) => {
    if (!animatingRef.current) return;
    const dt = Math.min(delta, 0.05);
    const alpha = 1 - Math.exp(-7.5 * dt);
    camera.position.lerp(targetPosRef.current, alpha);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(new THREE.Vector3(0, 0.15, 0), alpha);
      controlsRef.current.update();
    }
    if (camera.position.distanceTo(targetPosRef.current) < 0.03) {
      camera.position.copy(targetPosRef.current);
      animatingRef.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={6.2}
      maxDistance={17.5}
      minPolarAngle={0.05}
      maxPolarAngle={Math.PI * 0.44}
      rotateSpeed={0.78}
      zoomSpeed={0.85}
      onStart={() => {
        // Yield immediately when user grabs the camera
        animatingRef.current = false;
      }}
    />
  );
};
