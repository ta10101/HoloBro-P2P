export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function loadJsonPrefer<T>(primary: string, legacy: string, fallback: T): T {
  const p = loadJson<T | null>(primary, null)
  if (p !== null && (Array.isArray(p) ? p.length >= 0 : p !== undefined)) {
    if (Array.isArray(p) || (typeof p === 'object' && p !== null)) return p as T
  }
  const fromLegacy = loadJson<T>(legacy, fallback)
  return fromLegacy
}

export function saveJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export const LS_BOOKMARKS = 'holobro-demo-bookmarks'
export const LS_BOOKMARKS_LEGACY = 'hab-demo-bookmarks'
export const LS_CONTACTS = 'holobro-demo-contacts'
export const LS_CONTACTS_LEGACY = 'hab-demo-contacts'
export const LS_CHAT = 'holobro-demo-chat'
export const LS_CHAT_LEGACY = 'hab-demo-chat'
export const LS_STARTUP_GREETING = 'holobro-startup-greeting'
export const LS_COOKIE_JAR = 'holobro-cookie-jar-count'
export const LS_WANDERER_ENABLED = 'holobro-wanderer-enabled'
export const LS_WANDERER_SOUND_PACK = 'holobro-wanderer-sound-pack'
export const LS_PENDING_OPS = 'holobro-pending-ops'
export const LS_HISTORY = 'holobro-demo-history'
export const LS_SHARED_LINKS = 'holobro-demo-shared-links'
export const LS_SHARED_PAGES = 'holobro-demo-shared-pages'
