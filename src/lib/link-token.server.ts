// Server-only: signs and verifies candidate access links (HMAC-SHA256 JWT).
const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function key(): Promise<CryptoKey> {
  const secret = process.env["CANDIDATE_LINK_SECRET"];
  if (!secret) throw new Error("CANDIDATE_LINK_SECRET is not configured");
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export interface LinkClaims {
  cid: string;
  aid: string;
  email: string;
  jti: string;
  exp: number;
}

export async function signLink(claims: Omit<LinkClaims, "exp">, ttlDays = 30): Promise<string> {
  const payload: LinkClaims = { ...claims, exp: Math.floor(Date.now() / 1000) + ttlDays * 86400 };
  const header = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), enc.encode(data)));
  return `${data}.${b64url(sig)}`;
}

export async function verifyLink(token: string): Promise<LinkClaims | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const data = `${parts[0]}.${parts[1]}`;
  const ok = await crypto.subtle.verify("HMAC", await key(), fromB64url(parts[2]!), enc.encode(data));
  if (!ok) return null;
  try {
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(parts[1]!))) as LinkClaims;
    if (!claims.exp || claims.exp * 1000 < Date.now()) return null;
    if (!claims.cid || !claims.aid || !claims.jti) return null;
    return claims;
  } catch {
    return null;
  }
}
