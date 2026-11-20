import { Square } from 'chess.js';

export const SQUARE_SIZE = 1.0;
export const TILE_WIDTH = 0.982;
export const TILE_HEIGHT = 0.14;
export const FRAME_THICKNESS = 0.34;
export const BOARD_GRID_SPAN = 8 * SQUARE_SIZE; // 8.0
export const FRAME_INNER_HALF = 4.04;
export const FRAME_OUTER_HALF = 4.68;

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

export function squareToIndices(square: string): { fileIdx: number; rankIdx: number } {
  const fileIdx = FILES.indexOf(square[0] as (typeof FILES)[number]);
  const rankIdx = RANKS.indexOf(square[1] as (typeof RANKS)[number]);
  return {
    fileIdx: fileIdx >= 0 ? fileIdx : 0,
    rankIdx: rankIdx >= 0 ? rankIdx : 0,
  };
}

/**
 * Right-handed Three.js board coordinates:
 * +X = a -> h
 * +Z = 8 -> 1 (White's back rank sits at +3.5, Black's back rank sits at -3.5)
 * Y = 0 is the playing surface on top of the 64 tiles.
 */
export function squareToWorld(square: string): [number, number, number] {
  const { fileIdx, rankIdx } = squareToIndices(square);
  const x = (fileIdx - 3.5) * SQUARE_SIZE;
  const z = (3.5 - rankIdx) * SQUARE_SIZE;
  return [x, 0, z];
}

export function indicesToSquare(fileIdx: number, rankIdx: number): Square {
  return `${FILES[fileIdx]}${RANKS[rankIdx]}` as Square;
}

export function isLightSquare(fileIdx: number, rankIdx: number): boolean {
  // a1 (0, 0) is dark, h1 (7, 0) is light
  return (fileIdx + rankIdx) % 2 === 1;
}
