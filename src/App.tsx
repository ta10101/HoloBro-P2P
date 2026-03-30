// ============================================================
// HoloBro — App.tsx (design shell + real functionality)
// ============================================================
import React, { Suspense } from 'react';
import { RootErrorBoundary } from './components/RootErrorBoundary';
import { useUIStore } from './store';
import { useHealthPing } from './hooks';
import {
  Header, Sidebar, TabBar, URLBar,
  AgentStatusBar, StatusBar,
} from './components/shell';
import { Inspector, MiniChatPopup } from './design-panels';
import { AgentHubPanel } from './app/lazyPanels';
import { WandererPanel } from './design-panels';
import { HolochainProvider, useHolochain } from './providers/HolochainProvider';
import { WelcomeSafetyModal } from './components/WelcomeSafetyModal';
import { TerminalMiniDock } from './terminal/TerminalMiniDock';
import { DependencyCornerDock } from './network/DependencyCornerDock';
import { HoloBroWanderer } from './components/HoloBroWanderer';
import type { PanelId } from './types';
import './App.css';

// ── Lazy-loaded self-contained panels ───────────────────────
const AssistantPanel = React.lazy(() =>
  import('./assistant/AssistantPanel').then((m) => ({ default: m.AssistantPanel })),
);
const NetworkToolsPanel = React.lazy(() =>
  import('./network/NetworkToolsPanel').then((m) => ({ default: m.NetworkToolsPanel })),
);
const WeatherPanel = React.lazy(() =>
  import('./weather/WeatherPanel').then((m) => ({ default: m.WeatherPanel })),
);

// ── Lazy-loaded panels that need props ──────────────────────
const BrowserPanelReal = React.lazy(() =>
  import('./browser/BrowserPanel').then((m) => ({ default: m.BrowserPanel })),
);

// Direct imports for panels that need props (not too large)
import { BookmarksPanel } from './panels/BookmarksPanel';
import { HistoryPanel } from './panels/HistoryPanel';
import { ContactsPanel } from './panels/ContactsPanel';
import { ChatPanel } from './panels/ChatPanel';
import { PrivacyPanel } from './panels/PrivacyPanel';
import { VideoPanel } from './panels/VideoPanel';
const P2PLibraryPanel = React.lazy(() =>
  import('./p2p/P2PLibraryPanel').then((m) => ({ default: m.P2PLibraryPanel })),
);

// ── Loading fallback ────────────────────────────────────────
const PanelLoader: React.FC<{ label?: string }> = ({ label }) => (
  <section style={{
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)',
    letterSpacing: 1,
  }}>
    Loading {label || 'panel'}\u2026
  </section>
);

// ── Panel wrappers (connect real data from HolochainProvider) ──

const BrowserPanelWrapper: React.FC = () => {
  const ctx = useHolochain();
  return (
    <Suspense fallback={<PanelLoader label="Browser" />}>
      <BrowserPanelReal
        url={ctx.url}
        setUrl={ctx.setUrl}
        settings={ctx.browserSettings}
        onSettingsChange={ctx.setBrowserSettings}
        onBookmark={ctx.addBookmark}
        onFetchBridge={ctx.fetchReader}
        onEmbeddedLoad={ctx.bumpCookieJar}
        onNavigate={ctx.recordNavigation}
        onShareLink={(u, t) => void ctx.shareLink(u, t, '', '')}
        fetchResult={ctx.fetchResult}
        fetchErr={ctx.fetchErr}
        fetchBusy={ctx.fetchBusy}
        active={ctx.activePanel === 'browser'}
        _hcClient={ctx.hc}
      />
    </Suspense>
  );
};

const BookmarksPanelWrapper: React.FC = () => {
  const ctx = useHolochain();
  return (
    <BookmarksPanel
      hc={Boolean(ctx.hc)}
      bookmarks={ctx.bookmarks}
      demoBookmarks={ctx.demoBookmarks}
      bookmarkHolochainSync={ctx.bookmarkHolochainSync}
      setBookmarkHolochainSync={ctx.setBookmarkHolochainSync}
      setUrl={ctx.setUrl}
      setTab={(t) => {
        // Map old Tab type to new PanelId
        const map: Record<string, PanelId> = { 'p2p-library': 'library' };
        ctx.navigateToPanel((map[t] || t) as PanelId);
      }}
      removeBookmark={ctx.removeBookmark}
    />
  );
};

const HistoryPanelWrapper: React.FC = () => {
  const ctx = useHolochain();
  return (
    <HistoryPanel
      hc={Boolean(ctx.hc)}
      demoHistory={ctx.demoHistory}
      setUrl={ctx.setUrl}
      setTab={(t) => {
        const map: Record<string, PanelId> = { 'p2p-library': 'library' };
        ctx.navigateToPanel((map[t] || t) as PanelId);
      }}
      removeHistory={ctx.removeHistory}
      clearHistory={ctx.clearAllHistory}
    />
  );
};

const ContactsPanelWrapper: React.FC = () => {
  const ctx = useHolochain();
  return (
    <ContactsPanel
      hc={Boolean(ctx.hc)}
      contactHolochainSync={ctx.contactHolochainSync}
      setContactHolochainSync={ctx.setContactHolochainSync}
      contactList={ctx.contactList}
      onAddContact={ctx.addContact}
    />
  );
};

const ChatPanelWrapper: React.FC = () => {
  const ctx = useHolochain();
  return (
    <ChatPanel
      hc={Boolean(ctx.hc)}
      threadId={ctx.threadId}
      setThreadId={ctx.setThreadId}
      chatMessages={ctx.chatMessages}
      demoChat={ctx.demoChat}
      chatInput={ctx.chatInput}
      setChatInput={ctx.setChatInput}
      refreshThread={ctx.refreshThread}
      sendChat={ctx.sendChat}
    />
  );
};

const VideoPanelWrapper: React.FC = () => {
  const ctx = useHolochain();
  return (
    <VideoPanel
      videoPeerB64={ctx.videoPeerB64}
      setVideoPeerB64={ctx.setVideoPeerB64}
      localVid={ctx.localVid}
      remoteVid={ctx.remoteVid}
      videoLog={ctx.videoLog}
      startVideo={ctx.startVideo}
      applyRemoteSignals={ctx.applyRemoteSignals}
      stopVideo={ctx.stopVideo}
      signalPollActive={ctx.signalPollActive}
    />
  );
};

const P2PLibraryPanelWrapper: React.FC = () => {
  const ctx = useHolochain();
  return (
    <Suspense fallback={<PanelLoader label="P2P Library" />}>
      <P2PLibraryPanel
        hc={ctx.hc}
        sharedLinks={ctx.sharedLinks}
        sharedPages={ctx.sharedPages}
        demoSharedLinks={ctx.demoSharedLinks}
        sharedLinkHolochainSync={ctx.sharedLinkHolochainSync}
        setSharedLinkHolochainSync={ctx.setSharedLinkHolochainSync}
        onShareLink={ctx.shareLink}
        setUrl={ctx.setUrl}
        setTab={(t) => {
          const map: Record<string, PanelId> = { 'p2p-library': 'library' };
          ctx.navigateToPanel((map[t] || t) as PanelId);
        }}
      />
    </Suspense>
  );
};

// ── Panel router ─────────────────────────────────────────────
const PANELS: Record<PanelId, React.ReactNode> = {
  browser:   <BrowserPanelWrapper />,
  bookmarks: <BookmarksPanelWrapper />,
  history:   <HistoryPanelWrapper />,
  privacy:   <PrivacyPanel />,
  library:   <P2PLibraryPanelWrapper />,
  contacts:  <ContactsPanelWrapper />,
  chat:      <ChatPanelWrapper />,
  video:     <VideoPanelWrapper />,
  weather:   <Suspense fallback={<PanelLoader label="Weather" />}><WeatherPanel /></Suspense>,
  assistant: <Suspense fallback={<PanelLoader label="Assistant" />}><AssistantPanel /></Suspense>,
  network:   <Suspense fallback={<PanelLoader label="Network Tools" />}><NetworkToolsPanel /></Suspense>,
  agents: (
    <Suspense fallback={<PanelLoader label="Agent Hub" />}>
      <AgentHubPanel />
    </Suspense>
  ),
  wanderer:  <WandererPanel />,
};

// ── App ───────────────────────────────────────────────────────
const AppContent: React.FC = () => {
  const activePanel = useUIStore((s) => s.activePanel);
  const inspectorOpen = useUIStore((s) => s.inspectorOpen);
  const toggleInspector = useUIStore((s) => s.toggleInspector);
  const miniChatAgent = useUIStore((s) => s.miniChatAgent);

  // Start health ping polling (for agent status bar)
  useHealthPing(30_000);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header />
      <WelcomeSafetyModal />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TabBar />
          <URLBar onToggleInspector={toggleInspector} />

          {/* Content area: panel + inspector side by side */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Active panel */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg)', position: 'relative' }}>
              {PANELS[activePanel]}
            </div>

            {/* Right inspector */}
            {inspectorOpen && <Inspector />}
          </div>

          <AgentStatusBar />
          <StatusBar />
        </div>
      </div>

      {/* Floating utilities */}
      <TerminalMiniDock />
      <DependencyCornerDock />

      {/* The companion dude */}
      <HoloBroWanderer />

      {/* Floating mini chat */}
      {miniChatAgent && <MiniChatPopup />}
    </div>
  );
};

export default function App() {
  return (
    <RootErrorBoundary>
      <HolochainProvider>
        <AppContent />
      </HolochainProvider>
    </RootErrorBoundary>
  );
}
