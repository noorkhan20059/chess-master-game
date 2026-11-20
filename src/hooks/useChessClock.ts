import { useCallback, useEffect, useRef, useState } from 'react';
import { PlayerColor } from '../types/chess';

interface UseChessClockOptions {
  initialWhiteMs: number;
  initialBlackMs: number;
  incrementSeconds: number;
  activeTurn: PlayerColor;
  running: boolean;
  untimed: boolean;
  onTimeExpired: (loser: PlayerColor) => void;
}

export function useChessClock({
  initialWhiteMs,
  initialBlackMs,
  incrementSeconds,
  activeTurn,
  running,
  untimed,
  onTimeExpired,
}: UseChessClockOptions) {
  const [whiteMs, setWhiteMs] = useState(initialWhiteMs);
  const [blackMs, setBlackMs] = useState(initialBlackMs);
  const lastTickRef = useRef<number | null>(null);
  const expiredRef = useRef(false);

  const resetClocks = useCallback((wMs: number, bMs: number) => {
    setWhiteMs(wMs);
    setBlackMs(bMs);
    lastTickRef.current = null;
    expiredRef.current = false;
  }, []);

  const applyIncrement = useCallback(
    (movedColor: PlayerColor) => {
      if (untimed || incrementSeconds <= 0) return;
      const incMs = incrementSeconds * 1000;
      if (movedColor === 'w') {
        setWhiteMs((prev) => prev + incMs);
      } else {
        setBlackMs((prev) => prev + incMs);
      }
    },
    [incrementSeconds, untimed]
  );

  useEffect(() => {
    if (!running || untimed || expiredRef.current) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const delta = lastTickRef.current !== null ? now - lastTickRef.current : 100;
      lastTickRef.current = now;

      if (activeTurn === 'w') {
        setWhiteMs((prev) => {
          const next = Math.max(0, prev - delta);
          if (next === 0 && !expiredRef.current) {
            expiredRef.current = true;
            window.setTimeout(() => onTimeExpired('w'), 0);
          }
          return next;
        });
      } else {
        setBlackMs((prev) => {
          const next = Math.max(0, prev - delta);
          if (next === 0 && !expiredRef.current) {
            expiredRef.current = true;
            window.setTimeout(() => onTimeExpired('b'), 0);
          }
          return next;
        });
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [running, untimed, activeTurn, onTimeExpired]);

  return {
    whiteMs,
    blackMs,
    resetClocks,
    applyIncrement,
    setWhiteMs,
    setBlackMs,
  };
}
