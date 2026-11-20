import { Chess } from 'chess.js';
import {
  AnalyzedMove,
  EngineEvaluation,
  GameAnalysisReport,
  HintInsight,
  MoveClassification,
} from '../../types/chess';
import { PIECE_NAMES, PIECE_VALUES, pvToSanLine, uciToMoveObj, uciToSan } from '../chess/chessUtils';
import { StockfishEngineService } from '../stockfish/stockfishWorker';

export function formatEvalLabel(cp: number, mate?: number): string {
  if (mate !== undefined) {
    if (mate === 0) return 'Mate';
    return mate > 0 ? `+M${mate}` : `-M${Math.abs(mate)}`;
  }
  const pawns = cp / 100;
  const sign = pawns > 0.05 ? '+' : '';
  return `${sign}${pawns.toFixed(2)}`;
}

export function cpToWhiteWinPercent(cp: number): number {
  const clamped = Math.max(-2000, Math.min(2000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

export function getEvalBarPercent(cp: number, mate?: number): number {
  if (mate !== undefined) {
    return mate >= 0 ? 96 : 4;
  }
  return Math.max(4, Math.min(96, cpToWhiteWinPercent(cp)));
}

function describeMoveReason(fen: string, uci: string, evalResult: EngineEvaluation): {
  reason: string;
  tacticalAlert?: string;
  checkmateThreat?: string;
} {
  const moveObj = uciToMoveObj(uci);
  if (!moveObj) {
    return { reason: 'Maintains solid piece coordination and king safety.' };
  }

  const chess = new Chess(fen);
  let move;
  try {
    move = chess.move(moveObj);
  } catch {
    return { reason: 'Improves piece activity and positional balance.' };
  }

  const reasons: string[] = [];
  let tacticalAlert: string | undefined;
  let checkmateThreat: string | undefined;

  if (evalResult.mate !== undefined && evalResult.mate !== 0) {
    const mateIn = Math.abs(evalResult.mate);
    checkmateThreat = `Forced checkmate in ${mateIn} move${mateIn === 1 ? '' : 's'} available.`;
    reasons.push(`Creates a forcing mating sequence in ${mateIn}`);
  } else if (chess.isCheckmate()) {
    checkmateThreat = 'Immediate checkmate on the board.';
    reasons.push('Delivers immediate checkmate');
  } else if (chess.inCheck()) {
    reasons.push('Delivers check, forcing the opponent king to respond');
    tacticalAlert = 'Check forces an immediate defensive reply.';
  }

  if (move.isKingsideCastle() || move.isQueensideCastle()) {
    reasons.push('Tucks the king into safety and activates the rook');
  }
  if (move.isPromotion() && move.promotion) {
    reasons.push(`Promotes the pawn to a ${PIECE_NAMES[move.promotion]} for decisive material gain`);
    tacticalAlert = tacticalAlert ?? 'Pawn promotion dramatically shifts the material balance.';
  }
  if (move.captured) {
    const capturedVal = PIECE_VALUES[move.captured];
    const movingVal = PIECE_VALUES[move.piece];
    if (capturedVal > movingVal) {
      reasons.push(`Wins material by capturing a higher-value ${PIECE_NAMES[move.captured].toLowerCase()}`);
      tacticalAlert = tacticalAlert ?? `Favorable capture (+${capturedVal - movingVal} material trade).`;
    } else {
      reasons.push(`Captures the ${PIECE_NAMES[move.captured].toLowerCase()} on ${move.to}`);
    }
  }

  // Detect fork / multi-target attack after the move
  const attackedTargets: string[] = [];
  const board = chess.board();
  const opponent = chess.turn();
  for (const row of board) {
    for (const sq of row) {
      if (!sq || sq.color !== opponent) continue;
      if (sq.type === 'k' || sq.type === 'q' || sq.type === 'r') {
        const attackers = chess.attackers(sq.square, move.color);
        if (attackers.includes(move.to)) {
          attackedTargets.push(PIECE_NAMES[sq.type]);
        }
      }
    }
  }
  if (attackedTargets.length >= 2) {
    const targets = attackedTargets.slice(0, 2).join(' and ');
    tacticalAlert = tacticalAlert ?? `Double attack / fork targeting ${targets}.`;
    reasons.push(`Simultaneously attacks the enemy ${targets}`);
  }

  // Center control
  if (['d4', 'e4', 'd5', 'e5', 'c4', 'f4', 'c5', 'f5'].includes(move.to) && reasons.length === 0) {
    reasons.push(`Strengthens central control over ${move.to}`);
  }

  // Piece development
  if (['n', 'b'].includes(move.piece) && ['1', '8'].includes(move.from[1]) && reasons.length === 0) {
    reasons.push(`Develops the ${PIECE_NAMES[move.piece].toLowerCase()} onto an active square (${move.to})`);
  }

  if (reasons.length === 0) {
    reasons.push(`Positions the ${PIECE_NAMES[move.piece].toLowerCase()} on ${move.to} to maximize piece activity`);
  }

  return {
    reason: `${reasons[0]}.`,
    tacticalAlert,
    checkmateThreat,
  };
}

export function buildHintInsight(fen: string, evaluation: EngineEvaluation): HintInsight {
  const bestMoveSan = uciToSan(fen, evaluation.bestMoveUci);
  const altMoveSan = evaluation.altMoveUci ? uciToSan(fen, evaluation.altMoveUci) : undefined;
  const pvLineSan = pvToSanLine(fen, evaluation.pv, 5);
  const { reason, tacticalAlert, checkmateThreat } = describeMoveReason(
    fen,
    evaluation.bestMoveUci,
    evaluation
  );

  // Also check if opponent currently has a mate threat if the player passes or blunders
  let finalThreat = checkmateThreat;
  if (!finalThreat && evaluation.mate !== undefined) {
    const turn = new Chess(fen).turn();
    const opponentMate = (turn === 'w' && evaluation.mate < 0) || (turn === 'b' && evaluation.mate > 0);
    if (opponentMate) {
      finalThreat = `Warning: Opponent threatens mate in ${Math.abs(evaluation.mate)}. Defend immediately.`;
    }
  }

  return {
    bestMoveUci: evaluation.bestMoveUci,
    bestMoveSan,
    altMoveUci: evaluation.altMoveUci,
    altMoveSan,
    evalText: formatEvalLabel(evaluation.cp, evaluation.mate),
    reason,
    tacticalAlert,
    checkmateThreat: finalThreat,
    pvLineSan,
  };
}

export function classifyMove(
  color: 'w' | 'b',
  evalBeforeCp: number,
  evalAfterCp: number,
  playedUci: string,
  bestMoveUci: string,
  mateBefore?: number,
  mateAfter?: number
): { classification: MoveClassification; cpLoss: number } {
  const beforeWin = cpToWhiteWinPercent(evalBeforeCp);
  const afterWin = cpToWhiteWinPercent(evalAfterCp);

  const winLoss = color === 'w' ? Math.max(0, beforeWin - afterWin) : Math.max(0, afterWin - beforeWin);
  const cpLoss = Math.max(
    0,
    color === 'w' ? evalBeforeCp - evalAfterCp : evalAfterCp - evalBeforeCp
  );

  // Missed mate / decisive winning opportunity
  const hadMate =
    mateBefore !== undefined &&
    ((color === 'w' && mateBefore > 0) || (color === 'b' && mateBefore < 0));
  const keptMate =
    mateAfter !== undefined &&
    ((color === 'w' && mateAfter > 0) || (color === 'b' && mateAfter < 0));

  if (playedUci === bestMoveUci) {
    return { classification: 'best', cpLoss: 0 };
  }
  if (hadMate && !keptMate && winLoss >= 8) {
    return { classification: 'missed_win', cpLoss };
  }
  if (winLoss <= 1.8 && cpLoss <= 25) {
    return { classification: 'best', cpLoss };
  }
  if (winLoss <= 5 && cpLoss <= 65) {
    return { classification: 'good', cpLoss };
  }
  if (winLoss <= 11 && cpLoss <= 140) {
    return { classification: 'inaccuracy', cpLoss };
  }
  if (winLoss <= 22 && cpLoss <= 300) {
    return { classification: 'mistake', cpLoss };
  }
  return { classification: 'blunder', cpLoss };
}

function emptyClassificationCounts(): Record<MoveClassification, number> {
  return {
    best: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
    missed_win: 0,
  };
}

function computeAccuracyFromMoves(moves: AnalyzedMove[]): number {
  if (moves.length === 0) return 100;
  const scores = moves.map((m) => {
    const beforeWin = cpToWhiteWinPercent(m.evalBeforeCp);
    const afterWin = cpToWhiteWinPercent(m.evalAfterCp);
    const loss = m.color === 'w' ? Math.max(0, beforeWin - afterWin) : Math.max(0, afterWin - beforeWin);
    const acc = 103.1668 * Math.exp(-0.04354 * loss) - 3.1669;
    return Math.max(0, Math.min(100, acc));
  });
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

function countNonKingPieces(fen: string): number {
  const boardPart = fen.split(' ')[0];
  return boardPart.replace(/[^pnbrqPNBRQ]/g, '').length;
}

export async function analyzeGameWithStockfish(
  engine: StockfishEngineService,
  pgn: string,
  startingFen?: string,
  onProgress?: (completedPlies: number, totalPlies: number) => void,
  isCancelled?: () => boolean
): Promise<GameAnalysisReport> {
  const fullGame = new Chess(startingFen || undefined);
  fullGame.loadPgn(pgn);
  const history = fullGame.history({ verbose: true });

  const replay = new Chess(startingFen || undefined);
  const analyzedMoves: AnalyzedMove[] = [];

  // Cache evaluation of each FEN so we only evaluate N+1 positions instead of 2N
  let prevEval = await engine.evaluatePosition(replay.fen(), { depth: 9, moveTimeMs: 220 });

  for (let i = 0; i < history.length; i++) {
    if (isCancelled?.()) {
      throw new Error('Analysis cancelled.');
    }

    const move = history[i];
    const fenBefore = replay.fen();
    const uci = `${move.from}${move.to}${move.promotion ?? ''}`;
    const bestMoveUci = prevEval.bestMoveUci || uci;
    const bestMoveSan = uciToSan(fenBefore, bestMoveUci);

    replay.move(move.san);
    const fenAfter = replay.fen();

    const nextEval = await engine.evaluatePosition(fenAfter, { depth: 9, moveTimeMs: 220 });

    const { classification, cpLoss } = classifyMove(
      move.color,
      prevEval.cp,
      nextEval.cp,
      uci,
      bestMoveUci,
      prevEval.mate,
      nextEval.mate
    );

    let comment = '';
    if (classification === 'best') {
      comment = 'Engine top choice — maintains maximum pressure.';
    } else if (classification === 'good') {
      comment = `Solid continuation. Best engine line was ${bestMoveSan}.`;
    } else if (classification === 'inaccuracy') {
      comment = `Slight inaccuracy (−${(cpLoss / 100).toFixed(2)}). ${bestMoveSan} kept tighter control.`;
    } else if (classification === 'mistake') {
      comment = `Mistake (−${(cpLoss / 100).toFixed(2)}). Prefer ${bestMoveSan} to retain balance.`;
    } else if (classification === 'missed_win') {
      comment = `Missed winning continuation! ${bestMoveSan} forced a decisive advantage.`;
    } else {
      comment = `Blunder (−${(cpLoss / 100).toFixed(2)}). ${bestMoveSan} was essential here.`;
    }

    analyzedMoves.push({
      ply: i + 1,
      moveNumber: Math.floor(i / 2) + 1,
      color: move.color,
      san: move.san,
      uci,
      fenBefore,
      fenAfter,
      evalBeforeCp: prevEval.cp,
      evalAfterCp: nextEval.cp,
      mateBefore: prevEval.mate,
      mateAfter: nextEval.mate,
      bestMoveUci,
      bestMoveSan,
      classification,
      cpLoss,
      comment,
    });

    prevEval = nextEval;
    onProgress?.(i + 1, history.length);
  }

  const counts = emptyClassificationCounts();
  const whiteCounts = emptyClassificationCounts();
  const blackCounts = emptyClassificationCounts();

  for (const m of analyzedMoves) {
    counts[m.classification] += 1;
    if (m.color === 'w') whiteCounts[m.classification] += 1;
    else blackCounts[m.classification] += 1;
  }

  const whiteMoves = analyzedMoves.filter((m) => m.color === 'w');
  const blackMoves = analyzedMoves.filter((m) => m.color === 'b');
  const openingMoves = analyzedMoves.slice(0, 12);
  const endgameMoves = analyzedMoves.filter((m) => countNonKingPieces(m.fenBefore) <= 12);

  const whiteAccuracy = computeAccuracyFromMoves(whiteMoves);
  const blackAccuracy = computeAccuracyFromMoves(blackMoves);
  const openingAccuracy = computeAccuracyFromMoves(openingMoves);
  const endgameAccuracy = endgameMoves.length > 0 ? computeAccuracyFromMoves(endgameMoves) : whiteAccuracy;

  const blunders = counts.blunder;
  const mistakes = counts.mistake;
  const summary =
    blunders === 0 && mistakes === 0
      ? `Clean, disciplined game with ${whiteAccuracy}% White and ${blackAccuracy}% Black accuracy.`
      : `Evaluated ${analyzedMoves.length} half-moves: ${counts.best} best moves, ${mistakes} mistake${mistakes === 1 ? '' : 's'}, and ${blunders} blunder${blunders === 1 ? '' : 's'}.`;

  return {
    whiteAccuracy,
    blackAccuracy,
    openingAccuracy,
    endgameAccuracy,
    counts,
    whiteCounts,
    blackCounts,
    moves: analyzedMoves,
    summary,
  };
}
