import React, { useEffect } from 'react';
import {
  ArrowRight,
  BarChart2,
  BookOpen,
  History,
  Play,
  Puzzle,
  Settings,
  Swords,
  Trophy,
  User,
} from 'lucide-react';
import { DIFFICULTY_CONFIGS, PUZZLES_STUDY_URL, SALON_BACKDROP_URL } from '../../data/themes';
import { getDailyPuzzle } from '../../data/puzzles';
import { getPlayerLevel } from '../../lib/storage/storageManager';
import {
  ActiveGameState,
  AppView,
  MatchRecord,
  PuzzleProgress,
  UserProfile,
} from '../../types/chess';

interface DashboardViewProps {
  profile: UserProfile;
  history: MatchRecord[];
  activeGame: ActiveGameState | null;
  puzzleProgress: PuzzleProgress;
  onNavigate: (view: AppView) => void;
  onOpenNewGameModal: () => void;
  onQuickGame: () => void;
  onResumeGame: () => void;
  onAnalyzeMatch: (match: MatchRecord) => void;
  onOpenDailyPuzzle: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  history,
  activeGame,
  puzzleProgress,
  onNavigate,
  onOpenNewGameModal,
  onQuickGame,
  onResumeGame,
  onAnalyzeMatch,
  onOpenDailyPuzzle,
}) => {
  const totalGames = history.length;
  const wins = history.filter((m) => m.result === 'win').length;
  const losses = history.filter((m) => m.result === 'loss').length;
  const draws = history.filter((m) => m.result === 'draw').length;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const dailyPuzzle = getDailyPuzzle();
  const dailySolved = puzzleProgress.solvedIds.includes(dailyPuzzle.id);
  const levelInfo = getPlayerLevel(profile.xp);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter') {
        onQuickGame();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onQuickGame]);

  const moduleCards: Array<{
    id: AppView;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
  }> = [
    {
      id: 'play',
      title: 'Play Against AI',
      subtitle: 'Custom difficulty, color & chess clock',
      icon: Swords,
      action: onOpenNewGameModal,
    },
    {
      id: 'analysis',
      title: 'Game Analysis',
      subtitle: 'Move-by-move accuracy & blunder review',
      icon: BarChart2,
      action: () => onNavigate('analysis'),
    },
    {
      id: 'puzzles',
      title: 'Chess Puzzles',
      subtitle: `${puzzleProgress.solvedIds.length} solved · Tactical combinations`,
      icon: Puzzle,
      action: () => onNavigate('puzzles'),
    },
    {
      id: 'openings',
      title: 'Learn Chess',
      subtitle: '8 classical openings with guided lines',
      icon: BookOpen,
      action: () => onNavigate('openings'),
    },
    {
      id: 'history',
      title: 'Game History',
      subtitle: 'Replay saved games, import & export PGN',
      icon: History,
      action: () => onNavigate('history'),
    },
    {
      id: 'profile',
      title: 'Player Statistics',
      subtitle: 'Rating progress, achievements & profile',
      icon: Trophy,
      action: () => onNavigate('profile'),
    },
    {
      id: 'profile',
      title: 'Player Profile',
      subtitle: `${profile.username} · Level ${levelInfo.level}`,
      icon: User,
      action: () => onNavigate('profile'),
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Board themes, audio & promotion rules',
      icon: Settings,
      action: () => onNavigate('settings'),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Salon Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-[#282D34] bg-[#1C2024]">
        <img
          src={SALON_BACKDROP_URL}
          alt="Luxury walnut chessboard in warm studio lighting"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#111315] via-[#111315]/88 to-[#111315]/55" />

        <div className="relative z-10 p-6 md:p-10 lg:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-xl space-y-4">
            <p className="text-xs font-medium tracking-wide text-[#D4AF37]">
              Grandmaster Training Salon · {levelInfo.title}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#F5F5F5] leading-tight [text-wrap:balance]">
              Command Every Square on the Board
            </h1>
            <p className="text-sm sm:text-base text-[#C4C4C4] leading-relaxed">
              Challenge Stockfish 19 across five calibrated tiers, inspect real-time tactical threats, and review every match with centipawn precision.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onOpenNewGameModal}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#D4AF37] text-[#111315] text-sm font-semibold hover:bg-[#E2C04D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Swords className="w-4 h-4" />
                <span>Play Against AI</span>
              </button>

              <button
                type="button"
                onClick={onQuickGame}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#1C2024]/90 border border-[#343B44] text-[#F5F5F5] text-sm font-medium hover:border-[#D4AF37] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4 text-[#D4AF37]" />
                <span>Quick Game (5+0)</span>
              </button>

              {activeGame && activeGame.status === 'playing' && (
                <button
                  type="button"
                  onClick={onResumeGame}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] text-sm font-medium hover:bg-[#22C55E]/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Resume Unfinished Match</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-[#8D959E]">
              Drag-and-drop or click-to-move · Press Enter for instant Quick Game
            </p>
          </div>

          {/* Player Snapshot */}
          <div className="bg-[#111315]/85 border border-[#2D333B] rounded-xl p-5 w-full lg:w-72 shrink-0 space-y-4">
            <div className="flex items-center gap-3.5">
              <img
                src={profile.avatarUrl}
                alt={profile.username}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-lg object-cover border border-[#D4AF37]/50 bg-[#1C2024]"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#F5F5F5] truncate">{profile.username}</p>
                <p className="text-xs text-[#A3A3A3]">
                  Level {levelInfo.level} · {profile.xp} XP
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A3A3A3]">Level Progress</span>
                <span className="font-mono tabular-nums text-[#D4AF37]">
                  {levelInfo.currentXp} / {levelInfo.nextLevelXp}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#24292F] overflow-hidden">
                <div
                  className="h-full bg-[#D4AF37] transition-all duration-300"
                  style={{ width: `${Math.round((levelInfo.currentXp / levelInfo.nextLevelXp) * 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#24292F] flex items-center justify-between text-xs">
              <span className="text-[#A3A3A3]">Current Win Streak</span>
              <span className="font-mono tabular-nums font-semibold text-[#F5F5F5]">
                {profile.currentStreak}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Column KPI Strip */}
      <section aria-label="Player performance summary" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5">
          <p className="text-xs text-[#A3A3A3]">Total Games Played</p>
          <p className="mt-2 font-mono tabular-nums text-2xl md:text-3xl font-semibold text-[#F5F5F5]">
            {totalGames}
          </p>
          <p className="mt-1 text-xs text-[#7E8690]">Completed matches stored locally</p>
        </div>

        <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5">
          <p className="text-xs text-[#A3A3A3]">Match Record</p>
          <p className="mt-2 font-mono tabular-nums text-2xl md:text-3xl font-semibold text-[#F5F5F5]">
            {wins}W · {losses}L · {draws}D
          </p>
          <p className="mt-1 text-xs text-[#7E8690]">
            {wins} wins · {losses} losses · {draws} draws
          </p>
        </div>

        <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5">
          <p className="text-xs text-[#A3A3A3]">Win Percentage</p>
          <p className="mt-2 font-mono tabular-nums text-2xl md:text-3xl font-semibold text-[#22C55E]">
            {winRate}%
          </p>
          <p className="mt-1 text-xs text-[#7E8690]">Across all AI difficulty levels</p>
        </div>

        <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5">
          <p className="text-xs text-[#A3A3A3]">Estimated Rating</p>
          <p className="mt-2 font-mono tabular-nums text-2xl md:text-3xl font-semibold text-[#D4AF37]">
            {profile.estimatedRating}
          </p>
          <p className="mt-1 text-xs text-[#7E8690]">Calibrated Elo performance</p>
        </div>
      </section>

      {/* Daily Challenge & Recent Matches Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Daily Chess Challenge */}
        <div className="lg:col-span-5 bg-[#1C2024] border border-[#282D34] rounded-xl overflow-hidden flex flex-col">
          <div className="relative h-44 bg-[#14171A] overflow-hidden">
            <img
              src={PUZZLES_STUDY_URL}
              alt="Wooden Staunton chess pieces in a tactical endgame"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1C2024] via-black/35 to-transparent" />
            <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between text-xs text-[#F5F5F5]">
              <span className="font-medium text-[#D4AF37]">Daily Chess Challenge</span>
              <span className="font-mono tabular-nums text-[#E5E5E5]">
                Rating {dailyPuzzle.rating}
              </span>
            </div>
          </div>

          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <h2 className="font-display text-xl font-bold text-[#F5F5F5]">
                {dailyPuzzle.title}
              </h2>
              <p className="text-xs text-[#A3A3A3]">
                {dailyPuzzle.difficulty} · {dailyPuzzle.theme} ·{' '}
                {dailySolved ? 'Solved today' : 'Unsolved'}
              </p>
              <p className="text-sm text-[#C4C4C4] leading-relaxed">
                Find the sharpest tactical sequence on the board to sharpen your calculation.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenDailyPuzzle}
              className="w-full py-2.5 px-4 rounded-lg bg-[#D4AF37] text-[#111315] text-sm font-semibold hover:bg-[#E2C04D] transition-colors cursor-pointer"
            >
              {dailySolved ? 'Review Daily Puzzle' : 'Solve Daily Challenge'}
            </button>
          </div>
        </div>

        {/* Recent Matches */}
        <div className="lg:col-span-7 bg-[#1C2024] border border-[#282D34] rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#282D34]">
            <div>
              <h2 className="font-display text-lg font-bold text-[#F5F5F5]">Recent Matches</h2>
              <p className="text-xs text-[#A3A3A3]">
                Click any game to inspect move-by-move engine evaluation
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs font-medium text-[#D4AF37] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              View All History
            </button>
          </div>

          {history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4">
              <p className="text-sm font-medium text-[#F5F5F5]">No completed matches yet</p>
              <p className="text-xs text-[#A3A3A3] mt-1 max-w-sm">
                Start a match against Stockfish to record your games, calculate accuracy, and track your rating climb.
              </p>
              <button
                type="button"
                onClick={onOpenNewGameModal}
                className="mt-4 px-4 py-2 rounded-lg bg-[#111315] border border-[#343B44] text-xs font-semibold text-[#D4AF37] hover:border-[#D4AF37] transition-colors cursor-pointer"
              >
                Start First Match
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#252A30] flex-1">
              {history.slice(0, 5).map((match) => {
                const outcomeText =
                  match.result === 'win' ? 'Victory' : match.result === 'loss' ? 'Defeat' : 'Draw';
                const outcomeColor =
                  match.result === 'win'
                    ? 'text-[#22C55E]'
                    : match.result === 'loss'
                    ? 'text-[#EF4444]'
                    : 'text-[#A3A3A3]';

                return (
                  <div
                    key={match.id}
                    className="py-3.5 flex items-center justify-between gap-4 hover:bg-[#22272C]/50 px-2 -mx-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`font-semibold ${outcomeColor}`}>{outcomeText}</span>
                        <span aria-hidden="true" className="text-[#4B5563]">·</span>
                        <span className="font-medium text-[#F5F5F5] truncate">
                          {match.opponentType === 'human'
                            ? 'Pass & Play (2-Player)'
                            : `vs Stockfish ${DIFFICULTY_CONFIGS[match.difficulty].label}`}
                        </span>
                      </div>
                      <p className="text-xs text-[#A3A3A3] truncate">
                        {match.playerColor === 'w' ? 'White' : 'Black'} · {match.timeControlLabel} ·{' '}
                        <span className="font-mono tabular-nums">{match.totalMoves} moves</span> ·{' '}
                        {new Date(match.date).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onAnalyzeMatch(match)}
                      className="px-3 py-1.5 rounded-lg bg-[#111315] border border-[#2F363E] text-xs font-medium text-[#F5F5F5] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Analyze
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Complete Platform Navigation Grid */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#F5F5F5]">Training &amp; Tools</h2>
          <p className="text-xs text-[#A3A3A3]">
            Direct access to every AI Chess Master workspace
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {moduleCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <button
                key={`${card.id}-${idx}`}
                type="button"
                onClick={card.action}
                className="group text-left bg-[#1C2024] border border-[#282D34] hover:border-[#D4AF37]/70 rounded-xl p-5 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <Icon className="w-5 h-5 text-[#D4AF37]" />
                  <ArrowRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#D4AF37] transition-colors" />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-[#F5F5F5]">{card.title}</h3>
                <p className="mt-1 text-xs text-[#A3A3A3] leading-relaxed">{card.subtitle}</p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
