import React, { useEffect, useRef } from 'react';
import { Copy, Download, Upload } from 'lucide-react';

interface MoveHistoryPanelProps {
  movesSan: string[];
  activePly?: number;
  onSelectPly?: (ply: number) => void;
  onCopyPgn: () => void;
  onDownloadPgn: () => void;
  onOpenImportPgn?: () => void;
}

export const MoveHistoryPanel: React.FC<MoveHistoryPanelProps> = ({
  movesSan,
  activePly,
  onSelectPly,
  onCopyPgn,
  onDownloadPgn,
  onOpenImportPgn,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current && activePly === undefined) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [movesSan.length, activePly]);

  const rows: Array<{ moveNumber: number; white?: string; black?: string; wPly: number; bPly: number }> = [];
  for (let i = 0; i < movesSan.length; i += 2) {
    rows.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: movesSan[i],
      black: movesSan[i + 1],
      wPly: i + 1,
      bPly: i + 2,
    });
  }

  return (
    <div className="bg-[#1C2024] border border-[#282D34] rounded-xl flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-[#282D34] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-[#F5F5F5]">Move Notation</h3>
          <span className="font-mono tabular-nums text-[11px] text-[#A3A3A3]">
            · {movesSan.length} plies
          </span>
        </div>

        <div className="flex items-center gap-1">
          {onOpenImportPgn && (
            <button
              type="button"
              onClick={onOpenImportPgn}
              title="Import PGN"
              className="p-1.5 rounded-md text-[#A3A3A3] hover:text-[#D4AF37] hover:bg-[#111315] transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onCopyPgn}
            title="Copy PGN"
            className="p-1.5 rounded-md text-[#A3A3A3] hover:text-[#D4AF37] hover:bg-[#111315] transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDownloadPgn}
            title="Download PGN"
            className="p-1.5 rounded-md text-[#A3A3A3] hover:text-[#D4AF37] hover:bg-[#111315] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-56 overflow-y-auto p-2">
        {rows.length === 0 ? (
          <p className="text-xs text-[#7E8690] text-center py-6">
            Play the opening move to begin recording notation.
          </p>
        ) : (
          <div className="space-y-0.5 font-mono tabular-nums text-xs">
            {rows.map((row) => (
              <div
                key={row.moveNumber}
                className="grid grid-cols-[2.25rem_1fr_1fr] items-center rounded-md px-1.5 py-1 hover:bg-[#24292F]/50"
              >
                <span className="text-[#7E8690]">{row.moveNumber}.</span>
                {row.white ? (
                  <button
                    type="button"
                    disabled={!onSelectPly}
                    onClick={() => onSelectPly?.(row.wPly)}
                    className={`text-left px-2 py-0.5 rounded transition-colors ${
                      activePly === row.wPly
                        ? 'bg-[#D4AF37]/20 text-[#D4AF37] font-semibold'
                        : 'text-[#F5F5F5]'
                    } ${onSelectPly ? 'hover:bg-[#2C3238] cursor-pointer' : 'cursor-default'}`}
                  >
                    {row.white}
                  </button>
                ) : (
                  <span />
                )}

                {row.black ? (
                  <button
                    type="button"
                    disabled={!onSelectPly}
                    onClick={() => onSelectPly?.(row.bPly)}
                    className={`text-left px-2 py-0.5 rounded transition-colors ${
                      activePly === row.bPly
                        ? 'bg-[#D4AF37]/20 text-[#D4AF37] font-semibold'
                        : 'text-[#E5E5E5]'
                    } ${onSelectPly ? 'hover:bg-[#2C3238] cursor-pointer' : 'cursor-default'}`}
                  >
                    {row.black}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
