import { useState, useRef, useCallback } from 'react';
import { CAR_COLORS } from './constants';
import type { ChatMessage } from './types';

export interface RemotePlayerState {
  id: string;
  carIndex: number;
  name: string;
  x: number; z: number; heading: number; speed: number; braking: boolean; laps: number;
  color: string;
}

export interface PlayerInfo {
  id: string;
  name: string;
  color: string;
  carIndex: number;
}

export type MultiplayerMode = 'offline' | 'hosting' | 'joined';

export interface RaceSettings {
  totalLaps: number;
  botCount: number;
  gameMode: string;
  vehicleType: string;
}

interface MultiplayerState {
  mode: MultiplayerMode;
  passcode: string;
  playerCount: number;
  error: string;
  alert: string | null;
}

const PUNISHMENT_LABELS: Record<string, string> = {
  spinout:     '🌀 You got spun out by the host!',
  wallsmash:   '💥 You were smashed into the wall!',
  reverse:     '↩️ The host flipped you around!',
  freeze:      '🧊 The host froze you for 5 seconds!',
  crawl:       '🐢 The host made you crawl for 8 seconds!',
  tornado:     '🌪️ The host threw you in a tornado!',
  explode:     '💣 The host EXPLODED you!',
  speedSlow:   '🐌 The host set your speed to SLOW!',
  speedNormal: '✅ The host restored your speed!',
  speedFast:   '⚡ The host gave you a SPEED BOOST!',
  speedTurbo:  '🚀 The host set you to TURBO SPEED!',
  lapReset:     '↩️ The host reset your laps to 0!',
  lapBack:      '⬅️ The host took a lap from you!',
  lapForward:   '⏩ The host gave you an extra lap!',
  damageRepair: '🔧 The host repaired your car!',
  damageHalf:   '⚠️ The host damaged your car!',
  damageMax:    '💥 The host wrecked your car!',
};

export function useMultiplayer() {
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<MultiplayerState>({
    mode: 'offline', passcode: '', playerCount: 1, error: '', alert: null,
  });
  const [playerList, setPlayerList] = useState<PlayerInfo[]>([]);
  const [remoteTotalLaps, setRemoteTotalLaps] = useState<number | undefined>(undefined);
  const [isRaining, setIsRaining] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [raceSettings, setRaceSettings] = useState<RaceSettings | null>(null);
  const remotePlayersRef = useRef<RemotePlayerState[]>([]);
  const punishmentQueueRef = useRef<string[]>([]);
  const teleportQueueRef = useRef<Array<{ x: number; z: number; heading: number }>>([]);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showAlert(msg: string) {
    setState(s => ({ ...s, alert: msg }));
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => {
      setState(s => ({ ...s, alert: null }));
    }, 4000);
  }

  const handleMessage = useCallback((event: MessageEvent) => {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(event.data as string); } catch { return; }

    switch (msg.type) {
      case 'created':
        setState(s => ({ ...s, mode: 'hosting', passcode: msg.passcode as string, playerCount: 1, error: '' }));
        setPlayerList([]);
        break;

      case 'joined': {
        const players = (msg.players as Array<Record<string, unknown>>) ?? [];
        remotePlayersRef.current = players.map(p => ({
          id: p.id as string,
          carIndex: p.carIndex as number,
          name: p.name as string,
          x: (p.x as number) ?? 0,
          z: (p.z as number) ?? 0,
          heading: (p.heading as number) ?? 0,
          speed: (p.speed as number) ?? 0,
          braking: (p.braking as boolean) ?? false,
          laps: (p.laps as number) ?? 0,
          color: CAR_COLORS[(p.carIndex as number) % CAR_COLORS.length],
        }));
        setPlayerList(players.map(p => ({
          id: p.id as string,
          name: p.name as string,
          carIndex: p.carIndex as number,
          color: CAR_COLORS[(p.carIndex as number) % CAR_COLORS.length],
        })));
        if (msg.totalLaps !== undefined) setRemoteTotalLaps(msg.totalLaps as number);
        setState(s => ({ ...s, mode: 'joined', passcode: msg.passcode as string, playerCount: msg.playerCount as number, error: '' }));
        break;
      }

      case 'playerJoined': {
        const info: PlayerInfo = {
          id: msg.id as string,
          carIndex: msg.carIndex as number,
          name: msg.name as string,
          color: CAR_COLORS[(msg.carIndex as number) % CAR_COLORS.length],
        };
        remotePlayersRef.current = [
          ...remotePlayersRef.current,
          { ...info, x: 0, z: 0, heading: 0, speed: 0, braking: false, laps: 0 },
        ];
        setPlayerList(l => [...l, info]);
        setState(s => ({ ...s, playerCount: s.playerCount + 1 }));
        break;
      }

      case 'playerLeft':
        remotePlayersRef.current = remotePlayersRef.current.filter(p => p.id !== (msg.id as string));
        setPlayerList(l => l.filter(p => p.id !== (msg.id as string)));
        setState(s => ({ ...s, playerCount: Math.max(1, s.playerCount - 1) }));
        break;

      case 'playerUpdate': {
        const p = remotePlayersRef.current.find(r => r.id === (msg.id as string));
        if (p) {
          p.x = msg.x as number;
          p.z = msg.z as number;
          p.heading = msg.heading as number;
          p.speed = msg.speed as number;
          p.braking = msg.braking as boolean;
          if (msg.laps !== undefined) p.laps = msg.laps as number;
        }
        break;
      }

      case 'punishment': {
        const action = msg.action as string;
        if (action === 'rainOn') setIsRaining(true);
        else if (action === 'rainOff') setIsRaining(false);
        punishmentQueueRef.current.push(action);
        if (PUNISHMENT_LABELS[action]) showAlert(PUNISHMENT_LABELS[action]);
        else if (action === 'rainOn') showAlert('🌧️ RAIN DELAY — Race Suspended!');
        else if (action === 'rainOff') showAlert('☀️ Rain cleared! Racing resumes!');
        else showAlert('⚡ The host got you!');
        break;
      }

      case 'teleport': {
        teleportQueueRef.current.push({ x: msg.x as number, z: msg.z as number, heading: msg.heading as number });
        showAlert('💥 TELEPORTED by the host!');
        break;
      }

      case 'kicked':
        showAlert('🚫 You were kicked by the host!');
        wsRef.current?.close();
        remotePlayersRef.current = [];
        punishmentQueueRef.current = [];
        setPlayerList([]);
        setRemoteTotalLaps(undefined);
        setState({ mode: 'offline', passcode: '', playerCount: 1, error: 'You were kicked by the host', alert: null });
        break;

      case 'chatMessage': {
        const cm: ChatMessage = {
          id: `${Date.now()}-${Math.random()}`,
          fromName: msg.fromName as string,
          fromColor: msg.fromColor as string || '#ffffff',
          text: msg.text as string,
          timestamp: Date.now(),
        };
        setChatMessages(prev => [...prev.slice(-9), cm]);
        setTimeout(() => setChatMessages(prev => prev.filter(m => m.id !== cm.id)), 10000);
        break;
      }

      case 'roomAnnounce':
        showAlert(msg.message as string);
        break;

      case 'raceStarted':
        setRaceSettings({
          totalLaps: msg.totalLaps as number,
          botCount: msg.botCount as number,
          gameMode: msg.gameMode as string,
          vehicleType: msg.vehicleType as string,
        });
        break;

      case 'error':
        setState(s => ({ ...s, error: msg.message as string }));
        break;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openConnection = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        resolve(wsRef.current);
        return;
      }
      wsRef.current?.close();
      const backendUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;
      const wsUrl = backendUrl
        ? backendUrl.replace(/^http/, 'ws') + '/api/ws'
        : (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/api/ws';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => resolve(ws);
      ws.onerror = () => reject(new Error('Cannot connect to server'));
      ws.onmessage = handleMessage;
      ws.onclose = () => {
        remotePlayersRef.current = [];
        punishmentQueueRef.current = [];
        setPlayerList([]);
        setRemoteTotalLaps(undefined);
        setRaceSettings(null);
        setState({ mode: 'offline', passcode: '', playerCount: 1, error: '', alert: null });
      };
    });
  }, [handleMessage]);

  const createRoom = useCallback(async (code: string, name: string, laps: number) => {
    setState(s => ({ ...s, error: '' }));
    try {
      const ws = await openConnection();
      const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      ws.send(JSON.stringify({ type: 'create', passcode: clean || 'RACE', name: name || 'DRIVER', totalLaps: laps }));
    } catch {
      setState(s => ({ ...s, error: 'Cannot reach game server' }));
    }
  }, [openConnection]);

  const joinRoom = useCallback(async (code: string, name: string) => {
    setState(s => ({ ...s, error: '' }));
    try {
      const ws = await openConnection();
      ws.send(JSON.stringify({ type: 'join', passcode: code.toUpperCase().slice(0, 8), name: name || 'DRIVER' }));
    } catch {
      setState(s => ({ ...s, error: 'Cannot reach game server' }));
    }
  }, [openConnection]);

  const leaveRoom = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'leave' }));
    wsRef.current?.close();
    wsRef.current = null;
    remotePlayersRef.current = [];
    punishmentQueueRef.current = [];
    setPlayerList([]);
    setRemoteTotalLaps(undefined);
    setRaceSettings(null);
    setState({ mode: 'offline', passcode: '', playerCount: 1, error: '', alert: null });
  }, []);

  const sendStartRace = useCallback((botCount: number, gameMode: string, vehicleType: string) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'startRace', botCount, gameMode, vehicleType }));
    }
  }, []);

  const sendUpdate = useCallback((x: number, z: number, heading: number, speed: number, braking: boolean, laps: number) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'update',
        x: Math.round(x * 10) / 10,
        z: Math.round(z * 10) / 10,
        heading: Math.round(heading * 100) / 100,
        speed: Math.round(speed * 10) / 10,
        braking,
        laps,
      }));
    }
  }, []);

  const sendChatMessage = useCallback((text: string, fromName: string, fromColor: string) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'chatMessage', text }));
    } else {
      const cm: ChatMessage = {
        id: `${Date.now()}-${Math.random()}`,
        fromName, fromColor, text, timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev.slice(-9), cm]);
      setTimeout(() => setChatMessages(prev => prev.filter(m => m.id !== cm.id)), 10000);
    }
  }, []);

  const adminAction = useCallback((targetId: string, action: string) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'admin', action, targetId }));
    }
  }, []);

  const sendGlobalAction = useCallback((action: string) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'adminGlobal', action }));
    }
  }, []);

  const sendTeleportAll = useCallback((x: number, z: number, heading: number) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'adminGlobal', action: 'teleportToHost', x, z, heading }));
    }
  }, []);

  return {
    ...state,
    remoteTotalLaps,
    isRaining,
    chatMessages,
    playerList,
    raceSettings,
    remotePlayersRef,
    punishmentQueueRef,
    teleportQueueRef,
    createRoom, joinRoom, leaveRoom, sendUpdate, sendStartRace, adminAction, sendGlobalAction, sendTeleportAll, sendChatMessage,
  };
}
