// ============================================================
// HoloBro — Holochain Provider (real state & CRUD operations)
// ============================================================
// Extracts ALL real functionality from AppShell.tsx into a context
// so the new design shell can access it without prop-drilling.
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { encodeHashToBase64, type ActionHash, type AppWebsocket } from '@holochain/client';
import { hasEffectiveHoloConfig, tryConnectHolo } from '../holochainConnect';
import {
  effectiveContentProxyUrl,
  isContentProxyActive,
  loadBrowserSettings,
  type BrowserSettings,
  type FetchBridgeResult,
} from '../browser/browserSettings';
import {
  hcCreateBookmark,
  hcCreateContact,
  hcCreateSharedLink,
  hcDeleteBookmark,
  hcListBookmarks,
  hcListContacts,
  hcListSharedLinks,
  hcListSharedPages,
  hcListSignals,
  hcListThread,
  hcPostSignal,
  hcSendChat,
  type BookmarkRow,
  type ChatMessageRow,
  type ContactRow,
  type SharedLinkRow,
  type SharedPageRow,
} from '../holochain';
import { attachLocalVideo, createPeerConnection, wireRemoteStream } from '../webrtc';
import {
  loadJson,
  loadJsonPrefer,
  saveJson,
  LS_BOOKMARKS,
  LS_BOOKMARKS_LEGACY,
  LS_CHAT,
  LS_CHAT_LEGACY,
  LS_CONTACTS,
  LS_CONTACTS_LEGACY,
  LS_COOKIE_JAR,
  LS_HISTORY,
  LS_PENDING_OPS,
  LS_BOOKMARK_HOLOCHAIN_SYNC,
  LS_CONTACT_HOLOCHAIN_SYNC,
  LS_SHARED_LINK_HOLOCHAIN_SYNC,
  LS_SHARED_LINKS,
  LS_STARTUP_GREETING,
  LS_WANDERER_ENABLED,
  LS_WANDERER_SOUND_PACK,
} from '../lib/localStorageJson';
import { normalizeUrl } from '../lib/normalizeUrl';
import {
  mergeThreadIntoDemoChat,
  mirrorBookmarks,
  mirrorContacts,
  mirrorSharedLinks,
} from '../lib/holoMirror';
import { pickWelcomeLine, type AppIdentityResult } from '../lib/startupGreeting';
import type { ContactDisplay, PendingOp } from '../app/types';
import { useUIStore } from '../store';
import type { PanelId } from '../types';

// ── Invoke helper (safe for browser dev mode) ────────────────
import { safeInvoke } from '../lib/tauri';

// ── Context type ─────────────────────────────────────────────
export interface HolochainContextValue {
  // Holochain connection
  hc: AppWebsocket | null;
  hcStatus: string;
  hcConnecting: boolean;
  hasHoloConfig: boolean;
  /** Set when the last `tryConnectHolo` failed; cleared on success. Safe to show in UI (no secrets). */
  hcLastError: string | null;
  reconnect: () => void;

  // Active panel (using design PanelId)
  activePanel: PanelId;

  // Browser
  url: string;
  setUrl: (u: string) => void;
  browserSettings: BrowserSettings;
  setBrowserSettings: (s: BrowserSettings) => void;
  fetchResult: FetchBridgeResult | null;
  fetchErr: string | null;
  fetchBusy: boolean;
  fetchReader: () => void;
  addBookmark: () => void;
  recordNavigation: (url: string) => void;
  shareLink: (url: string, title: string, description: string, tags: string) => Promise<void>;

  // Bookmarks (Holochain sync is opt-in — see docs/HOLOBRO_DATA_CLASSES.md)
  bookmarks: BookmarkRow[];
  demoBookmarks: { url: string; title: string }[];
  bookmarkHolochainSync: boolean;
  setBookmarkHolochainSync: (enabled: boolean) => void;
  removeBookmark: (hash: ActionHash | undefined, urlStr: string) => void;

  // History (v1: device-only per docs/HOLOBRO_DATA_CLASSES.md — never synced to Holochain)
  demoHistory: { url: string; title: string; visited_at_ms: number }[];
  removeHistory: (hash: ActionHash | undefined, url: string, visitedAt: number) => void;
  clearAllHistory: () => void;

  // Contacts (Holochain sync opt-in — same pattern as bookmarks)
  contactList: ContactDisplay[];
  contactHolochainSync: boolean;
  setContactHolochainSync: (enabled: boolean) => void;
  addContact: (name: string, peerKey: string, proof: string) => void;

  // Chat
  threadId: string;
  setThreadId: (t: string) => void;
  chatMessages: ChatMessageRow[];
  demoChat: { thread: string; body: string; at: number }[];
  chatInput: string;
  setChatInput: (s: string) => void;
  refreshThread: () => void;
  sendChat: () => void;

  // Video
  videoPeerB64: string;
  setVideoPeerB64: (s: string) => void;
  localVid: React.RefObject<HTMLVideoElement | null>;
  remoteVid: React.RefObject<HTMLVideoElement | null>;
  videoLog: string[];
  startVideo: () => void;
  applyRemoteSignals: () => void;
  stopVideo: () => void;
  signalPollActive: boolean;

  // P2P Library (shared link publish opt-in; cached pages still load when connected)
  sharedLinks: SharedLinkRow[];
  sharedPages: SharedPageRow[];
  demoSharedLinks: { url: string; title: string; description: string; tags: string; shared_at_ms: number }[];
  sharedLinkHolochainSync: boolean;
  setSharedLinkHolochainSync: (enabled: boolean) => void;

  // Cookie Jar
  cookieJarCount: number;
  bumpCookieJar: () => void;
  resetCookieJar: () => void;

  // Wanderer
  wandererEnabled: boolean;
  setWandererEnabled: (v: boolean) => void;
  wandererSoundPack: 'calm' | 'chaos' | 'street';
  setWandererSoundPack: (v: 'calm' | 'chaos' | 'street') => void;

  // Settings
  startupGreetingEnabled: boolean;
  setStartupGreetingEnabled: (v: boolean) => void;

  // Pending ops
  pendingOps: PendingOp[];

  // Navigation helper for panels that call setTab
  navigateToPanel: (panel: PanelId) => void;
}

const HolochainContext = createContext<HolochainContextValue | null>(null);

export function useHolochain(): HolochainContextValue {
  const ctx = useContext(HolochainContext);
  if (!ctx) throw new Error('useHolochain must be used within HolochainProvider');
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────
export const HolochainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hasHoloConfig = hasEffectiveHoloConfig();

  // ─── Holochain connection ───────────────────────────────────
  const [hc, setHc] = useState<AppWebsocket | null>(null);
  const [hcStatus, setHcStatus] = useState<string>('Disconnected (demo storage)');
  const [hcLastError, setHcLastError] = useState<string | null>(null);
  const hcConnectingRef = useRef(false);
  const [hcConnecting, setHcConnecting] = useState(false);
  const lastConnectTryRef = useRef(0);
  const replayInFlightRef = useRef(false);

  // ─── Browser state ──────────────────────────────────────────
  const [url, setUrl] = useState('https://example.com');
  const [browserSettings, setBrowserSettings] = useState<BrowserSettings>(() => loadBrowserSettings());
  const [fetchResult, setFetchResult] = useState<FetchBridgeResult | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [fetchBusy, setFetchBusy] = useState(false);

  // ─── Bookmarks ──────────────────────────────────────────────
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [demoBookmarks, setDemoBookmarks] = useState<{ url: string; title: string }[]>(() =>
    loadJsonPrefer(LS_BOOKMARKS, LS_BOOKMARKS_LEGACY, []),
  );
  const [bookmarkHolochainSync, setBookmarkHolochainSyncState] = useState(
    () => localStorage.getItem(LS_BOOKMARK_HOLOCHAIN_SYNC) === '1',
  );
  const demoBookmarksRef = useRef(demoBookmarks);
  demoBookmarksRef.current = demoBookmarks;
  const bookmarkMergedForHcRef = useRef<AppWebsocket | null>(null);

  // ─── Contacts ──────────────────────────────────────────────
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [demoContacts, setDemoContacts] = useState<{ name: string; peerKey: string; proof: string }[]>(() =>
    loadJsonPrefer(LS_CONTACTS, LS_CONTACTS_LEGACY, []),
  );
  const [contactHolochainSync, setContactHolochainSyncState] = useState(
    () => localStorage.getItem(LS_CONTACT_HOLOCHAIN_SYNC) === '1',
  );
  const demoContactsRef = useRef(demoContacts);
  demoContactsRef.current = demoContacts;
  const contactMergedForHcRef = useRef<AppWebsocket | null>(null);

  // ─── Chat ──────────────────────────────────────────────────
  const [threadId, setThreadId] = useState('general');
  const [chatMessages, setChatMessages] = useState<ChatMessageRow[]>([]);
  const [demoChat, setDemoChat] = useState<{ thread: string; body: string; at: number }[]>(() =>
    loadJsonPrefer(LS_CHAT, LS_CHAT_LEGACY, []),
  );
  const [chatInput, setChatInput] = useState('');

  // ─── History ────────────────────────────────────────────────
  const [demoHistory, setDemoHistory] = useState<{ url: string; title: string; visited_at_ms: number }[]>(() =>
    loadJson(LS_HISTORY, []),
  );

  // ─── P2P Library ────────────────────────────────────────────
  const [sharedLinks, setSharedLinks] = useState<SharedLinkRow[]>([]);
  const [demoSharedLinks, setDemoSharedLinks] = useState<{
    url: string; title: string; description: string; tags: string; shared_at_ms: number;
  }[]>(() => loadJson(LS_SHARED_LINKS, []));
  const [sharedLinkHolochainSync, setSharedLinkHolochainSyncState] = useState(
    () => localStorage.getItem(LS_SHARED_LINK_HOLOCHAIN_SYNC) === '1',
  );
  const demoSharedLinksRef = useRef(demoSharedLinks);
  demoSharedLinksRef.current = demoSharedLinks;
  const sharedLinkMergedForHcRef = useRef<AppWebsocket | null>(null);
  const [sharedPages, setSharedPages] = useState<SharedPageRow[]>([]);

  // ─── Video ──────────────────────────────────────────────────
  const localVid = useRef<HTMLVideoElement>(null);
  const remoteVid = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [videoPeerB64, setVideoPeerB64] = useState('');
  const [videoLog, setVideoLog] = useState<string[]>([]);

  // ─── Wanderer / Settings / Cookie ───────────────────────────
  const [startupGreetingEnabled, setStartupGreetingEnabled] = useState(() => {
    const raw = localStorage.getItem(LS_STARTUP_GREETING);
    return raw == null ? true : raw === '1';
  });
  const [wandererEnabled, setWandererEnabled] = useState(() => {
    const raw = localStorage.getItem(LS_WANDERER_ENABLED);
    return raw == null ? true : raw === '1';
  });
  const [wandererSoundPack, setWandererSoundPack] = useState<'calm' | 'chaos' | 'street'>(() => {
    const raw = localStorage.getItem(LS_WANDERER_SOUND_PACK);
    return raw === 'calm' || raw === 'chaos' || raw === 'street' ? raw : 'street';
  });
  const [cookieJarCount, setCookieJarCount] = useState<number>(() => {
    const raw = localStorage.getItem(LS_COOKIE_JAR);
    const n = Number(raw ?? '0');
    return Number.isFinite(n) && n > 0 ? Math.min(999, Math.floor(n)) : 0;
  });
  const [pendingOps, setPendingOps] = useState<PendingOp[]>(() => {
    const raw = loadJson<PendingOp[]>(LS_PENDING_OPS, []);
    const bookmarkSyncOn = localStorage.getItem(LS_BOOKMARK_HOLOCHAIN_SYNC) === '1';
    const contactSyncOn = localStorage.getItem(LS_CONTACT_HOLOCHAIN_SYNC) === '1';
    const sharedLinkSyncOn = localStorage.getItem(LS_SHARED_LINK_HOLOCHAIN_SYNC) === '1';
    return raw.filter((o) => {
      if (o.kind === 'history') return false;
      if (o.kind === 'bookmark' && !bookmarkSyncOn) return false;
      if (o.kind === 'contact' && !contactSyncOn) return false;
      if (o.kind === 'shared_link' && !sharedLinkSyncOn) return false;
      return true;
    });
  });

  const bumpCookieJar = useCallback(() => {
    setCookieJarCount((c) => Math.min(999, c + 1));
  }, []);
  const resetCookieJar = useCallback(() => setCookieJarCount(0), []);

  // ─── Active panel from UI store ─────────────────────────────
  const activePanel = useUIStore((s) => s.activePanel);
  const navigateToPanel = useUIStore((s) => s.setPanel);

  // ─── Holochain connection logic ─────────────────────────────
  const connectHolo = useCallback(async () => {
    if (hc || hcConnectingRef.current) return;
    const now = Date.now();
    if (now - lastConnectTryRef.current < 2500) return;
    lastConnectTryRef.current = now;
    hcConnectingRef.current = true;
    setHcConnecting(true);
    setHcStatus((s) => (s.startsWith('Connected') ? s : 'Connecting to Holochain\u2026'));
    try {
      const r = await tryConnectHolo();
      if (r.ok) {
        setHc(r.client);
        setHcLastError(null);
        setHcStatus(
          r.signingNote
            ? `Connected (with warning: ${r.signingNote})`
            : 'Connected to Holochain',
        );
        try {
          if (contactHolochainSync) {
            const c = await hcListContacts(r.client);
            setContacts(c);
          }
          const sp = await hcListSharedPages(r.client);
          setSharedPages(sp);
          if (sharedLinkHolochainSync) {
            const sl = await hcListSharedLinks(r.client);
            setSharedLinks(sl);
          }
        } catch (e) {
          console.error(e);
          setHcStatus((s) => `${s} \u2014 zome read failed (see console).`);
        }
      } else {
        setHcLastError(r.reason);
        setHcStatus(
          hasEffectiveHoloConfig()
            ? `Demo fallback (retrying): ${r.reason}`
            : `Demo mode: ${r.reason}`,
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setHcLastError(msg);
      setHcStatus(hasEffectiveHoloConfig() ? `Demo fallback (retrying): ${msg}` : `Demo mode: ${msg}`);
    } finally {
      hcConnectingRef.current = false;
      setHcConnecting(false);
    }
  }, [hc, contactHolochainSync, sharedLinkHolochainSync]);

  // Auto-connect on panel change if needed
  useEffect(() => {
    const needsHolo = ['bookmarks', 'contacts', 'chat', 'video', 'history', 'library'].includes(activePanel);
    if (needsHolo) void connectHolo();
  }, [activePanel, connectHolo]);

  // Initial connect after delay
  useEffect(() => {
    const t = window.setTimeout(() => void connectHolo(), 2500);
    return () => window.clearTimeout(t);
  }, [connectHolo]);

  // Retry interval (read config fresh — e.g. after welcome flow saves localStorage)
  useEffect(() => {
    const t = window.setInterval(() => {
      if (!hasEffectiveHoloConfig() || hc) return;
      void connectHolo();
    }, 15000);
    return () => window.clearInterval(t);
  }, [hc, connectHolo]);

  // When Holochain sync is on, merge local-only URLs onto the chain once per connection, then refresh list.
  useEffect(() => {
    if (!bookmarkHolochainSync) {
      bookmarkMergedForHcRef.current = null;
      return;
    }
    if (!hc) return;
    if (bookmarkMergedForHcRef.current === hc) return;
    let cancelled = false;
    void (async () => {
      try {
        const chain = await hcListBookmarks(hc);
        if (cancelled) return;
        const chainUrls = new Set(chain.map((b) => b.url));
        const localOnly = demoBookmarksRef.current.filter((b) => !chainUrls.has(b.url));
        for (const b of localOnly) {
          if (cancelled) return;
          await hcCreateBookmark(hc, {
            url: b.url,
            title: b.title,
            created_at_ms: Date.now(),
          });
        }
        if (!cancelled) {
          setBookmarks(await hcListBookmarks(hc));
          bookmarkMergedForHcRef.current = hc;
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hc, bookmarkHolochainSync]);

  useEffect(() => {
    if (!contactHolochainSync) {
      contactMergedForHcRef.current = null;
      return;
    }
    if (!hc) return;
    if (contactMergedForHcRef.current === hc) return;
    let cancelled = false;
    void (async () => {
      try {
        const chain = await hcListContacts(hc);
        if (cancelled) return;
        const keys = new Set(chain.map((c) => c.peer_agent_pubkey_b64));
        const localOnly = demoContactsRef.current.filter((c) => c.peerKey.trim() && !keys.has(c.peerKey.trim()));
        for (const c of localOnly) {
          if (cancelled) return;
          await hcCreateContact(hc, {
            display_name: c.name,
            peer_agent_pubkey_b64: c.peerKey.trim(),
            invite_proof_b64: c.proof || '',
            created_at_ms: Date.now(),
          });
        }
        if (!cancelled) {
          setContacts(await hcListContacts(hc));
          contactMergedForHcRef.current = hc;
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hc, contactHolochainSync]);

  useEffect(() => {
    if (!sharedLinkHolochainSync) {
      sharedLinkMergedForHcRef.current = null;
      return;
    }
    if (!hc) return;
    if (sharedLinkMergedForHcRef.current === hc) return;
    let cancelled = false;
    void (async () => {
      try {
        const chain = await hcListSharedLinks(hc);
        if (cancelled) return;
        const urls = new Set(chain.map((l) => l.url));
        const localOnly = demoSharedLinksRef.current.filter((l) => !urls.has(l.url));
        for (const l of localOnly) {
          if (cancelled) return;
          await hcCreateSharedLink(hc, {
            url: l.url,
            title: l.title,
            description: l.description,
            tags: l.tags,
            shared_at_ms: Date.now(),
          });
        }
        if (!cancelled) {
          setSharedLinks(await hcListSharedLinks(hc));
          sharedLinkMergedForHcRef.current = hc;
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hc, sharedLinkHolochainSync]);

  // ─── Mirror effects ─────────────────────────────────────────
  useEffect(() => {
    if (!hc || !bookmarkHolochainSync || pendingOps.length > 0) return;
    const d = mirrorBookmarks(bookmarks);
    setDemoBookmarks(d);
    saveJson(LS_BOOKMARKS, d);
  }, [hc, bookmarkHolochainSync, bookmarks, pendingOps.length]);

  useEffect(() => {
    if (!hc || !contactHolochainSync || pendingOps.length > 0) return;
    const d = mirrorContacts(contacts);
    setDemoContacts(d);
    saveJson(LS_CONTACTS, d);
  }, [hc, contactHolochainSync, contacts, pendingOps.length]);

  useEffect(() => {
    if (!hc || pendingOps.length > 0) return;
    setDemoChat((prev) => {
      const next = mergeThreadIntoDemoChat(prev, threadId, chatMessages);
      saveJson(LS_CHAT, next);
      return next;
    });
  }, [hc, chatMessages, threadId, pendingOps.length]);

  useEffect(() => {
    if (!hc || !sharedLinkHolochainSync || pendingOps.length > 0) return;
    const d = mirrorSharedLinks(sharedLinks);
    setDemoSharedLinks(d);
    saveJson(LS_SHARED_LINKS, d);
  }, [hc, sharedLinkHolochainSync, sharedLinks, pendingOps.length]);

  // ─── Pending ops replay ─────────────────────────────────────
  useEffect(() => {
    if (!hc || pendingOps.length === 0 || replayInFlightRef.current) return;
    replayInFlightRef.current = true;
    void (async () => {
      let remaining = [...pendingOps];
      let applied = 0;
      for (let i = 0; i < remaining.length; i += 1) {
        const op = remaining[i];
        try {
          if (op.kind === 'history') {
            applied += 1;
            continue;
          }
          if (op.kind === 'bookmark' && !bookmarkHolochainSync) {
            applied += 1;
            continue;
          }
          if (op.kind === 'contact' && !contactHolochainSync) {
            applied += 1;
            continue;
          }
          if (op.kind === 'shared_link' && !sharedLinkHolochainSync) {
            applied += 1;
            continue;
          }
          if (op.kind === 'bookmark') await hcCreateBookmark(hc, op.payload);
          else if (op.kind === 'contact') await hcCreateContact(hc, op.payload);
          else if (op.kind === 'chat') await hcSendChat(hc, op.payload);
          else if (op.kind === 'shared_link') await hcCreateSharedLink(hc, op.payload);
          applied += 1;
        } catch {
          remaining = remaining.slice(i);
          setPendingOps(remaining);
          setHcStatus(`Connected (sync paused: ${remaining.length} queued op${remaining.length === 1 ? '' : 's'})`);
          replayInFlightRef.current = false;
          return;
        }
      }
      if (applied > 0) {
        setPendingOps([]);
        try {
          if (bookmarkHolochainSync) setBookmarks(await hcListBookmarks(hc));
          if (contactHolochainSync) setContacts(await hcListContacts(hc));
          setChatMessages(await hcListThread(hc, threadId));
          if (sharedLinkHolochainSync) setSharedLinks(await hcListSharedLinks(hc));
          setSharedPages(await hcListSharedPages(hc));
        } catch { /* best-effort */ }
        setHcStatus(`Connected to Holochain (synced ${applied} queued op${applied === 1 ? '' : 's'})`);
      }
      replayInFlightRef.current = false;
    })();
  }, [hc, pendingOps, threadId, bookmarkHolochainSync, contactHolochainSync, sharedLinkHolochainSync]);

  // ─── localStorage persistence ───────────────────────────────
  useEffect(() => { saveJson(LS_BOOKMARKS, demoBookmarks); }, [demoBookmarks]);
  useEffect(() => { saveJson(LS_CONTACTS, demoContacts); }, [demoContacts]);
  useEffect(() => { saveJson(LS_CHAT, demoChat); }, [demoChat]);
  useEffect(() => { saveJson(LS_HISTORY, demoHistory); }, [demoHistory]);
  useEffect(() => { saveJson(LS_SHARED_LINKS, demoSharedLinks); }, [demoSharedLinks]);
  useEffect(() => { localStorage.setItem(LS_STARTUP_GREETING, startupGreetingEnabled ? '1' : '0'); }, [startupGreetingEnabled]);
  useEffect(() => { localStorage.setItem(LS_WANDERER_ENABLED, wandererEnabled ? '1' : '0'); }, [wandererEnabled]);
  useEffect(() => { localStorage.setItem(LS_WANDERER_SOUND_PACK, wandererSoundPack); }, [wandererSoundPack]);
  useEffect(() => { localStorage.setItem(LS_COOKIE_JAR, String(cookieJarCount)); }, [cookieJarCount]);
  useEffect(() => { saveJson(LS_PENDING_OPS, pendingOps); }, [pendingOps]);

  // ─── WebView2 show/hide ─────────────────────────────────────
  useEffect(() => {
    if (activePanel === 'browser') {
      void safeInvoke('content_webview_show');
    } else {
      void safeInvoke('content_webview_hide');
    }
  }, [activePanel]);

  // ─── Startup greeting ───────────────────────────────────────
  useEffect(() => {
    if (!startupGreetingEnabled) return;
    let done = false;
    const run = async () => {
      try {
        const id = await safeInvoke<AppIdentityResult>('app_identity');
        if (done) return;
        if (id) {
          const line = `${pickWelcomeLine(id.displayName)}`;
          console.info('[startup-greeting]', line);
        }
      } catch {
        if (done) return;
        console.info('[startup-greeting]', 'Welcome back. HoloBro missed you.');
      }
    };
    void run();
    return () => { done = true; };
  }, [startupGreetingEnabled]);

  // ─── Chat refresh ──────────────────────────────────────────
  const refreshThread = useCallback(async () => {
    if (!hc) return;
    try {
      const m = await hcListThread(hc, threadId);
      setChatMessages(m);
    } catch (e) { console.error(e); }
  }, [hc, threadId]);

  useEffect(() => { void refreshThread(); }, [refreshThread]);

  // ─── Fetch bridge ──────────────────────────────────────────
  const fetchReader = useCallback(async () => {
    setFetchErr(null);
    setFetchResult(null);
    setFetchBusy(true);
    const u = normalizeUrl(url);
    const proxy =
      browserSettings.useProxyForFetch && isContentProxyActive(browserSettings)
        ? effectiveContentProxyUrl(browserSettings)
        : null;
    try {
      const result = await safeInvoke<FetchBridgeResult>('fetch_url_bridge', {
        req: { url: u, proxy, timeoutSecs: browserSettings.fetchTimeoutSecs, maxBytes: browserSettings.fetchMaxKb * 1024 },
      });
      setFetchResult(result);
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : String(e));
    } finally {
      setFetchBusy(false);
    }
  }, [url, browserSettings]);

  // ─── CRUD operations ───────────────────────────────────────
  const setBookmarkHolochainSync = useCallback((enabled: boolean) => {
    localStorage.setItem(LS_BOOKMARK_HOLOCHAIN_SYNC, enabled ? '1' : '0');
    setBookmarkHolochainSyncState(enabled);
    if (!enabled) {
      setPendingOps((prev) => prev.filter((o) => o.kind !== 'bookmark'));
      bookmarkMergedForHcRef.current = null;
    }
  }, []);

  const setContactHolochainSync = useCallback((enabled: boolean) => {
    localStorage.setItem(LS_CONTACT_HOLOCHAIN_SYNC, enabled ? '1' : '0');
    setContactHolochainSyncState(enabled);
    if (!enabled) {
      setPendingOps((prev) => prev.filter((o) => o.kind !== 'contact'));
      contactMergedForHcRef.current = null;
    }
  }, []);

  const setSharedLinkHolochainSync = useCallback((enabled: boolean) => {
    localStorage.setItem(LS_SHARED_LINK_HOLOCHAIN_SYNC, enabled ? '1' : '0');
    setSharedLinkHolochainSyncState(enabled);
    if (!enabled) {
      setPendingOps((prev) => prev.filter((o) => o.kind !== 'shared_link'));
      sharedLinkMergedForHcRef.current = null;
    }
  }, []);

  const addBookmark = useCallback(async () => {
    const u = normalizeUrl(url);
    const title = (() => { try { return new URL(u).hostname; } catch { return u; } })();
    const now = Date.now();
    const payload = { url: u, title, created_at_ms: now };
    bumpCookieJar();
    if (!bookmarkHolochainSync) {
      setDemoBookmarks((prev) => [...prev, { url: u, title }]);
      return;
    }
    if (hc) {
      try {
        await hcCreateBookmark(hc, payload);
        setBookmarks(await hcListBookmarks(hc));
      } catch {
        setPendingOps((prev) => [...prev, { kind: 'bookmark', payload }]);
        setHcStatus('Connected (bookmark queued for sync)');
      }
    } else {
      setDemoBookmarks((prev) => [...prev, { url: u, title }]);
      setPendingOps((prev) => [...prev, { kind: 'bookmark', payload }]);
    }
  }, [url, hc, bookmarkHolochainSync, bumpCookieJar]);

  const removeBookmark = useCallback(async (hash: ActionHash | undefined, urlStr: string) => {
    if (!bookmarkHolochainSync) {
      setDemoBookmarks((prev) => prev.filter((b) => b.url !== urlStr));
      return;
    }
    if (hc && hash) {
      await hcDeleteBookmark(hc, hash);
      setBookmarks(await hcListBookmarks(hc));
    } else {
      setDemoBookmarks((prev) => prev.filter((b) => b.url !== urlStr));
    }
  }, [hc, bookmarkHolochainSync]);

  const addContact = useCallback(async (name: string, peerKey: string, proof: string) => {
    const now = Date.now();
    const payload = {
      display_name: name,
      peer_agent_pubkey_b64: peerKey.trim(),
      invite_proof_b64: proof || '',
      created_at_ms: now,
    };
    if (!contactHolochainSync) {
      setDemoContacts((prev) => [...prev, { name, peerKey, proof }]);
      return;
    }
    if (hc) {
      try {
        await hcCreateContact(hc, payload);
        setContacts(await hcListContacts(hc));
      } catch {
        setPendingOps((prev) => [...prev, { kind: 'contact', payload }]);
        setHcStatus('Connected (contact queued for sync)');
      }
    } else {
      setDemoContacts((prev) => [...prev, { name, peerKey, proof }]);
      setPendingOps((prev) => [...prev, { kind: 'contact', payload }]);
    }
  }, [hc, contactHolochainSync]);

  const sendChat = useCallback(async () => {
    const body = chatInput.trim();
    if (!body) return;
    const now = Date.now();
    const payload = { thread_id: threadId, body, sent_at_ms: now };
    if (hc) {
      try {
        await hcSendChat(hc, payload);
        setChatInput('');
        await refreshThread();
      } catch {
        setPendingOps((prev) => [...prev, { kind: 'chat', payload }]);
        setChatInput('');
        setHcStatus('Connected (chat queued for sync)');
      }
    } else {
      setDemoChat((prev) => [...prev, { thread: threadId, body, at: now }]);
      setPendingOps((prev) => [...prev, { kind: 'chat', payload }]);
      setChatInput('');
    }
  }, [chatInput, threadId, hc, refreshThread]);

  const recordNavigation = useCallback(async (navUrl: string) => {
    const title = (() => { try { return new URL(navUrl).hostname; } catch { return navUrl; } })();
    const now = Date.now();
    setDemoHistory((prev) => [...prev, { url: navUrl, title, visited_at_ms: now }]);
  }, []);

  const removeHistory = useCallback(async (_hash: ActionHash | undefined, urlStr: string, visitedAt: number) => {
    setDemoHistory((prev) => prev.filter((h) => !(h.url === urlStr && h.visited_at_ms === visitedAt)));
  }, []);

  const clearAllHistory = useCallback(async () => {
    setDemoHistory([]);
    saveJson(LS_HISTORY, []);
  }, []);

  const shareLink = useCallback(async (linkUrl: string, title: string, description: string, tags: string) => {
    const now = Date.now();
    const payload = { url: linkUrl, title, description, tags, shared_at_ms: now };
    if (!sharedLinkHolochainSync) {
      setDemoSharedLinks((prev) => [...prev, { url: linkUrl, title, description, tags, shared_at_ms: now }]);
      return;
    }
    if (hc) {
      try {
        await hcCreateSharedLink(hc, payload);
        setSharedLinks(await hcListSharedLinks(hc));
      } catch {
        setPendingOps((prev) => [...prev, { kind: 'shared_link', payload }]);
        setHcStatus('Connected (shared link queued for sync)');
      }
    } else {
      setDemoSharedLinks((prev) => [...prev, { url: linkUrl, title, description, tags, shared_at_ms: now }]);
      setPendingOps((prev) => [...prev, { kind: 'shared_link', payload }]);
    }
  }, [hc, sharedLinkHolochainSync]);

  // ─── Video ──────────────────────────────────────────────────
  const pushSignal = useCallback(async (kind: string, payload: unknown) => {
    if (!hc) {
      setVideoLog((l) => [...l, 'Holochain not connected \u2014 cannot signal.']);
      return;
    }
    await hcPostSignal(hc, {
      peer_pubkey_b64: videoPeerB64 || '_broadcast_',
      signal_kind: kind,
      payload_json: JSON.stringify(payload),
      created_at_ms: Date.now(),
    });
  }, [hc, videoPeerB64]);

  const startVideo = useCallback(async () => {
    setVideoLog((l) => [...l, 'Starting local capture\u2026']);
    const pc = createPeerConnection();
    pcRef.current = pc;
    wireRemoteStream(pc, remoteVid.current!);
    pc.onicecandidate = (ev) => {
      if (ev.candidate) void pushSignal('ice', ev.candidate.toJSON());
    };
    if (localVid.current) await attachLocalVideo(pc, localVid.current);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await pushSignal('offer', offer);
    setVideoLog((l) => [...l, 'Posted offer to Holochain signaling (poll peer).']);
  }, [pushSignal]);

  const applyRemoteSignals = useCallback(async () => {
    if (!hc) return;
    const rows = await hcListSignals(hc);
    const pc = pcRef.current;
    if (!pc) return;
    for (const r of rows) {
      if (videoPeerB64 && r.peer_pubkey_b64 !== videoPeerB64 && r.peer_pubkey_b64 !== '_broadcast_') continue;
      try {
        const payload = JSON.parse(r.payload_json) as Record<string, unknown>;
        if (r.signal_kind === 'offer' && payload.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload as unknown as RTCSessionDescriptionInit));
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          await pushSignal('answer', ans);
        } else if (r.signal_kind === 'answer' && payload.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload as unknown as RTCSessionDescriptionInit));
        } else if (r.signal_kind === 'ice' && payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(payload as unknown as RTCIceCandidateInit));
        }
      } catch (e) { console.warn(e); }
    }
  }, [hc, videoPeerB64, pushSignal]);

  const applyRemoteSignalsRef = useRef(applyRemoteSignals);
  applyRemoteSignalsRef.current = applyRemoteSignals;

  useEffect(() => {
    if (activePanel !== 'video' || !hc) return;
    const id = window.setInterval(() => void applyRemoteSignalsRef.current(), 2800);
    return () => window.clearInterval(id);
  }, [activePanel, hc]);

  const stopVideo = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    if (localVid.current?.srcObject) {
      const s = localVid.current.srcObject as MediaStream;
      s.getTracks().forEach((t) => t.stop());
      localVid.current.srcObject = null;
    }
    if (remoteVid.current) remoteVid.current.srcObject = null;
    setVideoLog((l) => [...l, 'Stopped.']);
  }, []);

  const signalPollActive = activePanel === 'video' && Boolean(hc);

  // ─── Contact list (computed) ────────────────────────────────
  const contactList = useMemo<ContactDisplay[]>(() => {
    if (hc && contactHolochainSync) {
      return contacts.map((c) => ({
        id: c.peer_agent_pubkey_b64 || encodeHashToBase64(c.author),
        name: c.display_name,
        peerKey: c.peer_agent_pubkey_b64,
        proof: c.invite_proof_b64,
      }));
    }
    return demoContacts.map((c, i) => ({
      id: `demo-${i}`,
      name: c.name,
      peerKey: c.peerKey,
      proof: c.proof,
    }));
  }, [hc, contactHolochainSync, contacts, demoContacts]);

  // ─── Reconnect helper ──────────────────────────────────────
  const reconnect = useCallback(() => {
    setHc(null);
    setHcLastError(null);
    setHcStatus('Reconnecting to Holochain\u2026');
    void connectHolo();
  }, [connectHolo]);

  // ─── Context value ─────────────────────────────────────────
  const value = useMemo<HolochainContextValue>(() => ({
    hc, hcStatus, hcConnecting, hasHoloConfig, hcLastError, reconnect,
    activePanel,
    url, setUrl, browserSettings, setBrowserSettings,
    fetchResult, fetchErr, fetchBusy,
    fetchReader: () => void fetchReader(),
    addBookmark: () => void addBookmark(),
    recordNavigation: (u: string) => void recordNavigation(u),
    shareLink,
    bookmarks,
    demoBookmarks,
    bookmarkHolochainSync,
    setBookmarkHolochainSync,
    contactHolochainSync,
    setContactHolochainSync,
    sharedLinkHolochainSync,
    setSharedLinkHolochainSync,
    removeBookmark: (h, u) => void removeBookmark(h, u),
    demoHistory,
    removeHistory: (h, u, v) => void removeHistory(h, u, v),
    clearAllHistory: () => void clearAllHistory(),
    contactList,
    addContact: (n, pk, p) => void addContact(n, pk, p),
    threadId, setThreadId, chatMessages, demoChat, chatInput, setChatInput,
    refreshThread: () => void refreshThread(), sendChat: () => void sendChat(),
    videoPeerB64, setVideoPeerB64, localVid, remoteVid, videoLog,
    startVideo: () => void startVideo(), applyRemoteSignals: () => void applyRemoteSignals(),
    stopVideo, signalPollActive,
    sharedLinks, sharedPages, demoSharedLinks,
    cookieJarCount, bumpCookieJar, resetCookieJar,
    wandererEnabled, setWandererEnabled,
    wandererSoundPack, setWandererSoundPack,
    startupGreetingEnabled, setStartupGreetingEnabled,
    pendingOps, navigateToPanel,
  }), [
    hc, hcStatus, hcConnecting, hasHoloConfig, hcLastError, reconnect, activePanel,
    url, browserSettings, fetchResult, fetchErr, fetchBusy, fetchReader,
    addBookmark, recordNavigation, shareLink,
    bookmarks,
    demoBookmarks,
    bookmarkHolochainSync,
    setBookmarkHolochainSync,
    contactHolochainSync,
    setContactHolochainSync,
    sharedLinkHolochainSync,
    setSharedLinkHolochainSync,
    removeBookmark,
    demoHistory, removeHistory, clearAllHistory,
    contactList, addContact,
    threadId, chatMessages, demoChat, chatInput, refreshThread, sendChat,
    videoPeerB64, videoLog, startVideo, applyRemoteSignals, stopVideo, signalPollActive,
    sharedLinks, sharedPages, demoSharedLinks,
    cookieJarCount, bumpCookieJar, resetCookieJar,
    wandererEnabled, wandererSoundPack,
    startupGreetingEnabled, pendingOps, navigateToPanel,
  ]);

  return (
    <HolochainContext.Provider value={value}>
      {children}
    </HolochainContext.Provider>
  );
};
