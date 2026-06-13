import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";

import { isDatabaseConfigured, query } from "../infrastructure/database.js";
import { type UserRole } from "./authz-store.js";
import {
  getAdminSummary as getAdminSummaryMock,
  getBookings as getBookingsMock,
  getProfile as getProfileMock,
  createAdminUser as createAdminUserMock,
  listAdminUsers as listAdminUsersMock,
  updateAdminUser as updateAdminUserMock,
  getSpecialists,
  type BookingStatus,
  type SessionMode,
} from "./mock-store.js";

export interface AdminDashboardSummary {
  activeUsers: number;
  premiumSubscribers: number;
  monthlyBookings: number;
  activeSpecialists: number;
  openIncidents: number;
  openChatThreads: number;
  registeredPushDevices: number;
  pendingPaymentBookings: number;
}

export interface AdminRecentBooking {
  id: string;
  userId: string;
  userName: string;
  specialistId: string;
  specialistName: string;
  serviceName: string;
  scheduledAt: string;
  status: BookingStatus;
  mode: SessionMode;
}

export interface AdminRecentUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  planId: string;
  profileCompleted: boolean;
  createdAt: string;
  roles: UserRole[];
  accountType: "client" | "specialist";
  access: string[];
}

export interface AdminUserDraftInput {
  firstName?: string;
  lastName?: string;
  nickname?: string;
  email?: string;
  phoneNumber?: string;
  planId?: string;
  accountType?: "client" | "specialist";
  roles?: UserRole[];
  profileCompleted?: boolean;
}

export interface AdminChatOverview {
  totalThreads: number;
  openThreads: number;
  totalMessages: number;
  recentThreads: Array<{
    id: string;
    userId: string;
    userName: string;
    specialistId: string;
    specialistName: string;
    status: string;
    lastMessageAt: string | null;
    lastMessagePreview: string;
  }>;
}

interface SummaryRow extends QueryResultRow {
  active_users: string;
  premium_subscribers: string;
  monthly_bookings: string;
  open_chat_threads: string;
  registered_push_devices: string;
  pending_payment_bookings: string;
}

interface AdminBookingRow extends QueryResultRow {
  id: string;
  user_id: string;
  user_name: string;
  specialist_id: string;
  specialist_name: string;
  service_name: string;
  scheduled_at: Date | string;
  status: BookingStatus;
  mode: SessionMode;
}

interface AdminUserRow extends QueryResultRow {
  id: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  plan_id: string;
  profile_completed: boolean | null;
  created_at: Date | string;
  roles: string[];
  account_type: string;
}

interface ChatCountsRow extends QueryResultRow {
  total_threads: string;
  open_threads: string;
  total_messages: string;
}

interface AdminThreadRow extends QueryResultRow {
  id: string;
  user_id: string;
  user_name: string;
  specialist_id: string;
  status: string;
  last_message_at: Date | string | null;
  last_message_preview: string | null;
}

function toIsoString(value: Date | string | null): string | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toISOString();
}

function getSpecialistName(specialistId: string): string {
  return getSpecialists().find((item) => item.id === specialistId)?.name ?? specialistId;
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  if (!isDatabaseConfigured()) {
    const summary = getAdminSummaryMock();
    return {
      activeUsers: summary.activeUsers,
      premiumSubscribers: summary.premiumSubscribers,
      monthlyBookings: summary.monthlyBookings,
      activeSpecialists: summary.activeSpecialists,
      openIncidents: summary.openIncidents,
      openChatThreads: 1,
      registeredPushDevices: 0,
      pendingPaymentBookings: getBookingsMock().filter(
        (item) => item.status === "pending_payment",
      ).length,
    };
  }

  const result = await query<SummaryRow>(
    `
      select
        (select count(*)::text from users) as active_users,
        (
          select count(distinct user_id)::text
          from user_subscriptions
          where plan_id = 'premium'
            and status = 'active'
        ) as premium_subscribers,
        (
          select count(*)::text
          from bookings
          where date_trunc('month', scheduled_at) = date_trunc('month', now())
        ) as monthly_bookings,
        (select count(*)::text from chat_threads where status = 'open') as open_chat_threads,
        (select count(*)::text from push_devices) as registered_push_devices,
        (
          select count(*)::text
          from bookings
          where status = 'pending_payment'
        ) as pending_payment_bookings
    `,
  );
  const row = result.rows[0];

  return {
    activeUsers: Number(row.active_users),
    premiumSubscribers: Number(row.premium_subscribers),
    monthlyBookings: Number(row.monthly_bookings),
    activeSpecialists: getSpecialists().length,
    openIncidents: 0,
    openChatThreads: Number(row.open_chat_threads),
    registeredPushDevices: Number(row.registered_push_devices),
    pendingPaymentBookings: Number(row.pending_payment_bookings),
  };
}

export async function getAdminRecentBookings(limit = 10): Promise<AdminRecentBooking[]> {
  const safeLimit = Math.max(1, Math.min(limit, 50));

  if (!isDatabaseConfigured()) {
    const user = getProfileMock();
    const userName = `${user.firstName} ${user.lastName}`.trim() || user.nickname || user.id;

    return getBookingsMock()
      .slice()
      .sort((left, right) => right.scheduledAt.localeCompare(left.scheduledAt))
      .slice(0, safeLimit)
      .map((booking) => ({
        id: booking.id,
        userId: booking.userId,
        userName,
        specialistId: booking.specialistId,
        specialistName: booking.specialistName,
        serviceName: booking.serviceName,
        scheduledAt: booking.scheduledAt,
        status: booking.status,
        mode: booking.mode,
      }));
  }

  const result = await query<AdminBookingRow>(
    `
      select
        b.id,
        b.user_id,
        coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.nickname, u.email, b.user_id) as user_name,
        b.specialist_id,
        b.specialist_name,
        b.service_name,
        b.scheduled_at,
        b.status,
        b.mode
      from bookings b
      left join users u on u.id = b.user_id
      order by b.scheduled_at desc
      limit $1
    `,
    [safeLimit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    specialistId: row.specialist_id,
    specialistName: row.specialist_name,
    serviceName: row.service_name,
    scheduledAt: toIsoString(row.scheduled_at) ?? "",
    status: row.status,
    mode: row.mode,
  }));
}

function buildAdminUserAccess(accountType: "client" | "specialist", roles: UserRole[]): string[] {
  const accessByRole: Record<"client" | "specialist" | "admin", string[]> = {
    client: ["Inicio", "Perfil", "Reservas", "Tienda"],
    specialist: ["Especialistas", "Servicios", "Agenda", "Tienda"],
    admin: ["Resumen", "Usuarios", "Especialistas", "Servicios", "Agenda", "Tienda", "Cursos", "Biblioteca", "Auditoría"],
  };

  const access = new Set<string>(accessByRole[accountType]);
  for (const role of roles) {
    for (const item of accessByRole[role]) {
      access.add(item);
    }
  }

  return [...access];
}

export async function getAdminRecentUsers(
  limit = 10,
  options: { role?: "client" | UserRole; search?: string } = {},
): Promise<AdminRecentUser[]> {
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const search = options.search?.trim().toLowerCase() ?? "";

  if (!isDatabaseConfigured()) {
    return listAdminUsersMock({
      limit: safeLimit,
      role: options.role,
      search,
    });
  }

  const result = await query<AdminUserRow & { roles: UserRole[] }>(
    `
      select
        u.id,
        coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.nickname, u.email, u.id) as full_name,
        u.email,
        i.phone_number,
        u.plan_id,
        i.profile_completed,
        u.created_at,
        u.account_type,
        coalesce(
          array_agg(distinct r.role) filter (where r.role is not null),
          '{}'::text[]
        ) as roles
      from users u
      left join phone_auth_identities i on i.user_id = u.id
      left join user_roles r on r.user_id = u.id
      where (
        $2 = '' or
        coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.nickname, u.email, u.id) ilike $2 or
        u.id ilike $2 or
        u.email ilike $2 or
        coalesce(i.phone_number, '') ilike $2
      )
      and (
        $3 is null or
        (
          $3 = 'client' and not exists (
            select 1 from user_roles ur where ur.user_id = u.id
          )
        ) or
        (
          $3 <> 'client' and exists (
            select 1 from user_roles ur where ur.user_id = u.id and ur.role = $3
          )
        )
      )
      group by u.id, i.phone_number, i.profile_completed
      order by u.created_at desc
      limit $1
    `,
    [safeLimit, search.length > 0 ? `%${search}%` : "", options.role ?? null],
  );

  return result.rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phoneNumber: row.phone_number ?? "",
    planId: row.plan_id,
    profileCompleted: row.profile_completed ?? false,
    createdAt: toIsoString(row.created_at) ?? "",
    roles: (row.roles ?? []).filter(
      (role): role is UserRole => role === "admin" || role === "specialist",
    ),
    accountType: row.account_type === "specialist" ? "specialist" : "client",
    access: buildAdminUserAccess(
      row.account_type === "specialist" ? "specialist" : "client",
      (row.roles ?? []).filter(
        (role): role is UserRole => role === "admin" || role === "specialist",
      ),
    ),
  }));
}

export async function createAdminUser(
  input: AdminUserDraftInput,
): Promise<AdminRecentUser> {
  if (!isDatabaseConfigured()) {
    return createAdminUserMock(input);
  }

  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";
  const nickname = input.nickname?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const phoneNumber = input.phoneNumber?.trim() ?? "";
  const planId = input.planId?.trim() || "free";
  const accountType = input.accountType ?? "client";
  const roles = Array.from(new Set((input.roles ?? []).filter((role): role is UserRole => role === "admin" || role === "specialist")));

  if (firstName.length === 0) {
    throw new Error("Ingresa un nombre válido.");
  }
  if (email.length === 0) {
    throw new Error("Ingresa un email válido.");
  }

  const result = await query<{ id: string }>(
    `
      insert into users (
        id,
        first_name,
        last_name,
        nickname,
        email,
        avatar_url,
        location,
        timezone,
        zodiac_sign,
        plan_id,
        subject_name,
        birth_date,
        birth_time,
        birth_time_unknown,
        city,
        state,
        country,
        time_zone_id,
        utc_offset,
        latitude,
        longitude,
        focus_areas,
        preferred_session_modes,
        receives_push,
        account_type
      ) values (
        $7,
        $1, $2, $3, $4, '', '', 'America/Lima', '', $5, $1, '', '', true, '', '', '', '', '', null, null, '[]'::jsonb, '[]'::jsonb, true, $6
      )
      returning id
    `,
    [firstName, lastName, nickname, email, planId, accountType, randomUUID()],
  );

  const userId = result.rows[0]?.id;
  if (!userId) {
    throw new Error("No se pudo crear el usuario.");
  }

  if (phoneNumber.length > 0) {
    await query(
      `
        insert into phone_auth_identities (
          phone_number,
          user_id,
          country_code,
          dial_code,
          profile_completed
        ) values ($1, $2, '', '', $3)
        on conflict (phone_number) do update set
          user_id = excluded.user_id,
          profile_completed = excluded.profile_completed,
          updated_at = now()
      `,
      [phoneNumber, userId, Boolean(input.profileCompleted)],
    );
  }

  await query(
    `delete from user_roles where user_id = $1`,
    [userId],
  );

  for (const role of roles) {
    await query(
      `insert into user_roles (user_id, role) values ($1, $2) on conflict do nothing`,
      [userId, role],
    );
  }

  const [createdUser] = await getAdminRecentUsers(1, { search: userId });
  if (createdUser && createdUser.email.toLowerCase() === email) {
    return createdUser;
  }

  return {
    id: userId,
    fullName: `${firstName} ${lastName}`.trim() || nickname || email,
    email,
    phoneNumber,
    planId,
    profileCompleted: Boolean(input.profileCompleted),
    createdAt: new Date().toISOString(),
    roles,
    accountType,
    access: buildAdminUserAccess(accountType, roles),
  };
}

export async function updateAdminUser(
  userId: string,
  input: AdminUserDraftInput,
): Promise<AdminRecentUser> {
  if (!isDatabaseConfigured()) {
    return updateAdminUserMock(userId, input);
  }

  const existing = await query<{ id: string }>(
    `select id from users where id = $1`,
    [userId],
  );
  if (!existing.rows[0]) {
    throw new Error("El usuario no existe.");
  }

  const firstName = input.firstName?.trim();
  const lastName = input.lastName?.trim();
  const nickname = input.nickname?.trim();
  const email = input.email?.trim().toLowerCase();
  const phoneNumber = input.phoneNumber?.trim();
  const planId = input.planId?.trim();
  const accountType = input.accountType;
  const roles = input.roles
    ? Array.from(new Set(input.roles.filter((role): role is UserRole => role === "admin" || role === "specialist")))
    : null;

  await query(
    `
      update users
      set
        first_name = coalesce($2, first_name),
        last_name = coalesce($3, last_name),
        nickname = coalesce($4, nickname),
        email = coalesce($5, email),
        plan_id = coalesce($6, plan_id),
        account_type = coalesce($7, account_type),
        updated_at = now()
      where id = $1
    `,
    [userId, firstName ?? null, lastName ?? null, nickname ?? null, email ?? null, planId ?? null, accountType ?? null],
  );

  if (phoneNumber !== undefined) {
    await query(
      `
        update phone_auth_identities
        set phone_number = $2,
            profile_completed = coalesce($3, profile_completed),
            updated_at = now()
        where user_id = $1
      `,
      [userId, phoneNumber, input.profileCompleted ?? null],
    );
  }

  if (roles) {
    await query(`delete from user_roles where user_id = $1`, [userId]);
    for (const role of roles) {
      await query(
        `insert into user_roles (user_id, role) values ($1, $2) on conflict do nothing`,
        [userId, role],
      );
    }
  }

  const updated = await getAdminRecentUsers(1, { search: userId });
  const current = updated.find((item) => item.id === userId);
  if (!current) {
    throw new Error("No se pudo actualizar el usuario.");
  }

  return current;
}

export async function getAdminChatOverview(limit = 10): Promise<AdminChatOverview> {
  const safeLimit = Math.max(1, Math.min(limit, 50));

  if (!isDatabaseConfigured()) {
    return {
      totalThreads: 1,
      openThreads: 1,
      totalMessages: 2,
      recentThreads: [
        {
          id: "thread-demo-amaya",
          userId: "user-mark",
          userName: "Mark Lore",
          specialistId: "spec-amaya",
          specialistName: getSpecialistName("spec-amaya"),
          status: "open",
          lastMessageAt: "2026-03-24T15:06:00.000Z",
          lastMessagePreview: "Perfecto, quiero enfocarme en claridad laboral y vínculos.",
        },
      ],
    };
  }

  const [countsResult, threadsResult] = await Promise.all([
    query<ChatCountsRow>(
      `
        select
          (select count(*)::text from chat_threads) as total_threads,
          (select count(*)::text from chat_threads where status = 'open') as open_threads,
          (select count(*)::text from chat_messages) as total_messages
      `,
    ),
    query<AdminThreadRow>(
      `
        select
          t.id,
          t.user_id,
          coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.nickname, u.email, t.user_id) as user_name,
          t.specialist_id,
          t.status,
          (
            select m.created_at
            from chat_messages m
            where m.thread_id = t.id
            order by m.created_at desc
            limit 1
          ) as last_message_at,
          (
            select m.body
            from chat_messages m
            where m.thread_id = t.id
            order by m.created_at desc
            limit 1
          ) as last_message_preview
        from chat_threads t
        left join users u on u.id = t.user_id
        order by coalesce(
          (
            select m.created_at
            from chat_messages m
            where m.thread_id = t.id
            order by m.created_at desc
            limit 1
          ),
          t.updated_at
        ) desc
        limit $1
      `,
      [safeLimit],
    ),
  ]);

  const counts = countsResult.rows[0];
  return {
    totalThreads: Number(counts.total_threads),
    openThreads: Number(counts.open_threads),
    totalMessages: Number(counts.total_messages),
    recentThreads: threadsResult.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      specialistId: row.specialist_id,
      specialistName: getSpecialistName(row.specialist_id),
      status: row.status,
      lastMessageAt: toIsoString(row.last_message_at),
      lastMessagePreview: row.last_message_preview ?? "",
    })),
  };
}
