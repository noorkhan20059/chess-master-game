export type PuzzleDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type PuzzleTheme =
  | 'Checkmate in 1'
  | 'Checkmate in 2'
  | 'Fork'
  | 'Pin'
  | 'Skewer'
  | 'Discovered Attack'
  | 'Tactical Combination';

export interface ChessPuzzle {
  id: string;
  title: string;
  difficulty: PuzzleDifficulty;
  theme: PuzzleTheme;
  rating: number;
  fen: string;
  /** Sequence of alternating player/opponent SAN moves starting with side to move */
  solutionSan: string[];
  hintText: string;
  explanation: string;
}

export const CHESS_PUZZLES: ChessPuzzle[] = [
  {
    id: 'pz-mate1-backrank',
    title: 'Back-Rank Execution',
    difficulty: 'Beginner',
    theme: 'Checkmate in 1',
    rating: 760,
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    solutionSan: ['Rd8#'],
    hintText: 'Black’s king is trapped behind its own f7, g7, and h7 pawns.',
    explanation: 'Rd8# delivers an immediate back-rank checkmate with zero escape squares.',
  },
  {
    id: 'pz-mate1-arabian',
    title: 'Arabian Corner Mate',
    difficulty: 'Beginner',
    theme: 'Checkmate in 1',
    rating: 820,
    fen: '7k/6pp/5N2/8/8/8/8/4R1K1 w - - 0 1',
    solutionSan: ['Re8#'],
    hintText: 'Your knight on f6 already covers the g8 escape square.',
    explanation: 'Re8# seals the eighth rank while the f6 knight guards the rook and blocks g8.',
  },
  {
    id: 'pz-mate1-scholar',
    title: 'Royal Battery Finish',
    difficulty: 'Beginner',
    theme: 'Checkmate in 1',
    rating: 850,
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    solutionSan: ['Qxf7#'],
    hintText: 'Both your queen and light-squared bishop converge on f7.',
    explanation: 'Qxf7# delivers mate supported by the bishop on c4.',
  },
  {
    id: 'pz-fork-knight',
    title: 'Royal Knight Fork',
    difficulty: 'Beginner',
    theme: 'Fork',
    rating: 920,
    fen: '3k1q2/8/8/8/3N4/8/8/4K3 w - - 0 1',
    solutionSan: ['Ne6+', 'Ke8', 'Nxf8'],
    hintText: 'Leap your knight to a square that checks the king and attacks the queen.',
    explanation: 'Ne6+ forks Black’s king on d8 and queen on f8, winning the queen next move.',
  },
  {
    id: 'pz-fork-pawn',
    title: 'Central Pawn Fork',
    difficulty: 'Beginner',
    theme: 'Fork',
    rating: 950,
    fen: '4k3/8/2n1b3/8/3P4/8/8/4K3 w - - 0 1',
    solutionSan: ['d5'],
    hintText: 'Advance your central pawn to attack two minor pieces simultaneously.',
    explanation: 'd5 forks both the knight on c6 and the bishop on e6, guaranteeing a piece win.',
  },
  {
    id: 'pz-pin-queen',
    title: 'Diagonal Queen Pin',
    difficulty: 'Beginner',
    theme: 'Pin',
    rating: 990,
    fen: '6k1/5qpp/8/8/8/8/P7/3BK1R1 w - - 0 1',
    solutionSan: ['Bb3', 'Kh8', 'Bxf7'],
    hintText: 'Align your bishop along the a2-g8 diagonal to pin the queen to the king.',
    explanation: 'Bb3 pins Black’s queen to the king on g8, supported by the a2 pawn.',
  },
  {
    id: 'pz-mate2-deflection',
    title: 'Queen Sacrifice Deflection',
    difficulty: 'Intermediate',
    theme: 'Checkmate in 2',
    rating: 1280,
    fen: '5rk1/2N2ppp/8/2Q5/8/8/5PPP/4R1K1 w - - 0 1',
    solutionSan: ['Qxf8+', 'Kxf8', 'Re8#'],
    hintText: 'Eliminate the rook guarding e8 with a forcing check.',
    explanation: 'Qxf8+ forces Kxf8, allowing Re8# protected by the knight on c7.',
  },
  {
    id: 'pz-mate2-smothered',
    title: 'Philidor’s Smothered Finish',
    difficulty: 'Intermediate',
    theme: 'Checkmate in 2',
    rating: 1380,
    fen: '5r1k/6pp/7N/8/8/8/Q7/6K1 w - - 0 1',
    solutionSan: ['Qg8+', 'Rxg8', 'Nf7#'],
    hintText: 'Force the black rook onto g8 so the cornered king has no escape.',
    explanation: 'Qg8+ forces Rxg8, sealing the king inside its own pieces for Nf7#.',
  },
  {
    id: 'pz-skewer-rook',
    title: 'Seventh-Rank Rook Skewer',
    difficulty: 'Intermediate',
    theme: 'Skewer',
    rating: 1240,
    fen: '8/4k2q/8/8/8/8/R7/4K3 w - - 0 1',
    solutionSan: ['Ra7+', 'Kf6', 'Rxh7'],
    hintText: 'Check the black king along the seventh rank behind its queen.',
    explanation: 'Ra7+ forces the king to abandon the queen on h7, allowing Rxh7.',
  },
  {
    id: 'pz-skewer-bishop',
    title: 'Diagonal Skewer Strike',
    difficulty: 'Intermediate',
    theme: 'Skewer',
    rating: 1310,
    fen: '8/7q/8/5k2/8/8/4B3/4K3 w - - 0 1',
    solutionSan: ['Bd3+', 'Kg5', 'Bxh7'],
    hintText: 'Place your bishop on the d3-h7 diagonal with check.',
    explanation: 'Bd3+ checks the king and skewers the undefended queen behind it on h7.',
  },
  {
    id: 'pz-discovered-mill',
    title: 'Windmill Discovered Check',
    difficulty: 'Intermediate',
    theme: 'Discovered Attack',
    rating: 1360,
    fen: '7k/2q2pR1/8/8/8/8/1B6/6K1 w - - 0 1',
    solutionSan: ['Rxf7+', 'Kg8', 'Rxc7'],
    hintText: 'Move your rook off the b2-h8 diagonal with check while eyeing the queen.',
    explanation: 'Rxf7+ unleashes a discovered check from the b2 bishop and wins the queen on c7.',
  },
  {
    id: 'pz-mate2-opera',
    title: 'Morphy’s Opera Mate',
    difficulty: 'Advanced',
    theme: 'Checkmate in 2',
    rating: 1620,
    fen: '4kb1r/3n1ppp/2p1p3/6B1/8/1Q6/PPP2PPP/2KR4 w - - 0 1',
    solutionSan: ['Qb8+', 'Nxb8', 'Rd8#'],
    hintText: 'Sacrifice the queen on b8 to lure the knight away from defending d8.',
    explanation: 'Qb8+ forces Nxb8, allowing Rd8# protected by the bishop on g5.',
  },
  {
    id: 'pz-mate2-anastasia',
    title: 'Anastasia’s Mate',
    difficulty: 'Advanced',
    theme: 'Checkmate in 2',
    rating: 1690,
    fen: '6rk/4N1pp/8/7Q/8/8/5K2/R7 w - - 0 1',
    solutionSan: ['Qxh7+', 'Kxh7', 'Rh1#'],
    hintText: 'Your knight on e7 already seals g8 and g6. Drag the king onto the h-file.',
    explanation: 'Qxh7+ forces Kxh7, clearing the way for Rh1# along the open h-file.',
  },
  {
    id: 'pz-discovered-queen-win',
    title: 'Discovered Battery Capture',
    difficulty: 'Advanced',
    theme: 'Discovered Attack',
    rating: 1580,
    fen: '7k/3q1ppp/8/8/3B4/8/5PPP/3R2K1 w - - 0 1',
    solutionSan: ['Bxg7+', 'Kxg7', 'Rxd7'],
    hintText: 'Clear the d-file with check so Black has no time to save the queen.',
    explanation: 'Bxg7+ delivers check while unmasking the d1 rook onto Black’s queen on d7.',
  },
  {
    id: 'pz-combo-underpromotion',
    title: 'Knight Underpromotion Fork',
    difficulty: 'Advanced',
    theme: 'Tactical Combination',
    rating: 1780,
    fen: '8/r3P1k1/5q2/8/8/8/6PP/7K w - - 0 1',
    solutionSan: ['e8=N+', 'Kf7', 'Nxf6'],
    hintText: 'Promoting to a queen allows Qf1#. Choose a promotion that delivers check and forks.',
    explanation: 'e8=N+ avoids Qf1# by checking the king and forking the queen on f6.',
  },
];

export function getDailyPuzzle(): ChessPuzzle {
  const now = new Date();
  const daySeed = now.getFullYear() * 366 + now.getMonth() * 31 + now.getDate();
  return CHESS_PUZZLES[daySeed % CHESS_PUZZLES.length];
}
