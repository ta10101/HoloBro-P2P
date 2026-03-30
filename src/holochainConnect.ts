import {
  AdminWebsocket,
  AppWebsocket,
  type AppAuthenticationToken,
} from '@holochain/client'

export type HoloConnectResult =
  | { ok: true; client: AppWebsocket; signingNote: string | null }
  | { ok: false; reason: string }

/** Avoid `localhost` → ::1 on Windows when Docker publishes the app port on IPv4 only. */
export function normalizeAppWebsocketUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr.trim())
    const h = u.hostname
    if (h === 'localhost' || h === '::1') {
      u.hostname = '127.0.0.1'
    }
    return u.toString()
  } catch {
    return urlStr.trim()
  }
}

function parseAppToken(raw: string): AppAuthenticationToken {
  const t = raw.trim()
  if (t.startsWith('[')) {
    const parsed: unknown = JSON.parse(t)
    if (!Array.isArray(parsed) || !parsed.every((n) => typeof n === 'number')) {
      throw new Error('VITE_HC_APP_TOKEN JSON must be a number[]')
    }
    return parsed as AppAuthenticationToken
  }
  // Comma-separated byte list (Tryorama / hc output)
  if (t.includes(',') && /^[\d,\s]+$/.test(t)) {
    const arr = t.split(',').map((s) => Number(s.trim()))
    if (arr.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      throw new Error('VITE_HC_APP_TOKEN CSV must be integers 0–255 per byte')
    }
    return arr
  }
  return [...new TextEncoder().encode(t)]
}

async function authorizeZomeSigningIfConfigured(client: AppWebsocket): Promise<string | null> {
  const adminUrl = import.meta.env.VITE_HC_ADMIN_WS?.trim()
  if (!adminUrl) return null

  const role = import.meta.env.VITE_HC_ROLE_NAME ?? 'anon_browser'
  let admin: AdminWebsocket | undefined
  try {
    admin = await AdminWebsocket.connect({
      url: new URL(adminUrl),
      defaultTimeout: 12_000,
    })
    const appInfo = await client.appInfo()
    const cellId = client.getCellIdFromRoleName(role, appInfo)
    await admin.authorizeSigningCredentials(cellId)
    return null
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return `Admin signing setup failed (${msg}). Zome calls may fail until credentials are authorized.`
  } finally {
    await admin?.client.close()
  }
}

/** True when env or saved setup (localStorage) has both app WS URL and token — same source as `tryConnectHolo`. */
export function hasEffectiveHoloConfig(): boolean {
  const lsWs = (() => { try { return localStorage.getItem('holobro-hc-ws') } catch { return null } })()
  const lsToken = (() => { try { return localStorage.getItem('holobro-hc-token') } catch { return null } })()
  const urlStr = lsWs?.trim() || (import.meta.env.VITE_HC_APP_WS as string | undefined)
  const tokenRaw = lsToken?.trim() || (import.meta.env.VITE_HC_APP_TOKEN as string | undefined)
  return Boolean(urlStr?.trim() && tokenRaw?.trim())
}

export async function tryConnectHolo(): Promise<HoloConnectResult> {
  // Runtime overrides from localStorage (set via Holochain Setup popup)
  const lsWs = (() => { try { return localStorage.getItem('holobro-hc-ws') } catch { return null } })()
  const lsToken = (() => { try { return localStorage.getItem('holobro-hc-token') } catch { return null } })()

  const urlStr = lsWs?.trim() || (import.meta.env.VITE_HC_APP_WS as string | undefined)
  const tokenRaw = lsToken?.trim() || (import.meta.env.VITE_HC_APP_TOKEN as string | undefined)

  if (!urlStr?.trim() || !tokenRaw?.trim()) {
    return {
      ok: false,
      reason:
        'Set VITE_HC_APP_WS and VITE_HC_APP_TOKEN (from your conductor / hc spin output), or use the Setup popup in the status bar.',
    }
  }

  let token: AppAuthenticationToken
  try {
    token = parseAppToken(tokenRaw)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, reason: `Bad VITE_HC_APP_TOKEN: ${msg}` }
  }

  try {
    const wsUrl = normalizeAppWebsocketUrl(urlStr)
    const client = await AppWebsocket.connect({
      url: new URL(wsUrl),
      token,
      defaultTimeout: 8000,
    })
    await client.appInfo()
    const signingNote = await authorizeZomeSigningIfConfigured(client)
    if (signingNote) console.warn(signingNote)
    return { ok: true, client, signingNote }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, reason: msg }
  }
}
