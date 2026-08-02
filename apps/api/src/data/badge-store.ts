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
export type BadgePathId =
  | "despertar_path"
  | "tarot_path"
  | "psychology_path"
  | "community_path"
  | "purchase_path"
  | "instructor_path"
  | "award_path"
  | "secret_path";

export interface BadgeStepRule {
  ruleKey: string;
  operator: BadgeRuleOperator;
  value: string | number;
  isActive?: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  type: BadgeType;
  pathId: BadgePathId;
  pathOrder: number;
  stepIndex: number;
  stepTitle: string;
  stepDescription: string;
  prerequisiteBadgeIds: string[];
  lockedReason: string;
  isPathVisible: boolean;
  isConditionHidden: boolean;
  iconUrl: string;
  isSecret: boolean;
  isActive: boolean;
  rules?: BadgeRule[];
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

export type BadgeAuditAction =
  | "CREATED"
  | "UPDATED"
  | "ACTIVATED"
  | "DEACTIVATED"
  | "REORDERED";

export type BadgeAuditSource = "admin" | "manual" | "system";

export interface BadgeAuditLogEntry {
  id: string;
  badgeId: string;
  badgeName: string | null;
  pathId: BadgePathId | null;
  action: BadgeAuditAction;
  fieldChanged: string;
  previousValue: unknown;
  newValue: unknown;
  changedAt: string;
  changedBy: string;
  source: BadgeAuditSource;
}

export interface BadgeAuditLogQuery {
  badgeId?: string;
  pathId?: BadgePathId;
  action?: BadgeAuditAction;
  fieldChanged?: string;
  date?: string;
}

export interface BadgeDiagnosticIssue {
  severity: "error" | "warning" | "info";
  badgeId?: string;
  pathId?: BadgePathId;
  message: string;
}

export interface BadgeDiagnosticsResult {
  ok: boolean;
  issues: BadgeDiagnosticIssue[];
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
  pathId?: BadgePathId;
  pathOrder?: number;
  stepIndex?: number;
  stepTitle?: string;
  stepDescription?: string;
  prerequisiteBadgeIds?: string[];
  lockedReason?: string;
  isPathVisible?: boolean;
  isConditionHidden?: boolean;
  iconUrl?: string;
  isSecret?: boolean;
  isActive?: boolean;
  rules?: BadgeStepRule[];
}

export interface UpdateBadgeInput extends CreateBadgeInput {
  id?: string;
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
  path_id: BadgePathId;
  path_order: number;
  step_index: number;
  step_title: string;
  step_description: string;
  prerequisite_badge_ids: unknown;
  locked_reason: string;
  is_path_visible: boolean;
  is_condition_hidden: boolean;
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

interface AuditRow extends QueryResultRow {
  id: string;
  actor_type: string;
  actor_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: unknown;
  created_at: Date | string;
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
const badgeStepTitles = [
  "Activación inicial",
  "Práctica repetida",
  "Consistencia",
  "Maestría",
  "Legado",
] as const;

interface BadgeSeedDefinition {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  type: BadgeType;
  pathId: BadgePathId;
  pathOrder: number;
  stepIndex: number;
  stepTitle: string;
  stepDescription: string;
  prerequisiteBadgeIds: string[];
  lockedReason: string;
  isPathVisible: boolean;
  isConditionHidden: boolean;
  isSecret: boolean;
  isActive: boolean;
  rules: BadgeStepRule[];
}

interface BadgeStepSeedInput {
  id: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
  type: BadgeType;
  stepDescription: string;
  rule?: BadgeStepRule;
  prerequisiteBadgeIds?: string[];
  lockedReason?: string;
  isSecret?: boolean;
  isActive?: boolean;
  isConditionHidden?: boolean;
}

interface SequentialPathSeedConfig {
  category: BadgeCategory;
  pathId: BadgePathId;
  pathOrder: number;
  isPathVisible: boolean;
  isConditionHidden: boolean;
  chainPrerequisites: boolean;
}

function getPathDefaults(category: BadgeCategory): {
  pathId: BadgePathId;
  pathOrder: number;
  isPathVisible: boolean;
  isConditionHidden: boolean;
} {
  switch (category) {
    case "DESPERTAR":
      return {
        pathId: "despertar_path",
        pathOrder: 1,
        isPathVisible: true,
        isConditionHidden: false,
      };
    case "TAROT":
      return {
        pathId: "tarot_path",
        pathOrder: 2,
        isPathVisible: true,
        isConditionHidden: false,
      };
    case "PSYCHOLOGY":
      return {
        pathId: "psychology_path",
        pathOrder: 3,
        isPathVisible: true,
        isConditionHidden: false,
      };
    case "COMMUNITY":
      return {
        pathId: "community_path",
        pathOrder: 4,
        isPathVisible: true,
        isConditionHidden: false,
      };
    case "PURCHASE":
      return {
        pathId: "purchase_path",
        pathOrder: 5,
        isPathVisible: true,
        isConditionHidden: false,
      };
    case "INSTRUCTOR":
      return {
        pathId: "instructor_path",
        pathOrder: 6,
        isPathVisible: true,
        isConditionHidden: false,
      };
    case "AWARD":
      return {
        pathId: "award_path",
        pathOrder: 7,
        isPathVisible: true,
        isConditionHidden: false,
      };
    case "SECRET":
      return {
        pathId: "secret_path",
        pathOrder: 8,
        isPathVisible: false,
        isConditionHidden: true,
      };
  }
}

function createSequentialPathSeeds(
  config: SequentialPathSeedConfig,
  steps: BadgeStepSeedInput[],
): BadgeSeedDefinition[] {
  return steps.map((step, index) => {
    const stepTitle = badgeStepTitles[index];
    const lockedReason =
      step.lockedReason ??
      (config.isConditionHidden
        ? "Esta condición permanece oculta hasta completar la ruta."
        : `Completa el escalón anterior para avanzar en ${config.category}.`);

    return {
      id: step.id,
      name: step.name,
      description: step.description,
      category: config.category,
      rarity: step.rarity,
      type: step.type,
      pathId: config.pathId,
      pathOrder: config.pathOrder,
      stepIndex: index + 1,
      stepTitle,
      stepDescription: step.stepDescription,
      prerequisiteBadgeIds: config.chainPrerequisites
        ? index === 0
          ? []
          : [steps[index - 1].id]
        : step.prerequisiteBadgeIds ?? [],
      lockedReason,
      isPathVisible: config.isPathVisible,
      isConditionHidden: step.isConditionHidden ?? config.isConditionHidden,
      isSecret: step.isSecret ?? config.category === "SECRET",
      isActive: step.isActive ?? true,
      rules: step.rule ? [step.rule] : [],
    };
  });
}

const seededBadgeDefinitions: BadgeSeedDefinition[] = [
  ...createSequentialPathSeeds(
    {
      category: "DESPERTAR",
      pathId: "despertar_path",
      pathOrder: 1,
      isPathVisible: true,
      isConditionHidden: false,
      chainPrerequisites: true,
    },
    [
      {
        id: "badge-el-primer-velo",
        name: "Primer Despertar",
        description:
          "La primera apertura: entraste a la app y diste tu huella inicial.",
        rarity: "COMMON",
        type: "AUTOMATIC",
        stepDescription: "Abres la app por primera vez.",
        rule: { ruleKey: "app_open_count", operator: "GTE", value: 1 },
      },
      {
        id: "badge-el-llamado",
        name: "Explorador Inicial",
        description:
          "Tu práctica comienza a tomar forma después de varias aperturas.",
        rarity: "RARE",
        type: "AUTOMATIC",
        stepDescription: "Mantienes presencia inicial dentro de la app.",
        rule: { ruleKey: "app_open_count", operator: "GTE", value: 3 },
      },
      {
        id: "badge-ojos-del-umbral",
        name: "Presencia Constante",
        description:
          "Ya no entras por impulso: vuelves con una frecuencia reconocible.",
        rarity: "EPIC",
        type: "EVOLVING",
        stepDescription: "Sostienes una presencia recurrente en la app.",
        rule: { ruleKey: "app_open_count", operator: "GTE", value: 7 },
      },
      {
        id: "badge-la-puerta-entreabierta",
        name: "Conciencia Activa",
        description:
          "Tu atención ya se ordena y la experiencia deja de sentirse casual.",
        rarity: "LEGENDARY",
        type: "EVOLVING",
        stepDescription: "Tu uso deja de ser ocasional y se vuelve enfoque.",
        rule: { ruleKey: "app_open_count", operator: "GTE", value: 21 },
      },
      {
        id: "badge-el-alma-despierta",
        name: "Camino Despierto",
        description:
          "La relación con la app ya es un hábito consciente y sostenido.",
        rarity: "MYTHIC",
        type: "EVOLVING",
        stepDescription: "Transformas la apertura constante en una práctica.",
        rule: { ruleKey: "app_open_count", operator: "GTE", value: 40 },
      },
    ],
  ),
  ...createSequentialPathSeeds(
    {
      category: "TAROT",
      pathId: "tarot_path",
      pathOrder: 2,
      isPathVisible: true,
      isConditionHidden: false,
      chainPrerequisites: true,
    },
    [
      {
        id: "badge-voz-del-arcano",
        name: "Primer Arcano",
        description: "Tu primera tirada abrió el diálogo con el símbolo.",
        rarity: "COMMON",
        type: "AUTOMATIC",
        stepDescription: "Realizas tu primera tirada de tarot.",
        rule: { ruleKey: "tarot_draw_count", operator: "GTE", value: 1 },
      },
      {
        id: "badge-guardian-del-oraculo",
        name: "Aprendiz del Tarot",
        description:
          "Ya repetiste la práctica suficiente como para empezar a reconocer patrones.",
        rarity: "RARE",
        type: "EVOLVING",
        stepDescription: "Empiezas a practicar tarot de forma recurrente.",
        rule: { ruleKey: "tarot_draw_count", operator: "GTE", value: 10 },
      },
      {
        id: "badge-hijo-de-la-luna",
        name: "Intérprete Simbólico",
        description:
          "El tarot deja de ser lectura literal y se vuelve lenguaje interno.",
        rarity: "EPIC",
        type: "EVOLVING",
        stepDescription: "Interpretas símbolos con más profundidad.",
        rule: { ruleKey: "tarot_draw_count", operator: "GTE", value: 30 },
      },
      {
        id: "badge-tejedor-del-destino",
        name: "Guardián del Arcano",
        description:
          "Tu práctica ya sostiene orden, memoria y una mirada más fina.",
        rarity: "LEGENDARY",
        type: "AUTOMATIC",
        stepDescription: "Sostienes una práctica madura y consistente.",
        rule: { ruleKey: "tarot_draw_count", operator: "GTE", value: 75 },
      },
      {
        id: "badge-portador-del-arcano",
        name: "Maestro del Tarot",
        description:
          "Tu recorrido con el tarot alcanza un nivel de dominio y lectura propia.",
        rarity: "MYTHIC",
        type: "EVOLVING",
        stepDescription: "Consolidas dominio de la ruta del tarot.",
        rule: { ruleKey: "tarot_draw_count", operator: "GTE", value: 150 },
      },
    ],
  ),
  ...createSequentialPathSeeds(
    {
      category: "PSYCHOLOGY",
      pathId: "psychology_path",
      pathOrder: 3,
      isPathVisible: true,
      isConditionHidden: false,
      chainPrerequisites: true,
    },
    [
      {
        id: "badge-explorador-interior",
        name: "Primera Mirada Interior",
        description:
          "El primer ejercicio abrió una capa más íntima de tu proceso.",
        rarity: "COMMON",
        type: "AUTOMATIC",
        stepDescription: "Completas tu primer ejercicio psicológico.",
        rule: {
          ruleKey: "psychology_exercise_count",
          operator: "GTE",
          value: 1,
        },
      },
      {
        id: "badge-espejo-del-alma",
        name: "Explorador Interior",
        description:
          "Sostienes el reflejo emocional sin maquillar lo que aparece.",
        rarity: "RARE",
        type: "EVOLVING",
        stepDescription: "Repites ejercicios y exploras tu mundo interno.",
        rule: {
          ruleKey: "psychology_exercise_count",
          operator: "GTE",
          value: 5,
        },
      },
      {
        id: "badge-caminante-de-sombras",
        name: "Proceso Consciente",
        description:
          "Tu trabajo interno ya tiene una intención clara y sostenida.",
        rarity: "EPIC",
        type: "EVOLVING",
        stepDescription: "Sostienes constancia en tu proceso personal.",
        rule: {
          ruleKey: "psychology_exercise_count",
          operator: "GTE",
          value: 15,
        },
      },
      {
        id: "badge-el-portal-interior",
        name: "Integrador Emocional",
        description:
          "Lo aprendido empieza a cambiar tu forma de habitar la experiencia.",
        rarity: "LEGENDARY",
        type: "EVOLVING",
        stepDescription: "Integra lo trabajado en tu vida cotidiana.",
        rule: {
          ruleKey: "psychology_exercise_count",
          operator: "GTE",
          value: 40,
        },
      },
      {
        id: "badge-el-renacido",
        name: "Alquimista Interior",
        description:
          "Tu proceso ya opera como transformación profunda y sostenida.",
        rarity: "MYTHIC",
        type: "EVOLVING",
        stepDescription: "Consolidas un cambio interno de largo aliento.",
        rule: {
          ruleKey: "psychology_exercise_count",
          operator: "GTE",
          value: 80,
        },
      },
    ],
  ),
  ...createSequentialPathSeeds(
    {
      category: "COMMUNITY",
      pathId: "community_path",
      pathOrder: 4,
      isPathVisible: true,
      isConditionHidden: false,
      chainPrerequisites: true,
    },
    [
      {
        id: "badge-voz-del-circulo",
        name: "Primera Voz",
        description: "Tu primer mensaje abrió presencia dentro de la comunidad.",
        rarity: "COMMON",
        type: "AUTOMATIC",
        stepDescription: "Envíes tu primer mensaje válido.",
        rule: {
          ruleKey: "community_message_count",
          operator: "GTE",
          value: 1,
        },
      },
      {
        id: "badge-faro-de-almas",
        name: "Participante Activo",
        description:
          "Tu participación ya muestra continuidad y una presencia reconocible.",
        rarity: "RARE",
        type: "AUTOMATIC",
        stepDescription: "Llegas a una participación recurrente.",
        rule: {
          ruleKey: "community_message_count",
          operator: "GTE",
          value: 10,
        },
      },
      {
        id: "badge-guardian-del-templo",
        name: "Presencia Comunitaria",
        description:
          "Ya aportas ritmo y orden al espacio con tus intervenciones.",
        rarity: "EPIC",
        type: "EVOLVING",
        stepDescription: "Tu participación empieza a sostener al grupo.",
        rule: {
          ruleKey: "community_message_count",
          operator: "GTE",
          value: 30,
        },
      },
      {
        id: "badge-custodio-del-circulo",
        name: "Guardián del Espacio",
        description:
          "Tu presencia ayuda a cuidar el tono y la estabilidad del espacio.",
        rarity: "LEGENDARY",
        type: "EVOLVING",
        stepDescription: "Tu participación protege el clima comunitario.",
        rule: {
          ruleKey: "community_message_count",
          operator: "GTE",
          value: 100,
        },
      },
      {
        id: "badge-portador-de-armonia",
        name: "Pilar de la Comunidad",
        description:
          "Tu aporte ya funciona como sostén visible dentro del espacio.",
        rarity: "MYTHIC",
        type: "EVOLVING",
        stepDescription: "Tu participación se vuelve referencia comunitaria.",
        rule: {
          ruleKey: "community_message_count",
          operator: "GTE",
          value: 250,
        },
      },
    ],
  ),
  ...createSequentialPathSeeds(
    {
      category: "PURCHASE",
      pathId: "purchase_path",
      pathOrder: 5,
      isPathVisible: true,
      isConditionHidden: false,
      chainPrerequisites: true,
    },
    [
      {
        id: "badge-primer-ritual",
        name: "Primer Ritual",
        description:
          "Tu primera compra dentro del santuario marcó el inicio de tu compromiso material.",
        rarity: "COMMON",
        type: "AUTOMATIC",
        stepDescription: "Completas tu primera compra dentro de la tienda.",
        rule: {
          ruleKey: "purchase_count",
          operator: "GTE",
          value: 1,
        },
      },
      {
        id: "badge-coleccionista-mistico",
        name: "Coleccionista Místico",
        description:
          "Tu biblioteca ritual empieza a tomar forma con compras recurrentes.",
        rarity: "RARE",
        type: "EVOLVING",
        stepDescription: "Realizas compras de forma repetida.",
        rule: {
          ruleKey: "purchase_count",
          operator: "GTE",
          value: 3,
        },
      },
      {
        id: "badge-aliado-del-tarot",
        name: "Aliado del Tarot",
        description:
          "Tus compras ya sostienen una práctica más dedicada y consciente.",
        rarity: "EPIC",
        type: "EVOLVING",
        stepDescription: "Sostienes compromiso material con la ruta.",
        rule: {
          ruleKey: "purchase_count",
          operator: "GTE",
          value: 8,
        },
      },
      {
        id: "badge-guardian-del-santuario",
        name: "Guardián del Santuario",
        description:
          "Tu apoyo material ya muestra constancia y respaldo real al ecosistema.",
        rarity: "LEGENDARY",
        type: "EVOLVING",
        stepDescription: "Sostienes compras como parte de tu recorrido.",
        rule: {
          ruleKey: "purchase_count",
          operator: "GTE",
          value: 20,
        },
      },
      {
        id: "badge-mecenas-arcano",
        name: "Mecenas Arcano",
        description:
          "Tu apoyo material fortalece la continuidad y expansión del proyecto.",
        rarity: "MYTHIC",
        type: "EVOLVING",
        stepDescription: "Tu compromiso material se vuelve legado.",
        rule: {
          ruleKey: "purchase_count",
          operator: "GTE",
          value: 50,
        },
      },
    ],
  ),
  ...createSequentialPathSeeds(
    {
      category: "INSTRUCTOR",
      pathId: "instructor_path",
      pathOrder: 6,
      isPathVisible: true,
      isConditionHidden: false,
      chainPrerequisites: true,
    },
    [
      {
        id: "badge-guia-del-velo",
        name: "Guía del Velo",
        description: "Publicaste tu primer curso y abriste una ruta formativa.",
        rarity: "COMMON",
        type: "AUTOMATIC",
        stepDescription: "Publicas tu primer curso o material educativo.",
        rule: {
          ruleKey: "course_published_count",
          operator: "GTE",
          value: 1,
        },
      },
      {
        id: "badge-mentor-arcano",
        name: "Mentor Arcano",
        description:
          "Tus enseñanzas empiezan a tener estructura y una voz reconocible.",
        rarity: "RARE",
        type: "EVOLVING",
        stepDescription: "Publicas contenido formativo de forma recurrente.",
        rule: {
          ruleKey: "course_published_count",
          operator: "GTE",
          value: 2,
        },
      },
      {
        id: "badge-maestro-del-umbral",
        name: "Maestro del Umbral",
        description:
          "Tus materiales sostienen aprendizajes profundos con claridad.",
        rarity: "EPIC",
        type: "EVOLVING",
        stepDescription: "Consolidas una práctica docente más sólida.",
        rule: {
          ruleKey: "course_published_count",
          operator: "GTE",
          value: 4,
        },
      },
      {
        id: "badge-formador-de-almas",
        name: "Formador de Almas",
        description:
          "Transformas estudio en acompañamiento formativo de largo aliento.",
        rarity: "LEGENDARY",
        type: "EVOLVING",
        stepDescription: "Tu enseñanza ya sostiene procesos de otras personas.",
        rule: {
          ruleKey: "course_published_count",
          operator: "GTE",
          value: 8,
        },
      },
      {
        id: "badge-oraculo-docente",
        name: "Oráculo Docente",
        description:
          "Tu enseñanza irradia maestría, criterio y lenguaje iniciático.",
        rarity: "MYTHIC",
        type: "EVOLVING",
        stepDescription: "Tu trabajo formativo deja legado.",
        rule: {
          ruleKey: "course_published_count",
          operator: "GTE",
          value: 15,
        },
      },
    ],
  ),
  ...createSequentialPathSeeds(
    {
      category: "AWARD",
      pathId: "award_path",
      pathOrder: 7,
      isPathVisible: true,
      isConditionHidden: false,
      chainPrerequisites: false,
    },
    [
      {
        id: "badge-elegido-por-la-luna",
        name: "Elegido por la Luna",
        description:
          "Reconocimiento manual para una presencia destacada dentro del ecosistema.",
        rarity: "RARE",
        type: "MANUAL",
        stepDescription: "Reconocimiento inicial otorgado por el sistema.",
        lockedReason: "Este reconocimiento se entrega manualmente.",
      },
      {
        id: "badge-hijo-del-eclipse",
        name: "Hijo del Eclipse",
        description:
          "Reconocimiento manual para procesos de mutación y temple.",
        rarity: "EPIC",
        type: "MANUAL",
        stepDescription: "Reconocimiento de proceso y transformación.",
        lockedReason: "Este reconocimiento se entrega manualmente.",
      },
      {
        id: "badge-llama-dorada",
        name: "Llama Dorada",
        description:
          "Reconocimiento manual para una contribución brillante y consistente.",
        rarity: "LEGENDARY",
        type: "MANUAL",
        stepDescription: "Reconocimiento por aporte destacado.",
        lockedReason: "Este reconocimiento se entrega manualmente.",
      },
      {
        id: "badge-corona-arcana",
        name: "Corona Arcana",
        description:
          "Reconocimiento manual reservado para hitos excepcionales.",
        rarity: "MYTHIC",
        type: "MANUAL",
        stepDescription: "Reconocimiento de hito excepcional.",
        lockedReason: "Este reconocimiento se entrega manualmente.",
      },
      {
        id: "badge-arcano-legendario",
        name: "Arcano Legendario",
        description:
          "Reconocimiento manual máximo para trayectorias extraordinarias.",
        rarity: "MYTHIC",
        type: "MANUAL",
        stepDescription: "Reconocimiento máximo de trayectoria.",
        lockedReason: "Este reconocimiento se entrega manualmente.",
      },
    ],
  ),
  ...createSequentialPathSeeds(
    {
      category: "SECRET",
      pathId: "secret_path",
      pathOrder: 8,
      isPathVisible: false,
      isConditionHidden: true,
      chainPrerequisites: true,
    },
    [
      {
        id: "badge-la-carta-xiii",
        name: "La Carta XIII",
        description:
          "Algo en ti cruzó un umbral que todavía no debe mostrarse del todo.",
        rarity: "EPIC",
        type: "SECRET",
        stepDescription: "Entras a la primera zona oculta de la ruta.",
        rule: { ruleKey: "app_open_count", operator: "GTE", value: 5 },
        isSecret: true,
      },
      {
        id: "badge-el-nombre-olvidado",
        name: "El Nombre Olvidado",
        description:
          "Recordaste una frecuencia que suele permanecer fuera de foco.",
        rarity: "LEGENDARY",
        type: "SECRET",
        stepDescription: "Encuentras una señal escondida en la ruta.",
        rule: { ruleKey: "course_started_count", operator: "GTE", value: 2 },
        isSecret: true,
      },
      {
        id: "badge-la-septima-puerta",
        name: "La Séptima Puerta",
        description:
          "Atravesaste una puerta reservada para recorridos poco comunes.",
        rarity: "LEGENDARY",
        type: "SECRET",
        stepDescription: "Revelas un hito oculto de la ruta.",
        rule: { ruleKey: "tarot_draw_count", operator: "GTE", value: 20 },
        isSecret: true,
      },
      {
        id: "badge-el-arcano-perdido",
        name: "El Arcano Perdido",
        description:
          "Reuniste señales raras que no suelen aparecer juntas.",
        rarity: "MYTHIC",
        type: "SECRET",
        stepDescription: "Cruzas un umbral todavía más reservado.",
        rule: {
          ruleKey: "community_message_count",
          operator: "GTE",
          value: 40,
        },
        isSecret: true,
      },
      {
        id: "badge-hijo-del-vacio",
        name: "Hijo del Vacío",
        description:
          "Tu práctica tocó una zona donde el símbolo se vuelve abismo fértil.",
        rarity: "MYTHIC",
        type: "SECRET",
        stepDescription: "La ruta oculta se completa sin revelar su origen.",
        rule: {
          ruleKey: "purchase_count",
          operator: "GTE",
          value: 10,
        },
        isSecret: true,
      },
    ],
  ),
];

function buildBadgeSeed(seed: BadgeSeedDefinition): Badge {
  const now = new Date().toISOString();
  return {
    id: seed.id,
    name: seed.name,
    description: seed.description,
    category: seed.category,
    rarity: seed.rarity,
    type: seed.type,
    pathId: seed.pathId,
    pathOrder: seed.pathOrder,
    stepIndex: seed.stepIndex,
    stepTitle: seed.stepTitle,
    stepDescription: seed.stepDescription,
    prerequisiteBadgeIds: [...seed.prerequisiteBadgeIds],
    lockedReason: seed.lockedReason,
    isPathVisible: seed.isPathVisible,
    isConditionHidden: seed.isConditionHidden,
    iconUrl: `/assets/badges/${seed.id}.svg`,
    isSecret: seed.isSecret,
    isActive: seed.isActive,
    createdAt: now,
    updatedAt: now,
  };
}

function buildRuleSeed(
  id: string,
  badgeId: string,
  rule: BadgeStepRule,
): BadgeRule {
  const now = new Date().toISOString();
  return {
    id,
    badgeId,
    ruleKey: rule.ruleKey,
    operator: rule.operator,
    value: String(rule.value),
    isActive: rule.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

const seededBadges: Badge[] = seededBadgeDefinitions.map(buildBadgeSeed);
const seededRules: BadgeRule[] = seededBadgeDefinitions.flatMap((badge) =>
  badge.rules.map((rule, index) =>
    buildRuleSeed(`rule-${badge.id}-${index + 1}`, badge.id, rule),
  ),
);
const mockBadges = [...seededBadges];
const mockBadgeRules = [...seededRules];
const mockUserBadgesByUser = new Map<string, UserBadge[]>();
const mockMetricsByUser = new Map<string, Map<string, number>>();
const mockBadgeAuditLog: BadgeAuditLogEntry[] = [];

let databaseSeedPromise: Promise<void> | null = null;

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

const knownBadgeMetricKeys = new Set(
  Object.values(badgeMetricMap).map((item) => item.metricKey),
);

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
    pathId: row.path_id,
    pathOrder: Number(row.path_order ?? 0),
    stepIndex: Number(row.step_index ?? 0),
    stepTitle: row.step_title,
    stepDescription: row.step_description,
    prerequisiteBadgeIds: parseStringArray(row.prerequisite_badge_ids),
    lockedReason: row.locked_reason,
    isPathVisible: row.is_path_visible,
    isConditionHidden: row.is_condition_hidden,
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

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter((item) => item.length > 0);
      }
    } catch (_) {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
  }

  return [];
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

function normalizePathId(value?: string, category?: BadgeCategory): BadgePathId {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized.length < 1) {
    if (category) {
      return getPathDefaults(category).pathId;
    }

    throw new Error("pathId es obligatorio.");
  }

  switch (normalized) {
    case "despertar_path":
    case "tarot_path":
    case "psychology_path":
    case "community_path":
    case "purchase_path":
    case "instructor_path":
    case "award_path":
    case "secret_path":
      return normalized;
    default:
      throw new Error("El pathId de insignia no es válido.");
  }
}

function normalizeBadgePathOrder(
  value: number | undefined,
  pathId: BadgePathId,
): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  return getPathDefaults(
    pathId === "despertar_path"
      ? "DESPERTAR"
      : pathId === "tarot_path"
        ? "TAROT"
        : pathId === "psychology_path"
          ? "PSYCHOLOGY"
          : pathId === "community_path"
            ? "COMMUNITY"
            : pathId === "purchase_path"
              ? "PURCHASE"
              : pathId === "instructor_path"
                ? "INSTRUCTOR"
                : pathId === "award_path"
                  ? "AWARD"
                  : "SECRET",
  ).pathOrder;
}

function normalizePrerequisiteBadgeIds(value?: string[] | unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }

  return parseStringArray(value);
}

function normalizeBadgeStepIndex(
  value: number | undefined,
  prerequisites: string[],
): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  return prerequisites.length > 0 ? prerequisites.length + 1 : 1;
}

function normalizeBadgeStepIndexStrict(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("stepIndex debe ser numérico.");
  }

  const normalized = Math.floor(value);
  if (normalized < 1 || normalized > 5) {
    throw new Error("stepIndex debe estar entre 1 y 5.");
  }

  return normalized;
}

function normalizePathOrderStrict(value: unknown, fallback: number): number {
  if (typeof value === "undefined" || value === null) {
    return fallback;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("pathOrder debe ser numérico.");
  }

  return Math.floor(value);
}

function normalizeBadgePrerequisites(value: unknown, badgeId: string): string[] {
  const prerequisites = normalizePrerequisiteBadgeIds(value);
  if (prerequisites.includes(badgeId)) {
    throw new Error("prerequisiteBadgeIds no puede incluir el mismo badge.");
  }

  return prerequisites;
}

function normalizeBadgeRulesForType(
  badge: Badge,
  rules: BadgeStepRule[] | undefined,
): BadgeRule[] {
  const normalizedRules = buildBadgeRulesFromInput(badge.id, rules);
  const requiresRules =
    badge.type === "AUTOMATIC" ||
    badge.type === "TEMPORARY" ||
    badge.type === "EVOLVING";

  if (requiresRules && normalizedRules.length < 1) {
    throw new Error(
      `La insignia ${badge.type} necesita al menos una regla activa.`,
    );
  }

  for (const rule of normalizedRules) {
    if (rule.ruleKey.length < 1) {
      throw new Error("Cada regla debe incluir una métrica válida.");
    }
    if (Number.isNaN(Number(rule.value))) {
      throw new Error("Cada regla debe tener un valor numérico válido.");
    }
  }

  return normalizedRules;
}

function buildBadgeRecord(
  input: CreateBadgeInput | UpdateBadgeInput,
  existingBadge?: Badge,
): Badge {
  const baseCategory = normalizeCategory(input.category ?? existingBadge?.category);
  const pathDefaults = getPathDefaults(baseCategory);
  const pathId = normalizePathId(input.pathId ?? existingBadge?.pathId, baseCategory);
  const prerequisiteBadgeIds = normalizeBadgePrerequisites(
    input.prerequisiteBadgeIds ?? existingBadge?.prerequisiteBadgeIds ?? [],
    existingBadge?.id ?? input.id?.trim() ?? "",
  );
  const stepIndex = normalizeBadgeStepIndexStrict(
    input.stepIndex ?? existingBadge?.stepIndex ?? prerequisiteBadgeIds.length + 1,
  );
  const stepTitle =
    (typeof input.stepTitle === "string" ? input.stepTitle.trim() : "") ||
    existingBadge?.stepTitle ||
    badgeStepTitles[Math.min(stepIndex - 1, badgeStepTitles.length - 1)];
  const stepDescription =
    (typeof input.stepDescription === "string" ? input.stepDescription.trim() : "") ||
    existingBadge?.stepDescription ||
    (typeof input.description === "string" ? input.description.trim() : "") ||
    "";
  const lockedReason =
    (typeof input.lockedReason === "string" ? input.lockedReason.trim() : "") ||
    existingBadge?.lockedReason ||
    `Completa el escalón anterior para avanzar en ${baseCategory}.`;
  const isPathVisible =
    typeof input.isPathVisible === "boolean"
      ? input.isPathVisible
      : existingBadge?.isPathVisible ?? pathDefaults.isPathVisible;
  const isConditionHidden =
    typeof input.isConditionHidden === "boolean"
      ? input.isConditionHidden
      : existingBadge?.isConditionHidden ?? pathDefaults.isConditionHidden;
  const badgeId = input.id?.trim() || existingBadge?.id || `badge-${randomUUID()}`;
  const name = input.name?.trim() ?? existingBadge?.name ?? "";
  const description = input.description?.trim() ?? existingBadge?.description ?? "";

  if (name.length < 1 || description.length < 1) {
    throw new Error("La insignia necesita nombre y descripción.");
  }

  const badge: Badge = {
    id: badgeId,
    name,
    description,
    category: baseCategory,
    rarity: normalizeRarity(input.rarity ?? existingBadge?.rarity),
    type: normalizeType(input.type ?? existingBadge?.type),
    pathId,
    pathOrder: normalizePathOrderStrict(
      input.pathOrder ?? existingBadge?.pathOrder,
      pathDefaults.pathOrder,
    ),
    stepIndex,
    stepTitle,
    stepDescription,
    prerequisiteBadgeIds,
    lockedReason,
    isPathVisible,
    isConditionHidden,
    iconUrl:
      typeof input.iconUrl === "string" && input.iconUrl.trim().length > 0
        ? input.iconUrl.trim()
      : existingBadge?.iconUrl || `/assets/badges/${pathId}-${stepIndex}.svg`,
    isSecret:
      typeof input.isSecret === "boolean"
        ? input.isSecret || baseCategory === "SECRET"
        : existingBadge?.isSecret ?? baseCategory === "SECRET",
    isActive:
      typeof input.isActive === "boolean"
        ? input.isActive
        : existingBadge?.isActive ?? true,
    createdAt: existingBadge?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return badge;
}

function buildBadgeRulesFromInput(
  badgeId: string,
  rules: BadgeStepRule[] | undefined,
): BadgeRule[] {
  return (rules ?? []).map((rule) => ({
    id: `rule-${randomUUID()}`,
    badgeId,
    ruleKey: rule.ruleKey?.trim() ?? "",
    operator: normalizeRuleOperator(rule.operator),
    value: String(rule.value ?? "1"),
    isActive: rule.isActive ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    }));
}

function buildBadgeChangePayload(
  before: Badge,
  after: Badge,
): Record<string, unknown> {
  const changedFields: Record<string, { before: unknown; after: unknown }> = {};
  function valuesDiffer(left: unknown, right: unknown): boolean {
    if (Array.isArray(left) && Array.isArray(right)) {
      return JSON.stringify(left) !== JSON.stringify(right);
    }

    return left !== right;
  }

  for (const key of [
    "name",
    "description",
    "category",
    "rarity",
    "type",
    "pathId",
    "pathOrder",
    "stepIndex",
    "stepTitle",
    "stepDescription",
    "prerequisiteBadgeIds",
    "lockedReason",
    "isPathVisible",
    "isConditionHidden",
    "iconUrl",
    "isSecret",
    "isActive",
    "rules",
  ] as const) {
    if (valuesDiffer(before[key], after[key])) {
      changedFields[key] = { before: before[key], after: after[key] };
    }
  }

  return changedFields;
}

function parseAuditPayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function mapBadgeAuditRow(row: AuditRow): BadgeAuditLogEntry | null {
  if (row.entity_type !== "badge") {
    return null;
  }

  const payload = parseAuditPayload(row.payload);
  const action = payload.action as BadgeAuditAction | undefined;
  if (
    action !== "CREATED" &&
    action !== "UPDATED" &&
    action !== "ACTIVATED" &&
    action !== "DEACTIVATED" &&
    action !== "REORDERED"
  ) {
    return null;
  }

  return {
    id: row.id,
    badgeId: row.entity_id,
    badgeName:
      typeof payload.badgeName === "string" && payload.badgeName.trim().length > 0
        ? payload.badgeName.trim()
        : null,
    pathId:
      typeof payload.pathId === "string" &&
      payload.pathId.trim().length > 0 &&
      isBadgePathId(payload.pathId)
        ? payload.pathId
        : null,
    action,
    fieldChanged:
      typeof payload.fieldChanged === "string" && payload.fieldChanged.length > 0
        ? payload.fieldChanged
        : "updated",
    previousValue: payload.previousValue ?? null,
    newValue: payload.newValue ?? null,
    changedAt: toIsoString(row.created_at),
    changedBy:
      typeof payload.changedBy === "string" && payload.changedBy.trim().length > 0
        ? payload.changedBy.trim()
        : row.actor_id,
    source:
      payload.source === "admin" ||
      payload.source === "manual" ||
      payload.source === "system"
        ? payload.source
        : row.actor_type === "system"
          ? "system"
          : "admin",
  };
}

function isBadgePathId(value: string): value is BadgePathId {
  return (
    value === "despertar_path" ||
    value === "tarot_path" ||
    value === "psychology_path" ||
    value === "community_path" ||
    value === "purchase_path" ||
    value === "instructor_path" ||
    value === "award_path" ||
    value === "secret_path"
  );
}

function buildAuditPayload(
  badge: Badge,
  action: BadgeAuditAction,
  fieldChanged: string,
  previousValue: unknown,
  newValue: unknown,
  source: BadgeAuditSource,
  changedBy: string,
): Record<string, unknown> {
  return {
    badgeName: badge.name,
    pathId: badge.pathId,
    action,
    fieldChanged,
    previousValue,
    newValue,
    source,
    changedBy,
  };
}

function appendMockBadgeAudit(entry: BadgeAuditLogEntry): void {
  mockBadgeAuditLog.unshift(entry);
}

function insertBadgeAuditRow(
  badgeId: string,
  actorType: string,
  actorId: string,
  action: BadgeAuditAction,
  fieldChanged: string,
  previousValue: unknown,
  newValue: unknown,
  source: BadgeAuditSource,
  badge?: Badge | null,
): void {
  const entry: BadgeAuditLogEntry = {
    id: randomUUID(),
    badgeId,
    badgeName: badge?.name ?? null,
    pathId: badge?.pathId ?? null,
    action,
    fieldChanged,
    previousValue,
    newValue,
    changedAt: new Date().toISOString(),
    changedBy: actorId?.trim() || "system",
    source,
  };

  if (!isDatabaseConfigured()) {
    appendMockBadgeAudit(entry);
    return;
  }

  const badgeForPayload =
    badge ??
    ({
      id: badgeId,
      name: "",
      description: "",
      category: "DESPERTAR",
      rarity: "COMMON",
      type: "AUTOMATIC",
      pathId: "despertar_path",
      pathOrder: 1,
      stepIndex: 1,
      stepTitle: "",
      stepDescription: "",
      prerequisiteBadgeIds: [],
      lockedReason: "",
      isPathVisible: true,
      isConditionHidden: false,
      iconUrl: "",
      isSecret: false,
      isActive: true,
      createdAt: entry.changedAt,
      updatedAt: entry.changedAt,
    } as Badge);

  const payload = buildAuditPayload(
    badgeForPayload,
    action,
    fieldChanged,
    previousValue,
    newValue,
    source,
    entry.changedBy,
  );

  void query(
    `
      insert into audit_logs (
        id,
        actor_type,
        actor_id,
        event_type,
        entity_type,
        entity_id,
        payload
      ) values ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      entry.id,
      source === "system" ? "system" : actorType,
      entry.changedBy,
      `badge.${action.toLowerCase()}`,
      "badge",
      badgeId,
      JSON.stringify(payload),
    ],
  ).catch(() => undefined);
}

function collectBadgeAuditEntries(
  badge: Badge,
  before: Badge | null,
  source: BadgeAuditSource,
  actorId: string | null | undefined,
): BadgeAuditLogEntry[] {
  if (!before) {
    return [
      {
        id: randomUUID(),
        badgeId: badge.id,
        badgeName: badge.name,
        pathId: badge.pathId,
        action: "CREATED",
        fieldChanged: "created",
        previousValue: null,
        newValue: badge,
        changedAt: new Date().toISOString(),
        changedBy: actorId?.trim() || "system",
        source,
      },
    ];
  }

  const changedFields = buildBadgeChangePayload(before, badge);
  const actions = new Map<string, BadgeAuditAction>();

  for (const field of Object.keys(changedFields)) {
    if (field === "isActive") {
      actions.set(field, badge.isActive ? "ACTIVATED" : "DEACTIVATED");
      continue;
    }

    if (
      field === "pathId" ||
      field === "pathOrder" ||
      field === "stepIndex" ||
      field === "prerequisiteBadgeIds"
    ) {
      actions.set(field, "REORDERED");
      continue;
    }

    actions.set(field, "UPDATED");
  }

  return (
    Object.entries(changedFields) as Array<
      [string, { before: unknown; after: unknown }]
    >
  ).map(([field, diff]) => ({
    id: randomUUID(),
    badgeId: badge.id,
    badgeName: badge.name,
    pathId: badge.pathId,
    action: actions.get(field) ?? "UPDATED",
    fieldChanged: field,
    previousValue: diff.before,
    newValue: diff.after,
    changedAt: new Date().toISOString(),
    changedBy: actorId?.trim() || "system",
    source,
  }));
}

async function assertBadgePathStepAvailability(
  badge: Badge,
  currentBadgeId?: string,
): Promise<void> {
  if (!badge.isActive) {
    return;
  }

  const allBadges = await getAllBadges();
  const conflict = allBadges.find(
    (item) =>
      item.isActive &&
      item.id !== currentBadgeId &&
      item.pathId === badge.pathId &&
      item.stepIndex === badge.stepIndex,
  );

  if (conflict) {
    throw new Error(
      `Ya existe un badge activo en ${badge.pathId} con stepIndex ${badge.stepIndex}.`,
    );
  }
}

async function assertBadgePrerequisitesExist(
  badge: Badge,
  currentBadgeId?: string,
): Promise<void> {
  const prerequisites = badge.prerequisiteBadgeIds ?? [];
  if (prerequisites.length < 1) {
    return;
  }

  const allBadges = await getAllBadges();
  const badgeIds = new Set(allBadges.map((item) => item.id));
  for (const prerequisiteId of prerequisites) {
    if (prerequisiteId === currentBadgeId || prerequisiteId === badge.id) {
      throw new Error("prerequisiteBadgeIds no puede incluir el mismo badge.");
    }

    if (!badgeIds.has(prerequisiteId)) {
      throw new Error(`El prerequisito ${prerequisiteId} no existe.`);
    }
  }
}

function getRouteBadgeOrder(badges: Badge[], pathId: BadgePathId): Badge[] {
  return [...badges]
    .filter((item) => item.pathId === pathId)
    .sort((left, right) => {
      if (left.pathOrder !== right.pathOrder) {
        return left.pathOrder - right.pathOrder;
      }
      if (left.stepIndex !== right.stepIndex) {
        return left.stepIndex - right.stepIndex;
      }
      return left.name.localeCompare(right.name);
    });
}

export function getBadgeRouteProgressPercent(
  badges: Badge[],
  pathId: BadgePathId,
): number {
  const activeCount = badges.filter(
    (item) => item.pathId === pathId && item.isActive,
  ).length;
  return Math.max(0, Math.min(100, Math.round((activeCount / 5) * 100)));
}

export function getNextBadgeInPath(
  badges: Badge[],
  badgeId: string,
): Badge | null {
  const currentBadge = badges.find((item) => item.id === badgeId);
  if (!currentBadge) {
    return null;
  }

  const ordered = getRouteBadgeOrder(badges, currentBadge.pathId);
  return ordered.find((item) => item.stepIndex > currentBadge.stepIndex) ?? null;
}

async function assertBadgePayloadIntegrity(
  badge: Badge,
  currentBadgeId?: string,
  inputRules?: BadgeStepRule[],
): Promise<void> {
  if (!badge.pathId) {
    throw new Error("pathId es obligatorio.");
  }

  if (badge.stepIndex < 1 || badge.stepIndex > 5) {
    throw new Error("stepIndex debe estar entre 1 y 5.");
  }

  if (badge.pathOrder < 1) {
    throw new Error("pathOrder debe ser numérico positivo.");
  }

  await assertBadgePathStepAvailability(badge, currentBadgeId);
  await assertBadgePrerequisitesExist(badge, currentBadgeId);

  if (
    badge.type === "AUTOMATIC" ||
    badge.type === "TEMPORARY" ||
    badge.type === "EVOLVING"
  ) {
    const rules = inputRules ?? [];
    if (rules.length < 1) {
      throw new Error(
        `La insignia ${badge.type} necesita al menos una regla activa.`,
      );
    }
  }
}

export async function getBadgeDiagnostics(): Promise<BadgeDiagnosticsResult> {
  const [badges, rules] = await Promise.all([getAllBadges(), listBadgeRules()]);
  const issues: BadgeDiagnosticIssue[] = [];
  const activeByPath = new Map<BadgePathId, Badge[]>();
  const badgesById = new Map(badges.map((badge) => [badge.id, badge] as const));
  const activeRulesByBadgeId = new Map<string, BadgeRule[]>();

  for (const rule of rules) {
    if (!rule.isActive) {
      continue;
    }

    const current = activeRulesByBadgeId.get(rule.badgeId) ?? [];
    current.push(rule);
    activeRulesByBadgeId.set(rule.badgeId, current);

    if (!knownBadgeMetricKeys.has(rule.ruleKey)) {
      issues.push({
        severity: "warning",
        badgeId: rule.badgeId,
        message: `La regla ${rule.ruleKey} usa una métrica desconocida.`,
      });
    }
  }

  for (const badge of badges) {
    if (!badge.pathId) {
      issues.push({
        severity: "error",
        badgeId: badge.id,
        message: "Badge sin pathId.",
      });
      continue;
    }

    if (!badge.stepIndex) {
      issues.push({
        severity: "error",
        badgeId: badge.id,
        pathId: badge.pathId,
        message: "Badge sin stepIndex.",
      });
    }

    const routeBadges = activeByPath.get(badge.pathId) ?? [];
    routeBadges.push(badge);
    activeByPath.set(badge.pathId, routeBadges);

    if (
      badge.type === "AUTOMATIC" ||
      badge.type === "TEMPORARY" ||
      badge.type === "EVOLVING"
    ) {
      const activeRules = activeRulesByBadgeId.get(badge.id) ?? [];
      if (activeRules.length < 1) {
        issues.push({
          severity: "error",
          badgeId: badge.id,
          pathId: badge.pathId,
          message: "Badge automática sin rules activas.",
        });
      }
    }

    if (badge.isSecret && badge.isConditionHidden === false) {
      issues.push({
        severity: "warning",
        badgeId: badge.id,
        pathId: badge.pathId,
        message:
          "Badge SECRET visible con condiciones expuestas mientras está bloqueada.",
      });
    }
  }

  for (const [pathId, pathBadges] of activeByPath.entries()) {
    const activeBadges = pathBadges.filter((item) => item.isActive);
    const stepBuckets = new Map<number, Badge[]>();

    for (const badge of activeBadges) {
      const stepBucket = stepBuckets.get(badge.stepIndex) ?? [];
      stepBucket.push(badge);
      stepBuckets.set(badge.stepIndex, stepBucket);
    }

    if (activeBadges.length !== 5) {
      issues.push({
        severity: activeBadges.length < 5 ? "warning" : "error",
        pathId,
        message: `La ruta ${pathId} tiene ${activeBadges.length} escalones activos.`,
      });
    }

    for (const [stepIndex, bucket] of stepBuckets.entries()) {
      if (bucket.length > 1) {
        issues.push({
          severity: "error",
          pathId,
          message: `Step duplicado en ${pathId} para stepIndex ${stepIndex}.`,
        });
      }
    }

    const routeStepIndexes = new Set(activeBadges.map((item) => item.stepIndex));
    for (let step = 1; step <= 5; step += 1) {
      if (!routeStepIndexes.has(step)) {
        issues.push({
          severity: "info",
          pathId,
          message: `La ruta ${pathId} no tiene badge activo en stepIndex ${step}.`,
        });
      }
    }
  }

  for (const badge of badges) {
    const missingPrereqs = (badge.prerequisiteBadgeIds ?? []).filter(
      (prerequisiteId) => !badgesById.has(prerequisiteId),
    );
    if (missingPrereqs.length > 0) {
      issues.push({
        severity: "error",
        badgeId: badge.id,
        pathId: badge.pathId,
        message: `Prerrequisitos rotos: ${missingPrereqs.join(", ")}.`,
      });
    }
  }

  return {
    ok: issues.filter((item) => item.severity === "error").length < 1,
    issues,
  };
}

function replaceMockBadgeRules(badgeId: string, rules: BadgeRule[]): void {
  const remaining = mockBadgeRules.filter((rule) => rule.badgeId !== badgeId);
  mockBadgeRules.length = 0;
  mockBadgeRules.push(...remaining, ...rules);
}

function attachBadgeRules(
  badges: Badge[],
  rules: BadgeRule[],
): Badge[] {
  const rulesByBadgeId = new Map<string, BadgeRule[]>();
  for (const rule of rules) {
    const current = rulesByBadgeId.get(rule.badgeId) ?? [];
    current.push(rule);
    rulesByBadgeId.set(rule.badgeId, current);
  }

  return badges.map((badge) => ({
    ...badge,
    rules: rulesByBadgeId.get(badge.id) ?? [],
  }));
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
              path_id,
              path_order,
              step_index,
              step_title,
              step_description,
              prerequisite_badge_ids,
              locked_reason,
              is_path_visible,
              is_condition_hidden,
              icon_url,
              is_secret,
              is_active,
              created_at,
              updated_at
            ) values (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16, $17, $18, now(), now()
            )
            on conflict (id) do update
              set name = excluded.name,
                  description = excluded.description,
                  category = excluded.category,
                  rarity = excluded.rarity,
                  type = excluded.type,
                  path_id = excluded.path_id,
                  path_order = excluded.path_order,
                  step_index = excluded.step_index,
                  step_title = excluded.step_title,
                  step_description = excluded.step_description,
                  prerequisite_badge_ids = excluded.prerequisite_badge_ids,
                  locked_reason = excluded.locked_reason,
                  is_path_visible = excluded.is_path_visible,
                  is_condition_hidden = excluded.is_condition_hidden,
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
            badge.pathId,
            badge.pathOrder,
            badge.stepIndex,
            badge.stepTitle,
            badge.stepDescription,
            JSON.stringify(badge.prerequisiteBadgeIds),
            badge.lockedReason,
            badge.isPathVisible,
            badge.isConditionHidden,
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

      await query(
        `
          update badges
          set is_active = false,
              updated_at = now()
          where id = any($1::text[])
        `,
        [["badge-consejero-etico", "badge-ojo-del-vacio"]],
      );
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
      const displayDescription = unlocked
        ? badge.description
        : isHidden
          ? hiddenBadgeDescription
          : badge.lockedReason || badge.description;

      return {
        ...badge,
        unlocked: Boolean(unlocked),
        unlockedAt: unlocked?.unlockedAt ?? null,
        source: unlocked?.source ?? null,
        metadata: unlocked?.metadata ?? {},
        displayName: isHidden ? hiddenBadgeName : badge.name,
        displayDescription,
        displayIconUrl: isHidden ? hiddenBadgeIconUrl : badge.iconUrl,
      };
    })
    .sort((left, right) => {
      if (left.pathOrder !== right.pathOrder) {
        return left.pathOrder - right.pathOrder;
      }
      if (left.stepIndex !== right.stepIndex) {
        return left.stepIndex - right.stepIndex;
      }
      if (left.unlocked !== right.unlocked) {
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
  unlockedBadgeIds: Set<string>,
): boolean {
  if (badge.type === "MANUAL" || badge.type === "TEMPORARY") {
    return false;
  }

  const prerequisites = badge.prerequisiteBadgeIds ?? [];
  if (prerequisites.some((badgeId) => !unlockedBadgeIds.has(badgeId))) {
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

export async function createBadge(
  input: CreateBadgeInput,
  actorId?: string,
): Promise<Badge> {
  const badge = buildBadgeRecord(input);
  const rules = normalizeBadgeRulesForType(badge, input.rules);
  const createdBadge: Badge = {
    ...badge,
    rules,
  };
  await assertBadgePayloadIntegrity(badge, undefined, input.rules);

  if (!isDatabaseConfigured()) {
    mockBadges.unshift(badge);
    mockBadgeRules.push(...rules);
    for (const entry of collectBadgeAuditEntries(
      createdBadge,
      null,
      "admin",
      actorId,
    )) {
      appendMockBadgeAudit(entry);
    }
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
        path_id,
        path_order,
        step_index,
        step_title,
        step_description,
        prerequisite_badge_ids,
        locked_reason,
        is_path_visible,
        is_condition_hidden,
        icon_url,
        is_secret,
        is_active,
        created_at,
        updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16, $17, $18, now(), now())
    `,
    [
      badge.id,
      badge.name,
      badge.description,
      badge.category,
      badge.rarity,
      badge.type,
      badge.pathId,
      badge.pathOrder,
      badge.stepIndex,
      badge.stepTitle,
      badge.stepDescription,
      JSON.stringify(badge.prerequisiteBadgeIds),
      badge.lockedReason,
      badge.isPathVisible,
      badge.isConditionHidden,
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

  for (const entry of collectBadgeAuditEntries(
    createdBadge,
    null,
    "admin",
    actorId,
  )) {
    insertBadgeAuditRow(
      entry.badgeId,
      "admin",
      entry.changedBy,
      entry.action,
      entry.fieldChanged,
      entry.previousValue,
      entry.newValue,
      entry.source,
      createdBadge,
    );
  }

  return createdBadge;
}

export async function updateBadge(
  badgeId: string,
  input: UpdateBadgeInput,
  actorId?: string,
): Promise<Badge> {
  const normalizedBadgeId = badgeId.trim();
  if (normalizedBadgeId.length < 1) {
    throw new Error("badgeId es obligatorio.");
  }

  const existingBadge = await getBadgeById(normalizedBadgeId);
  if (!existingBadge) {
    throw new Error("La insignia no existe.");
  }

  const badge = buildBadgeRecord(
    {
      ...input,
      id: normalizedBadgeId,
    },
    existingBadge,
  );

  const resolvedRulesInput =
    input.rules ??
    existingBadge.rules?.map((rule) => ({
      ruleKey: rule.ruleKey,
      operator: rule.operator,
      value: rule.value,
      isActive: rule.isActive,
    }));

  const nextRules =
    resolvedRulesInput === undefined
      ? null
      : normalizeBadgeRulesForType(badge, resolvedRulesInput);
  const updatedBadge: Badge = {
    ...badge,
    rules: nextRules ?? existingBadge.rules ?? [],
  };

  await assertBadgePayloadIntegrity(
    badge,
    normalizedBadgeId,
    resolvedRulesInput,
  );

  if (!isDatabaseConfigured()) {
    const existingIndex = mockBadges.findIndex((item) => item.id === normalizedBadgeId);
    if (existingIndex >= 0) {
      mockBadges[existingIndex] = badge;
    }
    if (nextRules !== null) {
      replaceMockBadgeRules(normalizedBadgeId, nextRules);
    }
    for (const entry of collectBadgeAuditEntries(
      updatedBadge,
      existingBadge,
      "admin",
      actorId,
    )) {
      appendMockBadgeAudit(entry);
    }
    return badge;
  }

  await ensureDatabaseSeeded();
  await query(
    `
      update badges
      set name = $2,
          description = $3,
          category = $4,
          rarity = $5,
          type = $6,
          path_id = $7,
          path_order = $8,
          step_index = $9,
          step_title = $10,
          step_description = $11,
          prerequisite_badge_ids = $12::jsonb,
          locked_reason = $13,
          is_path_visible = $14,
          is_condition_hidden = $15,
          icon_url = $16,
          is_secret = $17,
          is_active = $18,
          updated_at = now()
      where id = $1
    `,
    [
      normalizedBadgeId,
      badge.name,
      badge.description,
      badge.category,
      badge.rarity,
      badge.type,
      badge.pathId,
      badge.pathOrder,
      badge.stepIndex,
      badge.stepTitle,
      badge.stepDescription,
      JSON.stringify(badge.prerequisiteBadgeIds),
      badge.lockedReason,
      badge.isPathVisible,
      badge.isConditionHidden,
      badge.iconUrl,
      badge.isSecret,
      badge.isActive,
    ],
  );

  if (nextRules !== null) {
    await query(
      `
        delete from badge_rules
        where badge_id = $1
      `,
      [normalizedBadgeId],
    );

    for (const rule of nextRules) {
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
  }

  for (const entry of collectBadgeAuditEntries(
    badge,
    existingBadge,
    "admin",
    actorId,
  )) {
    insertBadgeAuditRow(
      entry.badgeId,
      "admin",
      entry.changedBy,
      entry.action,
      entry.fieldChanged,
      entry.previousValue,
      entry.newValue,
      entry.source,
      updatedBadge,
    );
  }

  return updatedBadge;
}

export async function getAllBadges(): Promise<Badge[]> {
  if (!isDatabaseConfigured()) {
    const sortedBadges = [...mockBadges].sort((left, right) => {
      if (left.pathOrder !== right.pathOrder) {
        return left.pathOrder - right.pathOrder;
      }
      if (left.stepIndex !== right.stepIndex) {
        return left.stepIndex - right.stepIndex;
      }
      return left.name.localeCompare(right.name);
    });

    return attachBadgeRules(sortedBadges, [...mockBadgeRules]);
  }

  await ensureDatabaseSeeded();
  const [badgesResult, rules] = await Promise.all([
    query<BadgeRow>(
    `
      select
        id,
        name,
        description,
        category,
        rarity,
        type,
        path_id,
        path_order,
        step_index,
        step_title,
        step_description,
        prerequisite_badge_ids,
        locked_reason,
        is_path_visible,
        is_condition_hidden,
        icon_url,
        is_secret,
        is_active,
        created_at,
        updated_at
      from badges
      order by path_order asc, step_index asc, rarity asc, name asc
    `,
    ),
    listBadgeRules(),
  ]);

  return attachBadgeRules(badgesResult.rows.map(mapBadgeRow), rules);
}

export async function getBadgeById(badgeId: string): Promise<Badge | null> {
  const normalizedBadgeId = badgeId.trim();
  if (normalizedBadgeId.length < 1) {
    return null;
  }

  if (!isDatabaseConfigured()) {
    const item = mockBadges.find((item) => item.id === normalizedBadgeId) ?? null;
    if (!item) {
      return null;
    }

    return {
      ...item,
      rules: mockBadgeRules.filter((rule) => rule.badgeId === item.id),
    };
  }

  await ensureDatabaseSeeded();
  const [result, rules] = await Promise.all([
    query<BadgeRow>(
      `
      select
        id,
        name,
        description,
        category,
        rarity,
        type,
        path_id,
        path_order,
        step_index,
        step_title,
        step_description,
        prerequisite_badge_ids,
        locked_reason,
        is_path_visible,
        is_condition_hidden,
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
    ),
    listBadgeRules(),
  ]);

  const badge = result.rows[0] ? mapBadgeRow(result.rows[0]) : null;
  if (!badge) {
    return null;
  }

  return {
    ...badge,
    rules: rules.filter((rule) => rule.badgeId === badge.id),
  };
}

export async function getBadgeAuditLog(
  queryOptions: BadgeAuditLogQuery = {},
): Promise<BadgeAuditLogEntry[]> {
  const badgeFilter = queryOptions.badgeId?.trim();
  const pathFilter = queryOptions.pathId;
  const actionFilter = queryOptions.action;
  const fieldFilter = queryOptions.fieldChanged?.trim();
  const dateFilter = queryOptions.date?.trim();

  if (!isDatabaseConfigured()) {
    return mockBadgeAuditLog
      .filter((entry) => {
        if (badgeFilter && entry.badgeId !== badgeFilter) {
          return false;
        }
        if (pathFilter && entry.pathId !== pathFilter) {
          return false;
        }
        if (actionFilter && entry.action !== actionFilter) {
          return false;
        }
        if (fieldFilter && entry.fieldChanged !== fieldFilter) {
          return false;
        }
        if (dateFilter && !entry.changedAt.startsWith(dateFilter)) {
          return false;
        }
        return true;
      })
      .sort((left, right) => right.changedAt.localeCompare(left.changedAt));
  }

  await ensureDatabaseSeeded();
  const result = await query<AuditRow>(
    `
      select
        id,
        actor_type,
        actor_id,
        event_type,
        entity_type,
        entity_id,
        payload,
        created_at
      from audit_logs
      where entity_type = 'badge'
      order by created_at desc, id desc
    `,
  );

  const badges = await getAllBadges();
  const badgesById = new Map(badges.map((badge) => [badge.id, badge] as const));

  return result.rows
    .map((row) => {
      const entry = mapBadgeAuditRow(row);
      if (!entry) {
        return null;
      }

      const badge = badgesById.get(entry.badgeId) ?? null;
      return {
        ...entry,
        badgeName: entry.badgeName ?? badge?.name ?? null,
        pathId: entry.pathId ?? badge?.pathId ?? null,
      };
    })
    .filter((item): item is BadgeAuditLogEntry => item !== null)
    .filter((entry) => {
      if (badgeFilter && entry.badgeId !== badgeFilter) {
        return false;
      }
      if (pathFilter && entry.pathId !== pathFilter) {
        return false;
      }
      if (actionFilter && entry.action !== actionFilter) {
        return false;
      }
      if (fieldFilter && entry.fieldChanged !== fieldFilter) {
        return false;
      }
      if (dateFilter && !entry.changedAt.startsWith(dateFilter)) {
        return false;
      }
      return true;
    });
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

    if (!evaluateBadgeRules(badge, rules, metrics, unlockedIds)) {
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
