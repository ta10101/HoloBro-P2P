// ============================================================
// HoloBro — Inspector Side Panel
// ============================================================
import React from 'react';
import { useAgentStore, useMockupUIStore } from './store';
import { StatusDot, ProgressBar } from './ui';

const InspBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
      {title}
    </div>
    {children}
  </div>
);

const KV: React.FC<{ k: string; v: string | number; vc?: string }> = ({ k, v, vc = 'var(--cyan)' }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>{k}</span>
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: vc, fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: 130 }}>{v}</span>
  </div>
);

export const Inspector: React.FC = () => {
  const { inspectorOpen, inspectorFocusAgent, toggleInspector, setInspectorFocus } = useMockupUIStore();
  const agents = useAgentStore((s) => s.agents);
  const networkStats = useMockupUIStore((s) => s.networkStats);
  const focusAgent = agents.find((a) => a.id === inspectorFocusAgent);
  const totalCost = agents.reduce((acc, a) => acc + a.costToday, 0);

  return (
    <div style={{
      width: inspectorOpen ? 240 : 0,
      background: 'var(--panel)', borderLeft: inspectorOpen ? '1px solid var(--border)' : 'none',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      overflow: 'hidden', transition: 'width 0.2s ease',
    }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 2, color: 'var(--cyan)', textTransform: 'uppercase' }}>// Inspector</span>
        <button onClick={toggleInspector} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>{'\u2715'}</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <InspBlock title="Network">
          <KV k="Protocol" v="HOLO" vc="var(--violet)" />
          <KV k="Status" v="LIVE" vc="var(--green)" />
          <KV k="Latency" v={`${networkStats.avgLatencyMs}ms`} />
          <KV k="Peers" v={networkStats.peerCount} />
        </InspBlock>
        <InspBlock title="Agents">
          {agents.map((a) => (
            <div key={a.id} onClick={() => setInspectorFocus(a.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
              borderBottom: '1px solid var(--border)', cursor: 'pointer',
            }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: a.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>{a.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)' }}>{a.status === 'idle' ? 'idle' : `${a.latencyMs}ms`}</div>
              </div>
              <StatusDot status={a.status} size={7} />
            </div>
          ))}
        </InspBlock>
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
        <InspBlock title="Bandwidth">
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>Up</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--pink)', fontWeight: 700 }}>{networkStats.uploadMBps} MB/s</span>
            </div>
            <ProgressBar value={42} color="linear-gradient(90deg, var(--pink), var(--violet))" />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>Down</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cyan)', fontWeight: 700 }}>{networkStats.downloadMBps} MB/s</span>
            </div>
            <ProgressBar value={68} />
          </div>
        </InspBlock>
        <InspBlock title="Today's Cost">
          {agents.map((a) => (
            <KV key={a.id} k={a.name} v={`$${a.costToday.toFixed(2)}`} vc={a.accentColor} />
          ))}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>Total</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>${totalCost.toFixed(2)}</span>
          </div>
        </InspBlock>
      </div>
    </div>
  );
};
