import type { VehicleType } from './types';

const CAR_WHEEL_POS: [number, number, number][] = [
  [-1.09, 0.33, -1.68], [1.09, 0.33, -1.68],
  [-1.09, 0.33,  1.72], [1.09, 0.33,  1.72],
];

interface CarMeshProps {
  color: string;
  braking?: boolean;
  damage?: number;
  vehicleType?: VehicleType;
}

function Wheel({ x, y, z, radius = 0.33, width = 0.3 }: { x: number; y: number; z: number; radius?: number; width?: number }) {
  const rimR = radius * 0.63;
  return (
    <group position={[x, y, z]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, width, 18]} />
        <meshStandardMaterial color="#090909" roughness={0.97} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[rimR, rimR, width + 0.02, 10]} />
        <meshStandardMaterial color="#6A6A6A" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[x > 0 ? (width / 2 + 0.01) : -(width / 2 + 0.01), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[rimR * 0.38, rimR * 0.38, 0.03, 8]} />
        <meshStandardMaterial color="#BBBBBB" metalness={0.92} roughness={0.14} />
      </mesh>
      <mesh position={[x > 0 ? width / 2 : -width / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius * 0.8, radius * 0.8, 0.026, 16]} />
        <meshStandardMaterial color="#E8E8E8" />
      </mesh>
    </group>
  );
}

function NascarMesh({ color, braking = false, damage = 0 }: { color: string; braking?: boolean; damage?: number }) {
  const dark = '#111111';
  const glass = '#0A1820';
  const lean = damage * 0.22;
  return (
    <group scale={1.45} rotation={[0, 0, lean]}>
      <mesh castShadow position={[0, 0.13, -2.42]}>
        <boxGeometry args={[1.22, 0.26, 0.28]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.26} />
      </mesh>
      <mesh castShadow position={[0, 0.17, -2.16]}>
        <boxGeometry args={[1.52, 0.34, 0.42]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.26} />
      </mesh>
      <mesh castShadow position={[0, 0.21, -1.88]}>
        <boxGeometry args={[1.78, 0.42, 0.44]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.26} />
      </mesh>
      <mesh castShadow position={[0, 0.22, 0.25]}>
        <boxGeometry args={[1.92, 0.44, 4.05]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.26} />
      </mesh>
      <mesh castShadow position={[1.1, 0.13, 0.25]}>
        <boxGeometry args={[0.17, 0.26, 4.6]} />
        <meshStandardMaterial color={dark} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[-1.1, 0.13, 0.25]}>
        <boxGeometry args={[0.17, 0.26, 4.6]} />
        <meshStandardMaterial color={dark} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.44, -0.88]} rotation={[0.05, 0, 0]}>
        <boxGeometry args={[1.82, 0.07, 1.88]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.26} />
      </mesh>
      <mesh position={[0, 0.5, -0.58]}>
        <boxGeometry args={[0.46, 0.08, 0.72]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      <mesh castShadow position={[0, 0.46, 1.9]}>
        <boxGeometry args={[1.82, 0.07, 1.44]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.26} />
      </mesh>
      <mesh castShadow position={[0, 0.72, 0.22]}>
        <boxGeometry args={[1.72, 0.28, 2.06]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.26} />
      </mesh>
      <mesh castShadow position={[0, 1.02, 0.08]}>
        <boxGeometry args={[1.54, 0.1, 1.82]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.26} />
      </mesh>
      <mesh position={[0, 0.82, -0.87]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[1.4, 0.56, 0.06]} />
        <meshStandardMaterial color={glass} transparent opacity={0.88} metalness={0.06} roughness={0.04} />
      </mesh>
      <mesh position={[0, 1.02, -0.74]} rotation={[0.45, 0, 0]}>
        <boxGeometry args={[1.3, 0.12, 0.03]} />
        <meshStandardMaterial color="#002288" emissive="#001166" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.8, 1.15]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[1.4, 0.5, 0.06]} />
        <meshStandardMaterial color={glass} transparent opacity={0.88} metalness={0.06} roughness={0.04} />
      </mesh>
      <mesh position={[-0.87, 0.8, 0.16]}>
        <boxGeometry args={[0.05, 0.44, 1.74]} />
        <meshStandardMaterial color={glass} transparent opacity={0.72} metalness={0.06} roughness={0.04} />
      </mesh>
      {([0.64, 0.74, 0.84, 0.94] as number[]).map((yPos, i) => (
        <mesh key={`wn${i}`} position={[-0.88, yPos, 0.16]}>
          <boxGeometry args={[0.03, 0.05, 1.62]} />
          <meshStandardMaterial color="#CC7700" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0.87, 0.8, 0.16]}>
        <boxGeometry args={[0.05, 0.44, 1.74]} />
        <meshStandardMaterial color={glass} transparent opacity={0.72} metalness={0.06} roughness={0.04} />
      </mesh>
      <mesh position={[0, 0.03, -2.56]}>
        <boxGeometry args={[1.92, 0.06, 0.28]} />
        <meshStandardMaterial color={dark} roughness={0.75} />
      </mesh>
      <mesh castShadow position={[0, 0.2, -2.46]}>
        <boxGeometry args={[1.68, 0.3, 0.1]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.26} />
      </mesh>
      <mesh castShadow position={[0, 0.24, 2.47]}>
        <boxGeometry args={[1.8, 0.4, 0.1]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.26} />
      </mesh>
      <mesh position={[0, 1.22, 2.46]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[1.76, 0.055, 0.64]} />
        <meshStandardMaterial color={dark} roughness={0.55} />
      </mesh>
      <mesh position={[0.89, 1.22, 2.46]}>
        <boxGeometry args={[0.055, 0.32, 0.64]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      <mesh position={[-0.89, 1.22, 2.46]}>
        <boxGeometry args={[0.055, 0.32, 0.64]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      <mesh position={[0, 1.06, 2.3]}>
        <boxGeometry args={[1.78, 0.04, 0.36]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.26} />
      </mesh>
      <mesh position={[1.0, 0.9, -1.06]}>
        <boxGeometry args={[0.24, 0.13, 0.1]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      <mesh position={[-1.0, 0.9, -1.06]}>
        <boxGeometry args={[0.24, 0.13, 0.1]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      <mesh position={[0.52, 0.24, -2.48]}>
        <boxGeometry args={[0.52, 0.14, 0.04]} />
        <meshStandardMaterial color="#EEEEBB" emissive="#FFDD55" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-0.52, 0.24, -2.48]}>
        <boxGeometry args={[0.52, 0.14, 0.04]} />
        <meshStandardMaterial color="#EEEEBB" emissive="#FFDD55" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0.54, 0.26, 2.49]}>
        <boxGeometry args={[0.48, 0.14, 0.04]} />
        <meshStandardMaterial color={braking ? '#FF2200' : '#550000'} emissive={braking ? '#FF3300' : '#1A0000'} emissiveIntensity={braking ? 2.8 : 0.3} />
      </mesh>
      <mesh position={[-0.54, 0.26, 2.49]}>
        <boxGeometry args={[0.48, 0.14, 0.04]} />
        <meshStandardMaterial color={braking ? '#FF2200' : '#550000'} emissive={braking ? '#FF3300' : '#1A0000'} emissiveIntensity={braking ? 2.8 : 0.3} />
      </mesh>
      <mesh position={[0.88, 0.08, 1.82]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.22, 8]} />
        <meshStandardMaterial color="#444444" metalness={0.85} roughness={0.4} />
      </mesh>
      {CAR_WHEEL_POS.map(([x, y, z], i) => (
        <Wheel key={i} x={x} y={y} z={z} />
      ))}
      <mesh position={[0.99, 0.38, 0.26]}>
        <boxGeometry args={[0.02, 0.36, 1.68]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-0.99, 0.38, 0.26]}>
        <boxGeometry args={[0.02, 0.36, 1.68]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 1.09, 0.06]}>
        <boxGeometry args={[0.78, 0.03, 0.78]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

function TruckMesh({ color, braking = false, damage = 0 }: { color: string; braking?: boolean; damage?: number }) {
  const dark = '#111';
  const glass = '#0A1820';
  const lean = damage * 0.18;
  const TRUCK_WHEELS: [number, number, number][] = [
    [-1.18, 0.48, -1.5], [1.18, 0.48, -1.5],
    [-1.18, 0.48,  1.4], [1.18, 0.48,  1.4],
  ];
  return (
    <group scale={1.45} rotation={[0, 0, lean]}>
      {/* ─── MAIN LOWER BODY ─── */}
      <mesh castShadow position={[0, 0.32, 0.1]}>
        <boxGeometry args={[2.05, 1.1, 3.6]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} />
      </mesh>
      {/* Side skirts */}
      <mesh position={[1.12, 0.18, 0.1]}>
        <boxGeometry args={[0.14, 0.36, 4.0]} />
        <meshStandardMaterial color={dark} roughness={0.7} />
      </mesh>
      <mesh position={[-1.12, 0.18, 0.1]}>
        <boxGeometry args={[0.14, 0.36, 4.0]} />
        <meshStandardMaterial color={dark} roughness={0.7} />
      </mesh>

      {/* ─── TRUCK CAB (front half) ─── */}
      <mesh castShadow position={[0, 1.42, -0.55]}>
        <boxGeometry args={[1.94, 0.84, 2.1]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} />
      </mesh>
      {/* Roof */}
      <mesh castShadow position={[0, 1.9, -0.55]}>
        <boxGeometry args={[1.84, 0.14, 1.92]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} />
      </mesh>

      {/* ─── FRONT / NOSE ─── */}
      {/* Blunt front face (trucks have upright front) */}
      <mesh castShadow position={[0, 0.55, -2.12]}>
        <boxGeometry args={[2.0, 1.1, 0.18]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} />
      </mesh>
      {/* Front grille (dark mesh area) */}
      <mesh position={[0, 0.42, -2.18]}>
        <boxGeometry args={[1.4, 0.48, 0.06]} />
        <meshStandardMaterial color="#111" roughness={0.9} />
      </mesh>
      {/* Grille bars */}
      {([-0.12, 0, 0.12] as number[]).map((yOff, i) => (
        <mesh key={`gb${i}`} position={[0, 0.42 + yOff, -2.19]}>
          <boxGeometry args={[1.36, 0.04, 0.03]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      ))}
      {/* Front bumper */}
      <mesh castShadow position={[0, 0.16, -2.16]}>
        <boxGeometry args={[2.0, 0.32, 0.22]} />
        <meshStandardMaterial color={dark} roughness={0.6} />
      </mesh>
      {/* Hood */}
      <mesh castShadow position={[0, 0.92, -1.2]} rotation={[-0.04, 0, 0]}>
        <boxGeometry args={[1.88, 0.1, 1.8]} />
        <meshStandardMaterial color={color} metalness={0.35} roughness={0.35} />
      </mesh>

      {/* ─── WINDSHIELD (more upright than car) ─── */}
      <mesh position={[0, 1.55, -1.52]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[1.6, 0.85, 0.07]} />
        <meshStandardMaterial color={glass} transparent opacity={0.85} metalness={0.05} roughness={0.04} />
      </mesh>
      {/* Windshield visor strip */}
      <mesh position={[0, 1.9, -1.38]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[1.5, 0.12, 0.04]} />
        <meshStandardMaterial color="#112200" emissive="#001100" emissiveIntensity={0.3} />
      </mesh>
      {/* Rear window */}
      <mesh position={[0, 1.48, 0.42]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[1.5, 0.7, 0.07]} />
        <meshStandardMaterial color={glass} transparent opacity={0.85} metalness={0.05} roughness={0.04} />
      </mesh>
      {/* Side windows */}
      <mesh position={[-0.98, 1.5, -0.52]}>
        <boxGeometry args={[0.06, 0.62, 1.5]} />
        <meshStandardMaterial color={glass} transparent opacity={0.75} metalness={0.05} roughness={0.04} />
      </mesh>
      <mesh position={[0.98, 1.5, -0.52]}>
        <boxGeometry args={[0.06, 0.62, 1.5]} />
        <meshStandardMaterial color={glass} transparent opacity={0.75} metalness={0.05} roughness={0.04} />
      </mesh>
      {/* Window net */}
      {([1.22, 1.38, 1.54, 1.7] as number[]).map((yPos, i) => (
        <mesh key={`wn${i}`} position={[-0.99, yPos, -0.52]}>
          <boxGeometry args={[0.04, 0.06, 1.38]} />
          <meshStandardMaterial color="#CC7700" roughness={0.8} />
        </mesh>
      ))}

      {/* ─── TRUCK BED (rear) ─── */}
      {/* Bed floor */}
      <mesh castShadow position={[0, 0.62, 1.5]}>
        <boxGeometry args={[2.0, 0.1, 1.88]} />
        <meshStandardMaterial color={dark} roughness={0.8} />
      </mesh>
      {/* Bed left rail */}
      <mesh castShadow position={[-1.02, 0.98, 1.5]}>
        <boxGeometry args={[0.1, 0.62, 1.9]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Bed right rail */}
      <mesh castShadow position={[1.02, 0.98, 1.5]}>
        <boxGeometry args={[0.1, 0.62, 1.9]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Tailgate */}
      <mesh castShadow position={[0, 0.98, 2.42]}>
        <boxGeometry args={[2.0, 0.62, 0.12]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Rear bumper */}
      <mesh castShadow position={[0, 0.18, 2.44]}>
        <boxGeometry args={[2.0, 0.36, 0.2]} />
        <meshStandardMaterial color={dark} roughness={0.7} />
      </mesh>
      {/* Cab-to-bed transition bar */}
      <mesh position={[0, 1.6, 0.5]}>
        <boxGeometry args={[1.9, 0.14, 0.16]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* ─── REAR SPOILER (big NASCAR-truck style) ─── */}
      <mesh position={[0, 1.72, 2.38]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[1.9, 0.065, 0.7]} />
        <meshStandardMaterial color={dark} roughness={0.5} />
      </mesh>
      <mesh position={[0.96, 1.72, 2.38]}>
        <boxGeometry args={[0.065, 0.38, 0.7]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      <mesh position={[-0.96, 1.72, 2.38]}>
        <boxGeometry args={[0.065, 0.38, 0.7]} />
        <meshStandardMaterial color={dark} />
      </mesh>

      {/* ─── FENDER FLARES ─── */}
      {TRUCK_WHEELS.map(([x, , z], i) => (
        <mesh key={`ff${i}`} position={[x > 0 ? x + 0.08 : x - 0.08, 0.52, z]}>
          <boxGeometry args={[0.22, 0.22, 0.7]} />
          <meshStandardMaterial color={dark} roughness={0.8} />
        </mesh>
      ))}

      {/* ─── HEADLIGHTS ─── */}
      <mesh position={[0.58, 0.62, -2.2]}>
        <boxGeometry args={[0.52, 0.28, 0.05]} />
        <meshStandardMaterial color="#EEEEBB" emissive="#FFDD55" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[-0.58, 0.62, -2.2]}>
        <boxGeometry args={[0.52, 0.28, 0.05]} />
        <meshStandardMaterial color="#EEEEBB" emissive="#FFDD55" emissiveIntensity={0.9} />
      </mesh>
      {/* Tape strips */}
      <mesh position={[0.58, 0.62, -2.19]}>
        <boxGeometry args={[0.52, 0.28, 0.03]} />
        <meshStandardMaterial color="#221100" transparent opacity={0.45} />
      </mesh>
      <mesh position={[-0.58, 0.62, -2.19]}>
        <boxGeometry args={[0.52, 0.28, 0.03]} />
        <meshStandardMaterial color="#221100" transparent opacity={0.45} />
      </mesh>

      {/* ─── TAIL LIGHTS ─── */}
      <mesh position={[0.62, 0.44, 2.46]}>
        <boxGeometry args={[0.54, 0.22, 0.05]} />
        <meshStandardMaterial color={braking ? '#FF2200' : '#550000'} emissive={braking ? '#FF3300' : '#1A0000'} emissiveIntensity={braking ? 2.8 : 0.3} />
      </mesh>
      <mesh position={[-0.62, 0.44, 2.46]}>
        <boxGeometry args={[0.54, 0.22, 0.05]} />
        <meshStandardMaterial color={braking ? '#FF2200' : '#550000'} emissive={braking ? '#FF3300' : '#1A0000'} emissiveIntensity={braking ? 2.8 : 0.3} />
      </mesh>

      {/* ─── EXHAUST (dual side exits) ─── */}
      <mesh position={[0.9, 0.1, 1.9]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.24, 8]} />
        <meshStandardMaterial color="#444444" metalness={0.85} roughness={0.4} />
      </mesh>
      <mesh position={[-0.9, 0.1, 1.9]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, 0.24, 8]} />
        <meshStandardMaterial color="#444444" metalness={0.85} roughness={0.4} />
      </mesh>

      {/* Side mirrors */}
      <mesh position={[1.06, 1.46, -1.18]}>
        <boxGeometry args={[0.26, 0.16, 0.12]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      <mesh position={[-1.06, 1.46, -1.18]}>
        <boxGeometry args={[0.26, 0.16, 0.12]} />
        <meshStandardMaterial color={dark} />
      </mesh>

      {/* ─── WHEELS (bigger, higher clearance) ─── */}
      {TRUCK_WHEELS.map(([x, y, z], i) => (
        <Wheel key={i} x={x} y={y} z={z} radius={0.46} width={0.38} />
      ))}

      {/* Number panels */}
      <mesh position={[1.04, 0.55, -0.1]}>
        <boxGeometry args={[0.03, 0.52, 1.8]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-1.04, 0.55, -0.1]}>
        <boxGeometry args={[0.03, 0.52, 1.8]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0, 1.96, -0.55]}>
        <boxGeometry args={[0.86, 0.04, 0.86]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

function F1Mesh({ color, braking = false, damage = 0 }: { color: string; braking?: boolean; damage?: number }) {
  const dark = '#111';
  const carbon = '#1a1a1a';
  const lean = damage * 0.15;
  const F1_FRONT_WHEELS: [number, number, number][] = [[-1.12, 0.36, -1.65], [1.12, 0.36, -1.65]];
  const F1_REAR_WHEELS: [number, number, number][]  = [[-1.12, 0.42,  1.55], [1.12, 0.42,  1.55]];
  return (
    <group scale={1.3} rotation={[0, 0, lean]}>
      {/* ─── CENTRAL MONOCOQUE (narrow torpedo) ─── */}
      <mesh castShadow position={[0, 0.22, 0.0]}>
        <boxGeometry args={[0.88, 0.32, 4.6]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.2} />
      </mesh>

      {/* ─── NOSE CONE (long, pointed) ─── */}
      <mesh castShadow position={[0, 0.18, -2.8]}>
        <boxGeometry args={[0.52, 0.18, 1.1]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 0.14, -3.28]}>
        <boxGeometry args={[0.28, 0.1, 0.8]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[0, 0.11, -3.62]}>
        <boxGeometry args={[0.14, 0.07, 0.45]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.2} />
      </mesh>

      {/* ─── FRONT WING ─── */}
      {/* Main plane */}
      <mesh position={[0, 0.06, -3.55]}>
        <boxGeometry args={[2.6, 0.055, 0.52]} />
        <meshStandardMaterial color={carbon} roughness={0.35} />
      </mesh>
      {/* Second flap */}
      <mesh position={[0, 0.12, -3.45]}>
        <boxGeometry args={[2.4, 0.04, 0.32]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.2} />
      </mesh>
      {/* End plates */}
      <mesh position={[1.32, 0.18, -3.5]}>
        <boxGeometry args={[0.06, 0.3, 0.56]} />
        <meshStandardMaterial color={carbon} roughness={0.35} />
      </mesh>
      <mesh position={[-1.32, 0.18, -3.5]}>
        <boxGeometry args={[0.06, 0.3, 0.56]} />
        <meshStandardMaterial color={carbon} roughness={0.35} />
      </mesh>
      {/* Front wing supports from nose */}
      <mesh position={[0.3, 0.08, -3.38]} rotation={[0, 0, 0.15]}>
        <boxGeometry args={[0.06, 0.12, 0.06]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      <mesh position={[-0.3, 0.08, -3.38]} rotation={[0, 0, -0.15]}>
        <boxGeometry args={[0.06, 0.12, 0.06]} />
        <meshStandardMaterial color={dark} />
      </mesh>

      {/* ─── SIDEPODS ─── */}
      <mesh castShadow position={[0.7, 0.2, 0.3]}>
        <boxGeometry args={[0.46, 0.3, 2.4]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[-0.7, 0.2, 0.3]}>
        <boxGeometry args={[0.46, 0.3, 2.4]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.2} />
      </mesh>
      {/* Sidepod air intakes */}
      <mesh position={[0.72, 0.2, -0.72]}>
        <boxGeometry args={[0.1, 0.22, 0.12]} />
        <meshStandardMaterial color={dark} />
      </mesh>
      <mesh position={[-0.72, 0.2, -0.72]}>
        <boxGeometry args={[0.1, 0.22, 0.12]} />
        <meshStandardMaterial color={dark} />
      </mesh>

      {/* ─── OPEN COCKPIT AREA ─── */}
      {/* Cockpit surround / survival cell */}
      <mesh castShadow position={[0, 0.44, -0.4]}>
        <boxGeometry args={[0.7, 0.2, 0.9]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.2} />
      </mesh>
      {/* Cockpit dark interior */}
      <mesh position={[0, 0.42, -0.36]}>
        <boxGeometry args={[0.52, 0.14, 0.72]} />
        <meshStandardMaterial color="#050505" roughness={1} />
      </mesh>
      {/* Halo safety device */}
      <mesh position={[0, 0.62, -0.38]}>
        <boxGeometry args={[0.06, 0.28, 0.88]} />
        <meshStandardMaterial color={carbon} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Halo top bar */}
      <mesh position={[0, 0.76, -0.14]} rotation={[0.25, 0, 0]}>
        <boxGeometry args={[0.56, 0.06, 0.12]} />
        <meshStandardMaterial color={carbon} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Roll hoop */}
      <mesh castShadow position={[0, 0.72, 0.28]}>
        <boxGeometry args={[0.42, 0.56, 0.16]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.2} />
      </mesh>
      {/* Roll hoop top (open arc — simplified as mesh) */}
      <mesh position={[0, 0.98, 0.28]}>
        <boxGeometry args={[0.36, 0.08, 0.12]} />
        <meshStandardMaterial color={carbon} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Air intake above roll hoop */}
      <mesh position={[0, 1.02, 0.22]}>
        <boxGeometry args={[0.3, 0.18, 0.28]} />
        <meshStandardMaterial color={dark} roughness={0.8} />
      </mesh>

      {/* ─── REAR BODY ─── */}
      <mesh castShadow position={[0, 0.18, 1.8]}>
        <boxGeometry args={[0.72, 0.22, 1.5]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.2} />
      </mesh>
      {/* Gearbox casing */}
      <mesh position={[0, 0.12, 2.38]}>
        <boxGeometry args={[0.52, 0.2, 0.6]} />
        <meshStandardMaterial color={dark} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* ─── REAR WING ─── */}
      {/* Struts */}
      <mesh position={[0.55, 0.78, 2.05]}>
        <boxGeometry args={[0.07, 0.65, 0.12]} />
        <meshStandardMaterial color={carbon} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-0.55, 0.78, 2.05]}>
        <boxGeometry args={[0.07, 0.65, 0.12]} />
        <meshStandardMaterial color={carbon} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Main plane */}
      <mesh position={[0, 1.1, 2.0]} rotation={[-0.06, 0, 0]}>
        <boxGeometry args={[2.0, 0.055, 0.78]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.2} />
      </mesh>
      {/* Second element (DRS flap) */}
      <mesh position={[0, 1.18, 1.82]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[1.88, 0.04, 0.35]} />
        <meshStandardMaterial color={carbon} roughness={0.35} />
      </mesh>
      {/* End plates */}
      <mesh position={[1.02, 0.98, 2.0]}>
        <boxGeometry args={[0.055, 0.45, 0.8]} />
        <meshStandardMaterial color={carbon} roughness={0.35} />
      </mesh>
      <mesh position={[-1.02, 0.98, 2.0]}>
        <boxGeometry args={[0.055, 0.45, 0.8]} />
        <meshStandardMaterial color={carbon} roughness={0.35} />
      </mesh>

      {/* ─── DIFFUSER ─── */}
      <mesh position={[0, 0.08, 2.55]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[1.4, 0.12, 0.7]} />
        <meshStandardMaterial color={dark} roughness={0.7} />
      </mesh>

      {/* ─── WHEEL OUTRIGGER ARMS ─── */}
      {/* Front arms */}
      <mesh position={[0.96, 0.24, -1.65]}>
        <boxGeometry args={[0.72, 0.07, 0.14]} />
        <meshStandardMaterial color={carbon} roughness={0.4} />
      </mesh>
      <mesh position={[-0.96, 0.24, -1.65]}>
        <boxGeometry args={[0.72, 0.07, 0.14]} />
        <meshStandardMaterial color={carbon} roughness={0.4} />
      </mesh>
      {/* Front upper wishbone */}
      <mesh position={[0.96, 0.38, -1.65]}>
        <boxGeometry args={[0.7, 0.05, 0.1]} />
        <meshStandardMaterial color={carbon} roughness={0.4} />
      </mesh>
      <mesh position={[-0.96, 0.38, -1.65]}>
        <boxGeometry args={[0.7, 0.05, 0.1]} />
        <meshStandardMaterial color={carbon} roughness={0.4} />
      </mesh>
      {/* Rear arms */}
      <mesh position={[0.92, 0.26, 1.55]}>
        <boxGeometry args={[0.64, 0.07, 0.14]} />
        <meshStandardMaterial color={carbon} roughness={0.4} />
      </mesh>
      <mesh position={[-0.92, 0.26, 1.55]}>
        <boxGeometry args={[0.64, 0.07, 0.14]} />
        <meshStandardMaterial color={carbon} roughness={0.4} />
      </mesh>

      {/* ─── FRONT WHEELS (exposed, wider) ─── */}
      {F1_FRONT_WHEELS.map(([x, y, z], i) => (
        <Wheel key={`fw${i}`} x={x} y={y} z={z} radius={0.36} width={0.36} />
      ))}
      {/* ─── REAR WHEELS (wider, bigger) ─── */}
      {F1_REAR_WHEELS.map(([x, y, z], i) => (
        <Wheel key={`rw${i}`} x={x} y={y} z={z} radius={0.42} width={0.44} />
      ))}

      {/* ─── BRAKE LIGHTS (tail) ─── */}
      <mesh position={[0, 0.28, 2.68]}>
        <boxGeometry args={[0.18, 0.1, 0.04]} />
        <meshStandardMaterial color={braking ? '#FF2200' : '#550000'} emissive={braking ? '#FF4400' : '#110000'} emissiveIntensity={braking ? 3.0 : 0.4} />
      </mesh>

      {/* ─── EXHAUST ─── */}
      <mesh position={[0, 0.14, 2.6]} rotation={[0.1, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.14, 8]} />
        <meshStandardMaterial color="#888" metalness={0.9} roughness={0.3} />
      </mesh>

      {/* ─── NUMBER PANELS ─── */}
      <mesh position={[0.46, 0.26, 0.0]}>
        <boxGeometry args={[0.02, 0.28, 1.8]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[-0.46, 0.26, 0.0]}>
        <boxGeometry args={[0.02, 0.28, 1.8]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>
    </group>
  );
}

export function CarMesh({ color, braking = false, damage = 0, vehicleType = 'car' }: CarMeshProps) {
  if (vehicleType === 'truck') return <TruckMesh color={color} braking={braking} damage={damage} />;
  if (vehicleType === 'f1')    return <F1Mesh    color={color} braking={braking} damage={damage} />;
  return <NascarMesh color={color} braking={braking} damage={damage} />;
}
