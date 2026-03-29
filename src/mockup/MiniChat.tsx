// ============================================================
// HoloBro — MiniChat Popup
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { useAgentStore, useMockupUIStore } from './store';
import { useAgentChat } from './hooks';
import { AgentAvatar, StatusDot } from './ui';

export const MiniChatPopup: React.FC = () => {
  const { miniChatAgent, closeMiniChat } = useMockupUIStore();
  const agent = useAgentStore((s) => s.agents.find((a) => a.id === miniChatAgent));
  const { messages, send } = useAgentChat(miniChatAgent ?? '__none__');
  const [input, setInput] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  if (!miniChatAgent || !agent) return null;

  const handleSend = () => {
    if (!input.trim()) return;
    send(input.trim());
    setInput('');
  };

  return (
    <div style={{
      position: 'fixed', bottom: 106, right: 24, zIndex: 999,
      width: 320, height: 420,
      background: 'var(--panel)', border: '1px solid var(--border)',
      borderRadius: 14, display: 'flex', flexDirection: 'column',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: agent.accentGradient }} />
        <AgentAvatar agent={agent} size={28} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: agent.accentColor }}>
            {agent.name}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, display: 'flex', alignItems: 'center', gap: 4, color: 'var(--green)' }}>
            <StatusDot status={agent.status} size={5} />
            {agent.status === 'running' ? `Online \u00B7 ${agent.latencyMs}ms` : agent.status}
          </div>
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 8, padding: '2px 7px', borderRadius: 4,
          background: `${agent.accentColor}20`, color: agent.accentColor, border: `1px solid ${agent.accentColor}50`,
        }}>{agent.model}</span>
        <button onClick={closeMiniChat} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>{'\u2715'}</button>
      </div>
      <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ background: 'var(--dim)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontSize: 12, lineHeight: 1.5 }}>
            {agent.emoji} {agent.name} connected. How can I help?
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} style={{
            display: 'flex', gap: 8, maxWidth: '90%',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
          }}>
            <div>
              <div style={{
                background: msg.role === 'user' ? 'rgba(168,85,247,0.12)' : 'var(--dim)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(168,85,247,0.25)' : 'var(--border)'}`,
                borderRadius: 10, padding: '8px 12px', fontSize: 12, lineHeight: 1.5,
                color: msg.role === 'user' ? '#d8b4fe' : 'var(--text)',
              }}>{msg.content}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', marginTop: 3, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                {msg.ts}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, padding: '6px 12px' }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Ask ${agent.name}...`}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text)' }} />
        </div>
        <button onClick={handleSend} style={{
          width: 32, height: 32, borderRadius: '50%', border: 'none',
          background: agent.accentGradient, color: 'white', cursor: 'pointer', fontSize: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{'\u27A4'}</button>
      </div>
    </div>
  );
};
