import React, { useMemo, useState } from 'react';
import { BarChart2, Download, Trash2, Upload } from 'lucide-react';
import { DIFFICULTY_CONFIGS } from '../../data/themes';
import { parsePgnSafe } from '../../lib/chess/chessUtils';
import { MatchRecord } from '../../types/chess';

interface GameHistoryViewProps {
  history: MatchRecord[];
  onAnalyzeMatch: (match: MatchRecord) => void;
  onDeleteMatch: (id: string) => void;
  onImportMatch: (record: MatchRecord) => void;
  onToast: (msg: string, tone?: 'success' | 'error' | 'info') => void;
}

export const GameHistoryView: React.FC<GameHistoryViewProps> = ({
  history,
  onAnalyzeMatch,
  onDeleteMatch,
  onImportMatch,
  onToast,
}) => {
  const [resultFilter, setResultFilter] = useState<'all' | 'win' | 'loss' | 'draw'>('all');
  const [importOpen, setImportOpen] = useState(false);
  const [pgnText, setPgnText] = useState('');
  const [importErr, setImportErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (resultFilter === 'all') return history;
    return history.filter((m) => m.result === resultFilter);
  }, [history, resultFilter]);

  const handleExportPgn = (match: MatchRecord) => {
    const blob = new Blob([match.pgn], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match-${match.id}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Match PGN exported.', 'success');
  };

  const handleImportSubmit = () => {
    const parsed = parsePgnSafe(pgnText);
    if (!parsed.ok) {
      setImportErr(parsed.error);
      return;
    }
    const headers = parsed.chess.getHeaders();
    const record: MatchRecord = {
      id: `imp-${Date.now()}`,
      date: new Date().toISOString(),
      difficulty: 'MEDIUM',
      playerColor: 'w',
      result: headers.Result === '1-0' ? 'win' : headers.Result === '0-1' ? 'loss' : 'draw',
      resultReason: 'Imported PGN Match',
      winner: headers.Result === '1-0' ? 'w' : headers.Result === '0-1' ? 'b' : 'draw',
      totalMoves: Math.ceil(parsed.moves.length / 2),
      pgn: parsed.chess.pgn(),
      startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      finalFen: parsed.chess.fen(),
      timeControlLabel: 'Imported',
      durationSeconds: 0,
    };
    onImportMatch(record);
    setImportOpen(false);
    setPgnText('');
    setImportErr(null);
    onToast('PGN imported into Game History.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#F5F5F5]">Game History Archive</h1>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Replay saved matches, export PGN files, or import external games for Stockfish review
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setImportErr(null);
            setImportOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D4AF37] text-[#111315] text-xs font-semibold hover:bg-[#E2C04D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Import PGN</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#1C2024] border border-[#282D34]">
          {(['all', 'win', 'loss', 'draw'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setResultFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                resultFilter === f
                  ? 'bg-[#D4AF37] text-[#111315] font-semibold'
                  : 'text-[#A3A3A3] hover:text-[#F5F5F5]'
              }`}
            >
              {f === 'all' ? 'All Matches' : `${f}s`}
            </button>
          ))}
        </div>

        <span className="font-mono tabular-nums text-xs text-[#A3A3A3]">
          {filtered.length} recorded
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#1C2024] border border-[#282D34] rounded-xl p-10 text-center">
          <p className="text-sm font-semibold text-[#F5F5F5]">No matches found</p>
          <p className="text-xs text-[#A3A3A3] mt-1">
            Play against Stockfish or import a valid PGN to populate your match archive.
          </p>
        </div>
      ) : (
        <div className="bg-[#1C2024] border border-[#282D34] rounded-xl divide-y divide-[#252A30]">
          {filtered.map((match) => {
            const colorClass =
              match.result === 'win'
                ? 'text-[#22C55E]'
                : match.result === 'loss'
                ? 'text-[#EF4444]'
                : 'text-[#A3A3A3]';

            return (
              <div
                key={match.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#22272C]/45 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={`font-semibold ${colorClass}`}>
                      {match.result === 'win' ? 'Win' : match.result === 'loss' ? 'Loss' : 'Draw'}
                    </span>
                    <span className="text-[#4B5563]">·</span>
                    <span className="font-medium text-[#F5F5F5]">
                      {match.opponentType === 'human'
                        ? 'Pass & Play (2-Player)'
                        : `vs Stockfish ${DIFFICULTY_CONFIGS[match.difficulty].label}`}
                    </span>
                    <span className="text-[#4B5563]">·</span>
                    <span className="text-xs text-[#A3A3A3]">{match.resultReason}</span>
                  </div>
                  <p className="text-xs text-[#A3A3A3]">
                    {match.playerColor === 'w' ? 'White' : 'Black'} · {match.timeControlLabel} ·{' '}
                    <span className="font-mono tabular-nums">{match.totalMoves} moves</span> ·{' '}
                    {new Date(match.date).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onAnalyzeMatch(match)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111315] border border-[#2F363E] text-xs font-medium text-[#D4AF37] hover:border-[#D4AF37] cursor-pointer"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>Replay &amp; Analyze</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPgn(match)}
                    title="Export PGN"
                    className="p-2 rounded-lg bg-[#111315] border border-[#2F363E] text-[#A3A3A3] hover:text-[#F5F5F5] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteMatch(match.id)}
                    title="Delete match"
                    className="p-2 rounded-lg bg-[#111315] border border-[#2F363E] text-[#A3A3A3] hover:text-[#EF4444] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {importOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-[#1C2024] border border-[#2F363E] rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#F5F5F5]">Import Game (PGN)</h2>
            <textarea
              rows={6}
              value={pgnText}
              onChange={(e) => setPgnText(e.target.value)}
              placeholder="Paste valid PGN notation here..."
              className="w-full p-3 rounded-xl bg-[#111315] border border-[#2E353D] font-mono text-xs text-[#F5F5F5] focus:outline-none focus:border-[#D4AF37]"
            />
            {importErr && <p className="text-xs text-[#EF4444]">{importErr}</p>}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="px-4 py-2 text-xs text-[#A3A3A3] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#111315] text-xs font-semibold cursor-pointer"
              >
                Import Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
