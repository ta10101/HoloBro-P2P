import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { encodeHashToBase64, type ActionHash, type AppWebsocket } from '@holochain/client'
import { invoke } from '@tauri-apps/api/core'
import { tryConnectHolo } from '../holochainConnect'
import {
  BrowserPanel,
  effectiveContentProxyUrl,
  isContentProxyActive,
  loadBrowserSettings,
  type BrowserSettings,
  type FetchBridgeResult,
} from '../browser/BrowserPanel'
import {
  hcCreateBookmark,
  hcCreateContact,
  hcCreateHistory,
  hcCreateSharedLink,
  hcClearHistory,
  hcDeleteBookmark,
  hcDeleteHistory,
  hcListBookmarks,
  hcListContacts,
  hcListHistory,
  hcListSharedLinks,
  hcListSharedPages,
  hcListSignals,
  hcListThread,
  hcPostSignal,
  hcSendChat,
  type BookmarkRow,
  type ChatMessageRow,
  type ContactRow,
  type HistoryRow,
  type SharedLinkRow,
  type SharedPageRow,
} from '../holochain'
import { DependencyCornerDock } from '../network/DependencyCornerDock'
import { TerminalMiniDock } from '../terminal/TerminalMiniDock'
import { HoloBroLogo } from '../components/HoloBroLogo'
import { HoloBroMascot } from '../components/HoloBroMascot'
import { HoloBroWanderer } from '../components/HoloBroWanderer'
import { StreetTags } from '../components/StreetTags'
import { attachLocalVideo, createPeerConnection, wireRemoteStream } from '../webrtc'
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
  LS_SHARED_LINKS,
  LS_STARTUP_GREETING,
  LS_WANDERER_ENABLED,
  LS_WANDERER_SOUND_PACK,
} from '../lib/localStorageJson'
import { normalizeUrl } from '../lib/normalizeUrl'
import { mergeThreadIntoDemoChat, mirrorBookmarks, mirrorContacts, mirrorHistory, mirrorSharedLinks } from '../lib/holoMirror'
import { pickWelcomeLine, playTranceBed, type AppIdentityResult } from '../lib/startupGreeting'
import { BookmarksPanel } from '../panels/BookmarksPanel'
import { ChatPanel } from '../panels/ChatPanel'
import { ContactsPanel } from '../panels/ContactsPanel'
import { HistoryPanel } from '../panels/HistoryPanel'
import { VideoPanel } from '../panels/VideoPanel'
import { AgentHubPanel, AssistantPanel, NetworkToolsPanel, P2PLibraryPanel, WeatherPanel } from './lazyPanels'
import { useMockupUIStore } from '../mockup/store'
import { useHealthPing } from '../mockup/hooks'
import { Inspector } from '../mockup/Inspector'
import { MiniChatPopup } from '../mockup/MiniChat'
import type { ContactDisplay, PendingOp, Tab } from './types'
import '../App.css'

export function AppShell() {
  const hasHoloConfig = Boolean(
    (import.meta.env.VITE_HC_APP_WS as string | undefined)?.trim()
      && (import.meta.env.VITE_HC_APP_TOKEN as string | undefined)?.trim(),
  )
  const holoWsTarget = ((import.meta.env.VITE_HC_APP_WS as string | undefined)?.trim() || 'not set')
  const holoRoleName = (import.meta.env.VITE_HC_ROLE_NAME as string | undefined)?.trim() || 'anon_browser'

  const [tab, setTab] = useState<Tab>('browser')
  const [hc, setHc] = useState<AppWebsocket | null>(null)
  const [hcStatus, setHcStatus] = useState<string>('Disconnected (demo storage)')
  const [url, setUrl] = useState('https://example.com')
  const [browserSettings, setBrowserSettings] = useState<BrowserSettings>(() => loadBrowserSettings())
  const [fetchResult, setFetchResult] = useState<FetchBridgeResult | null>(null)
  const [fetchErr, setFetchErr] = useState<string | null>(null)
  const [fetchBusy, setFetchBusy] = useState(false)

  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [demoBookmarks, setDemoBookmarks] = useState<{ url: string; title: string }[]>(() =>
    loadJsonPrefer(LS_BOOKMARKS, LS_BOOKMARKS_LEGACY, []),
  )

  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [demoContacts, setDemoContacts] = useState<{ name: string; peerKey: string; proof: string }[]>(() =>
    loadJsonPrefer(LS_CONTACTS, LS_CONTACTS_LEGACY, []),
  )

  const [threadId, setThreadId] = useState('general')
  const [chatMessages, setChatMessages] = useState<ChatMessageRow[]>([])
  const [demoChat, setDemoChat] = useState<{ thread: string; body: string; at: number }[]>(() =>
    loadJsonPrefer(LS_CHAT, LS_CHAT_LEGACY, []),
  )
  const [chatInput, setChatInput] = useState('')

  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([])
  const [demoHistory, setDemoHistory] = useState<{ url: string; title: string; visited_at_ms: number }[]>(() =>
    loadJson(LS_HISTORY, []),
  )

  const [sharedLinks, setSharedLinks] = useState<SharedLinkRow[]>([])
  const [demoSharedLinks, setDemoSharedLinks] = useState<{ url: string; title: string; description: string; tags: string; shared_at_ms: number }[]>(() =>
    loadJson(LS_SHARED_LINKS, []),
  )
  const [sharedPages, setSharedPages] = useState<SharedPageRow[]>([])

  const localVid = useRef<HTMLVideoElement>(null)
  const remoteVid = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const hcConnectingRef = useRef(false)
  const [hcConnecting, setHcConnecting] = useState(false)
  const lastConnectTryRef = useRef(0)
  const replayInFlightRef = useRef(false)
  const [videoPeerB64, setVideoPeerB64] = useState('')
  const [videoLog, setVideoLog] = useState<string[]>([])
  const [appSettingsOpen, setAppSettingsOpen] = useState(false)
  const [startupGreetingEnabled, setStartupGreetingEnabled] = useState(() => {
    const raw = localStorage.getItem(LS_STARTUP_GREETING)
    return raw == null ? true : raw === '1'
  })
  const [wandererEnabled, setWandererEnabled] = useState(() => {
    const raw = localStorage.getItem(LS_WANDERER_ENABLED)
    return raw == null ? true : raw === '1'
  })
  const [wandererSoundPack, setWandererSoundPack] = useState<'calm' | 'chaos' | 'street'>(() => {
    const raw = localStorage.getItem(LS_WANDERER_SOUND_PACK)
    return raw === 'calm' || raw === 'chaos' || raw === 'street' ? raw : 'street'
  })
  const [cookieJarCount, setCookieJarCount] = useState<number>(() => {
    const raw = localStorage.getItem(LS_COOKIE_JAR)
    const n = Number(raw ?? '0')
    return Number.isFinite(n) && n > 0 ? Math.min(999, Math.floor(n)) : 0
  })
  const [pendingOps, setPendingOps] = useState<PendingOp[]>(() => loadJson<PendingOp[]>(LS_PENDING_OPS, []))

  const bumpCookieJar = useCallback(() => {
    setCookieJarCount((c) => Math.min(999, c + 1))
  }, [])

  const connectHolo = useCallback(async () => {
    if (hc || hcConnectingRef.current) return
    const now = Date.now()
    if (now - lastConnectTryRef.current < 2500) return
    lastConnectTryRef.current = now
    hcConnectingRef.current = true
    setHcConnecting(true)
    setHcStatus((s) => (s.startsWith('Connected') ? s : 'Connecting to Holochainâ€¦'))
    try {
      const r = await tryConnectHolo()
      if (r.ok) {
        setHc(r.client)
        setHcStatus(
          r.signingNote
            ? `Connected (with warning: ${r.signingNote})`
            : 'Connected to Holochain',
        )
        try {
          const b = await hcListBookmarks(r.client)
          setBookmarks(b)
          const c = await hcListContacts(r.client)
          setContacts(c)
          const h = await hcListHistory(r.client)
          setHistoryRows(h)
          const sl = await hcListSharedLinks(r.client)
          setSharedLinks(sl)
          const sp = await hcListSharedPages(r.client)
          setSharedPages(sp)
        } catch (e) {
          console.error(e)
          setHcStatus((s) => `${s} â€” zome read failed (see console).`)
        }
      } else {
        setHcStatus(
          hasHoloConfig
            ? `Demo fallback (retrying): ${r.reason}`
            : `Demo mode: ${r.reason}`,
        )
      }
    } finally {
      hcConnectingRef.current = false
      setHcConnecting(false)
    }
  }, [hc, hasHoloConfig])

  useEffect(() => {
    const needsHolo = tab === 'bookmarks' || tab === 'contacts' || tab === 'chat' || tab === 'video' || tab === 'history' || tab === 'p2p-library'
    if (needsHolo) void connectHolo()
  }, [tab, connectHolo])

  useEffect(() => {
    const t = window.setTimeout(() => void connectHolo(), 2500)
    return () => window.clearTimeout(t)
  }, [connectHolo])

  useEffect(() => {
    if (!hasHoloConfig || hc) return
    const t = window.setInterval(() => {
      void connectHolo()
    }, 15000)
    return () => window.clearInterval(t)
  }, [hasHoloConfig, hc, connectHolo])

  useEffect(() => {
    if (!hc || pendingOps.length > 0) return
    const d = mirrorBookmarks(bookmarks)
    setDemoBookmarks(d)
    saveJson(LS_BOOKMARKS, d)
  }, [hc, bookmarks, pendingOps.length])

  useEffect(() => {
    if (!hc || pendingOps.length > 0) return
    const d = mirrorContacts(contacts)
    setDemoContacts(d)
    saveJson(LS_CONTACTS, d)
  }, [hc, contacts, pendingOps.length])

  useEffect(() => {
    if (!hc || pendingOps.length > 0) return
    setDemoChat((prev) => {
      const next = mergeThreadIntoDemoChat(prev, threadId, chatMessages)
      saveJson(LS_CHAT, next)
      return next
    })
  }, [hc, chatMessages, threadId, pendingOps.length])

  useEffect(() => {
    if (!hc || pendingOps.length > 0) return
    const d = mirrorHistory(historyRows)
    setDemoHistory(d)
    saveJson(LS_HISTORY, d)
  }, [hc, historyRows, pendingOps.length])

  useEffect(() => {
    if (!hc || pendingOps.length > 0) return
    const d = mirrorSharedLinks(sharedLinks)
    setDemoSharedLinks(d)
    saveJson(LS_SHARED_LINKS, d)
  }, [hc, sharedLinks, pendingOps.length])

  useEffect(() => {
    if (!hc || pendingOps.length === 0 || replayInFlightRef.current) return
    replayInFlightRef.current = true
    void (async () => {
      let remaining = [...pendingOps]
      let applied = 0
      for (let i = 0; i < remaining.length; i += 1) {
        const op = remaining[i]
        try {
          if (op.kind === 'bookmark') {
            await hcCreateBookmark(hc, op.payload)
          } else if (op.kind === 'contact') {
            await hcCreateContact(hc, op.payload)
          } else if (op.kind === 'chat') {
            await hcSendChat(hc, op.payload)
          } else if (op.kind === 'history') {
            await hcCreateHistory(hc, op.payload)
          } else if (op.kind === 'shared_link') {
            await hcCreateSharedLink(hc, op.payload)
          }
          applied += 1
        } catch {
          remaining = remaining.slice(i)
          setPendingOps(remaining)
          setHcStatus(`Connected (sync paused: ${remaining.length} queued op${remaining.length === 1 ? '' : 's'})`)
          replayInFlightRef.current = false
          return
        }
      }
      if (applied > 0) {
        setPendingOps([])
        try {
          setBookmarks(await hcListBookmarks(hc))
          setContacts(await hcListContacts(hc))
          setChatMessages(await hcListThread(hc, threadId))
          setHistoryRows(await hcListHistory(hc))
          setSharedLinks(await hcListSharedLinks(hc))
          setSharedPages(await hcListSharedPages(hc))
        } catch {
          // Best-effort refresh after replay.
        }
        setHcStatus(`Connected to Holochain (synced ${applied} queued op${applied === 1 ? '' : 's'})`)
      }
      replayInFlightRef.current = false
    })()
  }, [hc, pendingOps, threadId])

  useEffect(() => {
    saveJson(LS_BOOKMARKS, demoBookmarks)
  }, [demoBookmarks])
  useEffect(() => {
    saveJson(LS_CONTACTS, demoContacts)
  }, [demoContacts])
  useEffect(() => {
    saveJson(LS_CHAT, demoChat)
  }, [demoChat])
  useEffect(() => {
    saveJson(LS_HISTORY, demoHistory)
  }, [demoHistory])
  useEffect(() => {
    saveJson(LS_SHARED_LINKS, demoSharedLinks)
  }, [demoSharedLinks])

  useEffect(() => {
    localStorage.setItem(LS_STARTUP_GREETING, startupGreetingEnabled ? '1' : '0')
  }, [startupGreetingEnabled])
  useEffect(() => {
    localStorage.setItem(LS_WANDERER_ENABLED, wandererEnabled ? '1' : '0')
  }, [wandererEnabled])
  useEffect(() => {
    localStorage.setItem(LS_WANDERER_SOUND_PACK, wandererSoundPack)
  }, [wandererSoundPack])

  useEffect(() => {
    if (tab === 'browser' && !appSettingsOpen) {
      void invoke('content_webview_show').catch(() => {})
    } else {
      void invoke('content_webview_hide').catch(() => {})
    }
  }, [tab, appSettingsOpen])
  useEffect(() => {
    if (!appSettingsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAppSettingsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [appSettingsOpen])
  useEffect(() => {
    localStorage.setItem(LS_COOKIE_JAR, String(cookieJarCount))
  }, [cookieJarCount])
  useEffect(() => {
    saveJson(LS_PENDING_OPS, pendingOps)
  }, [pendingOps])

  useEffect(() => {
    if (!startupGreetingEnabled) return
    let done = false
    const run = async () => {
      try {
        const id = await invoke<AppIdentityResult>('app_identity')
        if (done) return
        const line = `${pickWelcomeLine(id.displayName)}`
        playTranceBed()
        console.info('[startup-greeting]', line)
      } catch {
        if (done) return
        playTranceBed()
        console.info('[startup-greeting]', 'Welcome back. HoloBro missed you.')
      }
    }
    void run()
    return () => {
      done = true
    }
  }, [startupGreetingEnabled])

  const refreshThread = useCallback(async () => {
    if (!hc) return
    try {
      const m = await hcListThread(hc, threadId)
      setChatMessages(m)
    } catch (e) {
      console.error(e)
    }
  }, [hc, threadId])

  useEffect(() => {
    void refreshThread()
  }, [refreshThread])

  const fetchReader = useCallback(async () => {
    setFetchErr(null)
    setFetchResult(null)
    setFetchBusy(true)
    const u = normalizeUrl(url)
    const proxy =
      browserSettings.useProxyForFetch && isContentProxyActive(browserSettings)
        ? effectiveContentProxyUrl(browserSettings)
        : null
    try {
      const result = await invoke<FetchBridgeResult>('fetch_url_bridge', {
        req: {
          url: u,
          proxy,
          timeoutSecs: browserSettings.fetchTimeoutSecs,
          maxBytes: browserSettings.fetchMaxKb * 1024,
        },
      })
      setFetchResult(result)
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : String(e))
    } finally {
      setFetchBusy(false)
    }
  }, [url, browserSettings])

  const addBookmark = async () => {
    const u = normalizeUrl(url)
    const title = new URL(u).hostname
    const now = Date.now()
    const payload = { url: u, title, created_at_ms: now }
    bumpCookieJar()
    if (hc) {
      try {
        await hcCreateBookmark(hc, payload)
        setBookmarks(await hcListBookmarks(hc))
      } catch {
        setPendingOps((prev) => [...prev, { kind: 'bookmark', payload }])
        setHcStatus('Connected (bookmark queued for sync)')
      }
    } else {
      setDemoBookmarks((prev) => [...prev, { url: u, title }])
      setPendingOps((prev) => [...prev, { kind: 'bookmark', payload }])
    }
  }

  const removeBookmark = async (hash: ActionHash | undefined, urlStr: string) => {
    if (hc && hash) {
      await hcDeleteBookmark(hc, hash)
      setBookmarks(await hcListBookmarks(hc))
    } else {
      setDemoBookmarks((prev) => prev.filter((b) => b.url !== urlStr))
    }
  }

  const addContact = async (name: string, peerKey: string, proof: string) => {
    const now = Date.now()
    const payload = {
      display_name: name,
      peer_agent_pubkey_b64: peerKey.trim(),
      invite_proof_b64: proof || '',
      created_at_ms: now,
    }
    if (hc) {
      try {
        await hcCreateContact(hc, payload)
        setContacts(await hcListContacts(hc))
      } catch {
        setPendingOps((prev) => [...prev, { kind: 'contact', payload }])
        setHcStatus('Connected (contact queued for sync)')
      }
    } else {
      setDemoContacts((prev) => [...prev, { name, peerKey, proof }])
      setPendingOps((prev) => [...prev, { kind: 'contact', payload }])
    }
  }

  const sendChat = async () => {
    const body = chatInput.trim()
    if (!body) return
    const now = Date.now()
    const payload = { thread_id: threadId, body, sent_at_ms: now }
    if (hc) {
      try {
        await hcSendChat(hc, payload)
        setChatInput('')
        await refreshThread()
      } catch {
        setPendingOps((prev) => [...prev, { kind: 'chat', payload }])
        setChatInput('')
        setHcStatus('Connected (chat queued for sync)')
      }
    } else {
      setDemoChat((prev) => [...prev, { thread: threadId, body, at: now }])
      setPendingOps((prev) => [...prev, { kind: 'chat', payload }])
      setChatInput('')
    }
  }


  const recordNavigation = useCallback(async (navUrl: string) => {
    const title = (() => { try { return new URL(navUrl).hostname } catch { return navUrl } })()
    const now = Date.now()
    const payload = { url: navUrl, title, visited_at_ms: now }
    if (hc) {
      try {
        await hcCreateHistory(hc, payload)
        setHistoryRows(await hcListHistory(hc))
      } catch {
        setPendingOps((prev) => [...prev, { kind: 'history', payload }])
        setHcStatus('Connected (history queued for sync)')
      }
    } else {
      setDemoHistory((prev) => [...prev, { url: navUrl, title, visited_at_ms: now }])
      setPendingOps((prev) => [...prev, { kind: 'history', payload }])
    }
  }, [hc])

  const removeHistory = async (hash: ActionHash | undefined, urlStr: string, visitedAt: number) => {
    if (hc && hash) {
      await hcDeleteHistory(hc, hash)
      setHistoryRows(await hcListHistory(hc))
    } else {
      setDemoHistory((prev) => prev.filter((h) => !(h.url === urlStr && h.visited_at_ms === visitedAt)))
    }
  }

  const clearAllHistory = async () => {
    if (hc) {
      await hcClearHistory(hc)
      setHistoryRows([])
    }
    setDemoHistory([])
    saveJson(LS_HISTORY, [])
  }

  const shareLink = async (linkUrl: string, title: string, description: string, tags: string) => {
    const now = Date.now()
    const payload = { url: linkUrl, title, description, tags, shared_at_ms: now }
    if (hc) {
      try {
        await hcCreateSharedLink(hc, payload)
        setSharedLinks(await hcListSharedLinks(hc))
      } catch {
        setPendingOps((prev) => [...prev, { kind: 'shared_link', payload }])
        setHcStatus('Connected (shared link queued for sync)')
      }
    } else {
      setDemoSharedLinks((prev) => [...prev, { url: linkUrl, title, description, tags, shared_at_ms: now }])
      setPendingOps((prev) => [...prev, { kind: 'shared_link', payload }])
    }
  }

  const pushSignal = useCallback(
    async (kind: string, payload: unknown) => {
      if (!hc) {
        setVideoLog((l) => [...l, 'Holochain not connected â€” cannot signal.'])
        return
      }
      await hcPostSignal(hc, {
        peer_pubkey_b64: videoPeerB64 || '_broadcast_',
        signal_kind: kind,
        payload_json: JSON.stringify(payload),
        created_at_ms: Date.now(),
      })
    },
    [hc, videoPeerB64],
  )

  const startVideo = async () => {
    setVideoLog((l) => [...l, 'Starting local captureâ€¦'])
    const pc = createPeerConnection()
    pcRef.current = pc
    wireRemoteStream(pc, remoteVid.current!)
    pc.onicecandidate = (ev) => {
      if (ev.candidate) void pushSignal('ice', ev.candidate.toJSON())
    }
    if (localVid.current) await attachLocalVideo(pc, localVid.current)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await pushSignal('offer', offer)
    setVideoLog((l) => [...l, 'Posted offer to Holochain signaling (poll peer).'])
  }

  const applyRemoteSignals = useCallback(async () => {
    if (!hc) return
    const rows = await hcListSignals(hc)
    const pc = pcRef.current
    if (!pc) return
    for (const r of rows) {
      if (videoPeerB64 && r.peer_pubkey_b64 !== videoPeerB64 && r.peer_pubkey_b64 !== '_broadcast_') continue
      try {
        const payload = JSON.parse(r.payload_json) as Record<string, unknown>
        if (r.signal_kind === 'offer' && payload.type === 'offer') {
          await pc.setRemoteDescription(
            new RTCSessionDescription(payload as unknown as RTCSessionDescriptionInit),
          )
          const ans = await pc.createAnswer()
          await pc.setLocalDescription(ans)
          await pushSignal('answer', ans)
        } else if (r.signal_kind === 'answer' && payload.type === 'answer') {
          await pc.setRemoteDescription(
            new RTCSessionDescription(payload as unknown as RTCSessionDescriptionInit),
          )
        } else if (r.signal_kind === 'ice' && payload.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(payload as unknown as RTCIceCandidateInit))
        }
      } catch (e) {
        console.warn(e)
      }
    }
  }, [hc, videoPeerB64, pushSignal])

  const applyRemoteSignalsRef = useRef(applyRemoteSignals)
  applyRemoteSignalsRef.current = applyRemoteSignals

  useEffect(() => {
    if (tab !== 'video' || !hc) return
    const id = window.setInterval(() => {
      void applyRemoteSignalsRef.current()
    }, 2800)
    return () => window.clearInterval(id)
  }, [tab, hc])

  const stopVideo = () => {
    pcRef.current?.close()
    pcRef.current = null
    if (localVid.current?.srcObject) {
      const s = localVid.current.srcObject as MediaStream
      s.getTracks().forEach((t) => t.stop())
      localVid.current.srcObject = null
    }
    if (remoteVid.current) remoteVid.current.srcObject = null
    setVideoLog((l) => [...l, 'Stopped.'])
  }

  const contactList = useMemo<ContactDisplay[]>(() => {
    if (hc) {
      return contacts.map((c) => ({
        id: c.peer_agent_pubkey_b64 || encodeHashToBase64(c.author),
        name: c.display_name,
        peerKey: c.peer_agent_pubkey_b64,
        proof: c.invite_proof_b64,
      }))
    }
    return demoContacts.map((c, i) => ({
      id: `demo-${i}`,
      name: c.name,
      peerKey: c.peerKey,
      proof: c.proof,
    }))
  }, [hc, contacts, demoContacts])

  const signalPollActive = tab === 'video' && Boolean(hc)

  const { inspectorOpen, miniChatAgent } = useMockupUIStore()
  useHealthPing(30_000)

  return (
    <div className="app">
      <header className="topbar graffiti-bar">
        <div className="topbar-left">
          <HoloBroLogo className="topbar-logo" variant="header" />
          <div className="topbar-brand">
            <h1 className="graffiti-wordmark">HoloBro</h1>
            <p className="graffiti-sub">p2p shell Â· paint the web</p>
          </div>
        </div>
        <StreetTags />
        <div className="topbar-right">
          <span className="hc graffiti-status">{hcStatus}</span>
        </div>
      </header>
      <div className="shell">
        <nav className="nav">
          <div className="nav-links">
            {(
              [
                ['browser', 'Browser', '>>'],
                ['bookmarks', 'Bookmarks', '##'],
                ['history', 'History', '<>'],
                ['p2p-library', 'P2P Library', '{}'],
                ['contacts', 'Contacts', '@@'],
                ['chat', 'Chat', '//'],
                ['video', 'Video', '[]'],
                ['weather', 'Weather', '**'],
                ['assistant', 'Assistant', 'AI'],
                ['network', 'Network', '::'],
                ['agents', 'Agents', '~~'],
              ] as const
            ).map(([id, label, icon]) => (
              <button
                key={id}
                type="button"
                className={tab === id ? 'nav-btn active' : 'nav-btn'}
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => {
                  if (id === 'browser') {
                    if (!appSettingsOpen) void invoke('content_webview_show').catch(() => {})
                  } else {
                    void invoke('content_webview_hide').catch(() => {})
                  }
                  setTab(id)
                }}
              >
                <span className="nav-icon" aria-hidden="true">
                  {icon}
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="nav-bottom">
            <section
              className="cookie-jar-card"
              aria-label="Cookie counter"
              title="Playful counter: goes up when you load a page in the embedded browser or save a bookmark. â€œEat cookiesâ€ resets it. Not related to real HTTP cookies."
            >
              <div className="cookie-jar-head">
                <span className="cookie-logo" aria-hidden="true">
                  ðŸª
                </span>
                <strong className="cookie-title">Cookie Jar</strong>
              </div>
              <p className="cookie-count">
                {cookieJarCount} cookie{cookieJarCount === 1 ? '' : 's'}
              </p>
              <button
                type="button"
                className="small cookie-eat-btn"
                onClick={() => setCookieJarCount(0)}
                disabled={cookieJarCount <= 0}
                title="Reset the playful counter to zero"
              >
                Eat cookies
              </button>
            </section>
            <div className="nav-mascot-wrap" aria-label="HoloBro mascot">
              <HoloBroMascot />
            </div>
            <section className="wander-nav-card" aria-label="HoloBro wanderer settings">
              <label className="check wander-check">
                <input
                  type="checkbox"
                  checked={wandererEnabled}
                  onChange={(e) => setWandererEnabled(e.target.checked)}
                />
                HoloBro wander
              </label>
              <label className="wander-pack-row">
                <span className="deps-label">Sound</span>
                <select
                  value={wandererSoundPack}
                  onChange={(e) => setWandererSoundPack(e.target.value as 'calm' | 'chaos' | 'street')}
                >
                  <option value="calm">Calm</option>
                  <option value="street">Street</option>
                  <option value="chaos">Chaos</option>
                </select>
              </label>
            </section>
            <section className="p2p-nav-card" aria-label="P2P health">
              <div className="p2p-nav-head">
                <strong className="deps-title">P2P Status</strong>
                <span className={hc ? 'network-ok-badge' : 'network-miss-badge'}>{hc ? 'Live' : 'Demo'}</span>
              </div>
              <p className="p2p-nav-line">
                <span className="deps-label">Conductor</span>
                <span className="mono">{hasHoloConfig ? 'configured' : 'missing env'}</span>
              </p>
              <p className="p2p-nav-line">
                <span className="deps-label">WS</span>
                <span className="mono" title={holoWsTarget}>
                  {holoWsTarget.length > 26 ? `${holoWsTarget.slice(0, 26)}â€¦` : holoWsTarget}
                </span>
              </p>
              <p className="p2p-nav-line">
                <span className="deps-label">Role</span>
                <span className="mono">{holoRoleName}</span>
              </p>
              <p className="p2p-nav-line">
                <span className="deps-label">Queue</span>
                <span className="mono">{pendingOps.length}</span>
              </p>
              <p className="p2p-nav-note">
                {hc
                  ? 'Bookmarks/Contacts/Chat/Signals are live.'
                  : 'Using local demo cache until conductor connects.'}
              </p>
              <button
                type="button"
                className="small"
                onClick={() => {
                  setHc(null)
                  setHcStatus('Reconnecting to Holochainâ€¦')
                  void connectHolo()
                }}
                disabled={hcConnecting}
                title="Try connecting to Holochain now"
              >
                {hcConnecting ? 'Connectingâ€¦' : 'Reconnect P2P'}
              </button>
            </section>
            <button
              type="button"
              className={appSettingsOpen ? 'nav-btn active app-settings-toggle' : 'nav-btn app-settings-toggle'}
              onClick={() => setAppSettingsOpen((v) => !v)}
              aria-pressed={appSettingsOpen}
            >
              <span className="nav-icon" aria-hidden="true">
                âš™
              </span>
              <span>App Settings</span>
            </button>
            <DependencyCornerDock />
          </div>
        </nav>
        <main className="main">
          {tab === 'browser' && (
            <BrowserPanel
              url={url}
              setUrl={setUrl}
              settings={browserSettings}
              onSettingsChange={setBrowserSettings}
              onBookmark={() => void addBookmark()}
              onFetchBridge={() => void fetchReader()}
              onEmbeddedLoad={bumpCookieJar}
              onNavigate={(u) => void recordNavigation(u)}
              onShareLink={(u, t) => void shareLink(u, t, '', '')}
              fetchResult={fetchResult}
              fetchErr={fetchErr}
              fetchBusy={fetchBusy}
              active={tab === 'browser'}
            />
          )}
          {tab === 'bookmarks' && (
            <BookmarksPanel
              hc={Boolean(hc)}
              bookmarks={bookmarks}
              demoBookmarks={demoBookmarks}
              setUrl={setUrl}
              setTab={setTab}
              removeBookmark={removeBookmark}
            />
          )}
          {tab === 'history' && (
            <HistoryPanel
              hc={Boolean(hc)}
              history={historyRows}
              demoHistory={demoHistory}
              setUrl={setUrl}
              setTab={setTab}
              removeHistory={removeHistory}
              clearHistory={() => void clearAllHistory()}
            />
          )}
          {tab === 'p2p-library' && (
            <Suspense fallback={<section className="panel"><p className="muted">Loading P2P Library...</p></section>}>
              <P2PLibraryPanel
                hc={hc}
                sharedLinks={sharedLinks}
                sharedPages={sharedPages}
                demoSharedLinks={demoSharedLinks}
                onShareLink={shareLink}
                setUrl={setUrl}
                setTab={setTab}
              />
            </Suspense>
          )}
          {tab === 'contacts' && (
            <ContactsPanel contactList={contactList} onAddContact={(n, pk, p) => void addContact(n, pk, p)} />
          )}
          {tab === 'chat' && (
            <ChatPanel
              hc={Boolean(hc)}
              threadId={threadId}
              setThreadId={setThreadId}
              chatMessages={chatMessages}
              demoChat={demoChat}
              chatInput={chatInput}
              setChatInput={setChatInput}
              refreshThread={refreshThread}
              sendChat={sendChat}
            />
          )}
          {tab === 'video' && (
            <VideoPanel
              videoPeerB64={videoPeerB64}
              setVideoPeerB64={setVideoPeerB64}
              localVid={localVid}
              remoteVid={remoteVid}
              videoLog={videoLog}
              startVideo={startVideo}
              applyRemoteSignals={applyRemoteSignals}
              stopVideo={stopVideo}
              signalPollActive={signalPollActive}
            />
          )}
          {tab === 'weather' && (
            <Suspense fallback={<section className="panel"><p className="muted">Loading Weather…</p></section>}>
              <WeatherPanel />
            </Suspense>
          )}
          {tab === 'assistant' && (
            <Suspense fallback={<section className="panel"><p className="muted">Loading Assistant…</p></section>}>
              <AssistantPanel />
            </Suspense>
          )}
          {tab === 'network' && (
            <Suspense fallback={<section className="panel"><p className="muted">Loading Network tools…</p></section>}>
              <NetworkToolsPanel />
            </Suspense>
          )}
          {tab === 'agents' && (
            <Suspense fallback={<section className="panel"><p className="muted">Loading Agent Hub…</p></section>}>
              <AgentHubPanel />
            </Suspense>
          )}
        </main>
        {inspectorOpen && <Inspector />}
      </div>
      <TerminalMiniDock />
      {miniChatAgent && <MiniChatPopup />}
      <HoloBroWanderer enabled={wandererEnabled} soundPack={wandererSoundPack} alwaysShow />
      {appSettingsOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="App settings"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAppSettingsOpen(false)
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>App settings</h3>
            <label className="check">
              <input
                type="checkbox"
                checked={startupGreetingEnabled}
                onChange={(e) => setStartupGreetingEnabled(e.target.checked)}
              />
              Startup greeting music (low 5s trance bed)
            </label>
            <div className="modal-actions">
              <button type="button" onClick={() => setAppSettingsOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
