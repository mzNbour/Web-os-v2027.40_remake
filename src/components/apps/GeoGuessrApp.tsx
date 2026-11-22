import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Check,
  Compass,
  Copy,
  Globe2,
  Heart,
  Lock,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  Unlock,
  User,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  GEOGUESSR_MAPS,
  calculateGeoScore,
  formatDistance,
  haversineDistanceKm,
  pickRandomMapLocations,
  type GeoCoord,
  type GeoMapId,
  type GeoMoveMode,
} from '../../data/geoguessrLocations';
import { getGameWsUrl } from '../../utils/wsRelay';
import {
  PanoramaxStage,
  prefetchPanoramaxCoord,
  prefetchPanoramaxTargets,
  type PanoramaxTarget,
} from './geoguessr/PanoramaxStage';
import { LeafletMiniMap, LeafletResultMap, type ResultRoundPlot } from './geoguessr/LeafletGeoMap';

type ScreenState =
  | 'menu'
  | 'queue_waiting'
  | 'room_lobby'
  | 'playing'
  | 'round_result'
  | 'final_summary';

type PlayKind = 'solo' | 'online';
type OnlineFormat = 'duels' | 'classic5';
type MiniMapSize = 'sm' | 'md' | 'lg';

interface SoloRoundResult {
  roundNumber: number;
  actual: GeoCoord & { heading: number; panoId?: string; locationLabel?: string };
  guess: GeoCoord | null;
  distanceKm: number | null;
  score: number;
}

interface OnlinePlayerView {
  id: string;
  name: string;
  hp: number;
  totalScore: number;
  hasGuessed: boolean;
  guess: GeoCoord | null;
  readyForNext: boolean;
  wantsRematch: boolean;
  connected: boolean;
}

interface OnlineRoundHistoryEntry {
  roundNumber: number;
  actual: GeoCoord & { panoId?: string; locationLabel?: string };
  multiplier: number;
  results: Record<
    string,
    {
      guess: GeoCoord | null;
      distanceKm: number | null;
      score: number;
      damageDealt: number;
      damageTaken: number;
    }
  >;
}

interface OnlineRoomView {
  roomCode: string;
  hostId: string;
  youId: string;
  format: OnlineFormat;
  mapId: GeoMapId;
  moveMode: GeoMoveMode;
  roundTimeSec: number;
  status: 'lobby' | 'playing' | 'round_result' | 'match_over';
  currentRound: number;
  maxRounds: number;
  multiplier: number;
  target: (PanoramaxTarget & { locationLabel?: string }) | null;
  roundStartedAt: number | null;
  roundDeadlineAt: number | null;
  countdownEndAt: number | null;
  winnerId: string | null;
  players: OnlinePlayerView[];
  lastRound: OnlineRoundHistoryEntry | null;
  history: OnlineRoundHistoryEntry[];
}

interface GeoGuessrAppProps {
  username?: string;
  language?: 'ja' | 'en';
}

const MOVE_MODE_LABELS: Record<GeoMoveMode, { ja: string; en: string; descJa: string }> = {
  moving: { ja: 'Moving (移動可)', en: 'Moving', descJa: '移動・回転・ズームすべて可能' },
  nomove: { ja: 'No Move (移動禁止)', en: 'No Move', descJa: 'その場で360°回転とズームのみ' },
  nmpz: { ja: 'NMPZ (完全固定)', en: 'NMPZ', descJa: '移動・視点変更・ズームすべて禁止' },
};

const BEST_SCORE_STORAGE_KEY = 'abord_geoguessr_best_v1';

function loadBestScores(): Record<string, number> {
  try {
    const raw = localStorage.getItem(BEST_SCORE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveBestScore(mapId: GeoMapId, score: number) {
  try {
    const prev = loadBestScores();
    if ((prev[mapId] || 0) < score) {
      prev[mapId] = score;
      localStorage.setItem(BEST_SCORE_STORAGE_KEY, JSON.stringify(prev));
    }
  } catch {
    // ignore storage quota errors
  }
}

function getHeadingLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const norm = ((deg % 360) + 360) % 360;
  return dirs[Math.round(norm / 45) % 8];
}

function getRankBadge(totalScore: number): { rank: string; color: string; labelJa: string } {
  if (totalScore >= 23500) return { rank: 'S+', color: 'text-amber-300 border-amber-400/50 bg-amber-500/20', labelJa: '伝説の探検家' };
  if (totalScore >= 20000) return { rank: 'S', color: 'text-emerald-300 border-emerald-400/50 bg-emerald-500/20', labelJa: 'マスタージオグラファー' };
  if (totalScore >= 15000) return { rank: 'A', color: 'text-sky-300 border-sky-400/50 bg-sky-500/20', labelJa: '熟練トラベラー' };
  if (totalScore >= 10000) return { rank: 'B', color: 'text-indigo-300 border-indigo-400/50 bg-indigo-500/20', labelJa: '世界旅行者' };
  return { rank: 'C', color: 'text-slate-300 border-slate-500/40 bg-slate-600/20', labelJa: 'ルーキー冒険家' };
}

export const GeoGuessrApp: React.FC<GeoGuessrAppProps> = ({ username = 'Player', language = 'ja' }) => {
  const isJa = language === 'ja';
  const isStaticPagesHost =
    typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');

  // Menu & Settings
  const [playTab, setPlayTab] = useState<PlayKind>('solo');
  const [selectedMapId, setSelectedMapId] = useState<GeoMapId>('world');
  const [selectedMoveMode, setSelectedMoveMode] = useState<GeoMoveMode>('moving');
  const [selectedTimeSec, setSelectedTimeSec] = useState<number>(90);
  const [onlineFormat, setOnlineFormat] = useState<OnlineFormat>('duels');
  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem('abord_geoguessr_name') || username || 'Explorer';
    } catch {
      return username || 'Explorer';
    }
  });
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [bestScores, setBestScores] = useState<Record<string, number>>(loadBestScores);

  // Screen & Active Play State
  const [screen, setScreen] = useState<ScreenState>('menu');
  const [modeKind, setModeKind] = useState<PlayKind>('solo');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);

  // Solo State
  const [soloTargets, setSoloTargets] = useState<PanoramaxTarget[]>([]);
  const [soloRoundIdx, setSoloRoundIdx] = useState<number>(0);
  const [soloActual, setSoloActual] = useState<(PanoramaxTarget & { locationLabel?: string }) | null>(null);
  const [soloResults, setSoloResults] = useState<SoloRoundResult[]>([]);
  const [soloDeadlineAt, setSoloDeadlineAt] = useState<number | null>(null);
  const [hdQuality, setHdQuality] = useState<boolean>(false);

  // Shared Round Interaction State
  const [guessPin, setGuessPin] = useState<GeoCoord | null>(null);
  const [headingDeg, setHeadingDeg] = useState<number>(0);
  const [timeRemainingSec, setTimeRemainingSec] = useState<number | null>(null);
  const [pressureCountdownSec, setPressureCountdownSec] = useState<number | null>(null);
  const [panoWarning, setPanoWarning] = useState<string | null>(null);

  // Mini-Map State
  const [miniMapSize, setMiniMapSize] = useState<MiniMapSize>('sm');
  const [miniMapLocked, setMiniMapLocked] = useState<boolean>(false);
  const [miniMapHover, setMiniMapHover] = useState<boolean>(false);

  // Online WS State
  const wsRef = useRef<WebSocket | null>(null);
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomView | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const panoActionsRef = useRef<{
    resetToStart: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    snapNorth: () => void;
  } | null>(null);

  const registerPanoActions = useCallback(
    (actions: {
      resetToStart: () => void;
      zoomIn: () => void;
      zoomOut: () => void;
      snapNorth: () => void;
    }) => {
      panoActionsRef.current = actions;
    },
    []
  );

  // Persist player name
  useEffect(() => {
    try {
      if (playerName.trim()) {
        localStorage.setItem('abord_geoguessr_name', playerName.trim());
      }
    } catch {
      // ignore
    }
  }, [playerName]);

  // WebSocket Management for Online Mode
  const ensureSocket = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        resolve(wsRef.current);
        return;
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
      }
      const ws = new WebSocket(getGameWsUrl());
      wsRef.current = ws;

      const timer = window.setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 6000);

      ws.onopen = () => {
        window.clearTimeout(timer);
        resolve(ws);
      };

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (!data) return;
          if (data.type === 'geo_queue_waiting') {
            setScreen('queue_waiting');
            setStatusMessage(null);
          } else if (data.type === 'geo_queue_cancelled') {
            setScreen('menu');
          } else if (data.type === 'geo_error') {
            setStatusMessage(data.message || 'オンライン接続エラーが発生しました');
          } else if (data.type === 'geo_opponent_left') {
            setStatusMessage('対戦相手がルームを退出しました。');
          } else if (data.type === 'geo_room_state' && data.room) {
            const r = data.room as OnlineRoomView;
            setOnlineRoom(r);
            setModeKind('online');
            if (r.status === 'lobby') {
              setScreen('room_lobby');
            } else if (r.status === 'playing') {
              setScreen('playing');
            } else if (r.status === 'round_result') {
              setScreen('round_result');
            } else if (r.status === 'match_over') {
              setScreen('final_summary');
            }
          }
        } catch (err) {
          console.error('GeoGuessr WS parse error:', err);
        }
      };

      ws.onerror = () => {
        window.clearTimeout(timer);
        setStatusMessage(
          isStaticPagesHost
            ? 'GitHub Pages の静的公開版ではオンライン対戦サーバーが利用できません。一人プレー (Solo) は完全無料・APIキー不要でお楽しみいただけます！'
            : 'オンラインサーバーへの接続に失敗しました。'
        );
        reject(new Error('WS error'));
      };
    });
  }, [isStaticPagesHost]);

  // Cleanup WS on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try {
          if (wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'geo_leave_room' }));
          }
          wsRef.current.close();
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
  }, []);

  // Reset local guess pin when a new online round starts
  const onlineRoundMarker = onlineRoom ? `${onlineRoom.roomCode}-${onlineRoom.currentRound}-${onlineRoom.status}` : '';
  const prevOnlineRoundRef = useRef<string>('');
  useEffect(() => {
    if (!onlineRoom) return;
    const key = `${onlineRoom.roomCode}-${onlineRoom.currentRound}`;
    if (onlineRoom.status === 'playing' && prevOnlineRoundRef.current !== key) {
      prevOnlineRoundRef.current = key;
      setGuessPin(null);
      setPanoWarning(null);
      setConfirmQuit(false);
    }
  }, [onlineRoom, onlineRoundMarker]);

  // ─── Solo Mode Controls ───
  const startSoloGame = () => {
    const targets = pickRandomMapLocations(selectedMapId, 5);
    setModeKind('solo');
    setSoloTargets(targets);
    setSoloRoundIdx(0);
    setSoloActual({ ...targets[0] });
    setSoloResults([]);
    setGuessPin(null);
    setPanoWarning(null);
    setConfirmQuit(false);
    setSoloDeadlineAt(selectedTimeSec > 0 ? Date.now() + selectedTimeSec * 1000 : null);
    setStatusMessage(null);
    setScreen('playing');
    // Batch-resolve all 5 round links & pre-warm Round 1-2 SD images (~196 KB)
    void prefetchPanoramaxTargets(targets, selectedMoveMode === 'moving');
  };

  const submitSoloGuess = useCallback(
    (_forcedNull = false) => {
      if (screen !== 'playing' || modeKind !== 'solo' || !soloActual) return;
      const usedGuess = guessPin;
      const mapCfg = GEOGUESSR_MAPS[selectedMapId] || GEOGUESSR_MAPS.world;
      const distanceKm = usedGuess ? haversineDistanceKm(usedGuess, soloActual) : null;
      const score = distanceKm !== null ? calculateGeoScore(distanceKm, mapCfg.scaleKm) : 0;

      const entry: SoloRoundResult = {
        roundNumber: soloRoundIdx + 1,
        actual: { ...soloActual },
        guess: usedGuess,
        distanceKm,
        score,
      };
      setSoloResults((prev) => {
        const next = [...prev, entry];
        if (next.length >= 5) {
          const total = next.reduce((acc, r) => acc + r.score, 0);
          saveBestScore(selectedMapId, total);
          setBestScores(loadBestScores());
        }
        return next;
      });
      setSoloDeadlineAt(null);
      setScreen('round_result');
    },
    [screen, modeKind, soloActual, guessPin, selectedMapId, soloRoundIdx]
  );

  const handleSoloNextRound = () => {
    if (soloRoundIdx + 1 >= 5) {
      setScreen('final_summary');
      return;
    }
    const nextIdx = soloRoundIdx + 1;
    const nextTarget = soloTargets[nextIdx];
    setSoloRoundIdx(nextIdx);
    setSoloActual({ ...nextTarget });
    setGuessPin(null);
    setPanoWarning(null);
    setSoloDeadlineAt(selectedTimeSec > 0 ? Date.now() + selectedTimeSec * 1000 : null);
    setScreen('playing');
    const upcomingAfter = soloTargets[nextIdx + 1];
    if (upcomingAfter) {
      void prefetchPanoramaxCoord(
        upcomingAfter.lat,
        upcomingAfter.lng,
        selectedMoveMode === 'moving',
        upcomingAfter.sdUrl,
        upcomingAfter.panoId
      );
    }
  };

  // ─── Online Mode Actions ───
  const handleQuickMatch = async () => {
    setStatusMessage(null);
    try {
      const ws = await ensureSocket();
      ws.send(
        JSON.stringify({
          type: 'geo_queue_join',
          name: playerName.trim() || 'Explorer',
          format: onlineFormat,
          mapId: selectedMapId,
          moveMode: selectedMoveMode,
          roundTimeSec: selectedTimeSec,
        })
      );
    } catch {
      // statusMessage set by onerror
    }
  };

  const handleCancelQueue = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'geo_queue_leave' }));
    }
    setScreen('menu');
  };

  const handleCreateRoom = async () => {
    setStatusMessage(null);
    try {
      const ws = await ensureSocket();
      ws.send(
        JSON.stringify({
          type: 'geo_room_create',
          name: playerName.trim() || 'Host',
          format: onlineFormat,
          mapId: selectedMapId,
          moveMode: selectedMoveMode,
          roundTimeSec: selectedTimeSec,
        })
      );
    } catch {
      // statusMessage set by onerror
    }
  };

  const handleJoinRoom = async () => {
    const code = joinRoomInput.trim().toUpperCase();
    if (!code) {
      setStatusMessage('ルームコードを入力してください。');
      return;
    }
    setStatusMessage(null);
    try {
      const ws = await ensureSocket();
      ws.send(
        JSON.stringify({
          type: 'geo_room_join',
          roomCode: code,
          name: playerName.trim() || 'Guest',
        })
      );
    } catch {
      // statusMessage set by onerror
    }
  };

  const handleStartOnlineMatch = () => {
    if (!onlineRoom || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'geo_room_start', roomCode: onlineRoom.roomCode }));
  };

  const handleSubmitOnlineGuess = useCallback(() => {
    if (!onlineRoom || !guessPin || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({
        type: 'geo_guess_submit',
        roomCode: onlineRoom.roomCode,
        lat: guessPin.lat,
        lng: guessPin.lng,
      })
    );
  }, [onlineRoom, guessPin]);

  const handleOnlineNextRound = () => {
    if (!onlineRoom || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'geo_next_round', roomCode: onlineRoom.roomCode }));
  };

  const handleOnlineRematch = () => {
    if (!onlineRoom || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'geo_rematch', roomCode: onlineRoom.roomCode }));
  };

  const handleLeaveToMenu = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'geo_leave_room' }));
    }
    setOnlineRoom(null);
    setConfirmQuit(false);
    setStatusMessage(null);
    setScreen('menu');
  };

  const handleMapClick = (coord: GeoCoord) => {
    if (screen !== 'playing') return;
    if (modeKind === 'online') {
      const me = onlineRoom?.players.find((p) => p.id === onlineRoom.youId);
      if (me?.hasGuessed) return;
      if (onlineRoom && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'geo_guess_pin',
            roomCode: onlineRoom.roomCode,
            lat: coord.lat,
            lng: coord.lng,
          })
        );
      }
    }
    setGuessPin(coord);
  };

  // Timers (Solo round deadline + Online round deadline + 15s pressure countdown)
  useEffect(() => {
    if (screen !== 'playing') {
      setTimeRemainingSec(null);
      setPressureCountdownSec(null);
      return;
    }

    const tick = () => {
      const now = Date.now();
      if (modeKind === 'solo') {
        if (soloDeadlineAt) {
          const left = Math.max(0, Math.ceil((soloDeadlineAt - now) / 1000));
          setTimeRemainingSec(left);
          if (left <= 0) {
            submitSoloGuess(true);
          }
        } else {
          setTimeRemainingSec(null);
        }
        setPressureCountdownSec(null);
      } else if (onlineRoom) {
        if (onlineRoom.roundDeadlineAt) {
          setTimeRemainingSec(Math.max(0, Math.ceil((onlineRoom.roundDeadlineAt - now) / 1000)));
        } else {
          setTimeRemainingSec(null);
        }
        if (onlineRoom.countdownEndAt) {
          setPressureCountdownSec(Math.max(0, Math.ceil((onlineRoom.countdownEndAt - now) / 1000)));
        } else {
          setPressureCountdownSec(null);
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [screen, modeKind, soloDeadlineAt, onlineRoom, submitSoloGuess]);

  // Keyboard shortcuts during play (Space to submit guess, R to return to start)
  useEffect(() => {
    if (screen !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.code === 'KeyR') {
        e.preventDefault();
        panoActionsRef.current?.resetToStart();
      } else if (e.code === 'Space' && guessPin) {
        e.preventDefault();
        if (modeKind === 'solo') {
          submitSoloGuess(false);
        } else {
          const me = onlineRoom?.players.find((p) => p.id === onlineRoom.youId);
          if (!me?.hasGuessed) {
            handleSubmitOnlineGuess();
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, guessPin, modeKind, onlineRoom, submitSoloGuess, handleSubmitOnlineGuess]);

  // Active target & map config
  const activeMapId: GeoMapId = modeKind === 'online' && onlineRoom ? onlineRoom.mapId : selectedMapId;
  const activeMoveMode: GeoMoveMode =
    modeKind === 'online' && onlineRoom ? onlineRoom.moveMode : selectedMoveMode;
  const activeMapCfg = GEOGUESSR_MAPS[activeMapId] || GEOGUESSR_MAPS.world;

  const activeTarget = useMemo(() => {
    if (modeKind === 'solo') return soloActual;
    return onlineRoom?.target || null;
  }, [modeKind, soloActual, onlineRoom]);

  const activeRoundKey =
    modeKind === 'solo'
      ? `solo-${soloRoundIdx}`
      : `online-${onlineRoom?.roomCode}-${onlineRoom?.currentRound}`;

  const handlePanoramaResolved = useCallback(
    (info: { lat: number; lng: number; panoId: string; locationLabel?: string }) => {
      setPanoWarning(null);
      if (modeKind === 'solo') {
        setSoloActual((prev) =>
          prev
            ? {
                ...prev,
                lat: info.lat,
                lng: info.lng,
                panoId: info.panoId,
                locationLabel: info.locationLabel,
              }
            : prev
        );
        const upcoming = soloTargets[soloRoundIdx + 1];
        if (upcoming) {
          void prefetchPanoramaxCoord(
            upcoming.lat,
            upcoming.lng,
            selectedMoveMode === 'moving',
            upcoming.sdUrl,
            upcoming.panoId
          );
        }
      } else if (modeKind === 'online' && onlineRoom && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'geo_pano_verified',
            roomCode: onlineRoom.roomCode,
            roundNumber: onlineRoom.currentRound,
            actual: info,
          })
        );
      }
    },
    [modeKind, onlineRoom, soloTargets, soloRoundIdx, selectedMoveMode]
  );

  // Derived Online Player Views
  const mePlayer = onlineRoom?.players.find((p) => p.id === onlineRoom.youId) || null;
  const oppPlayer = onlineRoom?.players.find((p) => p.id !== onlineRoom.youId) || null;

  // Derived Mini-Map dimensions
  const isMiniMapExpanded = miniMapLocked || miniMapHover || miniMapSize !== 'sm';
  const miniMapDimensions = useMemo(() => {
    if (miniMapSize === 'lg') return 'w-[460px] max-w-[calc(100vw-48px)] h-[320px]';
    if (miniMapSize === 'md' || (miniMapHover && miniMapSize === 'sm'))
      return 'w-[360px] max-w-[calc(100vw-48px)] h-[240px]';
    return 'w-[240px] h-[160px]';
  }, [miniMapSize, miniMapHover]);

  // Solo totals
  const soloTotalScore = useMemo(
    () => soloResults.reduce((sum, r) => sum + r.score, 0),
    [soloResults]
  );

  // Result Map plots
  const roundResultPlots = useMemo<ResultRoundPlot[]>(() => {
    if (screen !== 'round_result') return [];
    const lastSolo = modeKind === 'solo' ? soloResults[soloResults.length - 1] : null;
    const lastOnline = modeKind === 'online' ? onlineRoom?.lastRound : null;
    const actualCoord = lastSolo?.actual || lastOnline?.actual;
    if (!actualCoord) return [];

    const guesses: ResultRoundPlot['guesses'] = [];
    if (lastSolo?.guess) {
      guesses.push({ key: 'solo-you', coord: lastSolo.guess, color: '#38bdf8', label: 'YOU' });
    }
    if (lastOnline && onlineRoom) {
      onlineRoom.players.forEach((p) => {
        const res = lastOnline.results[p.id];
        if (!res?.guess) return;
        const isMe = p.id === onlineRoom.youId;
        guesses.push({
          key: p.id,
          coord: res.guess,
          color: isMe ? '#38bdf8' : '#fb7185',
          label: p.name.slice(0, 8),
        });
      });
    }
    return [
      {
        roundNumber: lastSolo?.roundNumber || lastOnline?.roundNumber || 1,
        actual: actualCoord,
        guesses,
        showRoundNumber: false,
      },
    ];
  }, [screen, modeKind, soloResults, onlineRoom]);

  // Final summary Map plots
  const summaryPlots = useMemo<ResultRoundPlot[]>(() => {
    if (screen !== 'final_summary') return [];
    if (modeKind === 'solo') {
      return soloResults.map((r) => ({
        roundNumber: r.roundNumber,
        actual: r.actual,
        guesses: r.guess ? [{ key: `r-${r.roundNumber}`, coord: r.guess, color: '#38bdf8' }] : [],
        showRoundNumber: true,
      }));
    }
    return (onlineRoom?.history || []).map((h) => {
      const g = mePlayer ? h.results[mePlayer.id]?.guess || null : null;
      return {
        roundNumber: h.roundNumber,
        actual: h.actual,
        guesses: g ? [{ key: `r-${h.roundNumber}`, coord: g, color: '#38bdf8' }] : [],
        showRoundNumber: true,
      };
    });
  }, [screen, modeKind, soloResults, onlineRoom, mePlayer]);

  return (
    <div className="relative w-full h-full bg-[#0b101b] text-slate-100 overflow-hidden select-none flex flex-col font-sans">
      {/* ─── MENU SCREEN ─── */}
      {screen === 'menu' && (
        <div className="relative flex-1 overflow-y-auto p-5 md:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.14),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.12),transparent_55%)] pointer-events-none" />

          <div className="relative max-w-5xl mx-auto flex flex-col gap-5">
            {/* Brand Header & Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-950/50 border border-emerald-300/30 flex items-center justify-center">
                  <Globe2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-white">GeoGuessr</h1>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                      Panoramax + OSM · APIキー不要
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    360°ストリートパノラマと OpenStreetMap で世界の現在地を推測（完全無料）
                  </p>
                </div>
              </div>

              {/* Solo / Online Segmented Switch */}
              <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => {
                    setPlayTab('solo');
                    setStatusMessage(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    playTab === 'solo'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>一人プレー (Solo)</span>
                </button>
                <button
                  onClick={() => {
                    setPlayTab('online');
                    setStatusMessage(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    playTab === 'online'
                      ? 'bg-amber-400 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>オンライン対戦 (Online)</span>
                </button>
              </div>
            </div>

            {statusMessage && (
              <div className="px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-200 text-xs font-semibold flex items-center justify-between gap-2">
                <span>{statusMessage}</span>
                <button onClick={() => setStatusMessage(null)} className="opacity-70 hover:opacity-100 shrink-0 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Map Pack Selection */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  1. マップを選択 (Select Map)
                </h2>
                <span className="text-[11px] text-slate-400">
                  マップ範囲に応じて距離スコア曲線が最適化されます
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.keys(GEOGUESSR_MAPS) as GeoMapId[]).map((mapId) => {
                  const cfg = GEOGUESSR_MAPS[mapId];
                  const isSelected = selectedMapId === mapId;
                  const best = bestScores[mapId];
                  return (
                    <button
                      key={mapId}
                      onClick={() => setSelectedMapId(mapId)}
                      className={`group text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'bg-slate-800/95 border-emerald-400 ring-2 ring-emerald-400/30 shadow-lg'
                          : 'bg-slate-900/75 border-white/10 hover:border-white/25 hover:bg-slate-800/70'
                      }`}
                    >
                      <div
                        className="h-1.5 w-14 rounded-full mb-2.5"
                        style={{
                          background: `linear-gradient(90deg, ${cfg.accentFrom}, ${cfg.accentTo})`,
                        }}
                      />
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-white leading-snug">
                          {isJa ? cfg.nameJa : cfg.nameEn}
                        </h3>
                        {best !== undefined && (
                          <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-400/25 shrink-0">
                            BEST {best.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {isJa ? cfg.descJa : cfg.descEn}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Game Rules Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-900/70 border border-white/10 rounded-2xl p-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  2. 移動ルール (Movement Mode)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['moving', 'nomove', 'nmpz'] as GeoMoveMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSelectedMoveMode(mode)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        selectedMoveMode === mode
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                          : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <div className="text-xs font-bold">{MOVE_MODE_LABELS[mode].en}</div>
                      <div className="text-[10px] opacity-75 mt-0.5">
                        {mode === 'moving' ? '移動可' : mode === 'nomove' ? '視点のみ' : '完全固定'}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {MOVE_MODE_LABELS[selectedMoveMode].descJa}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  3. 1ラウンド制限時間 (Round Timer)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: 0, label: '無制限' },
                    { val: 60, label: '60秒' },
                    { val: 90, label: '90秒' },
                    { val: 120, label: '120秒' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setSelectedTimeSec(opt.val)}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer tabular-nums ${
                        selectedTimeSec === opt.val
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                          : 'bg-slate-950/60 border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Panel: Solo vs Online */}
            {playTab === 'solo' ? (
              <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-slate-900/90 border border-emerald-500/30 rounded-2xl p-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Play className="w-4 h-4 text-emerald-400" />
                    クラシック 5ラウンド挑戦
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    選択中: <strong className="text-emerald-300">{GEOGUESSR_MAPS[selectedMapId].nameJa}</strong> ·{' '}
                    {MOVE_MODE_LABELS[selectedMoveMode].ja} · 満点 25,000 pts
                  </p>
                </div>
                <button
                  onClick={startSoloGame}
                  className="px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-950/60 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>ゲームスタート</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-900/85 border border-amber-400/25 rounded-2xl p-5 flex flex-col gap-4">
                {isStaticPagesHost && (
                  <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-400/25 text-amber-200 text-[11px]">
                    ※ GitHub Pages 上の静的サイトでは WebSocket サーバーがないため、オンライン対戦は Node サーバー環境でのみ動作します。一人プレー (Solo) はブラウザだけで今すぐ遊べます。
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Online Format */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      対戦形式 (Online Format)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setOnlineFormat('duels')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          onlineFormat === 'duels'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-100'
                            : 'bg-slate-950/60 border-white/10 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <Heart className="w-3.5 h-3.5 text-rose-400" />
                          <span>Duels (6,000 HP)</span>
                        </div>
                        <p className="text-[10px] opacity-75 mt-1">
                          スコア差がダメージに！終盤倍率アップ
                        </p>
                      </button>
                      <button
                        onClick={() => setOnlineFormat('classic5')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          onlineFormat === 'classic5'
                            ? 'bg-sky-500/20 border-sky-400 text-sky-100'
                            : 'bg-slate-950/60 border-white/10 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <Trophy className="w-3.5 h-3.5 text-sky-400" />
                          <span>5ラウンド対戦</span>
                        </div>
                        <p className="text-[10px] opacity-75 mt-1">
                          5ラウンド合計スコアで勝敗を決定
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Player Name */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      プレイヤー名 (Nickname)
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      maxLength={24}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="プレイヤー名を入力"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      1人目が推測を確定すると相手側で15秒カウントダウンが開始します
                    </p>
                  </div>
                </div>

                {/* Quick Match / Create Room / Join Room */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/10">
                  <button
                    onClick={handleQuickMatch}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    <span>クイックマッチ (自動対戦)</span>
                  </button>

                  <button
                    onClick={handleCreateRoom}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>プライベートルーム作成</span>
                  </button>

                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={joinRoomInput}
                      maxLength={8}
                      onChange={(e) => setJoinRoomInput(e.target.value.toUpperCase())}
                      placeholder="コード (例: A7K2P9)"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono uppercase tracking-wider text-white focus:outline-none focus:border-sky-400"
                    />
                    <button
                      onClick={handleJoinRoom}
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
                    >
                      参加
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── QUEUE WAITING SCREEN ─── */}
      {screen === 'queue_waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin" />
            <Swords className="w-8 h-8 text-amber-300 absolute inset-0 m-auto" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">対戦相手を探しています...</h2>
            <p className="text-xs text-slate-400 mt-1.5">
              形式: {onlineFormat === 'duels' ? 'Duels (6,000 HP)' : '5ラウンド対戦'} ·{' '}
              {GEOGUESSR_MAPS[selectedMapId].nameJa}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              別ウィンドウや別ブラウザからオンライン対戦を開くと即座にマッチングします
            </p>
          </div>
          <button
            onClick={handleCancelQueue}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-bold text-slate-200 cursor-pointer"
          >
            マッチングをキャンセル
          </button>
        </div>
      )}

      {/* ─── PRIVATE ROOM LOBBY ─── */}
      {screen === 'room_lobby' && onlineRoom && (
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
          <div className="w-full max-w-xl bg-slate-900/90 border border-white/15 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Online Match Lobby
                </span>
                <h2 className="text-xl font-black text-white mt-0.5">対戦ルーム待機中</h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-amber-400/40 font-mono text-base font-black tracking-widest text-amber-300">
                  {onlineRoom.roomCode}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(onlineRoom.roomCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 1800);
                  }}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 cursor-pointer"
                  title="コードをコピー"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Players */}
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((idx) => {
                const p = onlineRoom.players[idx];
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border ${
                      p
                        ? 'bg-slate-800/80 border-emerald-400/35'
                        : 'bg-slate-950/60 border-dashed border-white/15'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Player {idx + 1} {p?.id === onlineRoom.hostId ? '(HOST)' : ''}
                    </div>
                    <div className="text-sm font-bold text-white mt-1 truncate">
                      {p ? p.name : '参加待ち...'}
                    </div>
                    {p && p.id === onlineRoom.youId && (
                      <span className="inline-block mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        あなた
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Room Rules Summary */}
            <div className="bg-slate-950/70 rounded-xl p-3.5 border border-white/10 flex flex-wrap gap-3 text-xs text-slate-300">
              <span>
                形式: <strong className="text-white">{onlineRoom.format === 'duels' ? 'Duels (6,000 HP)' : '5ラウンド対戦'}</strong>
              </span>
              <span>·</span>
              <span>
                マップ: <strong className="text-white">{GEOGUESSR_MAPS[onlineRoom.mapId]?.nameJa}</strong>
              </span>
              <span>·</span>
              <span>
                移動: <strong className="text-white">{MOVE_MODE_LABELS[onlineRoom.moveMode]?.ja}</strong>
              </span>
              <span>·</span>
              <span>
                制限時間: <strong className="text-white">{onlineRoom.roundTimeSec > 0 ? `${onlineRoom.roundTimeSec}秒` : '無制限'}</strong>
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleLeaveToMenu}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
              >
                退出する
              </button>
              {onlineRoom.hostId === onlineRoom.youId ? (
                <button
                  disabled={onlineRoom.players.length < 2}
                  onClick={handleStartOnlineMatch}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
                    onlineRoom.players.length >= 2
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-lg'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{onlineRoom.players.length >= 2 ? '対戦スタート' : '相手の参加を待機中...'}</span>
                </button>
              ) : (
                <span className="text-xs font-semibold text-amber-300">
                  ホストがゲームを開始するのを待っています...
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── PLAYING SCREEN (FULLSCREEN 360° PANORAMAX + EXPANDABLE OSM MINI-MAP) ─── */}
      {screen === 'playing' && activeTarget && (
        <div className="relative flex-1 w-full h-full min-h-[320px]">
          <PanoramaxStage
            target={activeTarget}
            moveMode={activeMoveMode}
            roundKey={activeRoundKey}
            hdQuality={hdQuality}
            fallbackCoords={activeMapCfg.coords}
            allowAltFallback={modeKind === 'solo'}
            deterministicPick={modeKind === 'online'}
            onHeadingChange={setHeadingDeg}
            onPanoramaResolved={handlePanoramaResolved}
            onPanoramaError={(msg) => setPanoWarning(msg)}
            registerActions={registerPanoActions}
          />

          {/* Top HUD Bar (solid/translucent without backdrop-blur over WebGL) */}
          <div className="absolute top-3 inset-x-3 z-30 flex items-start justify-between gap-2 pointer-events-none">
            {/* Left: Back / Quit + Map & Mode Badge */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {!confirmQuit ? (
                <button
                  onClick={() => setConfirmQuit(true)}
                  className="px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-white/15 text-xs font-bold text-slate-200 shadow-lg cursor-pointer"
                >
                  メニュー
                </button>
              ) : (
                <div className="flex items-center gap-1.5 bg-slate-950/95 border border-rose-400/40 rounded-xl px-2.5 py-1.5 shadow-lg">
                  <span className="text-[11px] font-bold text-rose-200">終了しますか？</span>
                  <button
                    onClick={handleLeaveToMenu}
                    className="px-2 py-1 rounded bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                  >
                    はい
                  </button>
                  <button
                    onClick={() => setConfirmQuit(false)}
                    className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[11px] font-bold cursor-pointer"
                  >
                    いいえ
                  </button>
                </div>
              )}

              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/90 border border-white/15 text-xs shadow-lg">
                <span className="font-bold text-white">{activeMapCfg.nameEn}</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold text-emerald-300 uppercase">
                  {MOVE_MODE_LABELS[activeMoveMode].en}
                </span>
              </div>
            </div>

            {/* Center/Right: Score / HP / Timer HUD */}
            {modeKind === 'solo' ? (
              <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950/92 border border-white/15 shadow-xl pointer-events-auto tabular-nums">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">ROUND</div>
                  <div className="text-sm font-black text-white">{soloRoundIdx + 1} / 5</div>
                </div>
                <div className="w-px h-7 bg-white/10" />
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">SCORE</div>
                  <div className="text-sm font-black text-emerald-400">
                    {soloTotalScore.toLocaleString()}
                  </div>
                </div>
                {timeRemainingSec !== null && (
                  <>
                    <div className="w-px h-7 bg-white/10" />
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">TIME</div>
                      <div
                        className={`text-sm font-black flex items-center gap-1 ${
                          timeRemainingSec <= 15 ? 'text-rose-400' : 'text-amber-300'
                        }`}
                      >
                        <Timer className="w-3.5 h-3.5" />
                        <span>{timeRemainingSec}s</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              onlineRoom && (
                <div className="flex flex-col items-end gap-2 pointer-events-auto">
                  <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-slate-950/92 border border-white/15 shadow-xl tabular-nums">
                    {/* You */}
                    <div className="min-w-[110px]">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-sky-300 truncate max-w-[75px]">{mePlayer?.name || 'You'}</span>
                        <span className="text-white">
                          {onlineRoom.format === 'duels'
                            ? `${mePlayer?.hp ?? 0} HP`
                            : `${(mePlayer?.totalScore ?? 0).toLocaleString()}`}
                        </span>
                      </div>
                      {onlineRoom.format === 'duels' && (
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
                            style={{ width: `${Math.min(100, ((mePlayer?.hp ?? 0) / 6000) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Round & Multiplier */}
                    <div className="px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-center">
                      <div className="text-[10px] font-bold text-slate-400">
                        {onlineRoom.format === 'duels'
                          ? `R${onlineRoom.currentRound} · x${onlineRoom.multiplier}`
                          : `R${onlineRoom.currentRound}/5`}
                      </div>
                      <div className="text-xs font-black text-amber-300">
                        {pressureCountdownSec !== null
                          ? `${pressureCountdownSec}s!`
                          : timeRemainingSec !== null
                          ? `${timeRemainingSec}s`
                          : 'LIVE'}
                      </div>
                    </div>

                    {/* Opponent */}
                    <div className="min-w-[110px]">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-rose-300 truncate max-w-[75px]">
                          {oppPlayer?.name || 'Opponent'}
                        </span>
                        <span className="text-white">
                          {onlineRoom.format === 'duels'
                            ? `${oppPlayer?.hp ?? 0} HP`
                            : `${(oppPlayer?.totalScore ?? 0).toLocaleString()}`}
                        </span>
                      </div>
                      {onlineRoom.format === 'duels' && (
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 to-orange-400 transition-all duration-300"
                            style={{ width: `${Math.min(100, ((oppPlayer?.hp ?? 0) / 6000) * 100)}%` }}
                          />
                        </div>
                      )}
                      <div className="text-[9px] text-right mt-0.5 font-bold">
                        {oppPlayer?.hasGuessed ? (
                          <span className="text-emerald-400">推測完了 ✓</span>
                        ) : (
                          <span className="text-slate-400">探索中...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 15s Pressure Countdown Alert */}
                  {pressureCountdownSec !== null && !mePlayer?.hasGuessed && (
                    <div className="px-3.5 py-1.5 rounded-xl bg-rose-600/95 text-white text-xs font-black shadow-lg border border-rose-300/40">
                      相手が推測を確定！ 残り {pressureCountdownSec} 秒！
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {/* Panorama Warning Toast */}
          {panoWarning && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-amber-950/95 border border-amber-400/40 text-amber-200 text-xs font-semibold shadow-xl">
              {panoWarning}
            </div>
          )}

          {/* Bottom-Left: Compass & Panorama Quick Controls */}
          <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2">
            <button
              onClick={() => panoActionsRef.current?.snapNorth()}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-white/15 shadow-lg cursor-pointer"
              title="北を向く (N)"
            >
              <Compass
                className="w-4 h-4 text-rose-400 transition-transform duration-150"
                style={{ transform: `rotate(${-headingDeg}deg)` }}
              />
              <span className="text-xs font-black tabular-nums w-6 text-center text-white">
                {getHeadingLabel(headingDeg)}
              </span>
            </button>

            <button
              onClick={() => panoActionsRef.current?.resetToStart()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-white/15 text-xs font-bold text-slate-200 shadow-lg cursor-pointer"
              title="スタート地点に戻る (R)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">スタート地点 (R)</span>
            </button>

            {activeMoveMode !== 'nmpz' && (
              <div className="flex items-center bg-slate-950/90 border border-white/15 rounded-xl overflow-hidden shadow-lg">
                <button
                  onClick={() => panoActionsRef.current?.zoomIn()}
                  className="p-2 hover:bg-white/10 text-slate-200 cursor-pointer"
                  title="ズームイン"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-white/10" />
                <button
                  onClick={() => panoActionsRef.current?.zoomOut()}
                  className="p-2 hover:bg-white/10 text-slate-200 cursor-pointer"
                  title="ズームアウト"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={() => setHdQuality((v) => !v)}
              className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold shadow-lg cursor-pointer transition-colors ${
                hdQuality
                  ? 'bg-sky-500/90 border-sky-300 text-slate-950'
                  : 'bg-slate-950/90 hover:bg-slate-900 border-white/15 text-slate-300'
              }`}
              title={hdQuality ? '現在: HD高画質モード (クリックで軽量SDに戻す)' : '現在: 軽量SDモード (クリックでHD高画質に切替)'}
            >
              {hdQuality ? 'HD画質' : '軽量SD'}
            </button>
          </div>

          {/* Bottom-Right: Expandable OpenStreetMap Mini-Map + GUESS CTA */}
          <div
            onMouseEnter={() => setMiniMapHover(true)}
            onMouseLeave={() => setMiniMapHover(false)}
            className="absolute bottom-4 right-4 z-30 flex flex-col gap-2 items-end"
          >
            <div
              className={`${miniMapDimensions} transition-all duration-200 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900 relative ${
                isMiniMapExpanded ? 'opacity-100' : 'opacity-92'
              }`}
            >
              {/* Mini-map Size & Lock Controls */}
              <div className="absolute top-2 left-2 z-[450] flex items-center gap-1 bg-slate-950/90 px-1.5 py-1 rounded-lg border border-white/15">
                <button
                  onClick={() => setMiniMapLocked((v) => !v)}
                  className={`p-1 rounded cursor-pointer ${
                    miniMapLocked ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-white/10'
                  }`}
                  title={miniMapLocked ? 'サイズ固定中' : 'サイズを固定'}
                >
                  {miniMapLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </button>
                <button
                  onClick={() =>
                    setMiniMapSize((s) => (s === 'sm' ? 'md' : s === 'md' ? 'lg' : 'sm'))
                  }
                  className="p-1 rounded text-slate-300 hover:bg-white/10 cursor-pointer"
                  title="ミニマップサイズ切替"
                >
                  {miniMapSize === 'lg' ? (
                    <Minimize2 className="w-3 h-3" />
                  ) : (
                    <Maximize2 className="w-3 h-3" />
                  )}
                </button>
              </div>

              <div className="w-full h-full">
                <LeafletMiniMap
                  defaultCenter={activeMapCfg.defaultCenter}
                  defaultZoom={activeMapCfg.defaultZoom}
                  roundKey={activeRoundKey}
                  guessPin={guessPin}
                  disabled={modeKind === 'online' && Boolean(mePlayer?.hasGuessed)}
                  onMapClick={handleMapClick}
                />
              </div>

              {/* Waiting overlay if online player already submitted */}
              {modeKind === 'online' && mePlayer?.hasGuessed && (
                <div className="absolute inset-0 z-[500] bg-slate-950/85 flex flex-col items-center justify-center p-4 text-center">
                  <Check className="w-7 h-7 text-emerald-400 mb-1.5" />
                  <p className="text-xs font-bold text-white">回答を送信しました！</p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {oppPlayer?.name || '相手'} の回答を待っています...
                  </p>
                </div>
              )}
            </div>

            {/* GUESS Button */}
            {!(modeKind === 'online' && mePlayer?.hasGuessed) && (
              <button
                disabled={!guessPin}
                onClick={() => {
                  if (modeKind === 'solo') submitSoloGuess(false);
                  else handleSubmitOnlineGuess();
                }}
                className={`w-full py-2.5 px-5 rounded-xl font-black text-xs tracking-wide shadow-xl transition-all ${
                  guessPin
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 cursor-pointer active:scale-95'
                    : 'bg-slate-900/95 text-slate-400 border border-white/10 cursor-not-allowed'
                }`}
              >
                {guessPin ? '推測を確定 (SPACE)' : 'マップをクリックしてピンを設置'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── ROUND RESULT SCREEN ─── */}
      {screen === 'round_result' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="relative flex-1 min-h-[240px]">
            <LeafletResultMap
              plots={roundResultPlots}
              fallbackCenter={activeMapCfg.defaultCenter}
            />
          </div>

          {/* Bottom Summary Card */}
          <div className="bg-slate-950/95 border-t border-white/10 p-5 shrink-0">
            {modeKind === 'solo' && soloResults.length > 0 && (() => {
              const res = soloResults[soloResults.length - 1];
              const pct = Math.round((res.score / 5000) * 100);
              return (
                <div className="max-w-3xl mx-auto flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                        Round {res.roundNumber} / 5 Result
                      </div>
                      <h3 className="text-lg font-black text-white mt-0.5">
                        {res.score.toLocaleString()} <span className="text-xs font-semibold text-slate-400">/ 5,000 pts</span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {res.actual.locationLabel
                          ? `${res.actual.locationLabel} (${res.actual.lat.toFixed(4)}, ${res.actual.lng.toFixed(4)})`
                          : `${res.actual.lat.toFixed(4)}, ${res.actual.lng.toFixed(4)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">誤差距離</div>
                      <div className="text-lg font-black text-sky-300 tabular-nums">
                        {res.distanceKm !== null ? formatDistance(res.distanceKm) : '時間切れ (未推測)'}
                      </div>
                    </div>
                  </div>

                  <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400 tabular-nums">
                      合計スコア: <strong className="text-white">{soloTotalScore.toLocaleString()}</strong> / 25,000
                    </div>
                    <button
                      onClick={handleSoloNextRound}
                      className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg"
                    >
                      {soloRoundIdx + 1 >= 5 ? '最終結果を見る' : '次のラウンドへ →'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {modeKind === 'online' && onlineRoom?.lastRound && (() => {
              const last = onlineRoom.lastRound;
              const myRes = mePlayer ? last.results[mePlayer.id] : null;
              const oppRes = oppPlayer ? last.results[oppPlayer.id] : null;
              return (
                <div className="max-w-4xl mx-auto flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                        Round {last.roundNumber} Result{' '}
                        {onlineRoom.format === 'duels' ? `· Multiplier x${last.multiplier}` : ''}
                      </span>
                      {last.actual.locationLabel && (
                        <p className="text-xs text-slate-300 mt-0.5">{last.actual.locationLabel}</p>
                      )}
                    </div>
                    <button
                      disabled={mePlayer?.readyForNext}
                      onClick={handleOnlineNextRound}
                      className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${
                        mePlayer?.readyForNext
                          ? 'bg-slate-800 text-emerald-300 border border-emerald-400/30 cursor-default'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer shadow-lg'
                      }`}
                    >
                      {mePlayer?.readyForNext
                        ? `相手を待っています (${onlineRoom.players.filter((p) => p.readyForNext).length}/2)`
                        : '次のラウンドへ →'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 tabular-nums">
                    {[
                      { player: mePlayer, res: myRes, accent: 'border-sky-400/40 bg-sky-950/30', tag: 'あなた' },
                      { player: oppPlayer, res: oppRes, accent: 'border-rose-400/40 bg-rose-950/30', tag: '対戦相手' },
                    ].map(
                      (item, i) =>
                        item.player &&
                        item.res && (
                          <div key={i} className={`p-3 rounded-xl border ${item.accent} flex items-center justify-between`}>
                            <div>
                              <div className="text-xs font-bold text-white">
                                {item.player.name}{' '}
                                <span className="text-[10px] opacity-65">({item.tag})</span>
                              </div>
                              <div className="text-[11px] text-slate-300 mt-0.5">
                                距離:{' '}
                                {item.res.distanceKm !== null
                                  ? formatDistance(item.res.distanceKm)
                                  : '未推測'}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black text-emerald-300">
                                +{item.res.score.toLocaleString()} pts
                              </div>
                              {onlineRoom.format === 'duels' && (
                                <div className="text-[11px] font-bold">
                                  {item.res.damageTaken > 0 ? (
                                    <span className="text-rose-400">
                                      -{item.res.damageTaken.toLocaleString()} HP (残 {item.player.hp})
                                    </span>
                                  ) : item.res.damageDealt > 0 ? (
                                    <span className="text-amber-300">
                                      {item.res.damageDealt.toLocaleString()} DMG! (残 {item.player.hp})
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">残 {item.player.hp} HP</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─── FINAL SUMMARY SCREEN ─── */}
      {screen === 'final_summary' && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="h-[240px] md:h-[280px] w-full shrink-0 border-b border-white/10">
            <LeafletResultMap
              plots={summaryPlots}
              fallbackCenter={activeMapCfg.defaultCenter}
            />
          </div>

          <div className="p-5 md:p-6 max-w-4xl w-full mx-auto flex flex-col gap-5">
            {modeKind === 'solo' ? (() => {
              const badge = getRankBadge(soloTotalScore);
              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center text-2xl font-black ${badge.color}`}>
                        {badge.rank}
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                          {activeMapCfg.nameJa} · 5ラウンド完走
                        </div>
                        <div className="text-2xl font-black text-white tabular-nums mt-0.5">
                          {soloTotalScore.toLocaleString()}{' '}
                          <span className="text-xs font-semibold text-slate-400">/ 25,000 pts</span>
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-400" />
                          <span>称号: {badge.labelJa}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={handleLeaveToMenu}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                      >
                        マップ選択へ
                      </button>
                      <button
                        onClick={startSoloGame}
                        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg flex items-center gap-1.5"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>もう一度プレイ</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 tabular-nums">
                    {soloResults.map((r) => (
                      <div
                        key={r.roundNumber}
                        className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900/75 border border-white/10 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 font-black flex items-center justify-center shrink-0">
                            {r.roundNumber}
                          </span>
                          <span className="text-slate-200 truncate">
                            {r.actual.locationLabel
                              ? `${r.actual.locationLabel} (${r.actual.lat.toFixed(3)}, ${r.actual.lng.toFixed(3)})`
                              : `${r.actual.lat.toFixed(3)}, ${r.actual.lng.toFixed(3)}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-slate-400">
                            {r.distanceKm !== null ? formatDistance(r.distanceKm) : '未推測'}
                          </span>
                          <span className="font-black text-emerald-300 w-20 text-right">
                            {r.score.toLocaleString()} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })() : (
              onlineRoom && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-white/10 rounded-2xl p-5">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        {onlineRoom.format === 'duels' ? 'Online Duels 決着' : 'Online 5ラウンド対戦 決着'}
                      </div>
                      <h2 className="text-2xl font-black text-white mt-1">
                        {onlineRoom.winnerId === null
                          ? '引き分け (DRAW)'
                          : onlineRoom.winnerId === onlineRoom.youId
                          ? '勝利！ YOU WIN!'
                          : '敗北... YOU LOSE'}
                      </h2>
                      <p className="text-xs text-slate-300 mt-1 tabular-nums">
                        {mePlayer?.name}:{' '}
                        {onlineRoom.format === 'duels'
                          ? `${mePlayer?.hp ?? 0} HP`
                          : `${(mePlayer?.totalScore ?? 0).toLocaleString()} pts`}{' '}
                        vs {oppPlayer?.name || '相手'}:{' '}
                        {onlineRoom.format === 'duels'
                          ? `${oppPlayer?.hp ?? 0} HP`
                          : `${(oppPlayer?.totalScore ?? 0).toLocaleString()} pts`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={handleLeaveToMenu}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
                      >
                        ロビーへ戻る
                      </button>
                      {onlineRoom.players.length >= 2 && (
                        <button
                          disabled={mePlayer?.wantsRematch}
                          onClick={handleOnlineRematch}
                          className={`px-5 py-2.5 rounded-xl font-black text-xs cursor-pointer shadow-lg ${
                            mePlayer?.wantsRematch
                              ? 'bg-slate-800 text-amber-300 border border-amber-400/30'
                              : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                          }`}
                        >
                          {mePlayer?.wantsRematch ? '相手の承諾待ち...' : '再戦する (Rematch)'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 tabular-nums">
                    {onlineRoom.history.map((h) => {
                      const myR = mePlayer ? h.results[mePlayer.id] : null;
                      const oppR = oppPlayer ? h.results[oppPlayer.id] : null;
                      return (
                        <div
                          key={h.roundNumber}
                          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-xl bg-slate-900/75 border border-white/10 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-black flex items-center justify-center shrink-0">
                              {h.roundNumber}
                            </span>
                            <span className="text-slate-200 truncate">
                              {h.actual.locationLabel || `${h.actual.lat.toFixed(3)}, ${h.actual.lng.toFixed(3)}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <span className="text-sky-300 font-bold">
                              あなた: {myR ? `${myR.score.toLocaleString()} pts` : '-'}
                            </span>
                            {oppR && (
                              <span className="text-rose-300 font-bold">
                                相手: {oppR.score.toLocaleString()} pts
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
