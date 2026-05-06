import { useState, useRef } from 'react';
import type { PlayerInfo } from './useMultiplayer';
import { CAR_COLORS } from './constants';

interface Props {
  isHost: boolean;
  passcode: string;
  playerCount: number;
  playerList: PlayerInfo[];
  totalLaps: number;
  gameMode: string;
  vehicleType: string;
  onStartRace: (botCount: number) => void;
  onLeave: () => void;
}

export function LobbyScreen({
  isHost, passcode, playerCount, playerList,
  totalLaps, gameMode, vehicleType,
  onStartRace, onLeave,
}: Props) {
  const [botCount, setBotCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function copyCode() {
    navigator.clipboard.writeText(passcode).catch(() => {});
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  const gameModeLabel: Record<string, string> = {
    race: '🏁 RACE', infection: '🦠 INFECTION', hotPotato: '🥔 HOT POTATO',
    knockout: '💀 KNOCKOUT', drift: '🌀 DRIFT', demolition: '💥 DEMOLITION', playground: '🛝 PLAYGROUND',
  };
  const vehicleLabel: Record<string, string> = {
    car: '🏎️ NASCAR', truck: '🚛 TRUCK', f1: '⚡ F1',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(160deg, #080a12 0%, #0d0f1a 60%, #100808 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Oswald', 'Arial Narrow', sans-serif",
      color: '#fff',
      overflowY: 'auto',
    }}>
      <div style={{ width: '100%', maxWidth: 460, padding: '32px 28px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: '#C41230', fontWeight: 700, marginBottom: 4 }}>
            🏁 MULTIPLAYER LOBBY
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1, lineHeight: 1.1 }}>
            {isHost ? 'WAITING FOR PLAYERS' : 'WAITING FOR HOST'}
          </div>
        </div>

        {/* Passcode */}
        <div style={{
          background: '#0d0d14', border: '1px solid #2a2a3a', borderRadius: 8,
          padding: '18px 20px', marginBottom: 18, textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: '#666', marginBottom: 8 }}>ROOM CODE</div>
          <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: 10, color: '#FFD700', lineHeight: 1 }}>
            {passcode}
          </div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 6 }}>share with friends</div>
          <button
            onClick={copyCode}
            style={{
              marginTop: 10, padding: '7px 20px', background: copied ? '#228833' : '#1a3a7a',
              border: 'none', borderRadius: 4, color: '#fff', fontFamily: 'inherit',
              fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer',
            }}
          >
            {copied ? '✓ COPIED!' : '📋 COPY CODE'}
          </button>
        </div>

        {/* Race settings summary */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 18,
        }}>
          {[
            { label: 'LAPS', value: String(totalLaps) },
            { label: 'MODE', value: gameModeLabel[gameMode] ?? gameMode.toUpperCase() },
            { label: 'VEHICLE', value: vehicleLabel[vehicleType] ?? vehicleType.toUpperCase() },
          ].map(({ label, value }) => (
            <div key={label} style={{
              flex: 1, background: '#0d0d14', border: '1px solid #1e1e2a', borderRadius: 6,
              padding: '8px 6px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: '#555', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#aaa' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Players */}
        <div style={{
          background: '#0d0d14', border: '1px solid #1e1e2a', borderRadius: 8,
          padding: '14px 16px', marginBottom: 18,
        }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: '#666', marginBottom: 12 }}>
            PLAYERS — {playerCount} / 6
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {/* Host is always carIndex 0 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(255,255,255,0.05)', borderRadius: 5,
              padding: '6px 10px', minWidth: 110,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: CAR_COLORS[0], flexShrink: 0,
                boxShadow: `0 0 6px ${CAR_COLORS[0]}`,
              }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: '#FFD700' }}>
                {isHost ? 'YOU (HOST)' : 'HOST'}
              </span>
            </div>
            {playerList.map(p => (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(255,255,255,0.05)', borderRadius: 5,
                padding: '6px 10px', minWidth: 110,
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: p.color, flexShrink: 0,
                  boxShadow: `0 0 6px ${p.color}`,
                }} />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                  {isHost ? p.name : (p.name + ' ★')}
                </span>
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 5 - playerList.length) }, (_, i) => (
              <div key={`empty-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'rgba(255,255,255,0.02)', borderRadius: 5,
                padding: '6px 10px', minWidth: 110, border: '1px dashed #1e1e2a',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#222', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#333', letterSpacing: 1 }}>EMPTY</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bot count — host only */}
        {isHost && (
          <div style={{
            background: '#0d0d14', border: '1px solid #1e1e2a', borderRadius: 8,
            padding: '14px 16px', marginBottom: 18,
          }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: '#666', marginBottom: 10 }}>
              BOT CARS (all players see the same bots)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => setBotCount(c => Math.max(0, c - 1))}
                style={{
                  width: 36, height: 36, background: '#1a1a22', border: '1px solid #333',
                  borderRadius: 4, color: '#fff', fontSize: 20, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >−</button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: botCount > 0 ? '#FFD700' : '#444' }}>
                  {botCount}
                </span>
                <span style={{ fontSize: 12, color: '#555', marginLeft: 6 }}>bots</span>
              </div>
              <button
                onClick={() => setBotCount(c => Math.min(9, c + 1))}
                style={{
                  width: 36, height: 36, background: '#1a1a22', border: '1px solid #333',
                  borderRadius: 4, color: '#fff', fontSize: 20, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >+</button>
            </div>
          </div>
        )}

        {/* Non-host waiting message */}
        {!isHost && (
          <div style={{
            textAlign: 'center', color: '#666', fontSize: 13, letterSpacing: 1,
            marginBottom: 18, padding: '12px 0',
          }}>
            <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>⏳</span>
            {' '}Waiting for the host to start the race…
          </div>
        )}

        {/* Start button — host only */}
        {isHost && (
          <button
            onClick={() => onStartRace(botCount)}
            style={{
              width: '100%', padding: '16px 0', background: '#C41230',
              border: 'none', borderRadius: 6, color: '#fff',
              fontSize: 16, fontWeight: 900, letterSpacing: 3,
              cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
              boxShadow: '0 0 24px rgba(196,18,48,0.5)',
            }}
          >
            🏁 START RACE ({playerCount} {playerCount === 1 ? 'PLAYER' : 'PLAYERS'}{botCount > 0 ? ` + ${botCount} BOTS` : ''})
          </button>
        )}

        <button
          onClick={onLeave}
          style={{
            width: '100%', padding: '10px 0', background: 'transparent',
            border: '1px solid #333', borderRadius: 6, color: '#666',
            fontSize: 12, fontWeight: 700, letterSpacing: 2,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          LEAVE LOBBY
        </button>
      </div>
    </div>
  );
}
