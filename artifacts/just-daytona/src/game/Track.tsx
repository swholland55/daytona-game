import { useMemo } from 'react';
import * as THREE from 'three';
import { TRACK } from './constants';
import { getBankHeight } from './trackMath';

const SEGS = 256;
const WALL_H = 2.4;
const SLOPE_W = 22;
const BERM_W = 85;

// ── Ribbon geometry helper ─────────────────────────────────────────────────
function buildRibbon(
  getInner: (t: number) => [number, number, number],
  getOuter: (t: number) => [number, number, number],
  segs = SEGS,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const [ix, iy, iz] = getInner(t);
    const [ox, oy, oz] = getOuter(t);
    pos.push(ix, iy, iz, ox, oy, oz);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ── Banked asphalt surface ─────────────────────────────────────────────────
function buildTrackGeo() {
  return buildRibbon(
    (t) => [TRACK.innerA * Math.cos(t), 0, -TRACK.innerB * Math.sin(t)],
    (t) => [TRACK.outerA * Math.cos(t), getBankHeight(t), -TRACK.outerB * Math.sin(t)],
  );
}

// ── Concrete back-slope ───────────────────────────────────────────────────
function buildSlopeGeo() {
  return buildRibbon(
    (t) => [TRACK.outerA * Math.cos(t), getBankHeight(t), -TRACK.outerB * Math.sin(t)],
    (t) => [(TRACK.outerA + SLOPE_W) * Math.cos(t), 0, -(TRACK.outerB + SLOPE_W) * Math.sin(t)],
  );
}

// ── Outer SAFER barrier wall ───────────────────────────────────────────────
function buildOuterWallGeo() {
  return buildRibbon(
    (t) => [TRACK.outerA * Math.cos(t), getBankHeight(t), -TRACK.outerB * Math.sin(t)],
    (t) => [TRACK.outerA * Math.cos(t), getBankHeight(t) + WALL_H, -TRACK.outerB * Math.sin(t)],
  );
}

// ── Inner concrete retaining wall — skips front-straight pit entry zone ───
// Gap covers |z| < 92 on positive-x side (t < 0.83 and t > 5.45)
function buildInnerWallGeo() {
  const GAP = 0.83; // radians — sin⁻¹(92/125)
  const pos: number[] = [];
  const idx: number[] = [];
  // Build two arcs: back half + turns, leaving the front straight open
  const arcs: [number, number][] = [[GAP, Math.PI * 2 - GAP]];
  for (const [tStart, tEnd] of arcs) {
    const arcSegs = Math.round(SEGS * (tEnd - tStart) / (Math.PI * 2));
    const base = pos.length / 3;
    for (let i = 0; i <= arcSegs; i++) {
      const t = tStart + (i / arcSegs) * (tEnd - tStart);
      const ix = TRACK.innerA * Math.cos(t), iz = -TRACK.innerB * Math.sin(t);
      pos.push(ix, 0, iz, ix, WALL_H, iz);
    }
    for (let i = 0; i < arcSegs; i++) {
      const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ── White outer edge stripe (at base of SAFER barrier) ────────────────────
function buildOuterEdgeGeo() {
  return buildRibbon(
    (t) => [(TRACK.outerA - 2) * Math.cos(t), getBankHeight(t) + 0.04, -(TRACK.outerB - 2) * Math.sin(t)],
    (t) => [TRACK.outerA * Math.cos(t), getBankHeight(t) + 0.04, -TRACK.outerB * Math.sin(t)],
  );
}

// ── White inner edge stripe (apron line) ──────────────────────────────────
function buildInnerEdgeGeo() {
  return buildRibbon(
    (t) => [TRACK.innerA * Math.cos(t), 0.04, -TRACK.innerB * Math.sin(t)],
    (t) => [(TRACK.innerA + 2) * Math.cos(t), 0.04, -(TRACK.innerB + 2) * Math.sin(t)],
  );
}

// ── Concrete apron (inside inner wall) ────────────────────────────────────
function buildApronGeo() {
  return buildRibbon(
    (t) => [(TRACK.innerA - 9) * Math.cos(t), 0.01, -(TRACK.innerB - 9) * Math.sin(t)],
    (t) => [TRACK.innerA * Math.cos(t), 0.01, -TRACK.innerB * Math.sin(t)],
  );
}

// ── Flat ellipse / ring helper ─────────────────────────────────────────────
function buildEllipseGeo(a: number, b: number, holeA?: number, holeB?: number) {
  const N = 180;
  const shape = new THREE.Shape();
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const x = a * Math.cos(t), y = -b * Math.sin(t);
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  }
  if (holeA !== undefined && holeB !== undefined) {
    const hole = new THREE.Path();
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2;
      const x = holeA * Math.cos(t), y = -holeB * Math.sin(t);
      i === 0 ? hole.moveTo(x, y) : hole.lineTo(x, y);
    }
    shape.holes.push(hole);
  }
  const geo = new THREE.ShapeGeometry(shape, 80);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

// ── Yellow dashed center line ──────────────────────────────────────────────
function CenterLine() {
  const dashes = useMemo(() => {
    const result: { x: number; y: number; z: number; rotY: number; signedTilt: number; len: number }[] = [];
    const N = 180;
    for (let i = 0; i < N; i++) {
      if (i % 3 !== 0) continue; // one dash, two-segment gap
      const t0 = (i / N) * Math.PI * 2;
      const t1 = ((i + 1) / N) * Math.PI * 2;
      const tm = (t0 + t1) / 2;
      const bh = getBankHeight(tm) * 0.5;
      const x = TRACK.centerA * Math.cos(tm);
      const z = -TRACK.centerB * Math.sin(tm);
      const tx = -TRACK.centerA * Math.sin(tm);
      const tz = -TRACK.centerB * Math.cos(tm);
      const rotY = Math.atan2(-tz, tx);

      // After group rotates [0,rotY,0], local +X = tangent (box long axis).
      // Banking tilt = rotation around local +X.
      // Sign: outDot = dot(radially-outward, group-local-+Z) = -sin(rotY+tm).
      // Positive tilt when outward is in local +Z (outer wall is above local +Z side).
      const outDot = -Math.sin(rotY + tm);
      const tiltMag = Math.atan2(getBankHeight(tm), TRACK.outerA - TRACK.innerA);
      const signedTilt = tiltMag * (outDot >= 0 ? 1 : -1);

      const p0x = TRACK.centerA * Math.cos(t0), p0z = -TRACK.centerB * Math.sin(t0);
      const p1x = TRACK.centerA * Math.cos(t1), p1z = -TRACK.centerB * Math.sin(t1);
      const len = Math.sqrt((p1x - p0x) ** 2 + (p1z - p0z) ** 2);
      result.push({ x, y: bh + 0.06, z, rotY, signedTilt, len });
    }
    return result;
  }, []);

  return (
    <>
      {dashes.map((d, i) => (
        <group key={i} position={[d.x, d.y, d.z]} rotation={[0, d.rotY, 0]}>
          <mesh rotation={[d.signedTilt, 0, 0]}>
            <boxGeometry args={[d.len, 0.06, 0.75]} />
            <meshStandardMaterial color="#FFE800" emissive="#554400" emissiveIntensity={0.15}
              polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ── Pit lane markers ───────────────────────────────────────────────────────
function PitLane() {
  const pitInner = TRACK.innerA - 9;
  const pitOuter = TRACK.innerA;
  const marks = useMemo(() => {
    const result: { x: number; z: number; len: number; rotY: number }[] = [];
    const N = 30;
    for (let i = 0; i <= N; i++) {
      const t = -0.22 + (i / N) * 0.44;
      const xInner = pitInner * Math.cos(t);
      const zInner = -TRACK.innerB * Math.sin(t);
      const xOuter = pitOuter * Math.cos(t);
      const zOuter = -TRACK.innerB * Math.sin(t);
      const mx = (xInner + xOuter) / 2;
      const mz = (zInner + zOuter) / 2;
      result.push({ x: mx, z: mz, len: pitOuter - pitInner, rotY: t - Math.PI / 2 });
    }
    return result;
  }, []);

  return (
    <>
      {marks.map((m, i) =>
        i % 5 === 0 ? (
          <mesh key={i} position={[m.x, 0.01, m.z]} rotation={[0, m.rotY, 0]}>
            <boxGeometry args={[m.len, 0.02, 0.4]} />
            <meshStandardMaterial color="#FFFFFF" opacity={0.55} transparent />
          </mesh>
        ) : null
      )}
    </>
  );
}

// ── Grandstand ribbon (inward-facing normals) ──────────────────────────────
function buildGrandstandGeo(A: number, B: number, y0: number, y1: number, segs = 128) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * Math.PI * 2;
    const x = A * Math.cos(t);
    const z = -B * Math.sin(t);
    pos.push(x, y0, z, x, y1, z);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ── Grandstands (right next to track for that immersive feel) ─────────────
function Grandstands() {
  // Placed very close to the outer wall so they loom overhead
  const GS_A = TRACK.outerA + SLOPE_W + 6;
  const GS_B = TRACK.outerB + SLOPE_W + 6;
  const SEGS = 160;
  const baseGeo = useMemo(() => buildGrandstandGeo(GS_A, GS_B, 0, 6, SEGS), []);
  const rowGeos = useMemo(() => {
    const geos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 8; i++) {
      const y0 = 6 + i * 2.8;
      geos.push(buildGrandstandGeo(GS_A, GS_B, y0, y0 + 2.1, SEGS));
    }
    return geos;
  }, []);
  const SEAT_COLORS = ['#3565BB', '#2848A0', '#4070CC', '#2848A0', '#3565BB', '#2848A0', '#4070CC', '#3565BB'];
  return (
    <group>
      <mesh geometry={baseGeo}>
        <meshStandardMaterial color="#7A7A7A" />
      </mesh>
      {rowGeos.map((geo, i) => (
        <mesh key={i} geometry={geo}>
          <meshStandardMaterial color={SEAT_COLORS[i % SEAT_COLORS.length]} />
        </mesh>
      ))}
    </group>
  );
}

// ── Light poles ringing the oval ───────────────────────────────────────────
function LightPoles() {
  const POLE_A = TRACK.outerA + SLOPE_W + BERM_W * 0.55;
  const POLE_B = TRACK.outerB + SLOPE_W + BERM_W * 0.55;
  const N = 24;
  const poles = useMemo(() =>
    Array.from({ length: N }, (_, i) => {
      const t = (i / N) * Math.PI * 2;
      return { x: POLE_A * Math.cos(t), z: -POLE_B * Math.sin(t), t };
    }), []);

  return (
    <>
      {poles.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} rotation={[0, p.t + Math.PI / 2, 0]}>
          {/* Main pole */}
          <mesh position={[0, 17, 0]}>
            <cylinderGeometry args={[0.42, 0.62, 34, 6]} />
            <meshStandardMaterial color="#646464" metalness={0.5} roughness={0.65} />
          </mesh>
          {/* Cross arm */}
          <mesh position={[-4, 34, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 10, 5]} />
            <meshStandardMaterial color="#555555" />
          </mesh>
          {/* Light housing left */}
          <mesh position={[-7, 34.8, 0]}>
            <boxGeometry args={[3.5, 0.7, 1.8]} />
            <meshStandardMaterial color="#DDDDCC" emissive="#FFFCBB" emissiveIntensity={0.85} />
          </mesh>
          {/* Light housing right */}
          <mesh position={[-2, 34.8, 0]}>
            <boxGeometry args={[3.5, 0.7, 1.8]} />
            <meshStandardMaterial color="#DDDDCC" emissive="#FFFCBB" emissiveIntensity={0.85} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ── Scoring pylon in the infield ───────────────────────────────────────────
function ScoringPylon() {
  const px = TRACK.centerA * 0.32;
  const pz = -TRACK.centerB * 0.08;
  const CAR_COLORS = ['#CC1111', '#1155EE', '#EE7700', '#DDCC00', '#11AA44', '#AA22CC'];
  return (
    <group position={[px, 0, pz]}>
      {/* White tower */}
      <mesh position={[0, 11, 0]}>
        <boxGeometry args={[4.5, 22, 1.8]} />
        <meshStandardMaterial color="#F0F0F0" />
      </mesh>
      {/* Colored position panels */}
      {CAR_COLORS.map((c, i) => (
        <mesh key={i} position={[0, 1.5 + i * 3.4, 1.0]}>
          <boxGeometry args={[3.8, 2.8, 0.15]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
      {/* "DAYTONA" sign at top */}
      <mesh position={[0, 23.5, 0]}>
        <boxGeometry args={[5, 2, 0.3]} />
        <meshStandardMaterial color="#FF5500" emissive="#CC3300" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

// ── Infield garage building ────────────────────────────────────────────────
function GarageBuilding() {
  return (
    <group position={[-TRACK.centerA * 0.38, 0, TRACK.centerB * 0.1]}>
      {/* Main building */}
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[55, 8, 22]} />
        <meshStandardMaterial color="#CCCCCC" />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 8.5, 0]}>
        <boxGeometry args={[57, 1.5, 24]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
      {/* Garage doors (dark rectangles) */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[-24 + i * 7, 2.5, 11.1]}>
          <boxGeometry args={[5.5, 5, 0.2]} />
          <meshStandardMaterial color="#2A2A2A" />
        </mesh>
      ))}
    </group>
  );
}

export function Track({ gameMode }: { gameMode?: string }) {
  const trackGeo = useMemo(buildTrackGeo, []);
  const slopeGeo = useMemo(buildSlopeGeo, []);
  const outerWallGeo = useMemo(buildOuterWallGeo, []);
  const innerWallGeo = useMemo(buildInnerWallGeo, []);
  const outerEdgeGeo = useMemo(buildOuterEdgeGeo, []);
  const innerEdgeGeo = useMemo(buildInnerEdgeGeo, []);
  const apronGeo = useMemo(buildApronGeo, []);

  const BERM_INNER_A = TRACK.outerA + SLOPE_W;
  const BERM_INNER_B = TRACK.outerB + SLOPE_W;
  const BERM_OUTER_A = BERM_INNER_A + BERM_W;
  const BERM_OUTER_B = BERM_INNER_B + BERM_W;

  const bermGeo = useMemo(() => buildEllipseGeo(BERM_OUTER_A, BERM_OUTER_B, BERM_INNER_A, BERM_INNER_B), []);
  const infieldGeo = useMemo(() => buildEllipseGeo(TRACK.innerA - 1, TRACK.innerB - 1), []);
  const lakeGeo = useMemo(() => buildEllipseGeo(128, 68), []);
  const lakeShoreGeo = useMemo(() => buildEllipseGeo(133, 73, 128, 68), []);

  const sfLineCenter = (TRACK.outerA + TRACK.innerA) / 2;
  const sfLineWidth = TRACK.outerA - TRACK.innerA;

  return (
    <group>
      {/* ── Ground ── */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[2400, 2400]} />
        <meshStandardMaterial color="#0A2E0A" roughness={0.95} />
      </mesh>

      {/* ── Outer berm grass ── */}
      <mesh receiveShadow geometry={bermGeo}>
        <meshStandardMaterial color="#1B5E20" roughness={0.95} />
      </mesh>

      {/* ── Concrete back-slope behind banking ── */}
      <mesh receiveShadow geometry={slopeGeo}>
        <meshStandardMaterial color="#424242" roughness={0.9} />
      </mesh>

      {/* ── Infield grass (hidden in demolition so cars can drive through) ── */}
      {gameMode !== 'demolition' && (
        <>
          <mesh receiveShadow geometry={infieldGeo}>
            <meshStandardMaterial color="#2E7D32" roughness={0.95} />
          </mesh>
          {/* ── Lake Lloyd ── */}
          <mesh geometry={lakeGeo} position={[0, 0.03, 20]}>
            <meshStandardMaterial color="#1565C0" roughness={0.05} metalness={0.1} />
          </mesh>
          <mesh geometry={lakeShoreGeo} position={[0, 0.02, 20]}>
            <meshStandardMaterial color="#78909C" roughness={0.8} />
          </mesh>
          {/* ── Concrete apron (inside inner wall) ── */}
          <mesh receiveShadow geometry={apronGeo}>
            <meshStandardMaterial color="#5D5D5D" roughness={0.85} />
          </mesh>
        </>
      )}

      {/* ── Banked asphalt track ── */}
      <mesh receiveShadow geometry={trackGeo}>
        <meshStandardMaterial color="#1C1C1C" roughness={0.92} metalness={0.02} />
      </mesh>

      {/* ── White outer edge stripe ── */}
      <mesh geometry={outerEdgeGeo}>
        <meshStandardMaterial color="#EEEEEE" roughness={0.7} />
      </mesh>

      {/* ── White inner edge stripe (hidden in demolition) ── */}
      {gameMode !== 'demolition' && (
        <mesh geometry={innerEdgeGeo}>
          <meshStandardMaterial color="#EEEEEE" roughness={0.7} />
        </mesh>
      )}

      {/* ── Yellow center dashes ── */}
      <CenterLine />

      {/* ── Pit lane markers (hidden in demolition) ── */}
      {gameMode !== 'demolition' && <PitLane />}

      {/* ── Start/finish line ── */}
      <mesh position={[sfLineCenter, 0.04, -1.2]}>
        <boxGeometry args={[sfLineWidth, 0.05, 3.8]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      {/* S/F line black checker accent */}
      {[-1.4, -0.6, 0.2, 1.0].map((zo, i) => (
        <mesh key={i} position={[sfLineCenter + (i % 2 === 0 ? 4 : -4), 0.05, zo]}>
          <boxGeometry args={[sfLineWidth * 0.15, 0.05, 0.75]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      ))}

      {/* ── Outer SAFER barrier ── */}
      <mesh geometry={outerWallGeo}>
        <meshStandardMaterial color="#F2F2F2" side={THREE.DoubleSide} />
      </mesh>
      {/* SAFER barrier yellow warning stripe */}
      <mesh geometry={useMemo(() => buildRibbon(
        (t) => [TRACK.outerA * Math.cos(t), getBankHeight(t) + 0.6, -TRACK.outerB * Math.sin(t)],
        (t) => [TRACK.outerA * Math.cos(t), getBankHeight(t) + 0.85, -TRACK.outerB * Math.sin(t)],
      ), [])}>
        <meshStandardMaterial color="#FFE000" side={THREE.DoubleSide} />
      </mesh>

      {/* ── Inner concrete wall (removed in demolition mode) ── */}
      {gameMode !== 'demolition' && (
        <mesh geometry={innerWallGeo}>
          <meshStandardMaterial color="#C0C0C0" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* ── Grandstands (very close to outer wall) ── */}
      <Grandstands />

      {/* ── Light poles ── */}
      <LightPoles />

      {/* ── Scoring pylon + Garage (hidden in demolition) ── */}
      {gameMode !== 'demolition' && (
        <>
          <ScoringPylon />
          <GarageBuilding />
        </>
      )}
    </group>
  );
}
