import { useRef, useEffect } from 'react';
import { AI_COUNT, TRACK } from './constants';
import { LeaderEntry, GameMode, ChatMessage } from './types';

type MapCar = { x: number; z: number; isPlayer: boolean; color: string };

function Minimap({ cars }: { cars: MapCar[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = 130, H = 80;
    ctx.clearRect(0, 0, W, H);
    const scaleX = (W - 12) / (TRACK.outerA * 2);
    const scaleY = (H - 12) / (TRACK.outerB * 2);
    const cx = W / 2, cy = H / 2;
    // Track surface band
    ctx.beginPath();
    ctx.ellipse(cx, cy, TRACK.outerA * scaleX, TRACK.outerB * scaleY, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = (TRACK.outerA - TRACK.innerA) * scaleX;
    ctx.stroke();
    // Inner wall outline
    ctx.beginPath();
    ctx.ellipse(cx, cy, TRACK.innerA * scaleX, TRACK.innerB * scaleY, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Outer wall outline
    ctx.beginPath();
    ctx.ellipse(cx, cy, TRACK.outerA * scaleX, TRACK.outerB * scaleY, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Cars
    for (const car of cars) {
      const px = cx + car.x * scaleX;
      const py = cy + car.z * scaleY;
      ctx.beginPath();
      ctx.arc(px, py, car.isPlayer ? 4.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = car.color;
      ctx.fill();
      if (car.isPlayer) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  });
  return (
    <div style={{
      background: 'rgba(0,0,0,0.62)',
      border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 6,
      padding: 4,
      lineHeight: 0,
    }}>
      <canvas ref={canvasRef} width={130} height={80} style={{ display: 'block' }} />
    </div>
  );
}

interface GameUIProps {
  speed: number;
  laps: number;
  position: number;
  countdown: number;
  totalCars?: number;
  playerName?: string;
  damage?: number;
  lapTime?: number;
  lastLapTime?: number;
  bestLapTime?: number;
  leaderboard?: LeaderEntry[];
  totalLaps?: number;
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
  driftScore?: number;
  driftCombo?: number;
  driftTimer?: number;
  demolitionAlive?: number;
  carPositions?: { x: number; z: number; isPlayer: boolean; color: string }[];
  nitroFuel?: number;
  wrongWay?: boolean;
  pitStopTimer?: number;
}

function fmtTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = t % 60;
  const ss = s.toFixed(3).padStart(6, '0');
  return m > 0 ? `${m}:${ss}` : ss;
}

export function GameUI({ speed, laps, position, countdown, totalCars, playerName, damage = 0, lapTime, lastLapTime, bestLapTime, leaderboard, totalLaps = 0, greenFlag, rainDelay, nukeActive, spectating, activeGameMode, chatMessages, playerInfected, playerHasPotato, potatoTimer, knockoutTimer, driftScore, driftCombo, driftTimer, demolitionAlive, carPositions, nitroFuel, wrongWay, pitStopTimer }: GameUIProps) {
  const mph = Math.max(0, Math.round(speed * 3.636));
  const carCount = totalCars ?? (1 + AI_COUNT);
  const isRacing = countdown <= -1;
  const isNewBest = lastLapTime !== undefined && lastLapTime === bestLapTime;

  const posOrdinal = (n: number) => {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return `${n}th`;
  };

  const cdNum = Math.ceil(countdown);
  const showCountdown = countdown > -1;
  const isGo = countdown <= 0 && countdown > -1;
  const cdLabel = isGo ? 'GO!' : String(cdNum);
  const cdColor = isGo ? '#00FF88' : '#FFD700';

  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none',
      fontFamily: "'Oswald', 'Arial Narrow', sans-serif",
      color: '#fff',
      userSelect: 'none',
    }}>
      <style>{`
        @keyframes pitPulse { from { opacity: 1; transform: translateX(-50%) scale(1); } to { opacity: 0.75; transform: translateX(-50%) scale(1.04); } }
        @keyframes nukeFlash { 0% { opacity: 0.08; } 50% { opacity: 0.22; } 100% { opacity: 0.08; } }
        @keyframes nukePulse { from { opacity: 1; transform: translateX(-50%) scale(1); text-shadow: 0 0 30px #ff2200; } to { opacity: 0.8; transform: translateX(-50%) scale(1.06); text-shadow: 0 0 60px #ff4400; } }
        @keyframes infFlash { 0% { opacity: 0.06; } 50% { opacity: 0.18; } 100% { opacity: 0.06; } }
        @keyframes infPulse { from { opacity: 1; transform: translateX(-50%) scale(1); text-shadow: 0 0 30px #00ff55; } to { opacity: 0.8; transform: translateX(-50%) scale(1.04); text-shadow: 0 0 60px #00ff55; } }
        @keyframes potatoFast { from { transform: translateX(-50%) scale(1); box-shadow: 0 0 20px #FF7700; } to { transform: translateX(-50%) scale(1.04); box-shadow: 0 0 50px #ff4400; } }
        @keyframes koFlash { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
        @keyframes driftPulse { from { opacity: 1; transform: scale(1); text-shadow: 0 0 20px #bb44ff; } to { opacity: 0.85; transform: scale(1.05); text-shadow: 0 0 50px #9900ff; } }
        @keyframes comboFlash { 0% { opacity: 0; transform: translateX(-50%) scale(0.7); } 15% { opacity: 1; transform: translateX(-50%) scale(1.12); } 80% { opacity: 1; } 100% { opacity: 0; transform: translateX(-50%) scale(0.9); } }
      `}</style>

      {/* Nuke incoming flash overlay */}
      {nukeActive && (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(255,20,0,0.14)',
            animation: 'nukeFlash 0.35s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '38%', left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 32, fontWeight: 900, letterSpacing: 4,
            color: '#ff2200',
            animation: 'nukePulse 0.3s ease-in-out infinite alternate',
            whiteSpace: 'nowrap',
          }}>
            ☢️ NUKE INCOMING ☢️
          </div>
          <div style={{
            position: 'absolute', top: 'calc(38% + 52px)', left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 13, letterSpacing: 3, color: '#ff6644',
            whiteSpace: 'nowrap', fontWeight: 700,
          }}>
            RACE ENDING IN 3 SECONDS
          </div>
        </>
      )}

      {/* Wrong-way warning */}
      {wrongWay && isRacing && !spectating && (
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
          fontSize: 30, fontWeight: 900, letterSpacing: 5,
          color: '#FF2200',
          textShadow: '0 0 24px rgba(255,30,0,0.9)',
          whiteSpace: 'nowrap',
          animation: 'koFlash 0.28s ease-in-out infinite',
          pointerEvents: 'none',
        }}>
          ⬅️ WRONG WAY ➡️
        </div>
      )}

      {/* Pit stop progress */}
      {pitStopTimer !== undefined && pitStopTimer >= 0 && isRacing && (
        <div style={{
          position: 'absolute', bottom: 190, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.88)',
          border: '2px solid #22FF88',
          borderRadius: 8, padding: '8px 22px',
          textAlign: 'center', minWidth: 160,
        }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: '#22FF88', marginBottom: 5 }}>🔧 PIT STOP</div>
          <div style={{ width: '100%', height: 7, background: 'rgba(255,255,255,0.12)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, (pitStopTimer / 3) * 100)}%`,
              height: '100%', background: '#22FF88', borderRadius: 4,
              transition: 'width 0.1s linear',
            }} />
          </div>
          <div style={{ fontSize: 10, marginTop: 4, color: '#aaa', letterSpacing: 2 }}>REPAIRING...</div>
        </div>
      )}

      {/* Infection mode — green vignette + warning */}
      {activeGameMode === 'infection' && playerInfected && (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,255,50,0.09)',
            animation: 'infFlash 0.7s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: '38%', left: '50%',
            fontSize: 30, fontWeight: 900, letterSpacing: 4,
            color: '#00ff55',
            animation: 'infPulse 0.65s ease-in-out infinite alternate',
            whiteSpace: 'nowrap',
          }}>
            🦠 YOU ARE INFECTED!
          </div>
        </>
      )}

      {/* Infection mode — survivor badge */}
      {activeGameMode === 'infection' && !playerInfected && (
        <div style={{
          position: 'absolute', top: 20, right: 20,
          background: 'rgba(0,80,20,0.85)', border: '1px solid #00ff55',
          borderRadius: 6, padding: '6px 14px', textAlign: 'right',
        }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: '#00ff55', opacity: 0.7 }}>🦠 INFECTION</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#00ff55', letterSpacing: 1 }}>UNINFECTED ✓</div>
        </div>
      )}

      {/* Hot Potato — big countdown when holding it */}
      {activeGameMode === 'hotPotato' && playerHasPotato && potatoTimer !== undefined && (
        <div style={{
          position: 'absolute', top: '34%', left: '50%',
          background: 'rgba(0,0,0,0.88)',
          border: `2px solid ${potatoTimer < 4 ? '#ff2200' : '#FF7700'}`,
          borderRadius: 10, padding: '14px 32px', textAlign: 'center',
          animation: `potatoFast ${potatoTimer < 4 ? '0.18s' : '0.55s'} ease-in-out infinite alternate`,
        }}>
          <div style={{ fontSize: 30, marginBottom: 2 }}>🥔</div>
          <div style={{
            fontSize: 18, fontWeight: 900, letterSpacing: 2,
            color: potatoTimer < 4 ? '#ff2200' : '#FF8800', marginBottom: 4,
          }}>
            HOT POTATO!
          </div>
          <div style={{
            fontSize: 46, fontWeight: 900, lineHeight: 1,
            color: potatoTimer < 4 ? '#ff2200' : '#FFaa00',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {Math.ceil(potatoTimer)}s
          </div>
          <div style={{ fontSize: 10, letterSpacing: 2, opacity: 0.55, marginTop: 5 }}>
            RAM SOMEONE TO PASS IT
          </div>
        </div>
      )}

      {/* Hot Potato — small indicator when someone else has it */}
      {activeGameMode === 'hotPotato' && !playerHasPotato && potatoTimer !== undefined && (
        <div style={{
          position: 'absolute', top: 20, right: 20,
          background: 'rgba(60,30,0,0.85)', border: '1px solid #FF7700',
          borderRadius: 6, padding: '6px 14px', textAlign: 'right',
        }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: '#FF7700', opacity: 0.7 }}>🥔 HOT POTATO</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#FFaa00', fontVariantNumeric: 'tabular-nums' }}>
            {Math.ceil(potatoTimer)}s
          </div>
        </div>
      )}

      {/* Knockout — timer */}
      {activeGameMode === 'knockout' && knockoutTimer !== undefined && (
        <div style={{
          position: 'absolute', top: 20, right: 20,
          background: knockoutTimer < 6 ? 'rgba(140,0,0,0.88)' : 'rgba(0,0,0,0.65)',
          border: `1px solid ${knockoutTimer < 6 ? '#ff4400' : 'rgba(255,255,255,0.15)'}`,
          borderRadius: 6, padding: '8px 14px', textAlign: 'right',
          animation: knockoutTimer < 6 ? 'koFlash 0.4s ease-in-out infinite' : 'none',
        }}>
          <div style={{ fontSize: 9, letterSpacing: 2, opacity: 0.65 }}>💀 KNOCKOUT IN</div>
          <div style={{
            fontSize: 34, fontWeight: 700, lineHeight: 1,
            color: knockoutTimer < 6 ? '#ff4400' : '#fff',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {Math.ceil(knockoutTimer)}s
          </div>
        </div>
      )}

      {/* Drift mode HUD */}
      {activeGameMode === 'drift' && driftScore !== undefined && driftTimer !== undefined && (
        <>
          {/* Top-left: score + combo */}
          <div style={{
            position: 'absolute', top: 20, left: 20,
            background: 'rgba(0,0,0,0.82)',
            border: `1px solid ${(driftCombo ?? 1) > 1 ? '#9933ff' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 7, padding: '8px 16px',
            boxShadow: (driftCombo ?? 1) > 1 ? '0 0 18px rgba(153,0,255,0.5)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: '#9933ff', marginBottom: 2 }}>🌀 DRIFT SCORE</div>
            <div style={{
              fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: -1,
              color: (driftCombo ?? 1) > 1 ? '#cc66ff' : '#fff',
              fontVariantNumeric: 'tabular-nums',
              animation: (driftCombo ?? 1) > 1 ? 'driftPulse 0.5s ease-in-out infinite alternate' : 'none',
            }}>
              {Math.round(driftScore).toLocaleString()}
            </div>
            {(driftCombo ?? 1) > 1 && (
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ff88ff', letterSpacing: 2, marginTop: 2 }}>
                ×{driftCombo} COMBO
              </div>
            )}
          </div>

          {/* Top-right: countdown timer */}
          <div style={{
            position: 'absolute', top: 20, right: 20,
            background: driftTimer < 15 ? 'rgba(140,0,0,0.88)' : 'rgba(0,0,0,0.72)',
            border: `1px solid ${driftTimer < 15 ? '#ff4400' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 6, padding: '8px 14px', textAlign: 'right',
          }}>
            <div style={{ fontSize: 9, letterSpacing: 2, opacity: 0.6 }}>🌀 TIME LEFT</div>
            <div style={{
              fontSize: 38, fontWeight: 900, lineHeight: 1,
              color: driftTimer < 15 ? '#ff4400' : '#fff',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {Math.ceil(driftTimer)}s
            </div>
          </div>

          {/* Combo pop flash in the center */}
          {(driftCombo ?? 1) >= 2 && (
            <div key={driftCombo} style={{
              position: 'absolute', top: '40%', left: '50%',
              fontSize: 28, fontWeight: 900, letterSpacing: 3,
              color: (driftCombo ?? 1) >= 3 ? '#ffaa00' : '#cc66ff',
              whiteSpace: 'nowrap',
              animation: 'comboFlash 1.2s ease-out forwards',
              pointerEvents: 'none',
            }}>
              {(driftCombo ?? 1) >= 3 ? '🔥 TRIPLE COMBO!' : '⚡ DOUBLE COMBO!'}
            </div>
          )}
        </>
      )}

      {/* Playground / Free Drive indicator */}
      {activeGameMode === 'playground' && isRacing && (
        <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.72)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 6, padding: '6px 18px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 15 }}>🛝</span>
          <span style={{ fontSize: 10, letterSpacing: 3, fontWeight: 700, color: '#bbb' }}>FREE DRIVE</span>
        </div>
      )}

      {/* Demolition Derby HUD */}
      {activeGameMode === 'demolition' && (
        <>
          {/* Health bar — top center */}
          <div style={{
            position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
            width: 230, background: 'rgba(0,0,0,0.85)',
            border: `1px solid ${damage > 0.7 ? '#ff2200' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 7, padding: '8px 14px', textAlign: 'center',
            boxShadow: damage > 0.7 ? '0 0 20px rgba(255,0,0,0.4)' : 'none',
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}>
            <div style={{ fontSize: 9, letterSpacing: 3, color: damage > 0.7 ? '#ff4400' : '#aaa', marginBottom: 6 }}>💥 HEALTH</div>
            <div style={{ height: 16, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                width: `${Math.max(0, (1 - damage) * 100)}%`,
                background: damage > 0.75 ? 'linear-gradient(90deg,#cc0000,#ff3300)' : damage > 0.45 ? 'linear-gradient(90deg,#cc6600,#ff9900)' : 'linear-gradient(90deg,#00aa33,#22ff66)',
                transition: 'width 0.12s, background 0.4s',
              }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 5, color: damage > 0.7 ? '#ff5555' : '#ccc', fontVariantNumeric: 'tabular-nums' }}>
              {Math.max(0, Math.round((1 - damage) * 100))}%
            </div>
          </div>

          {/* Cars remaining — top right */}
          {demolitionAlive !== undefined && (
            <div style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(0,0,0,0.82)', border: '1px solid rgba(255,68,0,0.35)',
              borderRadius: 6, padding: '8px 14px', textAlign: 'right',
            }}>
              <div style={{ fontSize: 9, letterSpacing: 2, opacity: 0.55 }}>💥 CARS LEFT</div>
              <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                {demolitionAlive}
              </div>
            </div>
          )}

          {/* Danger vignette when low health */}
          {damage > 0.6 && (
            <div style={{
              position: 'absolute', inset: 0,
              background: `rgba(200,0,0,${Math.min(0.28, (damage - 0.6) * 0.55)})`,
              animation: damage > 0.82 ? 'koFlash 0.28s ease-in-out infinite' : 'koFlash 0.65s ease-in-out infinite',
              pointerEvents: 'none',
            }} />
          )}
        </>
      )}

      {/* Spectating banner */}
      {spectating && (
        <div style={{
          position: 'absolute', top: 82, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 5, padding: '5px 20px',
          fontSize: 11, letterSpacing: 2.5, color: '#aaa', fontWeight: 700,
          whiteSpace: 'nowrap',
        }}>
          🎥 SPECTATING — W/S to fly · A/D to turn
        </div>
      )}
      {/* Countdown overlay */}
      {showCountdown && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isGo ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.25)',
        }}>
          <div style={{
            fontSize: isGo ? 160 : 200,
            fontWeight: 900,
            color: cdColor,
            textShadow: `0 0 60px ${cdColor}, 0 4px 24px rgba(0,0,0,0.9)`,
            letterSpacing: -4,
            lineHeight: 1,
            transition: 'font-size 0.1s',
          }}>
            {cdLabel}
          </div>
        </div>
      )}

      {/* Speed — bottom center */}
      <div style={{
        position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        textAlign: 'center', lineHeight: 1,
      }}>
        <div style={{
          fontSize: 82, fontWeight: 700, letterSpacing: -2,
          textShadow: '0 2px 16px rgba(0,0,0,0.9)',
          color: mph > 320 ? '#FF4444' : '#FFFFFF',
        }}>
          {mph}
        </div>
        <div style={{ fontSize: 16, letterSpacing: 5, opacity: 0.75, marginTop: -4 }}>MPH</div>
      </div>

      {/* Lap — top left */}
      <div style={{
        position: 'absolute', top: 20, left: 20,
        background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: '8px 16px',
      }}>
        <div style={{ fontSize: 11, letterSpacing: 3, opacity: 0.65 }}>LAP</div>
        <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1 }}>
          {laps + 1}
          {totalLaps > 0 && (
            <span style={{ fontSize: 20, fontWeight: 400, opacity: 0.5 }}> / {totalLaps}</span>
          )}
        </div>
      </div>

      {/* Lap timer — top center */}
      {isRacing && lapTime !== undefined && (
        <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: '6px 18px',
          minWidth: 160,
        }}>
          <div style={{ fontSize: 10, letterSpacing: 3, opacity: 0.6, marginBottom: 2 }}>LAP TIME</div>
          <div style={{
            fontSize: 30, fontWeight: 700, letterSpacing: 1, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: "'Courier New', monospace",
          }}>
            {fmtTime(lapTime)}
          </div>

          {/* Last lap + best lap rows */}
          {lastLapTime !== undefined && (
            <div style={{ marginTop: 5, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 4 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', gap: 12,
                fontSize: 11, fontFamily: "'Courier New', monospace",
              }}>
                <span style={{ opacity: 0.55, letterSpacing: 1 }}>LAST</span>
                <span style={{
                  color: isNewBest ? '#44FF88' : '#fff',
                  fontWeight: isNewBest ? 700 : 400,
                }}>
                  {fmtTime(lastLapTime)}{isNewBest ? ' ★' : ''}
                </span>
              </div>
              {bestLapTime !== undefined && !isNewBest && (
                <div style={{
                  display: 'flex', justifyContent: 'space-between', gap: 12,
                  fontSize: 11, fontFamily: "'Courier New', monospace", marginTop: 2,
                }}>
                  <span style={{ opacity: 0.55, letterSpacing: 1 }}>BEST</span>
                  <span style={{ color: '#FFD700' }}>{fmtTime(bestLapTime)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Position — top right */}
      <div style={{
        position: 'absolute', top: 20, right: 20,
        background: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: '8px 16px',
        textAlign: 'right',
      }}>
        <div style={{ fontSize: 11, letterSpacing: 3, opacity: 0.65 }}>POSITION</div>
        <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1 }}>
          {posOrdinal(position)}
          <span style={{ fontSize: 16, opacity: 0.55, marginLeft: 4 }}>of {carCount}</span>
        </div>
      </div>

      {/* Leaderboard — right side, below position */}
      {isRacing && leaderboard && leaderboard.length > 0 && (
        <div style={{
          position: 'absolute', top: 112, right: 20,
          background: 'rgba(0,0,0,0.55)', borderRadius: 6,
          padding: '8px 12px', minWidth: 148,
        }}>
          <div style={{ fontSize: 10, letterSpacing: 3, opacity: 0.55, marginBottom: 5 }}>STANDINGS</div>
          {leaderboard.map((entry, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, lineHeight: '1.85',
              fontWeight: entry.isPlayer ? 700 : 400,
            }}>
              <span style={{ opacity: 0.45, fontSize: 10, minWidth: 14, textAlign: 'right' }}>{i + 1}</span>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: entry.color,
                boxShadow: entry.isPlayer ? `0 0 5px ${entry.color}` : 'none',
              }} />
              <span style={{
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: entry.isPlayer ? '#FFD700' : '#fff',
                opacity: entry.isPlayer ? 1 : 0.82,
                maxWidth: 80,
              }}>
                {entry.name}
              </span>
              <span style={{ fontSize: 10, opacity: 0.5, flexShrink: 0 }}>L{entry.laps + 1}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bottom-right stack: driver name (multiplayer) + minimap */}
      <div style={{
        position: 'absolute', bottom: 20, right: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
      }}>
        {playerName && (
          <div style={{
            background: 'rgba(0,0,0,0.55)', borderRadius: 6,
            padding: '5px 12px',
            fontSize: 13, fontWeight: 700, letterSpacing: 2,
            color: '#ffdd44',
          }}>
            {playerName}
          </div>
        )}
        {isRacing && carPositions && carPositions.length > 0 && (
          <Minimap cars={carPositions} />
        )}
      </div>

      {/* Rain delay overlay + top banner */}
      {rainDelay && (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,15,40,0.30)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            background: 'linear-gradient(135deg, #001a44 0%, #001133 100%)',
            color: '#77aaff', padding: '10px 0', textAlign: 'center',
            fontSize: 14, fontWeight: 900, letterSpacing: 4,
            boxShadow: '0 4px 24px rgba(0,50,200,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
            animation: 'pitPulse 1.2s ease-in-out infinite alternate',
          }}>
            <span style={{ fontSize: 22 }}>🌧️</span>
            RAIN DELAY — RACE SUSPENDED
            <span style={{ fontSize: 22 }}>🌧️</span>
          </div>
        </>
      )}

      {/* Green flag banner — top center (shown after caution ends) */}
      {greenFlag && (
        <div style={{
          position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #00CC44, #007722)',
          color: '#fff', padding: '8px 28px', borderRadius: 6,
          fontSize: 15, fontWeight: 900, letterSpacing: 4,
          boxShadow: '0 0 32px rgba(0,220,80,0.85), 0 2px 8px rgba(0,0,0,0.6)',
          whiteSpace: 'nowrap',
          animation: 'pitPulse 0.4s ease-in-out infinite alternate',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>🏁</span>
          GREEN FLAG — GO GO GO
          <span style={{ fontSize: 18 }}>🏁</span>
        </div>
      )}

      {/* Nitro bar — always visible during racing */}
      {isRacing && nitroFuel !== undefined && (
        <div style={{
          position: 'absolute', bottom: 162, left: '50%', transform: 'translateX(-50%)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 9, letterSpacing: 3, marginBottom: 3,
            color: nitroFuel > 0.15 ? '#00CCFF' : '#FF6600',
            opacity: nitroFuel < 1 ? 1 : 0.55,
          }}>
            NITRO {nitroFuel >= 1 ? '▶ READY' : nitroFuel < 0.05 ? '⚠ EMPTY' : ''}
          </div>
          <div style={{
            width: 90, height: 5,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 3, overflow: 'hidden',
            border: nitroFuel >= 1 ? '1px solid rgba(0,200,255,0.5)' : '1px solid transparent',
          }}>
            <div style={{
              width: `${Math.round(nitroFuel * 100)}%`,
              height: '100%',
              background: nitroFuel > 0.4 ? '#00CCFF' : nitroFuel > 0.15 ? '#FF8800' : '#FF2200',
              borderRadius: 3,
              transition: 'width 0.08s linear, background 0.4s',
              boxShadow: nitroFuel >= 1 ? '0 0 6px #00CCFF' : 'none',
            }} />
          </div>
        </div>
      )}

      {/* Damage bar — bottom center, above speed */}
      {damage > 0.04 && (
        <div style={{
          position: 'absolute', bottom: 130, left: '50%', transform: 'translateX(-50%)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 9, letterSpacing: 3, opacity: 0.6, marginBottom: 4 }}>DAMAGE</div>
          <div style={{ width: 90, height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.round(damage * 100)}%`,
              height: '100%',
              background: damage > 0.65 ? '#FF3333' : damage > 0.35 ? '#FF9900' : '#FFE000',
              borderRadius: 3,
              transition: 'width 0.25s',
            }} />
          </div>
        </div>
      )}

      {/* Chat feed — above controls, bottom left */}
      {chatMessages && chatMessages.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 108, left: 20,
          display: 'flex', flexDirection: 'column', gap: 5,
          maxWidth: 290, pointerEvents: 'none',
        }}>
          {chatMessages.slice(-4).map(msg => (
            <div key={msg.id} style={{
              background: 'rgba(0,0,0,0.78)',
              border: `1px solid ${msg.fromColor}55`,
              borderLeft: `3px solid ${msg.fromColor}`,
              borderRadius: 4,
              padding: '5px 10px',
              fontSize: 12,
              fontFamily: "'Oswald', 'Arial Narrow', Arial, sans-serif",
              letterSpacing: 0.4,
              color: '#fff',
              display: 'flex', gap: 8, alignItems: 'baseline',
              backdropFilter: 'blur(4px)',
            }}>
              <span style={{ color: msg.fromColor, fontWeight: 800, fontSize: 10, flexShrink: 0, letterSpacing: 1 }}>
                {msg.fromName.toUpperCase()}
              </span>
              <span style={{ opacity: 0.92, fontWeight: 600 }}>{msg.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls — bottom left */}
      <div style={{
        position: 'absolute', bottom: 20, left: 20,
        fontSize: 12, opacity: 0.45, lineHeight: 2, letterSpacing: 1,
      }}>
        <div>W / ↑ &nbsp; ACCELERATE</div>
        <div>S / ↓ &nbsp; BRAKE</div>
        <div>A / ←  D / → &nbsp; STEER</div>
        <div style={{ color: '#00CCFF', opacity: 0.7 }}>SPACE / SHIFT &nbsp; NITRO</div>
      </div>
    </div>
  );
}
