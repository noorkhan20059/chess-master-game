import * as THREE from 'three';
import { BoardThemeId } from '../../types/chess';

export interface WoodTexturePair {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

export interface BoardMaterialTextureSet {
  lightTile: WoodTexturePair;
  darkTile: WoodTexturePair;
  frame: WoodTexturePair;
  whitePiece: WoodTexturePair;
  blackPiece: WoodTexturePair;
}

function seededNoise(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface GrainPalette {
  base: [number, number, number];
  streak: [number, number, number];
  highlight: [number, number, number];
  roughMin: number;
  roughMax: number;
  grainFreq: number;
  ringStrength: number;
}

function generateWoodPair(palette: GrainPalette, seed: number, size = 256): WoodTexturePair {
  const rand = seededNoise(seed);

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const cImg = cCtx.createImageData(size, size);
  const rImg = rCtx.createImageData(size, size);
  const bImg = bCtx.createImageData(size, size);

  const phaseA = rand() * Math.PI * 2;
  const phaseB = rand() * Math.PI * 2;

  for (let y = 0; y < size; y++) {
    const ny = y / size;
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const wave =
        Math.sin(nx * palette.grainFreq + Math.sin(ny * 4.2 + phaseA) * palette.ringStrength) * 0.5 +
        0.5;
      const fineFiber =
        Math.sin(nx * (palette.grainFreq * 4.6) + ny * 2.5 + phaseB) * 0.5 + 0.5;
      const micro = (rand() - 0.5) * 0.08;

      const t = THREE.MathUtils.clamp(wave * 0.68 + fineFiber * 0.24 + micro, 0, 1);
      const hi = Math.pow(fineFiber, 3) * 0.35;

      const r = THREE.MathUtils.lerp(palette.streak[0], palette.base[0], t) + palette.highlight[0] * hi;
      const g = THREE.MathUtils.lerp(palette.streak[1], palette.base[1], t) + palette.highlight[1] * hi;
      const b = THREE.MathUtils.lerp(palette.streak[2], palette.base[2], t) + palette.highlight[2] * hi;

      const idx = (y * size + x) * 4;
      cImg.data[idx] = THREE.MathUtils.clamp(Math.round(r), 0, 255);
      cImg.data[idx + 1] = THREE.MathUtils.clamp(Math.round(g), 0, 255);
      cImg.data[idx + 2] = THREE.MathUtils.clamp(Math.round(b), 0, 255);
      cImg.data[idx + 3] = 255;

      const roughVal = Math.round(
        THREE.MathUtils.lerp(palette.roughMin, palette.roughMax, 1 - t * 0.75) * 255
      );
      rImg.data[idx] = roughVal;
      rImg.data[idx + 1] = roughVal;
      rImg.data[idx + 2] = roughVal;
      rImg.data[idx + 3] = 255;

      const bumpVal = Math.round(THREE.MathUtils.clamp(0.45 + t * 0.45 + micro, 0, 1) * 255);
      bImg.data[idx] = bumpVal;
      bImg.data[idx + 1] = bumpVal;
      bImg.data[idx + 2] = bumpVal;
      bImg.data[idx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = 4;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = 4;

  return { map, roughnessMap, bumpMap };
}

function generateMarblePair(
  base: [number, number, number],
  vein: [number, number, number],
  roughMin: number,
  roughMax: number,
  seed: number,
  size = 256
): WoodTexturePair {
  const rand = seededNoise(seed);

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  const cImg = cCtx.createImageData(size, size);
  const rImg = rCtx.createImageData(size, size);
  const bImg = bCtx.createImageData(size, size);

  const p1 = rand() * 6.28;
  const p2 = rand() * 6.28;

  for (let y = 0; y < size; y++) {
    const ny = y / size;
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const swirl =
        Math.sin(nx * 5.5 + ny * 3.8 + Math.sin(ny * 7.2 + p1) * 1.4) +
        0.5 * Math.cos(ny * 9.0 - nx * 4.2 + p2);
      const veinMask = Math.pow(1 - Math.min(1, Math.abs(swirl) * 0.72), 4.5);
      const speck = (rand() - 0.5) * 0.04;
      const mix = THREE.MathUtils.clamp(veinMask * 0.55 + Math.max(0, speck), 0, 1);

      const idx = (y * size + x) * 4;
      cImg.data[idx] = THREE.MathUtils.clamp(Math.round(THREE.MathUtils.lerp(base[0], vein[0], mix)), 0, 255);
      cImg.data[idx + 1] = THREE.MathUtils.clamp(Math.round(THREE.MathUtils.lerp(base[1], vein[1], mix)), 0, 255);
      cImg.data[idx + 2] = THREE.MathUtils.clamp(Math.round(THREE.MathUtils.lerp(base[2], vein[2], mix)), 0, 255);
      cImg.data[idx + 3] = 255;

      const rough = Math.round(THREE.MathUtils.lerp(roughMin, roughMax, mix) * 255);
      rImg.data[idx] = rough;
      rImg.data[idx + 1] = rough;
      rImg.data[idx + 2] = rough;
      rImg.data[idx + 3] = 255;

      const bump = Math.round((0.5 - mix * 0.25 + speck) * 255);
      bImg.data[idx] = bump;
      bImg.data[idx + 1] = bump;
      bImg.data[idx + 2] = bump;
      bImg.data[idx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { map, roughnessMap, bumpMap };
}

function getThemeTilePalettes(theme: BoardThemeId): {
  light: GrainPalette;
  dark: GrainPalette;
  frame: GrainPalette;
} {
  if (theme === 'obsidian') {
    return {
      light: {
        base: [222, 214, 198],
        streak: [188, 178, 160],
        highlight: [16, 14, 10],
        roughMin: 0.24,
        roughMax: 0.42,
        grainFreq: 16,
        ringStrength: 1.8,
      },
      dark: {
        base: [44, 49, 58],
        streak: [27, 30, 36],
        highlight: [12, 14, 18],
        roughMin: 0.22,
        roughMax: 0.4,
        grainFreq: 18,
        ringStrength: 2.0,
      },
      frame: {
        base: [32, 24, 20],
        streak: [18, 13, 11],
        highlight: [14, 10, 6],
        roughMin: 0.2,
        roughMax: 0.36,
        grainFreq: 12,
        ringStrength: 1.5,
      },
    };
  }

  if (theme === 'emerald') {
    return {
      light: {
        base: [236, 224, 198],
        streak: [212, 195, 164],
        highlight: [16, 14, 10],
        roughMin: 0.26,
        roughMax: 0.44,
        grainFreq: 18,
        ringStrength: 2.1,
      },
      dark: {
        base: [47, 94, 72],
        streak: [30, 66, 49],
        highlight: [14, 24, 16],
        roughMin: 0.26,
        roughMax: 0.44,
        grainFreq: 20,
        ringStrength: 2.3,
      },
      frame: {
        base: [46, 28, 18],
        streak: [28, 16, 10],
        highlight: [18, 12, 6],
        roughMin: 0.2,
        roughMax: 0.38,
        grainFreq: 14,
        ringStrength: 1.8,
      },
    };
  }

  if (theme === 'slate') {
    return {
      light: {
        base: [232, 232, 226],
        streak: [204, 204, 196],
        highlight: [15, 15, 14],
        roughMin: 0.28,
        roughMax: 0.46,
        grainFreq: 16,
        ringStrength: 1.6,
      },
      dark: {
        base: [68, 86, 106],
        streak: [46, 60, 76],
        highlight: [14, 18, 22],
        roughMin: 0.28,
        roughMax: 0.46,
        grainFreq: 18,
        ringStrength: 1.9,
      },
      frame: {
        base: [38, 36, 38],
        streak: [24, 22, 24],
        highlight: [12, 12, 14],
        roughMin: 0.22,
        roughMax: 0.38,
        grainFreq: 14,
        ringStrength: 1.4,
      },
    };
  }

  // Classic luxury tournament walnut & warm ivory maple
  return {
    light: {
      base: [236, 217, 182],
      streak: [211, 184, 142],
      highlight: [18, 14, 8],
      roughMin: 0.26,
      roughMax: 0.44,
      grainFreq: 18,
      ringStrength: 2.2,
    },
    dark: {
      base: [118, 72, 43],
      streak: [78, 44, 24],
      highlight: [22, 14, 8],
      roughMin: 0.24,
      roughMax: 0.42,
      grainFreq: 20,
      ringStrength: 2.5,
    },
    frame: {
      base: [58, 32, 18],
      streak: [34, 18, 10],
      highlight: [18, 10, 4],
      roughMin: 0.18,
      roughMax: 0.34,
      grainFreq: 14,
      ringStrength: 1.8,
    },
  };
}

const cachedSets = new Map<BoardThemeId, BoardMaterialTextureSet>();
let sharedPieceTextures: { whitePiece: WoodTexturePair; blackPiece: WoodTexturePair } | null = null;

export function getBoardTextureSet(theme: BoardThemeId): BoardMaterialTextureSet {
  if (!sharedPieceTextures) {
    // Ivory marble for White pieces & glossy black ebony wood for Black pieces
    sharedPieceTextures = {
      whitePiece: generateMarblePair([244, 237, 222], [208, 194, 172], 0.16, 0.28, 701, 256),
      blackPiece: generateWoodPair(
        {
          base: [26, 25, 25],
          streak: [13, 12, 12],
          highlight: [12, 11, 10],
          roughMin: 0.14,
          roughMax: 0.26,
          grainFreq: 26,
          ringStrength: 1.4,
        },
        917,
        256
      ),
    };
  }

  const existing = cachedSets.get(theme);
  if (existing) return existing;

  const p = getThemeTilePalettes(theme);
  const set: BoardMaterialTextureSet = {
    lightTile: generateWoodPair(p.light, 101 + theme.length * 13),
    darkTile: generateWoodPair(p.dark, 307 + theme.length * 17),
    frame: generateWoodPair(p.frame, 509 + theme.length * 19),
    whitePiece: sharedPieceTextures.whitePiece,
    blackPiece: sharedPieceTextures.blackPiece,
  };
  cachedSets.set(theme, set);
  return set;
}

export function createCoordinateLabelTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 96, 96);
  ctx.fillStyle = '#D4AF37';
  ctx.font = '600 44px "Plus Jakarta Sans", Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 48, 50);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
