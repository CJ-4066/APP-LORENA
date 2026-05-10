import { randomUUID } from "node:crypto";

import type { QueryResultRow } from "pg";

import { isDatabaseConfigured, query } from "../infrastructure/database.js";

export type BadgeCategory =
  | "DESPERTAR"
  | "TAROT"
  | "PSYCHOLOGY"
  | "COMMUNITY"
  | "PURCHASE"
  | "INSTRUCTOR"
  | "AWARD"
  | "SECRET";

export type BadgeRarity =
  | "COMMON"
  | "RARE"
  | "EPIC"
  | "LEGENDARY"
  | "MYTHIC";

export type BadgeType =
  | "AUTOMATIC"
  | "MANUAL"
  | "SECRET"
  | "TEMPORARY"
  | "EVOLVING";

export type BadgeRuleOperator = "GTE" | "GT" | "EQ" | "LTE" | "LT";

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  type: BadgeType;
  iconUrl: string;
  isSecret: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  unlockedAt: string;
  source: string;
  metadata: Record<string, unknown>;
}

export interface BadgeRule {
  id: string;
  badgeId: string;
  ruleKey: string;
  operator: BadgeRuleOperator;
  value: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BadgeCategorySummary {
  category: BadgeCategory;
  totalCount: number;
  unlockedCount: number;
}

export interface BadgeProfileItem extends Badge {
  unlocked: boolean;
  unlockedAt: string | null;
  source: string | null;
  metadata: Record<string, unknown>;
  displayName: string;
  displayDescription: string;
  displayIconUrl: string;
}

export interface UserBadgeProfile {
  totalCount: number;
  unlockedCount: number;
  lockedCount: number;
  hiddenCount: number;
  categories: BadgeCategorySummary[];
  badges: BadgeProfileItem[];
}

export interface CreateBadgeInput {
  id?: string;
  name?: string;
  description?: string;
  category?: BadgeCategory;
  rarity?: BadgeRarity;
  type?: BadgeType;
  iconUrl?: string;
  isSecret?: boolean;
  isActive?: boolean;
  rules?: Array<{
    ruleKey?: string;
    operator?: BadgeRuleOperator;
    value?: string | number;
    isActive?: boolean;
  }>;
}

export interface TrackBadgeActionInput {
  actionKey?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

export interface ManualBadgeAwardInput {
  userId?: string;
  reason?: string;
}

interface BadgeRow extends QueryResultRow {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  type: BadgeType;
  icon_url: string;
  is_secret: boolean;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

interface UserBadgeRow extends QueryResultRow {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: Date | string;
  source: string;
  metadata: unknown;
}

interface BadgeRuleRow extends QueryResultRow {
  id: string;
  badge_id: string;
  rule_key: string;
  operator: BadgeRuleOperator;
  value: string;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

interface BadgeMetricRow extends QueryResultRow {
  user_id: string;
  metric_key: string;
  metric_value: number;
  updated_at: Date | string;
}

interface BadgeMetricDefinition {
  metricKey: string;
  defaultIncrement: number;
}

const hiddenBadgeName = "Insignia oculta";
const hiddenBadgeDescription =
  "Esta insignia permanece velada hasta que la desbloquees.";
const hiddenBadgeIconUrl = "badge://hidden";

const badgeMetricMap: Record<string, BadgeMetricDefinition> = {
  app_opened: {
    metricKey: "app_open_count",
    defaultIncrement: 1,
  },
  course_started: {
    metricKey: "course_started_count",
    defaultIncrement: 1,
  },
  tarot_draw_completed: {
    metricKey: "tarot_draw_count",
    defaultIncrement: 1,
  },
  psychology_exercise_completed: {
    metricKey: "psychology_exercise_count",
    defaultIncrement: 1,
  },
  community_message_sent: {
    metricKey: "community_message_count",
    defaultIncrement: 1,
  },
  purchase_completed: {
    metricKey: "purchase_count",
    defaultIncrement: 1,
  },
  course_published: {
    metricKey: "course_published_count",
    defaultIncrement: 1,
  },
};

function buildBadgeSeed(
  id: string,
  name: string,
  description: string,
  category: BadgeCategory,
  rarity: BadgeRarity,
  type: BadgeType,
  options: {
    isSecret?: boolean;
    isActive?: boolean;
  } = {},
): Badge {
  const now = new Date().toISOString();
  return {
    id,
    name,
    description,
    category,
    rarity,
    type,
    iconUrl: `badge://${id}`,
    isSecret:
      options.isSecret ?? (category === "SECRET" || type === "SECRET"),
    isActive: options.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

function buildRuleSeed(
  id: string,
  badgeId: string,
  ruleKey: string,
  operator: BadgeRuleOperator,
  value: string,
): BadgeRule {
  const now = new Date().toISOString();
  return {
    id,
    badgeId,
    ruleKey,
    operator,
    value,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

const seededBadges: Badge[] = [
  buildBadgeSeed(
    "badge-el-primer-velo",
    "El Primer Velo",
    "Abriste el portal de la app y marcaste tu primera huella en el templo.",
    "DESPERTAR",
    "COMMON",
    "AUTOMATIC",
  ),
  buildBadgeSeed(
    "badge-el-llamado",
    "El Llamado",
    "Iniciaste tu primer curso y respondiste al llamado del aprendizaje.",
    "DESPERTAR",
    "RARE",
    "AUTOMATIC",
  ),
  buildBadgeSeed(
    "badge-ojos-del-umbral",
    "Ojos del Umbral",
    "Tu percepción empieza a ver patrones donde antes había ruido.",
    "DESPERTAR",
    "EPIC",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-la-puerta-entreabierta",
    "La Puerta Entreabierta",
    "Tu práctica ya no es intuición aislada: empieza a convertirse en camino.",
    "DESPERTAR",
    "LEGENDARY",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-el-alma-despierta",
    "El Alma Despierta",
    "Tu ritmo interior se alinea con una vocación espiritual más consciente.",
    "DESPERTAR",
    "MYTHIC",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-voz-del-arcano",
    "Voz del Arcano",
    "Realizaste tu primera tirada y entraste en diálogo con el símbolo.",
    "TAROT",
    "COMMON",
    "AUTOMATIC",
  ),
  buildBadgeSeed(
    "badge-guardian-del-oraculo",
    "Guardián del Oráculo",
    "Custodias la lectura con respeto, escucha y sentido ritual.",
    "TAROT",
    "RARE",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-hijo-de-la-luna",
    "Hijo de la Luna",
    "Tu vínculo con el tarot ya vibra con intuición nocturna y profundidad.",
    "TAROT",
    "EPIC",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-tejedor-del-destino",
    "Tejedor del Destino",
    "Acumulaste diez tiradas y empezaste a reconocer patrones repetidos.",
    "TAROT",
    "LEGENDARY",
    "AUTOMATIC",
  ),
  buildBadgeSeed(
    "badge-portador-del-arcano",
    "Portador del Arcano",
    "Tu lectura se vuelve consistente, simbólica y con dirección propia.",
    "TAROT",
    "LEGENDARY",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-ojo-del-vacio",
    "Ojo del Vacío",
    "Lees el silencio entre las cartas y sostienes la tensión del misterio.",
    "TAROT",
    "MYTHIC",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-explorador-interior",
    "Explorador Interior",
    "Completaste tu primer ejercicio psicológico y abriste una capa más íntima del trabajo interno.",
    "PSYCHOLOGY",
    "COMMON",
    "AUTOMATIC",
  ),
  buildBadgeSeed(
    "badge-espejo-del-alma",
    "Espejo del Alma",
    "Sostienes el reflejo emocional sin escapar ni maquillar el proceso.",
    "PSYCHOLOGY",
    "RARE",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-caminante-de-sombras",
    "Caminante de Sombras",
    "Te adentras en zonas complejas con disciplina y presencia.",
    "PSYCHOLOGY",
    "EPIC",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-el-portal-interior",
    "El Portal Interior",
    "Tu proceso deja de ser teoría y empieza a modificar la forma en que vives.",
    "PSYCHOLOGY",
    "LEGENDARY",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-el-renacido",
    "El Renacido",
    "Integras crisis, lenguaje y emoción en una práctica de transformación real.",
    "PSYCHOLOGY",
    "LEGENDARY",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-consejero-etico",
    "Consejero Ético",
    "Tu manera de acompañar se rige por cuidado, criterio y responsabilidad.",
    "PSYCHOLOGY",
    "MYTHIC",
    "MANUAL",
  ),
  buildBadgeSeed(
    "badge-voz-del-circulo",
    "Voz del Círculo",
    "Enviaste tu primer mensaje válido y tomaste lugar dentro de la comunidad.",
    "COMMUNITY",
    "COMMON",
    "AUTOMATIC",
  ),
  buildBadgeSeed(
    "badge-faro-de-almas",
    "Faro de Almas",
    "Sostuviste cincuenta mensajes válidos y tu presencia ya orienta al grupo.",
    "COMMUNITY",
    "EPIC",
    "AUTOMATIC",
  ),
  buildBadgeSeed(
    "badge-guardian-del-templo",
    "Guardián del Templo",
    "Tu forma de participar protege el tono, el cuidado y el orden del espacio.",
    "COMMUNITY",
    "RARE",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-custodio-del-circulo",
    "Custodio del Círculo",
    "Tu presencia ya ayuda a estabilizar la conversación colectiva.",
    "COMMUNITY",
    "LEGENDARY",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-portador-de-armonia",
    "Portador de Armonía",
    "Aportas claridad, escucha y ritmo a la comunidad sin imponer ruido.",
    "COMMUNITY",
    "MYTHIC",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-primer-ritual",
    "Primer Ritual",
    "Completaste tu primera compra dentro del santuario.",
    "PURCHASE",
    "COMMON",
    "AUTOMATIC",
  ),
  buildBadgeSeed(
    "badge-coleccionista-mistico",
    "Coleccionista Místico",
    "Tu biblioteca ritual empieza a tomar forma propia.",
    "PURCHASE",
    "RARE",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-aliado-del-tarot",
    "Aliado del Tarot",
    "Tus compras ya sostienen una práctica más dedicada y consciente.",
    "PURCHASE",
    "EPIC",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-guardian-del-santuario",
    "Guardián del Santuario",
    "Respaldas el ecosistema con constancia y compromiso material.",
    "PURCHASE",
    "LEGENDARY",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-mecenas-arcano",
    "Mecenas Arcano",
    "Tu apoyo material fortalece la continuidad y expansión del proyecto.",
    "PURCHASE",
    "MYTHIC",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-guia-del-velo",
    "Guía del Velo",
    "Publicaste tu primer curso y abriste una ruta formativa para otros.",
    "INSTRUCTOR",
    "COMMON",
    "AUTOMATIC",
  ),
  buildBadgeSeed(
    "badge-mentor-arcano",
    "Mentor Arcano",
    "Tus enseñanzas ya tienen estructura, criterio y una voz reconocible.",
    "INSTRUCTOR",
    "RARE",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-maestro-del-umbral",
    "Maestro del Umbral",
    "Sostienes aprendizajes profundos con una pedagogía clara.",
    "INSTRUCTOR",
    "EPIC",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-formador-de-almas",
    "Formador de Almas",
    "Transformas estudio en acompañamiento formativo de largo aliento.",
    "INSTRUCTOR",
    "LEGENDARY",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-oraculo-docente",
    "Oráculo Docente",
    "Tu enseñanza irradia maestría, criterio y lenguaje iniciático.",
    "INSTRUCTOR",
    "MYTHIC",
    "EVOLVING",
  ),
  buildBadgeSeed(
    "badge-elegido-por-la-luna",
    "Elegido por la Luna",
    "Premio manual para reconocer una presencia destacada dentro del ecosistema.",
    "AWARD",
    "RARE",
    "MANUAL",
  ),
  buildBadgeSeed(
    "badge-hijo-del-eclipse",
    "Hijo del Eclipse",
    "Premio manual para procesos que atraviesan mutación y temple.",
    "AWARD",
    "EPIC",
    "MANUAL",
  ),
  buildBadgeSeed(
    "badge-llama-dorada",
    "Llama Dorada",
    "Premio manual para una contribución brillante y consistente.",
    "AWARD",
    "LEGENDARY",
    "MANUAL",
  ),
  buildBadgeSeed(
    "badge-corona-arcana",
    "Corona Arcana",
    "Premio manual reservado para hitos excepcionales dentro de la comunidad.",
    "AWARD",
    "MYTHIC",
    "MANUAL",
  ),
  buildBadgeSeed(
    "badge-arcano-legendario",
    "Arcano Legendario",
    "Premio manual máximo para trayectorias extraordinarias.",
    "AWARD",
    "MYTHIC",
    "MANUAL",
  ),
  buildBadgeSeed(
    "badge-la-carta-xiii",
    "La Carta XIII",
    "Algo en ti cruzó un umbral que no suele mostrarse a simple vista.",
    "SECRET",
    "EPIC",
    "SECRET",
    { isSecret: true },
  ),
  buildBadgeSeed(
    "badge-el-nombre-olvidado",
    "El Nombre Olvidado",
    "Recordaste una frecuencia que casi siempre permanece oculta.",
    "SECRET",
    "LEGENDARY",
    "SECRET",
    { isSecret: true },
  ),
  buildBadgeSeed(
    "badge-la-septima-puerta",
    "La Séptima Puerta",
    "Atravesaste una puerta reservada para muy pocos recorridos.",
    "SECRET",
    "LEGENDARY",
    "SECRET",
    { isSecret: true },
  ),
  buildBadgeSeed(
    "badge-el-arcano-perdido",
    "El Arcano Perdido",
    "Reuniste señales raras que no suelen aparecer juntas.",
    "SECRET",
    "MYTHIC",
    "SECRET",
    { isSecret: true },
  ),
  buildBadgeSeed(
    "badge-hijo-del-vacio",
    "Hijo del Vacío",
    "Tu práctica tocó una zona donde el símbolo se vuelve abismo fértil.",
    "SECRET",
    "MYTHIC",
    "SECRET",
    { isSecret: true },
  ),
];

const seededRules: BadgeRule[] = [
  buildRuleSeed(
    "rule-el-primer-velo-app-open",
    "badge-el-primer-velo",
    "app_open_count",
    "GTE",
    "1",
  ),
  buildRuleSeed(
    "rule-el-llamado-course-started",
    "badge-el-llamado",
    "course_started_count",
    "GTE",
    "1",
  ),
  buildRuleSeed(
    "rule-voz-del-arcano-tarot-draw",
    "badge-voz-del-arcano",
    "tarot_draw_count",
    "GTE",
    "1",
  ),
  buildRuleSeed(
    "rule-tejedor-del-destino-tarot-draw",
    "badge-tejedor-del-destino",
    "tarot_draw_count",
    "GTE",
    "10",
  ),
  buildRuleSeed(
    "rule-explorador-interior-psychology",
    "badge-explorador-interior",
    "psychology_exercise_count",
    "GTE",
    "1",
  ),
  buildRuleSeed(
    "rule-voz-del-circulo-community",
    "badge-voz-del-circulo",
    "community_message_count",
    "GTE",
    "1",
  ),
  buildRuleSeed(
    "rule-faro-de-almas-community",
    "badge-faro-de-almas",
    "community_message_count",
    "GTE",
    "50",
  ),
  buildRuleSeed(
    "rule-primer-ritual-purchase",
    "badge-primer-ritual",
    "purchase_count",
    "GTE",
    "1",
  ),
  buildRuleSeed(
    "rule-guia-del-velo-course-published",
    "badge-guia-del-velo",
    "course_published_count",
    "GTE",
    "1",
  ),
];

const mockBadges = [...seededBadges];
const mockBadgeRules = [...seededRules];
const mockUserBadgesByUser = new Map<string, UserBadge[]>();
const mockMetricsByUser = new Map<string, Map<string, number>>();

let databaseSeedPromise: Promise<void> | null = null;

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) {
    return new Date().toISOString();
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

function parseMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function mapBadgeRow(row: BadgeRow): Badge {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    rarity: row.rarity,
    type: row.type,
    iconUrl: row.icon_url,
    isSecret: row.is_secret,
    isActive: row.is_active,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function mapUserBadgeRow(row: UserBadgeRow): UserBadge {
  return {
    id: row.id,
    userId: row.user_id,
    badgeId: row.badge_id,
    unlockedAt: toIsoString(row.unlocked_at),
    source: row.source,
    metadata: parseMetadata(row.metadata),
  };
}

function mapBadgeRuleRow(row: BadgeRuleRow): BadgeRule {
  return {
    id: row.id,
    badgeId: row.badge_id,
    ruleKey: row.rule_key,
    operator: row.operator,
    value: row.value,
    isActive: row.is_active,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function compareMetric(
  metricValue: number,
  operator: BadgeRuleOperator,
  expectedValue: number,
): boolean {
  switch (operator) {
    case "GT":
      return metricValue > expectedValue;
    case "EQ":
      return metricValue === expectedValue;
    case "LTE":
      return metricValue <= expectedValue;
    case "LT":
      return metricValue < expectedValue;
    case "GTE":
    default:
      return metricValue >= expectedValue;
  }
}

function normalizeCategory(value?: string): BadgeCategory {
  const normalized = (value ?? "").trim().toUpperCase() as BadgeCategory;
  if (
    normalized === "DESPERTAR" ||
    normalized === "TAROT" ||
    normalized === "PSYCHOLOGY" ||
    normalized === "COMMUNITY" ||
    normalized === "PURCHASE" ||
    normalized === "INSTRUCTOR" ||
    normalized === "AWARD" ||
    normalized === "SECRET"
  ) {
    return normalized;
  }

  throw new Error("La categoría de insignia no es válida.");
}

function normalizeRarity(value?: string): BadgeRarity {
  const normalized = (value ?? "").trim().toUpperCase() as BadgeRarity;
  if (
    normalized === "COMMON" ||
    normalized === "RARE" ||
    normalized === "EPIC" ||
    normalized === "LEGENDARY" ||
    normalized === "MYTHIC"
  ) {
    return normalized;
  }

  throw new Error("La rareza de insignia no es válida.");
}

function normalizeType(value?: string): BadgeType {
  const normalized = (value ?? "").trim().toUpperCase() as BadgeType;
  if (
    normalized === "AUTOMATIC" ||
    normalized === "MANUAL" ||
    normalized === "SECRET" ||
    normalized === "TEMPORARY" ||
    normalized === "EVOLVING"
  ) {
    return normalized;
  }

  throw new Error("El tipo de insignia no es válido.");
}

function normalizeRuleOperator(value?: string): BadgeRuleOperator {
  const normalized = (value ?? "GTE").trim().toUpperCase() as BadgeRuleOperator;
  if (
    normalized === "GTE" ||
    normalized === "GT" ||
    normalized === "EQ" ||
    normalized === "LTE" ||
    normalized === "LT"
  ) {
    return normalized;
  }

  throw new Error("El operador de regla no es válido.");
}

function normalizeActionDefinition(input: TrackBadgeActionInput): {
  metricKey: string;
  delta: number;
} {
  const actionKey = (input.actionKey ?? "").trim();
  if (actionKey.length < 1) {
    throw new Error("El actionKey es obligatorio.");
  }

  const predefined = badgeMetricMap[actionKey];
  const metricKey = predefined?.metricKey ?? actionKey;
  const defaultIncrement = predefined?.defaultIncrement ?? 1;
  const delta = Math.max(1, Math.floor(input.value ?? defaultIncrement));

  return {
    metricKey,
    delta,
  };
}

async function ensureDatabaseSeeded(): Promise<void> {
  if (!isDatabaseConfigured()) {
    return;
  }

  if (!databaseSeedPromise) {
    databaseSeedPromise = (async () => {
      for (const badge of seededBadges) {
        await query(
          `
            insert into badges (
              id,
              name,
              description,
              category,
              rarity,
              type,
              icon_url,
              is_secret,
              is_active,
              created_at,
              updated_at
            ) values (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now()
            )
            on conflict (id) do update
              set name = excluded.name,
                  description = excluded.description,
                  category = excluded.category,
                  rarity = excluded.rarity,
                  type = excluded.type,
                  icon_url = excluded.icon_url,
                  is_secret = excluded.is_secret,
                  is_active = excluded.is_active,
                  updated_at = now()
          `,
          [
            badge.id,
            badge.name,
            badge.description,
            badge.category,
            badge.rarity,
            badge.type,
            badge.iconUrl,
            badge.isSecret,
            badge.isActive,
          ],
        );
      }

      for (const rule of seededRules) {
        await query(
          `
            insert into badge_rules (
              id,
              badge_id,
              rule_key,
              operator,
              value,
              is_active,
              created_at,
              updated_at
            ) values (
              $1, $2, $3, $4, $5, $6, now(), now()
            )
            on conflict (id) do update
              set badge_id = excluded.badge_id,
                  rule_key = excluded.rule_key,
                  operator = excluded.operator,
                  value = excluded.value,
                  is_active = excluded.is_active,
                  updated_at = now()
          `,
          [
            rule.id,
            rule.badgeId,
            rule.ruleKey,
            rule.operator,
            rule.value,
            rule.isActive,
          ],
        );
      }
    })().catch((error) => {
      databaseSeedPromise = null;
      throw error;
    });
  }

  await databaseSeedPromise;
}

async function listBadgeRules(): Promise<BadgeRule[]> {
  if (!isDatabaseConfigured()) {
    return [...mockBadgeRules];
  }

  await ensureDatabaseSeeded();
  const result = await query<BadgeRuleRow>(
    `
      select
        id,
        badge_id,
        rule_key,
        operator,
        value,
        is_active,
        created_at,
        updated_at
      from badge_rules
      order by badge_id asc, id asc
    `,
  );

  return result.rows.map(mapBadgeRuleRow);
}

async function listMetricSnapshot(userId: string): Promise<Map<string, number>> {
  if (!isDatabaseConfigured()) {
    return new Map(mockMetricsByUser.get(userId)?.entries() ?? []);
  }

  const result = await query<BadgeMetricRow>(
    `
      select user_id, metric_key, metric_value, updated_at
      from user_badge_metrics
      where user_id = $1
    `,
    [userId],
  );

  return new Map(
    result.rows.map((row) => [row.metric_key, Number(row.metric_value ?? 0)]),
  );
}

async function incrementMetric(
  userId: string,
  metricKey: string,
  delta: number,
): Promise<void> {
  if (!isDatabaseConfigured()) {
    const metrics = mockMetricsByUser.get(userId) ?? new Map<string, number>();
    metrics.set(metricKey, (metrics.get(metricKey) ?? 0) + delta);
    mockMetricsByUser.set(userId, metrics);
    return;
  }

  await query(
    `
      insert into user_badge_metrics (
        user_id,
        metric_key,
        metric_value,
        updated_at
      ) values ($1, $2, $3, now())
      on conflict (user_id, metric_key) do update
        set metric_value = user_badge_metrics.metric_value + excluded.metric_value,
            updated_at = now()
    `,
    [userId, metricKey, delta],
  );
}

function createBadgeProfile(
  badges: Badge[],
  userBadges: UserBadge[],
): UserBadgeProfile {
  const unlockedByBadgeId = new Map(
    userBadges.map((item) => [item.badgeId, item] as const),
  );

  const profileBadges = badges
    .filter((badge) => badge.isActive)
    .map<BadgeProfileItem>((badge) => {
      const unlocked = unlockedByBadgeId.get(badge.id);
      const isHidden = badge.isSecret && !unlocked;

      return {
        ...badge,
        unlocked: Boolean(unlocked),
        unlockedAt: unlocked?.unlockedAt ?? null,
        source: unlocked?.source ?? null,
        metadata: unlocked?.metadata ?? {},
        displayName: isHidden ? hiddenBadgeName : badge.name,
        displayDescription: isHidden
            ? hiddenBadgeDescription
            : badge.description,
        displayIconUrl: isHidden ? hiddenBadgeIconUrl : badge.iconUrl,
      };
    })
    .sort((left, right) => {
      if (left.unlocked != right.unlocked) {
        return left.unlocked ? -1 : 1;
      }
      if (left.unlockedAt != null && right.unlockedAt != null) {
        return right.unlockedAt.localeCompare(left.unlockedAt);
      }
      return left.name.localeCompare(right.name);
    });

  const categories = new Map<BadgeCategory, BadgeCategorySummary>();
  for (const item of profileBadges) {
    const current = categories.get(item.category) ?? {
      category: item.category,
      totalCount: 0,
      unlockedCount: 0,
    };
    current.totalCount += 1;
    if (item.unlocked) {
      current.unlockedCount += 1;
    }
    categories.set(item.category, current);
  }

  const unlockedCount = profileBadges.filter((item) => item.unlocked).length;
  const hiddenCount = profileBadges.filter(
    (item) => item.isSecret && !item.unlocked,
  ).length;

  return {
    totalCount: profileBadges.length,
    unlockedCount,
    lockedCount: profileBadges.length - unlockedCount,
    hiddenCount,
    categories: [...categories.values()],
    badges: profileBadges,
  };
}

function evaluateBadgeRules(
  badge: Badge,
  rules: BadgeRule[],
  metrics: Map<string, number>,
): boolean {
  if (badge.type === "MANUAL" || badge.type === "TEMPORARY") {
    return false;
  }

  const badgeRules = rules.filter(
    (rule) => rule.badgeId === badge.id && rule.isActive,
  );
  if (badgeRules.length < 1) {
    return false;
  }

  return badgeRules.every((rule) => {
    const currentValue = metrics.get(rule.ruleKey) ?? 0;
    const expectedValue = Number(rule.value);
    if (Number.isNaN(expectedValue)) {
      return false;
    }

    return compareMetric(currentValue, rule.operator, expectedValue);
  });
}

export async function createBadge(input: CreateBadgeInput): Promise<Badge> {
  const name = input.name?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  if (name.length < 1 || description.length < 1) {
    throw new Error("La insignia necesita nombre y descripción.");
  }

  const badge: Badge = {
    id: input.id?.trim() || `badge-${randomUUID()}`,
    name,
    description,
    category: normalizeCategory(input.category),
    rarity: normalizeRarity(input.rarity),
    type: normalizeType(input.type),
    iconUrl: input.iconUrl?.trim() || `badge://${randomUUID()}`,
    isSecret: Boolean(input.isSecret),
    isActive: input.isActive ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const rules = (input.rules ?? []).map((rule) => ({
    id: `rule-${randomUUID()}`,
    badgeId: badge.id,
    ruleKey: rule.ruleKey?.trim() ?? "",
    operator: normalizeRuleOperator(rule.operator),
    value: String(rule.value ?? "1"),
    isActive: rule.isActive ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  if (!isDatabaseConfigured()) {
    mockBadges.unshift(badge);
    mockBadgeRules.push(...rules);
    return badge;
  }

  await ensureDatabaseSeeded();
  await query(
    `
      insert into badges (
        id,
        name,
        description,
        category,
        rarity,
        type,
        icon_url,
        is_secret,
        is_active,
        created_at,
        updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())
    `,
    [
      badge.id,
      badge.name,
      badge.description,
      badge.category,
      badge.rarity,
      badge.type,
      badge.iconUrl,
      badge.isSecret,
      badge.isActive,
    ],
  );

  for (const rule of rules) {
    if (rule.ruleKey.length < 1) {
      continue;
    }

    await query(
      `
        insert into badge_rules (
          id,
          badge_id,
          rule_key,
          operator,
          value,
          is_active,
          created_at,
          updated_at
        ) values ($1, $2, $3, $4, $5, $6, now(), now())
      `,
      [
        rule.id,
        rule.badgeId,
        rule.ruleKey,
        rule.operator,
        rule.value,
        rule.isActive,
      ],
    );
  }

  return badge;
}

export async function getAllBadges(): Promise<Badge[]> {
  if (!isDatabaseConfigured()) {
    return [...mockBadges].sort((left, right) => left.name.localeCompare(right.name));
  }

  await ensureDatabaseSeeded();
  const result = await query<BadgeRow>(
    `
      select
        id,
        name,
        description,
        category,
        rarity,
        type,
        icon_url,
        is_secret,
        is_active,
        created_at,
        updated_at
      from badges
      order by category asc, rarity asc, name asc
    `,
  );

  return result.rows.map(mapBadgeRow);
}

export async function getBadgeById(badgeId: string): Promise<Badge | null> {
  const normalizedBadgeId = badgeId.trim();
  if (normalizedBadgeId.length < 1) {
    return null;
  }

  if (!isDatabaseConfigured()) {
    return mockBadges.find((item) => item.id === normalizedBadgeId) ?? null;
  }

  await ensureDatabaseSeeded();
  const result = await query<BadgeRow>(
    `
      select
        id,
        name,
        description,
        category,
        rarity,
        type,
        icon_url,
        is_secret,
        is_active,
        created_at,
        updated_at
      from badges
      where id = $1
      limit 1
    `,
    [normalizedBadgeId],
  );

  return result.rows[0] ? mapBadgeRow(result.rows[0]) : null;
}

export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const normalizedUserId = userId.trim();
  if (normalizedUserId.length < 1) {
    return [];
  }

  if (!isDatabaseConfigured()) {
    return [...(mockUserBadgesByUser.get(normalizedUserId) ?? [])].sort(
      (left, right) => right.unlockedAt.localeCompare(left.unlockedAt),
    );
  }

  await ensureDatabaseSeeded();
  const result = await query<UserBadgeRow>(
    `
      select id, user_id, badge_id, unlocked_at, source, metadata
      from user_badges
      where user_id = $1
      order by unlocked_at desc
    `,
    [normalizedUserId],
  );

  return result.rows.map(mapUserBadgeRow);
}

export async function unlockBadge(
  userId: string,
  badgeId: string,
  source: string,
  metadata: Record<string, unknown> = {},
): Promise<UserBadge> {
  const normalizedUserId = userId.trim();
  const normalizedBadgeId = badgeId.trim();
  const normalizedSource = source.trim() || "system";

  if (normalizedUserId.length < 1 || normalizedBadgeId.length < 1) {
    throw new Error("unlockBadge necesita userId y badgeId.");
  }

  const badge = await getBadgeById(normalizedBadgeId);
  if (!badge || !badge.isActive) {
    throw new Error("La insignia no existe o está inactiva.");
  }

  if (!isDatabaseConfigured()) {
    const current = mockUserBadgesByUser.get(normalizedUserId) ?? [];
    const existing = current.find((item) => item.badgeId === normalizedBadgeId);
    if (existing) {
      return existing;
    }

    const next: UserBadge = {
      id: randomUUID(),
      userId: normalizedUserId,
      badgeId: normalizedBadgeId,
      unlockedAt: new Date().toISOString(),
      source: normalizedSource,
      metadata,
    };
    mockUserBadgesByUser.set(normalizedUserId, [next, ...current]);
    return next;
  }

  await ensureDatabaseSeeded();
  const existingResult = await query<UserBadgeRow>(
    `
      select id, user_id, badge_id, unlocked_at, source, metadata
      from user_badges
      where user_id = $1
        and badge_id = $2
      limit 1
    `,
    [normalizedUserId, normalizedBadgeId],
  );

  if (existingResult.rows[0]) {
    return mapUserBadgeRow(existingResult.rows[0]);
  }

  const insertResult = await query<UserBadgeRow>(
    `
      insert into user_badges (
        id,
        user_id,
        badge_id,
        unlocked_at,
        source,
        metadata
      ) values ($1, $2, $3, now(), $4, $5::jsonb)
      on conflict (user_id, badge_id) do nothing
      returning id, user_id, badge_id, unlocked_at, source, metadata
    `,
    [
      randomUUID(),
      normalizedUserId,
      normalizedBadgeId,
      normalizedSource,
      JSON.stringify(metadata),
    ],
  );

  if (insertResult.rows[0]) {
    return mapUserBadgeRow(insertResult.rows[0]);
  }

  const currentResult = await query<UserBadgeRow>(
    `
      select id, user_id, badge_id, unlocked_at, source, metadata
      from user_badges
      where user_id = $1
        and badge_id = $2
      limit 1
    `,
    [normalizedUserId, normalizedBadgeId],
  );

  if (!currentResult.rows[0]) {
    throw new Error("No se pudo desbloquear la insignia.");
  }

  return mapUserBadgeRow(currentResult.rows[0]);
}

export async function evaluateUserBadges(userId: string): Promise<UserBadge[]> {
  const normalizedUserId = userId.trim();
  if (normalizedUserId.length < 1) {
    return [];
  }

  const [badges, rules, currentUserBadges, metrics] = await Promise.all([
    getAllBadges(),
    listBadgeRules(),
    getUserBadges(normalizedUserId),
    listMetricSnapshot(normalizedUserId),
  ]);

  const unlockedIds = new Set(currentUserBadges.map((item) => item.badgeId));
  const newlyUnlocked: UserBadge[] = [];

  for (const badge of badges) {
    if (!badge.isActive || unlockedIds.has(badge.id)) {
      continue;
    }

    if (!evaluateBadgeRules(badge, rules, metrics)) {
      continue;
    }

    const unlocked = await unlockBadge(
      normalizedUserId,
      badge.id,
      `rule:${badge.id}`,
      {
        ruleKeys: rules
            .filter((rule) => rule.badgeId === badge.id && rule.isActive)
            .map((rule) => rule.ruleKey),
      },
    );
    unlockedIds.add(badge.id);
    newlyUnlocked.push(unlocked);
  }

  return newlyUnlocked;
}

export async function awardManualBadge(
  userId: string,
  badgeId: string,
  adminId: string,
  reason: string,
): Promise<UserBadge> {
  const badge = await getBadgeById(badgeId);
  if (!badge) {
    throw new Error("La insignia no existe.");
  }
  if (!badge.isActive) {
    throw new Error("La insignia está inactiva.");
  }

  return unlockBadge(userId, badgeId, "manual_award", {
    adminId: adminId.trim(),
    reason: reason.trim(),
  });
}

export async function getUserBadgeProfile(userId: string): Promise<UserBadgeProfile> {
  const [badges, userBadges] = await Promise.all([
    getAllBadges(),
    getUserBadges(userId),
  ]);

  return createBadgeProfile(badges, userBadges);
}

export async function recordBadgeAction(
  userId: string,
  input: TrackBadgeActionInput,
): Promise<UserBadgeProfile> {
  const normalizedUserId = userId.trim();
  if (normalizedUserId.length < 1) {
    throw new Error("Necesitas un userId válido para registrar la acción.");
  }

  const { metricKey, delta } = normalizeActionDefinition(input);
  await incrementMetric(normalizedUserId, metricKey, delta);
  await evaluateUserBadges(normalizedUserId);
  return getUserBadgeProfile(normalizedUserId);
}
