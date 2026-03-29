// ============================================================
// HoloBro — Agent Hub Panel
// ============================================================
import React, { useState } from 'react';
import { useAgentStore, useMockupUIStore } from './store';
import { useAgentsByGroup, useAgentTotals } from './hooks';
import {
  AgentAvatar, StatusPill, LogMini,
  MonoLabel, Btn, TextInput, InlineEditInput,
} from './ui';
import { AGENT_TEMPLATES, AVATAR_EMOJIS, AVATAR_BACKGROUNDS } from './constants';
import type { Agent, AgentGroup } from './types';

// ── AgentCard ────────────────────────────────────────────────
const AgentCard: React.FC<{
  agent: Agent;
  onOpenChat: () => void;
  onOpenInspector: () => void;
  onPickAvatar: () => void;
}> = ({ agent, onOpenChat, onOpenInspector, onPickAvatar }) => {
  const { renameAgent, updateAgent } = useAgentStore();

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden', transition: 'all var(--transition)',
      position: 'relative',
    }}>
      <div style={{ height: 3, background: agent.accentGradient }} />
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <AgentAvatar agent={agent} size={44} onClick={onPickAvatar} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <InlineEditInput value={agent.name} onChange={(val) => renameAgent(agent.id, val)} />
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)',
            marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {agent.endpoint} &middot; {agent.model}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
            <StatusPill status={agent.status} />
          </div>
        </div>
        <Btn variant="danger" size="sm" onClick={() => updateAgent(agent.id, { status: 'offline' })}
          style={{ padding: '3px 8px', fontSize: 10 }}>
          &square;
        </Btn>
      </div>
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Latency', value: `${agent.latencyMs}ms`, color: agent.status === 'idle' ? 'var(--amber)' : 'var(--green)' },
            { label: 'Calls', value: agent.totalCalls, color: 'var(--cyan)' },
            { label: 'Uptime', value: `${agent.uptimePct}%`, color: 'var(--amber)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              textAlign: 'center', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 4px',
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        <LogMini logs={agent.logs} maxRows={3} />
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant="ghost" size="sm" onClick={onOpenChat}
            style={{ flex: 1, color: agent.accentColor, borderColor: `${agent.accentColor}50` }}>
            Chat
          </Btn>
          <Btn variant="ghost" size="sm" onClick={onOpenInspector}>Inspect</Btn>
        </div>
      </div>
    </div>
  );
};

// ── AddAgentForm ─────────────────────────────────────────────
const AddAgentForm: React.FC<{ defaultGroupId?: string; onDone: () => void }> = ({ defaultGroupId, onDone }) => {
  const { addAgent, groups } = useAgentStore();
  const [name, setName] = useState('Claude');
  const [endpoint, setEndpoint] = useState('api.anthropic.com/v1');
  const [model, setModel] = useState('claude-sonnet-4-5');
  const [selectedEmoji, setSelectedEmoji] = useState(AGENT_TEMPLATES[0].emoji);
  const [selectedBg, setSelectedBg] = useState(AVATAR_BACKGROUNDS[0]);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState(defaultGroupId ?? groups[0]?.id ?? '');

  const selectTemplate = (idx: number) => {
    const t = AGENT_TEMPLATES[idx];
    setSelectedTemplate(idx);
    setName(t.label); setEndpoint(t.endpoint); setModel(t.model);
    setSelectedEmoji(t.emoji); setSelectedBg(t.avatarBg);
  };

  const handleConnect = () => {
    const newAgent: Agent = {
      id: crypto.randomUUID(), name, emoji: selectedEmoji, avatarBg: selectedBg,
      endpoint, model, status: 'running', groupId: selectedGroup,
      latencyMs: Math.floor(Math.random() * 200) + 50, totalCalls: 0, uptimePct: 100, costToday: 0,
      accentColor: AGENT_TEMPLATES[selectedTemplate]?.accentColor ?? '#06b6d4',
      accentGradient: AGENT_TEMPLATES[selectedTemplate]?.accentGradient ?? 'linear-gradient(135deg, #06b6d4, #a855f7)',
      logs: [{ ts: new Date().toLocaleTimeString('en-GB', { hour12: false }), level: 'ok', message: '\u2713 agent connected' }],
    };
    addAgent(newAgent);
    onDone();
  };

  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--panel2)' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: selectedBg, border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          {selectedEmoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginBottom: 4, letterSpacing: 1 }}>NEW AGENT</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name your agent..."
            style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: 1, width: '100%' }} />
        </div>
        <Btn variant="ghost" size="sm" onClick={onDone}>Cancel</Btn>
      </div>
      <div style={{ padding: 18 }}>
        <MonoLabel>Quick Templates</MonoLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {AGENT_TEMPLATES.map((t, i) => (
            <button key={t.label} onClick={() => selectTemplate(i)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: selectedTemplate === i ? 'rgba(6,182,212,0.08)' : 'var(--dim)',
              border: `1px solid ${selectedTemplate === i ? 'var(--cyan)' : 'var(--border)'}`,
              borderRadius: 20, padding: '5px 14px', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600,
              color: selectedTemplate === i ? 'var(--cyan)' : 'var(--text)', transition: 'all var(--transition)',
            }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <MonoLabel style={{ marginBottom: 6 }}>API Endpoint</MonoLabel>
            <TextInput value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
          </div>
          <div>
            <MonoLabel style={{ marginBottom: 6 }}>Model</MonoLabel>
            <TextInput value={model} onChange={(e) => setModel(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <MonoLabel style={{ marginBottom: 6 }}>API Key</MonoLabel>
          <TextInput type="password" placeholder="sk-... (stored in Tauri keyring)" />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--green)', marginTop: 4 }}>
            Key is stored via Tauri's secure keyring
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <MonoLabel style={{ marginBottom: 6 }}>Add to Group</MonoLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {groups.map((g) => (
              <button key={g.id} onClick={() => setSelectedGroup(g.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: selectedGroup === g.id ? 'rgba(6,182,212,0.08)' : 'var(--dim)',
                border: `1px solid ${selectedGroup === g.id ? 'var(--cyan)' : 'var(--border)'}`,
                borderRadius: 20, padding: '5px 14px', cursor: 'pointer',
                fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600,
                color: selectedGroup === g.id ? 'var(--cyan)' : 'var(--text)', transition: 'all var(--transition)',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.color }} />
                {g.name}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <MonoLabel style={{ marginBottom: 8 }}>Avatar</MonoLabel>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {AVATAR_BACKGROUNDS.map((bg) => (
              <button key={bg} onClick={() => setSelectedBg(bg)} style={{
                width: 24, height: 24, borderRadius: '50%',
                background: bg.replace('0.15', '0.5').replace('0.12', '0.5'),
                border: selectedBg === bg ? '2px solid white' : '2px solid transparent',
                cursor: 'pointer', transition: 'all var(--transition)',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {AVATAR_EMOJIS.slice(0, 12).map((emoji) => (
              <button key={emoji} onClick={() => setSelectedEmoji(emoji)} style={{
                width: 36, height: 36, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer',
                border: selectedEmoji === emoji ? '2px solid var(--cyan)' : '1px solid var(--border)',
                background: selectedEmoji === emoji ? 'rgba(6,182,212,0.08)' : 'transparent', transition: 'all var(--transition)',
              }}>
                {emoji}
              </button>
            ))}
          </div>
        </div>
        <Btn variant="grad" onClick={handleConnect} style={{ width: '100%', fontSize: 14, padding: 10 }}>
          Connect Agent
        </Btn>
      </div>
    </div>
  );
};

// ── GroupSection ─────────────────────────────────────────────
const GroupSection: React.FC<{
  group: AgentGroup; agents: Agent[]; onPickAvatar: (id: string) => void;
}> = ({ group, agents, onPickAvatar }) => {
  const { renameGroup, toggleGroupCollapsed } = useAgentStore();
  const { openMiniChat, setInspectorFocus } = useMockupUIStore();
  const [showAdd, setShowAdd] = useState(false);
  const running = agents.filter((a) => a.status === 'running').length;

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, flexShrink: 0 }} />
        <InlineEditInput value={group.name} onChange={(val) => renameGroup(group.id, val)} fontSize={13} letterSpacing={2} textTransform="uppercase" />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginLeft: 2 }}>
          {agents.length} agent{agents.length !== 1 ? 's' : ''}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {running > 0 && <span className="pill pill-muted" style={{ fontSize: 8 }}>{running} running</span>}
          <Btn variant="ghost" size="sm" onClick={() => setShowAdd((v) => !v)} style={{ fontSize: 10, padding: '3px 8px' }}>+ Agent</Btn>
          <button onClick={() => toggleGroupCollapsed(group.id)} style={{
            fontSize: 12, color: 'var(--muted)', cursor: 'pointer', background: 'none', border: 'none',
            transform: group.collapsed ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform var(--transition)',
          }}>{'\u25B6'}</button>
        </div>
      </div>
      {!group.collapsed && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent}
              onOpenChat={() => openMiniChat(agent.id)}
              onOpenInspector={() => setInspectorFocus(agent.id)}
              onPickAvatar={() => onPickAvatar(agent.id)} />
          ))}
          <button onClick={() => setShowAdd(true)} style={{
            background: 'transparent', border: '1px dashed var(--border)', borderRadius: 14,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 8, cursor: 'pointer', padding: 24, transition: 'all var(--transition)',
            minHeight: 200, color: 'var(--muted)',
          }}>
            <span style={{ fontSize: 24 }}>+</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>Add to group</span>
          </button>
        </div>
      )}
      {showAdd && !group.collapsed && (
        <div style={{ marginTop: 14 }}>
          <AddAgentForm defaultGroupId={group.id} onDone={() => setShowAdd(false)} />
        </div>
      )}
    </div>
  );
};

// ── AvatarPickerModal ────────────────────────────────────────
const AvatarPickerModal: React.FC<{ agentId: string; onClose: () => void }> = ({ agentId, onClose }) => {
  const agent = useAgentStore((s) => s.agents.find((a) => a.id === agentId));
  const { setAgentAvatar } = useAgentStore();
  const [selectedEmoji, setSelectedEmoji] = useState(agent?.emoji ?? '\u{1F916}');
  const [selectedBg, setSelectedBg] = useState(agent?.avatarBg ?? AVATAR_BACKGROUNDS[0]);

  if (!agent) return null;

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, width: 380, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--pink), var(--violet), var(--cyan))' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>CHANGE AVATAR</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}>{'\u2715'}</button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: selectedBg, border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
              {selectedEmoji}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{agent.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>Click to change emoji or background</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {AVATAR_BACKGROUNDS.map((bg) => (
              <button key={bg} onClick={() => setSelectedBg(bg)} style={{
                width: 26, height: 26, borderRadius: '50%',
                background: bg.replace('0.15','0.6').replace('0.12','0.6'),
                border: selectedBg === bg ? '2px solid white' : '2px solid transparent',
                cursor: 'pointer', transition: 'transform var(--transition)',
              }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 6, marginBottom: 16 }}>
            {AVATAR_EMOJIS.map((emoji) => (
              <button key={emoji} onClick={() => setSelectedEmoji(emoji)} style={{
                width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, cursor: 'pointer',
                border: selectedEmoji === emoji ? '2px solid var(--cyan)' : '1px solid transparent',
                background: selectedEmoji === emoji ? 'rgba(6,182,212,0.1)' : 'transparent', transition: 'all var(--transition)',
              }}>
                {emoji}
              </button>
            ))}
          </div>
          <Btn variant="grad" onClick={() => { setAgentAvatar(agentId, selectedEmoji, selectedBg); onClose(); }}
            style={{ width: '100%', fontSize: 13 }}>
            Apply Avatar
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ── AgentHubPanel ────────────────────────────────────────────
export function AgentHubPanel() {
  const { addGroup, updateAgent } = useAgentStore();
  const grouped = useAgentsByGroup();
  const totals = useAgentTotals();
  const [showAdd, setShowAdd] = useState(false);
  const [avatarTarget, setAvatarTarget] = useState<string | null>(null);

  const handleRefreshAll = () => {
    grouped.forEach(({ agents }) => {
      agents.forEach((a) => {
        const jitter = Math.round((Math.random() - 0.5) * 20);
        updateAgent(a.id, { latencyMs: Math.max(5, a.latencyMs + jitter) });
      });
    });
  };

  const handleAddGroup = () => {
    const name = window.prompt('Group name:');
    if (!name?.trim()) return;
    addGroup({
      id: crypto.randomUUID(), name: name.trim(),
      color: ['#ff2d95','#06b6d4','#a855f7','#facc15','#22c55e'][Math.floor(Math.random() * 5)],
      collapsed: false,
    });
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 4, color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: 4 }}>// AI Agents</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900, background: 'linear-gradient(135deg, var(--pink), var(--violet))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>
            AGENT<br />CONTROL HUB
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={handleRefreshAll}>Refresh All</Btn>
          <Btn variant="cyan" size="sm" onClick={() => setShowAdd((v) => !v)}>+ Add Agent</Btn>
          <Btn variant="ghost" size="sm" onClick={handleAddGroup}>New Group</Btn>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'Running', value: totals.running, color: 'var(--green)' },
          { label: 'Idle', value: totals.idle, color: 'var(--amber)' },
          { label: 'API Calls', value: totals.totalCalls.toLocaleString(), color: 'var(--cyan)' },
          { label: 'Today', value: `$${totals.totalCost.toFixed(2)}`, color: 'var(--violet)' },
          { label: 'Agents', value: totals.count, color: 'var(--pink)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {showAdd && <div style={{ marginBottom: 24 }}><AddAgentForm onDone={() => setShowAdd(false)} /></div>}

      {grouped.map(({ group, agents }) => (
        <GroupSection key={group.id} group={group} agents={agents} onPickAvatar={(id) => setAvatarTarget(id)} />
      ))}

      {avatarTarget && <AvatarPickerModal agentId={avatarTarget} onClose={() => setAvatarTarget(null)} />}
    </div>
  );
}
