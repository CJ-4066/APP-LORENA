import { randomUUID } from "node:crypto";

import type { PoolClient, QueryResultRow } from "pg";

import {
  isDatabaseConfigured,
  query,
  withTransaction,
} from "../infrastructure/database.js";
import { getProfile } from "./persistent-store.js";

const demoUserId = "user-mark";

export type SupportTicketStatus =
  | "open"
  | "in_review"
  | "responded"
  | "closed";
export type SupportTicketPriority = "low" | "normal" | "high";
export type SupportMessageAuthorType = "user" | "admin" | "system";

export interface SupportTicketSummary {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  subject: string;
  category: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  authorType: SupportMessageAuthorType;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface SupportTicketDetail {
  ticket: SupportTicketSummary;
  messages: SupportTicketMessage[];
}

export interface SupportOverview {
  summary: {
    total: number;
    open: number;
    inReview: number;
    responded: number;
    closed: number;
  };
  items: SupportTicketSummary[];
}

export interface CreateSupportTicketInput {
  subject?: string;
  category?: string;
  body?: string;
}

export interface CreateSupportMessageInput {
  body?: string;
}

export interface UpdateSupportTicketInput {
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
}

interface SupportTicketRow extends QueryResultRow {
  id: string;
  ticket_number: string;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  subject: string;
  category: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  created_at: Date | string;
  updated_at: Date | string;
  last_message_preview?: string | null;
  last_message_at?: Date | string | null;
  message_count?: string | number | null;
}

interface SupportMessageRow extends QueryResultRow {
  id: string;
  ticket_id: string;
  author_type: SupportMessageAuthorType;
  author_id: string;
  author_name: string;
  body: string;
  created_at: Date | string;
}

interface SupportTicketRecord {
  id: string;
  ticketNumber: string;
  userId: string;
  subject: string;
  category: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdAt: string;
  updatedAt: string;
}

const mockTickets: SupportTicketRecord[] = [
  {
    id: "support-demo-1",
    ticketNumber: "LR-260401-001",
    userId: demoUserId,
    subject: "Consulta sobre mi acceso Premium",
    category: "premium",
    status: "open",
    priority: "normal",
    createdAt: "2026-04-01T14:05:00.000Z",
    updatedAt: "2026-04-01T14:05:00.000Z",
  },
];

const mockMessages: SupportTicketMessage[] = [
  {
    id: "support-demo-1-msg-1",
    ticketId: "support-demo-1",
    authorType: "user",
    authorId: demoUserId,
    authorName: "Mark Lore",
    body: "Hola, quiero confirmar si mi Premium quedó activado correctamente.",
    createdAt: "2026-04-01T14:05:00.000Z",
  },
];

function toIsoString(value: Date | string | null | undefined): string | null {
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

function buildPreview(body: string): string {
  const normalized = body.trim();
  if (normalized.length <= 120) {
    return normalized;
  }

  return `${normalized.slice(0, 117)}...`;
}

function resolveUserName(profile: Awaited<ReturnType<typeof getProfile>>): string {
  const fullName = [profile.firstName, profile.lastName]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" ");
  return fullName || profile.nickname || profile.email || profile.id;
}

function normalizeSubject(value?: string): string {
  const subject = value?.trim() ?? "";
  if (subject.length < 3) {
    throw new Error("Describe brevemente el motivo del soporte.");
  }
  if (subject.length > 140) {
    throw new Error("El asunto de soporte es demasiado largo.");
  }
  return subject;
}

function normalizeCategory(value?: string): string {
  const category = value?.trim().toLowerCase() ?? "";
  if (!category) {
    return "general";
  }
  if (!/^[a-z0-9_-]{2,40}$/u.test(category)) {
    throw new Error("La categoría de soporte no es válida.");
  }
  return category;
}

function normalizeMessageBody(value?: string): string {
  const body = value?.trim() ?? "";
  if (body.length < 1) {
    throw new Error("Escribe un mensaje para soporte.");
  }
  if (body.length > 4000) {
    throw new Error("El mensaje de soporte es demasiado largo.");
  }
  return body;
}

function normalizeStatus(value?: SupportTicketStatus): SupportTicketStatus | null {
  if (value == null) {
    return null;
  }
  if (
    value !== "open" &&
    value !== "in_review" &&
    value !== "responded" &&
    value !== "closed"
  ) {
    throw new Error("El estado del ticket no es válido.");
  }
  return value;
}

function normalizePriority(
  value?: SupportTicketPriority,
): SupportTicketPriority | null {
  if (value == null) {
    return null;
  }
  if (value !== "low" && value !== "normal" && value !== "high") {
    throw new Error("La prioridad del ticket no es válida.");
  }
  return value;
}

function buildTicketNumber(sequence: number): string {
  const now = new Date();
  const date = now
    .toISOString()
    .slice(2, 10)
    .replace(/-/g, "");
  return `LR-${date}-${String(sequence).padStart(3, "0")}`;
}

function mapTicketRow(row: SupportTicketRow): SupportTicketSummary {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    userId: row.user_id,
    userName: row.user_name,
    userAvatarUrl: row.user_avatar_url ?? null,
    subject: row.subject,
    category: row.category,
    status: row.status,
    priority: row.priority,
    lastMessagePreview: buildPreview(row.last_message_preview ?? ""),
    lastMessageAt: toIsoString(row.last_message_at),
    messageCount: Number(row.message_count ?? 0),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapMessageRow(row: SupportMessageRow): SupportTicketMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorType: row.author_type,
    authorId: row.author_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
  };
}

async function buildMockTicketSummary(
  ticket: SupportTicketRecord,
): Promise<SupportTicketSummary> {
  const messages = mockMessages
    .filter((message) => message.ticketId === ticket.id)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const lastMessage = messages[messages.length - 1] ?? null;
  let userName = ticket.userId;
  let userAvatarUrl: string | null = null;
  try {
    const profile = await getProfile(ticket.userId);
    userName = resolveUserName(profile);
    userAvatarUrl = profile.avatarUrl?.trim() || null;
  } catch {
    userName = ticket.userId;
  }

  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    userId: ticket.userId,
    userName,
    userAvatarUrl,
    subject: ticket.subject,
    category: ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    lastMessagePreview: buildPreview(lastMessage?.body ?? ""),
    lastMessageAt: lastMessage?.createdAt ?? null,
    messageCount: messages.length,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

async function getTicketRowById(
  ticketId: string,
  userId?: string,
  runner?: Pick<PoolClient, "query">,
): Promise<SupportTicketRow | null> {
  const execute = runner ? runner.query.bind(runner) : query;
  const result = await execute<SupportTicketRow>(
    `
      select
        t.id,
        t.ticket_number,
        t.user_id,
        coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.nickname, u.email, t.user_id) as user_name,
        nullif(u.avatar_url, '') as user_avatar_url,
        t.subject,
        t.category,
        t.status,
        t.priority,
        t.created_at,
        t.updated_at,
        (
          select m.body
          from support_ticket_messages m
          where m.ticket_id = t.id
          order by m.created_at desc
          limit 1
        ) as last_message_preview,
        (
          select m.created_at
          from support_ticket_messages m
          where m.ticket_id = t.id
          order by m.created_at desc
          limit 1
        ) as last_message_at,
        (
          select count(*)::text
          from support_ticket_messages m
          where m.ticket_id = t.id
        ) as message_count
      from support_tickets t
      left join users u on u.id = t.user_id
      where t.id = $1
        and ($2::text is null or t.user_id = $2)
      limit 1
    `,
    [ticketId, userId ?? null],
  );

  return result.rows[0] ?? null;
}

async function getTicketMessages(
  ticketId: string,
  runner?: Pick<PoolClient, "query">,
): Promise<SupportTicketMessage[]> {
  const execute = runner ? runner.query.bind(runner) : query;
  const result = await execute<SupportMessageRow>(
    `
      select id, ticket_id, author_type, author_id, author_name, body, created_at
      from support_ticket_messages
      where ticket_id = $1
      order by created_at asc
    `,
    [ticketId],
  );

  return result.rows.map(mapMessageRow);
}

export async function listSupportTickets(
  options: { userId?: string; limit?: number } = {},
): Promise<SupportTicketSummary[]> {
  const safeLimit = Math.max(1, Math.min(options.limit ?? 50, 100));

  if (!isDatabaseConfigured()) {
    const summaries = await Promise.all(
      mockTickets
        .filter((ticket) => !options.userId || ticket.userId === options.userId)
        .map(buildMockTicketSummary),
    );
    return summaries
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, safeLimit);
  }

  const result = await query<SupportTicketRow>(
    `
      select
        t.id,
        t.ticket_number,
        t.user_id,
        coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.nickname, u.email, t.user_id) as user_name,
        nullif(u.avatar_url, '') as user_avatar_url,
        t.subject,
        t.category,
        t.status,
        t.priority,
        t.created_at,
        t.updated_at,
        (
          select m.body
          from support_ticket_messages m
          where m.ticket_id = t.id
          order by m.created_at desc
          limit 1
        ) as last_message_preview,
        (
          select m.created_at
          from support_ticket_messages m
          where m.ticket_id = t.id
          order by m.created_at desc
          limit 1
        ) as last_message_at,
        (
          select count(*)::text
          from support_ticket_messages m
          where m.ticket_id = t.id
        ) as message_count
      from support_tickets t
      left join users u on u.id = t.user_id
      where ($2::text is null or t.user_id = $2)
      order by t.updated_at desc
      limit $1
    `,
    [safeLimit, options.userId ?? null],
  );

  return result.rows.map(mapTicketRow);
}

export async function getSupportOverview(limit = 50): Promise<SupportOverview> {
  const items = await listSupportTickets({ limit });
  if (isDatabaseConfigured()) {
    const result = await query<{
      total: string;
      open: string;
      in_review: string;
      responded: string;
      closed: string;
    }>(
      `
        select
          count(*)::text as total,
          count(*) filter (where status = 'open')::text as open,
          count(*) filter (where status = 'in_review')::text as in_review,
          count(*) filter (where status = 'responded')::text as responded,
          count(*) filter (where status = 'closed')::text as closed
        from support_tickets
      `,
    );
    const row = result.rows[0];
    return {
      summary: {
        total: Number(row?.total ?? 0),
        open: Number(row?.open ?? 0),
        inReview: Number(row?.in_review ?? 0),
        responded: Number(row?.responded ?? 0),
        closed: Number(row?.closed ?? 0),
      },
      items,
    };
  }

  return {
    summary: {
      total: items.length,
      open: items.filter((item) => item.status === "open").length,
      inReview: items.filter((item) => item.status === "in_review").length,
      responded: items.filter((item) => item.status === "responded").length,
      closed: items.filter((item) => item.status === "closed").length,
    },
    items,
  };
}

export async function countOpenSupportTickets(): Promise<number> {
  if (!isDatabaseConfigured()) {
    return mockTickets.filter((ticket) => ticket.status !== "closed").length;
  }

  const result = await query<{ open_count: string }>(
    `
      select count(*)::text as open_count
      from support_tickets
      where status <> 'closed'
    `,
  );

  return Number(result.rows[0]?.open_count ?? 0);
}

export async function getSupportTicket(
  ticketId: string,
  userId?: string,
): Promise<SupportTicketDetail> {
  if (!isDatabaseConfigured()) {
    const ticket = mockTickets.find(
      (item) => item.id === ticketId && (!userId || item.userId === userId),
    );
    if (!ticket) {
      throw new Error("El ticket de soporte no existe.");
    }

    return {
      ticket: await buildMockTicketSummary(ticket),
      messages: mockMessages
        .filter((message) => message.ticketId === ticket.id)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    };
  }

  const ticket = await getTicketRowById(ticketId, userId);
  if (!ticket) {
    throw new Error("El ticket de soporte no existe.");
  }

  return {
    ticket: mapTicketRow(ticket),
    messages: await getTicketMessages(ticketId),
  };
}

export async function createSupportTicket(
  input: CreateSupportTicketInput,
  userId?: string,
): Promise<SupportTicketDetail> {
  const resolvedUserId = userId ?? demoUserId;
  const subject = normalizeSubject(input.subject);
  const category = normalizeCategory(input.category);
  const body = normalizeMessageBody(input.body);
  const profile = await getProfile(resolvedUserId);
  const authorName = resolveUserName(profile);

  if (!isDatabaseConfigured()) {
    const now = new Date().toISOString();
    const ticket: SupportTicketRecord = {
      id: randomUUID(),
      ticketNumber: buildTicketNumber(mockTickets.length + 1),
      userId: resolvedUserId,
      subject,
      category,
      status: "open",
      priority: "normal",
      createdAt: now,
      updatedAt: now,
    };
    mockTickets.unshift(ticket);
    mockMessages.push({
      id: randomUUID(),
      ticketId: ticket.id,
      authorType: "user",
      authorId: resolvedUserId,
      authorName,
      body,
      createdAt: now,
    });
    return getSupportTicket(ticket.id, resolvedUserId);
  }

  return withTransaction(async (client) => {
    const countResult = await client.query<{ count: string }>(
      `select count(*)::text as count from support_tickets`,
    );
    const ticketId = randomUUID();
    const ticketNumber = buildTicketNumber(
      Number(countResult.rows[0]?.count ?? 0) + 1,
    );
    await client.query(
      `
        insert into support_tickets (
          id,
          ticket_number,
          user_id,
          subject,
          category,
          status,
          priority
        ) values ($1, $2, $3, $4, $5, 'open', 'normal')
      `,
      [ticketId, ticketNumber, resolvedUserId, subject, category],
    );
    await client.query(
      `
        insert into support_ticket_messages (
          id,
          ticket_id,
          author_type,
          author_id,
          author_name,
          body
        ) values ($1, $2, 'user', $3, $4, $5)
      `,
      [randomUUID(), ticketId, resolvedUserId, authorName, body],
    );

    const row = await getTicketRowById(ticketId, resolvedUserId, client);
    if (!row) {
      throw new Error("No se pudo crear el ticket de soporte.");
    }

    return {
      ticket: mapTicketRow(row),
      messages: await getTicketMessages(ticketId, client),
    };
  });
}

export async function createSupportTicketMessage(
  ticketId: string,
  input: CreateSupportMessageInput,
  actor: {
    type: SupportMessageAuthorType;
    id: string;
    name: string;
    userIdScope?: string;
  },
): Promise<SupportTicketDetail> {
  const body = normalizeMessageBody(input.body);
  const authorName = actor.name.trim() || actor.id;

  if (!isDatabaseConfigured()) {
    const ticket = mockTickets.find(
      (item) =>
        item.id === ticketId &&
        (!actor.userIdScope || item.userId === actor.userIdScope),
    );
    if (!ticket) {
      throw new Error("El ticket de soporte no existe.");
    }
    if (ticket.status === "closed") {
      ticket.status = "open";
    }
    if (actor.type === "admin") {
      ticket.status = "responded";
    }
    ticket.updatedAt = new Date().toISOString();
    mockMessages.push({
      id: randomUUID(),
      ticketId,
      authorType: actor.type,
      authorId: actor.id,
      authorName,
      body,
      createdAt: ticket.updatedAt,
    });
    return getSupportTicket(ticketId, actor.userIdScope);
  }

  return withTransaction(async (client) => {
    const ticket = await getTicketRowById(ticketId, actor.userIdScope, client);
    if (!ticket) {
      throw new Error("El ticket de soporte no existe.");
    }

    const nextStatus =
      actor.type === "admin"
        ? "responded"
        : ticket.status === "closed"
          ? "open"
          : ticket.status;

    await client.query(
      `
        insert into support_ticket_messages (
          id,
          ticket_id,
          author_type,
          author_id,
          author_name,
          body
        ) values ($1, $2, $3, $4, $5, $6)
      `,
      [randomUUID(), ticketId, actor.type, actor.id, authorName, body],
    );
    await client.query(
      `
        update support_tickets
        set status = $2,
            updated_at = now()
        where id = $1
      `,
      [ticketId, nextStatus],
    );

    const updated = await getTicketRowById(ticketId, actor.userIdScope, client);
    if (!updated) {
      throw new Error("No se pudo actualizar el ticket de soporte.");
    }

    return {
      ticket: mapTicketRow(updated),
      messages: await getTicketMessages(ticketId, client),
    };
  });
}

export async function updateSupportTicket(
  ticketId: string,
  input: UpdateSupportTicketInput,
): Promise<SupportTicketDetail> {
  const status = normalizeStatus(input.status);
  const priority = normalizePriority(input.priority);

  if (status == null && priority == null) {
    throw new Error("Selecciona un cambio para el ticket.");
  }

  if (!isDatabaseConfigured()) {
    const ticket = mockTickets.find((item) => item.id === ticketId);
    if (!ticket) {
      throw new Error("El ticket de soporte no existe.");
    }
    if (status) {
      ticket.status = status;
    }
    if (priority) {
      ticket.priority = priority;
    }
    ticket.updatedAt = new Date().toISOString();
    return getSupportTicket(ticketId);
  }

  await query(
    `
      update support_tickets
      set status = coalesce($2, status),
          priority = coalesce($3, priority),
          updated_at = now()
      where id = $1
    `,
    [ticketId, status, priority],
  );

  return getSupportTicket(ticketId);
}
