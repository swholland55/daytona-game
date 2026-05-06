export const TRACK = {
  outerA: 300,
  outerB: 175,
  innerA: 250,
  innerB: 125,
  centerA: 275,
  centerB: 150,
};

export const MAX_SPEED = 110;
export const REVERSE_SPEED = 14;
export const ACCEL_RATE = 55;
export const BRAKE_RATE = 85;
export const DRAG = 0.55;
export const STEER_RATE = 1.85;
export const STEER_SPEED_FACTOR = 0.022;
export const CRASH_DISTANCE = 6.5;

export const AI_COUNT = 5;
export const MAX_BOTS = 9;
export const NUM_WAYPOINTS = 144;

export const CAR_COLORS = [
  '#CC1111',
  '#1155EE',
  '#EE7700',
  '#DDCC00',
  '#11AA44',
  '#AA22CC',
  '#00CCCC',
  '#FF66AA',
  '#88CC00',
  '#FF8800',
];

export const CAR_NAMES = [
  'PLAYER',
  'EARNHARDT',
  'PETTY',
  'GORDON',
  'JOHNSON',
  'STEWART',
  'WALTRIP',
  'LABONTE',
  'JARRETT',
  'MARTIN',
];

export const LAP_OPTIONS = [3, 5, 10, 20, 30, 50] as const;

export const KEY_MAP = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'back', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'boost', keys: ['Space', 'ShiftLeft', 'ShiftRight'] },
];
