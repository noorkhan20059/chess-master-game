import { useCallback, useEffect, useRef, useState } from 'react';
import { getSharedStockfish } from '../lib/stockfish/stockfishWorker';
import { DifficultyLevel, EngineEvaluation } from '../types/chess';

export function useStockfish() {
  const engineRef = useRef(getSharedStockfish());
  const [engineReady, setEngineReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    let mounted = true;
    engineRef.current
      .init()
      .then(() => {
        if (mounted) {
          setEngineReady(true);
          setEngineError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setEngineError(err instanceof Error ? err.message : 'Stockfish failed to initialize.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const requestBestMove = useCallback(
    async (fen: string, difficulty: DifficultyLevel): Promise<{ moveUci: string; evaluation: EngineEvaluation } | null> => {
      setIsThinking(true);
      setEngineError(null);
      try {
        const res = await engineRef.current.getBestMoveForDifficulty(fen, difficulty);
        return res;
      } catch (err) {
        setEngineError(err instanceof Error ? err.message : 'Engine calculation failed.');
        return null;
      } finally {
        setIsThinking(false);
      }
    },
    []
  );

  const evaluatePosition = useCallback(
    async (
      fen: string,
      options?: { depth?: number; moveTimeMs?: number; skillLevel?: number; multiPv?: number }
    ): Promise<EngineEvaluation | null> => {
      try {
        return await engineRef.current.evaluatePosition(fen, options);
      } catch (err) {
        setEngineError(err instanceof Error ? err.message : 'Evaluation failed.');
        return null;
      }
    },
    []
  );

  const stopSearch = useCallback(() => {
    engineRef.current.stopCurrentSearch();
  }, []);

  return {
    engine: engineRef.current,
    engineReady,
    engineError,
    isThinking,
    requestBestMove,
    evaluatePosition,
    stopSearch,
  };
}
