import { useState, useRef } from 'react';
import type { MultiplayerMode, PlayerInfo } from './useMultiplayer';
import { AdminPanel } from './AdminPanel';

interface Props {
  mode: MultiplayerMode;
  passcode: string;
  playerCount: number;
  error: string;
  playerList: PlayerInfo[];
  onAdminAction: (targetId: string, action: string) => void;
  onGlobalAction: (action: string) => void;
  onTeleportAll?: () => void;
  isRaining: boolean;
  onCreate: (code: string, name: string) => void;
  onJoin: (code: string, name: string) => void;
  onLeave: () => void;
  playerName: string;
  onSetName: (name: string) => void;
  botCount: number;
  onSpawnBot: () => void;
  localBotList?: { idx: number; name: string; color: string }[];
  onLocalBotAction?: (botIdx: number, action: string) => void;
}

const PANEL: React.CSSProperties = {
  position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
  background: 'rgba(10,10,15,0.95)',
  border: '1px solid #333',
  borderRight: 'none',
  borderRadius: '8px 0 0 8px',
  color: '#fff',
  fontFamily: '"Arial Narrow", Arial, sans-serif',
  fontSize: 13,
  zIndex: 100,
  minWidth: 210,
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '-4px 0 24px rgba(0,0,0,0.7)',
};

const TAB_BASE: React.CSSProperties = {
  flex: 1, padding: '7px 0', border: 'none', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 12, fontWeight: 700, letterSpacing: 1,
  transition: 'background 0.15s',
};

const BTN: React.CSSProperties = {
  width: '100%', padding: '8px 0', marginTop: 8,
  background: '#C41230', border: 'none', borderRadius: 4,
  color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: 1,
  cursor: 'pointer', fontFamily: 'inherit',
};

const INPUT: React.CSSProperties = {
  width: '100%', padding: '7px 10px', marginTop: 6,
  background: '#1a1a22', border: '1px solid #444', borderRadius: 4,
  color: '#fff', fontSize: 14, fontFamily: 'inherit',
  letterSpacing: 2, textTransform: 'uppercase', boxSizing: 'border-box',
};

function CollapseBtn({ mode, playerCount, onClick }: { mode: MultiplayerMode; playerCount: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
        background: mode === 'offline' ? 'rgba(10,10,15,0.85)' : 'rgba(196,18,48,0.92)',
        border: '1px solid #444', borderRight: 'none',
        borderRadius: '8px 0 0 8px',
        color: '#fff', fontFamily: '"Arial Narrow", Arial, sans-serif',
        fontSize: 11, fontWeight: 700, letterSpacing: 1,
        padding: '14px 8px', cursor: 'pointer', writingMode: 'vertical-rl',
        textOrientation: 'mixed', zIndex: 100,
        boxShadow: '-2px 0 12px rgba(0,0,0,0.6)',
      }}
    >
      {mode === 'offline' ? '🏁 MULTIPLAYER' : `👥 ${playerCount} ONLINE`}
    </button>
  );
}

export function MultiplayerPanel({
  mode, passcode, playerCount, error, playerList,
  onAdminAction, onGlobalAction, onTeleportAll, isRaining, onCreate, onJoin, onLeave,
  playerName, onSetName, botCount, onSpawnBot, localBotList, onLocalBotAction,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'host' | 'join'>('host');
  const [code, setCode] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function copyCode() {
    navigator.clipboard.writeText(passcode).catch(() => {});
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return <CollapseBtn mode={mode} playerCount={playerCount} onClick={() => setOpen(true)} />;

  return (
    <div style={PANEL}>
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1, color: '#f0f0f0' }}>
            {mode === 'offline' ? '🏁 MULTIPLAYER' : mode === 'hosting' ? '🏁 HOSTING' : '🏁 IN GAME'}
          </span>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}
          >✕</button>
        </div>

        {/* ── NAME ENTRY — shown first if no name set ── */}
        {mode === 'offline' && !playerName && (
          <div style={{ paddingBottom: 14 }}>
            <div style={{ fontSize: 12, color: '#ffdd44', fontWeight: 700, letterSpacing: 1, marginBottom: 8, textAlign: 'center' }}>
              WHAT'S YOUR DRIVER NAME?
            </div>
            <input
              style={INPUT}
              autoFocus
              maxLength={12}
              placeholder="ENTER NAME"
              value={nameInput}
              onChange={e => setNameInput(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter' && nameInput.trim()) onSetName(nameInput.trim()); }}
            />
            <button
              style={{ ...BTN, background: nameInput.trim() ? '#C41230' : '#333' }}
              disabled={!nameInput.trim()}
              onClick={() => { if (nameInput.trim()) onSetName(nameInput.trim()); }}
            >
              READY TO RACE →
            </button>
          </div>
        )}

        {/* ── OFFLINE + NAME SET: show host/join tabs ── */}
        {mode === 'offline' && !!playerName && (
          <>
            {/* Name badge */}
            <div style={{ textAlign: 'center', marginBottom: 10, padding: '4px 0', borderBottom: '1px solid #222' }}>
              <span style={{ fontSize: 11, color: '#aaa' }}>RACING AS </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#ffdd44', letterSpacing: 1 }}>{playerName}</span>
              <button
                onClick={() => onSetName('')}
                style={{ background: 'none', border: 'none', color: '#555', fontSize: 10, cursor: 'pointer', marginLeft: 6 }}
                title="Change name"
              >✎</button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #333', marginBottom: 12 }}>
              {(['host', 'join'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    ...TAB_BASE,
                    background: tab === t ? '#C41230' : 'transparent',
                    color: tab === t ? '#fff' : '#999',
                    borderBottom: tab === t ? '2px solid #ff4466' : '2px solid transparent',
                  }}
                >
                  {t === 'host' ? 'HOST GAME' : 'JOIN GAME'}
                </button>
              ))}
            </div>

            {tab === 'host' ? (
              <div style={{ paddingBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#aaa', letterSpacing: 1 }}>
                  PASSCODE (friends use this to join)
                </label>
                <input
                  style={INPUT}
                  maxLength={8}
                  placeholder="e.g. RACE43"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                />
                <button style={BTN} onClick={() => onCreate(code || 'RACE', playerName)}>
                  CREATE ROOM →
                </button>
              </div>
            ) : (
              <div style={{ paddingBottom: 14 }}>
                <label style={{ fontSize: 11, color: '#aaa', letterSpacing: 1 }}>PASSCODE</label>
                <input
                  style={INPUT}
                  maxLength={8}
                  placeholder="ask the host"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                />
                <button style={BTN} onClick={() => onJoin(code, playerName)}>
                  JOIN RACE →
                </button>
              </div>
            )}

            {error && (
              <div style={{ padding: '6px 0 10px', color: '#ff6666', fontSize: 11, letterSpacing: 0.5 }}>
                ⚠ {error}
              </div>
            )}
          </>
        )}

        {/* ── HOSTING or JOINED: show room info ── */}
        {(mode === 'hosting' || mode === 'joined') && (
          <div style={{ paddingBottom: 14 }}>
            <div style={{ background: '#111', borderRadius: 6, padding: '10px 14px', marginBottom: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#aaa', letterSpacing: 1, marginBottom: 4 }}>PASSCODE</div>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 6, color: '#ffdd44', lineHeight: 1 }}>
                {passcode}
              </div>
              <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                share with friends so they can join
              </div>
            </div>

            <button
              onClick={copyCode}
              style={{ ...BTN, background: copied ? '#228833' : '#1a4a9a', marginTop: 0 }}
            >
              {copied ? '✓ COPIED!' : '📋 COPY CODE'}
            </button>

            <div style={{ marginTop: 12, padding: '8px 0', borderTop: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#aaa', fontSize: 11, letterSpacing: 0.5 }}>
                {playerCount === 1 ? 'Waiting for players…' : `${playerCount} racers connected`}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: i < playerCount ? '#44cc44' : '#333',
                  }} />
                ))}
              </div>
            </div>

            {error && (
              <div style={{ padding: '6px 0 4px', color: '#ff6666', fontSize: 11 }}>⚠ {error}</div>
            )}

            {mode === 'hosting' && (
              <AdminPanel
                playerList={playerList}
                onAction={onAdminAction}
                botCount={botCount}
                onSpawnBot={onSpawnBot}
                isRaining={isRaining}
                onGlobalAction={onGlobalAction}
                onTeleportAll={onTeleportAll}
                localBotList={localBotList}
                onLocalBotAction={onLocalBotAction}
              />
            )}

            <button
              onClick={onLeave}
              style={{ ...BTN, background: '#333', marginTop: 10, fontSize: 11 }}
            >
              LEAVE ROOM
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
