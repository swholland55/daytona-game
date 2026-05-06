import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';

interface RoomPlayer {
  ws: WebSocket;
  id: string;
  carIndex: number;
  name: string;
  x: number; z: number; heading: number; speed: number; braking: boolean; laps: number;
}

interface Room {
  passcode: string;
  hostId: string;
  players: Map<string, RoomPlayer>;
  totalLaps: number;
  started: boolean;
}

const rooms = new Map<string, Room>();

function sendTo(ws: WebSocket, msg: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(room: Room, msg: object, excludeId?: string) {
  const data = JSON.stringify(msg);
  for (const [id, player] of room.players) {
    if (id !== excludeId && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  }
}

function nextCarIndex(room: Room): number {
  const used = new Set([...room.players.values()].map(p => p.carIndex));
  for (let i = 0; i < 6; i++) if (!used.has(i)) return i;
  return -1;
}

const ADMIN_ACTIONS = new Set(['spinout', 'wallsmash', 'reverse', 'freeze', 'crawl', 'tornado', 'explode', 'kick', 'speedSlow', 'speedNormal', 'speedFast', 'speedTurbo', 'lapReset', 'lapBack', 'lapForward', 'damageRepair', 'damageHalf', 'damageMax']);
const GLOBAL_ACTIONS = new Set(['rainOn', 'rainOff', 'yellowFlagOn', 'nukeAll']);

export function setupWebSocketServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: '/api/ws' });

  wss.on('connection', (ws: WebSocket) => {
    const clientId = randomUUID();
    let currentRoom: Room | null = null;
    let currentPlayer: RoomPlayer | null = null;

    function handleLeave() {
      if (!currentRoom || !currentPlayer) return;
      currentRoom.players.delete(clientId);
      broadcast(currentRoom, { type: 'playerLeft', id: clientId, carIndex: currentPlayer.carIndex });
      if (currentRoom.players.size === 0) rooms.delete(currentRoom.passcode);
      currentRoom = null;
      currentPlayer = null;
    }

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      if (msg.type === 'create') {
        handleLeave();
        const passcode = ((msg.passcode as string) || randomUUID().slice(0, 6))
          .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || randomUUID().slice(0, 6).toUpperCase();
        const room: Room = { passcode, hostId: clientId, players: new Map(), totalLaps: Math.max(1, Math.min(100, (msg.totalLaps as number) || 10)), started: false };
        const player: RoomPlayer = {
          ws, id: clientId, carIndex: 0,
          name: (msg.name as string) || 'DRIVER',
          x: 0, z: 0, heading: 0, speed: 0, braking: false, laps: 0,
        };
        room.players.set(clientId, player);
        rooms.set(passcode, room);
        currentRoom = room;
        currentPlayer = player;
        sendTo(ws, { type: 'created', passcode, carIndex: 0, playerCount: 1 });

      } else if (msg.type === 'join') {
        const passcode = ((msg.passcode as string) || '').toUpperCase().slice(0, 8);
        const room = rooms.get(passcode);
        if (!room) { sendTo(ws, { type: 'error', message: 'No game found with that code' }); return; }
        if (room.players.size >= 6) { sendTo(ws, { type: 'error', message: 'Game is full (6 players max)' }); return; }
        const carIndex = nextCarIndex(room);
        if (carIndex === -1) { sendTo(ws, { type: 'error', message: 'Game is full' }); return; }
        handleLeave();
        const player: RoomPlayer = {
          ws, id: clientId, carIndex,
          name: (msg.name as string) || 'DRIVER',
          x: 0, z: 0, heading: 0, speed: 0, braking: false, laps: 0,
        };
        room.players.set(clientId, player);
        currentRoom = room;
        currentPlayer = player;
        const others = [...room.players.values()]
          .filter(p => p.id !== clientId)
          .map(p => ({ id: p.id, carIndex: p.carIndex, name: p.name, x: p.x, z: p.z, heading: p.heading, speed: p.speed, braking: p.braking, laps: p.laps }));
        sendTo(ws, { type: 'joined', passcode, carIndex, playerCount: room.players.size, players: others, totalLaps: room.totalLaps });
        broadcast(room, { type: 'playerJoined', id: clientId, carIndex, name: player.name }, clientId);

      } else if (msg.type === 'update') {
        if (!currentRoom || !currentPlayer) return;
        currentPlayer.x = (msg.x as number) ?? 0;
        currentPlayer.z = (msg.z as number) ?? 0;
        currentPlayer.heading = (msg.heading as number) ?? 0;
        currentPlayer.speed = (msg.speed as number) ?? 0;
        currentPlayer.braking = (msg.braking as boolean) ?? false;
        currentPlayer.laps = (msg.laps as number) ?? currentPlayer.laps;
        broadcast(currentRoom, {
          type: 'playerUpdate', id: clientId, carIndex: currentPlayer.carIndex,
          x: currentPlayer.x, z: currentPlayer.z, heading: currentPlayer.heading,
          speed: currentPlayer.speed, braking: currentPlayer.braking, laps: currentPlayer.laps,
        }, clientId);

      } else if (msg.type === 'admin') {
        // Only the room host can issue admin commands
        if (!currentRoom || currentRoom.hostId !== clientId) return;
        const action = msg.action as string;
        const targetId = msg.targetId as string;
        if (!ADMIN_ACTIONS.has(action)) return;

        const target = currentRoom.players.get(targetId);
        if (!target || target.id === clientId) return; // can't punish yourself

        if (action === 'kick') {
          sendTo(target.ws, { type: 'kicked', message: 'You were kicked by the host 🚫' });
          currentRoom.players.delete(targetId);
          broadcast(currentRoom, { type: 'playerLeft', id: targetId, carIndex: target.carIndex });
          broadcast(currentRoom, { type: 'roomAnnounce', message: `🚫 ${target.name} was kicked` });
          setTimeout(() => target.ws.close(), 200);
        } else {
          // Send punishment directly to target
          sendTo(target.ws, { type: 'punishment', action });
          // Announce to whole room what the host did (it's chaos, everyone should know)
          broadcast(currentRoom, {
            type: 'roomAnnounce',
            message: getAnnouncement(action, target.name),
          });
        }

      } else if (msg.type === 'adminGlobal') {
        // Host-only global broadcast
        if (!currentRoom || currentRoom.hostId !== clientId) return;
        const action = msg.action as string;
        if (action === 'teleportToHost') {
          const x = msg.x as number;
          const z = msg.z as number;
          const heading = msg.heading as number;
          for (const p of currentRoom.players.values()) {
            if (p.id !== clientId) {
              sendTo(p.ws, { type: 'teleport', x, z, heading });
            }
          }
        } else if (GLOBAL_ACTIONS.has(action)) {
          for (const p of currentRoom.players.values()) {
            sendTo(p.ws, { type: 'punishment', action });
          }
        }

      } else if (msg.type === 'chatMessage') {
        if (!currentRoom || !currentPlayer) return;
        const text = ((msg.text as string) || '').slice(0, 80).trim();
        if (!text) return;
        const payload = { type: 'chatMessage', fromId: clientId, fromCarIndex: currentPlayer.carIndex, fromName: currentPlayer.name, text };
        for (const p of currentRoom.players.values()) sendTo(p.ws, payload);

      } else if (msg.type === 'spawnBot') {
        if (!currentRoom || currentRoom.hostId !== clientId) return;
        broadcast(currentRoom, { type: 'botSpawned' }, clientId);

      } else if (msg.type === 'startRace') {
        if (!currentRoom || currentRoom.hostId !== clientId || currentRoom.started) return;
        currentRoom.started = true;
        const botCount = Math.max(0, Math.min(9, Number(msg.botCount) || 0));
        const gameMode = String(msg.gameMode || 'race');
        const vehicleType = String(msg.vehicleType || 'car');
        for (const p of currentRoom.players.values()) {
          sendTo(p.ws, { type: 'raceStarted', totalLaps: currentRoom.totalLaps, botCount, gameMode, vehicleType });
        }

      } else if (msg.type === 'leave') {
        handleLeave();
      }
    });

    ws.on('close', handleLeave);
    ws.on('error', handleLeave);
  });

  return wss;
}

function getAnnouncement(action: string, name: string): string {
  switch (action) {
    case 'spinout':  return `🌀 ${name} got spun out!`;
    case 'wallsmash': return `💥 ${name} was smashed into the wall!`;
    case 'reverse':  return `↩️ ${name} is going backwards!`;
    case 'freeze':   return `🧊 ${name} is frozen solid!`;
    case 'crawl':    return `🐢 ${name} is crawling!`;
    case 'tornado':  return `🌪️ ${name} is in a tornado!`;
    case 'explode':  return `💣 ${name} just EXPLODED!`;
    default: return `⚡ ${name} got punished!`;
  }
}
