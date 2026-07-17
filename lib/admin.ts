import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "badminton_admin_session";
const secret = () => process.env.ADMIN_SESSION_SECRET || "local-development-session-secret";
export function expectedPassword() { return process.env.ADMIN_PASSWORD || "change-me"; }
export function sessionToken() { return createHash("sha256").update(`${expectedPassword()}:${secret()}`).digest("hex"); }
export function isAdmin(request: Request) {
  const value = request.headers.get("cookie")?.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`))?.[1] || "";
  const a = Buffer.from(value); const b = Buffer.from(sessionToken());
  return a.length === b.length && timingSafeEqual(a, b);
}
