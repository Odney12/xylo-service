import { Hono } from "hono";
import type { Bindings } from "../types";
import { verifyPassword } from "../services/auth";
import { createSession, destroySession, getSessionUser } from "../services/sessions";

export const authRoutes = new Hono<{ Bindings: Bindings }>();

authRoutes.post("/api/login", async (c) => {
  const { email, password } = await c.req.json();

  const user = await c.env.DB
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: number; email: string; password_hash: string; password_salt: string; role: string; gym_id: number | null }>();

  if (!user) return c.json({ error: "Invalid email or password" }, 401);

  const valid = await verifyPassword(password, user.password_hash, user.password_salt);
  if (!valid) return c.json({ error: "Invalid email or password" }, 401);

  const sessionId = await createSession(c.env.DB, user.id);

  c.header(
    "Set-Cookie",
    `session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`
  );

  return c.json({ email: user.email, role: user.role, gym_id: user.gym_id });
});

authRoutes.post("/api/logout", async (c) => {
  const sessionId = getCookie(c.req.header("Cookie"), "session");
  if (sessionId) await destroySession(c.env.DB, sessionId);

  c.header("Set-Cookie", "session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
  return c.json({ success: true });
});

authRoutes.get("/api/me", async (c) => {
  const sessionId = getCookie(c.req.header("Cookie"), "session");
  if (!sessionId) return c.json({ error: "Not logged in" }, 401);

  const user = await getSessionUser(c.env.DB, sessionId);
  if (!user) return c.json({ error: "Not logged in" }, 401);

  return c.json(user);
});

function getCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}