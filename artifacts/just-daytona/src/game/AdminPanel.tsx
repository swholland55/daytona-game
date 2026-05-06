import type { PlayerInfo } from './useMultiplayer';
import { MAX_BOTS } from './constants';

interface Props {
  playerList: PlayerInfo[];
  onAction: (targetId: string, action: string) => void;
  botCount: number;
  onSpawnBot: () => void;
  isRaining: boolean;
  onGlobalAction: (action: string) => void;
  onTeleportAll?: () => void;
  localBotList?: { idx: number; name: string; color: string }[];
  onLocalBotAction?: (botIdx: number, action: string) => void;
}

const SPEED_MODES: { action: string; emoji: string; label: string; color: string; title: string }[] = [
  { action: 'speedSlow',   emoji: '🐌', label: 'SLOW',   color: '#2a3a44', title: 'Cap speed to 30%' },
  { action: 'speedNormal', emoji: '✅', label: 'NORM',   color: '#224433', title: 'Restore normal speed' },
  { action: 'speedFast',   emoji: '⚡', label: 'FAST',   color: '#554400', title: 'Boost speed to 150%' },
  { action: 'speedTurbo',  emoji: '🚀', label: 'TURBO',  color: '#440066', title: 'Boost speed to 200%' },
];

const POWERS: { action: string; label: string; emoji: string; color: string; title: string }[] = [
  { action: 'spinout',  emoji: '🌀', label: 'SPIN',    color: '#994400', title: 'Violent spin-out' },
  { action: 'wallsmash',emoji: '💥', label: 'SMASH',   color: '#880000', title: 'Smash into outer wall' },
  { action: 'explode',  emoji: '💣', label: 'EXPLODE', color: '#aa0000', title: 'Massive explosion burst' },
  { action: 'reverse',  emoji: '↩️', label: '180°',    color: '#660088', title: 'Flip 180° into traffic' },
  { action: 'freeze',   emoji: '🧊', label: 'FREEZE',  color: '#005588', title: 'Freeze for 5 seconds' },
  { action: 'crawl',    emoji: '🐢', label: 'CRAWL',   color: '#336600', title: 'Cap speed for 8 seconds' },
  { action: 'tornado',  emoji: '🌪️', label: 'CHAOS',   color: '#555500', title: 'Random steering chaos 6s' },
  { action: 'kick',     emoji: '🚫', label: 'KICK',    color: '#333333', title: 'Remove from room' },
];

const BOT_POWERS = POWERS.filter(p => p.action !== 'kick');

export function AdminPanel({ playerList, onAction, botCount, onSpawnBot, isRaining, onGlobalAction, onTeleportAll, localBotList, onLocalBotAction }: Props) {
  const canSpawn = botCount < MAX_BOTS;

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #2a2a2a' }}>
      <div style={{ fontSize: 10, color: '#C41230', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>
        ⚡ ADMIN POWERS
      </div>

      {/* Race control — global actions */}
      <div style={{
        marginBottom: 10, padding: '8px 10px',
        background: isRaining ? 'rgba(0,40,100,0.4)' : 'rgba(0,20,60,0.2)',
        border: `1px solid ${isRaining ? '#3366cc' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 5,
        transition: 'background 0.3s, border-color 0.3s',
      }}>
        <div style={{ fontSize: 9, color: '#4488cc', letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>🏁 RACE CONTROL</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {/* Rain delay toggle */}
          <button
            onClick={() => onGlobalAction(isRaining ? 'rainOff' : 'rainOn')}
            style={{
              width: '100%', background: isRaining ? '#003380' : '#111a2a',
              border: `1px solid ${isRaining ? '#4488ff' : 'rgba(100,160,255,0.25)'}`,
              borderRadius: 4, color: isRaining ? '#88bbff' : '#6699cc',
              fontSize: 11, fontWeight: 900, letterSpacing: 1.5,
              padding: '6px 0', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: isRaining ? '0 0 14px rgba(68,136,255,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.4)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            {isRaining ? '☀️ END RAIN DELAY' : '🌧️ RAIN DELAY'}
          </button>

          {/* Yellow flag */}
          <button
            onClick={() => onGlobalAction('yellowFlagOn')}
            style={{
              width: '100%', background: '#2a2000',
              border: '1px solid rgba(255,200,0,0.35)',
              borderRadius: 4, color: '#ffdd44',
              fontSize: 11, fontWeight: 900, letterSpacing: 1.5,
              padding: '6px 0', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.5)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            🚩 YELLOW FLAG
          </button>

          {/* Teleport all to host */}
          <button
            onClick={() => onTeleportAll?.()}
            style={{
              width: '100%', background: '#1a0030',
              border: '1px solid rgba(180,80,255,0.35)',
              borderRadius: 4, color: '#cc88ff',
              fontSize: 11, fontWeight: 900, letterSpacing: 1.5,
              padding: '6px 0', cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.5)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            💥 TELEPORT ALL TO ME
          </button>

          {/* NUKE — ends the race with an explosion */}
          <button
            onClick={() => onGlobalAction('nukeAll')}
            style={{
              width: '100%', background: '#1a0000',
              border: '1px solid rgba(255,40,0,0.55)',
              borderRadius: 4, color: '#ff4422',
              fontSize: 11, fontWeight: 900, letterSpacing: 1.5,
              padding: '6px 0', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 0 10px rgba(255,40,0,0.2)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.6)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(255,40,0,0.55)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(255,40,0,0.2)'; }}
          >
            ☢️ NUKE RACE
          </button>
        </div>
      </div>

      {/* Spawn bot row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10, padding: '6px 8px',
        background: 'rgba(255,255,255,0.04)', borderRadius: 4,
      }}>
        <span style={{ fontSize: 10, color: '#999', letterSpacing: 1 }}>
          AI BOTS: {botCount}/{MAX_BOTS}
        </span>
        <button
          onClick={onSpawnBot}
          disabled={!canSpawn}
          title={canSpawn ? 'Add a bot to the race' : 'Maximum bots reached'}
          style={{
            background: canSpawn ? '#1a5533' : '#222',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            color: canSpawn ? '#44dd88' : '#555',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.5,
            padding: '4px 8px',
            cursor: canSpawn ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}
        >
          🤖 SPAWN BOT
        </button>
      </div>

      {/* Local AI Bot Controls */}
      {localBotList && localBotList.length > 0 && onLocalBotAction && (
        <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #2a2a2a' }}>
          <div style={{ fontSize: 9, color: '#888', letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>🤖 LOCAL BOTS</div>
          {localBotList.map(bot => (
            <div key={bot.idx} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: bot.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#ccc', letterSpacing: 0.5 }}>{bot.name}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {BOT_POWERS.map(p => (
                  <button
                    key={p.action}
                    title={p.title}
                    onClick={() => onLocalBotAction(bot.idx, p.action)}
                    style={{
                      background: p.color, border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 3, color: '#fff', fontSize: 9, fontWeight: 700,
                      letterSpacing: 0.5, padding: '3px 5px', cursor: 'pointer',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 2,
                      transition: 'filter 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.4)')}
                    onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
                  >
                    <span style={{ fontSize: 10 }}>{p.emoji}</span>{p.label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 4, display: 'flex', gap: 3 }}>
                {[
                  { action: 'damageRepair', label: '🔧 FIX',   color: '#0a3a0a' },
                  { action: 'damageHalf',   label: '⚠️ HALF',  color: '#3a2a00' },
                  { action: 'damageMax',    label: '💥 WRECK', color: '#3a0000' },
                ].map(dc => (
                  <button
                    key={dc.action}
                    onClick={() => onLocalBotAction(bot.idx, dc.action)}
                    style={{
                      flex: 1, background: dc.color,
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3,
                      color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                      padding: '3px 2px', cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'filter 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.6)')}
                    onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
                  >
                    {dc.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {playerList.length === 0 && (!localBotList || localBotList.length === 0) ? (
        <div style={{ color: '#555', fontSize: 11, textAlign: 'center', letterSpacing: 0.5, paddingBottom: 4 }}>
          waiting for players to join...
        </div>
      ) : playerList.length > 0 ? (
        playerList.map(player => (
          <div key={player.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: player.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#ddd', letterSpacing: 0.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {player.name}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {POWERS.map(p => (
                <button
                  key={p.action}
                  title={p.title}
                  onClick={() => onAction(player.id, p.action)}
                  style={{
                    background: p.color,
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 3,
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    padding: '3px 5px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'filter 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.4)')}
                  onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
                >
                  <span style={{ fontSize: 10 }}>{p.emoji}</span>
                  {p.label}
                </button>
              ))}
            </div>
            {/* Speed control row */}
            <div style={{ marginTop: 5, paddingTop: 5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 8, color: '#555', letterSpacing: 1, marginBottom: 3 }}>SET SPEED</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {SPEED_MODES.map(sm => (
                  <button
                    key={sm.action}
                    title={sm.title}
                    onClick={() => onAction(player.id, sm.action)}
                    style={{
                      flex: 1, background: sm.color,
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3,
                      color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                      padding: '3px 2px', cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'filter 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.5)')}
                    onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
                  >
                    {sm.emoji} {sm.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Damage control row */}
            <div style={{ marginTop: 5, paddingTop: 5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 8, color: '#555', letterSpacing: 1, marginBottom: 3 }}>SET DAMAGE</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {[
                  { action: 'damageRepair', label: '🔧 REPAIR', color: '#0a3a0a', title: 'Repair their car fully' },
                  { action: 'damageHalf',   label: '⚠️ HALF',   color: '#3a2a00', title: 'Set damage to 50%' },
                  { action: 'damageMax',    label: '💥 WRECK',  color: '#3a0000', title: 'Max out damage' },
                ].map(dc => (
                  <button
                    key={dc.action}
                    title={dc.title}
                    onClick={() => onAction(player.id, dc.action)}
                    style={{
                      flex: 1, background: dc.color,
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3,
                      color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                      padding: '3px 2px', cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'filter 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.6)')}
                    onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
                  >
                    {dc.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Lap control row */}
            <div style={{ marginTop: 5, paddingTop: 5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 8, color: '#555', letterSpacing: 1, marginBottom: 3 }}>SET LAPS</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {[
                  { action: 'lapReset',   label: '↩ RESET', color: '#333', title: 'Reset laps to 0' },
                  { action: 'lapBack',    label: '−1 LAP',  color: '#4a1a00', title: 'Take one lap away' },
                  { action: 'lapForward', label: '+1 LAP',  color: '#004a1a', title: 'Give one extra lap' },
                ].map(lc => (
                  <button
                    key={lc.action}
                    title={lc.title}
                    onClick={() => onAction(player.id, lc.action)}
                    style={{
                      flex: 1, background: lc.color,
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3,
                      color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                      padding: '3px 2px', cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'filter 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.6)')}
                    onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
                  >
                    {lc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))
      ) : null}
    </div>
  );
}
