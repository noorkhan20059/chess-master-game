import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { GameSetupModal } from './components/game-controls/GameSetupModal';
import { PlayAgainstAIView } from './components/game-controls/PlayAgainstAIView';
import { DashboardView } from './components/dashboard/DashboardView';
import { NavigationShell } from './components/layout/NavigationShell';
import { getDailyPuzzle } from './data/puzzles';
import { TIME_CONTROL_PRESETS } from './data/themes';
import { chessSounds } from './lib/audio/soundEffects';
import {
  getDefaultProfile,
  getDefaultPuzzleProgress,
  getDefaultSettings,
  loadActiveGame,
  loadMatchHistory,
  loadProfile,
  loadPuzzleProgress,
  loadSelectedDifficulty,
  loadSettings,
  resetAllStoredData,
  saveActiveGame,
  saveMatchHistory,
  saveProfile,
  savePuzzleProgress,
  saveSelectedDifficulty,
  saveSettings,
  syncAchievementsAndProgression,
} from './lib/storage/storageManager';
import {
  ActiveGameState,
  AppSettings,
  AppView,
  DifficultyLevel,
  MatchRecord,
  OpponentType,
  PlayerColor,
  PuzzleProgress,
  TimeControlPreset,
  UserProfile,
} from './types/chess';

const GameAnalysisView = lazy(() =>
  import('./components/game-analysis/GameAnalysisView').then((m) => ({ default: m.GameAnalysisView }))
);
const PuzzlesView = lazy(() =>
  import('./components/chess-puzzles/PuzzlesView').then((m) => ({ default: m.PuzzlesView }))
);
const OpeningsView = lazy(() =>
  import('./components/openings/OpeningsView').then((m) => ({ default: m.OpeningsView }))
);
const GameHistoryView = lazy(() =>
  import('./components/profile/GameHistoryView').then((m) => ({ default: m.GameHistoryView }))
);
const ProfileStatsView = lazy(() =>
  import('./components/profile/ProfileStatsView').then((m) => ({ default: m.ProfileStatsView }))
);
const SettingsView = lazy(() =>
  import('./components/settings/SettingsView').then((m) => ({ default: m.SettingsView }))
);

interface ToastItem {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}

const DEFAULT_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function createNewActiveGame(config: {
  opponentType?: OpponentType;
  difficulty: DifficultyLevel;
  playerColor: PlayerColor;
  timeControl: TimeControlPreset;
  startingFen?: string;
  pgn?: string;
}): ActiveGameState {
  const initialMs = config.timeControl.initialSeconds * 1000;
  return {
    id: `match-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fen: config.startingFen ?? DEFAULT_START_FEN,
    startingFen: config.startingFen ?? DEFAULT_START_FEN,
    pgn: config.pgn ?? '',
    opponentType: config.opponentType ?? 'ai',
    difficulty: config.difficulty,
    playerColor: config.playerColor,
    timeControl: config.timeControl,
    whiteTimeMs: initialMs,
    blackTimeMs: initialMs,
    startedAt: Date.now(),
    status: 'playing',
  };
}

const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-24 rounded-xl bg-[#1C2024] border border-[#282D34]" />
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-6 aspect-square rounded-xl bg-[#1C2024] border border-[#282D34]" />
      <div className="lg:col-span-6 h-96 rounded-xl bg-[#1C2024] border border-[#282D34]" />
    </div>
  </div>
);

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('play');
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [history, setHistory] = useState<MatchRecord[]>(() => loadMatchHistory());
  const [puzzleProgress, setPuzzleProgress] = useState<PuzzleProgress>(() => loadPuzzleProgress());
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>(() =>
    loadSelectedDifficulty()
  );
  const [activeGame, setActiveGame] = useState<ActiveGameState | null>(() => loadActiveGame());
  const [analysisMatch, setAnalysisMatch] = useState<MatchRecord | null>(
    () => loadMatchHistory()[0] ?? null
  );
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string | null>(null);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    chessSounds.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  const showToast = useCallback((message: string, tone: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const handleUpdateSettings = useCallback((next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  }, []);

  const handleUpdateProfile = useCallback((next: UserProfile) => {
    setProfile(next);
    saveProfile(next);
  }, []);

  const handleSaveActiveGame = useCallback((game: ActiveGameState) => {
    setActiveGame(game);
    saveActiveGame(game);
  }, []);

  const handleStartConfiguredGame = useCallback(
    (config: {
      opponentType?: OpponentType;
      difficulty: DifficultyLevel;
      playerColor: PlayerColor;
      timeControl: TimeControlPreset;
      startingFen?: string;
      pgn?: string;
    }) => {
      setSelectedDifficulty(config.difficulty);
      saveSelectedDifficulty(config.difficulty);
      const nextGame = createNewActiveGame(config);
      setActiveGame(nextGame);
      saveActiveGame(nextGame);
      setSetupModalOpen(false);
      setCurrentView('play');
    },
    []
  );

  const handleQuickGame = useCallback(() => {
    const blitz5 = TIME_CONTROL_PRESETS.find((t) => t.id === 'blitz-5-0') ?? TIME_CONTROL_PRESETS[4];
    handleStartConfiguredGame({
      opponentType: 'ai',
      difficulty: selectedDifficulty,
      playerColor: 'w',
      timeControl: blitz5,
    });
  }, [handleStartConfiguredGame, selectedDifficulty]);

  const handleRestartMatch = useCallback(() => {
    if (!activeGame) {
      handleQuickGame();
      return;
    }
    const fresh = createNewActiveGame({
      opponentType: activeGame.opponentType ?? 'ai',
      difficulty: activeGame.difficulty,
      playerColor: activeGame.playerColor,
      timeControl: activeGame.timeControl,
    });
    setActiveGame(fresh);
    saveActiveGame(fresh);
    showToast('Board reset for a fresh match.', 'info');
  }, [activeGame, handleQuickGame, showToast]);

  const handleCompleteMatch = useCallback(
    (record: MatchRecord) => {
      const nextHistory = [record, ...history];
      setHistory(nextHistory);
      saveMatchHistory(nextHistory);
      setAnalysisMatch(record);

      const nextProfile = syncAchievementsAndProgression(
        profile,
        nextHistory,
        puzzleProgress,
        record
      );
      setProfile(nextProfile);
      saveProfile(nextProfile);
    },
    [history, profile, puzzleProgress]
  );

  const handleUpdatePuzzleProgress = useCallback(
    (nextProgress: PuzzleProgress) => {
      setPuzzleProgress(nextProgress);
      savePuzzleProgress(nextProgress);

      const nextProfile = syncAchievementsAndProgression(profile, history, nextProgress);
      setProfile(nextProfile);
      saveProfile(nextProfile);
    },
    [profile, history]
  );

  const handleDeleteMatch = useCallback(
    (id: string) => {
      const next = history.filter((m) => m.id !== id);
      setHistory(next);
      saveMatchHistory(next);
      if (analysisMatch?.id === id) {
        setAnalysisMatch(next[0] ?? null);
      }
      showToast('Match removed from history.', 'info');
    },
    [history, analysisMatch, showToast]
  );

  const handleImportMatch = useCallback(
    (record: MatchRecord) => {
      const next = [record, ...history];
      setHistory(next);
      saveMatchHistory(next);
      setAnalysisMatch(record);
    },
    [history]
  );

  const handleResetAllData = useCallback(() => {
    resetAllStoredData();
    const defProfile = getDefaultProfile();
    const defSettings = getDefaultSettings();
    const defPuzzles = getDefaultPuzzleProgress();
    setProfile(defProfile);
    setSettings(defSettings);
    setHistory([]);
    setPuzzleProgress(defPuzzles);
    setActiveGame(null);
    setAnalysisMatch(null);
    setSelectedDifficulty('MEDIUM');
    showToast('All local data has been reset.', 'info');
  }, [showToast]);

  const handlePracticeOpening = useCallback(
    (fen: string, pgn: string, playerColor: PlayerColor) => {
      const rapid10 =
        TIME_CONTROL_PRESETS.find((t) => t.id === 'rapid-10-0') ?? TIME_CONTROL_PRESETS[6];
      handleStartConfiguredGame({
        difficulty: selectedDifficulty,
        playerColor,
        timeControl: rapid10,
        startingFen: DEFAULT_START_FEN,
        pgn,
      });
      if (fen === DEFAULT_START_FEN) {
        showToast('Starting fresh sparring match.', 'info');
      } else {
        showToast('Opening position loaded against Stockfish.', 'success');
      }
    },
    [handleStartConfiguredGame, selectedDifficulty, showToast]
  );

  const ensuredPlayGame: ActiveGameState =
    activeGame ??
    createNewActiveGame({
      difficulty: selectedDifficulty,
      playerColor: 'w',
      timeControl: TIME_CONTROL_PRESETS[4],
    });

  return (
    <NavigationShell
      currentView={currentView}
      username={profile.username}
      rating={profile.estimatedRating}
      onNavigate={(view) => {
        if (view === 'play' && !activeGame) {
          const initial = createNewActiveGame({
            difficulty: selectedDifficulty,
            playerColor: 'w',
            timeControl: TIME_CONTROL_PRESETS[4],
          });
          setActiveGame(initial);
          saveActiveGame(initial);
        }
        setCurrentView(view);
      }}
      onQuickPlay={handleQuickGame}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          {currentView === 'dashboard' && (
            <DashboardView
              profile={profile}
              history={history}
              activeGame={activeGame}
              puzzleProgress={puzzleProgress}
              onNavigate={setCurrentView}
              onOpenNewGameModal={() => setSetupModalOpen(true)}
              onQuickGame={handleQuickGame}
              onResumeGame={() => setCurrentView('play')}
              onAnalyzeMatch={(match) => {
                setAnalysisMatch(match);
                setCurrentView('analysis');
              }}
              onOpenDailyPuzzle={() => {
                setSelectedPuzzleId(getDailyPuzzle().id);
                setCurrentView('puzzles');
              }}
            />
          )}

          {currentView === 'play' && (
            <PlayAgainstAIView
              activeGame={ensuredPlayGame}
              profile={profile}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onSaveActiveGame={handleSaveActiveGame}
              onCompleteMatch={handleCompleteMatch}
              onOpenNewGameModal={() => setSetupModalOpen(true)}
              onRestartMatch={handleRestartMatch}
              onAnalyzeCompletedMatch={(record) => {
                setAnalysisMatch(record);
                setCurrentView('analysis');
              }}
              onToast={showToast}
            />
          )}

          {currentView !== 'dashboard' && currentView !== 'play' && (
            <Suspense fallback={<LoadingSkeleton />}>
              {currentView === 'analysis' && (
                <GameAnalysisView
                  selectedMatch={analysisMatch}
                  history={history}
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onSelectMatch={setAnalysisMatch}
                  onToast={showToast}
                />
              )}

              {currentView === 'puzzles' && (
                <PuzzlesView
                  initialPuzzleId={selectedPuzzleId}
                  puzzleProgress={puzzleProgress}
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onUpdateProgress={handleUpdatePuzzleProgress}
                  onToast={showToast}
                />
              )}

              {currentView === 'openings' && (
                <OpeningsView
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onPracticePosition={handlePracticeOpening}
                />
              )}

              {currentView === 'history' && (
                <GameHistoryView
                  history={history}
                  onAnalyzeMatch={(match) => {
                    setAnalysisMatch(match);
                    setCurrentView('analysis');
                  }}
                  onDeleteMatch={handleDeleteMatch}
                  onImportMatch={handleImportMatch}
                  onToast={showToast}
                />
              )}

              {currentView === 'profile' && (
                <ProfileStatsView
                  profile={profile}
                  history={history}
                  puzzleProgress={puzzleProgress}
                  onUpdateProfile={handleUpdateProfile}
                  onToast={showToast}
                />
              )}

              {currentView === 'settings' && (
                <SettingsView
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onResetAllData={handleResetAllData}
                />
              )}
            </Suspense>
          )}
        </motion.div>
      </AnimatePresence>

      <GameSetupModal
        open={setupModalOpen}
        initialDifficulty={selectedDifficulty}
        onClose={() => setSetupModalOpen(false)}
        onStartGame={handleStartConfiguredGame}
      />

      {/* Toast Notification Stack */}
      <div
        aria-live="polite"
        className="fixed bottom-18 md:bottom-5 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-xs"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.16 }}
              className={`px-4 py-2.5 rounded-lg border text-xs font-medium shadow-xl pointer-events-auto ${
                t.tone === 'success'
                  ? 'bg-[#17241D] border-[#22C55E]/50 text-[#DCFCE7]'
                  : t.tone === 'error'
                  ? 'bg-[#281617] border-[#EF4444]/50 text-[#FEE2E2]'
                  : 'bg-[#1C2024] border-[#D4AF37]/50 text-[#F5F5F5]'
              }`}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NavigationShell>
  );
}
