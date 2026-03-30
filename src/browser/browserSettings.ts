/** Embedded page proxy: Off, Tor SOCKS, JonDo/JAP local HTTP, or arbitrary URL. */
export type ContentProxyPreset = 'off' | 'tor' | 'jondo' | 'custom'

export type BrowserSettings = {
  zoom: number
  torProxyUrl: string
  jondoProxyUrl: string
  contentProxyPreset: ContentProxyPreset
  useProxyForFetch: boolean
  fetchTimeoutSecs: number
  fetchMaxKb: number
  stealthUserAgent: boolean
  privacyHardenContent: boolean
  blockAdsContent: boolean
  blockScriptsContent: boolean
  contentIncognito: boolean
}

/** Default JonDo/JAP local HTTP proxy (port often 4001). */
export const JONDO_DEFAULT_HTTP = 'http://127.0.0.1:4001'

export function isContentProxyActive(s: BrowserSettings): boolean {
  return s.contentProxyPreset !== 'off'
}

/** URL passed to WebView2 / fetch bridge when a proxy preset is active. */
export function effectiveContentProxyUrl(s: BrowserSettings): string {
  switch (s.contentProxyPreset) {
    case 'jondo':
      return s.jondoProxyUrl.trim() || JONDO_DEFAULT_HTTP
    case 'tor':
    case 'custom':
      return s.torProxyUrl.trim() || 'socks5://127.0.0.1:9050'
    default:
      return s.torProxyUrl.trim() || 'socks5://127.0.0.1:9050'
  }
}

function migrateLegacyContentProxy(p: Partial<BrowserSettings> & { useProxyForContent?: boolean }): {
  preset: ContentProxyPreset
  jondoUrl: string
} {
  if (
    typeof p.contentProxyPreset === 'string' &&
    ['off', 'tor', 'jondo', 'custom'].includes(p.contentProxyPreset)
  ) {
    return {
      preset: p.contentProxyPreset as ContentProxyPreset,
      jondoUrl:
        typeof p.jondoProxyUrl === 'string' && p.jondoProxyUrl.trim()
          ? p.jondoProxyUrl.trim()
          : JONDO_DEFAULT_HTTP,
    }
  }
  if (!p.useProxyForContent) {
    return { preset: 'off', jondoUrl: JONDO_DEFAULT_HTTP }
  }
  const u = (p.torProxyUrl || '').trim().toLowerCase()
  if (u.startsWith('socks')) return { preset: 'tor', jondoUrl: JONDO_DEFAULT_HTTP }
  if (u.startsWith('http')) {
    const legacyHttp = (p.torProxyUrl || '').trim()
    if (u.includes(':4001') || u.includes('jondo') || u.includes('jap')) {
      return { preset: 'jondo', jondoUrl: legacyHttp || JONDO_DEFAULT_HTTP }
    }
    return { preset: 'custom', jondoUrl: JONDO_DEFAULT_HTTP }
  }
  return { preset: 'custom', jondoUrl: JONDO_DEFAULT_HTTP }
}

export type FetchBridgeResult = {
  body: string
  status: number
  contentType: string
  finalUrl: string
  byteLength: number
}

const LS_SETTINGS = 'holobro-browser-settings'
const LS_SETTINGS_LEGACY = 'hab-browser-settings'

export function loadBrowserSettings(): BrowserSettings {
  try {
    const raw =
      localStorage.getItem(LS_SETTINGS) ?? localStorage.getItem(LS_SETTINGS_LEGACY)
    if (!raw) {
      return {
        zoom: 1,
        torProxyUrl: 'socks5://127.0.0.1:9050',
        jondoProxyUrl: JONDO_DEFAULT_HTTP,
        contentProxyPreset: 'off',
        useProxyForFetch: false,
        fetchTimeoutSecs: 45,
        fetchMaxKb: 2048,
        stealthUserAgent: true,
        privacyHardenContent: true,
        blockAdsContent: true,
        blockScriptsContent: false,
        contentIncognito: true,
      }
    }
    const p = JSON.parse(raw) as Partial<BrowserSettings> & { useProxyForContent?: boolean }
    const { preset: contentProxyPreset, jondoUrl: migratedJondo } = migrateLegacyContentProxy(p)
    return {
      zoom: typeof p.zoom === 'number' ? Math.min(2, Math.max(0.5, p.zoom)) : 1,
      torProxyUrl: typeof p.torProxyUrl === 'string' ? p.torProxyUrl : 'socks5://127.0.0.1:9050',
      jondoProxyUrl:
        typeof p.jondoProxyUrl === 'string' && p.jondoProxyUrl.trim()
          ? p.jondoProxyUrl.trim()
          : migratedJondo,
      contentProxyPreset,
      useProxyForFetch: Boolean(p.useProxyForFetch),
      fetchTimeoutSecs:
        typeof p.fetchTimeoutSecs === 'number'
          ? Math.min(600, Math.max(5, Math.round(p.fetchTimeoutSecs)))
          : 45,
      fetchMaxKb:
        typeof p.fetchMaxKb === 'number' ? Math.min(2048, Math.max(16, Math.round(p.fetchMaxKb))) : 2048,
      stealthUserAgent: typeof p.stealthUserAgent === 'boolean' ? p.stealthUserAgent : true,
      privacyHardenContent: typeof p.privacyHardenContent === 'boolean' ? p.privacyHardenContent : true,
      blockAdsContent: typeof p.blockAdsContent === 'boolean' ? p.blockAdsContent : true,
      blockScriptsContent: typeof p.blockScriptsContent === 'boolean' ? p.blockScriptsContent : false,
      contentIncognito: typeof p.contentIncognito === 'boolean' ? p.contentIncognito : true,
    }
  } catch {
    return {
      zoom: 1,
      torProxyUrl: 'socks5://127.0.0.1:9050',
      jondoProxyUrl: JONDO_DEFAULT_HTTP,
      contentProxyPreset: 'off',
      useProxyForFetch: false,
      fetchTimeoutSecs: 45,
      fetchMaxKb: 2048,
      stealthUserAgent: true,
      privacyHardenContent: true,
      blockAdsContent: true,
      blockScriptsContent: false,
      contentIncognito: true,
    }
  }
}

export function saveBrowserSettings(s: BrowserSettings) {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(s))
}
