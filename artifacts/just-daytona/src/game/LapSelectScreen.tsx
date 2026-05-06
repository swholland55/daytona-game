import { useState } from 'react';
import type { MultiplayerMode } from './useMultiplayer';
import type { VehicleType, GameMode } from './types';
import { LAP_OPTIONS } from './constants';

interface LapSelectScreenProps {
  totalLaps: number;
  onSetLaps: (n: number) => void;
  playerName: string;
  onSetName: (name: string) => void;
  vehicleType: VehicleType;
  onSetVehicle: (t: VehicleType) => void;
  gameMode: GameMode;
  onSetGameMode: (m: GameMode) => void;
  carNumber: number;
  onSetCarNumber: (n: number) => void;
  carColor: string;
  onSetCarColor: (c: string) => void;
  mode: MultiplayerMode;
  error: string;
  onStartOffline: () => void;
  onCreateRoom: (code: string, name: string) => void;
  onJoinRoom: (code: string, name: string) => void;
}

const LIVERY_COLORS = [
  '#CC1111', '#1155EE', '#EE7700', '#DDCC00',
  '#11AA44', '#AA22CC', '#00CCCC', '#FF66AA',
  '#FFFFFF', '#111111', '#FF8800', '#88CC00',
];

const INPUT: React.CSSProperties = {
  background: '#1a1a22', border: '1px solid #444', borderRadius: 4,
  color: '#fff', fontSize: 15, fontFamily: 'inherit', padding: '8px 12px',
  letterSpacing: 2, textTransform: 'uppercase', width: '100%', boxSizing: 'border-box',
};

const BTN: React.CSSProperties = {
  width: '100%', padding: '12px 0', marginTop: 10, background: '#C41230',
  border: 'none', borderRadius: 5, color: '#fff', fontSize: 14, fontWeight: 700,
  letterSpacing: 2, cursor: 'pointer', fontFamily: 'inherit',
};

type TabType = 'offline' | 'host' | 'join';

export function LapSelectScreen({
  totalLaps, onSetLaps, playerName, onSetName,
  vehicleType, onSetVehicle,
  gameMode, onSetGameMode,
  carNumber, onSetCarNumber,
  carColor, onSetCarColor,
  mode, error, onStartOffline, onCreateRoom, onJoinRoom,
}: LapSelectScreenProps) {
  const [tab, setTab] = useState<TabType>('offline');
  const [nameInput, setNameInput] = useState('');
  const [code, setCode] = useState('');

  const resolvedName = playerName || nameInput.trim().toUpperCase() || 'DRIVER';

  function saveName() {
    const n = nameInput.trim().toUpperCase().slice(0, 12);
    if (n) onSetName(n);
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'offline', label: '▶ OFFLINE' },
    { id: 'host',    label: '📡 HOST'   },
    { id: 'join',    label: '🔗 JOIN'   },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(160deg, #080a12 0%, #0d0f1a 60%, #100808 100%)',
      overflowY: 'auto',
      fontFamily: "'Oswald', 'Arial Narrow', sans-serif",
      color: '#fff',
    }}>
      <div style={{ width: '100%', maxWidth: 420, margin: '0 auto', padding: '40px 28px 48px' }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 12, letterSpacing: 8, color: '#C41230', fontWeight: 700, marginBottom: 6 }}>
            🏁 NASCAR CRASH SIMULATOR
          </div>
          <div style={{
            fontSize: 62, fontWeight: 900, letterSpacing: -2, lineHeight: 1,
            color: '#fff', textShadow: '0 0 50px rgba(196,18,48,0.45)',
          }}>
            DAYTO<br />SPEED
          </div>
        </div>

        {/* Driver Name */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: '#666', marginBottom: 7 }}>DRIVER NAME</div>
          {playerName ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '8px 14px',
            }}>
              <span style={{ flex: 1, fontSize: 17, fontWeight: 700, letterSpacing: 2, color: '#FFD700' }}>
                {playerName}
              </span>
              <button
                onClick={() => onSetName('')}
                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 12, letterSpacing: 1, fontFamily: 'inherit' }}
              >
                CHANGE
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...INPUT, flex: 1 }}
                autoFocus
                maxLength={12}
                placeholder="ENTER NAME"
                value={nameInput}
                onChange={e => setNameInput(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); }}
              />
              <button
                onClick={saveName}
                style={{
                  background: nameInput.trim() ? '#C41230' : '#333', border: 'none',
                  borderRadius: 4, color: '#fff', fontFamily: 'inherit', fontWeight: 700,
                  fontSize: 12, padding: '0 16px', cursor: 'pointer', letterSpacing: 1,
                  flexShrink: 0,
                }}
              >
                SET
              </button>
            </div>
          )}
        </div>

        {/* Lap Count */}
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: '#666', marginBottom: 9 }}>SELECT LAPS</div>
          <div style={{ display: 'flex', gap: 7 }}>
            {LAP_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => onSetLaps(n)}
                style={{
                  flex: 1, padding: '10px 0', border: 'none', borderRadius: 4,
                  background: totalLaps === n ? '#C41230' : 'rgba(255,255,255,0.07)',
                  color: totalLaps === n ? '#fff' : '#888',
                  fontFamily: 'inherit', fontSize: 15,
                  fontWeight: totalLaps === n ? 700 : 400,
                  cursor: 'pointer', transition: 'all 0.12s',
                  boxShadow: totalLaps === n ? '0 0 14px rgba(196,18,48,0.45)' : 'none',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Vehicle Type */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: '#666', marginBottom: 9 }}>VEHICLE TYPE</div>
          <div style={{ display: 'flex', gap: 7 }}>
            {([
              { id: 'car',   icon: '🏎️', label: 'NASCAR',  sub: 'STOCK CAR'  },
              { id: 'truck', icon: '🚛', label: 'TRUCK',   sub: 'CRAFTSMAN'  },
              { id: 'f1',    icon: '⚡', label: 'F1',      sub: 'FORMULA ONE'},
            ] as { id: VehicleType; icon: string; label: string; sub: string }[]).map(v => (
              <button
                key={v.id}
                onClick={() => onSetVehicle(v.id)}
                style={{
                  flex: 1, padding: '9px 4px', border: 'none', borderRadius: 5, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'center',
                  background: vehicleType === v.id ? '#C41230' : 'rgba(255,255,255,0.07)',
                  color: vehicleType === v.id ? '#fff' : '#777',
                  boxShadow: vehicleType === v.id ? '0 0 14px rgba(196,18,48,0.45)' : 'none',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 2 }}>{v.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>{v.label}</div>
                <div style={{ fontSize: 8, letterSpacing: 1.5, opacity: 0.65, marginTop: 1 }}>{v.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Car Livery — number + color */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: '#666', marginBottom: 9 }}>CAR LIVERY</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Number stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(255,255,255,0.07)', borderRadius: 5, overflow: 'hidden', flexShrink: 0 }}>
              <button
                onClick={() => onSetCarNumber(carNumber <= 1 ? 99 : carNumber - 1)}
                style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 18, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
              >◀</button>
              <div style={{
                width: 44, textAlign: 'center', fontSize: 28, fontWeight: 900,
                color: carColor, textShadow: `0 0 12px ${carColor}88`,
                letterSpacing: -1, lineHeight: 1, padding: '6px 0',
                fontFamily: 'inherit',
              }}>
                {String(carNumber).padStart(2, '0')}
              </div>
              <button
                onClick={() => onSetCarNumber(carNumber >= 99 ? 1 : carNumber + 1)}
                style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 18, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
              >▶</button>
            </div>
            {/* Color swatches */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
              {LIVERY_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => onSetCarColor(c)}
                  title={c}
                  style={{
                    width: 26, height: 26, borderRadius: 4, border: 'none',
                    background: c, cursor: 'pointer', flexShrink: 0,
                    outline: carColor === c ? `3px solid #fff` : '3px solid transparent',
                    outlineOffset: 1,
                    boxShadow: carColor === c ? `0 0 10px ${c}` : 'none',
                    transition: 'all 0.1s',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Game Mode */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: '#666', marginBottom: 9 }}>GAME MODE</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([
              { id: 'race',      icon: '🏁', label: 'RACE',       sub: 'STANDARD'      },
              { id: 'infection', icon: '🦠', label: 'INFECTION',  sub: 'LAST ALIVE'    },
              { id: 'hotPotato', icon: '🥔', label: 'HOT POTATO', sub: "DON'T HOLD IT" },
              { id: 'knockout',  icon: '💀', label: 'KNOCKOUT',   sub: 'LAST OUT'      },
              { id: 'drift',       icon: '🌀', label: 'DRIFT',       sub: 'MOST POINTS'    },
              { id: 'demolition',  icon: '💥', label: 'DEMOLITION',  sub: 'LAST STANDING'  },
              { id: 'playground',  icon: '🛝', label: 'PLAYGROUND',  sub: 'FREE DRIVE'     },
            ] as { id: GameMode; icon: string; label: string; sub: string }[]).map(m => (
              <button
                key={m.id}
                onClick={() => onSetGameMode(m.id)}
                style={{
                  flex: '1 1 calc(50% - 6px)', padding: '8px 4px', border: 'none', borderRadius: 5,
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                  background: gameMode === m.id ? '#1a4a9a' : 'rgba(255,255,255,0.07)',
                  color: gameMode === m.id ? '#fff' : '#777',
                  boxShadow: gameMode === m.id ? '0 0 14px rgba(30,80,200,0.5)' : 'none',
                  transition: 'all 0.12s',
                }}
              >
                <div style={{ fontSize: 16, marginBottom: 2 }}>{m.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{m.label}</div>
                <div style={{ fontSize: 8, letterSpacing: 1.2, opacity: 0.6, marginTop: 1 }}>{m.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1e1e1e', marginBottom: 18 }}>
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
                background: 'transparent', fontFamily: 'inherit',
                fontSize: 11, fontWeight: 700, letterSpacing: 1,
                color: tab === id ? '#fff' : '#444',
                borderBottom: tab === id ? '2px solid #C41230' : '2px solid transparent',
                transition: 'color 0.12s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Offline */}
        {tab === 'offline' && (
          <button style={BTN} onClick={onStartOffline}>
            START RACE →
          </button>
        )}

        {/* Host */}
        {tab === 'host' && (
          <div>
            <div style={{ fontSize: 10, color: '#666', letterSpacing: 1, marginBottom: 7 }}>
              ROOM PASSCODE (optional)
            </div>
            <input
              style={INPUT}
              maxLength={8}
              placeholder="e.g. RACE43"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            />
            <button style={BTN} onClick={() => onCreateRoom(code || 'RACE', resolvedName)}>
              CREATE ROOM & RACE →
            </button>
            <div style={{ fontSize: 10, color: '#444', marginTop: 7, textAlign: 'center', letterSpacing: 0.5 }}>
              friends enter your code to join • racing {totalLaps} laps
            </div>
          </div>
        )}

        {/* Join */}
        {tab === 'join' && (
          <div>
            <div style={{ fontSize: 10, color: '#666', letterSpacing: 1, marginBottom: 7 }}>ROOM PASSCODE</div>
            <input
              style={INPUT}
              maxLength={8}
              placeholder="ask the host"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            />
            <button
              style={{ ...BTN, background: code.trim() ? '#1a4a9a' : '#252525' }}
              disabled={!code.trim()}
              onClick={() => onJoinRoom(code, resolvedName)}
            >
              JOIN RACE →
            </button>
            <div style={{ fontSize: 10, color: '#444', marginTop: 7, textAlign: 'center' }}>
              host's lap count will apply
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, color: '#ff6666', fontSize: 11, textAlign: 'center', letterSpacing: 0.5 }}>
            ⚠ {error}
          </div>
        )}

        {(mode === 'hosting' || mode === 'joined') && (
          <div style={{ marginTop: 14, color: '#44cc88', fontSize: 12, textAlign: 'center', letterSpacing: 1 }}>
            ✓ {mode === 'hosting' ? 'Room created — starting race…' : 'Joined — starting race…'}
          </div>
        )}
      </div>
    </div>
  );
}
