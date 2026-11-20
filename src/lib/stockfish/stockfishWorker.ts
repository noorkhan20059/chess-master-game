import { Chess } from 'chess.js';
import { DIFFICULTY_CONFIGS } from '../../data/themes';
import { DifficultyLevel, EngineEvaluation } from '../../types/chess';

interface CandidatePv {
  multipv: number;
  cp: number;
  mate?: number;
  depth: number;
  pv: string[];
}

interface PendingSearch {
  fen: string;
  resolve: (evalResult: EngineEvaluation) => void;
  reject: (err: Error) => void;
  candidates: Map<number, CandidatePv>;
  turn: 'w' | 'b';
}

export class StockfishEngineService {
  private worker: Worker | null = null;
  private ready = false;
  private initPromise: Promise<void> | null = null;
  private activeSearch: PendingSearch | null = null;
  private queue: Array<() => Promise<void>> = [];
  private processingQueue = false;
  private destroyed = false;

  public async init(): Promise<void> {
    if (this.destroyed) {
      throw new Error('Stockfish engine instance was destroyed.');
    }
    if (this.ready && this.worker) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.spawnWorkerWithFallback();
    return this.initPromise;
  }

  private spawnWorkerWithFallback(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof Worker === 'undefined') {
        reject(new Error('Web Workers are not supported in this browser.'));
        return;
      }

      const tryEngine = (scriptUrl: string, allowFallback: boolean) => {
        try {
          const worker = new Worker(scriptUrl);
          let settled = false;

          const timeout = window.setTimeout(() => {
            if (!settled) {
              worker.terminate();
              if (allowFallback) {
                tryEngine('/stockfish/stockfish-19-asm.js', false);
              } else {
                settled = true;
                reject(new Error('Stockfish worker timed out during initialization.'));
              }
            }
          }, 8000);

          worker.onerror = () => {
            window.clearTimeout(timeout);
            if (!settled) {
              worker.terminate();
              if (allowFallback) {
                tryEngine('/stockfish/stockfish-19-asm.js', false);
              } else {
                settled = true;
                reject(new Error('Failed to load Stockfish Web Worker.'));
              }
            } else if (this.activeSearch) {
              this.activeSearch.reject(new Error('Stockfish worker encountered an error.'));
              this.activeSearch = null;
            }
          };

          worker.onmessage = (event: MessageEvent<string>) => {
            const line = typeof event.data === 'string' ? event.data.trim() : '';
            if (!line) return;

            if (!settled && line === 'uciok') {
              worker.postMessage('isready');
              return;
            }
            if (!settled && line === 'readyok') {
              settled = true;
              window.clearTimeout(timeout);
              this.worker = worker;
              this.ready = true;
              resolve();
              return;
            }

            this.handleEngineLine(line);
          };

          worker.postMessage('uci');
        } catch (err) {
          if (allowFallback) {
            tryEngine('/stockfish/stockfish-19-asm.js', false);
          } else {
            reject(err instanceof Error ? err : new Error('Could not start Stockfish worker.'));
          }
        }
      };

      tryEngine('/stockfish/stockfish-19-lite-single.js', true);
    });
  }

  private handleEngineLine(line: string) {
    const search = this.activeSearch;
    if (!search) return;

    if (line.startsWith('info ') && line.includes(' pv ')) {
      const multipvMatch = line.match(/\bmultipv (\d+)/);
      const depthMatch = line.match(/\bdepth (\d+)/);
      const cpMatch = line.match(/\bscore cp (-?\d+)/);
      const mateMatch = line.match(/\bscore mate (-?\d+)/);
      const pvMatch = line.match(/\bpv (.+)$/);

      if (pvMatch) {
        const multipv = multipvMatch ? Number(multipvMatch[1]) : 1;
        const depth = depthMatch ? Number(depthMatch[1]) : 1;
        const pv = pvMatch[1].trim().split(/\s+/);
        // Stockfish reports score from side-to-move perspective; normalize to White perspective
        const sign = search.turn === 'w' ? 1 : -1;
        let cp = 0;
        let mate: number | undefined;

        if (mateMatch) {
          mate = Number(mateMatch[1]) * sign;
          cp = mate > 0 ? 30000 - Math.abs(mate) * 100 : -30000 + Math.abs(mate) * 100;
        } else if (cpMatch) {
          cp = Number(cpMatch[1]) * sign;
        }

        search.candidates.set(multipv, { multipv, cp, mate, depth, pv });
      }
      return;
    }

    if (line.startsWith('bestmove ')) {
      const match = line.match(/^bestmove (\S+)/);
      const bestMoveFromCmd = match ? match[1] : '';
      const primary = search.candidates.get(1);
      const alt = search.candidates.get(2);

      const bestMoveUci =
        bestMoveFromCmd && bestMoveFromCmd !== '(none)'
          ? bestMoveFromCmd
          : primary?.pv[0] ?? '';

      const result: EngineEvaluation = {
        cp: primary?.cp ?? 0,
        mate: primary?.mate,
        depth: primary?.depth ?? 1,
        bestMoveUci,
        pv: primary?.pv ?? (bestMoveUci ? [bestMoveUci] : []),
        altMoveUci: alt?.pv[0],
        altCp: alt?.cp,
        altMate: alt?.mate,
        altPv: alt?.pv,
      };

      this.activeSearch = null;
      search.resolve(result);
    }
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
      void this.drainQueue();
    });
  }

  private async drainQueue() {
    if (this.processingQueue) return;
    this.processingQueue = true;
    try {
      while (this.queue.length > 0 && !this.destroyed) {
        const next = this.queue.shift();
        if (next) {
          await next();
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  public stopCurrentSearch() {
    if (this.worker && this.activeSearch) {
      this.worker.postMessage('stop');
    }
  }

  public clearQueue() {
    this.queue = [];
    this.stopCurrentSearch();
  }

  public async evaluatePosition(
    fen: string,
    options: { depth?: number; moveTimeMs?: number; skillLevel?: number; multiPv?: number } = {}
  ): Promise<EngineEvaluation> {
    await this.init();

    return this.enqueue(
      () =>
        new Promise<EngineEvaluation>((resolve, reject) => {
          if (!this.worker || this.destroyed) {
            reject(new Error('Stockfish worker unavailable.'));
            return;
          }

          const chess = new Chess(fen);
          if (chess.isGameOver()) {
            const isMate = chess.isCheckmate();
            const mateScore = isMate ? (chess.turn() === 'w' ? -30000 : 30000) : 0;
            resolve({
              cp: mateScore,
              mate: isMate ? 0 : undefined,
              depth: 0,
              bestMoveUci: '',
              pv: [],
            });
            return;
          }

          const skillLevel = options.skillLevel ?? 20;
          const multiPv = options.multiPv ?? 1;
          const depth = options.depth ?? 12;
          const moveTimeMs = options.moveTimeMs;

          this.activeSearch = {
            fen,
            resolve,
            reject,
            candidates: new Map(),
            turn: chess.turn(),
          };

          this.worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
          this.worker.postMessage(`setoption name MultiPV value ${multiPv}`);
          this.worker.postMessage(`position fen ${fen}`);

          if (moveTimeMs && depth) {
            this.worker.postMessage(`go depth ${depth} movetime ${moveTimeMs}`);
          } else if (moveTimeMs) {
            this.worker.postMessage(`go movetime ${moveTimeMs}`);
          } else {
            this.worker.postMessage(`go depth ${depth}`);
          }
        })
    );
  }

  public async getBestMoveForDifficulty(
    fen: string,
    difficulty: DifficultyLevel
  ): Promise<{ moveUci: string; evaluation: EngineEvaluation }> {
    const cfg = DIFFICULTY_CONFIGS[difficulty];
    const evaluation = await this.evaluatePosition(fen, {
      skillLevel: cfg.skillLevel,
      depth: cfg.depth,
      moveTimeMs: cfg.moveTimeMs,
      multiPv: cfg.multiPv,
    });

    // At BEGINNER level, occasionally pick the 2nd or 3rd engine candidate move if not losing by forced mate
    // so beginners experience natural human-like imprecisions while every move remains 100% Stockfish-derived & legal.
    let chosenUci = evaluation.bestMoveUci;
    if (difficulty === 'BEGINNER' && evaluation.altMoveUci && Math.random() < 0.35) {
      if (evaluation.altMate === undefined || Math.abs(evaluation.altMate) > 3) {
        chosenUci = evaluation.altMoveUci;
      }
    }

    return { moveUci: chosenUci, evaluation };
  }

  public destroy() {
    this.destroyed = true;
    this.queue = [];
    if (this.activeSearch) {
      this.activeSearch.reject(new Error('Engine terminated.'));
      this.activeSearch = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.ready = false;
    this.initPromise = null;
  }
}

let sharedEngine: StockfishEngineService | null = null;

export function getSharedStockfish(): StockfishEngineService {
  if (!sharedEngine) {
    sharedEngine = new StockfishEngineService();
  }
  return sharedEngine;
}
