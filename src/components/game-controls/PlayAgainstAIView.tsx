import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, PieceSymbol, Square } from 'chess.js';
import {
  BarChart2,
  Box,
  Flag,
  FlipVertical2,
  Grid2x2,
  PlusSquare,
  RotateCcw,
  Settings2,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Arrow } from 'react-chessboard';
import { AVATAR_OPTIONS, BOARD_THEMES, DIFFICULTY_CONFIGS } from '../../data/themes';
import { useChessClock } from '../../hooks/useChessClock';
import { useStockfish } from '../../hooks/useStockfish';
import { buildHintInsight, getEvalBarPercent } from '../../lib/analysis/gameAnalyzer';
import { chessSounds } from '../../lib/audio/soundEffects';
import {
  evaluateGameStatus,
  getCapturedPieces,
  parsePgnSafe,
  uciToMoveObj,
} from '../../lib/chess/chessUtils';
import {
  ActiveGameState,
  AppSettings,
  BoardThemeId,
  EngineEvaluation,
  GameResultInfo,
  HintInsight,
  MatchRecord,
  PlayerColor,
  UserProfile,
} from '../../types/chess';
import { AIAssistantPanel } from '../ai-panel/AIAssistantPanel';
import { AdaptiveChessBoard } from '../chessboard/AdaptiveChessBoard';
import { MoveHistoryPanel } from './MoveHistoryPanel';
import { PlayerHeaderBar } from './PlayerHeaderBar';

interface PlayAgainstAIViewProps {
  activeGame: ActiveGameState;
  profile: UserProfile;
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  onSaveActiveGame: (game: ActiveGameState) => void;
  onCompleteMatch: (record: MatchRecord) => void;
  onOpenNewGameModal: () => void;
  onRestartMatch: () => void;
  onAnalyzeCompletedMatch: (record: MatchRecord) => void;
  onToast: (message: string, tone?: 'success' | 'error' | 'info') => void;
}

function buildChessFromActiveGame(game: ActiveGameState): Chess {
  const c = new Chess(game.startingFen || undefined);
  if (game.pgn && game.pgn.trim().length > 0) {
    try {
      c.loadPgn(game.pgn);
      return c;
    } catch {
      // Fallback to FEN if PGN parse fails
    }
  }
  try {
    c.load(game.fen);
  } catch {
    // Fallback to default start
  }
  return c;
}

export const PlayAgainstAIView: React.FC<PlayAgainstAIViewProps> = ({
  activeGame,
  profile,
  settings,
  onUpdateSettings,
  onSaveActiveGame,
  onCompleteMatch,
  onOpenNewGameModal,
  onRestartMatch,
  onAnalyzeCompletedMatch,
  onToast,
}) => {
  const [chessInstance, setChessInstance] = useState<Chess>(() => buildChessFromActiveGame(activeGame));
  const [boardVersion, setBoardVersion] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [liveEval, setLiveEval] = useState<EngineEvaluation | null>(null);
  const [hint, setHint] = useState<HintInsight | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState<'ai' | 'moves'>('ai');
  const [completedRecord, setCompletedRecord] = useState<MatchRecord | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPgnText, setImportPgnText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const gameIdRef = useRef(activeGame.id);
  const finishedHandledRef = useRef(activeGame.status === 'completed');

  const { engineReady, engineError, isThinking, requestBestMove, evaluatePosition, stopSearch } =
    useStockfish();

  // Re-sync local board whenever a brand-new game starts
  useEffect(() => {
    if (gameIdRef.current !== activeGame.id) {
      gameIdRef.current = activeGame.id;
      finishedHandledRef.current = activeGame.status === 'completed';
      const rebuilt = buildChessFromActiveGame(activeGame);
      setChessInstance(rebuilt);
      setBoardVersion((v) => v + 1);
      setHint(null);
      setLiveEval(null);
      setCompletedRecord(null);
      stopSearch();
    }
  }, [activeGame, stopSearch]);

  const fen = useMemo(() => chessInstance.fen(), [chessInstance, boardVersion]);
  const movesHistory = useMemo(() => chessInstance.history({ verbose: true }), [chessInstance, boardVersion]);
  const movesSan = useMemo(() => movesHistory.map((m) => m.san), [movesHistory]);
  const lastMove = useMemo(() => {
    const last = movesHistory[movesHistory.length - 1];
    return last ? { from: last.from, to: last.to } : null;
  }, [movesHistory]);

  const currentTurn: PlayerColor = chessInstance.turn();
  const isHumanOpponent = activeGame.opponentType === 'human';
  const isGameOver = activeGame.status === 'completed' || Boolean(activeGame.result);
  const isPlayerTurn = !isGameOver && (isHumanOpponent || currentTurn === activeGame.playerColor);

  const finalizeGame = useCallback(
    (resultInfo: GameResultInfo, finalChess: Chess, whiteMs: number, blackMs: number) => {
      if (finishedHandledRef.current) return;
      finishedHandledRef.current = true;
      stopSearch();

      const playerResult: 'win' | 'loss' | 'draw' =
        resultInfo.winner === 'draw'
          ? 'draw'
          : isHumanOpponent
          ? resultInfo.winner === 'w'
            ? 'win'
            : 'loss'
          : resultInfo.winner === activeGame.playerColor
          ? 'win'
          : 'loss';

      if (playerResult === 'win') chessSounds.playVictory();
      else if (playerResult === 'loss' && !isHumanOpponent) chessSounds.playDefeat();
      else if (isHumanOpponent && resultInfo.winner !== 'draw') chessSounds.playVictory();

      const updatedActive: ActiveGameState = {
        ...activeGame,
        fen: finalChess.fen(),
        pgn: finalChess.pgn(),
        whiteTimeMs: whiteMs,
        blackTimeMs: blackMs,
        status: 'completed',
        result: resultInfo,
      };
      onSaveActiveGame(updatedActive);

      const record: MatchRecord = {
        id: activeGame.id,
        date: new Date().toISOString(),
        opponentType: activeGame.opponentType ?? 'ai',
        difficulty: activeGame.difficulty,
        playerColor: activeGame.playerColor,
        result: playerResult,
        resultReason: resultInfo.reason,
        winner: resultInfo.winner,
        totalMoves: Math.ceil(finalChess.history().length / 2),
        pgn: finalChess.pgn(),
        startingFen: activeGame.startingFen,
        finalFen: finalChess.fen(),
        timeControlLabel: activeGame.timeControl.label,
        durationSeconds: Math.max(1, Math.round((Date.now() - activeGame.startedAt) / 1000)),
      };

      setCompletedRecord(record);
      onCompleteMatch(record);
    },
    [activeGame, isHumanOpponent, onCompleteMatch, onSaveActiveGame, stopSearch]
  );

  const untimed = activeGame.timeControl.initialSeconds === 0;

  const handleTimeExpired = useCallback(
    (loser: PlayerColor) => {
      if (finishedHandledRef.current) return;
      const winner: PlayerColor = loser === 'w' ? 'b' : 'w';
      finalizeGame(
        {
          winner,
          reason: `Time Expired — ${winner === 'w' ? 'White' : 'Black'} wins on time`,
        },
        chessInstance,
        loser === 'w' ? 0 : activeGame.whiteTimeMs,
        loser === 'b' ? 0 : activeGame.blackTimeMs
      );
    },
    [activeGame.blackTimeMs, activeGame.whiteTimeMs, chessInstance, finalizeGame]
  );

  const { whiteMs, blackMs, resetClocks, applyIncrement } = useChessClock({
    initialWhiteMs: activeGame.whiteTimeMs,
    initialBlackMs: activeGame.blackTimeMs,
    incrementSeconds: activeGame.timeControl.incrementSeconds,
    activeTurn: currentTurn,
    running: !isGameOver && movesSan.length > 0,
    untimed,
    onTimeExpired: handleTimeExpired,
  });

  const whiteMsRef = useRef(whiteMs);
  const blackMsRef = useRef(blackMs);
  useEffect(() => {
    whiteMsRef.current = whiteMs;
    blackMsRef.current = blackMs;
  }, [whiteMs, blackMs]);

  // Sync clock values when activeGame changes ID
  useEffect(() => {
    resetClocks(activeGame.whiteTimeMs, activeGame.blackTimeMs);
  }, [activeGame.id, resetClocks]);

  const persistSnapshot = useCallback(
    (updatedChess: Chess, wMs: number, bMs: number) => {
      onSaveActiveGame({
        ...activeGame,
        fen: updatedChess.fen(),
        pgn: updatedChess.pgn(),
        whiteTimeMs: wMs,
        blackTimeMs: bMs,
      });
    },
    [activeGame, onSaveActiveGame]
  );

  const triggerMoveSound = (move: { captured?: string; san: string }, nextChess: Chess) => {
    if (nextChess.inCheck()) {
      chessSounds.playCheck();
    } else if (move.san === 'O-O' || move.san === 'O-O-O') {
      chessSounds.playCastle();
    } else if (move.captured) {
      chessSounds.playCapture();
    } else {
      chessSounds.playMove();
    }
  };

  // Run Stockfish live evaluation on the active turn (and skip AI auto-move in Pass & Play mode)
  useEffect(() => {
    if (!engineReady || isGameOver) return;
    if (!isHumanOpponent && chessInstance.turn() !== activeGame.playerColor) return;
    let cancelled = false;
    evaluatePosition(fen, { depth: 7, moveTimeMs: 140, multiPv: 1 }).then((evalRes) => {
      if (!cancelled && evalRes) {
        setLiveEval(evalRes);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [fen, engineReady, isGameOver, isHumanOpponent, chessInstance, activeGame.playerColor, evaluatePosition]);

  // Trigger AI move automatically when it's AI's turn (never depend on ticking clock state)
  useEffect(() => {
    if (!engineReady || isGameOver || isHumanOpponent) return;
    const aiColor: PlayerColor = activeGame.playerColor === 'w' ? 'b' : 'w';
    if (chessInstance.turn() !== aiColor) return;

    let cancelled = false;
    const currentGameId = activeGame.id;

    const timer = window.setTimeout(async () => {
      const result = await requestBestMove(chessInstance.fen(), activeGame.difficulty);
      if (cancelled || gameIdRef.current !== currentGameId || finishedHandledRef.current) return;
      if (!result || !result.moveUci) return;

      const moveObj = uciToMoveObj(result.moveUci);
      if (!moveObj) return;

      try {
        const moved = chessInstance.move(moveObj);
        if (!moved) return;

        triggerMoveSound(moved, chessInstance);
        applyIncrement(aiColor);
        setLiveEval(result.evaluation);
        setHint(null);
        setBoardVersion((v) => v + 1);

        const incMs = activeGame.timeControl.incrementSeconds * 1000;
        const nextW = aiColor === 'w' ? whiteMsRef.current + incMs : whiteMsRef.current;
        const nextB = aiColor === 'b' ? blackMsRef.current + incMs : blackMsRef.current;

        const status = evaluateGameStatus(chessInstance);
        if (status) {
          finalizeGame(status, chessInstance, nextW, nextB);
        } else {
          persistSnapshot(chessInstance, nextW, nextB);
        }
      } catch {
        onToast('Engine attempted an unexpected move; retrying.', 'error');
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    engineReady,
    isGameOver,
    boardVersion,
    activeGame.id,
    activeGame.playerColor,
    activeGame.difficulty,
    activeGame.timeControl.incrementSeconds,
    chessInstance,
    requestBestMove,
    applyIncrement,
    finalizeGame,
    persistSnapshot,
    onToast,
  ]);

  const handlePlayerMove = useCallback(
    ({ from, to, promotion }: { from: Square; to: Square; promotion?: PieceSymbol }): boolean => {
      if (isGameOver) return false;
      if (!isHumanOpponent && (chessInstance.turn() !== activeGame.playerColor || isThinking)) {
        return false;
      }

      const movingSide = chessInstance.turn();

      try {
        const moved = chessInstance.move({ from, to, promotion });
        if (!moved) return false;

        triggerMoveSound(moved, chessInstance);
        applyIncrement(movingSide);
        setHint(null);
        setBoardVersion((v) => v + 1);

        const nextW =
          movingSide === 'w'
            ? whiteMsRef.current + activeGame.timeControl.incrementSeconds * 1000
            : whiteMsRef.current;
        const nextB =
          movingSide === 'b'
            ? blackMsRef.current + activeGame.timeControl.incrementSeconds * 1000
            : blackMsRef.current;

        const status = evaluateGameStatus(chessInstance);
        if (status) {
          finalizeGame(status, chessInstance, nextW, nextB);
        } else {
          persistSnapshot(chessInstance, nextW, nextB);
        }
        return true;
      } catch {
        return false;
      }
    },
    [
      isGameOver,
      isHumanOpponent,
      chessInstance,
      activeGame.playerColor,
      activeGame.timeControl.incrementSeconds,
      isThinking,
      applyIncrement,
      finalizeGame,
      persistSnapshot,
    ]
  );

  const handleUndo = () => {
    if (isGameOver || movesSan.length === 0) return;
    stopSearch();

    if (isHumanOpponent) {
      chessInstance.undo();
    } else if (chessInstance.turn() !== activeGame.playerColor) {
      chessInstance.undo();
    } else if (movesSan.length >= 2) {
      chessInstance.undo();
      chessInstance.undo();
    } else {
      return;
    }

    setHint(null);
    setBoardVersion((v) => v + 1);
    persistSnapshot(chessInstance, whiteMs, blackMs);
    onToast('Move reverted', 'info');
  };

  const handleResign = () => {
    if (isGameOver) return;
    const resigningSide: PlayerColor = isHumanOpponent ? currentTurn : activeGame.playerColor;
    const winner: PlayerColor = resigningSide === 'w' ? 'b' : 'w';
    finalizeGame(
      { winner, reason: `Resignation — ${winner === 'w' ? 'White' : 'Black'} wins` },
      chessInstance,
      whiteMs,
      blackMs
    );
  };

  const handleRequestHint = async () => {
    if (!engineReady || isGameOver || !isPlayerTurn || isThinking) return;
    setIsHintLoading(true);
    try {
      const evalRes = await evaluatePosition(fen, { depth: 11, moveTimeMs: 380, multiPv: 2 });
      if (evalRes && evalRes.bestMoveUci) {
        setLiveEval(evalRes);
        const baseInsight = buildHintInsight(fen, evalRes);
        setHint(baseInsight);

        try {
          const res = await fetch('/api/chess-coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fen,
              pgn: chessInstance.pgn(),
              bestMoveSan: baseInsight.bestMoveSan,
              altMoveSan: baseInsight.altMoveSan,
              evalText: baseInsight.evalText,
              tacticalAlert: baseInsight.tacticalAlert,
              checkmateThreat: baseInsight.checkmateThreat,
              difficulty: activeGame.difficulty,
            }),
          });
          const data = (await res.json()) as { advice?: string; error?: string };
          if (res.ok && data.advice) {
            setHint((prev) => (prev ? { ...prev, coachAdvice: data.advice } : prev));
          } else if (data.error) {
            setHint((prev) => (prev ? { ...prev, coachError: data.error } : prev));
          }
        } catch {
          setHint((prev) =>
            prev ? { ...prev, coachError: 'Could not reach coaching server.' } : prev
          );
        }
      }
    } finally {
      setIsHintLoading(false);
    }
  };

  const handleCopyPgn = async () => {
    const pgn = chessInstance.pgn();
    if (!pgn) {
      onToast('No moves to copy yet.', 'info');
      return;
    }
    try {
      await navigator.clipboard.writeText(pgn);
      onToast('PGN copied to clipboard.', 'success');
    } catch {
      onToast('Could not access clipboard.', 'error');
    }
  };

  const handleDownloadPgn = () => {
    const pgn = chessInstance.pgn();
    if (!pgn) {
      onToast('No moves to export yet.', 'info');
      return;
    }
    const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-chess-master-${activeGame.id}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('PGN exported.', 'success');
  };

  const handleImportPgnSubmit = () => {
    const parsed = parsePgnSafe(importPgnText);
    if (!parsed.ok) {
      setImportError(parsed.error);
      return;
    }
    stopSearch();
    setChessInstance(parsed.chess);
    setHint(null);
    setImportModalOpen(false);
    setImportPgnText('');
    setImportError(null);
    setBoardVersion((v) => v + 1);

    const status = evaluateGameStatus(parsed.chess);
    if (status) {
      finalizeGame(status, parsed.chess, whiteMs, blackMs);
    } else {
      persistSnapshot(parsed.chess, whiteMs, blackMs);
      onToast('PGN position loaded.', 'success');
    }
  };

  const captured = useMemo(() => getCapturedPieces(chessInstance), [chessInstance, boardVersion]);
  const boardOrientation: 'white' | 'black' =
    (activeGame.playerColor === 'w') !== flipped ? 'white' : 'black';

  const topColor: PlayerColor = boardOrientation === 'white' ? 'b' : 'w';
  const bottomColor: PlayerColor = boardOrientation === 'white' ? 'w' : 'b';

  const aiConfig = DIFFICULTY_CONFIGS[activeGame.difficulty];
  const aiAvatar = AVATAR_OPTIONS[1].url;

  const renderPlayerBar = (barColor: PlayerColor) => {
    const isHuman = isHumanOpponent || barColor === activeGame.playerColor;
    const adv =
      barColor === 'w'
        ? Math.max(0, captured.whiteAdvantage)
        : Math.max(0, -captured.whiteAdvantage);

    const playerName = isHumanOpponent
      ? barColor === 'w'
        ? `${profile.username} (White)`
        : 'Challenger (Black)'
      : isHuman
      ? profile.username
      : `Stockfish ${aiConfig.label}`;

    const playerSubtitle = isHumanOpponent
      ? `Pass & Play · ${barColor === 'w' ? 'White Pieces' : 'Black Pieces'}`
      : isHuman
      ? `Rating ${profile.estimatedRating} · ${barColor === 'w' ? 'White' : 'Black'}`
      : `Elo ~${aiConfig.eloEstimate} · ${barColor === 'w' ? 'White' : 'Black'}`;

    return (
      <PlayerHeaderBar
        name={playerName}
        subtitle={playerSubtitle}
        avatarUrl={
          isHumanOpponent
            ? barColor === 'w'
              ? profile.avatarUrl
              : aiAvatar
            : isHuman
            ? profile.avatarUrl
            : aiAvatar
        }
        color={barColor}
        isTurn={!isGameOver && currentTurn === barColor}
        isThinking={!isHumanOpponent && !isHuman && isThinking}
        capturedPieces={barColor === 'w' ? captured.capturedByWhite : captured.capturedByBlack}
        materialAdvantage={adv}
        timeMs={barColor === 'w' ? whiteMs : blackMs}
        untimed={untimed}
      />
    );
  };

  const hintArrows: Arrow[] = useMemo(() => {
    if (!hint) return [];
    const list: Arrow[] = [];
    if (hint.bestMoveUci.length >= 4) {
      list.push({
        startSquare: hint.bestMoveUci.slice(0, 2),
        endSquare: hint.bestMoveUci.slice(2, 4),
        color: '#D4AF37',
      });
    }
    if (hint.altMoveUci && hint.altMoveUci.length >= 4) {
      list.push({
        startSquare: hint.altMoveUci.slice(0, 2),
        endSquare: hint.altMoveUci.slice(2, 4),
        color: '#22C55E',
      });
    }
    return list;
  }, [hint]);

  const evalWhitePct = liveEval ? getEvalBarPercent(liveEval.cp, liveEval.mate) : 50;

  return (
    <div className="space-y-5">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1C2024] border border-[#282D34] rounded-xl px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-display text-base md:text-lg font-bold text-[#F5F5F5] truncate">
            {isHumanOpponent ? 'Local 2-Player Match' : `Match vs Stockfish ${aiConfig.label}`}
          </h1>
          <span className="hidden sm:inline text-xs text-[#A3A3A3] whitespace-nowrap">
            · {activeGame.timeControl.label} · {activeGame.timeControl.category}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 3D / 2D View Switch */}
          <div
            className="inline-flex items-center p-0.5 rounded-lg bg-[#111315] border border-[#2C3238]"
            role="group"
            aria-label="Board View Mode"
          >
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, boardViewMode: '3d' })}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                settings.boardViewMode === '3d'
                  ? 'bg-[#D4AF37] text-[#111315]'
                  : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, boardViewMode: '2d' })}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                settings.boardViewMode === '2d'
                  ? 'bg-[#D4AF37] text-[#111315]'
                  : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
              }`}
            >
              <Grid2x2 className="w-3.5 h-3.5" />
              <span>2D</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenNewGameModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-[#111315] text-xs font-semibold hover:bg-[#E2C04D] transition-colors cursor-pointer"
          >
            <PlusSquare className="w-3.5 h-3.5" />
            <span>New Setup</span>
          </button>

          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            title="Flip board"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111315] border border-[#2C3238] text-xs font-medium text-[#F5F5F5] hover:border-[#D4AF37] transition-colors cursor-pointer"
          >
            <FlipVertical2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="hidden sm:inline">Flip</span>
          </button>

          <button
            type="button"
            onClick={handleUndo}
            disabled={isGameOver || movesSan.length === 0}
            title="Undo last move"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111315] border border-[#2C3238] text-xs font-medium text-[#F5F5F5] hover:border-[#D4AF37] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          <button
            type="button"
            onClick={onRestartMatch}
            title="Restart game"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111315] border border-[#2C3238] text-xs font-medium text-[#F5F5F5] hover:border-[#D4AF37] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restart</span>
          </button>

          {!isGameOver && (
            <button
              type="button"
              onClick={handleResign}
              title="Resign game"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111315] border border-[#2C3238] text-xs font-medium text-[#EF4444] hover:border-[#EF4444]/60 transition-colors cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Resign</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
            aria-label={settings.soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            className="p-2 rounded-lg bg-[#111315] border border-[#2C3238] text-[#A3A3A3] hover:text-[#D4AF37] transition-colors cursor-pointer"
          >
            {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <label className="sr-only" htmlFor="quick-board-theme">
            Board Theme
          </label>
          <div className="hidden md:flex items-center gap-1.5 bg-[#111315] border border-[#2C3238] rounded-lg px-2.5 py-1.5">
            <Settings2 className="w-3.5 h-3.5 text-[#D4AF37]" />
            <select
              id="quick-board-theme"
              value={settings.boardTheme}
              onChange={(e) =>
                onUpdateSettings({ ...settings, boardTheme: e.target.value as BoardThemeId })
              }
              className="bg-transparent text-xs text-[#F5F5F5] focus:outline-none cursor-pointer"
            >
              {Object.values(BOARD_THEMES).map((t) => (
                <option key={t.id} value={t.id} className="bg-[#1C2024] text-[#F5F5F5]">
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Chess Arena Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Center Column: Vertical Eval Bar + Board + Player Headers */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-3">
          {renderPlayerBar(topColor)}

          <div className="flex items-stretch gap-3">
            {/* Slim Vertical Evaluation Bar on Desktop */}
            <div
              className="hidden sm:flex flex-col w-3.5 rounded-full overflow-hidden border border-[#2C3238] bg-[#1C2024] shrink-0"
              title="White vs Black Engine Evaluation"
            >
              {boardOrientation === 'white' ? (
                <>
                  <div
                    className="bg-[#24282E] transition-all duration-300"
                    style={{ height: `${100 - evalWhitePct}%` }}
                  />
                  <div
                    className="bg-[#F0D9B5] transition-all duration-300 flex-1"
                  />
                </>
              ) : (
                <>
                  <div
                    className="bg-[#F0D9B5] transition-all duration-300"
                    style={{ height: `${evalWhitePct}%` }}
                  />
                  <div
                    className="bg-[#24282E] transition-all duration-300 flex-1"
                  />
                </>
              )}
            </div>

            <div className="flex-1 max-w-[640px] mx-auto w-full">
              <AdaptiveChessBoard
                viewMode={settings.boardViewMode}
                fen={fen}
                orientation={boardOrientation}
                boardTheme={settings.boardTheme}
                cameraPreset={settings.cameraPreset}
                onCameraPresetChange={(preset) =>
                  onUpdateSettings({ ...settings, cameraPreset: preset })
                }
                onSwitchViewMode={(mode) =>
                  onUpdateSettings({ ...settings, boardViewMode: mode })
                }
                interactive={!isGameOver}
                allowedTurn={isHumanOpponent ? 'both' : activeGame.playerColor}
                showLegalMoves={settings.showLegalMoves}
                showCoordinates={settings.showCoordinates}
                autoQueen={settings.autoQueen}
                animationSpeedMs={settings.animationSpeedMs}
                lastMove={lastMove}
                arrows={hintArrows}
                onMoveAttempt={handlePlayerMove}
              />
            </div>
          </div>

          {renderPlayerBar(bottomColor)}
        </div>

        {/* Right Column: AI Panel + Move History */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-4">
          {/* Mobile Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#1C2024] border border-[#282D34] lg:hidden">
            <button
              type="button"
              onClick={() => setMobileTab('ai')}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mobileTab === 'ai' ? 'bg-[#D4AF37] text-[#111315]' : 'text-[#A3A3A3]'
              }`}
            >
              Engine &amp; Hints
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('moves')}
              className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mobileTab === 'moves' ? 'bg-[#D4AF37] text-[#111315]' : 'text-[#A3A3A3]'
              }`}
            >
              Moves ({movesSan.length})
            </button>
          </div>

          {/* Result Banner if Game Completed */}
          {isGameOver && activeGame.result && (
            <div className="bg-[#1C2024] border border-[#D4AF37]/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[#D4AF37]">Match Completed</p>
                  <h2 className="font-display text-lg font-bold text-[#F5F5F5]">
                    {activeGame.result.reason}
                  </h2>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {completedRecord && (
                  <button
                    type="button"
                    onClick={() => onAnalyzeCompletedMatch(completedRecord)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#111315] text-xs font-semibold hover:bg-[#E2C04D] transition-colors cursor-pointer"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>Analyze Full Match</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onRestartMatch}
                  className="px-4 py-2 rounded-lg bg-[#111315] border border-[#2F363E] text-xs font-semibold text-[#F5F5F5] hover:border-[#D4AF37] transition-colors cursor-pointer"
                >
                  Play Again
                </button>
              </div>
            </div>
          )}

          <div className={`${mobileTab === 'ai' ? 'block' : 'hidden'} lg:block`}>
            <AIAssistantPanel
              difficulty={activeGame.difficulty}
              engineReady={engineReady}
              engineError={engineError}
              isThinking={isThinking}
              isHintLoading={isHintLoading}
              isGameOver={isGameOver}
              isPlayerTurn={isPlayerTurn}
              liveEval={liveEval}
              hint={hint}
              onRequestHint={handleRequestHint}
              onClearHint={() => setHint(null)}
            />
          </div>

          <div className={`${mobileTab === 'moves' ? 'block' : 'hidden'} lg:block`}>
            <MoveHistoryPanel
              movesSan={movesSan}
              onCopyPgn={handleCopyPgn}
              onDownloadPgn={handleDownloadPgn}
              onOpenImportPgn={() => {
                setImportError(null);
                setImportModalOpen(true);
              }}
            />
          </div>
        </div>
      </div>

      {/* PGN Import Modal */}
      {importModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-label="Import PGN"
        >
          <div className="w-full max-w-lg bg-[#1C2024] border border-[#2F363E] rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#F5F5F5]">Import PGN Game</h2>
              <p className="text-xs text-[#A3A3A3]">
                Paste a valid PGN sequence to continue playing or analyze from that position.
              </p>
            </div>
            <textarea
              rows={6}
              value={importPgnText}
              onChange={(e) => setImportPgnText(e.target.value)}
              placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6..."
              className="w-full p-3 rounded-xl bg-[#111315] border border-[#2E353D] font-mono text-xs text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
            />
            {importError && <p className="text-xs text-[#EF4444]">{importError}</p>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 text-xs text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportPgnSubmit}
                className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#111315] text-xs font-semibold hover:bg-[#E2C04D] cursor-pointer"
              >
                Load PGN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
