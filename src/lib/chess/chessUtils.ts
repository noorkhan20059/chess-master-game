import { Chess, Move, PieceSymbol, Square } from 'chess.js';
import { GameResultInfo, PlayerColor } from '../../types/chess';

export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
};

export function getHalfMoveClock(fen: string): number {
  const parts = fen.split(' ');
  const clock = Number(parts[4]);
  return Number.isFinite(clock) ? clock : 0;
}

export function isSeventyFiveMoveRule(chess: Chess): boolean {
  return getHalfMoveClock(chess.fen()) >= 150 && !chess.isCheckmate();
}

export function evaluateGameStatus(chess: Chess): GameResultInfo | null {
  if (chess.isCheckmate()) {
    const winner: PlayerColor = chess.turn() === 'w' ? 'b' : 'w';
    return {
      winner,
      reason: `Checkmate — ${winner === 'w' ? 'White' : 'Black'} wins`,
    };
  }
  if (chess.isStalemate()) {
    return { winner: 'draw', reason: 'Draw by Stalemate' };
  }
  if (chess.isThreefoldRepetition()) {
    return { winner: 'draw', reason: 'Draw by Threefold Repetition' };
  }
  if (chess.isInsufficientMaterial()) {
    return { winner: 'draw', reason: 'Draw by Insufficient Material' };
  }
  if (isSeventyFiveMoveRule(chess)) {
    return { winner: 'draw', reason: 'Draw by 75-Move Rule' };
  }
  if (chess.isDrawByFiftyMoves()) {
    return { winner: 'draw', reason: 'Draw by 50-Move Rule' };
  }
  if (chess.isDraw()) {
    return { winner: 'draw', reason: 'Draw' };
  }
  return null;
}

export function findCheckedKingSquare(chess: Chess): Square | null {
  if (!chess.inCheck()) return null;
  const turn = chess.turn();
  const squares = chess.findPiece({ type: 'k', color: turn });
  return squares[0] ?? null;
}

export interface CapturedPiecesSummary {
  capturedByWhite: PieceSymbol[];
  capturedByBlack: PieceSymbol[];
  whiteAdvantage: number;
}

const STARTING_COUNTS: Record<PieceSymbol, number> = {
  q: 1,
  r: 2,
  b: 2,
  n: 2,
  p: 8,
  k: 1,
};

export function getCapturedPieces(chess: Chess): CapturedPiecesSummary {
  const board = chess.board();
  const currentWhite: Record<PieceSymbol, number> = { q: 0, r: 0, b: 0, n: 0, p: 0, k: 0 };
  const currentBlack: Record<PieceSymbol, number> = { q: 0, r: 0, b: 0, n: 0, p: 0, k: 0 };

  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      if (cell.color === 'w') currentWhite[cell.type] += 1;
      else currentBlack[cell.type] += 1;
    }
  }

  const order: PieceSymbol[] = ['q', 'r', 'b', 'n', 'p'];
  const capturedByWhite: PieceSymbol[] = [];
  const capturedByBlack: PieceSymbol[] = [];
  let whiteMaterial = 0;
  let blackMaterial = 0;

  for (const type of order) {
    whiteMaterial += currentWhite[type] * PIECE_VALUES[type];
    blackMaterial += currentBlack[type] * PIECE_VALUES[type];

    const missingBlack = Math.max(0, STARTING_COUNTS[type] - currentBlack[type]);
    for (let i = 0; i < missingBlack; i++) capturedByWhite.push(type);

    const missingWhite = Math.max(0, STARTING_COUNTS[type] - currentWhite[type]);
    for (let i = 0; i < missingWhite; i++) capturedByBlack.push(type);
  }

  return {
    capturedByWhite,
    capturedByBlack,
    whiteAdvantage: whiteMaterial - blackMaterial,
  };
}

export function uciToMoveObj(uci: string): { from: Square; to: Square; promotion?: PieceSymbol } | null {
  if (!uci || uci.length < 4) return null;
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promoChar = uci.length >= 5 ? (uci[4].toLowerCase() as PieceSymbol) : undefined;
  return promoChar ? { from, to, promotion: promoChar } : { from, to };
}

export function uciToSan(fen: string, uci: string): string {
  const moveObj = uciToMoveObj(uci);
  if (!moveObj) return uci;
  try {
    const temp = new Chess(fen);
    const result = temp.move(moveObj);
    return result ? result.san : uci;
  } catch {
    return uci;
  }
}

export function pvToSanLine(fen: string, pvUci: string[], limit = 5): string[] {
  const sans: string[] = [];
  try {
    const temp = new Chess(fen);
    for (const uci of pvUci.slice(0, limit)) {
      const moveObj = uciToMoveObj(uci);
      if (!moveObj) break;
      const move = temp.move(moveObj);
      if (!move) break;
      sans.push(move.san);
    }
  } catch {
    // ignore invalid continuation
  }
  return sans;
}

export function parsePgnSafe(pgnText: string): { ok: true; chess: Chess; moves: Move[] } | { ok: false; error: string } {
  const trimmed = pgnText.trim();
  if (!trimmed) {
    return { ok: false, error: 'Please paste a valid PGN before importing.' };
  }
  try {
    const chess = new Chess();
    chess.loadPgn(trimmed);
    const moves = chess.history({ verbose: true });
    if (moves.length === 0) {
      return { ok: false, error: 'The PGN did not contain any valid chess moves.' };
    }
    return { ok: true, chess, moves };
  } catch {
    return { ok: false, error: 'Could not parse PGN. Check move notation and headers.' };
  }
}

export function formatClockMs(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalTenths = Math.floor(clamped / 100);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (clamped < 20000) {
    const tenths = totalTenths % 10;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function isPromotionMove(chess: Chess, from: Square, to: Square): boolean {
  const piece = chess.get(from);
  if (!piece || piece.type !== 'p') return false;
  const targetRank = to[1];
  if (piece.color === 'w' && targetRank === '8') {
    return chess.moves({ square: from, verbose: true }).some((m) => m.to === to && Boolean(m.promotion));
  }
  if (piece.color === 'b' && targetRank === '1') {
    return chess.moves({ square: from, verbose: true }).some((m) => m.to === to && Boolean(m.promotion));
  }
  return false;
}
