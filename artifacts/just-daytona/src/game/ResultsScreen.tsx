import { LeaderEntry } from './types';

interface ResultsScreenProps {
  leaderboard: LeaderEntry[];
  onRaceAgain: () => void;
}

function posLabel(pos: number) {
  if (pos === 1) return { text: 'YOU WIN! 🏆', color: '#FFD700', size: 30 };
  if (pos === 2) return { text: '2nd Place 🥈', color: '#C0C0C0', size: 24 };
  if (pos === 3) return { text: '3rd Place 🥉', color: '#CD7F32', size: 24 };
  return { text: `${pos}th Place`, color: '#888', size: 22 };
}

export function ResultsScreen({ leaderboard, onRaceAgain }: ResultsScreenProps) {
  const playerPos = leaderboard.findIndex(e => e.isPlayer) + 1;
  const { text, color, size } = posLabel(playerPos);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Oswald', 'Arial Narrow', sans-serif",
      color: '#fff', zIndex: 300,
    }}>
      <div style={{ textAlign: 'center', width: '100%', maxWidth: 360, padding: '0 24px' }}>

        <div style={{ fontSize: 52, marginBottom: 10, lineHeight: 1 }}>🏁</div>
        <div style={{ fontSize: 11, letterSpacing: 6, color: '#C41230', fontWeight: 700, marginBottom: 8 }}>
          RACE COMPLETE
        </div>
        <div style={{ fontSize: size, fontWeight: 900, color, marginBottom: 24, letterSpacing: 1 }}>
          {text}
        </div>

        {/* Standings */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: 8,
          overflow: 'hidden', marginBottom: 24,
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            fontSize: 9, letterSpacing: 4, color: '#555', fontWeight: 700,
            padding: '7px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            FINAL STANDINGS
          </div>
          {leaderboard.map((entry, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 16px',
                background: entry.isPlayer ? 'rgba(196,18,48,0.18)' : 'transparent',
                borderBottom: i < leaderboard.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: entry.isPlayer ? '#FFD700' : '#555', minWidth: 22 }}>
                {i + 1}
              </span>
              <div style={{
                width: 9, height: 9, borderRadius: '50%', background: entry.color, flexShrink: 0,
                boxShadow: entry.isPlayer ? `0 0 6px ${entry.color}` : 'none',
              }} />
              <span style={{
                flex: 1, textAlign: 'left', fontSize: 14,
                fontWeight: entry.isPlayer ? 700 : 400,
                color: entry.isPlayer ? '#FFD700' : '#ccc',
                letterSpacing: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {entry.name}
              </span>
              <span style={{ fontSize: 10, color: '#555', flexShrink: 0 }}>
                L{entry.laps}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={onRaceAgain}
          style={{
            width: '100%', padding: '13px 0', background: '#C41230',
            border: 'none', borderRadius: 5, color: '#fff',
            fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
            letterSpacing: 2, cursor: 'pointer',
            boxShadow: '0 0 20px rgba(196,18,48,0.35)',
          }}
        >
          RACE AGAIN →
        </button>
      </div>
    </div>
  );
}
