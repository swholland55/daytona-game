import { TRACK, NUM_WAYPOINTS } from './constants';

export interface Vec2 { x: number; z: number; }

// Daytona-style banking: ~3° on straights, ~31° in turns
// Returns height (in units) of outer edge above inner edge at angle t
export function getBankHeight(t: number): number {
  const s = Math.sin(t);
  return 1.5 + 22.5 * s * s; // ~3° straights, ~25° banked corners
}

// Get the visual Y elevation for a car at (x, z) based on track banking.
// Normalise by centerB/centerA before atan2 so the angle matches the ribbon
// segment in asymmetric corners (plain atan2(-z,x) diverges from the segment
// angle when innerB/outerB ≠ innerA/outerA, causing the car to float).
export function getCarBankY(x: number, z: number): number {
  const t = Math.atan2(-z / TRACK.centerB, x / TRACK.centerA);
  const maxBankH = getBankHeight(t);
  const ct = Math.cos(t), st = Math.sin(t);
  const innerX = TRACK.innerA * ct, innerZ = -TRACK.innerB * st;
  const outerX = TRACK.outerA * ct, outerZ = -TRACK.outerB * st;
  const rdx = outerX - innerX, rdz = outerZ - innerZ;
  const lenSq = rdx * rdx + rdz * rdz;
  const s = lenSq > 0
    ? Math.max(0, Math.min(1, ((x - innerX) * rdx + (z - innerZ) * rdz) / lenSq))
    : 0;
  return s * maxBankH;
}

// Track path: (a*cos(t), -b*sin(t)) — counterclockwise NASCAR direction
// t=0: rightmost (start/finish), t=π/2: bottom, t=π: left, t=3π/2: top
export function getOvalPoint(t: number, a: number, b: number): Vec2 {
  return { x: a * Math.cos(t), z: -b * Math.sin(t) };
}

export const waypoints: Vec2[] = Array.from({ length: NUM_WAYPOINTS }, (_, i) => {
  const t = (i / NUM_WAYPOINTS) * Math.PI * 2;
  return getOvalPoint(t, TRACK.centerA, TRACK.centerB);
});

export function getNearestWaypointIdx(x: number, z: number): number {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < waypoints.length; i++) {
    const d = (waypoints[i].x - x) ** 2 + (waypoints[i].z - z) ** 2;
    if (d < minDist) { minDist = d; minIdx = i; }
  }
  return minIdx;
}

export function getOvalTangentHeading(t: number): number {
  const tx = -TRACK.centerA * Math.sin(t);
  const tz = -TRACK.centerB * Math.cos(t);
  return Math.atan2(tx, tz);
}

export function getWaypointHeading(idx: number): number {
  const t = (idx / NUM_WAYPOINTS) * Math.PI * 2;
  return getOvalTangentHeading(t);
}
