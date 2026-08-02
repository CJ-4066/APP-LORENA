import type { FastifyInstance } from "fastify";

import {
  bootstrapAdminAuth,
  buildAdminSessionCookie,
  clearAdminSessionCookie,
  createAdminSession,
  revokeAdminSession,
  updateAdminLastLogin,
  verifyAdminCredentials,
} from "../../../data/admin-auth-store.js";
import { requireAdminSession } from "../../shared/admin-auth.js";

type LoginBody = {
  email?: string;
  password?: string;
};

type LoginAttemptState = {
  count: number;
  resetAt: number;
  lockedUntil: number;
};

const loginAttempts = new Map<string, LoginAttemptState>();
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

function getLoginKey(ip: string, email: string): string {
  return `${ip.trim()}::${email.trim().toLowerCase()}`;
}

function consumeLoginAttempt(key: string): { blocked: boolean } {
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, {
      count: 0,
      resetAt: now + LOGIN_WINDOW_MS,
      lockedUntil: 0,
    });
  }

  const state = loginAttempts.get(key)!;
  if (state.lockedUntil > now) {
    return { blocked: true };
  }

  state.count += 1;
  if (state.count >= LOGIN_MAX_ATTEMPTS) {
    state.lockedUntil = now + LOGIN_LOCK_MS;
  }

  return { blocked: false };
}

function clearLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}

export async function registerAdminAuthRoutes(app: FastifyInstance) {
  await bootstrapAdminAuth();

  app.post<{ Body: LoginBody }>("/login", async (request, reply) => {
    const email = request.body?.email?.trim() ?? "";
    const password = request.body?.password ?? "";

    if (!email || !password.trim()) {
      reply.code(400);
      return {
        error: "Credenciales inválidas.",
      };
    }

    const loginKey = getLoginKey(request.ip, email);
    const attempt = consumeLoginAttempt(loginKey);
    if (attempt.blocked) {
      reply.code(429);
      return {
        error: "Demasiados intentos. Intenta más tarde.",
      };
    }

    const admin = await verifyAdminCredentials(email, password);
    if (!admin) {
      reply.code(401);
      return {
        error: "Credenciales inválidas.",
      };
    }

    clearLoginAttempts(loginKey);
    await updateAdminLastLogin(admin.id);
    const session = await createAdminSession(admin.id);
    reply.header("set-cookie", buildAdminSessionCookie(session.token));

    return {
      item: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLoginAt: new Date().toISOString(),
      },
    };
  });

  app.get("/me", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      reply.header("set-cookie", clearAdminSessionCookie());
      return {
        error: "Necesitas iniciar sesión de admin.",
      };
    }

    return {
      item: admin,
    };
  });

  app.post("/logout", async (request, reply) => {
    const cookieHeader = request.headers.cookie ?? "";
    const tokenMatch = cookieHeader
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("admin_session="));
    if (tokenMatch) {
      const token = decodeURIComponent(tokenMatch.slice("admin_session=".length));
      await revokeAdminSession(token);
    }

    reply.header("set-cookie", clearAdminSessionCookie());

    return {
      ok: true,
    };
  });
}
