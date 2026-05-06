import { TRACK, NUM_WAYPOINTS } from './constants';

export interface Vec2 { x: number; z: number; }

// Daytona-style banking: ~3° on straights, ~31° in turns
// Returns height (in units) of outer edge above inner edge at angle t
export function getBankHeight(t: number): number {
  const s = Math.sin(t);
  return 1.5 + 22.5 * s * s; // ~3° straights, ~25° banked corners
}

// Get the visual Y elevation for a car at (x, z) based on track banking.
// Uses the nearest waypoint angle so the lateral fraction is projected correctly
// along the actual ribbon radial direction — avoids floating artefacts in corners
// where atan2 of the car's world position diverges from the ribbon segment angle.
export function getCarBankY(x: number, z: number): number {
  const wpIdx = getNearestWaypointIdx(x, z);
  const t = (wpIdx / NUM_WAYPOINTS) * Math.PI * 2;
  const maxBankH = getBankHeight(t);
  const ct = Math.cos(t), st = Math.sin(t);
  // Ribbon endpoints at this angle
  const innerX = TRACK.innerA * ct, innerZ = -TRACK.innerB * st;
  const outerX = TRACK.outerA * ct, outerZ = -TRACK.outerB * st;
  const rdx = outerX - innerX, rdz = outerZ - innerZ;
  const lenSq = rdx * rdx + rdz * rdz;
  // Project car onto the radial direction to get true lateral fraction
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
