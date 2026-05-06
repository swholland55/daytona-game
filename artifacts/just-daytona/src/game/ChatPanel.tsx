import { useState } from 'react';

const PRESETS = [
  'EAT MY BUMPER 🏎️',
  'NICE TRY 😂',
  'CHECKERS OR WRECKERS 🏁',
  'WATCH OUT ⚠️',
  'GG 🤝',
  'SORRY NOT SORRY 😈',
  'GET OUTTA THE WAY 🚨',
  "THAT'S RACING 💪",
];

interface ChatPanelProps {
  onSend: (text: string) => void;
}

export function ChatPanel({ onSend }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [cooldown, setCooldown] = useState(false);

  function handleSend(text: string) {
    onSend(text);
    setOpen(false);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 3000);
  }

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 150,
      userSelect: 'none',
      fontFamily: "'Oswald', 'Arial Narrow', sans-serif",
    }}>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 8,
          background: 'rgba(8,8,14,0.96)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 8,
          padding: 10,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
          width: 300,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          <div style={{
            gridColumn: '1 / -1', fontSize: 9, letterSpacing: 3,
            color: '#555', marginBottom: 4, paddingBottom: 6,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            QUICK CHAT
          </div>
          {PRESETS.map(text => (
            <button
              key={text}
              onClick={() => handleSend(text)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 5, color: '#ddd',
                fontSize: 11, fontFamily: 'inherit', fontWeight: 600,
                letterSpacing: 0.3, padding: '9px 10px',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.1s, border-color 0.1s',
                lineHeight: 1.3,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(196,18,48,0.3)'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#C41230'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
            >
              {text}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => { if (!cooldown) setOpen(o => !o); }}
        style={{
          background: open ? 'rgba(196,18,48,0.88)' : 'rgba(0,0,0,0.78)',
          border: `1px solid ${open ? '#C41230' : 'rgba(255,255,255,0.18)'}`,
          borderRadius: 6, color: '#fff',
          fontSize: 12, fontFamily: 'inherit', fontWeight: 700, letterSpacing: 1,
          padding: '8px 14px', cursor: cooldown ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
          opacity: cooldown ? 0.5 : 1,
          transition: 'all 0.15s',
          pointerEvents: 'all',
        }}
      >
        💬 {cooldown ? 'SENT!' : 'CHAT'}
      </button>
    </div>
  );
}
