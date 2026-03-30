// ============================================================
// HoloBro — Agent Hub Panel + Sub-components
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import { useAgentStore, useUIStore } from '../store';
import {
  useAgentsByGroup, useAgentTotals, useUnassignedAgents,
} from '../hooks';
import {
  AgentAvatar, StatusPill, LogMini,
  MonoLabel, Btn, TextInput, InlineEditInput,
} from '../components/ui';
import { AGENT_TEMPLATES, AVATAR_EMOJIS, AVATAR_BACKGROUNDS } from '../constants';
import { OLLAMA_OPENAI_COMPAT_ENDPOINT } from '../lib/llmProviderCatalog';
import { saveAgentApiKey, pingAgent, fetchRemoteModelList } from '../lib/agentApi';
import { MODEL_LIST_API_DOCS } from '../lib/modelCatalogSources';
import { ALERT_SOUND_OPTIONS, ALERT_ON_OPTIONS, playAlertSound, readAudioFile } from '../lib/alertSounds';
import type { Agent, AgentGroup, AlertSound } from '../types';

// ── AgentCard ────────────────────────────────────────────────
interface AgentCardProps {
  agent: Agent;
  onOpenChat: () => void;
  onOpenInspector: () => void;
  onPickAvatar: () => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent, onOpenChat, onOpenInspector, onPickAvatar,
}) => {
  const renameAgent = useAgentStore((s) => s.renameAgent);
  const updateAgent = useAgentStore((s) => s.updateAgent);
  const removeAgent = useAgentStore((s) => s.removeAgent);
  const groups = useAgentStore((s) => s.groups);
  const [showSettings, setShowSettings] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [pinging, setPinging] = useState(false);

  const handlePing = async () => {
    setPinging(true);
    const { appendLog } = useAgentStore.getState();
    try {
      const result = await pingAgent(agent);
      updateAgent(agent.id, {
        latencyMs: result.latencyMs,
        status: result.ok ? 'running' : 'error',
      });
      appendLog(agent.id, result.ok ? 'ok' : 'err',
        result.ok ? `\u2713 ping OK \u2014 ${result.latencyMs}ms` : `\u2717 ping failed: ${result.error}`);
    } catch (e) {
      appendLog(agent.id, 'err', `ping error: ${e instanceof Error ? e.message : String(e)}`);
    }
    setPinging(false);
  };

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden',
      transition: 'all var(--transition)', position: 'relative',
    }}
      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = '#2a3f5a'}
      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
    >
      {/* Top accent stripe */}
      <div style={{ height: 3, background: agent.accentGradient }} />

      {/* Card header */}
      <div style={{
        padding: '14px 16px 10px',
        display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <AgentAvatar
          agent={agent}
          size={44}
          onClick={onPickAvatar}
          showEditOverlay
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <InlineEditInput
            value={agent.name}
            onChange={(val) => renameAgent(agent.id, val)}
          />
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--muted)', marginTop: 3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {agent.endpoint} · {agent.model}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
            <StatusPill status={agent.status} />
          </div>
        </div>
        <Btn
          variant="danger"
          size="sm"
          onClick={() => updateAgent(agent.id, { status: agent.status === 'offline' ? 'idle' : 'offline' })}
          style={{ padding: '3px 8px', fontSize: 10 }}
          title={agent.status === 'offline' ? 'Activate' : 'Deactivate'}
        >{agent.status === 'offline' ? '\u25B6' : '\u25A0'}</Btn>
      </div>

      {/* Metrics */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          gap: 8, marginBottom: 12,
        }}>
          {[
            { label: 'Latency', value: `${agent.latencyMs}ms`, color: agent.status === 'idle' ? 'var(--amber)' : 'var(--green)' },
            { label: 'Calls',   value: agent.totalCalls, color: 'var(--cyan)' },
            { label: 'Uptime',  value: `${agent.uptimePct}%`, color: 'var(--amber)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              textAlign: 'center', background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 8, padding: '8px 4px',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 14,
                fontWeight: 700, color,
              }}>{value}</div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 8,
                color: 'var(--muted)', textTransform: 'uppercase',
                letterSpacing: 1, marginTop: 2,
              }}>{label}</div>
            </div>
          ))}
        </div>

        <LogMini logs={agent.logs} maxRows={3} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn
            variant="ghost"
            size="sm"
            onClick={onOpenChat}
            style={{ flex: 1, color: agent.accentColor, borderColor: `${agent.accentColor}50` }}
          >
            {'\u{1F4AC}'} Chat
          </Btn>
          <Btn variant="ghost" size="sm" onClick={handlePing} disabled={pinging}>
            {pinging ? '\u23F3' : '\u{1F4F6}'}
          </Btn>
          <Btn variant="ghost" size="sm" onClick={onOpenInspector}>{'\u{1F4CA}'}</Btn>
          <Btn variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
            {'\u2699'}
          </Btn>
        </div>

        {/* Inline settings panel */}
        {showSettings && (
          <div style={{
            marginTop: 10, padding: 12, background: 'var(--bg)',
            border: '1px solid var(--border)', borderRadius: 8,
          }}>
            {/* API Key */}
            <MonoLabel style={{ marginBottom: 6 }}>API KEY</MonoLabel>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <TextInput
                type="password"
                value={keyInput}
                onChange={(e) => { setKeyInput(e.target.value); setKeySaved(false); }}
                placeholder={agent.endpoint.includes('localhost') ? 'Not needed for local' : 'sk-...'}
                style={{ flex: 1 }}
              />
              <Btn
                variant="cyan"
                size="sm"
                onClick={() => {
                  saveAgentApiKey(agent.id, keyInput.trim());
                  updateAgent(agent.id, { status: 'idle' });
                  setKeySaved(true);
                }}
              >
                Save
              </Btn>
            </div>
            {keySaved && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--green)', marginTop: -4, marginBottom: 8 }}>
                {'\u2713'} Key saved \u2014 agent ready to chat!
              </div>
            )}

            {/* Move to group */}
            <MonoLabel style={{ marginBottom: 6 }}>MOVE TO GROUP</MonoLabel>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => updateAgent(agent.id, { groupId: g.id })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: agent.groupId === g.id ? 'rgba(6,182,212,0.08)' : 'var(--dim)',
                    border: `1px solid ${agent.groupId === g.id ? 'var(--cyan)' : 'var(--border)'}`,
                    borderRadius: 16, padding: '4px 10px',
                    cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600,
                    color: agent.groupId === g.id ? 'var(--cyan)' : 'var(--text)',
                    transition: 'all var(--transition)',
                  }}
                >
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: g.color }} />
                  {g.name}
                </button>
              ))}
            </div>

            {/* HoloBro alert settings */}
            <MonoLabel style={{ marginBottom: 6 }}>HOLOBRO ALERTS</MonoLabel>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10,
            }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Alert On</div>
                <select
                  value={agent.alertOn || 'off'}
                  onChange={(e) => updateAgent(agent.id, { alertOn: e.target.value as 'all' | 'errors' | 'off' })}
                  style={{
                    width: '100%', padding: '6px 8px', background: 'var(--dim)',
                    border: '1px solid var(--border)', borderRadius: 6,
                    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)',
                  }}
                >
                  {ALERT_ON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>Sound</div>
                <select
                  value={agent.alertSound || 'none'}
                  onChange={(e) => {
                    const v = e.target.value as AlertSound
                    if (v === 'custom') {
                      // Will show file picker on next render
                      updateAgent(agent.id, { alertSound: v })
                    } else {
                      updateAgent(agent.id, { alertSound: v, customSoundUrl: undefined })
                    }
                  }}
                  style={{
                    width: '100%', padding: '6px 8px', background: 'var(--dim)',
                    border: '1px solid var(--border)', borderRadius: 6,
                    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)',
                  }}
                >
                  {ALERT_SOUND_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {agent.alertSound === 'custom' && (
              <div style={{ marginBottom: 10 }}>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    try {
                      const url = await readAudioFile(file)
                      updateAgent(agent.id, { customSoundUrl: url })
                    } catch (err) {
                      alert(err instanceof Error ? err.message : 'Failed to load audio')
                    }
                  }}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}
                />
                {agent.customSoundUrl && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--green)', marginTop: 3 }}>
                    {'\u2713'} Custom sound loaded
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => playAlertSound(agent.alertSound || 'alarm', agent.customSoundUrl)}
                style={{ fontSize: 10 }}
              >
                {'\u{1F50A}'} Test Sound
              </Btn>
            </div>

            {/* Endpoint + Model edit */}
            <MonoLabel style={{ marginBottom: 6 }}>ENDPOINT / MODEL</MonoLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
              <TextInput
                value={agent.endpoint}
                onChange={(e) => updateAgent(agent.id, { endpoint: e.target.value })}
                placeholder="api.example.com/v1"
              />
              <TextInput
                value={agent.model}
                onChange={(e) => updateAgent(agent.id, { model: e.target.value })}
                placeholder="model-name"
              />
            </div>

            {/* Danger zone */}
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn
                variant="danger"
                size="sm"
                onClick={() => removeAgent(agent.id)}
              >
                {'\u{1F5D1}'} Remove Agent
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── GroupSection ─────────────────────────────────────────────
interface GroupSectionProps {
  group: AgentGroup;
  agents: Agent[];
  onPickAvatar: (agentId: string) => void;
}

export const GroupSection: React.FC<GroupSectionProps> = ({ group, agents, onPickAvatar }) => {
  const renameGroup = useAgentStore((s) => s.renameGroup);
  const updateAgent = useAgentStore((s) => s.updateAgent);
  const toggleGroupCollapsed = useAgentStore((s) => s.toggleGroupCollapsed);
  const openMiniChat = useUIStore((s) => s.openMiniChat);
  const setInspectorFocus = useUIStore((s) => s.setInspectorFocus);
  const unassigned = useUnassignedAgents();
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);

  const running = agents.filter((a) => a.status === 'running').length;

  const handleDeleteGroup = () => {
    const { updateAgent: ua } = useAgentStore.getState();
    // Mark agents as unassigned (set groupId to empty) instead of deleting
    agents.forEach((a) => ua(a.id, { groupId: '__unassigned__' }));
    // Remove the group itself
    useAgentStore.setState((s) => ({
      groups: s.groups.filter((g) => g.id !== group.id),
    }));
  };

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Group header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 14, paddingBottom: 10,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: group.color, flexShrink: 0,
        }} />

        <InlineEditInput
          value={group.name}
          onChange={(val) => renameGroup(group.id, val)}
          fontSize={13}
          letterSpacing={2}
          textTransform="uppercase"
        />

        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--muted)', marginLeft: 2,
        }}>
          {agents.length} agent{agents.length !== 1 ? 's' : ''}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {running > 0 && (
            <span className="pill pill-muted" style={{ fontSize: 8 }}>
              {running} running
            </span>
          )}
          <Btn
            variant="ghost"
            size="sm"
            onClick={() => setShowAdd((v) => !v)}
            style={{ fontSize: 10, padding: '3px 8px' }}
          >
            + Agent
          </Btn>
          {/* Assign unassigned agents drop-up */}
          {unassigned.length > 0 && (
            <div style={{ position: 'relative' }}>
              <Btn
                variant="ghost"
                size="sm"
                onClick={() => setShowAssignMenu((v) => !v)}
                style={{ fontSize: 10, padding: '3px 8px', color: 'var(--amber)' }}
                title={`${unassigned.length} unassigned agent(s)`}
              >
                {'\u{1F4E5}'} {unassigned.length}
              </Btn>
              {showAssignMenu && (
                <div style={{
                  position: 'absolute', bottom: '100%', right: 0,
                  marginBottom: 6, minWidth: 220,
                  background: 'var(--panel2)', border: '1px solid var(--border)',
                  borderRadius: 10, overflow: 'hidden', zIndex: 100,
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
                }}>
                  <div style={{
                    padding: '8px 12px', borderBottom: '1px solid var(--border)',
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    color: 'var(--muted)', letterSpacing: 1.5, textTransform: 'uppercase',
                  }}>
                    Assign to {group.name}
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {unassigned.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          updateAgent(a.id, { groupId: group.id });
                          // Close if no more unassigned
                          if (unassigned.length <= 1) setShowAssignMenu(false);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '8px 12px',
                          background: 'transparent', border: 'none',
                          cursor: 'pointer', fontFamily: 'var(--font-ui)',
                          fontSize: 12, color: 'var(--text)',
                          transition: 'background var(--transition)',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.08)'}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: a.avatarBg, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, flexShrink: 0,
                        }}>
                          {a.emoji}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 11 }}>{a.name}</div>
                          <div style={{
                            fontFamily: 'var(--font-mono)', fontSize: 9,
                            color: 'var(--muted)', whiteSpace: 'nowrap',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {a.endpoint || 'no endpoint'} · {a.model}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--cyan)' }}>{'\u2192'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {confirmDelete ? (
            <>
              <Btn variant="danger" size="sm" onClick={handleDeleteGroup}
                style={{ fontSize: 9, padding: '3px 6px' }}>
                Yes, delete
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}
                style={{ fontSize: 9, padding: '3px 6px' }}>
                Cancel
              </Btn>
            </>
          ) : (
            <Btn
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              style={{ fontSize: 10, padding: '3px 6px', color: 'var(--red)' }}
              title="Delete group and all its agents"
            >
              {'\u{1F5D1}'}
            </Btn>
          )}
          <button
            onClick={() => toggleGroupCollapsed(group.id)}
            style={{
              fontSize: 12, color: 'var(--muted)', cursor: 'pointer',
              background: 'none', border: 'none',
              transform: group.collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
              transition: 'transform var(--transition)',
            }}
          >{'\u25B6'}</button>
        </div>
      </div>

      {/* Agent grid */}
      {!group.collapsed && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}>
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onOpenChat={() => openMiniChat(agent.id)}
              onOpenInspector={() => setInspectorFocus(agent.id)}
              onPickAvatar={() => onPickAvatar(agent.id)}
            />
          ))}

          {/* Add placeholder */}
          <button
            onClick={() => setShowAdd(true)}
            style={{
              background: 'transparent', border: '1px dashed var(--border)',
              borderRadius: 14, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 8, cursor: 'pointer', padding: 24,
              transition: 'all var(--transition)', minHeight: 200,
              color: 'var(--muted)',
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--cyan)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
          >
            <span style={{ fontSize: 24 }}>+</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Add to group
            </span>
          </button>
        </div>
      )}

      {/* Inline add form for this group */}
      {showAdd && !group.collapsed && (
        <div style={{ marginTop: 14 }}>
          <AddAgentForm defaultGroupId={group.id} onDone={() => setShowAdd(false)} />
        </div>
      )}
    </div>
  );
};

// ── AddAgentForm ─────────────────────────────────────────────
interface AddAgentFormProps {
  defaultGroupId?: string;
  onDone: () => void;
}

const FIRST_AGENT_TEMPLATE = AGENT_TEMPLATES[0];

export const AddAgentForm: React.FC<AddAgentFormProps> = ({ defaultGroupId, onDone }) => {
  const addAgent = useAgentStore((s) => s.addAgent);
  const groups = useAgentStore((s) => s.groups);
  const [name, setName] = useState(FIRST_AGENT_TEMPLATE.label);
  const [endpoint, setEndpoint] = useState(FIRST_AGENT_TEMPLATE.endpoint);
  const [model, setModel] = useState(FIRST_AGENT_TEMPLATE.model);
  const [selectedEmoji, setSelectedEmoji] = useState(FIRST_AGENT_TEMPLATE.emoji);
  const [selectedBg, setSelectedBg] = useState(FIRST_AGENT_TEMPLATE.avatarBg);
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState(
    () => (defaultGroupId !== undefined ? defaultGroupId : (groups[0]?.id ?? '')),
  );
  const [apiKey, setApiKey] = useState('');
  const [liveModels, setLiveModels] = useState<string[] | null>(null);
  const [liveFetchErr, setLiveFetchErr] = useState<string | null>(null);
  const [liveFetchBusy, setLiveFetchBusy] = useState(false);

  const templateModels = AGENT_TEMPLATES[selectedTemplate]?.models ?? [];
  const isLocalEndpoint =
    endpoint.includes('localhost') ||
    endpoint.includes('127.0.0.1') ||
    endpoint.includes('0.0.0.0');
  const isCustomTemplate = selectedTemplate === AGENT_TEMPLATES.length - 1;
  const canFetchLiveModels =
    !isCustomTemplate &&
    Boolean(endpoint.trim()) &&
    (isLocalEndpoint || Boolean(apiKey.trim()));

  useEffect(() => {
    setLiveModels(null);
    setLiveFetchErr(null);
  }, [selectedTemplate, endpoint]);

  const modelOptions = useMemo(() => {
    const preset = templateModels;
    const extra = liveModels ?? [];
    return [...new Set([...extra, ...preset])].sort((a, b) => a.localeCompare(b));
  }, [templateModels, liveModels]);

  const selectTemplate = (idx: number) => {
    const t = AGENT_TEMPLATES[idx];
    setSelectedTemplate(idx);
    setName(t.label);
    setEndpoint(t.endpoint);
    setModel(t.models[0] ?? t.model);
    setSelectedEmoji(t.emoji);
    setSelectedBg(t.avatarBg);
  };

  const handleConnect = () => {
    const agentId = crypto.randomUUID();
    const isLocal =
      endpoint.includes('localhost') ||
      endpoint.includes('127.0.0.1') ||
      endpoint.includes('0.0.0.0');
    const newAgent: Agent = {
      id: agentId,
      name, emoji: selectedEmoji, avatarBg: selectedBg,
      endpoint, model, status: (apiKey || isLocal) ? 'idle' : 'offline',
      groupId: selectedGroup,
      latencyMs: 0,
      totalCalls: 0, uptimePct: 100, costToday: 0,
      accentColor: AGENT_TEMPLATES[selectedTemplate]?.accentColor ?? '#06b6d4',
      accentGradient: AGENT_TEMPLATES[selectedTemplate]?.accentGradient ?? 'linear-gradient(135deg, #06b6d4, #a855f7)',
      alertSound: 'alarm',
      alertOn: 'errors',
      logs: [{ ts: new Date().toLocaleTimeString('en-GB', { hour12: false }), level: 'ok', message: apiKey || isLocal ? '\u2713 agent added \u2014 ready to chat' : '\u26A0 no API key \u2014 add key to activate' }],
    };
    if (apiKey.trim()) {
      saveAgentApiKey(agentId, apiKey.trim());
    }
    addAgent(newAgent);
    onDone();
  };

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 14, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--panel2)',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: selectedBg, border: '2px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          {selectedEmoji}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginBottom: 4, letterSpacing: 1 }}>
            NEW AGENT
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name your agent..."
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
              color: 'var(--text)', letterSpacing: 1, width: '100%',
            }}
          />
        </div>
        <Btn variant="ghost" size="sm" onClick={onDone}>{'\u2715'} Cancel</Btn>
      </div>

      <div style={{ padding: 18 }}>
        {/* Templates */}
        <MonoLabel>Quick Templates</MonoLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {AGENT_TEMPLATES.map((t, i) => (
            <button
              key={t.label}
              onClick={() => selectTemplate(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: selectedTemplate === i ? 'rgba(6,182,212,0.08)' : 'var(--dim)',
                border: `1px solid ${selectedTemplate === i ? 'var(--cyan)' : 'var(--border)'}`,
                borderRadius: 20, padding: '5px 14px',
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
                fontSize: 12, fontWeight: 600,
                color: selectedTemplate === i ? 'var(--cyan)' : 'var(--text)',
                transition: 'all var(--transition)',
              }}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* Endpoint + Model */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <MonoLabel style={{ marginBottom: 6 }}>API Endpoint</MonoLabel>
            <TextInput value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="api.example.com/v1" />
          </div>
          <div>
            <MonoLabel style={{ marginBottom: 6 }}>Model</MonoLabel>
            {templateModels.length > 0 ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <select
                  value={modelOptions.includes(model) ? model : '__custom__'}
                  onChange={(e) => { if (e.target.value !== '__custom__') setModel(e.target.value) }}
                  style={{
                    flex: 1, padding: '7px 8px', background: 'var(--bg)',
                    border: '1px solid var(--border)', borderRadius: 6,
                    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)', outline: 'none',
                  }}
                >
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value="__custom__">{'\u2014'} custom{'\u2026'}</option>
                </select>
                {!modelOptions.includes(model) && (
                  <TextInput
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="model-id"
                    style={{ flex: 1 }}
                  />
                )}
              </div>
            ) : (
              <TextInput value={model} onChange={(e) => setModel(e.target.value)} placeholder="model-name" />
            )}
          </div>
        </div>

        {/* API Key */}
        <div style={{ marginBottom: 14 }}>
          <MonoLabel style={{ marginBottom: 6 }}>API Key</MonoLabel>
          <TextInput
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-... (stored locally, sent only to the endpoint above)"
          />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: endpoint.includes('localhost') ? 'var(--cyan)' : 'var(--green)', marginTop: 4 }}>
            {endpoint.includes('localhost') || endpoint.includes('127.0.0.1')
              ? `\u{1F310} Local OpenAI-compat base (use ${OLLAMA_OPENAI_COMPAT_ENDPOINT} to match the AI Assistant panel’s Ollama host). No API key needed.`
              : '\u{1F512} Key stored locally and only sent to the API endpoint'}
          </div>
          {!isCustomTemplate && (
            <div style={{ marginTop: 10 }}>
              <Btn
                variant="ghost"
                size="sm"
                disabled={!canFetchLiveModels || liveFetchBusy}
                onClick={() => {
                  void (async () => {
                    setLiveFetchBusy(true);
                    setLiveFetchErr(null);
                    const r = await fetchRemoteModelList(endpoint, apiKey);
                    setLiveFetchBusy(false);
                    if (r.ok) {
                      setLiveModels(r.models);
                      if (r.models.length && !r.models.includes(model)) {
                        setModel(r.models[0]);
                      }
                    } else {
                      setLiveFetchErr(r.error);
                    }
                  })();
                }}
                style={{ fontSize: 10 }}
              >
                {liveFetchBusy ? '\u23F3 Fetching model list…' : '\u27F3 Fetch live model IDs (List models API)'}
              </Btn>
              {liveModels && liveModels.length > 0 && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--green)', marginLeft: 8 }}>
                  {liveModels.length} from provider
                </span>
              )}
              {liveFetchErr && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--red)', marginTop: 6 }}>
                  {liveFetchErr}
                </div>
              )}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
                Vendors expose machine-updatable catalogs via authenticated HTTP (no single shared JSON).
                API refs:{' '}
                <a href={MODEL_LIST_API_DOCS.anthropic} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>Anthropic</a>
                {' · '}
                <a href={MODEL_LIST_API_DOCS.openai} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>OpenAI</a>
                {' · '}
                <a href={MODEL_LIST_API_DOCS.gemini} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>Gemini</a>
                {' · '}
                <a href={MODEL_LIST_API_DOCS.mistral} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>Mistral</a>
              </div>
            </div>
          )}
        </div>

        {/* Group selection */}
        <div style={{ marginBottom: 16 }}>
          <MonoLabel style={{ marginBottom: 6 }}>Add to Group</MonoLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelectedGroup('')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: selectedGroup === '' ? 'rgba(250,204,21,0.08)' : 'var(--dim)',
                border: `1px solid ${selectedGroup === '' ? 'var(--amber)' : 'var(--border)'}`,
                borderRadius: 20, padding: '5px 14px',
                cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600,
                color: selectedGroup === '' ? 'var(--amber)' : 'var(--text)',
                transition: 'all var(--transition)',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--muted)' }} />
              Unassigned
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroup(g.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: selectedGroup === g.id ? 'rgba(6,182,212,0.08)' : 'var(--dim)',
                  border: `1px solid ${selectedGroup === g.id ? 'var(--cyan)' : 'var(--border)'}`,
                  borderRadius: 20, padding: '5px 14px',
                  cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600,
                  color: selectedGroup === g.id ? 'var(--cyan)' : 'var(--text)',
                  transition: 'all var(--transition)',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.color }} />
                {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* Avatar picker */}
        <div style={{ marginBottom: 18 }}>
          <MonoLabel style={{ marginBottom: 8 }}>Avatar</MonoLabel>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {AVATAR_BACKGROUNDS.map((bg) => (
              <button
                key={bg}
                onClick={() => setSelectedBg(bg)}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: bg.replace('0.15', '0.5').replace('0.12', '0.5'),
                  border: selectedBg === bg ? '2px solid white' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all var(--transition)',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {AVATAR_EMOJIS.slice(0, 12).map((emoji) => (
              <button
                key={emoji}
                onClick={() => setSelectedEmoji(emoji)}
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, cursor: 'pointer',
                  border: selectedEmoji === emoji ? '2px solid var(--cyan)' : '1px solid var(--border)',
                  background: selectedEmoji === emoji ? 'rgba(6,182,212,0.08)' : 'transparent',
                  transition: 'all var(--transition)',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <Btn variant="grad" onClick={handleConnect} style={{ width: '100%', fontSize: 14, padding: 10 }}>
          {'\u26A1'} Connect Agent
        </Btn>
      </div>
    </div>
  );
};

// ── AvatarPickerModal ─────────────────────────────────────────
interface AvatarPickerModalProps {
  agentId: string;
  onClose: () => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({ agentId, onClose }) => {
  const agent = useAgentStore((s) => s.agents.find((a) => a.id === agentId));
  const setAgentAvatar = useAgentStore((s) => s.setAgentAvatar);
  const [selectedEmoji, setSelectedEmoji] = useState(agent?.emoji ?? '\u{1F916}');
  const [selectedBg, setSelectedBg] = useState(agent?.avatarBg ?? AVATAR_BACKGROUNDS[0]);

  if (!agent) return null;

  const apply = () => {
    setAgentAvatar(agentId, selectedEmoji, selectedBg);
    onClose();
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 16, width: 380, overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, var(--pink), var(--violet), var(--cyan))',
          }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>
            CHANGE AVATAR
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}>{'\u2715'}</button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: selectedBg,
              border: '2px solid var(--border)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 28,
            }}>
              {selectedEmoji}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{agent.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                Click to change emoji or background
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {AVATAR_BACKGROUNDS.map((bg) => (
              <button key={bg} onClick={() => setSelectedBg(bg)} style={{
                width: 26, height: 26, borderRadius: '50%',
                background: bg.replace('0.15','0.6').replace('0.12','0.6'),
                border: selectedBg === bg ? '2px solid white' : '2px solid transparent',
                cursor: 'pointer', transition: 'transform var(--transition)',
              }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
              />
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 6, marginBottom: 16 }}>
            {AVATAR_EMOJIS.map((emoji) => (
              <button key={emoji} onClick={() => setSelectedEmoji(emoji)} style={{
                width: 36, height: 36, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, cursor: 'pointer',
                border: selectedEmoji === emoji ? '2px solid var(--cyan)' : '1px solid transparent',
                background: selectedEmoji === emoji ? 'rgba(6,182,212,0.1)' : 'transparent',
                transition: 'all var(--transition)',
              }}
                onMouseEnter={(e) => { if (selectedEmoji !== emoji) (e.currentTarget as HTMLElement).style.background = 'var(--dim)'; }}
                onMouseLeave={(e) => { if (selectedEmoji !== emoji) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {emoji}
              </button>
            ))}
          </div>

          <Btn variant="grad" onClick={apply} style={{ width: '100%', fontSize: 13 }}>
            Apply Avatar
          </Btn>
        </div>
      </div>
    </div>
  );
};

// ── NewGroupForm (inline) ────────────────────────────────────
const NewGroupForm: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const addGroup = useAgentStore((s) => s.addGroup);
  const [name, setName] = useState('');
  const COLORS = ['#ff2d95', '#06b6d4', '#a855f7', '#facc15', '#22c55e', '#ef4444', '#f97316'];
  const [color, setColor] = useState(COLORS[Math.floor(Math.random() * COLORS.length)]);

  const handleCreate = () => {
    if (!name.trim()) return;
    addGroup({
      id: crypto.randomUUID(),
      name: name.trim(),
      color,
      collapsed: false,
    });
    onDone();
  };

  return (
    <div style={{
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16, marginBottom: 24,
    }}>
      <MonoLabel style={{ marginBottom: 8 }}>NEW GROUP</MonoLabel>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {/* Color picker */}
        <div style={{ display: 'flex', gap: 4 }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 20, height: 20, borderRadius: '50%',
                background: c,
                border: color === c ? '2px solid white' : '2px solid transparent',
                cursor: 'pointer', transition: 'transform var(--transition)',
              }}
            />
          ))}
        </div>
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name..."
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          style={{ flex: 1 }}
          autoFocus
        />
        <Btn variant="cyan" size="sm" onClick={handleCreate} disabled={!name.trim()}>
          Create
        </Btn>
        <Btn variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Btn>
      </div>
    </div>
  );
};

// ── UnassignedSection ────────────────────────────────────────
interface UnassignedSectionProps {
  agents: Agent[];
  onPickAvatar: (agentId: string) => void;
}

const UnassignedSection: React.FC<UnassignedSectionProps> = ({ agents, onPickAvatar }) => {
  const updateAgent = useAgentStore((s) => s.updateAgent);
  const groups = useAgentStore((s) => s.groups);
  const openMiniChat = useUIStore((s) => s.openMiniChat);
  const setInspectorFocus = useUIStore((s) => s.setInspectorFocus);
  const [assignMenuOpen, setAssignMenuOpen] = useState<string | null>(null);

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Section header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 14, paddingBottom: 10,
        borderBottom: '1px dashed var(--border)',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--muted)', flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
          letterSpacing: 2, textTransform: 'uppercase', color: 'var(--amber)',
        }}>
          Unassigned
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10,
          color: 'var(--muted)',
        }}>
          {agents.length} agent{agents.length !== 1 ? 's' : ''} — assign to a group
        </span>
      </div>

      {/* Agent grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 12,
      }}>
        {agents.map((agent) => (
          <div key={agent.id} style={{ position: 'relative' }}>
            <AgentCard
              agent={agent}
              onOpenChat={() => openMiniChat(agent.id)}
              onOpenInspector={() => setInspectorFocus(agent.id)}
              onPickAvatar={() => onPickAvatar(agent.id)}
            />
            {/* Quick assign button */}
            <div style={{ position: 'relative', marginTop: 6 }}>
              <button
                onClick={() => setAssignMenuOpen(assignMenuOpen === agent.id ? null : agent.id)}
                style={{
                  width: '100%', padding: '6px 10px',
                  background: 'rgba(250,204,21,0.06)', border: '1px dashed var(--amber)',
                  borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--amber)', letterSpacing: 1,
                  transition: 'all var(--transition)',
                }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(250,204,21,0.12)'}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(250,204,21,0.06)'}
              >
                {'\u{1F4E5}'} Assign to Group {assignMenuOpen === agent.id ? '\u25B2' : '\u25BC'}
              </button>
              {assignMenuOpen === agent.id && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 0, right: 0,
                  marginBottom: 4,
                  background: 'var(--panel2)', border: '1px solid var(--border)',
                  borderRadius: 10, overflow: 'hidden', zIndex: 100,
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
                }}>
                  {groups.length === 0 ? (
                    <div style={{
                      padding: '10px 12px', fontFamily: 'var(--font-mono)',
                      fontSize: 10, color: 'var(--muted)', textAlign: 'center',
                    }}>
                      No groups yet — create one first
                    </div>
                  ) : (
                    groups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          updateAgent(agent.id, { groupId: g.id });
                          setAssignMenuOpen(null);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '8px 12px',
                          background: 'transparent', border: 'none',
                          cursor: 'pointer', fontFamily: 'var(--font-ui)',
                          fontSize: 12, color: 'var(--text)',
                          transition: 'background var(--transition)',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.08)'}
                        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{g.name}</span>
                        <span style={{ fontSize: 10, color: 'var(--cyan)' }}>{'\u2192'}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── AgentHubPanel ─────────────────────────────────────────────
export const AgentHubPanel: React.FC = () => {
  const grouped = useAgentsByGroup();
  const totals = useAgentTotals();
  const agentHubIntent = useUIStore((s) => s.agentHubIntent);
  const clearAgentHubIntent = useUIStore((s) => s.clearAgentHubIntent);
  const [showAdd, setShowAdd] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [avatarTarget, setAvatarTarget] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [addFormKey, setAddFormKey] = useState(0);
  const [addIntentGroupId, setAddIntentGroupId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!agentHubIntent?.addAgent) return;
    setShowAdd(true);
    setAddIntentGroupId(agentHubIntent.groupId);
    setAddFormKey((k) => k + 1);
    clearAgentHubIntent();
  }, [agentHubIntent, clearAgentHubIntent]);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    const { updateAgent, appendLog } = useAgentStore.getState();
    const allAgents = useAgentStore.getState().agents;
    for (const agent of allAgents) {
      if (!agent.endpoint.trim() || agent.status === 'offline') continue;
      try {
        const result = await pingAgent(agent);
        updateAgent(agent.id, {
          latencyMs: result.latencyMs,
          status: result.ok ? agent.status : 'error',
        });
        appendLog(agent.id, result.ok ? 'ok' : 'err',
          result.ok ? `\u2713 ping OK \u2014 ${result.latencyMs}ms` : `\u2717 ${result.error}`);
      } catch {
        appendLog(agent.id, 'err', 'ping failed');
      }
    }
    setRefreshing(false);
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, letterSpacing: 4, color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: 4 }}>
            // AI Agents
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 900,
            background: 'linear-gradient(135deg, var(--pink), var(--violet))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            lineHeight: 1.1,
          }}>
            AGENT<br />CONTROL HUB
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={() => void handleRefreshAll()} disabled={refreshing}>
            {refreshing ? '\u23F3 Pinging...' : '\u27F3 Refresh All'}
          </Btn>
          <Btn variant="cyan" size="sm" onClick={() => setShowAdd((v) => !v)}>+ Add Agent</Btn>
          <Btn variant="ghost" size="sm" onClick={() => setShowNewGroup((v) => !v)}>
            {'\u229E'} New Group
          </Btn>
        </div>
      </div>

      {/* Global stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'Running',    value: totals.running,                     color: 'var(--green)' },
          { label: 'Idle',       value: totals.idle,                        color: 'var(--amber)' },
          { label: 'API Calls',  value: totals.totalCalls.toLocaleString(), color: 'var(--cyan)' },
          { label: 'Today',      value: `$${totals.totalCost.toFixed(2)}`,  color: 'var(--violet)' },
          { label: 'Agents',     value: totals.count,                       color: 'var(--pink)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: 'var(--panel)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '12px 14px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color }}>
              {value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* New group form */}
      {showNewGroup && (
        <NewGroupForm onDone={() => setShowNewGroup(false)} />
      )}

      {/* Global add form */}
      {showAdd && (
        <div style={{ marginBottom: 24 }}>
          <AddAgentForm
            key={addFormKey}
            defaultGroupId={addIntentGroupId}
            onDone={() => {
              setShowAdd(false);
              setAddIntentGroupId(undefined);
            }}
          />
        </div>
      )}

      {/* Group sections */}
      {grouped.map(({ group, agents }) => (
        <GroupSection
          key={group.id}
          group={group}
          agents={agents}
          onPickAvatar={(id) => setAvatarTarget(id)}
        />
      ))}

      {/* Unassigned agents section */}
      {grouped.unassigned && grouped.unassigned.length > 0 && (
        <UnassignedSection
          agents={grouped.unassigned}
          onPickAvatar={(id) => setAvatarTarget(id)}
        />
      )}

      {/* Avatar picker modal */}
      {avatarTarget && (
        <AvatarPickerModal
          agentId={avatarTarget}
          onClose={() => setAvatarTarget(null)}
        />
      )}
    </div>
  );
};
