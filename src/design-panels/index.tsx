// ============================================================
// HoloBro — MiniChat + Inspector + All Panels
// ============================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAgentStore, useUIStore } from '../store';
import { useAgentChat } from '../hooks';
import { AgentAvatar, StatusDot, ProgressBar, MonoLabel } from '../components/ui';

// ── MiniChatPopup (draggable, minimizable, maximizable) ──────
const MINI_W = 340;
const MINI_H = 440;

export const MiniChatPopup: React.FC = () => {
  const miniChatAgent = useUIStore((s) => s.miniChatAgent);
  const closeMiniChat = useUIStore((s) => s.closeMiniChat);
  const agent = useAgentStore((s) =>
    s.agents.find((a) => a.id === miniChatAgent),
  );
  const { messages, send } = useAgentChat(miniChatAgent ?? '__none__');
  const [input, setInput] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  // Position & window state
  const [pos, setPos] = useState({ x: window.innerWidth - MINI_W - 24, y: window.innerHeight - MINI_H - 106 });
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);

  // Drag state
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (maximized) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos, maximized]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 120, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.current.y)),
      });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  // Reset position when maximizing/restoring
  const toggleMaximized = () => {
    if (!maximized) {
      setMinimized(false);
    }
    setMaximized((v) => !v);
  };

  if (!miniChatAgent || !agent) return null;

  const handleSend = () => {
    if (!input.trim()) return;
    send(input.trim());
    setInput('');
  };

  // Compute style based on state
  const windowStyle: React.CSSProperties = maximized
    ? { position: 'fixed', top: 48, left: 64, right: 0, bottom: 0, zIndex: 999, width: 'auto', height: 'auto', borderRadius: 0 }
    : {
        position: 'fixed', left: pos.x, top: pos.y, zIndex: 999,
        width: MINI_W, height: minimized ? 44 : MINI_H,
        borderRadius: 14,
      };

  // Header button style
  const hdrBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: 'var(--muted)',
    cursor: 'pointer', fontSize: 13, width: 22, height: 22,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 4, transition: 'all 0.15s',
  };

  return (
    <div style={{
      ...windowStyle,
      background: 'var(--panel)', border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      boxShadow: maximized ? 'none' : '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
      transition: minimized || maximized ? 'all 0.2s ease' : undefined,
    }}>
      {/* Header — draggable */}
      <div
        onMouseDown={onMouseDown}
        style={{
          padding: '8px 10px', borderBottom: minimized ? 'none' : '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          position: 'relative', overflow: 'hidden',
          cursor: maximized ? 'default' : 'grab', userSelect: 'none',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: agent.accentGradient,
        }} />
        <AgentAvatar agent={agent} size={24} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 11,
            fontWeight: 700, letterSpacing: 1, color: agent.accentColor,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {agent.name}
          </div>
          {!minimized && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              display: 'flex', alignItems: 'center', gap: 4, color: 'var(--green)',
            }}>
              <StatusDot status={agent.status} size={5} />
              {agent.status === 'running' ? `Online \u00B7 ${agent.latencyMs}ms` : agent.status}
            </div>
          )}
        </div>
        {!minimized && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 8, padding: '2px 7px',
            borderRadius: 4, background: `${agent.accentColor}20`,
            color: agent.accentColor, border: `1px solid ${agent.accentColor}50`,
          }}>
            {agent.model}
          </span>
        )}
        {/* Window controls */}
        <button onClick={() => { setMinimized((v) => !v); setMaximized(false); }} title={minimized ? 'Restore' : 'Minimize'} style={hdrBtn}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--amber)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; }}
        >{minimized ? '\u25A1' : '\u2014'}</button>
        <button onClick={toggleMaximized} title={maximized ? 'Restore' : 'Maximize'} style={hdrBtn}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--cyan)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; }}
        >{maximized ? '\u29C9' : '\u25A1'}</button>
        <button onClick={closeMiniChat} title="Close" style={hdrBtn}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--pink)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; }}
        >{'\u2715'}</button>
      </div>

      {/* Body — hidden when minimized */}
      {!minimized && (
        <>
          {/* Messages */}
          <div ref={bodyRef} style={{
            flex: 1, overflowY: 'auto', padding: 12,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {messages.length === 0 && (
              <div style={{
                background: 'var(--dim)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '8px 12px', fontSize: 12, lineHeight: 1.5,
              }}>
                {agent.emoji} {agent.name} connected. How can I help?
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} style={{
                display: 'flex', gap: 8,
                maxWidth: maximized ? '60%' : '90%',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              }}>
                <div>
                  <div style={{
                    background: msg.role === 'user' ? 'rgba(168,85,247,0.12)' : 'var(--dim)',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(168,85,247,0.25)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '8px 12px',
                    fontSize: maximized ? 14 : 12, lineHeight: 1.5,
                    color: msg.role === 'user' ? '#d8b4fe' : 'var(--text)',
                  }}>
                    {msg.content}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    color: 'var(--muted)', marginTop: 3,
                    textAlign: msg.role === 'user' ? 'right' : 'left',
                  }}>
                    {msg.ts}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div style={{
            padding: '8px 10px', borderTop: '1px solid var(--border)',
            display: 'flex', gap: 8, flexShrink: 0,
          }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 20, padding: '6px 12px',
            }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`Ask ${agent.name}...`}
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  outline: 'none', fontFamily: 'var(--font-ui)',
                  fontSize: 13, color: 'var(--text)',
                }}
              />
            </div>
            <button
              onClick={handleSend}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: agent.accentGradient, color: 'white',
                cursor: 'pointer', fontSize: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >{'\u27A4'}</button>
          </div>
        </>
      )}
    </div>
  );
};

// ── Inspector ─────────────────────────────────────────────────
export const Inspector: React.FC = () => {
  const inspectorOpen = useUIStore((s) => s.inspectorOpen);
  const inspectorFocusAgent = useUIStore((s) => s.inspectorFocusAgent);
  const toggleInspector = useUIStore((s) => s.toggleInspector);
  const setInspectorFocus = useUIStore((s) => s.setInspectorFocus);
  const agents = useAgentStore((s) => s.agents);
  const networkStats = useUIStore((s) => s.networkStats);
  const focusAgent = agents.find((a) => a.id === inspectorFocusAgent);

  const totalCost = agents.reduce((acc, a) => acc + a.costToday, 0);

  return (
    <div style={{
      width: inspectorOpen ? 240 : 0,
      background: 'var(--panel)', borderLeft: inspectorOpen ? '1px solid var(--border)' : 'none',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      overflow: 'hidden', transition: 'width 0.2s ease',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--cyan)', textTransform: 'uppercase' }}>
          // Inspector
        </span>
        <button onClick={toggleInspector} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Network */}
        <InspBlock title="Network">
          <KV k="Protocol" v="HOLO" vc="var(--violet)" />
          <KV k="Status" v="LIVE" vc="var(--green)" />
          <KV k="Latency" v={`${networkStats.avgLatencyMs}ms`} />
          <KV k="Peers" v={networkStats.peerCount} />
        </InspBlock>

        {/* Agent status */}
        <InspBlock title="Agents">
          {agents.map((a) => (
            <div key={a.id} onClick={() => setInspectorFocus(a.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 0', borderBottom: '1px solid var(--border)',
              cursor: 'pointer', transition: 'opacity var(--transition)',
            }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = '0.7'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = '1'}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: a.avatarBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, flexShrink: 0,
              }}>{a.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)' }}>
                  {a.status === 'idle' ? 'idle' : `${a.latencyMs}ms`}
                </div>
              </div>
              <StatusDot status={a.status} size={7} />
            </div>
          ))}
        </InspBlock>

        {/* Focus agent detail */}
        {focusAgent && (
          <InspBlock title={focusAgent.name}>
            <KV k="Model" v={focusAgent.model} />
            <KV k="Endpoint" v={focusAgent.endpoint} vc="var(--muted)" />
            <KV k="Latency" v={`${focusAgent.latencyMs}ms`} vc={focusAgent.accentColor} />
            <KV k="Calls" v={focusAgent.totalCalls} />
            <KV k="Uptime" v={`${focusAgent.uptimePct}%`} />
            <KV k="Cost" v={`$${focusAgent.costToday.toFixed(2)}`} vc="var(--amber)" />
          </InspBlock>
        )}

        {/* Bandwidth */}
        <InspBlock title="Bandwidth">
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>↑ Up</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--pink)', fontWeight: 700 }}>{networkStats.uploadMBps} MB/s</span>
            </div>
            <ProgressBar value={42} color="linear-gradient(90deg, var(--pink), var(--violet))" />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>↓ Down</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cyan)', fontWeight: 700 }}>{networkStats.downloadMBps} MB/s</span>
            </div>
            <ProgressBar value={68} />
          </div>
        </InspBlock>

        {/* Cost breakdown */}
        <InspBlock title="Today's Cost">
          {agents.map((a) => (
            <KV key={a.id} k={a.name} v={`$${a.costToday.toFixed(2)}`} vc={a.accentColor} />
          ))}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>Total</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>
              ${totalCost.toFixed(2)}
            </span>
          </div>
        </InspBlock>

      </div>
    </div>
  );
};

// ── Inspector sub-components ──────────────────────────────────
const InspBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
      {title}
    </div>
    {children}
  </div>
);

const KV: React.FC<{ k: string; v: string | number; vc?: string }> = ({ k, v, vc = 'var(--cyan)' }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)' }}
    className="kv-row"
  >
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>{k}</span>
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: vc, fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 130 }}>{v}</span>
  </div>
);

// ── Browser Panel ─────────────────────────────────────────────
export const BrowserPanel: React.FC = () => {
  const stats = useUIStore((s) => s.networkStats);
  const agents = useAgentStore((s) => s.agents);
  const browserUrl = useUIStore((s) => s.browserUrl);
  const navigate = useUIStore((s) => s.navigate);
  const [homeSearch, setHomeSearch] = useState('');

  const handleHomeSearch = () => {
    if (homeSearch.trim()) {
      navigate(homeSearch.trim());
      setHomeSearch('');
    }
  };

  // If we have a URL, show it in a browsing view
  // In dev mode (browser), we show a status + link since WebView2 isn't available
  // In Tauri mode, this would be handled by the real BrowserPanel with WebView2
  if (browserUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20, padding: 40 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 4, color: 'var(--cyan)', textTransform: 'uppercase' }}>
          // Navigating
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900,
          background: 'linear-gradient(135deg, var(--pink) 0%, var(--violet) 50%, var(--cyan) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          textAlign: 'center',
        }}>
          OPENING PAGE
        </div>
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '16px 24px', maxWidth: 600, width: '100%',
          textAlign: 'center',
        }}>
          <a
            href={browserUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--cyan)',
              wordBreak: 'break-all',
            }}
          >
            {browserUrl}
          </a>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', textAlign: 'center', maxWidth: 400 }}>
          In dev mode, pages open in a new tab. When running as a Tauri desktop app,
          pages load natively in HoloBro's built-in WebView2 browser with proxy &amp; privacy features.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => window.open(browserUrl, '_blank', 'noopener')}
            style={{
              background: 'linear-gradient(135deg, var(--pink), var(--violet))',
              border: 'none', borderRadius: 8, padding: '10px 24px',
              color: 'white', fontFamily: 'var(--font-ui)', fontWeight: 700,
              fontSize: 13, letterSpacing: 1, cursor: 'pointer',
            }}
          >OPEN IN NEW TAB</button>
          <button
            onClick={() => useUIStore.getState().goHome()}
            style={{
              background: 'var(--panel)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 24px',
              color: 'var(--text)', fontFamily: 'var(--font-ui)', fontWeight: 700,
              fontSize: 13, letterSpacing: 1, cursor: 'pointer',
            }}
          >BACK HOME</button>
        </div>
      </div>
    );
  }

  // Otherwise show the home/start page
  return (
    <div style={{ padding: '48px 40px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 4 }}>
        Good evening, wanderer
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 900,
        background: 'linear-gradient(135deg, var(--pink) 0%, var(--violet) 50%, var(--cyan) 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        marginBottom: 28, lineHeight: 1.1,
      }}>
        WHERE DO YOU<br />ROAM TODAY?
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '4px 4px 4px 18px',
        gap: 10, marginBottom: 36,
      }}>
        <input
          value={homeSearch}
          onChange={(e) => setHomeSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleHomeSearch(); }}
          placeholder="Search the web, or enter a URL like google.com..."
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'var(--font-ui)', fontSize: 15, color: 'var(--text)', fontWeight: 500,
          }}
        />
        <button onClick={handleHomeSearch} style={{
          background: 'linear-gradient(135deg, var(--pink), var(--violet))',
          border: 'none', borderRadius: 8, padding: '10px 20px',
          color: 'white', fontFamily: 'var(--font-ui)', fontWeight: 700,
          fontSize: 13, letterSpacing: 1, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>SEARCH</button>
      </div>

      {/* Quick access tiles */}
      <MonoLabel>// Quick Access</MonoLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 32 }}>
        {[['🌐','Network'],['📡','P2P Hub'],['🔒','Private'],['📚','Library'],['💬','Chat']].map(([icon, label]) => (
          <div key={label} style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 10px', cursor: 'pointer',
            textAlign: 'center', transition: 'all var(--transition)',
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* P2P Status */}
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 20, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, var(--violet), transparent)',
        }} />
        <MonoLabel style={{ marginBottom: 16 }}>// P2P Network Status</MonoLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { val: stats.peerCount, lbl: 'Peers', color: 'var(--cyan)' },
            { val: `${stats.totalSharedTB} TB`, lbl: 'Shared', color: 'var(--pink)' },
            { val: `${stats.uptimePct}%`, lbl: 'Uptime', color: 'var(--amber)' },
            { val: `${stats.avgLatencyMs}ms`, lbl: 'Latency', color: 'var(--violet)' },
          ].map(({ val, lbl, color }) => (
            <div key={lbl} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color }}>{val}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Active agents mini row */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Active AI Agents
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {agents.filter(a => a.status === 'running').map((a) => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
                borderRadius: 20, padding: '3px 10px',
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cyan)',
              }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'blink 2s infinite' }} />
                {a.emoji} {a.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Wanderer Panel ─────────────────────────────────────────────
const WandererToggle: React.FC<{
  label: string; sub: string; checked: boolean; onChange: () => void
}> = ({ label, sub, checked, onChange }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', background: 'var(--panel)',
    border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10,
  }}>
    <div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
    </div>
    <div onClick={onChange} style={{
      width: 44, height: 24, borderRadius: 12,
      background: checked ? 'rgba(6,182,212,0.3)' : 'var(--dim)',
      border: `1px solid ${checked ? 'var(--cyan)' : 'var(--border)'}`,
      position: 'relative', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: checked ? 'var(--cyan)' : 'var(--muted)',
        position: 'absolute', top: 2, left: checked ? 22 : 2,
        transition: 'all 0.2s',
      }} />
    </div>
  </div>
);

const HAT_OPTIONS = [
  'none', 'beanie', 'cap', 'tophat', 'crown', 'cowboy',
  'halo', 'headphones', 'santa', 'pirate', 'antenna',
];
const HAT_LABELS: Record<string, string> = {
  none: 'None', beanie: '🧶 Beanie', cap: '🧢 Cap', tophat: '🎩 Top Hat',
  crown: '👑 Crown', cowboy: '🤠 Cowboy', halo: '😇 Halo',
  headphones: '🎧 Headphones', santa: '🎅 Santa', pirate: '🏴‍☠️ Pirate',
  antenna: '📡 Antenna',
};

export const WandererPanel: React.FC = () => {
  const wanderer = useUIStore((s) => s.wanderer);
  const updateWanderer = useUIStore((s) => s.updateWanderer);
  const SPEED_LABELS = ['', 'Chill', 'Slow', 'Normal', 'Fast', 'Hyper'];
  const MODE_OPTIONS: { value: 'off' | 'static' | 'roam'; label: string; sub: string }[] = [
    { value: 'off', label: 'Off', sub: 'Hidden' },
    { value: 'static', label: 'Static', sub: 'Stays in one spot' },
    { value: 'roam', label: 'Roam', sub: 'Walks, runs, dances, sleeps' },
  ];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 4, color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: 4 }}>// Companion</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, background: 'linear-gradient(135deg, var(--pink), var(--violet))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1, marginBottom: 24 }}>
        MEET {wanderer.name.toUpperCase()}
      </div>

      {/* Hero card */}
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--pink), var(--violet), var(--cyan))' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(255,45,149,0.15), rgba(124,58,237,0.15))',
            border: '2px solid rgba(6,182,212,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40,
          }}>
            {wanderer.mode === 'off' ? '😴' : '🕶️'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900 }}>{wanderer.name}</div>
              <span className={`pill pill-${wanderer.enabled && wanderer.mode !== 'off' ? 'green' : 'muted'}`} style={{ fontSize: 8 }}>
                {wanderer.mode === 'off' ? '○ OFF' : wanderer.mode === 'static' ? '● STATIC' : '● ROAMING'}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
              Your companion · Walks, dances, sleeps & notifies you
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
              Hat: {HAT_LABELS[wanderer.hat] || 'None'} · Speed: {SPEED_LABELS[wanderer.speed]}
            </div>
          </div>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
          {wanderer.name} is a little dude with sunglasses who hangs out on your screen.
          He walks around, sometimes runs, stops to dance, and occasionally falls asleep with floating Z's.
          He'll pop up quotes, weather, and weird news headlines. You can't chat with him — he does his own thing.
        </p>
      </div>

      {/* Name */}
      <div style={{ padding: '14px 18px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Name</div>
        <input
          value={wanderer.name}
          onChange={(e) => updateWanderer({ name: e.target.value || 'HoloBro' })}
          placeholder="HoloBro"
          style={{
            width: '100%', boxSizing: 'border-box', padding: '8px 12px',
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)', outline: 'none',
          }}
        />
      </div>

      {/* Mode selector */}
      <div style={{ padding: '14px 18px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Mode</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {MODE_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => updateWanderer({ mode: opt.value, enabled: opt.value !== 'off' })} style={{
              flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
              border: wanderer.mode === opt.value ? '2px solid var(--cyan)' : '2px solid var(--border)',
              background: wanderer.mode === opt.value ? 'rgba(6,182,212,0.08)' : 'transparent',
              color: 'var(--text)', textAlign: 'center', transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Hat selector */}
      <div style={{ padding: '14px 18px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Hat</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {HAT_OPTIONS.map((hat) => (
            <button key={hat} onClick={() => updateWanderer({ hat })} style={{
              padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
              border: wanderer.hat === hat ? '2px solid var(--cyan)' : '2px solid transparent',
              background: wanderer.hat === hat ? 'rgba(6,182,212,0.08)' : 'transparent',
              color: 'var(--text)', fontSize: 11, textAlign: 'center',
              fontFamily: 'var(--font-mono)', transition: 'all 0.2s',
            }}>
              {HAT_LABELS[hat] || hat}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <WandererToggle
        label="Notify Agent Messages"
        sub={`${wanderer.name} pops up when agents send messages`}
        checked={wanderer.notifyAgentMessages}
        onChange={() => updateWanderer({ notifyAgentMessages: !wanderer.notifyAgentMessages })}
      />
      <WandererToggle
        label="Show Weather"
        sub={`${wanderer.name} randomly announces the weather`}
        checked={wanderer.showWeather}
        onChange={() => updateWanderer({ showWeather: !wanderer.showWeather })}
      />
      <WandererToggle
        label="Quote of the Day"
        sub={`${wanderer.name} shares inspirational quotes`}
        checked={wanderer.showQuotes}
        onChange={() => updateWanderer({ showQuotes: !wanderer.showQuotes })}
      />
      <WandererToggle
        label="Weird News Headlines"
        sub={`${wanderer.name} says random absurd news references`}
        checked={wanderer.showNews}
        onChange={() => updateWanderer({ showNews: !wanderer.showNews })}
      />

      {/* Speed slider */}
      <div style={{ padding: '14px 18px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Movement Speed</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>How fast {wanderer.name} moves</div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--cyan)' }}>{SPEED_LABELS[wanderer.speed]}</div>
        </div>
        <input type="range" min={1} max={5} value={wanderer.speed} step={1}
          onChange={(e) => updateWanderer({ speed: Number(e.target.value) })}
          style={{ width: '100%' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)' }}>CHILL</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)' }}>HYPER</span>
        </div>
      </div>

      {/* Opacity slider */}
      <div style={{ padding: '14px 18px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Opacity</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>How visible {wanderer.name} is</div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--cyan)' }}>{Math.round(wanderer.opacity * 100)}%</div>
        </div>
        <input type="range" min={20} max={100} value={Math.round(wanderer.opacity * 100)} step={5}
          onChange={(e) => updateWanderer({ opacity: Number(e.target.value) / 100 })}
          style={{ width: '100%' }} />
      </div>
    </div>
  );
};

// ── Generic placeholder panel ─────────────────────────────────
export const PlaceholderPanel: React.FC<{ icon: string; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
    <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, background: 'linear-gradient(135deg, var(--pink), var(--violet))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 2 }}>{subtitle}</div>
    </div>
  </div>
);
