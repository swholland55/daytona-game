import { useRef, useCallback, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls, Html, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { Track } from './Track';
import { CarMesh } from './CarMesh';
import { Controls, CarState, UiState, VehicleType, GameMode } from './types';
import {
  TRACK, MAX_SPEED, REVERSE_SPEED, ACCEL_RATE, BRAKE_RATE, DRAG,
  STEER_RATE, STEER_SPEED_FACTOR, CRASH_DISTANCE, AI_COUNT, MAX_BOTS,
  CAR_COLORS, CAR_NAMES, NUM_WAYPOINTS,
} from './constants';
import { waypoints, getNearestWaypointIdx, getWaypointHeading, getCarBankY } from './trackMath';
import { LeaderEntry } from './types';

const RAIN_COUNT = 1500;

function updateDemolitionAI(car: CarState, dt: number, cars: CarState[], activeCount: number, eliminated: Set<number>): void {
  if (Math.abs(car.angularVelocity) > 0.5) {
    car.heading += car.angularVelocity * dt;
    car.angularVelocity *= Math.exp(-3 * dt);
    car.speed *= Math.exp(-3 * dt);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    resolveWallCollision(car, true);
    return;
  }
  let bestDist = Infinity, targetX = 0, targetZ = 0, found = false;
  for (let i = 0; i < activeCount; i++) {
    if (cars[i].id === car.id || eliminated.has(cars[i].id)) continue;
    const dx = cars[i].x - car.x, dz = cars[i].z - car.z;
    const d = dx * dx + dz * dz;
    if (d < bestDist) { bestDist = d; targetX = cars[i].x; targetZ = cars[i].z; found = true; }
  }
  if (!found) return;
  const dx = targetX - car.x, dz = targetZ - car.z;
  const desiredH = Math.atan2(dx, dz);
  let hDiff = desiredH - car.heading;
  while (hDiff > Math.PI) hDiff -= Math.PI * 2;
  while (hDiff < -Math.PI) hDiff += Math.PI * 2;
  car.heading += Math.min(Math.abs(hDiff) * 4, STEER_RATE * 2.2) * Math.sign(hDiff) * dt;
  const tgt = MAX_SPEED * 0.74 * (1 - car.damage * 0.4);
  car.speed = Math.min(car.speed + ACCEL_RATE * 0.92 * dt, tgt);
  car.speed *= Math.exp(-DRAG * 0.08 * dt);
  car.angularVelocity *= Math.exp(-4.5 * dt);
  const subs = car.speed > 60 ? 2 : 1;
  for (let s = 0; s < subs; s++) {
    car.x += Math.sin(car.heading) * car.speed * (dt / subs);
    car.z += Math.cos(car.heading) * car.speed * (dt / subs);
    resolveWallCollision(car, true);
  }
  car.waypointIdx = getNearestWaypointIdx(car.x, car.z);
}

function ttsSpeak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.1; u.pitch = 0.85; u.volume = 0.85;
  window.speechSynthesis.speak(u);
}

// Pre-allocated THREE objects for the banking-roll computation — avoids GC pressure
const _rollVec = new THREE.Vector3();
const _rollQ = new THREE.Quaternion();
const _yawQ = new THREE.Quaternion();
const _yawEuler = new THREE.Euler();

// Returns a drag multiplier < 1 when car is in the slipstream of a car ahead
function getDraftFactor(car: CarState, all: CarState[]): number {
  const fwdX = Math.sin(car.heading);
  const fwdZ = Math.cos(car.heading);
  let maxBoost = 0;
  for (const other of all) {
    if (other.id === car.id) continue;
    const dx = other.x - car.x;
    const dz = other.z - car.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 1 || dist > 26) continue;
    const dot = (dx * fwdX + dz * fwdZ) / dist;
    if (dot < 0.72) continue;
    const alignment = (dot - 0.72) / 0.28;
    const proximity = 1 - dist / 26;
    const factor = alignment * proximity * 0.22;
    if (factor > maxBoost) maxBoost = factor;
  }
  return 1 - maxBoost;
}

function initCars(): CarState[] {
  return Array.from({ length: 1 + MAX_BOTS }, (_, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    // Grid start: front stretch near (centerA, 0), heading = PI (facing -Z)
    const startX = TRACK.centerA + (col === 0 ? 5.5 : -5.5);
    const startZ = row * 14;
    const heading = Math.PI;
    const nearestWp = getNearestWaypointIdx(startX, startZ);
    return {
      id: i,
      x: startX,
      z: startZ,
      heading,
      speed: 0,
      angularVelocity: 0,
      color: CAR_COLORS[i % CAR_COLORS.length],
      name: CAR_NAMES[i % CAR_NAMES.length],
      laps: 0,
      waypointIdx: nearestWp,
      lapReady: false,
      prevZ: startZ,
      lateralOffset: ([8, -8, 18, -18, 2, -22, 10, -10, 14, -14] as number[])[i] ?? 0,
      targetWpIdx: (nearestWp + 6) % NUM_WAYPOINTS,
      speedFactor: 0.82 + (i % 5) * 0.03,
      braking: false,
      damage: 0,
    };
  });
}

// Wall collision: radial projection with velocity reflection — no tunneling, no clipping
function resolveWallCollision(car: CarState, skipInner = false): boolean {
  const outerVal = (car.x / TRACK.outerA) ** 2 + (car.z / TRACK.outerB) ** 2;
  if (outerVal >= 1.0) {
    const phi = Math.atan2(-car.z / TRACK.outerB, car.x / TRACK.outerA);
    // Snap far enough from wall that the car body never visually clips (half-width ~1.6 at scale 1.45)
    car.x = (TRACK.outerA - 3.5) * Math.cos(phi);
    car.z = -(TRACK.outerB - 3.5) * Math.sin(phi);
    // Ellipse inward normal at phi (properly normalized)
    const nxU = -Math.cos(phi) / TRACK.outerA;
    const nzU =  Math.sin(phi) / TRACK.outerB;
    const nLen = Math.sqrt(nxU * nxU + nzU * nzU);
    const nx = nxU / nLen, nz = nzU / nLen;
    const vx = Math.sin(car.heading) * car.speed;
    const vz = Math.cos(car.heading) * car.speed;
    const vDotN = vx * nx + vz * nz;
    if (vDotN < 0) {
      // Reflect off wall: keep tangential component, bounce partial normal back
      const rvx = vx - 1.35 * vDotN * nx;
      const rvz = vz - 1.35 * vDotN * nz;
      const newSpd = Math.sqrt(rvx * rvx + rvz * rvz);
      car.speed = newSpd * 0.52;
      if (newSpd > 0.5) car.heading = Math.atan2(rvx, rvz);
    } else {
      car.speed *= 0.28;
    }
    car.angularVelocity += (Math.random() - 0.5) * 4.5;
    car.damage = Math.min(1, car.damage + 0.10 + Math.random() * 0.08);
    return true;
  }

  // Pit road: open the inner wall for the entire front-straight region.
  // Matches the visual gap in the inner wall mesh (|z| < 92, positive-x side).
  const inPitGate = car.x > 0 && Math.abs(car.z) < 92;

  if (!skipInner && !inPitGate) {
    const innerVal = (car.x / TRACK.innerA) ** 2 + (car.z / TRACK.innerB) ** 2;
    if (innerVal <= 1.0) {
      const phi = Math.atan2(-car.z / TRACK.innerB, car.x / TRACK.innerA);
      car.x = (TRACK.innerA + 3.5) * Math.cos(phi);
      car.z = -(TRACK.innerB + 3.5) * Math.sin(phi);
      // Ellipse outward normal for inner wall
      const nxU =  Math.cos(phi) / TRACK.innerA;
      const nzU = -Math.sin(phi) / TRACK.innerB;
      const nLen = Math.sqrt(nxU * nxU + nzU * nzU);
      const nx = nxU / nLen, nz = nzU / nLen;
      const vx = Math.sin(car.heading) * car.speed;
      const vz = Math.cos(car.heading) * car.speed;
      const vDotN = vx * nx + vz * nz;
      if (vDotN < 0) {
        const rvx = vx - 1.35 * vDotN * nx;
        const rvz = vz - 1.35 * vDotN * nz;
        const newSpd = Math.sqrt(rvx * rvx + rvz * rvz);
        car.speed = newSpd * 0.52;
        if (newSpd > 0.5) car.heading = Math.atan2(rvx, rvz);
      } else {
        car.speed *= 0.28;
      }
      car.angularVelocity += (Math.random() - 0.5) * 4.5;
      car.damage = Math.min(1, car.damage + 0.08 + Math.random() * 0.06);
      return true;
    }
  }
  return false;
}

function resolveCarCollision(a: CarState, b: CarState): void {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < CRASH_DISTANCE && dist > 0.01) {
    const nx = dx / dist;
    const nz = dz / dist;
    const overlap = CRASH_DISTANCE - dist;
    a.x -= nx * overlap * 0.5;
    a.z -= nz * overlap * 0.5;
    b.x += nx * overlap * 0.5;
    b.z += nz * overlap * 0.5;
    const relSpeed = Math.abs(a.speed - b.speed);
    const impact = 0.42 + relSpeed * 0.014;
    const aSpeedPrev = a.speed;
    a.speed *= (1 - impact);
    b.speed = b.speed * (1 - impact * 0.8) + aSpeedPrev * impact * 0.25;
    // Violent spin — much stronger for high-speed impacts
    const spinDir = nz >= 0 ? 1 : -1;
    const spinMag = 5.0 + relSpeed * 0.18;
    a.angularVelocity = spinDir * spinMag;
    b.angularVelocity = -spinDir * spinMag * 0.8;
    resolveWallCollision(a);
    resolveWallCollision(b);
  }
}

interface SmokeParticle {
  active: boolean; x: number; y: number; z: number;
  age: number; maxAge: number; vx: number; vz: number;
}
const MAX_SMOKE = 28;

interface ExplosionParticle {
  active: boolean; x: number; z: number;
  age: number; maxAge: number; vx: number; vz: number; scale: number;
}
const MAX_EXPLOSION = 48;

export interface RemotePlayerState {
  id: string; carIndex: number; name: string;
  x: number; z: number; heading: number; speed: number; braking: boolean; laps: number; color: string;
}

const MAX_REMOTE = 5;
const REMOTE_COLORS = ['#1155EE', '#EE7700', '#DDCC00', '#11AA44', '#AA22CC'];

interface SceneProps {
  onUiUpdate: (state: UiState) => void;
  remotePlayersRef?: { current: RemotePlayerState[] };
  punishmentQueueRef?: { current: string[] };
  teleportQueueRef?: { current: Array<{ x: number; z: number; heading: number }> };
  playerPosRef?: { current: { x: number; z: number; heading: number } };
  pendingHostTeleportRef?: { current: boolean };
  onPositionUpdate?: (x: number, z: number, heading: number, speed: number, braking: boolean, laps: number) => void;
  spawnBotRef?: { current: number };
  remotePlayerNames?: string[];
  totalLaps?: number;
  vehicleType?: VehicleType;
  gameMode?: GameMode;
  carNumber?: number;
  carColor?: string;
  botPunishmentQueuesRef?: { current: string[][] };
  initialBotCount?: number;
}

function CarNumberSprite({ number, color }: { number: number; color: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 120);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 76px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`#${String(number).padStart(2, '0')}`, 128, 64);
    return new THREE.CanvasTexture(canvas);
  }, [number, color]);
  return (
    <sprite position={[0, 3.8, 0]} scale={[4.5, 2.25, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}

export function Scene({ onUiUpdate, remotePlayersRef, punishmentQueueRef, teleportQueueRef, playerPosRef, pendingHostTeleportRef, onPositionUpdate, spawnBotRef, remotePlayerNames, totalLaps = 0, vehicleType = 'car', gameMode = 'race', carNumber, carColor, botPunishmentQueuesRef, initialBotCount }: SceneProps) {
  const startBotCount = initialBotCount ?? AI_COUNT;
  const carsRef = useRef<CarState[]>(initCars());
  carsRef.current[0].color = carColor ?? carsRef.current[0].color;
  const carGroupRefs = useRef<(THREE.Group | null)[]>(Array(1 + MAX_BOTS).fill(null));
  const activeCarCountRef = useRef(1 + startBotCount);
  const [renderCarCount, setRenderCarCount] = useState(1 + startBotCount);
  const lastSpawnRef = useRef(0);
  const [, getKeys] = useKeyboardControls<Controls>();
  const uiTimer = useRef(0);
  // countdown: 3→2→1→0(GO)→-1(racing)
  const countdownRef = useRef(3.99);
  const remoteGroupRefs = useRef<(THREE.Group | null)[]>(Array(MAX_REMOTE).fill(null));
  const posUpdateTimer = useRef(0);
  const activePunishmentRef = useRef<{ type: string; timeLeft: number } | null>(null);
  const botActivePunishmentsRef = useRef<({ type: string; timeLeft: number } | null)[]>(Array(MAX_BOTS).fill(null));
  const smokeRefs = useRef<(THREE.Mesh | null)[]>(Array(MAX_SMOKE).fill(null));
  const lapTimeRef = useRef(0);
  const lastLapTimeRef = useRef<number | undefined>(undefined);
  const bestLapTimeRef = useRef<number | undefined>(undefined);
  const speedModeRef = useRef<'slow' | 'normal' | 'fast' | 'turbo'>('normal');
  const raceOverRef = useRef(false);
  const spectatorAngleRef = useRef(0);
  const greenFlagTimerRef = useRef(0);
  const [rainActive, setRainActive] = useState(false);
  const rainPositions = useMemo(() => {
    const arr = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      arr[i*3]   = (Math.random() - 0.5) * 700;
      arr[i*3+1] = Math.random() * 75;
      arr[i*3+2] = (Math.random() - 0.5) * 700;
    }
    return arr;
  }, []);
  const rainGeoRef = useRef<THREE.BufferGeometry | null>(null);
  const ttsGreenRef = useRef(false);
  const ttsFinishedRef = useRef(false);
  const ttsFinalLapRef = useRef(false);
  const nukeTimerRef = useRef(-1);
  const spectatorFlyRef = useRef({ x: 295, z: 0 });
  const shakeRef = useRef(0);
  const prevAngVelRef = useRef(0);
  const nitroFuelRef = useRef(1);
  const pitStopTimerRef = useRef(-1);
  const wrongWayTimerRef = useRef(0);
  const spectatorInitRef = useRef(false);
  const infectedRef = useRef<Set<number>>(new Set());
  const infectionInitRef = useRef(false);
  const potatoHolderRef = useRef(-1);
  const potatoTimerRef = useRef(15);
  const potatoRoundRef = useRef(0);
  const potatoInitRef = useRef(false);
  const knockoutTimerRef = useRef(30);
  const knockoutInitRef = useRef(false);
  const eliminatedRef = useRef<Set<number>>(new Set());
  const demolitionInitRef = useRef(false);
  const driftScoreRef = useRef(0);
  const driftComboTimeRef = useRef(0);
  const driftTimerRef = useRef(90.0);
  const driftInitRef = useRef(false);
  const aiDriftScoresRef = useRef<number[]>(Array(MAX_BOTS).fill(0));
  const modeIndicatorRefs = useRef<(THREE.Mesh | null)[]>(Array(1 + MAX_BOTS).fill(null));
  const healthBarFillRefs = useRef<(HTMLDivElement | null)[]>(Array(1 + MAX_BOTS).fill(null));
  const healthBarLabelRefs = useRef<(HTMLDivElement | null)[]>(Array(1 + MAX_BOTS).fill(null));
  const smokeParticles = useRef<SmokeParticle[]>(
    Array.from({ length: MAX_SMOKE }, () => ({
      active: false, x: 0, y: 0, z: 0, age: 0, maxAge: 2, vx: 0, vz: 0,
    }))
  );
  const explosionParticles = useRef<ExplosionParticle[]>(
    Array.from({ length: MAX_EXPLOSION }, () => ({
      active: false, x: 0, z: 0, age: 0, maxAge: 1.8, vx: 0, vz: 0, scale: 1,
    }))
  );
  const explosionRefs = useRef<(THREE.Mesh | null)[]>(Array(MAX_EXPLOSION).fill(null));

  const updateAICar = useCallback((car: CarState, dt: number) => {
    if (Math.abs(car.angularVelocity) > 0.5) {
      // Spinning — just rotate and slow
      car.heading += car.angularVelocity * dt;
      car.angularVelocity *= Math.exp(-3.5 * dt);
      car.speed *= Math.exp(-4 * dt);
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
      resolveWallCollision(car, gameMode === 'demolition');
      return;
    }

    // Waypoint following with lateral offset
    const wp = waypoints[car.targetWpIdx];
    const wpH = getWaypointHeading(car.targetWpIdx);
    // Perpendicular direction (right of heading)
    const perpX = Math.cos(wpH);
    const perpZ = -Math.sin(wpH);
    const targetX = wp.x + perpX * car.lateralOffset;
    const targetZ = wp.z + perpZ * car.lateralOffset;

    const dx = targetX - car.x;
    const dz = targetZ - car.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Desired heading toward target
    const desiredH = Math.atan2(dx, dz);
    let hDiff = desiredH - car.heading;
    while (hDiff > Math.PI) hDiff -= Math.PI * 2;
    while (hDiff < -Math.PI) hDiff += Math.PI * 2;

    const steerAmt = Math.min(Math.abs(hDiff) * 3.5, STEER_RATE * 1.8) * Math.sign(hDiff);
    car.heading += steerAmt * dt;

    if (dist < 18) {
      car.targetWpIdx = (car.targetWpIdx + 1) % NUM_WAYPOINTS;
    }

    // Accelerate toward target speed (with slipstream boost, reduced by damage)
    const aiDraftF = getDraftFactor(car, carsRef.current);
    // Infected cars run faster — makes infection mode more tense
    const infBoost = gameMode === 'infection' && infectedRef.current.has(car.id) ? 1.25 : 1.0;
    const targetSpeed = MAX_SPEED * car.speedFactor * (1 - car.damage * 0.35) * (1 + (1 - aiDraftF) * 0.12) * infBoost;
    if (car.speed < targetSpeed) {
      car.speed = Math.min(car.speed + ACCEL_RATE * 0.85 * dt, targetSpeed);
    }
    car.speed *= Math.exp(-DRAG * aiDraftF * 0.1 * dt);

    // Dampen angular velocity
    car.angularVelocity *= Math.exp(-5 * dt);

    // Move — sub-stepped to prevent wall tunneling at high speed
    car.prevZ = car.z;
    const aiSubs = car.speed > 70 ? 3 : 1;
    const aiSubDt = dt / aiSubs;
    for (let sub = 0; sub < aiSubs; sub++) {
      car.x += Math.sin(car.heading) * car.speed * aiSubDt;
      car.z += Math.cos(car.heading) * car.speed * aiSubDt;
      resolveWallCollision(car, gameMode === 'demolition');
    }

    // Lap counting — reset damage on lap
    if (car.z < -TRACK.centerB * 0.5) car.lapReady = true;
    if (car.lapReady && car.prevZ > 0 && car.z <= 0 && car.x > TRACK.centerA * 0.45) {
      car.laps++;
      car.lapReady = false;
      car.damage = 0;
    }
    car.waypointIdx = getNearestWaypointIdx(car.x, car.z);
  }, []);

  const spawnSmoke = useCallback((x: number, z: number) => {
    for (const sp of smokeParticles.current) {
      if (!sp.active) {
        sp.active = true;
        sp.x = x + (Math.random() - 0.5) * 4;
        sp.y = 0.4;
        sp.z = z + (Math.random() - 0.5) * 4;
        sp.age = 0;
        sp.maxAge = 1.5 + Math.random() * 1.5;
        sp.vx = (Math.random() - 0.5) * 3.5;
        sp.vz = (Math.random() - 0.5) * 3.5;
        break;
      }
    }
  }, []);

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    const cars = carsRef.current;
    const player = cars[0];
    const keys = getKeys();

    // ── Countdown hold ──────────────────────────────────────────────────────
    if (countdownRef.current > -1) {
      countdownRef.current -= dt;
      // Sync mesh positions but don't move (+0.3 Y lift clears road markings)
      for (let i = 0; i < activeCarCountRef.current; i++) {
        const ref = carGroupRefs.current[i];
        if (!ref) continue;
        ref.position.set(cars[i].x, getCarBankY(cars[i].x, cars[i].z) + 0.3, cars[i].z);
        const h = cars[i].heading;
        // Sample road height left/right of car to get actual slope — sign-consistent regardless of heading
        const gs = 5.0;
        const cRX = Math.cos(h), cRZ = -Math.sin(h);
        const rightY = getCarBankY(cars[i].x + cRX * gs, cars[i].z + cRZ * gs);
        const leftY  = getCarBankY(cars[i].x - cRX * gs, cars[i].z - cRZ * gs);
        const roll = Math.atan2(rightY - leftY, 2 * gs);
        _yawEuler.set(0, h + Math.PI, 0);
        _yawQ.setFromEuler(_yawEuler);
        _rollVec.set(0, 0, -1); // model local forward axis (car nose = −Z before yaw)
        _rollQ.setFromAxisAngle(_rollVec, roll);
        ref.quaternion.multiplyQuaternions(_yawQ, _rollQ); // local roll then world yaw
      }
      // Camera start position behind player — Y tracks banking so camera never clips road
      const followDist = 25;
      const targetCamX = player.x - Math.sin(player.heading) * followDist;
      const targetCamZ = player.z - Math.cos(player.heading) * followDist;
      const cdCamBankY = getCarBankY(targetCamX, targetCamZ);
      camera.position.set(targetCamX, cdCamBankY + 16, targetCamZ);
      const cdLookX = player.x + Math.sin(player.heading) * 8;
      const cdLookZ = player.z + Math.cos(player.heading) * 8;
      camera.lookAt(cdLookX, getCarBankY(cdLookX, cdLookZ) + 1.5, cdLookZ);
      const cd = countdownRef.current;
      onUiUpdate({ speed: 0, laps: 0, position: 1, countdown: cd });
      return;
    }

    // Accumulate lap timer (stop when race is over)
    if (!raceOverRef.current) lapTimeRef.current += dt;

    // Keep playerPosRef in sync so Game.tsx can read current pos for teleport
    if (playerPosRef) {
      playerPosRef.current = { x: player.x, z: player.z, heading: player.heading };
    }

    // ── Admin punishments ────────────────────────────────────────────────────
    if (punishmentQueueRef) {
      while (punishmentQueueRef.current.length > 0) {
        const action = punishmentQueueRef.current.shift()!;
        if (action === 'spinout') {
          player.angularVelocity = (Math.random() > 0.5 ? 1 : -1) * 14;
          player.speed *= 0.2;
          for (let s = 0; s < 4; s++) spawnSmoke(player.x, player.z);
        } else if (action === 'wallsmash') {
          const phi = Math.atan2(-player.z / TRACK.outerB, player.x / TRACK.outerA);
          player.x = (TRACK.outerA - 0.5) * Math.cos(phi);
          player.z = -(TRACK.outerB - 0.5) * Math.sin(phi);
          player.speed = MAX_SPEED * 0.9;
          player.angularVelocity = (Math.random() > 0.5 ? 1 : -1) * 13;
          for (let s = 0; s < 4; s++) spawnSmoke(player.x, player.z);
        } else if (action === 'reverse') {
          player.heading += Math.PI;
          player.speed = -Math.min(Math.abs(player.speed) * 0.7, MAX_SPEED * 0.55);
          player.angularVelocity = (Math.random() - 0.5) * 5;
        } else if (action === 'freeze') {
          activePunishmentRef.current = { type: 'freeze', timeLeft: 5 };
        } else if (action === 'crawl') {
          activePunishmentRef.current = { type: 'crawl', timeLeft: 8 };
        } else if (action === 'tornado') {
          activePunishmentRef.current = { type: 'tornado', timeLeft: 6 };
        } else if (action === 'explode') {
          player.heading += (Math.random() - 0.5) * Math.PI * 1.8;
          player.speed = MAX_SPEED * 1.5 + Math.random() * MAX_SPEED * 0.4;
          player.angularVelocity = (Math.random() > 0.5 ? 1 : -1) * (18 + Math.random() * 10);
          for (let s = 0; s < 10; s++) spawnSmoke(player.x + (Math.random() - 0.5) * 8, player.z + (Math.random() - 0.5) * 8);
        } else if (action === 'speedSlow')   { speedModeRef.current = 'slow';
        } else if (action === 'speedNormal') { speedModeRef.current = 'normal';
        } else if (action === 'speedFast')   { speedModeRef.current = 'fast';
        } else if (action === 'speedTurbo')  { speedModeRef.current = 'turbo';
        } else if (action === 'lapReset')    {
          player.laps = 0; player.lapReady = false; raceOverRef.current = false;
        } else if (action === 'lapBack')     {
          player.laps = Math.max(0, player.laps - 1); raceOverRef.current = false;
        } else if (action === 'lapForward')  {
          player.laps = player.laps + 1;
          if (totalLaps > 0 && player.laps >= totalLaps) raceOverRef.current = true;
        } else if (action === 'damageRepair') { player.damage = 0.0;
        } else if (action === 'damageHalf')   { player.damage = 0.5;
        } else if (action === 'damageMax')    { player.damage = 1.0;
        } else if (action === 'rainOn')  { setRainActive(true);
        } else if (action === 'rainOff') { setRainActive(false);
        } else if (action === 'nukeAll') {
          nukeTimerRef.current = 3.0;
          ttsSpeak('Nuclear launch detected! Three... two... one...');
          for (let i = 0; i < activeCarCountRef.current; i++) {
            cars[i].heading += (Math.random() - 0.5) * Math.PI * 2;
            cars[i].speed = MAX_SPEED * 1.6 + Math.random() * MAX_SPEED * 0.4;
            cars[i].angularVelocity = (Math.random() > 0.5 ? 1 : -1) * (20 + Math.random() * 18);
            for (let s = 0; s < 12; s++) spawnSmoke(cars[i].x + (Math.random() - 0.5) * 14, cars[i].z + (Math.random() - 0.5) * 14);
          }
        }
      }
    }

    // ── Teleport queue (non-host player gets yanked to host position) ─────────
    if (teleportQueueRef) {
      while (teleportQueueRef.current.length > 0) {
        const tp = teleportQueueRef.current.shift()!;
        player.x = tp.x + (Math.random() - 0.5) * 16;
        player.z = tp.z + (Math.random() - 0.5) * 16;
        player.heading = tp.heading + (Math.random() - 0.5) * 0.6;
        player.speed = (Math.random() - 0.5) * MAX_SPEED * 0.5;
        player.angularVelocity = (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 8);
        for (let s = 0; s < 6; s++) spawnSmoke(player.x + (Math.random() - 0.5) * 10, player.z + (Math.random() - 0.5) * 10);
      }
    }

    // ── Host-triggered chaos: teleport all local AI to player position ────────
    if (pendingHostTeleportRef?.current) {
      pendingHostTeleportRef.current = false;
      for (let i = 1; i < activeCarCountRef.current; i++) {
        cars[i].x = player.x + (Math.random() - 0.5) * 24;
        cars[i].z = player.z + (Math.random() - 0.5) * 24;
        cars[i].heading = player.heading + (Math.random() - 0.5) * Math.PI;
        cars[i].speed = (Math.random() - 0.5) * MAX_SPEED * 0.8;
        cars[i].angularVelocity = (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 14);
        for (let s = 0; s < 5; s++) spawnSmoke(cars[i].x + (Math.random() - 0.5) * 10, cars[i].z + (Math.random() - 0.5) * 10);
      }
    }

    // Tick active duration punishment and apply ongoing effects
    let isFrozen = false;
    if (activePunishmentRef.current) {
      activePunishmentRef.current.timeLeft -= dt;
      if (activePunishmentRef.current.timeLeft <= 0) {
        activePunishmentRef.current = null;
      } else {
        const ap = activePunishmentRef.current;
        if (ap.type === 'freeze') {
          isFrozen = true;
          player.speed *= Math.exp(-14 * dt);
        } else if (ap.type === 'tornado') {
          player.angularVelocity += (Math.random() - 0.5) * 20 * dt;
          if (Math.random() < 0.15) spawnSmoke(player.x, player.z);
        }
      }
    }

    const accel = !isFrozen && !raceOverRef.current && keys.forward;
    const braking = !isFrozen && !raceOverRef.current && keys.back;
    player.braking = braking;

    // Player speed — drafting boost, reduced by damage, host speed mode applied
    const draftF = getDraftFactor(player, cars);
    const speedModeMultiplier = speedModeRef.current === 'slow' ? 0.30 : speedModeRef.current === 'fast' ? 1.50 : speedModeRef.current === 'turbo' ? 2.00 : 1.00;
    const vSpeedMult = vehicleType === 'f1' ? 1.45 : vehicleType === 'truck' ? 0.68 : 1.0;
    const vAccelMult = vehicleType === 'f1' ? 1.4  : vehicleType === 'truck' ? 0.70 : 1.0;
    const vSteerMult = vehicleType === 'f1' ? 1.2  : vehicleType === 'truck' ? 0.78 : 1.0;

    // Nitro boost — Space/Shift, burns fuel ~2.5s, recharges ~9s
    const isNitroBoosting = keys.boost && nitroFuelRef.current > 0 && !isFrozen && !raceOverRef.current;
    if (isNitroBoosting) {
      nitroFuelRef.current = Math.max(0, nitroFuelRef.current - dt * 0.40);
      if (Math.random() < 0.55) spawnSmoke(player.x - Math.sin(player.heading) * 3, player.z - Math.cos(player.heading) * 3);
    } else if (nitroFuelRef.current < 1) {
      nitroFuelRef.current = Math.min(1, nitroFuelRef.current + dt * 0.11);
    }
    const nitroMult = isNitroBoosting ? 1.65 : 1.0;
    const draftMaxSpeed = MAX_SPEED * vSpeedMult * speedModeMultiplier * nitroMult * (1 - player.damage * 0.40) * (1 + (1 - draftF) * 0.18);
    if (accel) {
      player.speed = Math.min(player.speed + ACCEL_RATE * vAccelMult * dt, draftMaxSpeed);
    } else if (braking) {
      player.speed = Math.max(player.speed - BRAKE_RATE * vAccelMult * dt, -REVERSE_SPEED);
    } else {
      player.speed *= Math.exp(-DRAG * draftF * dt);
    }

    // Crawl punishment: cap speed painfully low
    if (activePunishmentRef.current?.type === 'crawl') {
      player.speed = Math.min(player.speed, 5);
    }
    // Slow speed mode: cap to 30% of max (scaled by vehicle type)
    if (speedModeRef.current === 'slow') {
      player.speed = Math.min(player.speed, MAX_SPEED * 0.30 * vSpeedMult);
    }

    // Player steering (blocked when frozen)
    if (!isFrozen && Math.abs(player.speed) > 0.3) {
      const sf = 1 / (1 + Math.abs(player.speed) * STEER_SPEED_FACTOR);
      if (keys.left) player.heading += STEER_RATE * vSteerMult * sf * dt * Math.sign(player.speed);
      if (keys.right) player.heading -= STEER_RATE * vSteerMult * sf * dt * Math.sign(player.speed);
    }

    // Apply spin (drift mode: less damping so slides persist longer)
    if (Math.abs(player.angularVelocity) > 0.05) {
      player.heading += player.angularVelocity * dt;
      player.angularVelocity *= Math.exp(-(gameMode === 'drift' ? 1.6 : 3.5) * dt);
      player.speed *= Math.exp(-(gameMode === 'drift' ? 0.8 : 3) * dt);
    }
    // Drift mode oversteer: turning at speed kicks the rear out
    if (gameMode === 'drift' && Math.abs(player.speed) > 18 && !isFrozen) {
      if (keys.left)  player.angularVelocity += STEER_RATE * 0.28 * dt;
      if (keys.right) player.angularVelocity -= STEER_RATE * 0.28 * dt;
    }

    // Track damage burst for yellow flag detection
    const prevDamage = player.damage;

    // Move player — sub-stepped to prevent wall tunneling at high speed
    player.prevZ = player.z;
    const pSubs = player.speed > 70 ? 4 : 2;
    const pSubDt = dt / pSubs;
    for (let sub = 0; sub < pSubs; sub++) {
      player.x += Math.sin(player.heading) * player.speed * pSubDt;
      player.z += Math.cos(player.heading) * player.speed * pSubDt;
      resolveWallCollision(player, gameMode === 'demolition');
    }

    if (greenFlagTimerRef.current > 0) greenFlagTimerRef.current -= dt;

    // Rain delay — all racing suspended, cars crawl
    if (rainActive && !raceOverRef.current) {
      player.speed = Math.min(player.speed, 8);
    }

    // Lap counting
    if (player.z < -TRACK.centerB * 0.5) player.lapReady = true;
    if (player.lapReady && player.prevZ > 0 && player.z <= 0 && player.x > TRACK.centerA * 0.45) {
      player.laps++;
      player.lapReady = false;
      // Record lap time
      const lt = lapTimeRef.current;
      lastLapTimeRef.current = lt;
      if (bestLapTimeRef.current === undefined || lt < bestLapTimeRef.current) {
        bestLapTimeRef.current = lt;
      }
      lapTimeRef.current = 0;
    }
    // Race end detection (not in playground — drive forever)
    if (gameMode !== 'playground' && totalLaps > 0 && !raceOverRef.current && player.laps >= totalLaps) {
      raceOverRef.current = true;
    }
    if (raceOverRef.current) {
      player.speed *= Math.exp(-3 * dt);
      player.angularVelocity = 0;
    }

    player.waypointIdx = getNearestWaypointIdx(player.x, player.z);

    // Wrong-way detection — compare car heading to track tangent at nearest waypoint
    if (!raceOverRef.current && Math.abs(player.speed) > 12) {
      const tH = getWaypointHeading(player.waypointIdx);
      const dot = Math.sin(player.heading) * Math.sin(tH) + Math.cos(player.heading) * Math.cos(tH);
      wrongWayTimerRef.current = dot < -0.45
        ? Math.min(10, wrongWayTimerRef.current + dt)
        : Math.max(0, wrongWayTimerRef.current - dt * 3);
    } else {
      wrongWayTimerRef.current = Math.max(0, wrongWayTimerRef.current - dt * 4);
    }

    // Pit stop — race mode only, drive into pit road (inside front straight) to repair
    if (gameMode === 'race' && !raceOverRef.current) {
      // Inner concrete pit wall — hard stop at x=192, front-straight side only (positive x)
      if (player.x > 0 && player.x < 192 && Math.abs(player.z) < 92) {
        player.x = 192;
        const vx = Math.sin(player.heading) * player.speed;
        if (vx < 0) player.speed *= 0.3;
      }
      // Speed limiter for the entire pit lane corridor
      const inPitLane = player.x > 0 && Math.abs(player.z) < 92 && (player.x / TRACK.innerA) ** 2 + (player.z / TRACK.innerB) ** 2 < 1;
      if (inPitLane) player.speed = Math.min(player.speed, 25);
      // Pit stall zone — hold here to receive service
      const inPit = player.x > 193 && player.x < 232 && Math.abs(player.z) < 38;
      if (inPit && player.damage > 0) {
        if (pitStopTimerRef.current < 0) pitStopTimerRef.current = 0;
        pitStopTimerRef.current += dt;
        if (pitStopTimerRef.current >= 3.0) {
          player.damage = 0;
          nitroFuelRef.current = 1;
          pitStopTimerRef.current = -1;
          ttsSpeak('Pit stop complete! Car repaired and nitro refilled!');
        }
      } else if (inPit) {
        pitStopTimerRef.current = -1;
      } else {
        pitStopTimerRef.current = -1;
      }
    }

    // Spawn new bots when requested
    if (spawnBotRef && spawnBotRef.current !== lastSpawnRef.current) {
      const diff = spawnBotRef.current - lastSpawnRef.current;
      lastSpawnRef.current = spawnBotRef.current;
      activeCarCountRef.current = Math.min(1 + MAX_BOTS, activeCarCountRef.current + diff);
      setRenderCarCount(activeCarCountRef.current);
    }

    // Nuke countdown — explode the race after 3 s
    if (nukeTimerRef.current > 0) {
      nukeTimerRef.current -= dt;
      if (nukeTimerRef.current <= 0) {
        nukeTimerRef.current = -1;
        raceOverRef.current = true;
        ttsSpeak('BOOM! The race has been nuked!');
        // Spawn smoke + explosion particles at every car
        for (let i = 0; i < activeCarCountRef.current; i++) {
          for (let s = 0; s < 14; s++) spawnSmoke(cars[i].x + (Math.random() - 0.5) * 22, cars[i].z + (Math.random() - 0.5) * 22);
          // Explosion fireballs per car
          for (let e = 0; e < 4; e++) {
            const ex = explosionParticles.current;
            for (let j = 0; j < MAX_EXPLOSION; j++) {
              if (!ex[j].active) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 12 + Math.random() * 28;
                ex[j].active = true;
                ex[j].x = cars[i].x + (Math.random() - 0.5) * 14;
                ex[j].z = cars[i].z + (Math.random() - 0.5) * 14;
                ex[j].age = 0;
                ex[j].maxAge = 1.0 + Math.random() * 0.8;
                ex[j].vx = Math.cos(angle) * speed;
                ex[j].vz = Math.sin(angle) * speed;
                ex[j].scale = 1.5 + Math.random() * 3.5;
                break;
              }
            }
          }
        }
        // Extra random fireballs across the track
        for (let e = 0; e < 12; e++) {
          const ex = explosionParticles.current;
          for (let j = 0; j < MAX_EXPLOSION; j++) {
            if (!ex[j].active) {
              const angle = Math.random() * Math.PI * 2;
              const r = 60 + Math.random() * 180;
              ex[j].active = true;
              ex[j].x = Math.cos(angle) * r * (TRACK.outerA / 300);
              ex[j].z = Math.sin(angle) * r * (TRACK.outerB / 175);
              ex[j].age = 0;
              ex[j].maxAge = 1.2 + Math.random() * 1.0;
              ex[j].vx = (Math.random() - 0.5) * 18;
              ex[j].vz = (Math.random() - 0.5) * 18;
              ex[j].scale = 3 + Math.random() * 6;
              break;
            }
          }
        }
      }
    }

    // Update AI
    for (let i = 1; i < activeCarCountRef.current; i++) {
      const bi = i - 1;

      // ── Bot punishment queue ─────────────────────────────────────────────
      if (botPunishmentQueuesRef) {
        const q = botPunishmentQueuesRef.current[bi];
        while (q && q.length > 0) {
          const act = q.shift()!;
          const bot = cars[i];
          if (act === 'spinout') {
            bot.angularVelocity = (Math.random() > 0.5 ? 1 : -1) * 14;
            bot.speed *= 0.2;
            for (let s = 0; s < 4; s++) spawnSmoke(bot.x, bot.z);
          } else if (act === 'wallsmash') {
            const phi = Math.atan2(-bot.z / TRACK.outerB, bot.x / TRACK.outerA);
            bot.x = (TRACK.outerA - 0.5) * Math.cos(phi);
            bot.z = -(TRACK.outerB - 0.5) * Math.sin(phi);
            bot.speed = MAX_SPEED * 0.9;
            bot.angularVelocity = (Math.random() > 0.5 ? 1 : -1) * 13;
            for (let s = 0; s < 4; s++) spawnSmoke(bot.x, bot.z);
          } else if (act === 'explode') {
            bot.heading += (Math.random() - 0.5) * Math.PI * 1.8;
            bot.speed = MAX_SPEED * 1.5 + Math.random() * MAX_SPEED * 0.4;
            bot.angularVelocity = (Math.random() > 0.5 ? 1 : -1) * (18 + Math.random() * 10);
            for (let s = 0; s < 10; s++) spawnSmoke(bot.x + (Math.random() - 0.5) * 8, bot.z + (Math.random() - 0.5) * 8);
          } else if (act === 'reverse') {
            bot.heading += Math.PI;
            bot.speed = -Math.min(Math.abs(bot.speed) * 0.7, MAX_SPEED * 0.55);
            bot.angularVelocity = (Math.random() - 0.5) * 5;
          } else if (act === 'freeze') {
            botActivePunishmentsRef.current[bi] = { type: 'freeze', timeLeft: 5 };
          } else if (act === 'crawl') {
            botActivePunishmentsRef.current[bi] = { type: 'crawl', timeLeft: 8 };
          } else if (act === 'tornado') {
            botActivePunishmentsRef.current[bi] = { type: 'tornado', timeLeft: 6 };
          } else if (act === 'damageRepair') { cars[i].damage = 0;
          } else if (act === 'damageHalf')   { cars[i].damage = 0.5;
          } else if (act === 'damageMax')    { cars[i].damage = 1.0;
          }
        }
      }

      // ── Active timed punishment ─────────────────────────────────────────
      const bp = botActivePunishmentsRef.current[bi];
      const botFrozen = bp?.type === 'freeze';
      if (bp) {
        bp.timeLeft -= dt;
        if (bp.type === 'tornado') {
          cars[i].angularVelocity += (Math.random() - 0.5) * 28 * dt;
        }
        if (bp.timeLeft <= 0) botActivePunishmentsRef.current[bi] = null;
      }

      // ── AI movement ─────────────────────────────────────────────────────
      if (gameMode === 'demolition') {
        if (!botFrozen && !eliminatedRef.current.has(cars[i].id)) {
          updateDemolitionAI(cars[i], dt, cars, activeCarCountRef.current, eliminatedRef.current);
        }
      } else if (!botFrozen) {
        updateAICar(cars[i], dt);
        // Rain delay — AI crawls
        if (rainActive) cars[i].speed = Math.min(cars[i].speed, 8);
        // Vehicle type AI speed adjustments
        if (vehicleType === 'f1' && Math.abs(cars[i].angularVelocity) < 0.5) {
          cars[i].speed = Math.min(cars[i].speed * (1 + dt * 0.8), MAX_SPEED * 1.35);
        } else if (vehicleType === 'truck') {
          cars[i].speed = Math.min(cars[i].speed, MAX_SPEED * 0.68);
        }
      }

      // Crawl cap applied after AI update
      if (bp?.type === 'crawl') {
        cars[i].speed = Math.min(Math.abs(cars[i].speed), 10) * Math.sign(cars[i].speed);
      }
    }

    // Car-car collisions (local bots)
    for (let i = 0; i < activeCarCountRef.current; i++) {
      for (let j = i + 1; j < activeCarCountRef.current; j++) {
        resolveCarCollision(cars[i], cars[j]);
      }
    }

    // Collision with remote (networked) players — one-sided: only local player is pushed
    if (remotePlayersRef) {
      for (const remote of remotePlayersRef.current) {
        const dx = remote.x - player.x;
        const dz = remote.z - player.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < CRASH_DISTANCE * CRASH_DISTANCE && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const nz = dz / dist;
          player.x -= nx * (CRASH_DISTANCE - dist);
          player.z -= nz * (CRASH_DISTANCE - dist);
          const relSpeed = Math.abs(player.speed - remote.speed);
          const impact = 0.42 + relSpeed * 0.014;
          player.speed *= (1 - impact);
          const spinDir = nz >= 0 ? 1 : -1;
          player.angularVelocity = spinDir * (5.0 + relSpeed * 0.18);
          resolveWallCollision(player);
        }
      }
    }

    // Detect sudden angular velocity spike (wall/car collision) → camera shake
    {
      const avDelta = Math.abs(player.angularVelocity) - Math.abs(prevAngVelRef.current);
      if (avDelta > 2.0) shakeRef.current = Math.min(0.7, avDelta * 0.07);
      prevAngVelRef.current = player.angularVelocity;
      shakeRef.current = Math.max(0, shakeRef.current - dt * 3.5);
    }

    // ── Game mode logic ──────────────────────────────────────────────────────
    if (countdownRef.current <= -0.5) {
      if (gameMode === 'infection' && !infectionInitRef.current) {
        infectionInitRef.current = true;
        const randBot = 1 + Math.floor(Math.random() * (activeCarCountRef.current - 1));
        infectedRef.current = new Set([cars[randBot].id]);
        ttsSpeak('Infection mode! Avoid the infected car!');
      }
      if (gameMode === 'hotPotato' && !potatoInitRef.current) {
        potatoInitRef.current = true;
        const randBot = 1 + Math.floor(Math.random() * (activeCarCountRef.current - 1));
        potatoHolderRef.current = cars[randBot].id;
        potatoTimerRef.current = 15;
        ttsSpeak("Hot potato! Don't hold it when it explodes!");
      }
      if (gameMode === 'knockout' && !knockoutInitRef.current) {
        knockoutInitRef.current = true;
        knockoutTimerRef.current = 30;
        ttsSpeak('Knockout race! Last place eliminated every thirty seconds!');
      }
      if (gameMode === 'drift' && !driftInitRef.current) {
        driftInitRef.current = true;
        driftTimerRef.current = 90;
        driftScoreRef.current = 0;
        driftComboTimeRef.current = 0;
        for (let i = 0; i < MAX_BOTS; i++) aiDriftScoresRef.current[i] = 0;
        ttsSpeak('Drift mode! Slide for points! Ninety seconds on the clock!');
      }
      if (gameMode === 'playground' && countdownRef.current <= -0.5) {
        raceOverRef.current = false; // can never end
      }
      if (gameMode === 'demolition' && !demolitionInitRef.current) {
        demolitionInitRef.current = true;
        const N = activeCarCountRef.current;
        for (let i = 0; i < N; i++) {
          const wpIdx = Math.floor((i / N) * NUM_WAYPOINTS);
          const wp = waypoints[wpIdx];
          cars[i].x = wp.x + (Math.random() - 0.5) * 22;
          cars[i].z = wp.z + (Math.random() - 0.5) * 22;
          cars[i].heading = Math.random() * Math.PI * 2;
          cars[i].speed = 0;
          cars[i].angularVelocity = 0;
          cars[i].damage = 0;
        }
        eliminatedRef.current.clear();
        ttsSpeak('Demolition derby! Smash everything! Last car standing wins!');
      }
    }

    if (!raceOverRef.current && countdownRef.current <= -0.5) {
      // INFECTION
      if (gameMode === 'infection') {
        for (let i = 0; i < activeCarCountRef.current; i++) {
          if (!infectedRef.current.has(cars[i].id)) continue;
          for (let j = 0; j < activeCarCountRef.current; j++) {
            if (i === j || infectedRef.current.has(cars[j].id)) continue;
            const dx = cars[i].x - cars[j].x, dz = cars[i].z - cars[j].z;
            if (dx * dx + dz * dz < (CRASH_DISTANCE + 1.5) * (CRASH_DISTANCE + 1.5)) {
              infectedRef.current.add(cars[j].id);
              if (cars[j].id === 0) ttsSpeak("Oh no! You've been infected!");
              for (let s = 0; s < 5; s++) spawnSmoke(cars[j].x + (Math.random() - 0.5) * 8, cars[j].z + (Math.random() - 0.5) * 8);
            }
          }
        }
        const total = activeCarCountRef.current;
        let infCount = 0;
        for (let i = 0; i < total; i++) if (infectedRef.current.has(cars[i].id)) infCount++;
        if (infCount >= total - 1 && total > 1) {
          let survivorIdx = -1;
          for (let i = 0; i < total; i++) if (!infectedRef.current.has(cars[i].id)) { survivorIdx = i; break; }
          raceOverRef.current = true;
          if (survivorIdx === 0) ttsSpeak('You survived the infection! You win!');
          else if (survivorIdx > 0) ttsSpeak(`${cars[survivorIdx].name} survived the infection!`);
        }
      }

      // HOT POTATO
      if (gameMode === 'hotPotato' && potatoHolderRef.current !== -1) {
        potatoTimerRef.current -= dt;
        const holderIdx = cars.slice(0, activeCarCountRef.current).findIndex(c => c.id === potatoHolderRef.current);
        if (holderIdx >= 0) {
          for (let i = 0; i < activeCarCountRef.current; i++) {
            if (i === holderIdx || eliminatedRef.current.has(cars[i].id)) continue;
            const dx = cars[holderIdx].x - cars[i].x, dz = cars[holderIdx].z - cars[i].z;
            if (dx * dx + dz * dz < (CRASH_DISTANCE + 2) * (CRASH_DISTANCE + 2)) {
              potatoHolderRef.current = cars[i].id;
              if (potatoTimerRef.current < 8) potatoTimerRef.current = 8;
              if (cars[i].id === 0) ttsSpeak('You have the hot potato! Get rid of it!');
              break;
            }
          }
        }
        if (potatoTimerRef.current <= 0) {
          const explIdx = cars.slice(0, activeCarCountRef.current).findIndex(c => c.id === potatoHolderRef.current);
          if (explIdx >= 0) {
            cars[explIdx].angularVelocity = (Math.random() > 0.5 ? 1 : -1) * 22;
            cars[explIdx].speed = MAX_SPEED * 1.8;
            cars[explIdx].heading += (Math.random() - 0.5) * Math.PI;
            for (let s = 0; s < 14; s++) spawnSmoke(cars[explIdx].x + (Math.random() - 0.5) * 20, cars[explIdx].z + (Math.random() - 0.5) * 20);
            eliminatedRef.current.add(potatoHolderRef.current);
            if (explIdx === 0) { ttsSpeak('Boom! The potato exploded on you! You are eliminated!'); raceOverRef.current = true; }
            else ttsSpeak(`${cars[explIdx].name} exploded from the hot potato!`);
          }
          const alive = cars.slice(0, activeCarCountRef.current).filter(c => !eliminatedRef.current.has(c.id));
          if (alive.length <= 1) {
            raceOverRef.current = true;
            if (alive[0]?.id === 0) ttsSpeak("You're the last one standing! You win!");
          } else {
            potatoRoundRef.current++;
            const roundTime = Math.max(8, 15 - potatoRoundRef.current * 2);
            const newHolder = alive[Math.floor(Math.random() * alive.length)];
            potatoHolderRef.current = newHolder.id;
            potatoTimerRef.current = roundTime;
            if (newHolder.id === 0) ttsSpeak('You have the hot potato!');
          }
        }
      }

      // KNOCKOUT
      if (gameMode === 'knockout') {
        knockoutTimerRef.current -= dt;
        if (knockoutTimerRef.current <= 0) {
          knockoutTimerRef.current = 30;
          let lastIdx = -1, lastScore = Infinity, nonElimCount = 0;
          for (let i = 0; i < activeCarCountRef.current; i++) {
            if (eliminatedRef.current.has(cars[i].id)) continue;
            nonElimCount++;
            const score = cars[i].laps * NUM_WAYPOINTS + cars[i].waypointIdx;
            if (score < lastScore) { lastScore = score; lastIdx = i; }
          }
          if (lastIdx >= 0 && nonElimCount > 1) {
            eliminatedRef.current.add(cars[lastIdx].id);
            cars[lastIdx].angularVelocity = (Math.random() > 0.5 ? 1 : -1) * 20;
            cars[lastIdx].speed = MAX_SPEED * 1.5;
            cars[lastIdx].heading += (Math.random() - 0.5) * Math.PI;
            for (let s = 0; s < 12; s++) spawnSmoke(cars[lastIdx].x + (Math.random() - 0.5) * 18, cars[lastIdx].z + (Math.random() - 0.5) * 18);
            if (lastIdx === 0) { ttsSpeak("You've been knocked out!"); raceOverRef.current = true; }
            else ttsSpeak(`${cars[lastIdx].name} has been knocked out!`);
            if (nonElimCount - 1 <= 1) {
              raceOverRef.current = true;
              for (let i = 0; i < activeCarCountRef.current; i++) {
                if (!eliminatedRef.current.has(cars[i].id)) {
                  if (cars[i].id === 0) ttsSpeak('You win the knockout race!');
                  else ttsSpeak(`${cars[i].name} wins the knockout race!`);
                  break;
                }
              }
            }
          }
        }
      }
    }

      // DEMOLITION DERBY
      if (gameMode === 'demolition') {
        // Car-car impact damage (per frame, proportional to relative speed)
        for (let i = 0; i < activeCarCountRef.current; i++) {
          if (eliminatedRef.current.has(cars[i].id)) continue;
          for (let j = i + 1; j < activeCarCountRef.current; j++) {
            if (eliminatedRef.current.has(cars[j].id)) continue;
            const dx = cars[i].x - cars[j].x, dz = cars[i].z - cars[j].z;
            if (dx * dx + dz * dz < CRASH_DISTANCE * CRASH_DISTANCE * 1.4) {
              const relSpd = Math.abs(cars[i].speed - cars[j].speed) + Math.abs(cars[i].angularVelocity - cars[j].angularVelocity) * 6;
              const dmg = relSpd * 0.00012;
              cars[i].damage = Math.min(1, cars[i].damage + dmg);
              cars[j].damage = Math.min(1, cars[j].damage + dmg);
            }
          }
        }
        // Eliminate fully-damaged cars
        for (let i = 0; i < activeCarCountRef.current; i++) {
          if (eliminatedRef.current.has(cars[i].id)) continue;
          if (cars[i].damage >= 1.0) {
            eliminatedRef.current.add(cars[i].id);
            for (let s = 0; s < 18; s++) spawnSmoke(cars[i].x + (Math.random() - 0.5) * 24, cars[i].z + (Math.random() - 0.5) * 24);
            if (cars[i].id === 0) {
              ttsSpeak("You've been destroyed! Game over!");
              raceOverRef.current = true;
            } else {
              ttsSpeak(`${cars[i].name} is out!`);
            }
          }
        }
        // Win condition: last car standing
        let aliveCount = 0;
        let survivor: CarState | null = null;
        for (let i = 0; i < activeCarCountRef.current; i++) {
          if (!eliminatedRef.current.has(cars[i].id)) { aliveCount++; survivor = cars[i]; }
        }
        if (aliveCount <= 1 && activeCarCountRef.current > 1 && !raceOverRef.current) {
          raceOverRef.current = true;
          if (survivor?.id === 0) ttsSpeak('Last car standing! You win the demolition derby!');
          else if (survivor) ttsSpeak(`${survivor.name} wins the demolition derby!`);
        }
      }

      // DRIFT
      if (gameMode === 'drift') {
        driftTimerRef.current -= dt;
        // Lateral slip = how sideways the car is moving relative to its heading
        const lateralSlip = Math.abs(player.angularVelocity) * (Math.abs(player.speed) / Math.max(MAX_SPEED, 1));
        const isDrifting = lateralSlip > 0.1 && Math.abs(player.speed) > 10;
        if (isDrifting) {
          driftComboTimeRef.current += dt;
          const combo = driftComboTimeRef.current > 4 ? 3 : driftComboTimeRef.current > 2 ? 2 : 1;
          driftScoreRef.current += lateralSlip * combo * dt * 700;
          if (Math.random() < 0.65) spawnSmoke(player.x, player.z);
        } else {
          driftComboTimeRef.current = Math.max(0, driftComboTimeRef.current - dt * 2.5);
        }
        // AI drift scoring — based on their natural angular velocity during collisions/turns
        for (let i = 1; i < activeCarCountRef.current; i++) {
          const aiSlip = Math.abs(cars[i].angularVelocity) * (Math.abs(cars[i].speed) / Math.max(MAX_SPEED, 1));
          if (aiSlip > 0.1 && Math.abs(cars[i].speed) > 10) {
            aiDriftScoresRef.current[i - 1] = (aiDriftScoresRef.current[i - 1] ?? 0) + aiSlip * dt * 480;
          }
        }
        if (driftTimerRef.current <= 0) {
          driftTimerRef.current = 0;
          raceOverRef.current = true;
          let bestScore = driftScoreRef.current;
          let winnerName = 'you';
          let playerWon = true;
          for (let i = 0; i < Math.min(activeCarCountRef.current - 1, MAX_BOTS); i++) {
            const s = aiDriftScoresRef.current[i] ?? 0;
            if (s > bestScore) { bestScore = s; winnerName = cars[i + 1].name; playerWon = false; }
          }
          if (playerWon) ttsSpeak(`Time's up! You win with ${Math.round(driftScoreRef.current)} drift points!`);
          else ttsSpeak(`Time's up! ${winnerName} wins the drift battle!`);
        }
      }

    // Eliminated cars: stop physics
    if (gameMode !== 'race' && eliminatedRef.current.size > 0) {
      for (let i = 0; i < activeCarCountRef.current; i++) {
        if (eliminatedRef.current.has(cars[i].id)) {
          cars[i].speed *= Math.exp(-5 * dt);
          cars[i].angularVelocity *= Math.exp(-3 * dt);
        }
      }
    }

    // Mode indicator mesh updates
    for (let i = 0; i < activeCarCountRef.current; i++) {
      const mesh = modeIndicatorRefs.current[i];
      if (!mesh) continue;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (gameMode === 'infection') {
        const inf = infectedRef.current.has(cars[i].id);
        mesh.visible = inf;
        mat.color.set('#00ff44'); mat.emissive.set('#00aa33');
      } else if (gameMode === 'hotPotato') {
        mesh.visible = potatoHolderRef.current === cars[i].id;
        mat.color.set('#FF7700'); mat.emissive.set('#FF4400');
      } else if (gameMode === 'knockout') {
        mesh.visible = eliminatedRef.current.has(cars[i].id);
        mat.color.set('#660000'); mat.emissive.set('#330000');
      } else if (gameMode === 'drift') {
        const isDriftingAI = i > 0 && Math.abs(cars[i].angularVelocity) > 0.5;
        const isPlayerDrifting = i === 0 && driftComboTimeRef.current > 0.3;
        mesh.visible = isDriftingAI || isPlayerDrifting;
        mat.color.set('#8833ff'); mat.emissive.set('#6600ff');
      } else if (gameMode === 'demolition') {
        mesh.visible = cars[i].damage > 0.45 && !eliminatedRef.current.has(cars[i].id);
        mat.color.set(cars[i].damage > 0.8 ? '#ff1100' : '#ff7700');
        mat.emissive.set(cars[i].damage > 0.8 ? '#880000' : '#442200');
      } else {
        mesh.visible = false;
      }
    }

    // Spawn smoke — bigger spins / harder hits + continuous from damaged cars
    for (let ci = 0; ci < activeCarCountRef.current; ci++) {
      const car = cars[ci];
      const av = Math.abs(car.angularVelocity);
      if (av > 0.8 && Math.random() < Math.min(av * 0.09, 0.55)) {
        const count = av > 4.5 ? 4 : av > 3 ? 3 : av > 1.8 ? 2 : 1;
        for (let s = 0; s < count; s++) spawnSmoke(car.x, car.z);
      }
      // Damaged cars trail smoke continuously
      if (car.damage > 0.4 && Math.random() < (car.damage - 0.4) * 0.12) {
        spawnSmoke(car.x, car.z);
      }
    }
    // Age and drift smoke
    for (const sp of smokeParticles.current) {
      if (!sp.active) continue;
      sp.age += dt;
      sp.x += sp.vx * dt;
      sp.z += sp.vz * dt;
      sp.vx *= Math.exp(-2 * dt);
      sp.vz *= Math.exp(-2 * dt);
      if (sp.age >= sp.maxAge) sp.active = false;
    }
    // Sync smoke meshes
    for (let i = 0; i < MAX_SMOKE; i++) {
      const mesh = smokeRefs.current[i];
      if (!mesh) continue;
      const sp = smokeParticles.current[i];
      if (!sp.active) {
        mesh.visible = false;
      } else {
        mesh.visible = true;
        const p = Math.min(sp.age / sp.maxAge, 1);
        mesh.position.set(sp.x, sp.y + p * 5.5, sp.z);
        mesh.scale.setScalar(0.7 + p * 4.5);
        (mesh.material as THREE.MeshStandardMaterial).opacity = Math.max(0, (1 - p) * 0.55);
      }
    }
    // Age explosion particles
    for (const ep of explosionParticles.current) {
      if (!ep.active) continue;
      ep.age += dt;
      ep.x += ep.vx * dt;
      ep.z += ep.vz * dt;
      ep.vx *= Math.exp(-3 * dt);
      ep.vz *= Math.exp(-3 * dt);
      if (ep.age >= ep.maxAge) ep.active = false;
    }
    // Sync explosion meshes
    for (let i = 0; i < MAX_EXPLOSION; i++) {
      const mesh = explosionRefs.current[i];
      if (!mesh) continue;
      const ep = explosionParticles.current[i];
      if (!ep.active) {
        mesh.visible = false;
      } else {
        mesh.visible = true;
        const p = Math.min(ep.age / ep.maxAge, 1);
        // Expand fast then fade: scale peaks at ~40% life, opacity fades from ~60% life
        const growP = Math.min(p / 0.4, 1);
        const fadeP = Math.max(0, (p - 0.5) / 0.5);
        mesh.position.set(ep.x, ep.scale * 0.5 + p * ep.scale * 0.8, ep.z);
        mesh.scale.setScalar(ep.scale * (0.3 + growP * 0.7));
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.opacity = Math.max(0, (1 - fadeP) * 0.92);
        // Shift color from bright yellow → orange → dark red as it ages
        const r = 1.0;
        const g = Math.max(0, 0.6 - p * 0.6);
        mat.color.setRGB(r, g, 0);
        mat.emissive.setRGB(r * 0.8, g * 0.5, 0);
        mat.emissiveIntensity = Math.max(0, 1.5 - p * 1.5);
      }
    }

    // Sync mesh transforms — position + banking roll (+0.3 Y lift clears road markings)
    for (let i = 0; i < activeCarCountRef.current; i++) {
      const ref = carGroupRefs.current[i];
      if (!ref) continue;
      ref.position.set(cars[i].x, getCarBankY(cars[i].x, cars[i].z) + 0.3, cars[i].z);
      const h = cars[i].heading;
      // Sample road height left/right of car to get actual slope — sign-consistent regardless of heading
      const gs = 5.0;
      const cRX = Math.cos(h), cRZ = -Math.sin(h);
      const rightY = getCarBankY(cars[i].x + cRX * gs, cars[i].z + cRZ * gs);
      const leftY  = getCarBankY(cars[i].x - cRX * gs, cars[i].z - cRZ * gs);
      const roll = Math.atan2(rightY - leftY, 2 * gs);
      _yawEuler.set(0, h + Math.PI, 0);
      _yawQ.setFromEuler(_yawEuler);
      _rollVec.set(0, 0, -1); // model local forward axis (car nose = −Z before yaw)
      _rollQ.setFromAxisAngle(_rollVec, roll);
      ref.quaternion.multiplyQuaternions(_yawQ, _rollQ); // local roll then world yaw

      // Sync demolition health bars via direct DOM mutation (no React re-render)
      if (gameMode === 'demolition') {
        const fill = healthBarFillRefs.current[i];
        const label = healthBarLabelRefs.current[i];
        const car = cars[i];
        const isDead = eliminatedRef.current.has(car.id);
        const hp = Math.max(0, 1 - car.damage);
        if (fill) {
          fill.style.width = `${Math.round(hp * 100)}%`;
          fill.style.background = hp > 0.6 ? '#22dd44' : hp > 0.3 ? '#ffcc00' : '#ff3311';
        }
        if (label) {
          label.textContent = isDead ? '💀 DEAD' : car.name;
          label.style.opacity = isDead ? '0.5' : '1';
        }
      }
    }

    // Camera — free-fly spectator cam after race ends, chase cam during race
    if (raceOverRef.current) {
      // Initialise spectator position to player's last location
      if (!spectatorInitRef.current) {
        spectatorInitRef.current = true;
        spectatorFlyRef.current = { x: player.x, z: player.z };
        spectatorAngleRef.current = player.heading;
      }
      const SPEC_SPEED = 80;
      const SPEC_TURN = 1.8;
      if (keys.forward) {
        spectatorFlyRef.current.x += Math.sin(spectatorAngleRef.current) * SPEC_SPEED * dt;
        spectatorFlyRef.current.z += Math.cos(spectatorAngleRef.current) * SPEC_SPEED * dt;
      }
      if (keys.back) {
        spectatorFlyRef.current.x -= Math.sin(spectatorAngleRef.current) * SPEC_SPEED * dt;
        spectatorFlyRef.current.z -= Math.cos(spectatorAngleRef.current) * SPEC_SPEED * dt;
      }
      if (keys.left)  spectatorAngleRef.current += SPEC_TURN * dt;
      if (keys.right) spectatorAngleRef.current -= SPEC_TURN * dt;
      const behindX = spectatorFlyRef.current.x - Math.sin(spectatorAngleRef.current) * 22;
      const behindZ = spectatorFlyRef.current.z - Math.cos(spectatorAngleRef.current) * 22;
      const camSmooth = 1 - Math.exp(-5 * dt);
      camera.position.x += (behindX - camera.position.x) * camSmooth;
      camera.position.y += (24 - camera.position.y) * camSmooth;
      camera.position.z += (behindZ - camera.position.z) * camSmooth;
      const lookX = spectatorFlyRef.current.x + Math.sin(spectatorAngleRef.current) * 35;
      const lookZ = spectatorFlyRef.current.z + Math.cos(spectatorAngleRef.current) * 35;
      camera.lookAt(lookX, 3, lookZ);
    } else {
      const followDist = 22 + player.speed * 0.1;
      const targetCamX = player.x - Math.sin(player.heading) * followDist;
      const targetCamZ = player.z - Math.cos(player.heading) * followDist;
      const camBankY = getCarBankY(targetCamX, targetCamZ);
      const camSmooth = 1 - Math.exp(-8 * dt);
      camera.position.x += (targetCamX - camera.position.x) * camSmooth;
      camera.position.y += (camBankY + 16 - camera.position.y) * camSmooth;
      camera.position.z += (targetCamZ - camera.position.z) * camSmooth;
      const lookAhead = 22;
      const lookX = player.x + Math.sin(player.heading) * lookAhead;
      const lookZ = player.z + Math.cos(player.heading) * lookAhead;
      camera.lookAt(lookX, getCarBankY(lookX, lookZ) + 1.5, lookZ);
      // Speed-based FOV: widens at high speed for a rush feel
      const pCam = camera as THREE.PerspectiveCamera;
      const targetFov = 62 + (Math.abs(player.speed) / MAX_SPEED) * 18;
      pCam.fov += (targetFov - pCam.fov) * Math.min(1, dt * 3);
      pCam.updateProjectionMatrix();
    }
    // Camera shake on collision
    if (shakeRef.current > 0) {
      const s = shakeRef.current;
      camera.position.x += (Math.random() - 0.5) * s * 1.5;
      camera.position.y += Math.random() * s * 0.3;
      camera.position.z += (Math.random() - 0.5) * s * 1.5;
    }

    // Send local player position to multiplayer server (throttled to ~20 Hz)
    if (onPositionUpdate) {
      posUpdateTimer.current += dt;
      if (posUpdateTimer.current >= 0.05) {
        posUpdateTimer.current = 0;
        onPositionUpdate(player.x, player.z, player.heading, player.speed, player.braking, player.laps);
      }
    }

    // Sync remote player overlay meshes from network state
    if (remotePlayersRef) {
      const remotes = remotePlayersRef.current;
      for (let i = 0; i < MAX_REMOTE; i++) {
        const ref = remoteGroupRefs.current[i];
        if (!ref) continue;
        const remote = remotes[i];
        if (!remote) {
          ref.visible = false;
        } else {
          ref.visible = true;
          ref.position.set(remote.x, getCarBankY(remote.x, remote.z) + 0.3, remote.z);
          const h = remote.heading;
          const gs = 5.0;
          const cRX = Math.cos(h), cRZ = -Math.sin(h);
          const rightY = getCarBankY(remote.x + cRX * gs, remote.z + cRZ * gs);
          const leftY  = getCarBankY(remote.x - cRX * gs, remote.z - cRZ * gs);
          const roll = Math.atan2(rightY - leftY, 2 * gs);
          _yawEuler.set(0, h + Math.PI, 0);
          _yawQ.setFromEuler(_yawEuler);
          _rollVec.set(0, 0, -1);
          _rollQ.setFromAxisAngle(_rollVec, roll);
          ref.quaternion.multiplyQuaternions(_yawQ, _rollQ);
        }
      }
    }

    // UI update
    uiTimer.current += dt;
    if (uiTimer.current >= 0.1) {
      uiTimer.current = 0;

      // Build combined leaderboard: local cars + remote players
      type ScoredEntry = LeaderEntry & { score: number };
      const board: ScoredEntry[] = [];
      if (gameMode === 'drift') {
        for (let i = 0; i < activeCarCountRef.current; i++) {
          const c = cars[i];
          const pts = i === 0 ? driftScoreRef.current : (aiDriftScoresRef.current[i - 1] ?? 0);
          board.push({ name: c.name, laps: Math.round(pts), score: pts, isPlayer: c.id === 0, color: c.id === 0 ? '#FFFFFF' : c.color });
        }
      } else {
        for (let i = 0; i < activeCarCountRef.current; i++) {
          const c = cars[i];
          board.push({
            name: c.name, laps: c.laps,
            score: c.laps * NUM_WAYPOINTS + c.waypointIdx,
            isPlayer: c.id === 0, color: c.id === 0 ? '#FFFFFF' : c.color,
          });
        }
        if (remotePlayersRef) {
          for (const r of remotePlayersRef.current) {
            board.push({
              name: r.name, laps: r.laps,
              score: r.laps * NUM_WAYPOINTS + getNearestWaypointIdx(r.x, r.z),
              isPlayer: false, color: r.color,
            });
          }
        }
      }
      board.sort((a, b) => b.score - a.score);
      const pos = board.findIndex(e => e.isPlayer) + 1;
      const leaderboard: LeaderEntry[] = board.map(({ name, laps, isPlayer, color }) => ({ name, laps, isPlayer, color }));

      // TTS race announcements
      if (greenFlagTimerRef.current > 2.9 && !ttsGreenRef.current) {
        ttsGreenRef.current = true;
        ttsSpeak('Green flag! Go go go!');
      } else if (greenFlagTimerRef.current < 0.5) { ttsGreenRef.current = false; }
      if (totalLaps > 0 && player.laps === totalLaps - 1 && !ttsFinalLapRef.current && player.laps > 0) {
        ttsFinalLapRef.current = true;
        ttsSpeak('White flag! Final lap!');
      }
      if (raceOverRef.current && !ttsFinishedRef.current) {
        ttsFinishedRef.current = true;
        ttsSpeak('Checkered flag! The race is over!');
      }

      // Rain particle animation
      if (rainActive) {
        for (let i = 0; i < RAIN_COUNT; i++) {
          rainPositions[i*3+1] -= 60 * dt;
          if (rainPositions[i*3+1] < -2) {
            rainPositions[i*3]   = (Math.random() - 0.5) * 700;
            rainPositions[i*3+1] = 73;
            rainPositions[i*3+2] = (Math.random() - 0.5) * 700;
          }
        }
        if (rainGeoRef.current?.attributes.position) {
          (rainGeoRef.current.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        }
      }

      const driftComboNow = driftComboTimeRef.current > 4 ? 3 : driftComboTimeRef.current > 2 ? 2 : 1;
      let demolitionAlive: number | undefined;
      if (gameMode === 'demolition') {
        demolitionAlive = 0;
        for (let i = 0; i < activeCarCountRef.current; i++) {
          if (!eliminatedRef.current.has(cars[i].id)) demolitionAlive++;
        }
      }
      onUiUpdate({ speed: player.speed, laps: player.laps, position: pos, countdown: -1, totalCars: activeCarCountRef.current, damage: player.damage, lapTime: lapTimeRef.current, lastLapTime: lastLapTimeRef.current, bestLapTime: bestLapTimeRef.current, leaderboard, raceFinished: raceOverRef.current, totalLaps, greenFlag: greenFlagTimerRef.current > 0, rainDelay: rainActive, nukeActive: nukeTimerRef.current > 0, spectating: spectatorInitRef.current, activeGameMode: gameMode, playerInfected: gameMode === 'infection' ? infectedRef.current.has(0) : undefined, playerHasPotato: gameMode === 'hotPotato' ? potatoHolderRef.current === 0 : undefined, potatoTimer: gameMode === 'hotPotato' ? Math.max(0, potatoTimerRef.current) : undefined, knockoutTimer: gameMode === 'knockout' ? Math.max(0, knockoutTimerRef.current) : undefined, modeElimCount: gameMode !== 'race' ? eliminatedRef.current.size : undefined, driftScore: gameMode === 'drift' ? driftScoreRef.current : undefined, driftCombo: gameMode === 'drift' ? driftComboNow : undefined, driftTimer: gameMode === 'drift' ? Math.max(0, driftTimerRef.current) : undefined, demolitionAlive, nitroFuel: nitroFuelRef.current, wrongWay: wrongWayTimerRef.current > 0.8, pitStopTimer: pitStopTimerRef.current >= 0 ? pitStopTimerRef.current : undefined, carPositions: Array.from({ length: activeCarCountRef.current }, (_, i) => ({ x: cars[i].x, z: cars[i].z, isPlayer: i === 0, color: cars[i].color })).concat((remotePlayersRef?.current ?? []).map(r => ({ x: r.x, z: r.z, isPlayer: false, color: r.color }))) });
    }
  });

  return (
    <>
      <color attach="background" args={[rainActive ? '#1e2d3a' : '#9ab8d4']} />
      <fog attach="fog" args={[rainActive ? '#1e2d3a' : '#9ab8d4', rainActive ? 120 : 600, rainActive ? 600 : 2000]} />

      <ambientLight intensity={rainActive ? 0.28 : 0.55} color={rainActive ? '#8898aa' : '#ffe4c0'} />
      <directionalLight
        position={[200, 280, 120]}
        intensity={rainActive ? 0.4 : 1.6}
        color={rainActive ? '#aabbcc' : '#fff5e0'}
      />
      <hemisphereLight args={[rainActive ? '#3a5060' : '#c9e4ff', rainActive ? '#1a2a1a' : '#3a6e3a', 0.55]} />

      <Track gameMode={gameMode} />

      {/* Rain particles */}
      {rainActive && (
        <points>
          <bufferGeometry ref={rainGeoRef}>
            <bufferAttribute attach="attributes-position" args={[rainPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.5} color="#aad4ff" transparent opacity={0.65} sizeAttenuation />
        </points>
      )}

      {/* Pit road — proper infield pit lane parallel to front straight */}
      {gameMode === 'race' && (
        <>
          {/* Main pit road surface — concrete gray strip inside inner wall */}
          <mesh position={[210, 0.06, 0]}>
            <boxGeometry args={[36, 0.12, 110]} />
            <meshStandardMaterial color="#808080" />
          </mesh>

          {/* Pit road outer white boundary line (track-side edge) */}
          <mesh position={[228, 0.14, 0]}>
            <boxGeometry args={[0.6, 0.05, 76]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>

          {/* Pit stall painted zone — yellow */}
          <mesh position={[210, 0.13, 0]}>
            <boxGeometry args={[34, 0.04, 76]} />
            <meshStandardMaterial color="#FFCC00" transparent opacity={0.55} />
          </mesh>

          {/* Active service box — red center zone where repair triggers */}
          <mesh position={[210, 0.14, 0]}>
            <boxGeometry args={[32, 0.03, 40]} />
            <meshStandardMaterial color="#CC2200" transparent opacity={0.5} />
          </mesh>

          {/* Pit stall divider lines */}
          {[-30, -15, 0, 15, 30].map(z => (
            <mesh key={`stall-${z}`} position={[210, 0.15, z]}>
              <boxGeometry args={[34, 0.04, 0.5]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          ))}

          {/* Inner concrete pit wall — solid barrier at infield edge */}
          <mesh position={[192, 1.5, 0]}>
            <boxGeometry args={[2, 3, 114]} />
            <meshStandardMaterial color="#cccccc" />
          </mesh>
          {/* Pit wall cap */}
          <mesh position={[192, 3.1, 0]}>
            <boxGeometry args={[2.6, 0.5, 114]} />
            <meshStandardMaterial color="#aaaaaa" />
          </mesh>

          {/* Pit entry opening blend surface (z≈+49) */}
          <mesh position={[226, 0.07, 49]}>
            <boxGeometry args={[16, 0.12, 14]} />
            <meshStandardMaterial color="#777777" />
          </mesh>
          {/* Pit entry white entry line */}
          <mesh position={[228, 0.16, 42]}>
            <boxGeometry args={[0.7, 0.06, 1.2]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>

          {/* Pit exit opening blend surface (z≈-49) */}
          <mesh position={[226, 0.07, -49]}>
            <boxGeometry args={[16, 0.12, 14]} />
            <meshStandardMaterial color="#777777" />
          </mesh>
          {/* Pit exit white exit line */}
          <mesh position={[228, 0.16, -42]}>
            <boxGeometry args={[0.7, 0.06, 1.2]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </>
      )}

      {carsRef.current.slice(0, renderCarCount).map((car, i) => (
        <group
          key={car.id}
          ref={(el) => { carGroupRefs.current[i] = el; }}
          position={[car.x, 0, car.z]}
          rotation={[0, car.heading + Math.PI, 0]}
        >
          <CarMesh color={car.color} braking={i === 0 && car.braking} damage={car.damage} vehicleType={vehicleType} />
          {i === 0 && carNumber !== undefined && (
            <CarNumberSprite number={carNumber} color={carColor ?? '#CC1111'} />
          )}
          <mesh ref={(el) => { modeIndicatorRefs.current[i] = el; }} position={[0, 5.5, 0]} visible={false}>
            <sphereGeometry args={[1.8, 8, 6]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.5} transparent opacity={0.85} />
          </mesh>
          {gameMode === 'demolition' && (
            <Html position={[0, 8.5, 0]} center distanceFactor={60} style={{ pointerEvents: 'none', userSelect: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div
                  ref={(el) => { healthBarLabelRefs.current[i] = el; }}
                  style={{
                    fontSize: 9, fontWeight: 800, color: '#fff',
                    fontFamily: '"Arial Narrow", Arial, sans-serif',
                    letterSpacing: 0.8, whiteSpace: 'nowrap',
                    textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                  }}
                >
                  {car.name}
                </div>
                <div style={{
                  width: 52, height: 6, background: 'rgba(0,0,0,0.7)',
                  borderRadius: 3, overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.25)',
                }}>
                  <div
                    ref={(el) => { healthBarFillRefs.current[i] = el; }}
                    style={{
                      height: '100%', width: '100%',
                      background: '#22dd44',
                      borderRadius: 3,
                      transition: 'width 0.1s linear',
                    }}
                  />
                </div>
              </div>
            </Html>
          )}
        </group>
      ))}

      {/* Sky — atmospheric scattering in clear weather, overcast sphere in rain */}
      {rainActive ? (
        <mesh>
          <sphereGeometry args={[1500, 16, 8]} />
          <meshBasicMaterial color="#1e2d3a" side={THREE.BackSide} />
        </mesh>
      ) : (
        <Sky
          distance={450000}
          sunPosition={[200, 80, -300]}
          turbidity={7}
          rayleigh={0.45}
          mieCoefficient={0.004}
          mieDirectionalG={0.88}
        />
      )}

      {/* Remote player cars — up to 5 friends visible as overlay cars */}
      {REMOTE_COLORS.map((color, i) => (
        <group
          key={`remote-${i}`}
          ref={(el) => { remoteGroupRefs.current[i] = el; }}
          visible={false}
        >
          <CarMesh color={color} braking={false} vehicleType={vehicleType} />
          {remotePlayerNames && remotePlayerNames[i] && (
            <Html position={[0, 9, 0]} center distanceFactor={60} style={{ pointerEvents: 'none', userSelect: 'none' }}>
              <div style={{
                background: 'rgba(0,0,0,0.82)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: '"Arial Narrow", Arial, sans-serif',
                padding: '2px 8px',
                borderRadius: 3,
                whiteSpace: 'nowrap',
                letterSpacing: 1,
                border: `1px solid ${color}`,
              }}>
                {remotePlayerNames[i]}
              </div>
            </Html>
          )}
        </group>
      ))}

      {/* Wreck smoke particles */}
      {Array.from({ length: MAX_SMOKE }, (_, i) => (
        <mesh
          key={`smoke-${i}`}
          ref={(el) => { smokeRefs.current[i] = el; }}
          visible={false}
        >
          <sphereGeometry args={[1, 7, 5]} />
          <meshStandardMaterial color="#909090" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}

      {/* Nuke explosion fireballs */}
      {Array.from({ length: MAX_EXPLOSION }, (_, i) => (
        <mesh
          key={`explosion-${i}`}
          ref={(el) => { explosionRefs.current[i] = el; }}
          visible={false}
        >
          <sphereGeometry args={[1, 10, 7]} />
          <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={1.5} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}
