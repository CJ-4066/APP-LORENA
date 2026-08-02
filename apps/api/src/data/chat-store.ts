import { randomUUID } from "node:crypto";

import type { PoolClient, QueryResultRow } from "pg";

import { getUserBadgeProfile } from "./badge-store.js";
import {
  isDatabaseConfigured,
  query,
  withTransaction,
} from "../infrastructure/database.js";
import { getBookings, getProfile, getShopOrders } from "./persistent-store.js";
import { getSpecialists, type ShopOrder } from "./mock-store.js";

const demoUserId = "user-mark";

export type ChatAuthorType = "user" | "specialist" | "system";
export type ChatThreadStatus = "open" | "closed";

export interface ChatThreadSummary {
  id: string;
  userId: string;
  specialistId: string;
  specialistName: string;
  bookingId: string | null;
  orderId: string | null;
  status: ChatThreadStatus;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  authorType: ChatAuthorType;
  authorId: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
}

export interface CommunityChatMessage {
  id: string;
  authorName: string;
  authorRole: ChatAuthorRole;
  authorUserId: string | null;
  authorAvatarUrl: string | null;
  authorBadgeName: string | null;
  authorBadgeIconUrl: string | null;
  authorBadgePathId: string | null;
  body: string;
  imageUrl: string | null;
  createdAt: string;
}

export type CommunityChatModerationAction = "mute" | "ban" | "clear";

export interface CommunityChatModeration {
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  mutedUntil: string | null;
  bannedUntil: string | null;
  reason: string;
  updatedBy: string;
  updatedAt: string;
  isMuted: boolean;
  isBanned: boolean;
}

export type ChatAuthorRole = "member" | "guide" | "system";

export interface ChatThreadDetail {
  thread: ChatThreadSummary;
  messages: ChatMessage[];
}

export interface CreateChatThreadInput {
  specialistId?: string;
  bookingId?: string;
  orderId?: string;
  initialMessage?: string;
}

export interface CreateChatMessageInput {
  body?: string;
  imageUrl?: string;
}

export interface CreateCommunityChatMessageInput {
  body?: string;
  imageUrl?: string;
}

export interface CreateCommunityChatReplyInput extends CreateCommunityChatMessageInput {
  authorName?: string;
  authorRole?: ChatAuthorRole;
  authorUserId?: string;
}

export interface SetCommunityChatModerationInput {
  userId?: string;
  action?: CommunityChatModerationAction;
  durationHours?: number;
  reason?: string;
}

interface ThreadRow extends QueryResultRow {
  id: string;
  user_id: string;
  specialist_id: string;
  booking_id: string | null;
  order_id: string | null;
  status: ChatThreadStatus;
  created_at: Date | string;
  updated_at: Date | string;
  last_message_preview?: string | null;
  last_message_at?: Date | string | null;
  message_count?: string | number | null;
}

interface MessageRow extends QueryResultRow {
  id: string;
  thread_id: string;
  author_type: ChatAuthorType;
  author_id: string;
  body: string;
  image_url: string | null;
  created_at: Date | string;
}

interface CommunityMessageRow extends QueryResultRow {
  id: string;
  author_name: string;
  author_role: ChatAuthorRole;
  author_user_id: string | null;
  body: string;
  image_url: string | null;
  created_at: Date | string;
}

interface CommunityModerationRow extends QueryResultRow {
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  muted_until: Date | string | null;
  banned_until: Date | string | null;
  reason: string;
  updated_by: string;
  updated_at: Date | string;
}

interface ThreadRecord {
  id: string;
  userId: string;
  specialistId: string;
  bookingId: string | null;
  orderId: string | null;
  status: ChatThreadStatus;
  createdAt: string;
  updatedAt: string;
}

const mockThreads: ThreadRecord[] = [
  {
    id: "thread-demo-amaya",
    userId: demoUserId,
    specialistId: "spec-amaya",
    bookingId: "booking-1",
    orderId: null,
    status: "open",
    createdAt: "2026-03-24T15:00:00.000Z",
    updatedAt: "2026-03-24T15:06:00.000Z",
  },
];

const mockMessages: ChatMessage[] = [
  {
    id: "thread-demo-amaya-msg-1",
    threadId: "thread-demo-amaya",
    authorType: "specialist",
    authorId: "spec-amaya",
    body: "Ya revisé el motivo de tu consulta. Antes de la sesión te dejaré dos preguntas guía.",
    imageUrl: null,
    createdAt: "2026-03-24T15:01:00.000Z",
  },
  {
    id: "thread-demo-amaya-msg-2",
    threadId: "thread-demo-amaya",
    authorType: "user",
    authorId: demoUserId,
    body: "Perfecto, quiero enfocarme en claridad laboral y vínculos.",
    imageUrl: null,
    createdAt: "2026-03-24T15:06:00.000Z",
  },
];

const mockCommunityMessages: CommunityChatMessage[] = [
  {
    id: "community-msg-1",
    authorName: "Amaya Rivas",
    authorRole: "guide",
    authorUserId: null,
    authorAvatarUrl: null,
    authorBadgeName: null,
    authorBadgeIconUrl: null,
    authorBadgePathId: null,
    body: "Bienvenidos al chat general. Hoy la energía está buena para compartir cómo sienten el tránsito más fuerte del día.",
    imageUrl: null,
    createdAt: "2026-04-06T13:00:00.000Z",
  },
  {
    id: "community-msg-2",
    authorName: "Lucía Beltrán",
    authorRole: "guide",
    authorUserId: null,
    authorAvatarUrl: null,
    authorBadgeName: null,
    authorBadgeIconUrl: null,
    authorBadgePathId: null,
    body: "Si quieren, dejen una sola pregunta o sensación por mensaje para que la conversación siga clara.",
    imageUrl: null,
    createdAt: "2026-04-06T13:06:00.000Z",
  },
  {
    id: "community-msg-3",
    authorName: "María V.",
    authorRole: "member",
    authorUserId: demoUserId,
    authorAvatarUrl: null,
    authorBadgeName: null,
    authorBadgeIconUrl: null,
    authorBadgePathId: null,
    body: "Yo hoy siento mucho movimiento mental, como si Mercurio estuviera apurando todo.",
    imageUrl: null,
    createdAt: "2026-04-06T13:11:00.000Z",
  },
];

const mockCommunityModerations = new Map<
  string,
  {
    userId: string;
    mutedUntil: string | null;
    bannedUntil: string | null;
    reason: string;
    updatedBy: string;
    updatedAt: string;
  }
>();

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

function getSpecialistName(specialistId: string): string {
  return (
    getSpecialists().find((item) => item.id === specialistId)?.name ??
    specialistId
  );
}

function buildPreview(body: string): string {
  const normalized = body.trim();
  if (normalized.length <= 90) {
    return normalized;
  }

  return `${normalized.slice(0, 87)}...`;
}

function buildMessagePreview(body: string, imageUrl?: string | null): string {
  const normalized = body.trim();
  if (normalized.length > 0) {
    return buildPreview(normalized);
  }

  return imageUrl ? "Imagen adjunta" : "";
}

function mapThreadRow(row: ThreadRow): ChatThreadSummary {
  return {
    id: row.id,
    userId: row.user_id,
    specialistId: row.specialist_id,
    specialistName: getSpecialistName(row.specialist_id),
    bookingId: row.booking_id,
    orderId: row.order_id,
    status: row.status,
    lastMessagePreview: buildPreview(row.last_message_preview ?? ""),
    lastMessageAt: toIsoString(row.last_message_at),
    messageCount: Number(row.message_count ?? 0),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
  };
}

function mapMessageRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    authorType: row.author_type,
    authorId: row.author_id,
    body: row.body,
    imageUrl: resolveThreadImageUrl(row.image_url ?? undefined),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
  };
}

function buildMockThreadSummary(thread: ThreadRecord): ChatThreadSummary {
  const messages = mockMessages
    .filter((item) => item.threadId === thread.id)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const lastMessage = messages[messages.length - 1];

  return {
    id: thread.id,
    userId: thread.userId,
    specialistId: thread.specialistId,
    specialistName: getSpecialistName(thread.specialistId),
    bookingId: thread.bookingId,
    orderId: thread.orderId,
    status: thread.status,
    lastMessagePreview: buildMessagePreview(
      lastMessage?.body ?? "",
      lastMessage?.imageUrl ?? null,
    ),
    lastMessageAt: lastMessage?.createdAt ?? null,
    messageCount: messages.length,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
  };
}

async function getThreadRowById(
  threadId: string,
  userId: string,
  runner?: Pick<PoolClient, "query">,
): Promise<ThreadRow | null> {
  const execute = runner ? runner.query.bind(runner) : query;
  const result = await execute<ThreadRow>(
    `
      select
        t.id,
        t.user_id,
        t.specialist_id,
        t.booking_id,
        t.order_id,
        t.status,
        t.created_at,
        t.updated_at,
        (
          select coalesce(
            nullif(m.body, ''),
            case
              when m.image_url is not null and length(trim(m.image_url)) > 0
                then 'Imagen adjunta'
              else ''
            end
          )
          from chat_messages m
          where m.thread_id = t.id
          order by m.created_at desc
          limit 1
        ) as last_message_preview,
        (
          select m.created_at
          from chat_messages m
          where m.thread_id = t.id
          order by m.created_at desc
          limit 1
        ) as last_message_at,
        (
          select count(*)::text
          from chat_messages m
          where m.thread_id = t.id
        ) as message_count
      from chat_threads t
      where t.id = $1
        and t.user_id = $2
      limit 1
    `,
    [threadId, userId],
  );

  return result.rows[0] ?? null;
}

async function getThreadMessages(
  threadId: string,
  runner?: Pick<PoolClient, "query">,
): Promise<ChatMessage[]> {
  const execute = runner ? runner.query.bind(runner) : query;
  const result = await execute<MessageRow>(
    `
      select id, thread_id, author_type, author_id, body, image_url, created_at
      from chat_messages
      where thread_id = $1
      order by created_at asc
    `,
    [threadId],
  );

  return result.rows.map(mapMessageRow);
}

function buildThreadDetail(
  thread: ChatThreadSummary,
  messages: ChatMessage[],
): ChatThreadDetail {
  return {
    thread,
    messages,
  };
}

type ChatMessageContent = {
  body: string;
  imageUrl: string | null;
};

function ensureThreadMessage(input: CreateChatMessageInput): ChatMessageContent {
  const body = input.body?.trim() ?? "";
  const rawImageUrl = input.imageUrl?.trim() ?? "";
  const imageUrl = resolveThreadImageUrl(rawImageUrl);
  if (rawImageUrl.length > 0 && !imageUrl) {
    throw new Error("La imagen del mensaje no es válida.");
  }
  if (body.length < 1 && !imageUrl) {
    throw new Error("El mensaje no puede estar vacío.");
  }
  if (body.length > 4000) {
    throw new Error("El mensaje es demasiado largo.");
  }
  if (rawImageUrl.length > 2048) {
    throw new Error("La imagen del mensaje no es válida.");
  }

  return { body, imageUrl };
}

function ensureCommunityMessage(
  input: CreateCommunityChatMessageInput,
): string {
  const body = input.body?.trim() ?? "";
  const imageUrl = input.imageUrl?.trim() ?? "";
  if (body.length < 1 && imageUrl.length < 1) {
    throw new Error("El mensaje no puede estar vacío.");
  }
  if (body.length > 1200) {
    throw new Error("El mensaje es demasiado largo.");
  }

  if (imageUrl.length > 2048) {
    throw new Error("La imagen del mensaje no es válida.");
  }

  return body;
}

function resolveCommunityImageUrl(value?: string): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/api/storage/assets/") ||
    trimmed.startsWith("/api/uploads/") ||
    trimmed.startsWith("/uploads/")
  ) {
    if (trimmed.startsWith("/uploads/")) {
      return `/api${trimmed}`;
    }

    return trimmed;
  }

  return null;
}

function resolveThreadImageUrl(value?: string): string | null {
  return resolveCommunityImageUrl(value);
}

function resolveCommunityAvatarUrl(value?: string): string | null {
  return resolveCommunityImageUrl(value);
}

function isFutureIso(value: string | null): boolean {
  if (!value) {
    return false;
  }
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time > Date.now();
}

function buildModerationUntil(
  action: CommunityChatModerationAction,
  durationHours?: number,
): string | null {
  if (action === "clear") {
    return null;
  }

  const fallbackHours = action === "mute" ? 24 : 24 * 7;
  const hours =
    typeof durationHours === "number" && Number.isFinite(durationHours)
      ? Math.max(1, Math.min(durationHours, 24 * 365))
      : fallbackHours;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function normalizeModerationInput(input: SetCommunityChatModerationInput): {
  userId: string;
  action: CommunityChatModerationAction;
  mutedUntil: string | null;
  bannedUntil: string | null;
  reason: string;
} {
  const userId = input.userId?.trim() ?? "";
  if (!userId) {
    throw new Error("Selecciona la persona a moderar.");
  }

  const action = input.action;
  if (action !== "mute" && action !== "ban" && action !== "clear") {
    throw new Error("Selecciona una acción de moderación válida.");
  }

  const reason = input.reason?.trim() ?? "";
  if (reason.length > 240) {
    throw new Error("El motivo de moderación es demasiado largo.");
  }

  return {
    userId,
    action,
    mutedUntil: action === "mute" ? buildModerationUntil(action, input.durationHours) : null,
    bannedUntil: action === "ban" ? buildModerationUntil(action, input.durationHours) : null,
    reason,
  };
}

function mapModerationRow(row: CommunityModerationRow): CommunityChatModeration {
  const mutedUntil = toIsoString(row.muted_until);
  const bannedUntil = toIsoString(row.banned_until);
  return {
    userId: row.user_id,
    userName: row.user_name,
    userAvatarUrl: resolveCommunityAvatarUrl(row.user_avatar_url ?? undefined),
    mutedUntil,
    bannedUntil,
    reason: row.reason,
    updatedBy: row.updated_by,
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
    isMuted: isFutureIso(mutedUntil),
    isBanned: isFutureIso(bannedUntil),
  };
}

async function buildMockModeration(
  record: {
    userId: string;
    mutedUntil: string | null;
    bannedUntil: string | null;
    reason: string;
    updatedBy: string;
    updatedAt: string;
  },
): Promise<CommunityChatModeration> {
  let userName = record.userId;
  let userAvatarUrl: string | null = null;
  try {
    const profile = await getProfile(record.userId);
    userName = resolveCommunityAuthorName(profile);
    userAvatarUrl = resolveCommunityAvatarUrl(profile.avatarUrl);
  } catch {
    userName = record.userId;
  }

  return {
    userId: record.userId,
    userName,
    userAvatarUrl,
    mutedUntil: record.mutedUntil,
    bannedUntil: record.bannedUntil,
    reason: record.reason,
    updatedBy: record.updatedBy,
    updatedAt: record.updatedAt,
    isMuted: isFutureIso(record.mutedUntil),
    isBanned: isFutureIso(record.bannedUntil),
  };
}

async function getCommunityChatModeration(
  userId: string,
): Promise<CommunityChatModeration | null> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return null;
  }

  if (!isDatabaseConfigured()) {
    const record = mockCommunityModerations.get(normalizedUserId);
    return record ? buildMockModeration(record) : null;
  }

  const result = await query<CommunityModerationRow>(
    `
      select
        m.user_id,
        coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.nickname, u.email, m.user_id) as user_name,
        nullif(u.avatar_url, '') as user_avatar_url,
        m.muted_until,
        m.banned_until,
        m.reason,
        m.updated_by,
        m.updated_at
      from community_chat_moderations m
      left join users u on u.id = m.user_id
      where m.user_id = $1
      limit 1
    `,
    [normalizedUserId],
  );

  return result.rows[0] ? mapModerationRow(result.rows[0]) : null;
}

async function ensureCommunityChatAccess(userId: string): Promise<void> {
  const moderation = await getCommunityChatModeration(userId);
  if (!moderation) {
    return;
  }

  if (moderation.isBanned) {
    throw new Error("Tu acceso al chat está suspendido temporalmente.");
  }
  if (moderation.isMuted) {
    throw new Error("Tu cuenta está silenciada temporalmente en el chat.");
  }
}

function mapCommunityMessageRow(
  row: CommunityMessageRow,
): CommunityChatMessage {
  return {
    id: row.id,
    authorName: row.author_name,
    authorRole: row.author_role,
    authorUserId: row.author_user_id ?? null,
    authorAvatarUrl: null,
    authorBadgeName: null,
    authorBadgeIconUrl: null,
    authorBadgePathId: null,
    body: row.body,
    imageUrl: resolveCommunityImageUrl(row.image_url ?? undefined),
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
  };
}

function resolveCommunityAuthorName(
  profile: Awaited<ReturnType<typeof getProfile>>,
): string {
  const firstName = profile.firstName.trim();
  const lastName = profile.lastName.trim();
  const nickname = profile.nickname.trim();
  const fullName = [firstName, lastName]
    .filter((item) => item.length > 0)
    .join(" ");

  if (fullName.length > 0) {
    return fullName;
  }
  if (nickname.length > 0) {
    return nickname;
  }

  return "Miembro";
}

async function enrichCommunityMessages(
  messages: CommunityChatMessage[],
): Promise<CommunityChatMessage[]> {
  const authorUserIds = [
    ...new Set(
      messages
        .map((message) => message.authorUserId?.trim() ?? "")
        .filter((value) => value.length > 0),
    ),
  ];

  if (authorUserIds.length === 0) {
    return messages;
  }

  const authorDetails = new Map<
    string,
    {
      avatarUrl: string | null;
      badgeName: string | null;
      badgeIconUrl: string | null;
      badgePathId: string | null;
    }
  >();

  await Promise.all(
    authorUserIds.map(async (userId) => {
      try {
        const [profile, badgeProfile] = await Promise.all([
          getProfile(userId),
          getUserBadgeProfile(userId),
        ]);
        const communityBadge =
          badgeProfile.badges
            .filter(
              (badge) => badge.unlocked && badge.pathId === "community_path",
            )
            .sort((left, right) => right.stepIndex - left.stepIndex)[0] ?? null;

        authorDetails.set(userId, {
          avatarUrl: resolveCommunityAvatarUrl(profile.avatarUrl),
          badgeName: communityBadge?.displayName ?? null,
          badgeIconUrl: communityBadge?.displayIconUrl ?? null,
          badgePathId: communityBadge?.pathId ?? null,
        });
      } catch {
        authorDetails.set(userId, {
          avatarUrl: null,
          badgeName: null,
          badgeIconUrl: null,
          badgePathId: null,
        });
      }
    }),
  );

  return messages.map((message) => {
    const userId = message.authorUserId?.trim() ?? "";
    if (!userId) {
      return message;
    }

    const details = authorDetails.get(userId);
    if (!details) {
      return message;
    }

    return {
      ...message,
      authorAvatarUrl: details.avatarUrl,
      authorBadgeName: details.badgeName,
      authorBadgeIconUrl: details.badgeIconUrl,
      authorBadgePathId: details.badgePathId,
    };
  });
}

export async function getChatThreads(
  userId?: string,
): Promise<ChatThreadSummary[]> {
  const resolvedUserId = userId ?? demoUserId;

  if (!isDatabaseConfigured()) {
    return mockThreads
      .filter((thread) => thread.userId === resolvedUserId)
      .map(buildMockThreadSummary)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  const result = await query<ThreadRow>(
    `
      select
        t.id,
        t.user_id,
        t.specialist_id,
        t.booking_id,
        t.order_id,
        t.status,
        t.created_at,
        t.updated_at,
        (
          select coalesce(
            nullif(m.body, ''),
            case
              when m.image_url is not null and length(trim(m.image_url)) > 0
                then 'Imagen adjunta'
              else ''
            end
          )
          from chat_messages m
          where m.thread_id = t.id
          order by m.created_at desc
          limit 1
        ) as last_message_preview,
        (
          select m.created_at
          from chat_messages m
          where m.thread_id = t.id
          order by m.created_at desc
          limit 1
        ) as last_message_at,
        (
          select count(*)::text
          from chat_messages m
          where m.thread_id = t.id
        ) as message_count
      from chat_threads t
      where t.user_id = $1
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
    `,
    [resolvedUserId],
  );

  return result.rows.map(mapThreadRow);
}

export async function getChatThread(
  threadId: string,
  userId?: string,
): Promise<ChatThreadDetail> {
  const resolvedUserId = userId ?? demoUserId;

  if (!isDatabaseConfigured()) {
    const thread = mockThreads.find(
      (item) => item.id === threadId && item.userId === resolvedUserId,
    );
    if (!thread) {
      throw new Error("El hilo no existe.");
    }

    const messages = mockMessages
      .filter((item) => item.threadId === threadId)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

    return buildThreadDetail(buildMockThreadSummary(thread), messages);
  }

  const threadRow = await getThreadRowById(threadId, resolvedUserId);
  if (!threadRow) {
    throw new Error("El hilo no existe.");
  }

  return buildThreadDetail(
    mapThreadRow(threadRow),
    await getThreadMessages(threadId),
  );
}

export async function createChatThread(
  input: CreateChatThreadInput,
  userId?: string,
): Promise<ChatThreadDetail> {
  const resolvedUserId = userId ?? demoUserId;
  const bookingId = input.bookingId?.trim() || null;
  const orderId = input.orderId?.trim() || null;
  let specialistId = input.specialistId?.trim() || "";

  if (bookingId && orderId) {
    throw new Error(
      "El chat debe asociarse a una reserva o a una orden, no a ambas.",
    );
  }

  if (bookingId) {
    const booking = (await getBookings(resolvedUserId)).find(
      (item) => item.id === bookingId,
    );
    if (!booking) {
      throw new Error("La reserva asociada no existe.");
    }
    specialistId = specialistId || booking.specialistId;
  }

  if (orderId) {
    const order = (await getShopOrders(resolvedUserId)).find(
      (item) => item.id === orderId,
    );
    if (!order) {
      throw new Error("La orden asociada no existe.");
    }
    specialistId = specialistId || order.specialistId;
  }

  if (!specialistId) {
    throw new Error("Selecciona un especialista para abrir el chat.");
  }
  if (!getSpecialists().some((item) => item.id === specialistId)) {
    throw new Error("El especialista no existe.");
  }

  const initialMessage = input.initialMessage?.trim() ?? "";

  if (!isDatabaseConfigured()) {
    const existingThread = bookingId
      ? mockThreads.find(
          (item) =>
            item.userId === resolvedUserId &&
            item.bookingId === bookingId &&
            item.status === "open",
        )
      : orderId
        ? mockThreads.find(
            (item) =>
              item.userId === resolvedUserId &&
              item.orderId === orderId &&
              item.status === "open",
          )
        : undefined;

    if (existingThread) {
      return getChatThread(existingThread.id, resolvedUserId);
    }

    const thread: ThreadRecord = {
      id: randomUUID(),
      userId: resolvedUserId,
      specialistId,
      bookingId,
      orderId,
      status: "open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockThreads.unshift(thread);

    if (initialMessage.length > 0) {
      mockMessages.push({
        id: randomUUID(),
        threadId: thread.id,
        authorType: "user",
        authorId: resolvedUserId,
        body: initialMessage,
        imageUrl: null,
        createdAt: new Date().toISOString(),
      });
      thread.updatedAt = new Date().toISOString();
    }

    return getChatThread(thread.id, resolvedUserId);
  }

  return withTransaction(async (client) => {
    if (bookingId || orderId) {
      const existing = await client.query<{ id: string }>(
        `
          select id
          from chat_threads
          where user_id = $1
            and ${bookingId ? "booking_id" : "order_id"} = $2
            and status = 'open'
          limit 1
        `,
        [resolvedUserId, bookingId ?? orderId],
      );
      if (existing.rows[0]) {
        const detail = await getThreadRowById(
          existing.rows[0].id,
          resolvedUserId,
          client,
        );
        if (!detail) {
          throw new Error("No se pudo recuperar el hilo existente.");
        }

        return buildThreadDetail(
          mapThreadRow(detail),
          await getThreadMessages(existing.rows[0].id, client),
        );
      }
    }

    const threadId = randomUUID();
    await client.query(
      `
        insert into chat_threads (
          id,
          user_id,
          specialist_id,
          booking_id,
          order_id,
          status
        ) values ($1, $2, $3, $4, $5, 'open')
      `,
      [threadId, resolvedUserId, specialistId, bookingId, orderId],
    );

    if (initialMessage.length > 0) {
      await client.query(
        `
          insert into chat_messages (
            id,
            thread_id,
            author_type,
            author_id,
            body
          ) values ($1, $2, 'user', $3, $4)
        `,
        [randomUUID(), threadId, resolvedUserId, initialMessage],
      );
      await client.query(
        `
          update chat_threads
          set updated_at = now()
          where id = $1
        `,
        [threadId],
      );
    }

    const thread = await getThreadRowById(threadId, resolvedUserId, client);
    if (!thread) {
      throw new Error("No se pudo crear el hilo.");
    }

    return buildThreadDetail(
      mapThreadRow(thread),
      await getThreadMessages(threadId, client),
    );
  });
}

export async function createChatMessage(
  threadId: string,
  input: CreateChatMessageInput,
  userId?: string,
): Promise<ChatThreadDetail> {
  const resolvedUserId = userId ?? demoUserId;
  const message = ensureThreadMessage(input);

  if (!isDatabaseConfigured()) {
    const thread = mockThreads.find(
      (item) => item.id === threadId && item.userId === resolvedUserId,
    );
    if (!thread) {
      throw new Error("El hilo no existe.");
    }
    if (thread.status !== "open") {
      throw new Error("El hilo ya está cerrado.");
    }

    mockMessages.push({
      id: randomUUID(),
      threadId,
      authorType: "user",
      authorId: resolvedUserId,
      body: message.body,
      imageUrl: message.imageUrl,
      createdAt: new Date().toISOString(),
    });
    thread.updatedAt = new Date().toISOString();

    return getChatThread(threadId, resolvedUserId);
  }

  return withTransaction(async (client) => {
    const thread = await getThreadRowById(threadId, resolvedUserId, client);
    if (!thread) {
      throw new Error("El hilo no existe.");
    }
    if (thread.status !== "open") {
      throw new Error("El hilo ya está cerrado.");
    }

    await client.query(
      `
        insert into chat_messages (
          id,
          thread_id,
          author_type,
          author_id,
          body,
          image_url
        ) values ($1, $2, 'user', $3, $4, $5)
      `,
      [
        randomUUID(),
        threadId,
        resolvedUserId,
        message.body,
        message.imageUrl,
      ],
    );

    await client.query(
      `
        update chat_threads
        set updated_at = now()
        where id = $1
      `,
      [threadId],
    );

    const updatedThread = await getThreadRowById(
      threadId,
      resolvedUserId,
      client,
    );
    if (!updatedThread) {
      throw new Error("No se pudo recuperar el hilo actualizado.");
    }

    return buildThreadDetail(
      mapThreadRow(updatedThread),
      await getThreadMessages(threadId, client),
    );
  });
}

export async function ensureOrderChatThread(
  order: ShopOrder,
  options: {
    message?: string;
    imageUrl?: string;
    authorType?: ChatAuthorType;
    authorId?: string;
  } = {},
): Promise<ChatThreadDetail> {
  const body = options.message?.trim() ?? "";
  const rawImageUrl = options.imageUrl?.trim() ?? "";
  const imageUrl = resolveThreadImageUrl(rawImageUrl);
  if (rawImageUrl.length > 0 && !imageUrl) {
    throw new Error("La imagen del mensaje no es válida.");
  }
  if (body.length > 4000) {
    throw new Error("El mensaje es demasiado largo.");
  }
  if (rawImageUrl.length > 2048) {
    throw new Error("La imagen del mensaje no es válida.");
  }
  const authorType = options.authorType ?? "specialist";
  const authorId =
    options.authorId?.trim() ||
    (authorType === "system" ? "system" : order.specialistId);

  if (!isDatabaseConfigured()) {
    let thread = mockThreads.find(
      (item) =>
        item.userId === order.userId &&
        item.orderId === order.id &&
        item.status === "open",
    );

    if (!thread) {
      thread = {
        id: randomUUID(),
        userId: order.userId,
        specialistId: order.specialistId,
        bookingId: null,
        orderId: order.id,
        status: "open",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockThreads.unshift(thread);
    }

    if (body.length > 0 || imageUrl) {
      mockMessages.push({
        id: randomUUID(),
        threadId: thread.id,
        authorType,
        authorId,
        body,
        imageUrl,
        createdAt: new Date().toISOString(),
      });
      thread.updatedAt = new Date().toISOString();
    }

    return getChatThread(thread.id, order.userId);
  }

  return withTransaction(async (client) => {
    const existing = await client.query<{ id: string }>(
      `
        select id
        from chat_threads
        where user_id = $1
          and order_id = $2
          and status = 'open'
        limit 1
      `,
      [order.userId, order.id],
    );
    const threadId = existing.rows[0]?.id ?? randomUUID();

    if (!existing.rows[0]) {
      await client.query(
        `
          insert into chat_threads (
            id,
            user_id,
            specialist_id,
            booking_id,
            order_id,
            status
          ) values ($1, $2, $3, null, $4, 'open')
        `,
        [threadId, order.userId, order.specialistId, order.id],
      );
    }

    if (body.length > 0 || imageUrl) {
      await client.query(
        `
          insert into chat_messages (
            id,
            thread_id,
            author_type,
            author_id,
            body,
            image_url
          ) values ($1, $2, $3, $4, $5, $6)
        `,
        [randomUUID(), threadId, authorType, authorId, body, imageUrl],
      );
      await client.query(
        `
          update chat_threads
          set updated_at = now()
          where id = $1
        `,
        [threadId],
      );
    }

    const thread = await getThreadRowById(threadId, order.userId, client);
    if (!thread) {
      throw new Error("No se pudo abrir el chat de la orden.");
    }

    return buildThreadDetail(
      mapThreadRow(thread),
      await getThreadMessages(threadId, client),
    );
  });
}

export async function getCommunityChatMessages(): Promise<
  CommunityChatMessage[]
> {
  if (!isDatabaseConfigured()) {
    return enrichCommunityMessages(
      [...mockCommunityMessages].sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      ),
    );
  }

  const result = await query<CommunityMessageRow>(
    `
      select id, author_name, author_role, author_user_id, body, image_url, created_at
      from community_chat_messages
      order by created_at asc
    `,
  );

  return enrichCommunityMessages(result.rows.map(mapCommunityMessageRow));
}

export async function getCommunityChatModerations(): Promise<
  CommunityChatModeration[]
> {
  if (!isDatabaseConfigured()) {
    const items = await Promise.all(
      [...mockCommunityModerations.values()].map(buildMockModeration),
    );
    return items.sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  const result = await query<CommunityModerationRow>(
    `
      select
        m.user_id,
        coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.nickname, u.email, m.user_id) as user_name,
        nullif(u.avatar_url, '') as user_avatar_url,
        m.muted_until,
        m.banned_until,
        m.reason,
        m.updated_by,
        m.updated_at
      from community_chat_moderations m
      left join users u on u.id = m.user_id
      order by m.updated_at desc
    `,
  );

  return result.rows.map(mapModerationRow);
}

export async function setCommunityChatModeration(
  input: SetCommunityChatModerationInput,
  updatedBy: string,
): Promise<CommunityChatModeration[]> {
  const moderation = normalizeModerationInput(input);
  const updatedByLabel = updatedBy.trim() || "admin";

  if (!isDatabaseConfigured()) {
    if (moderation.action === "clear") {
      mockCommunityModerations.delete(moderation.userId);
      return getCommunityChatModerations();
    }

    mockCommunityModerations.set(moderation.userId, {
      userId: moderation.userId,
      mutedUntil: moderation.mutedUntil,
      bannedUntil: moderation.bannedUntil,
      reason: moderation.reason,
      updatedBy: updatedByLabel,
      updatedAt: new Date().toISOString(),
    });
    return getCommunityChatModerations();
  }

  if (moderation.action === "clear") {
    await query(
      `
        delete from community_chat_moderations
        where user_id = $1
      `,
      [moderation.userId],
    );
    return getCommunityChatModerations();
  }

  await query(
    `
      insert into community_chat_moderations (
        user_id,
        muted_until,
        banned_until,
        reason,
        updated_by,
        updated_at
      ) values ($1, $2, $3, $4, $5, now())
      on conflict (user_id) do update set
        muted_until = excluded.muted_until,
        banned_until = excluded.banned_until,
        reason = excluded.reason,
        updated_by = excluded.updated_by,
        updated_at = now()
    `,
    [
      moderation.userId,
      moderation.mutedUntil,
      moderation.bannedUntil,
      moderation.reason,
      updatedByLabel,
    ],
  );

  return getCommunityChatModerations();
}

export async function createCommunityChatMessage(
  input: CreateCommunityChatMessageInput,
  userId?: string,
  options?: {
    authorName?: string;
    authorRole?: ChatAuthorRole;
    authorUserId?: string;
  },
): Promise<CommunityChatMessage[]> {
  const resolvedUserId = userId ?? demoUserId;
  const body = ensureCommunityMessage(input);
  const imageUrl = resolveCommunityImageUrl(input.imageUrl);
  const authorRole = options?.authorRole ?? "member";
  if (authorRole === "member") {
    await ensureCommunityChatAccess(resolvedUserId);
  }
  const profile = await getProfile(resolvedUserId);
  const authorUserId =
    authorRole === "member"
      ? resolvedUserId
      : options?.authorUserId?.trim() || null;
  const authorName =
    options?.authorName?.trim() ||
    (authorRole === "guide"
      ? "Equipo Lo Renaciente"
      : resolveCommunityAuthorName(profile));

  if (!isDatabaseConfigured()) {
    mockCommunityMessages.push({
      id: randomUUID(),
      authorName,
      authorRole,
      authorUserId,
      authorAvatarUrl: null,
      authorBadgeName: null,
      authorBadgeIconUrl: null,
      authorBadgePathId: null,
      body,
      imageUrl,
      createdAt: new Date().toISOString(),
    });

    return getCommunityChatMessages();
  }

  await query(
    `
      insert into community_chat_messages (
        id,
        author_name,
        author_role,
        author_user_id,
        body,
        image_url
      ) values ($1, $2, $3, $4, $5, $6)
    `,
    [randomUUID(), authorName, authorRole, authorUserId, body, imageUrl],
  );

  return getCommunityChatMessages();
}

export async function deleteCommunityChatMessage(
  messageId: string,
): Promise<CommunityChatMessage[]> {
  const normalizedMessageId = messageId.trim();
  if (!normalizedMessageId) {
    throw new Error("El mensaje no es válido.");
  }

  if (!isDatabaseConfigured()) {
    const nextMessages = mockCommunityMessages.filter(
      (message) => message.id !== normalizedMessageId,
    );
    if (nextMessages.length === mockCommunityMessages.length) {
      throw new Error("El mensaje no existe.");
    }

    mockCommunityMessages.splice(
      0,
      mockCommunityMessages.length,
      ...nextMessages,
    );
    return getCommunityChatMessages();
  }

  const result = await query<{ id: string }>(
    `
      delete from community_chat_messages
      where id = $1
      returning id
    `,
    [normalizedMessageId],
  );

  if (!result.rows[0]) {
    throw new Error("El mensaje no existe.");
  }

  return getCommunityChatMessages();
}

export async function deleteCommunityChatMessageImage(
  messageId: string,
): Promise<CommunityChatMessage[]> {
  const normalizedMessageId = messageId.trim();
  if (!normalizedMessageId) {
    throw new Error("El mensaje no es válido.");
  }

  if (!isDatabaseConfigured()) {
    const index = mockCommunityMessages.findIndex(
      (message) => message.id === normalizedMessageId,
    );
    if (index < 0) {
      throw new Error("El mensaje no existe.");
    }

    const current = mockCommunityMessages[index];
    if (!current.imageUrl) {
      throw new Error("El mensaje no tiene imagen.");
    }

    if (!current.body.trim()) {
      mockCommunityMessages.splice(index, 1);
    } else {
      mockCommunityMessages[index] = {
        ...current,
        imageUrl: null,
      };
    }

    return getCommunityChatMessages();
  }

  const existing = await query<{ body: string; image_url: string | null }>(
    `
      select body, image_url
      from community_chat_messages
      where id = $1
      limit 1
    `,
    [normalizedMessageId],
  );

  const current = existing.rows[0];
  if (!current) {
    throw new Error("El mensaje no existe.");
  }
  if (!current.image_url) {
    throw new Error("El mensaje no tiene imagen.");
  }

  if (!current.body.trim()) {
    await query(
      `
        delete from community_chat_messages
        where id = $1
      `,
      [normalizedMessageId],
    );
  } else {
    await query(
      `
        update community_chat_messages
        set image_url = null
        where id = $1
      `,
      [normalizedMessageId],
    );
  }

  return getCommunityChatMessages();
}
