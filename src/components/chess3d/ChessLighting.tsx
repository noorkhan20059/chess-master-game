import React, { useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface ChessLightingProps {
  isSoftwareGl: boolean;
}

export const ChessLighting: React.FC<ChessLightingProps> = ({ isSoftwareGl }) => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);

    const prevEnv = scene.environment;
    const prevIntensity = scene.environmentIntensity;
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.55;

    return () => {
      scene.environment = prevEnv;
      scene.environmentIntensity = prevIntensity;
      envRT.dispose();
      roomEnv.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  const shadowMapSize = isSoftwareGl ? 1024 : 2048;

  return (
    <>
      <color attach="background" args={['#0E1114']} />
      <fog attach="fog" args={['#0E1114', 18, 36]} />

      {/* Balanced hemisphere fill for natural wood & stone bounce */}
      <hemisphereLight args={['#DDE7F7', '#261A12', 0.52]} />

      {/* Warm studio key light */}
      <directionalLight
        position={[6.5, 11.5, 6.2]}
        intensity={2.15}
        color="#FFF3DD"
        castShadow
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-camera-near={1}
        shadow-camera-far={28}
        shadow-camera-left={-5.8}
        shadow-camera-right={5.8}
        shadow-camera-top={5.8}
        shadow-camera-bottom={-5.8}
        shadow-bias={-0.0004}
        shadow-normalBias={0.024}
        shadow-radius={3}
      />

      {/* Cool rim light to separate glossy ebony silhouettes from dark background */}
      <directionalLight position={[-6.5, 7.2, -7.5]} intensity={0.85} color="#BFD4F5" />

      {/* Subtle warm tabletop accent light from front-left */}
      <pointLight position={[-5.5, 4.5, 6.0]} intensity={14} distance={22} decay={2} color="#FFDCA8" />

      {/* Matte salon table plane underneath the walnut board */}
      <mesh position={[0, -0.355, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[18, 48]} />
        <meshStandardMaterial color="#121519" roughness={0.92} metalness={0.06} />
      </mesh>

      {!isSoftwareGl && (
        <ContactShadows
          position={[0, -0.345, 0]}
          opacity={0.55}
          scale={15}
          blur={1.8}
          far={4}
          resolution={512}
          color="#050607"
        />
      )}
    </>
  );
};
