// ============================================================
// HoloBro — Shell Components (Header, Sidebar, TabBar, URLBar)
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { useAgentStore, useUIStore } from '../store';
import { useAgentTotals } from '../hooks';
import { StatusDot } from './ui';
import { useHolochain } from '../providers/HolochainProvider';
import { normalizeAppWebsocketUrl } from '../holochainConnect';
import { releaseTierAbbrev, releaseTierLabel } from '../lib/releaseProfile';
import { HoloBroMiniSprite } from './HoloBroMiniSprite';
import type { PanelId } from '../types';

// ── Header ───────────────────────────────────────────────────
export const Header: React.FC = () => {
  const holo = useHolochain();
  const cookies = holo.cookieJarCount;
  const bump = holo.bumpCookieJar;
  const wanderer = useUIStore((s) => s.wanderer);
  const setPanel = useUIStore((s) => s.setPanel);
  const openWelcomeGuide = useUIStore((s) => s.openWelcomeGuide);

  return (
    <header style={{
      height: 48, background: 'var(--panel)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 12, position: 'relative', flexShrink: 0,
    }}>
      {/* Rainbow top stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, var(--pink), var(--violet), var(--cyan), var(--amber))',
      }} />

      {/* Brand */}
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 900,
        fontSize: 18, letterSpacing: 4,
        background: 'linear-gradient(135deg, var(--pink) 0%, var(--violet) 50%, var(--cyan) 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>HOLOBRO</span>

      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--cyan)', letterSpacing: 2, opacity: 0.6,
      }}>v0.4.2-alpha</span>
      <span
        title={`Release tier: ${releaseTierLabel()} (set VITE_HOLOBRO_TIER at build time)`}
        style={{
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: 'var(--muted)', letterSpacing: 1,
          padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border)',
        }}
      >
        {releaseTierAbbrev()}
      </span>

      <div style={{ flex: 1 }} />

      <button
        type="button"
        onClick={() => openWelcomeGuide()}
        title="Welcome, keys, and safety tips"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: 1,
          color: 'var(--cyan)',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '4px 10px',
          cursor: 'pointer',
        }}
      >
        Safety tips
      </button>

      {/* P2P badge — shows real connection status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: holo.hc ? 'var(--green)' : 'var(--amber)', letterSpacing: 1,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: holo.hc ? 'var(--green)' : 'var(--amber)',
          animation: holo.hc ? 'blink 2s infinite' : undefined,
        }} />
        {holo.hc ? 'P2P LIVE' : 'DEMO MODE'}
      </div>

      {/* Cookie Jar */}
      <button
        onClick={bump}
        title="Cookie Jar \u2014 click to earn!"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(250,204,21,0.08)',
          border: '1px solid rgba(250,204,21,0.25)',
          borderRadius: 20, padding: '4px 12px',
          fontFamily: 'var(--font-mono)', fontSize: 12,
          color: 'var(--amber)', cursor: 'pointer',
          transition: 'background var(--transition)',
        }}
      >
        {'\u{1F36A}'} {cookies.toLocaleString()}
      </button>

      {/* HoloBro mini avatar — shows current look */}
      <button
        onClick={() => setPanel('wanderer')}
        title={`${wanderer.name} settings`}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(255,45,149,0.12), rgba(124,58,237,0.12))',
          border: '1px solid rgba(6,182,212,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          opacity: wanderer.enabled ? wanderer.opacity : 0.35,
          transition: 'all 0.3s',
          padding: 2,
        }}
      >
        <HoloBroMiniSprite hat={wanderer.hat} size={28} />
      </button>
    </header>
  );
};

// ── Sidebar ──────────────────────────────────────────────────
const NAV_ITEMS: { id: PanelId; icon: string; label: string; badge?: boolean }[] = [
  { id: 'browser',   icon: '\u{1F310}', label: 'Browse' },
  { id: 'bookmarks', icon: '\u{1F516}', label: 'Marks' },
  { id: 'history',   icon: '\u{1F550}', label: 'History' },
  { id: 'privacy',   icon: '\u{1F512}', label: 'Privacy' },
  { id: 'library',   icon: '\u{1F4DA}', label: 'Library' },
  { id: 'contacts',  icon: '\u{1F465}', label: 'Peers',   badge: true },
  { id: 'chat',      icon: '\u{1F4AC}', label: 'Chat',    badge: true },
  { id: 'video',     icon: '\u25B6\uFE0F', label: 'Video' },
  { id: 'weather',   icon: '\u{1F324}', label: 'Weather' },
  { id: 'assistant', icon: '\u{1F916}', label: 'AI' },
  { id: 'network',   icon: '\u{1F4E1}', label: 'Network' },
  { id: 'agents',    icon: '\u26A1', label: 'Agents' },
  { id: 'wanderer',  icon: '\u{1F3AD}', label: 'Wander' },
];

const SEP_BEFORE: PanelId[] = ['privacy', 'contacts', 'weather', 'agents', 'wanderer'];

export const Sidebar: React.FC = () => {
  const activePanel = useUIStore((s) => s.activePanel);
  const setPanel = useUIStore((s) => s.setPanel);

  return (
    <nav style={{
      width: 64, background: 'var(--panel)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '12px 0',
      gap: 3, flexShrink: 0, position: 'relative',
    }}>
      {/* Gradient left stripe */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
        background: 'linear-gradient(180deg, transparent, var(--violet), var(--cyan), transparent)',
        opacity: 0.25,
      }} />

      {NAV_ITEMS.map((item) => (
        <React.Fragment key={item.id}>
          {SEP_BEFORE.includes(item.id) && (
            <div style={{ width: 32, height: 1, background: 'var(--border)', margin: '3px 0' }} />
          )}
          <button
            onClick={() => setPanel(item.id)}
            title={item.label}
            style={{
              width: 46, height: 46, borderRadius: 10,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 2, cursor: 'pointer', position: 'relative',
              transition: 'all var(--transition)',
              border: activePanel === item.id
                ? '1px solid rgba(6,182,212,0.3)'
                : '1px solid transparent',
              background: activePanel === item.id
                ? 'rgba(6,182,212,0.1)'
                : 'transparent',
            }}
          >
            {/* Active indicator */}
            {activePanel === item.id && (
              <div style={{
                position: 'absolute', left: -14, top: '50%',
                transform: 'translateY(-50%)',
                width: 3, height: 20, background: 'var(--cyan)',
                borderRadius: '0 2px 2px 0',
              }} />
            )}
            <span style={{
              fontSize: 17, lineHeight: 1,
              color: activePanel === item.id ? 'var(--cyan)' : 'var(--muted)',
              transition: 'color var(--transition)',
            }}>
              {item.icon}
            </span>
            <span style={{
              fontSize: 8, letterSpacing: 0.5,
              fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
              color: activePanel === item.id ? 'var(--cyan)' : 'var(--muted)',
              transition: 'color var(--transition)',
            }}>
              {item.label}
            </span>
            {item.badge && (
              <div style={{
                position: 'absolute', top: 5, right: 5,
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--pink)',
                border: '1px solid var(--panel)',
              }} />
            )}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

// ── TabBar (wired to UIStore) ────────────────────────────────
export const TabBar: React.FC = () => {
  const tabs = useUIStore((s) => s.tabs);
  const activeTabId = useUIStore((s) => s.activeTabId);
  const switchTab = useUIStore((s) => s.switchTab);
  const addTab = useUIStore((s) => s.addTab);
  const closeTab = useUIStore((s) => s.closeTab);

  return (
    <div style={{
      height: 40, background: 'var(--panel)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'flex-end',
      padding: '0 12px', gap: 2, flexShrink: 0,
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => switchTab(tab.id)}
          style={{
            height: 32, padding: '0 12px',
            borderRadius: '6px 6px 0 0',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, cursor: 'pointer',
            background: activeTabId === tab.id ? 'var(--bg)' : 'var(--dim)',
            border: '1px solid var(--border)', borderBottom: 'none',
            color: activeTabId === tab.id ? 'var(--text)' : 'var(--muted)',
            maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden',
            fontFamily: 'var(--font-ui)', fontWeight: 500,
            transition: 'all var(--transition)',
          }}
        >
          <span>{tab.icon}</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tab.label}
          </span>
          <span
            onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
            style={{ opacity: 0.3, fontSize: 10, cursor: 'pointer', padding: '0 2px' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.3'; }}
          >{'\u2715'}</span>
        </button>
      ))}
      <button
        onClick={addTab}
        style={{
          width: 28, height: 28, marginBottom: 2, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: 'var(--muted)', cursor: 'pointer',
          border: '1px dashed var(--border)', background: 'transparent',
          transition: 'all var(--transition)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan)'; (e.currentTarget as HTMLElement).style.color = 'var(--cyan)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; }}
      >+</button>
    </div>
  );
};

// ── URLBar ───────────────────────────────────────────────────
interface URLBarProps { onToggleInspector: () => void }

export const URLBar: React.FC<URLBarProps> = ({ onToggleInspector }) => {
  const holo = useHolochain();
  const activePanel = useUIStore((s) => s.activePanel);
  const browserUrl = useUIStore((s) => s.browserUrl);
  const navigate = useUIStore((s) => s.navigate);
  const goHome = useUIStore((s) => s.goHome);
  const PANEL_URLS: Partial<Record<PanelId, string>> = {
    browser:   'start.page', bookmarks: 'bookmarks',
    history:   'history',    privacy:   'privacy.local',
    library:   'library.p2p',
    contacts:  'peers.mesh', chat:      'chat.mesh',
    video:     'video.stream', weather: 'weather.local',
    assistant: 'ai.assistant', network: 'network.hub',
    agents:    'agents.hub',  wanderer: 'wanderer.settings',
  };

  // Show actual URL when browsing, or panel name
  const displayUrl = activePanel === 'browser' && browserUrl
    ? browserUrl
    : PANEL_URLS[activePanel] ?? activePanel;

  const [urlInput, setUrlInput] = useState(displayUrl);
  const [focused, setFocused] = useState(false);

  // Sync input when URL changes externally (clicking sidebar, etc.)
  React.useEffect(() => {
    if (!focused) setUrlInput(displayUrl);
  }, [displayUrl, focused]);

  const handleGo = () => {
    if (urlInput.trim()) {
      navigate(urlInput.trim());
      setFocused(false);
    }
  };

  return (
    <div style={{
      height: 52, background: 'var(--panel2)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: 8, flexShrink: 0,
    }}>
      {/* Nav buttons */}
      {[
        { icon: '\u2190', title: 'Back', enabled: useUIStore.getState().canGoBack, action: () => useUIStore.getState().goBack() },
        { icon: '\u2192', title: 'Forward', enabled: useUIStore.getState().canGoForward, action: () => useUIStore.getState().goForward() },
        { icon: '\u21BB', title: 'Reload', enabled: !!browserUrl, action: () => { if (browserUrl) navigate(browserUrl); } },
      ].map(({ icon, title, enabled, action }, i) => (
        <button key={i} title={title} onClick={action} style={{
          width: 28, height: 28, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: 'var(--muted)', cursor: enabled ? 'pointer' : 'not-allowed',
          border: '1px solid transparent', background: 'transparent',
          opacity: enabled ? 1 : 0.3, transition: 'all var(--transition)',
        }}>
          {icon}
        </button>
      ))}

      {/* Home button */}
      <button
        onClick={goHome}
        title="Home"
        style={{
          width: 28, height: 28, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: browserUrl ? 'var(--cyan)' : 'var(--muted)',
          cursor: 'pointer',
          border: '1px solid transparent', background: 'transparent',
          transition: 'all var(--transition)',
        }}
      >{'🏠'}</button>

      {/* URL input */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        background: 'var(--bg)',
        border: focused ? '1px solid var(--cyan)' : '1px solid var(--border)',
        borderRadius: 8, padding: '0 12px', height: 34, gap: 8,
        transition: 'border-color var(--transition)',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--green)', whiteSpace: 'nowrap',
        }}>{activePanel === 'browser' && browserUrl ? '🔒' : 'holo://'}</span>
        <input
          value={focused ? urlInput : displayUrl}
          onChange={(e) => setUrlInput(e.target.value)}
          onFocus={(e) => {
            setFocused(true);
            setUrlInput(displayUrl);
            e.currentTarget.select();
          }}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleGo(); }}
          placeholder="Type a URL or search..."
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)',
          }}
        />
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 6px',
          borderRadius: 4, letterSpacing: 0.5,
          background: 'rgba(168,85,247,0.15)', color: 'var(--violet)',
          border: '1px solid rgba(168,85,247,0.3)',
        }}>P2P</span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, padding: '2px 6px',
          borderRadius: 4, letterSpacing: 0.5,
          background: 'rgba(34,197,94,0.1)', color: 'var(--green)',
          border: '1px solid rgba(34,197,94,0.25)',
        }}>E2E</span>
      </div>

      {/* Action buttons */}
      {[
        { icon: '\u{1F516}', title: 'Bookmark', action: () => holo.addBookmark() },
        { icon: '\u{1F4E1}', title: 'Share P2P', action: () => {
          const u = browserUrl || holo.url;
          const t = (() => { try { return new URL(u).hostname; } catch { return u; } })();
          void holo.shareLink(u, t, '', '');
        }},
        { icon: '\u{1F50D}', title: 'Toggle Inspector', action: onToggleInspector },
      ].map(({ icon, title, action }) => (
        <button key={icon} onClick={action} title={title} style={{
          width: 28, height: 28, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', border: '1px solid var(--border)',
          color: 'var(--muted)', fontSize: 14, background: 'transparent',
          transition: 'all var(--transition)',
        }}>
          {icon}
        </button>
      ))}
    </div>
  );
};

// ── GroupPill (drop-up menu for a single agent group) ────────
const GroupPill: React.FC<{ groupId: string; groupName: string; groupColor: string }> = ({ groupId, groupName, groupColor }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const agents = useAgentStore((s) => s.agents);
  const updateAgent = useAgentStore((s) => s.updateAgent);
  const openMiniChat = useUIStore((s) => s.openMiniChat);
  const openAgentHub = useUIStore((s) => s.openAgentHub);

  const groupAgents = agents.filter((a) => a.groupId === groupId);
  const runningCount = groupAgents.filter((a) => a.status === 'running').length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* The pill button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: open ? `${groupColor}18` : 'var(--dim)',
          border: `1px solid ${open ? `${groupColor}60` : groupColor + '30'}`,
          borderRadius: 20, padding: '4px 10px',
          cursor: 'pointer', transition: 'all var(--transition)',
          fontFamily: 'var(--font-mono)', fontSize: 10,
          whiteSpace: 'nowrap', color: groupColor,
        }}
      >
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: runningCount > 0 ? 'var(--green)' : groupColor,
          opacity: runningCount > 0 ? 1 : 0.5,
          animation: runningCount > 0 ? 'blink 2s infinite' : undefined,
          flexShrink: 0,
        }} />
        <span style={{ fontWeight: 700, letterSpacing: 0.5 }}>{groupName}</span>
        <span style={{ fontSize: 9, color: 'var(--muted)' }}>
          {groupAgents.length}
        </span>
        <span style={{
          fontSize: 8, transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          color: 'var(--muted)',
        }}>▲</span>
      </button>

      {/* Drop-up menu */}
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0,
          marginBottom: 6, minWidth: 220,
          background: 'var(--panel)', border: `1px solid ${groupColor}40`,
          borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
          zIndex: 100,
        }}>
          {/* Menu header */}
          <div style={{
            padding: '8px 12px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 2,
              color: groupColor, textTransform: 'uppercase',
            }}>
              {groupName}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)',
            }}>
              {runningCount}/{groupAgents.length} active
            </span>
          </div>

          {/* Agent list */}
          {groupAgents.length === 0 && (
            <div style={{
              padding: '12px 14px', fontFamily: 'var(--font-mono)',
              fontSize: 10, color: 'var(--muted)', textAlign: 'center',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <span>No agents in this group</span>
              <button
                type="button"
                onClick={() => {
                  openAgentHub({ addAgent: true, groupId });
                  setOpen(false);
                }}
                style={{
                  padding: '6px 10px', borderRadius: 8,
                  border: `1px solid ${groupColor}50`,
                  background: `${groupColor}14`,
                  color: groupColor,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                + New agent in {groupName}
              </button>
            </div>
          )}
          {groupAgents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => { openMiniChat(agent.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 12px', cursor: 'pointer',
                transition: 'background 0.15s',
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.06)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: agent.avatarBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, flexShrink: 0,
              }}>
                {agent.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {agent.name}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <StatusDot status={agent.status} size={5} />
                  <span style={{
                    color: agent.status === 'running' ? 'var(--green)'
                      : agent.status === 'idle' ? 'var(--amber)' : 'var(--muted)',
                  }}>
                    {agent.status === 'idle' ? 'idle' : agent.status === 'error' ? 'error' : `${agent.latencyMs}ms`}
                  </span>
                </div>
              </div>

              {/* X button to remove from group (moves to first available group) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Move agent to "ungrouped" by setting groupId to empty
                  // Or move to first group that isn't this one
                  const groups = useAgentStore.getState().groups;
                  const otherGroup = groups.find((g) => g.id !== groupId);
                  if (otherGroup) {
                    updateAgent(agent.id, { groupId: otherGroup.id });
                  }
                }}
                title={`Remove ${agent.name} from ${groupName}`}
                style={{
                  width: 20, height: 20, borderRadius: '50%',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--muted)', cursor: 'pointer', fontSize: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--pink)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--pink)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--muted)';
                }}
              >✕</button>
            </div>
          ))}

          {/* Gradient footer accent */}
          <div style={{
            height: 2,
            background: `linear-gradient(90deg, transparent, ${groupColor}, transparent)`,
          }} />
        </div>
      )}
    </div>
  );
};

// ── AgentStatusBar ───────────────────────────────────────────
export const AgentStatusBar: React.FC = () => {
  const groups = useAgentStore((s) => s.groups);
  const setPanel = useUIStore((s) => s.setPanel);
  const openAgentHub = useUIStore((s) => s.openAgentHub);
  const totals = useAgentTotals();
  const [hubMenuOpen, setHubMenuOpen] = useState(false);
  const hubMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hubMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (hubMenuRef.current && !hubMenuRef.current.contains(e.target as Node)) setHubMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [hubMenuOpen]);

  return (
    <div style={{
      height: 42, background: 'var(--panel)',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 12px', gap: 6, flexShrink: 0, position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, var(--violet) 30%, var(--cyan) 70%, transparent)',
        opacity: 0.5,
      }} />

      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 2,
        color: 'var(--muted)', textTransform: 'uppercase',
        marginRight: 4, whiteSpace: 'nowrap',
      }}>{'⚡'} AGENTS</span>

      {/* Group pills with drop-up menus */}
      {groups.map((group) => (
        <GroupPill
          key={group.id}
          groupId={group.id}
          groupName={group.name}
          groupColor={group.color}
        />
      ))}

      <div style={{ flex: 1 }} />

      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        color: 'var(--muted)', letterSpacing: 1, whiteSpace: 'nowrap',
      }}>
        {totals.running} running &middot; ${totals.totalCost.toFixed(2)} today
      </span>

      <div ref={hubMenuRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setHubMenuOpen((v) => !v)}
          title="Agent Hub — open or create an agent"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'transparent', border: '1px dashed var(--border)',
            borderRadius: 20, padding: '4px 12px',
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--muted)', cursor: 'pointer',
            transition: 'all var(--transition)', whiteSpace: 'nowrap',
          }}
        >
          + Agents {hubMenuOpen ? '\u25BC' : '\u25B2'}
        </button>
        {hubMenuOpen && (
          <div style={{
            position: 'absolute', bottom: '100%', right: 0,
            marginBottom: 6, minWidth: 240,
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 10, overflow: 'hidden',
            boxShadow: '0 -8px 28px rgba(0,0,0,0.45)', zIndex: 120,
          }}>
            <div style={{
              padding: '8px 12px', borderBottom: '1px solid var(--border)',
              fontFamily: 'var(--font-mono)', fontSize: 9,
              color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase',
            }}>
              Agent Hub
            </div>
            <button
              type="button"
              onClick={() => { setPanel('agents'); setHubMenuOpen(false); }}
              style={agentHubMenuRowStyle}
            >
              Open hub
            </button>
            <button
              type="button"
              onClick={() => { openAgentHub({ addAgent: true }); setHubMenuOpen(false); }}
              style={agentHubMenuRowStyle}
            >
              New agent…
            </button>
            {groups.length > 0 && (
              <>
                <div style={{
                  padding: '6px 12px 4px',
                  fontFamily: 'var(--font-mono)', fontSize: 8,
                  color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1,
                }}>
                  New agent in group
                </div>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      openAgentHub({ addAgent: true, groupId: g.id });
                      setHubMenuOpen(false);
                    }}
                    style={{
                      ...agentHubMenuRowStyle,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                    {g.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    openAgentHub({ addAgent: true, groupId: '' });
                    setHubMenuOpen(false);
                  }}
                  style={agentHubMenuRowStyle}
                >
                  Unassigned only
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const agentHubMenuRowStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '9px 14px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontFamily: 'var(--font-ui)',
  fontSize: 12,
  color: 'var(--text)',
  textAlign: 'left',
  transition: 'background var(--transition)',
};

// ── HolochainSetupPopup ─────────────────────────────────────
const HolochainSetupPopup: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const envWs = (import.meta.env.VITE_HC_APP_WS as string | undefined)?.trim();
  const envTok = (import.meta.env.VITE_HC_APP_TOKEN as string | undefined)?.trim();
  const [wsUrl, setWsUrl] = useState(
    () => localStorage.getItem('holobro-hc-ws') || envWs || 'ws://127.0.0.1:8888',
  );
  const [appToken, setAppToken] = useState(
    () => localStorage.getItem('holobro-hc-token') || envTok || '',
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleApply = () => {
    const normalized = normalizeAppWebsocketUrl(wsUrl);
    localStorage.setItem('holobro-hc-ws', normalized);
    localStorage.setItem('holobro-hc-token', appToken);
    setSaved(true);
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <div ref={ref} style={{
      position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
      width: 380, background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden', zIndex: 200,
      boxShadow: '0 -12px 40px rgba(0,0,0,0.5)',
    }}>
      {/* Header accent */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, var(--pink), var(--violet), var(--cyan))' }} />

      <div style={{ padding: '14px 16px' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 900,
          background: 'linear-gradient(135deg, var(--pink), var(--cyan))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: 4,
        }}>
          P2P Connection Setup
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)',
          marginBottom: 14, lineHeight: 1.6,
        }}>
          Connect to a running Holochain conductor. Start your conductor first,
          then enter the WebSocket URL and app token below.
        </div>

        {/* WS URL */}
        <label style={{
          display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9,
          color: 'var(--cyan)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
        }}>
          WebSocket URL (VITE_HC_APP_WS)
        </label>
        <input
          value={wsUrl}
          onChange={(e) => setWsUrl(e.target.value)}
          placeholder="ws://127.0.0.1:8888"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '8px 10px', marginBottom: 12,
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--text)', outline: 'none',
          }}
        />

        {/* App Token */}
        <label style={{
          display: 'block', fontFamily: 'var(--font-mono)', fontSize: 9,
          color: 'var(--cyan)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
        }}>
          App Token (VITE_HC_APP_TOKEN)
        </label>
        <input
          value={appToken}
          onChange={(e) => setAppToken(e.target.value)}
          placeholder="Paste token from hc sandbox or conductor admin"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '8px 10px', marginBottom: 14,
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--text)', outline: 'none',
          }}
        />

        {/* Guidance */}
        <div style={{
          background: 'var(--dim)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '10px 12px', marginBottom: 14,
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', lineHeight: 1.6,
        }}>
          <div style={{ color: 'var(--cyan)', fontWeight: 700, marginBottom: 4, fontSize: 9, letterSpacing: 1 }}>QUICK START</div>
          <div>1. Install Holochain: <span style={{ color: 'var(--text)' }}>nix develop</span></div>
          <div>2. Run sandbox: <span style={{ color: 'var(--text)' }}>hc sandbox generate</span></div>
          <div>3. Start conductor: <span style={{ color: 'var(--text)' }}>hc sandbox run</span></div>
          <div>4. Copy the WebSocket port and app token from the output</div>
          <div style={{ marginTop: 4, color: 'var(--amber)', fontSize: 9 }}>
            Or set env vars: VITE_HC_APP_WS and VITE_HC_APP_TOKEN in .env
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleApply}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 6, border: 'none',
              background: saved ? 'var(--green)' : 'linear-gradient(135deg, var(--pink), var(--violet))',
              color: 'white', fontFamily: 'var(--font-ui)', fontWeight: 700,
              fontSize: 12, letterSpacing: 1, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {saved ? '\u2713 Saved — Reloading...' : 'Apply & Reconnect'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--muted)', fontFamily: 'var(--font-ui)',
              fontSize: 12, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ── StatusBar ─────────────────────────────────────────────────
export const StatusBar: React.FC = () => {
  const holo = useHolochain();
  const isConnected = Boolean(holo.hc);
  const [setupOpen, setSetupOpen] = useState(false);

  return (
    <div style={{
      height: 22, background: 'var(--panel)',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 12px', gap: 16,
      fontFamily: 'var(--font-mono)', fontSize: 9,
      color: 'var(--muted)', letterSpacing: 1, flexShrink: 0,
      position: 'relative',
    }}>
      {/* Connection status — clickable when in demo mode */}
      <span
        onClick={() => !isConnected && setSetupOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          color: isConnected ? 'var(--green)' : 'var(--amber)',
          cursor: isConnected ? 'default' : 'pointer',
        }}
        title={isConnected ? 'Connected to Holochain DHT' : 'Click to configure Holochain connection'}
      >
        {isConnected ? '\u25CF' : '\u25CB'} {isConnected ? 'Holochain DHT' : 'Demo Mode'}
        {!isConnected && (
          <span style={{
            fontSize: 8, padding: '1px 5px', borderRadius: 3,
            border: '1px solid var(--amber)', marginLeft: 2,
          }}>Setup</span>
        )}
      </span>

      {/* Setup popup */}
      {setupOpen && <HolochainSetupPopup onClose={() => setSetupOpen(false)} />}

      <span style={{
        display: 'flex', alignItems: 'center', gap: 4,
        color: 'var(--cyan)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }} title={holo.hcLastError ? `${holo.hcStatus} — ${holo.hcLastError}` : holo.hcStatus}>
        {holo.hcStatus}
      </span>
      {holo.pendingOps.length > 0 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--amber)' }}>
          {'\u{1F4E4}'} {holo.pendingOps.length} queued
        </span>
      )}
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--pink)' }}>
        {'\u25C8'} E2E Encrypted
      </span>
      <div style={{ flex: 1 }} />
      <span>TAURI v2.1 &middot; REACT &middot; TYPESCRIPT</span>
    </div>
  );
};
