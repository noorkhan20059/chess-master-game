export interface OpeningMoveNote {
  san: string;
  explanation: string;
}

export interface OpeningVariation {
  name: string;
  moves: string[];
  summary: string;
}

export interface ChessOpening {
  id: string;
  name: string;
  eco: string;
  side: 'White' | 'Black';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  summary: string;
  moves: OpeningMoveNote[];
  strategicIdeas: string[];
  commonMistakes: string[];
  variations: OpeningVariation[];
}

export const CHESS_OPENINGS: ChessOpening[] = [
  {
    id: 'italian-game',
    name: 'Italian Game',
    eco: 'C50',
    side: 'White',
    difficulty: 'Beginner',
    summary:
      'One of chess’s oldest and clearest classical openings, targeting the vulnerable f7 square while securing rapid central development.',
    moves: [
      { san: 'e4', explanation: 'Claims central space and opens diagonals for the queen and light-squared bishop.' },
      { san: 'e5', explanation: 'Black mirrors the central advance to contest d4 and f4.' },
      { san: 'Nf3', explanation: 'Develops a knight with tempo by attacking the undefended e5 pawn.' },
      { san: 'Nc6', explanation: 'Defends e5 solidly while developing toward the center.' },
      { san: 'Bc4', explanation: 'Points the bishop directly at f7, Black’s weakest early square, and prepares castling.' },
      { san: 'Bc5', explanation: 'Black mirrors bishop development in the classical Giuoco Piano setup.' },
      { san: 'c3', explanation: 'Prepares a strong d4 central pawn push with tempo against Black’s bishop.' },
      { san: 'Nf6', explanation: 'Counterattacks the e4 pawn while preparing kingside castling.' },
    ],
    strategicIdeas: [
      'Build a full pawn center with c3 and d4.',
      'Castle early and maneuver the b1 knight via d2-f1-g3 toward the kingside.',
      'Keep tactical watch on sacrifices on f7 if Black delays castling.',
    ],
    commonMistakes: [
      'Pushing d4 prematurely without c3 support, allowing exd4 and losing central tension.',
      'Leaving the e4 pawn undefended after Nf6 without calculating the Ng4 counterattack.',
    ],
    variations: [
      {
        name: 'Giuoco Piano (Quiet Game)',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6'],
        summary: 'Slow positional maneuvering focusing on piece harmony and gradual kingside expansion.',
      },
      {
        name: 'Evans Gambit',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5'],
        summary: 'White sacrifices a wing pawn for rapid central occupation and open attacking lines.',
      },
    ],
  },
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez',
    eco: 'C60',
    side: 'White',
    difficulty: 'Intermediate',
    summary:
      'The Spanish Torture applies long-term strategic pressure on Black’s e5 outpost by pinning or harassing its defender on c6.',
    moves: [
      { san: 'e4', explanation: 'Occupies the center and opens lines for development.' },
      { san: 'e5', explanation: 'Establishes an equal central foothold.' },
      { san: 'Nf3', explanation: 'Attacks e5 and prepares kingside castling.' },
      { san: 'Nc6', explanation: 'Develops naturally while protecting the e5 pawn.' },
      { san: 'Bb5', explanation: 'Applies indirect pressure on e5 by threatening the c6 defender.' },
      { san: 'a6', explanation: 'Morphy Defense forces the bishop to declare its intentions immediately.' },
      { san: 'Ba4', explanation: 'Preserves the bishop on the active a4-e8 diagonal.' },
      { san: 'Nf6', explanation: 'Develops actively and attacks White’s e4 pawn.' },
      { san: 'O-O', explanation: 'Tucks the king safely away and leaves e4 tactically defended via Re1.' },
    ],
    strategicIdeas: [
      'Maintain long-term tension in the center before striking with c3 and d4.',
      'Preserve the light-squared Spanish bishop via Bb3 and Bc2.',
      'Exploit queenside space once Black commits with b5.',
    ],
    commonMistakes: [
      'Capturing Bxc6 early without compensation after dxc6, gifting Black the bishop pair.',
      'Neglecting the e4 pawn after Black plays b5 and Bb7.',
    ],
    variations: [
      {
        name: 'Closed Ruy Lopez',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6'],
        summary: 'Deep grandmaster battleground rich in maneuvering and pawn breaks.',
      },
      {
        name: 'Berlin Defense',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4'],
        summary: 'Ultra-solid counterattack favored by world champions to neutralize White’s initiative.',
      },
    ],
  },
  {
    id: 'sicilian-defense',
    name: 'Sicilian Defense',
    eco: 'B20',
    side: 'Black',
    difficulty: 'Intermediate',
    summary:
      'Black’s sharpest and highest-scoring asymmetrical response to 1. e4, fighting for the d4 square and creating dynamic counterplay.',
    moves: [
      { san: 'e4', explanation: 'White claims the center.' },
      { san: 'c5', explanation: 'Asymmetrically contests d4 from the flank and opens the c-file.' },
      { san: 'Nf3', explanation: 'Prepares the central d4 pawn break.' },
      { san: 'd6', explanation: 'Controls e5 and opens the c8 bishop diagonal.' },
      { san: 'd4', explanation: 'Opens the center to gain space and piece activity.' },
      { san: 'cxd4', explanation: 'Trades a flank pawn for White’s central d-pawn, giving Black a 2-vs-1 central majority.' },
      { san: 'Nxd4', explanation: 'Centralizes the knight on an open square.' },
      { san: 'Nf6', explanation: 'Develops with tempo against e4.' },
      { san: 'Nc3', explanation: 'Defends e4 and reinforces d5.' },
      { san: 'a6', explanation: 'The Najdorf move: prevents Bb5 checks and prepares queenside expansion with b5.' },
    ],
    strategicIdeas: [
      'Use the half-open c-file with Rc8 and queenside minority advances (b5-b4).',
      'Trade down to favorable endgames where Black’s central pawn majority shines.',
      'Time the liberating ...d5 or ...e5 central break carefully.',
    ],
    commonMistakes: [
      'Allowing White’s pieces to settle permanently on d5 without challenge.',
      'Falling behind in development while grabbing risky queenside pawns.',
    ],
    variations: [
      {
        name: 'Najdorf Variation',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
        summary: 'Dynamic, aggressive counterattacking system with rich tactical imbalances.',
      },
      {
        name: 'Dragon Variation',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'],
        summary: 'Fianchettoes the dark-squared bishop onto the powerful h8-a1 diagonal.',
      },
    ],
  },
  {
    id: 'french-defense',
    name: 'French Defense',
    eco: 'C00',
    side: 'Black',
    difficulty: 'Intermediate',
    summary:
      'A resilient counterattacking structure where Black fortifies d5 first, then undermines White’s center with ...c5 and ...f6.',
    moves: [
      { san: 'e4', explanation: 'White stakes a claim in the center.' },
      { san: 'e6', explanation: 'Prepares ...d5 with solid pawn support.' },
      { san: 'd4', explanation: 'White builds the ideal two-pawn central duo.' },
      { san: 'd5', explanation: 'Immediately challenges the e4 pawn.' },
      { san: 'Nc3', explanation: 'Protects e4 while developing naturally.' },
      { san: 'Bb4', explanation: 'Winawer Variation pins the knight, indirectly renewing pressure on e4.' },
      { san: 'e5', explanation: 'Gains kingside space and fixes the central pawn chain.' },
      { san: 'c5', explanation: 'Strikes at the base of White’s pawn chain on d4.' },
    ],
    strategicIdeas: [
      'Attack the base of White’s pawn chain (d4) with ...c5, ...Nc6, and ...Qb6.',
      'Solve the c8 light-squared bishop problem via ...b6 and ...Ba6 or ...Bd7.',
      'Counter-strike on the kingside with ...f6 if White locks the center.',
    ],
    commonMistakes: [
      'Trading away dark-squared defenders too lightly and leaving the king exposed on g8.',
      'Forgetting to challenge d4, allowing White a permanent space bind.',
    ],
    variations: [
      {
        name: 'Winawer Variation',
        moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5'],
        summary: 'Sharp structural battle pitting White’s dark-square control against Black’s queenside pressure.',
      },
      {
        name: 'Advance Variation',
        moves: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3'],
        summary: 'Clear strategic contest over the d4 stronghold.',
      },
    ],
  },
  {
    id: 'caro-kann-defense',
    name: 'Caro-Kann Defense',
    eco: 'B10',
    side: 'Black',
    difficulty: 'Beginner',
    summary:
      'Renowned for rock-solid pawn structure, keeping the light-squared bishop free before contesting the center on d5.',
    moves: [
      { san: 'e4', explanation: 'White opens centrally.' },
      { san: 'c6', explanation: 'Prepares ...d5 without blocking the c8 light-squared bishop.' },
      { san: 'd4', explanation: 'Occupies the central d4 square.' },
      { san: 'd5', explanation: 'Challenges e4 directly.' },
      { san: 'Nc3', explanation: 'Defends e4 and develops.' },
      { san: 'dxe4', explanation: 'Clarifies central tension.' },
      { san: 'Nxe4', explanation: 'Centralizes the knight.' },
      { san: 'Bf5', explanation: 'Activates the light-squared bishop outside the pawn chain before playing ...e6.' },
    ],
    strategicIdeas: [
      'Maintain a healthy endgame-ready pawn structure with zero weak pawns.',
      'Develop the c8 bishop to f5 or g4 before closing the diagonal with ...e6.',
      'Undermine White’s space with timely ...c5 breaks.',
    ],
    commonMistakes: [
      'Playing ...e6 before developing the c8 bishop, trapping it behind pawns.',
      'Allowing Nxf6+ to fracture kingside pawns unnecessarily when ...Nd7 is cleaner.',
    ],
    variations: [
      {
        name: 'Classical Main Line',
        moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6'],
        summary: 'Principled classical play where Black achieves smooth development.',
      },
      {
        name: 'Advance Variation',
        moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6'],
        summary: 'Leads to rich positional battles around the c5 break and kingside space.',
      },
    ],
  },
  {
    id: 'queens-gambit',
    name: "Queen's Gambit",
    eco: 'D06',
    side: 'White',
    difficulty: 'Beginner',
    summary:
      'White offers the c-pawn on move two to deflect Black’s central d5 pawn and establish commanding central control.',
    moves: [
      { san: 'd4', explanation: 'Establishes a protected central foothold and opens lines for the c1 bishop.' },
      { san: 'd5', explanation: 'Prevents White from effortlessly playing e4.' },
      { san: 'c4', explanation: 'Challenges Black’s central d5 pawn from the flank.' },
      { san: 'e6', explanation: 'Queen’s Gambit Declined: reinforces d5 solidly.' },
      { san: 'Nc3', explanation: 'Adds pressure on d5 and prepares central expansion.' },
      { san: 'Nf6', explanation: 'Develops toward the center and defends d5.' },
      { san: 'Bg5', explanation: 'Pins the f6 knight to the queen, increasing pressure on d5.' },
    ],
    strategicIdeas: [
      'Pressure the c-file and execute a queenside minority attack with b4-b5.',
      'Develop harmoniously and avoid locking in the c1 bishop.',
      'Punish Black if they try to cling greedily to the c4 pawn with ...b5.',
    ],
    commonMistakes: [
      'Playing e3 before developing the dark-squared bishop outside the pawn chain.',
      'Allowing Black to equalize easily with ...dxc4 and ...c5 without active counterplay.',
    ],
    variations: [
      {
        name: "Queen's Gambit Declined",
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e3'],
        summary: 'Classical, rock-solid duel rich in strategic plans.',
      },
      {
        name: 'Slav Defense',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4'],
        summary: 'Solid alternative keeping the c8 bishop diagonal open.',
      },
    ],
  },
  {
    id: 'kings-indian-defense',
    name: "King's Indian Defense",
    eco: 'E60',
    side: 'Black',
    difficulty: 'Advanced',
    summary:
      'A hypermodern counterattacking defense that concedes early central space so Black can strike back explosively against White’s pawn chain.',
    moves: [
      { san: 'd4', explanation: 'White claims the queen’s pawn center.' },
      { san: 'Nf6', explanation: 'Controls e4 flexibly without committing central pawns.' },
      { san: 'c4', explanation: 'Expands White’s central influence.' },
      { san: 'g6', explanation: 'Prepares the fianchetto of the dark-squared bishop to g7.' },
      { san: 'Nc3', explanation: 'Develops and supports e4.' },
      { san: 'Bg7', explanation: 'Unleashes long-diagonal pressure across d4 and b2.' },
      { san: 'e4', explanation: 'White erects a broad classical pawn center.' },
      { san: 'd6', explanation: 'Restrains e5 and prepares ...e5 or ...c5.' },
      { san: 'Nf3', explanation: 'Reinforces d4 and prepares kingside castling.' },
      { san: 'O-O', explanation: 'Secures the king before launching the central counterstrike.' },
    ],
    strategicIdeas: [
      'Strike at White’s broad center with ...e5 and, once closed by d5, launch a kingside storm with ...f5.',
      'Use the g7 bishop as a tactical battering ram.',
      'Watch for pawn sacrifices like ...f4 and ...g5-g4 in locked positions.',
    ],
    commonMistakes: [
      'Delaying ...e5 or ...c5 too long and getting crushed on the queenside.',
      'Trading off the vital g7 dark-squared bishop without compensation.',
    ],
    variations: [
      {
        name: 'Mar del Plata Classical',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5', 'O-O', 'Nc6', 'd5', 'Ne7'],
        summary: 'Sharp opposite-wing attacks: White marches on the queenside while Black storms the king.',
      },
      {
        name: 'Sämisch System',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f3', 'O-O'],
        summary: 'White bolsters e4 with f3 to prepare aggressive kingside expansion.',
      },
    ],
  },
  {
    id: 'london-system',
    name: 'London System',
    eco: 'D02',
    side: 'White',
    difficulty: 'Beginner',
    summary:
      'A dependable, universal White system establishing a resilient pyramid of pawns (d4, e3, c3) with an active dark-squared bishop on f4.',
    moves: [
      { san: 'd4', explanation: 'Takes central space on the d-file.' },
      { san: 'd5', explanation: 'Black stakes an equal share of the center.' },
      { san: 'Bf4', explanation: 'Develops the dark-squared bishop outside the pawn chain before playing e3.' },
      { san: 'Nf6', explanation: 'Controls e4 and develops naturally.' },
      { san: 'e3', explanation: 'Solidifies d4 and opens the f1 bishop diagonal.' },
      { san: 'e6', explanation: 'Black mirrors solid central protection.' },
      { san: 'Nd2', explanation: 'Develops harmoniously while keeping c3 available to bolster d4.' },
      { san: 'c5', explanation: 'Black challenges White’s central d4 outpost.' },
      { san: 'c3', explanation: 'Completes the trademark London pyramid against ...c5.' },
    ],
    strategicIdeas: [
      'Plant a strong knight on the e5 outpost supported by f4 and Nf3.',
      'Keep the f4 bishop active on the h2-b8 diagonal, retreating to g3 if attacked.',
      'Attack on the kingside once the center stabilizes.',
    ],
    commonMistakes: [
      'Playing Nf3 and e3 mechanically without noticing ...Qb6 attacking b2.',
      'Forgetting c3 when Black hits d4 with ...c5 and ...Nc6.',
    ],
    variations: [
      {
        name: 'Jobava London',
        moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'e6', 'e3'],
        summary: 'Aggressive twist aiming for Nb5 and rapid kingside pawn storms.',
      },
      {
        name: 'Classical Pyramid Setup',
        moves: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5', 'c3', 'Nc6', 'Nd2'],
        summary: 'Flexible, hard-to-crack central configuration suitable for all levels.',
      },
    ],
  },
];
