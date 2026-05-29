import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

// LIVEKIT_URL is a wss:// URL for the client; the server API wants https://.
// Read env without eager transforms so importing this module never throws at
// build time (Next collects page data before env vars are guaranteed present).
const WS_URL = process.env.LIVEKIT_URL ?? "";
const API_KEY = process.env.LIVEKIT_API_KEY ?? "";
const API_SECRET = process.env.LIVEKIT_API_SECRET ?? "";

export const livekitWsUrl = WS_URL;

function httpUrl() {
  return WS_URL.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}

let _svc: RoomServiceClient | null = null;
function svc() {
  if (!_svc) _svc = new RoomServiceClient(httpUrl(), API_KEY, API_SECRET);
  return _svc;
}

// Mint a short-lived join token for one identity in one room. Audio only.
export async function mintCallToken(room: string, identity: string, name: string): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, { identity, name, ttl: "2h" });
  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  return at.toJwt();
}

// Server-authoritative truth about who is actually in the room right now.
export async function countParticipants(room: string): Promise<number> {
  try {
    const parts = await svc().listParticipants(room);
    return parts.length;
  } catch {
    return 0;
  }
}

export async function closeRoom(room: string): Promise<void> {
  try {
    await svc().deleteRoom(room);
  } catch {
    // Room may already be gone — fine.
  }
}
