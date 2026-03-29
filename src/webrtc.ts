/**
 * Browser-side WebRTC helpers. Signaling flows over Holochain (`post_webrtc_signal` /
 * `list_recent_signals`) so only trusted peers see offers/answers.
 *
 * ICE servers are configurable — defaults include public STUN servers but can be
 * overridden via the `iceServers` parameter or stored as a UserSetting in Holochain.
 */

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
]

let customIceServers: RTCIceServer[] | null = null

/** Override the default ICE server list (e.g. from a UserSetting synced via Holochain). */
export function setIceServers(servers: RTCIceServer[]): void {
  customIceServers = servers.length > 0 ? servers : null
}

/** Get the active ICE server configuration. */
export function getIceServers(): RTCIceServer[] {
  return customIceServers ?? DEFAULT_ICE_SERVERS
}

export function createPeerConnection(iceServers?: RTCIceServer[]): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: iceServers ?? getIceServers() })
}

export async function attachLocalVideo(pc: RTCPeerConnection, videoEl: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  for (const track of stream.getTracks()) {
    pc.addTrack(track, stream)
  }
  videoEl.srcObject = stream
  return stream
}

export function wireRemoteStream(pc: RTCPeerConnection, videoEl: HTMLVideoElement): void {
  pc.ontrack = (ev) => {
    const [stream] = ev.streams
    if (stream) videoEl.srcObject = stream
  }
}
