import { TRACK, NUM_WAYPOINTS } from './constants';

export interface Vec2 { x: number; z: number; }

// Daytona-style banking: ~3° on straights, ~31° in turns
// Returns height (in units) of outer edge above inner edge at angle t
export function getBankHeight(t: number): number {
  const s = Math.sin(t);
  return 1.5 + 22.5 * s * s; // ~3° straights, ~25° banked corners
}

// Get the visual Y elevation for a car at (x, z) based on track banking
export function getCarBankY(x: number, z: number): number {
  const t = Math.atan2(-z, x);
  const maxBankH = getBankHeight(t);
  // Lateral position: 0 = inner wall, 1 = outer wall
  const ra = TRACK.innerA / TRACK.outerA;
  const rb = TRACK.innerB / TRACK.outerB;
  const ct = Math.cos(t);
  const st = Math.sin(t);
  const innerNorm = Math.sqrt(ra * ra * ct * ct + rb * rb * st * st);
  const outerNorm = Math.sqrt((x / TRACK.outerA) ** 2 + (z / TRACK.outerB) ** 2);
  const lateralFrac = Math.max(0, Math.min(1, (outerNorm - innerNorm) / (1 - innerNorm)));
  return lateralFrac * maxBankH;
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
