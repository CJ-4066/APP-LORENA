import { createHmac, randomBytes, randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";

import { query, isDatabaseConfigured } from "../infrastructure/database.js";
import { getAppEnv } from "../infrastructure/env.js";

type AdminRole = "admin";

export type AdminUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

type AdminSessionRecord = {
  tokenHash: string;
  adminUserId: string;
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string;
};

type AdminUserRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  last_login_at: Date | string | null;
};

type AdminSessionRow = {
  token_hash: string;
  admin_user_id: string;
  expires_at: Date | string;
  created_at: Date | string;
  last_used_at: Date | string;
};

const mockAdminUsers = new Map<string, AdminUserRecord>();
const mockAdminSessions = new Map<string, AdminSessionRecord>();

let adminSeedPromise: Promise<void> | null = null;
let adminSeedInitialized = false;

function toIsoString(value: Date | string | null): string | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function hashSessionToken(token: string): string {
  return createHmac("sha256", getAppEnv().adminJwtSecret)
    .update(token)
    .digest("hex");
}

function buildAdminRecord(row: AdminUserRow): AdminUserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    name: row.name,
    role: row.role === "admin" ? "admin" : "admin",
    isActive: row.is_active,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
    lastLoginAt: toIsoString(row.last_login_at),
  };
}

async function ensureAdminSeeded(): Promise<void> {
  if (adminSeedInitialized) {
    return;
  }

  if (!adminSeedPromise) {
    adminSeedPromise = (async () => {
      const env = getAppEnv();
      if (!env.adminEmail || !env.adminPassword) {
        return;
      }

      const email = normalizeEmail(env.adminEmail);
      const adminId = `admin-${email.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "root"}`;
      const passwordHash = await bcrypt.hash(env.adminPassword, 12);
      const now = new Date().toISOString();
      const record: AdminUserRecord = {
        id: adminId,
        email,
        passwordHash,
        name: env.adminName || "Administrador",
        role: "admin",
        isActive: true,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
      };

      if (!isDatabaseConfigured()) {
        mockAdminUsers.set(email, record);
        return;
      }

      await query(
        `
          insert into admin_users (
            id,
            email,
            password_hash,
            name,
            role,
            is_active,
            created_at,
            updated_at
          ) values ($1, $2, $3, $4, $5, true, now(), now())
          on conflict (email) do update
            set password_hash = excluded.password_hash,
                name = excluded.name,
                role = excluded.role,
                is_active = true,
                updated_at = now()
        `,
        [record.id, record.email, record.passwordHash, record.name, record.role],
      );
    })().finally(() => {
      adminSeedPromise = null;
      adminSeedInitialized = true;
    });
  }

  await adminSeedPromise;
}

export async function getAdminUserByEmail(email: string): Promise<AdminUserRecord | null> {
  await ensureAdminSeeded();
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return null;
  }

  if (!isDatabaseConfigured()) {
    return mockAdminUsers.get(normalized) ?? null;
  }

  const result = await query<AdminUserRow>(
    `
      select
        id,
        email,
        password_hash,
        name,
        role,
        is_active,
        created_at,
        updated_at,
        last_login_at
      from admin_users
      where email = $1
      limit 1
    `,
    [normalized],
  );

  return result.rows[0] ? buildAdminRecord(result.rows[0]) : null;
}

export async function getAdminUserById(id: string): Promise<AdminUserRecord | null> {
  await ensureAdminSeeded();
  const normalized = id.trim();
  if (!normalized) {
    return null;
  }

  if (!isDatabaseConfigured()) {
    for (const admin of mockAdminUsers.values()) {
      if (admin.id === normalized) {
        return admin;
      }
    }
    return null;
  }

  const result = await query<AdminUserRow>(
    `
      select
        id,
        email,
        password_hash,
        name,
        role,
        is_active,
        created_at,
        updated_at,
        last_login_at
      from admin_users
      where id = $1
      limit 1
    `,
    [normalized],
  );

  return result.rows[0] ? buildAdminRecord(result.rows[0]) : null;
}

export async function verifyAdminCredentials(
  email: string,
  password: string,
): Promise<AdminUserRecord | null> {
  const admin = await getAdminUserByEmail(email);
  if (!admin || !admin.isActive) {
    return null;
  }

  const matches = await bcrypt.compare(password, admin.passwordHash);
  return matches ? admin : null;
}

export async function updateAdminLastLogin(adminId: string): Promise<void> {
  const normalized = adminId.trim();
  if (!normalized) {
    return;
  }

  if (!isDatabaseConfigured()) {
    for (const admin of mockAdminUsers.values()) {
      if (admin.id === normalized) {
        admin.lastLoginAt = new Date().toISOString();
        admin.updatedAt = new Date().toISOString();
      }
    }
    return;
  }

  await query(
    `
      update admin_users
      set last_login_at = now(),
          updated_at = now()
      where id = $1
    `,
    [normalized],
  );
}

export async function createAdminSession(adminId: string): Promise<{
  token: string;
  expiresAt: string;
}> {
  const env = getAppEnv();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(
    Date.now() + env.adminSessionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const now = new Date().toISOString();

  if (!isDatabaseConfigured()) {
    mockAdminSessions.set(tokenHash, {
      tokenHash,
      adminUserId: adminId,
      expiresAt,
      createdAt: now,
      lastUsedAt: now,
    });
    return { token, expiresAt };
  }

  await query(
    `
      insert into admin_sessions (
        token_hash,
        admin_user_id,
        expires_at,
        created_at,
        last_used_at
      ) values ($1, $2, $3::timestamptz, now(), now())
    `,
    [tokenHash, adminId, expiresAt],
  );

  return { token, expiresAt };
}

export async function getAdminUserBySessionToken(
  token: string,
): Promise<AdminUserRecord | null> {
  await ensureAdminSeeded();
  const normalized = token.trim();
  if (!normalized) {
    return null;
  }

  const tokenHash = hashSessionToken(normalized);
  const now = Date.now();

  if (!isDatabaseConfigured()) {
    const session = mockAdminSessions.get(tokenHash) ?? null;
    if (!session || new Date(session.expiresAt).getTime() <= now) {
      if (session) {
        mockAdminSessions.delete(tokenHash);
      }
      return null;
    }

    session.lastUsedAt = new Date().toISOString();
    const admin =
      [...mockAdminUsers.values()].find((item) => item.id === session.adminUserId) ?? null;
    return admin?.isActive ? admin : null;
  }

  const result = await query<AdminSessionRow>(
    `
      select
        token_hash,
        admin_user_id,
        expires_at,
        created_at,
        last_used_at
      from admin_sessions
      where token_hash = $1
      limit 1
    `,
    [tokenHash],
  );
  const session = result.rows[0];
  if (!session || new Date(session.expires_at).getTime() <= now) {
    await query(`delete from admin_sessions where token_hash = $1`, [tokenHash]).catch(
      () => undefined,
    );
    return null;
  }

  await query(
    `
      update admin_sessions
      set last_used_at = now()
      where token_hash = $1
    `,
    [tokenHash],
  ).catch(() => undefined);

  const admin = await getAdminUserById(session.admin_user_id);
  return admin?.isActive ? admin : null;
}

export async function revokeAdminSession(token: string): Promise<void> {
  const normalized = token.trim();
  if (!normalized) {
    return;
  }

  const tokenHash = hashSessionToken(normalized);
  if (!isDatabaseConfigured()) {
    mockAdminSessions.delete(tokenHash);
    return;
  }

  await query(`delete from admin_sessions where token_hash = $1`, [tokenHash]).catch(
    () => undefined,
  );
}

export function buildAdminSessionCookie(token: string): string {
  const env = getAppEnv();
  const secure = env.nodeEnv === "production";
  const maxAgeSeconds = env.adminSessionDays * 24 * 60 * 60;
  const parts = [
    `admin_session=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function clearAdminSessionCookie(): string {
  const secure = getAppEnv().nodeEnv === "production";
  const parts = [
    "admin_session=",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];

  if (secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function readAdminSessionToken(cookieHeader?: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const entries = cookieHeader.split(";").map((item) => item.trim());
  for (const entry of entries) {
    const [key, ...rest] = entry.split("=");
    if (key === "admin_session") {
      return decodeURIComponent(rest.join("="));
    }
  }

  return null;
}

export async function bootstrapAdminAuth(): Promise<void> {
  await ensureAdminSeeded();
}

export function getAdminAuthDebugState(): {
  adminUsers: AdminUserRecord[];
  sessions: AdminSessionRecord[];
} {
  return {
    adminUsers: [...mockAdminUsers.values()],
    sessions: [...mockAdminSessions.values()],
  };
}
