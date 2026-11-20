import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { BOARD_THEMES } from '../../data/themes';
import { AppSettings, BoardThemeId } from '../../types/chess';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  onResetAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetAllData,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5">
        <h1 className="font-display text-2xl font-bold text-[#F5F5F5]">Settings &amp; Preferences</h1>
        <p className="text-xs text-[#A3A3A3] mt-1">
          Customize chessboard aesthetics, audio cues, gameplay rules, and local storage data
        </p>
      </div>

      {/* 3D / 2D Display & Camera */}
      <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#F5F5F5]">Board Rendering Mode</h2>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              Choose between the interactive Three.js 3D Staunton set or Classic 2D tournament view.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#111315] border border-[#282D34] shrink-0">
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, boardViewMode: '3d' })}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                settings.boardViewMode === '3d'
                  ? 'bg-[#D4AF37] text-[#111315]'
                  : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
              }`}
            >
              Realistic 3D
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, boardViewMode: '2d' })}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                settings.boardViewMode === '2d'
                  ? 'bg-[#D4AF37] text-[#111315]'
                  : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
              }`}
            >
              Classic 2D
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#252A30]">
          <div>
            <h2 className="text-sm font-semibold text-[#F5F5F5]">Default 3D Camera Angle</h2>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              Select the starting viewpoint when loading 3D matches and studies.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-[#111315] border border-[#282D34] shrink-0">
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, cameraPreset: 'angled' })}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                settings.cameraPreset === 'angled'
                  ? 'bg-[#D4AF37] text-[#111315]'
                  : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
              }`}
            >
              Angled 3D
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, cameraPreset: 'top' })}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                settings.cameraPreset === 'top'
                  ? 'bg-[#D4AF37] text-[#111315]'
                  : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
              }`}
            >
              Top-Down
            </button>
          </div>
        </div>
      </div>

      {/* Board Theme Picker */}
      <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#F5F5F5]">Chessboard Material &amp; Theme</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.values(BOARD_THEMES).map((theme) => {
            const active = settings.boardTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() =>
                  onUpdateSettings({ ...settings, boardTheme: theme.id as BoardThemeId })
                }
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#D4AF37]/15 border-[#D4AF37]'
                    : 'bg-[#111315] border-[#282D34] hover:border-[#3E4650]'
                }`}
              >
                <span className="text-xs font-semibold text-[#F5F5F5]">{theme.name}</span>
                <div className="grid grid-cols-2 w-10 h-10 rounded-md overflow-hidden border border-[#2E343B] shrink-0">
                  <div style={{ backgroundColor: theme.lightSquare }} />
                  <div style={{ backgroundColor: theme.darkSquare }} />
                  <div style={{ backgroundColor: theme.darkSquare }} />
                  <div style={{ backgroundColor: theme.lightSquare }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Gameplay & Audio Toggles */}
      <div className="bg-[#1C2024] border border-[#282D34] rounded-xl divide-y divide-[#252A30]">
        {[
          {
            key: 'soundEnabled' as const,
            title: 'Sound Effects',
            desc: 'Play synthesized tactile audio on moves, captures, checks, and game results.',
          },
          {
            key: 'showLegalMoves' as const,
            title: 'Show Legal Move Indicators',
            desc: 'Highlight all legal destination squares when selecting a piece.',
          },
          {
            key: 'showCoordinates' as const,
            title: 'Board Coordinates',
            desc: 'Display rank numbers (1–8) and file letters (a–h) along board edges.',
          },
          {
            key: 'autoQueen' as const,
            title: 'Auto-Promote to Queen',
            desc: 'Skip the promotion chooser dialog and immediately promote pawns to a Queen.',
          },
        ].map((item) => {
          const enabled = settings[item.key];
          return (
            <div key={item.key} className="p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#F5F5F5]">{item.title}</p>
                <p className="text-xs text-[#A3A3A3] mt-0.5">{item.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => onUpdateSettings({ ...settings, [item.key]: !enabled })}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                  enabled ? 'bg-[#D4AF37]' : 'bg-[#2C3238]'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-[#111315] transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          );
        })}

        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#F5F5F5]">Piece Animation Speed</p>
            <p className="text-xs text-[#A3A3A3] mt-0.5">
              Adjust visual transition smoothness when pieces slide across squares.
            </p>
          </div>
          <select
            value={settings.animationSpeedMs}
            onChange={(e) =>
              onUpdateSettings({ ...settings, animationSpeedMs: Number(e.target.value) })
            }
            className="px-3 py-1.5 rounded-lg bg-[#111315] border border-[#2C3238] text-xs text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
          >
            <option value={0}>Instant (0ms)</option>
            <option value={120}>Crisp (120ms)</option>
            <option value={180}>Standard (180ms)</option>
            <option value={280}>Smooth (280ms)</option>
          </select>
        </div>
      </div>

      {/* Data Reset */}
      <div className="bg-[#1C2024] border border-[#EF4444]/35 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-[#F5F5F5]">Reset Saved Local Data</h2>
          <p className="text-xs text-[#A3A3A3] mt-0.5">
            Clears your match history, rating progression, puzzle progress, and preferences.
          </p>
        </div>

        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#111315] border border-[#EF4444]/50 text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 cursor-pointer shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Data</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="px-3 py-2 text-xs text-[#A3A3A3] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmReset(false);
                onResetAllData();
              }}
              className="px-4 py-2 rounded-lg bg-[#EF4444] text-white text-xs font-semibold cursor-pointer"
            >
              Confirm Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
