import React, { useMemo, useState } from 'react';
import { Award, Check, Flame, Trophy } from 'lucide-react';
import { AVATAR_OPTIONS, DIFFICULTY_CONFIGS } from '../../data/themes';
import { getPlayerLevel } from '../../lib/storage/storageManager';
import { DifficultyLevel, MatchRecord, PuzzleProgress, UserProfile } from '../../types/chess';

interface ProfileStatsViewProps {
  profile: UserProfile;
  history: MatchRecord[];
  puzzleProgress: PuzzleProgress;
  onUpdateProfile: (next: UserProfile) => void;
  onToast: (msg: string, tone?: 'success' | 'error' | 'info') => void;
}

const DIFFICULTIES: DifficultyLevel[] = ['BEGINNER', 'EASY', 'MEDIUM', 'HARD', 'EXPERT'];

export const ProfileStatsView: React.FC<ProfileStatsViewProps> = ({
  profile,
  history,
  puzzleProgress,
  onUpdateProfile,
  onToast,
}) => {
  const [usernameDraft, setUsernameDraft] = useState(profile.username);
  const levelInfo = getPlayerLevel(profile.xp);

  const wins = history.filter((m) => m.result === 'win').length;
  const losses = history.filter((m) => m.result === 'loss').length;
  const draws = history.filter((m) => m.result === 'draw').length;
  const winRate = history.length > 0 ? Math.round((wins / history.length) * 100) : 0;

  const byDifficulty = useMemo(() => {
    return DIFFICULTIES.map((diff) => {
      const subset = history.filter((m) => m.difficulty === diff);
      const w = subset.filter((m) => m.result === 'win').length;
      const l = subset.filter((m) => m.result === 'loss').length;
      const d = subset.filter((m) => m.result === 'draw').length;
      const pct = subset.length > 0 ? Math.round((w / subset.length) * 100) : 0;
      return {
        difficulty: diff,
        label: DIFFICULTY_CONFIGS[diff].label,
        total: subset.length,
        wins: w,
        losses: l,
        draws: d,
        winRate: pct,
      };
    });
  }, [history]);

  // SVG Rating Chart points
  const chartSvg = useMemo(() => {
    const pts = profile.ratingHistory;
    if (pts.length === 0) return { poly: '', min: 800, max: 1400 };
    const ratings = pts.map((p) => p.rating);
    const min = Math.min(...ratings) - 40;
    const max = Math.max(...ratings) + 40;
    const range = Math.max(50, max - min);
    const w = 460;
    const h = 130;

    const poly = pts
      .map((p, idx) => {
        const x = pts.length === 1 ? w / 2 : (idx / (pts.length - 1)) * w;
        const y = h - ((p.rating - min) / range) * (h - 20) - 10;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    return { poly, min, max };
  }, [profile.ratingHistory]);

  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = usernameDraft.trim();
    if (!cleaned) return;
    onUpdateProfile({ ...profile, username: cleaned });
    onToast('Player profile updated.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Profile Identity Card */}
      <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <img
            src={profile.avatarUrl}
            alt={profile.username}
            referrerPolicy="no-referrer"
            className="w-20 h-20 rounded-xl object-cover border-2 border-[#D4AF37]/70 bg-[#111315]"
          />

          <div className="space-y-3 flex-1 w-full">
            <form onSubmit={handleSaveUsername} className="flex gap-2">
              <input
                type="text"
                maxLength={28}
                value={usernameDraft}
                onChange={(e) => setUsernameDraft(e.target.value)}
                aria-label="Player username"
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#111315] border border-[#2C3238] text-sm font-semibold text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-[#D4AF37] text-[#111315] text-xs font-semibold hover:bg-[#E2C04D] cursor-pointer"
              >
                Save
              </button>
            </form>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#A3A3A3]">Avatar:</span>
              {AVATAR_OPTIONS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    onUpdateProfile({ ...profile, avatarUrl: av.url });
                    onToast(`Avatar set to ${av.label}`, 'info');
                  }}
                  className={`px-2.5 py-1 rounded-md border text-[11px] transition-colors cursor-pointer ${
                    profile.avatarUrl === av.url
                      ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]'
                      : 'bg-[#111315] border-[#282D34] text-[#A3A3A3]'
                  }`}
                >
                  {av.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-[#111315] border border-[#252A30]">
            <span className="text-[11px] text-[#A3A3A3] block">Rating</span>
            <span className="font-mono tabular-nums text-lg font-bold text-[#D4AF37]">
              {profile.estimatedRating}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-[#111315] border border-[#252A30]">
            <span className="text-[11px] text-[#A3A3A3] block">Level</span>
            <span className="font-mono tabular-nums text-lg font-bold text-[#F5F5F5]">
              {levelInfo.level}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-[#111315] border border-[#252A30]">
            <span className="text-[11px] text-[#A3A3A3] block">Best Streak</span>
            <span className="font-mono tabular-nums text-lg font-bold text-[#22C55E]">
              {profile.bestStreak}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-[#111315] border border-[#252A30]">
            <span className="text-[11px] text-[#A3A3A3] block">Puzzles Solved</span>
            <span className="font-mono tabular-nums text-lg font-bold text-[#F5F5F5]">
              {puzzleProgress.solvedIds.length}
            </span>
          </div>
        </div>
      </div>

      {/* Rating Chart & Difficulty Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-[#1C2024] border border-[#282D34] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-[#F5F5F5]">Rating Progression</h2>
              <p className="text-xs text-[#A3A3A3]">
                {history.length} total matches · {wins}W / {losses}L / {draws}D ({winRate}% win rate)
              </p>
            </div>
            <Flame className="w-5 h-5 text-[#D4AF37]" />
          </div>

          <svg
            viewBox="0 0 460 130"
            className="w-full h-36 bg-[#111315] rounded-lg border border-[#252A30]"
          >
            {chartSvg.poly && (
              <polyline
                fill="none"
                stroke="#D4AF37"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={chartSvg.poly}
              />
            )}
          </svg>
        </div>

        <div className="lg:col-span-6 bg-[#1C2024] border border-[#282D34] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#F5F5F5]">
              Performance by Difficulty
            </h2>
            <Trophy className="w-5 h-5 text-[#D4AF37]" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[#A3A3A3] border-b border-[#252A30]">
                <tr>
                  <th className="py-2 font-medium">Difficulty</th>
                  <th className="py-2 font-medium text-right">Games</th>
                  <th className="py-2 font-medium text-right">W-L-D</th>
                  <th className="py-2 font-medium text-right">Win %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252A30] font-mono tabular-nums">
                {byDifficulty.map((row) => (
                  <tr key={row.difficulty}>
                    <td className="py-2.5 font-sans font-medium text-[#F5F5F5]">{row.label}</td>
                    <td className="py-2.5 text-right text-[#A3A3A3]">{row.total}</td>
                    <td className="py-2.5 text-right text-[#E5E5E5]">
                      {row.wins}-{row.losses}-{row.draws}
                    </td>
                    <td className="py-2.5 text-right text-[#D4AF37] font-semibold">
                      {row.winRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-[#F5F5F5]">Achievements</h2>
            <p className="text-xs text-[#A3A3A3]">
              Unlocked milestones across matches and tactical training
            </p>
          </div>
          <span className="font-mono tabular-nums text-xs text-[#D4AF37]">
            {profile.achievements.filter((a) => Boolean(a.unlockedAt)).length} /{' '}
            {profile.achievements.length} unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile.achievements.map((ach) => {
            const unlocked = Boolean(ach.unlockedAt);
            const pct = Math.min(100, Math.round((ach.progress / ach.target) * 100));
            return (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border ${
                  unlocked
                    ? 'bg-[#111315] border-[#D4AF37]/60'
                    : 'bg-[#111315]/60 border-[#252A30]'
                } space-y-2.5`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award
                      className={`w-4 h-4 ${unlocked ? 'text-[#D4AF37]' : 'text-[#525A65]'}`}
                    />
                    <span className="text-sm font-semibold text-[#F5F5F5]">{ach.title}</span>
                  </div>
                  {unlocked && <Check className="w-4 h-4 text-[#22C55E]" />}
                </div>
                <p className="text-xs text-[#A3A3A3]">{ach.description}</p>
                <div className="space-y-1">
                  <div className="flex justify-between font-mono tabular-nums text-[11px] text-[#8D959E]">
                    <span>Progress</span>
                    <span>
                      {ach.progress} / {ach.target}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#24292F] overflow-hidden">
                    <div
                      className={`h-full ${unlocked ? 'bg-[#22C55E]' : 'bg-[#D4AF37]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
