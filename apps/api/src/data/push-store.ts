import { randomUUID } from "node:crypto";

import type { QueryResultRow } from "pg";

import { isDatabaseConfigured, query } from "../infrastructure/database.js";
import { getCurrentSubscription } from "./persistent-store.js";

const demoUserId = "user-mark";

export type PushPlatform = "ios" | "android" | "web";

export interface PushDevice {
  id: string;
  userId: string;
  platform: PushPlatform;
  pushToken: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterPushDeviceInput {
  platform?: PushPlatform;
  pushToken?: string;
}

export type PushEngagementAudience = "all" | "limited" | "premium";

export interface PushEngagementTemplate {
  id: string;
  title: string;
  body: string;
  audience: PushEngagementAudience;
  trigger: string;
  deepLink: string;
  minHoursBetweenSends: number;
  eligible: boolean;
}

interface PushDeviceRow extends QueryResultRow {
  id: string;
  user_id: string;
  platform: PushPlatform;
  push_token: string;
  created_at: Date | string;
  updated_at: Date | string;
}

const engagementTemplates: Array<Omit<PushEngagementTemplate, "eligible">> = [
  {
    id: "daily-card-gentle-return",
    title: "Tu carta del día ya te espera",
    body: "Entra un momento y toma una guía breve para empezar con más claridad.",
    audience: "all",
    trigger: "daily_morning",
    deepLink: "lo-renaciente://home/card",
    minHoursBetweenSends: 20,
  },
  {
    id: "limited-astro-preview",
    title: "Hay un avance astral disponible",
    body: "Puedes revisar tu lectura básica de hoy y guardar lo que resuene.",
    audience: "limited",
    trigger: "inactive_24h",
    deepLink: "lo-renaciente://home/astro",
    minHoursBetweenSends: 24,
  },
  {
    id: "premium-transits-window",
    title: "Tu radar Premium tiene movimiento",
    body: "Revisa los tránsitos de hoy y elige el mejor momento para actuar.",
    audience: "premium",
    trigger: "daily_midday",
    deepLink: "lo-renaciente://premium/transits",
    minHoursBetweenSends: 18,
  },
  {
    id: "community-soft-invite",
    title: "El chat general está activo",
    body: "Pasa a leer la conversación o comparte una sensación breve con la comunidad.",
    audience: "all",
    trigger: "community_activity",
    deepLink: "lo-renaciente://chat/community",
    minHoursBetweenSends: 12,
  },
  {
    id: "limited-course-teaser",
    title: "Un módulo puede ayudarte hoy",
    body: "Hay contenido gratuito para retomar tu práctica sin presión.",
    audience: "limited",
    trigger: "inactive_48h",
    deepLink: "lo-renaciente://courses",
    minHoursBetweenSends: 36,
  },
  {
    id: "premium-library-nudge",
    title: "Tu biblioteca Premium sigue abierta",
    body: "Elige una lectura corta y vuelve a tu proceso con foco.",
    audience: "premium",
    trigger: "library_recommendation",
    deepLink: "lo-renaciente://premium/library",
    minHoursBetweenSends: 24,
  },
  {
    id: "booking-reminder-friendly",
    title: "Revisa tu próxima sesión",
    body: "Confirma horario, notas y modo de atención desde tu agenda.",
    audience: "all",
    trigger: "booking_upcoming",
    deepLink: "lo-renaciente://bookings",
    minHoursBetweenSends: 8,
  },
  {
    id: "profile-completion-care",
    title: "Tu perfil puede quedar más completo",
    body: "Añadir tus datos ayuda a personalizar mejor cartas, ciclos y recomendaciones.",
    audience: "limited",
    trigger: "profile_incomplete",
    deepLink: "lo-renaciente://profile/edit",
    minHoursBetweenSends: 48,
  },
  {
    id: "premium-renewal-soft",
    title: "Tu acceso Premium está cerca de renovarse",
    body: "Revisa tu estado y aprovecha tus contenidos antes del cierre del ciclo.",
    audience: "premium",
    trigger: "premium_renewal_window",
    deepLink: "lo-renaciente://profile/subscription",
    minHoursBetweenSends: 48,
  },
  {
    id: "support-followup",
    title: "Soporte puede acompañarte",
    body: "Si algo no fluye en la app, abre un ticket y te responderemos desde administración.",
    audience: "all",
    trigger: "support_available",
    deepLink: "lo-renaciente://support",
    minHoursBetweenSends: 72,
  },
];

const mockDevices = new Map<string, PushDevice>();

function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toISOString();
}

function mapPushDeviceRow(row: PushDeviceRow): PushDevice {
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    pushToken: row.push_token,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function isTemplateEligible(
  audience: PushEngagementAudience,
  isPremium: boolean,
): boolean {
  return (
    audience === "all" ||
    (audience === "premium" && isPremium) ||
    (audience === "limited" && !isPremium)
  );
}

function validatePushDeviceInput(input: RegisterPushDeviceInput): {
  platform: PushPlatform;
  pushToken: string;
} {
  if (!input.platform || !["ios", "android", "web"].includes(input.platform)) {
    throw new Error("Selecciona una plataforma válida.");
  }

  const pushToken = input.pushToken?.trim() ?? "";
  if (pushToken.length < 8) {
    throw new Error("El token push no es válido.");
  }

  return {
    platform: input.platform,
    pushToken,
  };
}

export async function getPushDevices(userId?: string): Promise<PushDevice[]> {
  const resolvedUserId = userId ?? demoUserId;

  if (!isDatabaseConfigured()) {
    return [...mockDevices.values()]
      .filter((item) => item.userId === resolvedUserId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  const result = await query<PushDeviceRow>(
    `
      select id, user_id, platform, push_token, created_at, updated_at
      from push_devices
      where user_id = $1
      order by updated_at desc
    `,
    [resolvedUserId],
  );

  return result.rows.map(mapPushDeviceRow);
}

export async function getPushEngagementTemplates(
  userId?: string,
): Promise<PushEngagementTemplate[]> {
  let isPremium = false;
  if (userId) {
    try {
      const subscription = await getCurrentSubscription(userId);
      isPremium =
        subscription.planId === "premium" && subscription.status === "active";
    } catch {
      isPremium = false;
    }
  }

  return engagementTemplates.map((template) => ({
    ...template,
    eligible: isTemplateEligible(template.audience, isPremium),
  }));
}

export async function recordPushEngagementInvitation(
  templateId: string,
  userId?: string,
): Promise<PushEngagementTemplate> {
  const resolvedUserId = userId ?? demoUserId;
  const templates = await getPushEngagementTemplates(resolvedUserId);
  const template = templates.find((item) => item.id === templateId);
  if (!template) {
    throw new Error("La plantilla de notificación no existe.");
  }
  if (!template.eligible) {
    throw new Error("La plantilla no aplica para este usuario.");
  }

  if (isDatabaseConfigured()) {
    await query(
      `
        insert into push_engagement_logs (
          id,
          user_id,
          template_id,
          title,
          body,
          audience,
          deep_link,
          status
        ) values ($1, $2, $3, $4, $5, $6, $7, 'queued')
      `,
      [
        randomUUID(),
        resolvedUserId,
        template.id,
        template.title,
        template.body,
        template.audience,
        template.deepLink,
      ],
    );
  }

  return template;
}

export async function registerPushDevice(
  input: RegisterPushDeviceInput,
  userId?: string,
): Promise<PushDevice> {
  const resolvedUserId = userId ?? demoUserId;
  const { platform, pushToken } = validatePushDeviceInput(input);

  if (!isDatabaseConfigured()) {
    const existing = [...mockDevices.values()].find((item) => item.pushToken === pushToken);
    const device: PushDevice = {
      id: existing?.id ?? randomUUID(),
      userId: resolvedUserId,
      platform,
      pushToken,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockDevices.set(device.id, device);
    return device;
  }

  const result = await query<PushDeviceRow>(
    `
      insert into push_devices (
        id,
        user_id,
        platform,
        push_token,
        updated_at
      ) values ($1, $2, $3, $4, now())
      on conflict (push_token) do update set
        user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now()
      returning id, user_id, platform, push_token, created_at, updated_at
    `,
    [randomUUID(), resolvedUserId, platform, pushToken],
  );

  await query(
    `
      update users
      set receives_push = true,
          updated_at = now()
      where id = $1
    `,
    [resolvedUserId],
  );

  return mapPushDeviceRow(result.rows[0]);
}

export async function deletePushDevice(
  deviceId: string,
  userId?: string,
): Promise<void> {
  const resolvedUserId = userId ?? demoUserId;

  if (!isDatabaseConfigured()) {
    const device = mockDevices.get(deviceId);
    if (!device || device.userId !== resolvedUserId) {
      throw new Error("El dispositivo no existe.");
    }

    mockDevices.delete(deviceId);
    return;
  }

  const result = await query(
    `
      delete from push_devices
      where id = $1
        and user_id = $2
    `,
    [deviceId, resolvedUserId],
  );

  if (result.rowCount === 0) {
    throw new Error("El dispositivo no existe.");
  }

  const devices = await getPushDevices(resolvedUserId);
  if (devices.length === 0) {
    await query(
      `
        update users
        set receives_push = false,
            updated_at = now()
        where id = $1
      `,
      [resolvedUserId],
    );
  }
}
