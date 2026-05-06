export type VehicleType = 'car' | 'truck' | 'f1';
export type GameMode = 'race' | 'infection' | 'hotPotato' | 'knockout' | 'drift' | 'demolition' | 'playground';

export enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  boost = 'boost',
}

export interface CarState {
  id: number;
  x: number;
  z: number;
  heading: number;
  speed: number;
  angularVelocity: number;
  color: string;
  name: string;
  laps: number;
  waypointIdx: number;
  lapReady: boolean;
  prevZ: number;
  lateralOffset: number;
  targetWpIdx: number;
  speedFactor: number;
  braking: boolean;
  damage: number; // 0–1, resets each lap
}

export interface ChatMessage {
  id: string;
  fromName: string;
  fromColor: string;
  text: string;
  timestamp: number;
}

export interface LeaderEntry {
  name: string;
  laps: number;
  isPlayer: boolean;
  color: string;
}

export interface UiState {
  speed: number;
  laps: number;
  position: number;
  countdown: number; // >0 = counting down, 0 = "GO!", -1 = racing
  totalCars?: number;
  damage?: number;
  lapTime?: number;
  lastLapTime?: number;
  bestLapTime?: number;
  leaderboard?: LeaderEntry[];
  raceFinished?: boolean;
  totalLaps?: number;
  inPitStop?: boolean;
  pitTimeLeft?: number;
  yellowFlag?: boolean;
  yellowFlagTime?: number;
  greenFlag?: boolean;
  rainDelay?: boolean;
  nukeActive?: boolean;
  spectating?: boolean;
  activeGameMode?: GameMode;
  chatMessages?: ChatMessage[];
  playerInfected?: boolean;
  playerHasPotato?: boolean;
  potatoTimer?: number;
  knockoutTimer?: number;
  modeElimCount?: number;
  driftScore?: number;
  driftCombo?: number;
  driftTimer?: number;
  demolitionAlive?: number;
  carPositions?: { x: number; z: number; isPlayer: boolean; color: string }[];
  nitroFuel?: number;
  wrongWay?: boolean;
  pitStopTimer?: number;
}
