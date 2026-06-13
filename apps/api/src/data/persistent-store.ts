import { randomUUID } from "node:crypto";

import type { PoolClient, QueryResult, QueryResultRow } from "pg";

import {
  getCurrentSubscription as getCurrentSubscriptionBilling,
  getPaymentsConfig as getPaymentsConfigBilling,
} from "./billing-store.js";
import {
  getUserBadgeProfile,
  recordBadgeAction,
} from "./badge-store.js";
import {
  isDatabaseConfigured,
  query,
  withTransaction,
} from "../infrastructure/database.js";
import { getAppEnv } from "../infrastructure/env.js";
import {
  getRedisTtl,
  isRedisConfigured,
  setRedisString,
} from "../infrastructure/redis.js";
import { getUserRoles, userHasRole } from "./authz-store.js";
import { buildDailyHomeContent } from "./home-daily.js";
import {
  buildShopSku,
  buildShopOrderDraft,
  buildShopStockLabel,
  buildShopViewerScope,
  canManageShopOrder,
  canManageShopProduct,
  filterShopOrdersForScope,
  filterShopProductsForScope,
  normalizeShopImageUrls,
  normalizeShopProductStatus,
  normalizeShopProductOwnership,
} from "./shop-domain.js";
import {
  completePhoneProfile as completePhoneProfileMock,
  createBooking as createBookingMock,
  createServiceOffer as createServiceOfferMock,
  createShopProduct as createShopProductMock,
  createShopOrder as createShopOrderMock,
  archiveCourse as archiveCourseMock,
  getAdminSummary,
  getAdminCourseById as getAdminCourseByIdMock,
  getAdminCourses as getAdminCoursesMock,
  getBootstrap as getBootstrapMock,
  getBookings as getBookingsMock,
  getCourses as getCoursesMock,
  getCourseById as getCourseByIdMock,
  getHomePayload as getHomePayloadMock,
  getPhoneAuthSession as getPhoneAuthSessionMock,
  getPlans,
  getProfile as getProfileMock,
  deleteCourseLesson as deleteCourseLessonMock,
  deleteCourseModule as deleteCourseModuleMock,
  revokePhoneAuthSession as revokePhoneAuthSessionMock,
  getServices,
  getShopData as getShopDataMock,
  getShopOrders as getShopOrdersMock,
  getSpecialists,
  getUserIdForAccessToken as getUserIdForAccessTokenMock,
  startPhoneAuth as startPhoneAuthMock,
  setCoursePublication as setCoursePublicationMock,
  updateCourse as updateCourseMock,
  updateServiceOffer as updateServiceOfferMock,
  upsertCourse as upsertCourseMock,
  upsertCourseLesson as upsertCourseLessonMock,
  upsertCourseModule as upsertCourseModuleMock,
  type AccountType,
  type AppBootstrap,
  type Booking,
  type BookingStatus,
  type CompletePhoneProfileInput,
  type Course,
  type CourseLesson,
  type CourseModule,
  type CreateShopProductInput,
  type CreateShopOrderInput,
  type CreateBookingInput,
  type CreateServiceOfferInput,
  type HomePayload,
  type Money,
  type PhoneAuthSessionPayload,
  type PhoneAuthStartInput,
  type PhoneAuthStartResult,
  type PhoneAuthVerifyInput,
  type ServiceOffer,
  type SessionMode,
  type ShopData,
  type ShopOrder,
  type ShopOrderItem,
  type ShopOrderStatus,
  type ShopProduct,
  type Subscription,
  type UpdateBookingInput,
  type UpdateShopOrderStatusInput,
  type UpdateShopProductInput,
  type UpdateSpecialistAdminInput,
  type UpdateServiceOfferInput,
  type UpdateUserProfileInput,
  type UserProfile,
  updateBooking as updateBookingMock,
  updateSpecialistAdmin as updateSpecialistAdminMock,
  updateCurrentUser as updateCurrentUserMock,
  updateShopOrderStatus as updateShopOrderStatusMock,
  updateShopProduct as updateShopProductMock,
  verifyPhoneAuth as verifyPhoneAuthMock,
} from "./mock-store.js";
export type {
  CompletePhoneProfileInput,
  CreateShopProductInput,
  CreateShopOrderInput,
  CreateBookingInput,
  CreateServiceOfferInput,
  PhoneAuthStartInput,
  PhoneAuthVerifyInput,
  UpdateBookingInput,
  UpdateShopOrderStatusInput,
  UpdateShopProductInput,
  UpdateSpecialistAdminInput,
  UpdateServiceOfferInput,
  UpdateUserProfileInput,
} from "./mock-store.js";

const demoUserId = "user-mark";

const mockShopProductAuditLog: ShopProductAuditEntry[] = [];
const mockAdminEntityAuditLog: AdminEntityAuditEntry[] = [];
const mockLibraryPdfStore: LibraryPdfRecord[] = [];
const mockCourseResourceStore: CourseResourceRecord[] = [];

const quickActions: HomePayload["quickActions"] = [
  {
    id: "quick-numerology",
    label: "Numerología",
    description: "Perfil, ciclos y nombre natal",
    type: "content",
  },
  {
    id: "quick-premium",
    label: "Ver Premium",
    description: "Plan, beneficios y estado actual",
    type: "subscription",
  },
  {
    id: "quick-profile",
    label: "Completar perfil astral",
    description: "Fecha, hora y lugar de nacimiento",
    type: "profile",
  },
];

interface UserRow extends QueryResultRow {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  email: string;
  avatar_url: string;
  location: string;
  timezone: string;
  zodiac_sign: string;
  plan_id: string;
  account_type: AccountType;
  specialist_profile_id: string;
  subject_name: string;
  birth_date: string;
  birth_time: string;
  birth_time_unknown: boolean;
  city: string;
  state: string;
  country: string;
  time_zone_id: string;
  utc_offset: string;
  latitude: number | null;
  longitude: number | null;
  focus_areas: unknown;
  preferred_session_modes: unknown;
  receives_push: boolean;
}

interface IdentityRow extends QueryResultRow {
  phone_number: string;
  user_id: string;
  country_code: string;
  dial_code: string;
  profile_completed: boolean;
}

interface VerificationRow extends QueryResultRow {
  phone_number: string;
  code: string;
  country_code: string;
  dial_code: string;
  expires_at: Date | string;
  attempts_remaining: number;
}

interface SessionRow extends QueryResultRow {
  access_token: string;
  refresh_token: string;
  user_id: string;
  phone_number: string;
  expires_at: Date | string;
}

interface BookingRow extends QueryResultRow {
  id: string;
  user_id: string;
  service_id: string;
  service_name: string;
  specialist_id: string;
  specialist_name: string;
  scheduled_at: Date | string;
  mode: SessionMode;
  status: BookingStatus;
  price_amount: string | number;
  price_currency: string;
  notes: string;
}

interface ServiceOfferOverrideRow extends QueryResultRow {
  service_id: string;
  name: string | null;
  category: string | null;
  description: string | null;
  price_amount: string | number;
  price_currency: string;
  duration_minutes: number;
  delivery_modes: unknown;
  premium_included: boolean;
  specialist_ids: unknown;
  is_active: boolean;
  is_visible: boolean;
}

interface SpecialistOverrideRow extends QueryResultRow {
  specialist_id: string;
  public_name: string | null;
  headline: string | null;
  specialties: unknown;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_public: boolean;
}

interface ShopProductOverrideRow extends QueryResultRow {
  product_id: string;
  name: string;
  category: string;
  specialist_id: string;
  specialist_name: string;
  store_id: string;
  store_name: string;
  short_description: string;
  description: string;
  price_amount: string | number;
  price_currency: string;
  sku: string;
  status: string;
  image_url: string;
  artwork: string;
  badge: string;
  featured: boolean;
  stock_label: string;
  stock_quantity: number;
  made_to_order: boolean;
  tags: unknown;
  created_at: Date | string;
  updated_at: Date | string;
}

export type ShopProductAuditSource = "admin" | "specialist" | "system";
export type AdminEntityAuditSource = "admin";

export interface ShopProductAuditMeta {
  actorType: "admin" | "specialist" | "system";
  actorId: string;
  source: ShopProductAuditSource;
}

export interface ShopProductAuditEntry {
  id: string;
  actorType: string;
  actorId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AdminEntityAuditEntry {
  id: string;
  actorType: string;
  actorId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

function resolveAuditSourceLabel(source: string): string {
  if (source === "manual") {
    return "manual";
  }
  if (source === "system") {
    return "system";
  }
  return "admin";
}

export interface AdminAuditMeta {
  actorType: "admin";
  actorId: string;
  source: AdminEntityAuditSource;
  changedBy: string;
}

export interface AdminSpecialistProfile {
  id: string;
  name: string;
  publicName?: string;
  headline: string;
  specialties: string[];
  bio: string;
  avatarUrl?: string;
  yearsExperience: number;
  sessionModes: string[];
  languages: string[];
  rating: number;
  reviewCount: number;
  featured: boolean;
  nextAvailableAt: string;
  isActive: boolean;
  isPublic: boolean;
}

export interface LibraryPdfRecord {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  category: string;
  pageCount: number;
  status: "draft" | "published" | "archived";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseResourceRecord {
  id: string;
  courseId: string;
  moduleId?: string | null;
  lessonId?: string | null;
  title: string;
  kind: string;
  description: string;
  url: string;
  status: "draft" | "published" | "archived";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseAuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  courseId: string;
  action: string;
  fieldChanged: string;
  previousValue: unknown;
  newValue: unknown;
  changedAt: string;
  changedBy: string;
  source: string;
  elementLabel: string;
  courseName: string | null;
}

interface LibraryPdfRow extends QueryResultRow {
  pdf_id: string;
  title: string;
  description: string;
  file_url: string;
  course_id: string | null;
  module_id: string | null;
  lesson_id: string | null;
  category: string;
  page_count: number;
  status: string;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

function normalizeLibraryPdfStatus(value: unknown): LibraryPdfRecord["status"] {
  if (value === "published" || value === "archived") {
    return value;
  }

  return "draft";
}

function mapLibraryPdfRow(row: LibraryPdfRow): LibraryPdfRecord {
  return {
    id: row.pdf_id,
    title: row.title,
    description: row.description,
    fileUrl: row.file_url,
    courseId: row.course_id,
    moduleId: row.module_id,
    lessonId: row.lesson_id,
    category: row.category,
    pageCount: Number(row.page_count ?? 0),
    status: normalizeLibraryPdfStatus(row.status),
    isActive: row.is_active,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

interface CourseRow extends QueryResultRow {
  course_id: string;
  title: string;
  subtitle: string;
  category: string;
  level: string;
  premium: boolean;
  featured: boolean;
  removable: boolean;
  estimated_hours: string | number;
  module_count: number;
  lesson_count: number;
  progress_percent: number;
  streak_days: number;
  hook: string;
  description: string;
  outcomes: unknown;
  cover_image_url: string | null;
  status: string;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CourseModuleRow extends QueryResultRow {
  module_id: string;
  course_id: string;
  title: string;
  summary: string;
  duration_minutes: number;
  order_index: number;
  status: string;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

interface CourseLessonRow extends QueryResultRow {
  lesson_id: string;
  course_id: string;
  module_id: string;
  title: string;
  format: string;
  duration_minutes: number;
  prompt: string;
  content: string | null;
  resource_url: string | null;
  order_index: number;
  status: string;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

interface AuditLogRow extends QueryResultRow {
  id: string;
  actor_type: string;
  actor_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  created_at: Date | string;
}

interface ShopOrderRow extends QueryResultRow {
  id: string;
  user_id: string;
  order_code: string;
  status: ShopOrderStatus;
  created_at: Date | string;
  specialist_id: string;
  specialist_name: string;
  store_id: string;
  store_name: string;
  delivery_address: string;
  notes: string;
  subtotal_amount: string | number;
  subtotal_currency: string;
  shipping_amount: string | number;
  shipping_currency: string;
  total_amount: string | number;
  total_currency: string;
  item_count: number;
}

interface ShopOrderItemRow extends QueryResultRow {
  order_id: string;
  product_id: string;
  product_name: string;
  category: string;
  quantity: number;
  image_url: string;
  unit_price_amount: string | number;
  unit_price_currency: string;
  line_total_amount: string | number;
  line_total_currency: string;
}

type QueryRunner = Pick<PoolClient, "query">;

async function runQuery<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  runner?: QueryRunner,
): Promise<QueryResult<T>> {
  if (runner) {
    return runner.query<T>(sql, params);
  }

  return query<T>(sql, params);
}

function normalizeDialCode(value?: string): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 1 || digits.length > 4) {
    throw new Error("Selecciona un prefijo internacional válido.");
  }

  return `+${digits}`;
}

function normalizeNationalNumber(value?: string): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 12) {
    throw new Error("Ingresa un número de teléfono válido.");
  }

  return digits;
}

function normalizeFullPhoneNumber(value?: string): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    throw new Error("El número de teléfono no es válido.");
  }

  return `+${digits}`;
}

function normalizeBirthDateInput(value?: string): string {
  const raw = (value ?? "").trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return raw;
  }

  const dayFirstMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dayFirstMatch) {
    return `${dayFirstMatch[3]}-${dayFirstMatch[2]}-${dayFirstMatch[1]}`;
  }

  return raw;
}

function inferZodiacSign(birthDate?: string): string {
  const normalizedBirthDate = normalizeBirthDateInput(birthDate);
  const match = normalizedBirthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "";
  }

  const month = Number(match[2]);
  const day = Number(match[3]);

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Aries";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Tauro";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
    return "Geminis";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Cancer";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Leo";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Virgo";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Libra";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
    return "Escorpio";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
    return "Sagitario";
  }
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    return "Capricornio";
  }
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
    return "Acuario";
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return "Piscis";

  return "";
}

function generateMockOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function readStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
}

function readSessionModes(value: unknown): Array<"chat" | "audio" | "video"> {
  return readStringArray(value).filter(
    (item): item is "chat" | "audio" | "video" =>
      item === "chat" || item === "audio" || item === "video",
  );
}

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

function mapUserRow(row: UserRow): UserProfile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    nickname: row.nickname,
    email: row.email,
    avatarUrl: row.avatar_url,
    location: row.location,
    timezone: row.timezone,
    zodiacSign: row.zodiac_sign,
    planId: row.plan_id,
    accountType: row.account_type,
    specialistProfileId: row.specialist_profile_id,
    roles: [],
    natalChart: {
      subjectName: row.subject_name,
      birthDate: row.birth_date,
      birthTime: row.birth_time,
      birthTimeUnknown: row.birth_time_unknown,
      city: row.city,
      state: row.state,
      country: row.country,
      timeZoneId: row.time_zone_id,
      utcOffset: row.utc_offset,
      latitude: row.latitude,
      longitude: row.longitude,
    },
    preferences: {
      focusAreas: readStringArray(row.focus_areas),
      preferredSessionModes: readStringArray(
        row.preferred_session_modes,
      ) as SessionMode[],
      receivesPush: row.receives_push,
    },
  };
}

function mapBookingRow(row: BookingRow): Booking {
  return {
    id: row.id,
    userId: row.user_id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    specialistId: row.specialist_id,
    specialistName: row.specialist_name,
    scheduledAt: toIsoString(row.scheduled_at),
    mode: row.mode,
    status: row.status,
    price: {
      amount: Number(row.price_amount),
      currency: row.price_currency,
    },
    notes: row.notes,
  };
}

function mapMoney(amount: string | number, currency: string): Money {
  return {
    amount: Number(amount),
    currency: currency.trim() || "USD",
  };
}

function cloneMoney(value: Money): Money {
  return {
    amount: value.amount,
    currency: value.currency,
  };
}

function cloneShopProduct(product: ShopProduct): ShopProduct {
  return {
    ...product,
    price: cloneMoney(product.price),
    sku: product.sku,
    status: product.status,
    imageUrls: [...product.imageUrls],
    tags: [...product.tags],
  };
}

function cloneSpecialistProfile(
  specialist: AdminSpecialistProfile,
): AdminSpecialistProfile {
  return {
    ...specialist,
    specialties: [...specialist.specialties],
    sessionModes: [...specialist.sessionModes],
    languages: [...specialist.languages],
  };
}

function cloneCourseRecord(course: Course): Course {
  return JSON.parse(JSON.stringify(course)) as Course;
}

function normalizeCourseStatus(value?: string): "draft" | "published" | "archived" {
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }

  return "published";
}

function normalizeCourseRecord(course: Course): Course {
  const normalized = cloneCourseRecord(course);
  normalized.status = normalizeCourseStatus(normalized.status);
  normalized.isActive = normalized.isActive ?? normalized.status !== "archived";
  normalized.modules = [...(normalized.modules ?? [])]
    .map((module, moduleIndex) => ({
      ...module,
      order: module.order ?? moduleIndex + 1,
      status: normalizeCourseStatus(module.status),
      isActive: module.isActive ?? module.status !== "archived",
      lessons: [...(module.lessons ?? [])]
        .map((lesson, lessonIndex) => ({
          ...lesson,
          order: lesson.order ?? lessonIndex + 1,
          status: normalizeCourseStatus(lesson.status),
          isActive: lesson.isActive ?? lesson.status !== "archived",
        }))
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    }))
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  normalized.moduleCount = normalized.modules.length;
  normalized.lessonCount = normalized.modules.reduce(
    (total, module) => total + module.lessons.length,
    0,
  );
  normalized.updatedAt = normalized.updatedAt ?? new Date().toISOString();
  return normalized;
}

function courseIsVisible(course: Course): boolean {
  return normalizeCourseStatus(course.status) !== "archived";
}

function courseIsPublished(course: Course): boolean {
  return normalizeCourseStatus(course.status) === "published";
}

function mapCourseRow(row: CourseRow, modules: CourseModuleRow[], lessons: CourseLessonRow[]): Course {
  const nestedModules = modules
    .filter((module) => module.course_id === row.course_id)
    .map((module) => ({
      id: module.module_id,
      title: module.title,
      summary: module.summary,
      durationMinutes: Number(module.duration_minutes),
      order: module.order_index,
      status: normalizeCourseStatus(module.status),
      isActive: module.is_active,
      lessons: lessons
        .filter((lesson) => lesson.module_id === module.module_id)
        .map((lesson) => ({
          id: lesson.lesson_id,
          title: lesson.title,
          format: lesson.format,
          durationMinutes: Number(lesson.duration_minutes),
          prompt: lesson.prompt,
          content: lesson.content ?? undefined,
          resourceUrl: lesson.resource_url ?? undefined,
          order: lesson.order_index,
          status: normalizeCourseStatus(lesson.status),
          isActive: lesson.is_active,
        }))
        .sort((left, right) => left.order - right.order),
    }))
    .sort((left, right) => left.order - right.order);

  return normalizeCourseRecord({
    id: row.course_id,
    title: row.title,
    subtitle: row.subtitle,
    category: row.category,
    level: row.level,
    premium: row.premium,
    featured: row.featured,
    removable: row.removable,
    estimatedHours: Number(row.estimated_hours),
    moduleCount: row.module_count,
    lessonCount: row.lesson_count,
    progressPercent: row.progress_percent,
    streakDays: row.streak_days,
    hook: row.hook,
    description: row.description,
    outcomes: readStringArray(row.outcomes),
    modules: nestedModules,
    coverImageUrl: row.cover_image_url ?? undefined,
    status: normalizeCourseStatus(row.status),
    isActive: row.is_active,
    updatedAt: toIsoString(row.updated_at) ?? undefined,
  });
}

function cloneCourseModule(module: CourseModule): CourseModule {
  return {
    ...module,
    lessons: module.lessons.map((lesson) => ({ ...lesson })),
  };
}

function cloneCourseLesson(lesson: CourseLesson): CourseLesson {
  return { ...lesson };
}

function mapServiceWithOverride(
  service: ServiceOffer,
  override?: ServiceOfferOverrideRow,
): ServiceOffer {
  if (!override) {
    return {
      ...service,
      price: cloneMoney(service.price),
      deliveryModes: [...service.deliveryModes],
      specialistIds: [...service.specialistIds],
      isActive: service.isActive ?? true,
      isVisible: service.isVisible ?? true,
    };
  }

  return {
    ...service,
    name: override.name?.trim() || service.name,
    category: override.category?.trim() || service.category,
    description: override.description?.trim() || service.description,
    durationMinutes: Number(override.duration_minutes),
    price: mapMoney(override.price_amount, override.price_currency),
    deliveryModes:
      readSessionModes(override.delivery_modes).length > 0
        ? readSessionModes(override.delivery_modes)
        : [...service.deliveryModes],
    premiumIncluded: override.premium_included ?? service.premiumIncluded,
    specialistIds:
      readStringArray(override.specialist_ids).length > 0
        ? readStringArray(override.specialist_ids)
        : [...service.specialistIds],
    isActive: override.is_active,
    isVisible: override.is_visible,
  };
}

function mapStandaloneServiceOverride(
  override: ServiceOfferOverrideRow,
): ServiceOffer {
  const specialistIds = readStringArray(override.specialist_ids);
  const fallbackSpecialist = specialistIds[0]
    ? getSpecialistById(specialistIds[0])
    : null;
  return {
    id: override.service_id,
    name: override.name?.trim() || "Servicio",
    category: override.category?.trim() || "General",
    description: override.description?.trim() || "Servicio creado desde administración.",
    durationMinutes: Number(override.duration_minutes),
    price: mapMoney(override.price_amount, override.price_currency),
    deliveryModes:
      readSessionModes(override.delivery_modes).length > 0
        ? readSessionModes(override.delivery_modes)
        : [...(fallbackSpecialist?.sessionModes ?? ["chat"])],
    premiumIncluded: override.premium_included ?? false,
    specialistIds,
    isActive: override.is_active,
    isVisible: override.is_visible,
  };
}

function mapSpecialistWithOverride(
  specialist: ReturnType<typeof getSpecialists>[number],
  override?: SpecialistOverrideRow,
): AdminSpecialistProfile {
  const specialties = readStringArray(override?.specialties);
  return {
    ...specialist,
    publicName: override?.public_name?.trim() || specialist.publicName,
    headline: override?.headline?.trim() || specialist.headline,
    specialties: specialties.length > 0 ? specialties : [...specialist.specialties],
    bio: override?.bio?.trim() || specialist.bio,
    avatarUrl: override?.avatar_url?.trim() || specialist.avatarUrl,
    sessionModes: [...specialist.sessionModes],
    languages: [...specialist.languages],
    isActive: override?.is_active ?? specialist.isActive ?? true,
    isPublic: override?.is_public ?? specialist.isPublic ?? true,
  };
}

function mapShopProductOverrideRow(row: ShopProductOverrideRow): ShopProduct {
  const gallery = normalizeShopImageUrls(row.image_url, [row.image_url]);
  return {
    id: row.product_id,
    name: row.name,
    category: row.category,
    specialistId: row.specialist_id,
    specialistName: row.specialist_name,
    storeId: row.store_id,
    storeName: row.store_name,
    shortDescription: row.short_description,
    description: row.description,
    price: mapMoney(row.price_amount, row.price_currency),
    sku: row.sku,
    status: normalizeShopProductStatus(row.status),
    imageUrl: gallery.imageUrl,
    imageUrls: gallery.imageUrls,
    artwork: row.artwork,
    badge: row.badge,
    featured: row.featured,
    stockLabel: row.stock_label,
    stockQuantity: Number(row.stock_quantity),
    madeToOrder: Boolean(row.made_to_order),
    tags: readStringArray(row.tags),
    createdAt: toIsoString(row.created_at) ?? undefined,
    updatedAt: toIsoString(row.updated_at) ?? undefined,
  };
}

function pickProductAuditAction(
  fieldChanged: string,
  previousValue: unknown,
  newValue: unknown,
): string {
  if (fieldChanged === "created") {
    return "CREATED";
  }
  if (fieldChanged === "status") {
    if (newValue === "archived") {
      return "DEACTIVATED";
    }
    if (previousValue === "archived") {
      return "ACTIVATED";
    }
    return "VISIBILITY_UPDATED";
  }
  if (fieldChanged === "featured") {
    return "FEATURED_UPDATED";
  }
  if (fieldChanged === "price") {
    return "PRICE_UPDATED";
  }
  if (fieldChanged === "stockQuantity" || fieldChanged === "stockLabel") {
    return "STOCK_UPDATED";
  }

  return "UPDATED";
}

function buildProductAuditPayload(
  action: string,
  fieldChanged: string,
  previousValue: unknown,
  newValue: unknown,
  source: ShopProductAuditSource,
  changedBy: string,
): Record<string, unknown> {
  return {
    action,
    fieldChanged,
    previousValue,
    newValue,
    source,
    changedBy,
  };
}

function appendMockShopProductAudit(entry: ShopProductAuditEntry): void {
  mockShopProductAuditLog.unshift(entry);
}

function mapAdminAuditRow(row: AuditLogRow): AdminEntityAuditEntry {
  return {
    id: row.id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    payload: row.payload ?? {},
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
  };
}

function mapCourseAuditRow(row: AuditLogRow): CourseAuditLogEntry {
  const payload = row.payload ?? {};
  const courseId =
    (typeof payload.courseId === "string" && payload.courseId.trim().length > 0
      ? payload.courseId.trim()
      : "") || row.entity_id;
  const courseName =
    typeof payload.courseName === "string" && payload.courseName.trim().length > 0
      ? payload.courseName.trim()
      : null;
  const elementLabel =
    typeof payload.elementLabel === "string" && payload.elementLabel.trim().length > 0
      ? payload.elementLabel.trim()
      : row.entity_type.replaceAll("_", " ");

  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    courseId,
    action:
      typeof payload.action === "string" && payload.action.trim().length > 0
        ? payload.action.trim()
        : row.event_type,
    fieldChanged:
      typeof payload.fieldChanged === "string" && payload.fieldChanged.trim().length > 0
        ? payload.fieldChanged.trim()
        : "created",
    previousValue: payload.previousValue,
    newValue: payload.newValue,
    changedAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    changedBy:
      typeof payload.changedBy === "string" && payload.changedBy.trim().length > 0
        ? payload.changedBy.trim()
        : row.actor_id,
    source: resolveAuditSourceLabel(
      typeof payload.source === "string" ? payload.source : "admin",
    ),
    elementLabel,
    courseName,
  };
}

async function insertShopProductAuditLog(
  productId: string,
  actorType: string,
  actorId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const entry: ShopProductAuditEntry = {
    id: randomUUID(),
    actorType,
    actorId,
    eventType,
    entityType: "shop_product",
    entityId: productId,
    payload,
    createdAt: new Date().toISOString(),
  };

  if (!isDatabaseConfigured()) {
    appendMockShopProductAudit(entry);
    return;
  }

  await query(
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
      entry.actorType,
      entry.actorId,
      entry.eventType,
      entry.entityType,
      entry.entityId,
      JSON.stringify(entry.payload),
    ],
  );
}

async function insertAdminEntityAuditLog(
  entityType: string,
  entityId: string,
  action: string,
  fieldChanged: string,
  previousValue: unknown,
  newValue: unknown,
  auditMeta: AdminAuditMeta,
  additionalPayload: Record<string, unknown> = {},
): Promise<void> {
  const payload = {
    action,
    fieldChanged,
    previousValue,
    newValue,
    source: auditMeta.source,
    changedBy: auditMeta.changedBy,
    ...additionalPayload,
  };

  const entry: AdminEntityAuditEntry = {
    id: randomUUID(),
    actorType: auditMeta.actorType,
    actorId: auditMeta.actorId,
    eventType: `${entityType}.${action.toLowerCase()}`,
    entityType,
    entityId,
    payload,
    createdAt: new Date().toISOString(),
  };

  if (!isDatabaseConfigured()) {
    mockAdminEntityAuditLog.unshift(entry);
    return;
  }

  await query(
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
      entry.actorType,
      entry.actorId,
      entry.eventType,
      entry.entityType,
      entry.entityId,
      JSON.stringify(entry.payload),
    ],
  );
}

function collectShopProductAuditEntries(
  before: ShopProduct | null,
  after: ShopProduct,
  source: ShopProductAuditSource,
  actorId: string,
): ShopProductAuditEntry[] {
  const changedFields: Array<{
    field: string;
    previousValue: unknown;
    newValue: unknown;
  }> = [];

  if (!before) {
    changedFields.push({
      field: "created",
      previousValue: null,
      newValue: after,
    });
  } else {
    const fields: Array<keyof ShopProduct> = [
      "name",
      "category",
      "shortDescription",
      "description",
      "price",
      "sku",
      "status",
      "imageUrl",
      "imageUrls",
      "artwork",
      "badge",
      "featured",
      "stockLabel",
      "stockQuantity",
      "madeToOrder",
      "tags",
    ];

    for (const field of fields) {
      const previousValue = before[field];
      const newValue = after[field];
      const previousSerialized = JSON.stringify(previousValue ?? null);
      const nextSerialized = JSON.stringify(newValue ?? null);
      if (previousSerialized !== nextSerialized) {
        changedFields.push({
          field,
          previousValue,
          newValue,
        });
      }
    }
  }

  return changedFields.map((change) => {
    const action = pickProductAuditAction(
      change.field,
      change.previousValue,
      change.newValue,
    );
    return {
      id: randomUUID(),
      actorType: source,
      actorId,
      eventType: `shop_product.${change.field}.${action.toLowerCase()}`,
      entityType: "shop_product",
      entityId: after.id,
      payload: buildProductAuditPayload(
        action,
        change.field,
        change.previousValue,
        change.newValue,
        source,
        actorId,
      ),
      createdAt: new Date().toISOString(),
    };
  });
}

function mapShopOrderRows(
  order: ShopOrderRow,
  items: ShopOrderItemRow[],
): ShopOrder {
  return {
    id: order.id,
    userId: order.user_id,
    orderCode: order.order_code,
    status: order.status,
    createdAt: toIsoString(order.created_at),
    specialistId: order.specialist_id,
    specialistName: order.specialist_name,
    storeId: order.store_id,
    storeName: order.store_name,
    deliveryAddress: order.delivery_address,
    notes: order.notes,
    subtotal: mapMoney(order.subtotal_amount, order.subtotal_currency),
    shipping: mapMoney(order.shipping_amount, order.shipping_currency),
    total: mapMoney(order.total_amount, order.total_currency),
    itemCount: Number(order.item_count),
    items: items.map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      category: item.category,
      quantity: Number(item.quantity),
      imageUrl: item.image_url,
      unitPrice: mapMoney(item.unit_price_amount, item.unit_price_currency),
      lineTotal: mapMoney(item.line_total_amount, item.line_total_currency),
    })),
  };
}

function buildOrderCode(orderCount: number): string {
  const year = new Date().getFullYear();
  return `LR-${year}-${String(orderCount + 41).padStart(3, "0")}`;
}

function slugifyShopValue(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "producto"
  );
}

function inferShopArtwork(category: string): string {
  const normalized = category.toLowerCase();
  if (normalized.includes("vela")) {
    return "candle-moon";
  }
  if (normalized.includes("cuadro") || normalized.includes("carta")) {
    return "natal-gold";
  }
  if (normalized.includes("estatua") || normalized.includes("figura")) {
    return "statue-moon";
  }
  if (normalized.includes("simbolo") || normalized.includes("símbolo")) {
    return "symbol-flower";
  }
  if (normalized.includes("tarot") || normalized.includes("mazo")) {
    return "tarot-rider";
  }

  return "shop-default";
}

function normalizeShopTags(tags?: string[]): string[] {
  const normalized = (tags ?? [])
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return normalized.length > 0 ? normalized.slice(0, 6) : ["nuevo"];
}

function isShopOrderStatus(value: unknown): value is ShopOrderStatus {
  return (
    value === "pending" ||
    value === "confirmed" ||
    value === "preparing" ||
    value === "shipped"
  );
}

function buildDefaultUser(): UserProfile {
  return {
    id: randomUUID(),
    firstName: "",
    lastName: "",
    nickname: "",
    email: "",
    avatarUrl: "",
    location: "",
    timezone: "America/Lima",
    zodiacSign: "",
    planId: "free",
    accountType: "client",
    specialistProfileId: "",
    roles: [],
    natalChart: {
      subjectName: "",
      birthDate: "",
      birthTime: "",
      birthTimeUnknown: true,
      city: "",
      state: "",
      country: "",
      timeZoneId: "",
      utcOffset: "",
      latitude: null,
      longitude: null,
    },
    preferences: {
      focusAreas: [],
      preferredSessionModes: ["chat"],
      receivesPush: true,
    },
  };
}

function normalizeSpecialistLookup(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveManagedSpecialistProfileId(
  existingUser: UserProfile,
  input: UpdateUserProfileInput,
): string {
  const requestedAccountType = input.accountType ?? existingUser.accountType;
  const requestedSpecialistProfileId = input.specialistProfileId?.trim() ?? "";
  const existingSpecialistProfileId =
    existingUser.specialistProfileId?.trim() ?? "";
  const specialists = getSpecialists();

  if (requestedAccountType !== "specialist") {
    return requestedSpecialistProfileId || existingSpecialistProfileId;
  }

  if (
    requestedSpecialistProfileId.length > 0 &&
    specialists.some((item) => item.id === requestedSpecialistProfileId)
  ) {
    return requestedSpecialistProfileId;
  }

  if (
    existingSpecialistProfileId.length > 0 &&
    specialists.some((item) => item.id === existingSpecialistProfileId)
  ) {
    return existingSpecialistProfileId;
  }

  const lookupTokens = [
    existingUser.firstName,
    existingUser.lastName,
    input.firstName,
    input.lastName,
    existingUser.nickname,
    input.nickname,
    existingUser.email,
    input.email,
  ]
    .map(normalizeSpecialistLookup)
    .filter((value) => value.length > 0);

  for (const specialist of specialists) {
    const specialistKey = normalizeSpecialistLookup(specialist.name);
    if (lookupTokens.some((token) => specialistKey.includes(token))) {
      return specialist.id;
    }
  }

  return specialists[0]?.id ?? "";
}

function mergeUserProfile(
  existingUser: UserProfile,
  input: UpdateUserProfileInput,
): UserProfile {
  const nextBirthDate = normalizeBirthDateInput(
    input.natalChart?.birthDate ?? existingUser.natalChart.birthDate,
  );
  const normalizedNatalChart = input.natalChart
    ? {
        ...input.natalChart,
        birthDate: normalizeBirthDateInput(input.natalChart.birthDate),
      }
    : undefined;
  const requestedZodiacSign = input.zodiacSign?.trim();
  const specialistProfileId = resolveManagedSpecialistProfileId(
    existingUser,
    input,
  );

  return {
    ...existingUser,
    firstName: input.firstName ?? existingUser.firstName,
    lastName: input.lastName ?? existingUser.lastName,
    nickname: input.nickname ?? existingUser.nickname,
    email: input.email ?? existingUser.email,
    avatarUrl: input.avatarUrl ?? existingUser.avatarUrl,
    location: input.location ?? existingUser.location,
    accountType: input.accountType ?? existingUser.accountType,
    specialistProfileId,
    timezone: input.natalChart?.timeZoneId?.trim() || existingUser.timezone,
    zodiacSign:
      requestedZodiacSign == null
        ? existingUser.zodiacSign
        : requestedZodiacSign.length === 0
          ? inferZodiacSign(nextBirthDate)
          : requestedZodiacSign,
    natalChart: {
      ...existingUser.natalChart,
      ...(normalizedNatalChart ?? {}),
    },
    preferences: {
      ...existingUser.preferences,
      ...(input.preferences ?? {}),
      preferredSessionModes:
        input.preferences?.preferredSessionModes ??
        existingUser.preferences.preferredSessionModes,
      focusAreas:
        input.preferences?.focusAreas ?? existingUser.preferences.focusAreas,
      receivesPush:
        input.preferences?.receivesPush ??
        existingUser.preferences.receivesPush,
    },
  };
}

function isProfileCompleted(user: UserProfile): boolean {
  return Boolean(
    user.firstName.trim() &&
    user.lastName.trim() &&
    user.natalChart.birthDate.trim() &&
    user.natalChart.city.trim() &&
    user.natalChart.country.trim() &&
    user.natalChart.timeZoneId.trim() &&
    user.natalChart.utcOffset.trim() &&
    user.natalChart.latitude !== null &&
    user.natalChart.longitude !== null,
  );
}

async function findUserById(
  userId: string,
  runner?: QueryRunner,
): Promise<UserProfile | null> {
  const result = await runQuery<UserRow>(
    `
      select
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
        account_type,
        specialist_profile_id,
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
        receives_push
      from users
      where id = $1
    `,
    [userId],
    runner,
  );

  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
}

async function findIdentityByPhone(
  phoneNumber: string,
  runner?: QueryRunner,
): Promise<IdentityRow | null> {
  const result = await runQuery<IdentityRow>(
    `
      select phone_number, user_id, country_code, dial_code, profile_completed
      from phone_auth_identities
      where phone_number = $1
    `,
    [phoneNumber],
    runner,
  );

  return result.rows[0] ?? null;
}

async function findSessionByAccessToken(
  accessToken: string,
  runner?: QueryRunner,
): Promise<SessionRow | null> {
  const result = await runQuery<SessionRow>(
    `
      select access_token, refresh_token, user_id, phone_number, expires_at
      from auth_sessions
      where access_token = $1
    `,
    [accessToken],
    runner,
  );

  return result.rows[0] ?? null;
}

async function upsertUserProfile(
  user: UserProfile,
  runner?: QueryRunner,
): Promise<void> {
  await runQuery(
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
        account_type,
        specialist_profile_id,
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
        updated_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24::jsonb, $25::jsonb, $26, now()
      )
      on conflict (id) do update set
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        nickname = excluded.nickname,
        email = excluded.email,
        avatar_url = excluded.avatar_url,
        location = excluded.location,
        timezone = excluded.timezone,
        zodiac_sign = excluded.zodiac_sign,
        plan_id = excluded.plan_id,
        account_type = excluded.account_type,
        specialist_profile_id = excluded.specialist_profile_id,
        subject_name = excluded.subject_name,
        birth_date = excluded.birth_date,
        birth_time = excluded.birth_time,
        birth_time_unknown = excluded.birth_time_unknown,
        city = excluded.city,
        state = excluded.state,
        country = excluded.country,
        time_zone_id = excluded.time_zone_id,
        utc_offset = excluded.utc_offset,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        focus_areas = excluded.focus_areas,
        preferred_session_modes = excluded.preferred_session_modes,
        receives_push = excluded.receives_push,
        updated_at = now()
    `,
    [
      user.id,
      user.firstName,
      user.lastName,
      user.nickname,
      user.email,
      user.avatarUrl,
      user.location,
      user.timezone,
      user.zodiacSign,
      user.planId,
      user.accountType,
      user.specialistProfileId ?? "",
      user.natalChart.subjectName,
      user.natalChart.birthDate,
      user.natalChart.birthTime,
      user.natalChart.birthTimeUnknown,
      user.natalChart.city,
      user.natalChart.state,
      user.natalChart.country,
      user.natalChart.timeZoneId,
      user.natalChart.utcOffset,
      user.natalChart.latitude,
      user.natalChart.longitude,
      JSON.stringify(user.preferences.focusAreas),
      JSON.stringify(user.preferences.preferredSessionModes),
      user.preferences.receivesPush,
    ],
    runner,
  );
}

async function setPhoneIdentity(
  input: {
    phoneNumber: string;
    userId: string;
    countryCode: string;
    dialCode: string;
    profileCompleted: boolean;
  },
  runner?: QueryRunner,
): Promise<void> {
  await runQuery(
    `
      insert into phone_auth_identities (
        phone_number,
        user_id,
        country_code,
        dial_code,
        profile_completed,
        updated_at
      ) values ($1, $2, $3, $4, $5, now())
      on conflict (phone_number) do update set
        user_id = excluded.user_id,
        country_code = excluded.country_code,
        dial_code = excluded.dial_code,
        profile_completed = excluded.profile_completed,
        updated_at = now()
    `,
    [
      input.phoneNumber,
      input.userId,
      input.countryCode,
      input.dialCode,
      input.profileCompleted,
    ],
    runner,
  );
}

async function buildPhoneAuthSessionPayloadFromSession(
  session: SessionRow,
  runner?: QueryRunner,
): Promise<PhoneAuthSessionPayload> {
  const user = await getDatabaseUser(session.user_id, runner);
  const identity = await findIdentityByPhone(session.phone_number, runner);

  if (!user || !identity) {
    throw new Error("No se encontró la sesión del teléfono autenticado.");
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    phoneNumber: session.phone_number,
    profileCompleted: identity.profile_completed,
    user,
  };
}

async function readServiceOfferOverrides(
  runner?: QueryRunner,
): Promise<Map<string, ServiceOfferOverrideRow>> {
  const result = await runQuery<ServiceOfferOverrideRow>(
    `
      select
        service_id,
        name,
        category,
        description,
        price_amount,
        price_currency,
        duration_minutes,
        delivery_modes,
        premium_included,
        specialist_ids,
        is_active,
        is_visible
      from service_offer_overrides
    `,
    [],
    runner,
  );

  return new Map(result.rows.map((row) => [row.service_id, row]));
}

async function readSpecialistOverrides(
  runner?: QueryRunner,
): Promise<Map<string, SpecialistOverrideRow>> {
  const result = await runQuery<SpecialistOverrideRow>(
    `
      select
        specialist_id,
        public_name,
        headline,
        specialties,
        bio,
        avatar_url,
        is_active,
        is_public
      from specialist_overrides
    `,
    [],
    runner,
  );

  return new Map(result.rows.map((row) => [row.specialist_id, row]));
}

async function listDatabaseServices(
  runner?: QueryRunner,
): Promise<ServiceOffer[]> {
  const overrides = await readServiceOfferOverrides(runner);
  const seededServices = getServices().map((service) =>
    mapServiceWithOverride(service, overrides.get(service.id)),
  );
  const seededIds = new Set(seededServices.map((service) => service.id));
  const adminServices = [...seededServices];
  for (const override of overrides.values()) {
    if (!seededIds.has(override.service_id)) {
      adminServices.push(mapStandaloneServiceOverride(override));
    }
  }

  return adminServices;
}

async function getServiceById(
  serviceId: string,
  runner?: QueryRunner,
): Promise<ServiceOffer | null> {
  return (
    (await listDatabaseServices(runner)).find(
      (item) => item.id === serviceId,
    ) ?? null
  );
}

function getSpecialistById(specialistId: string) {
  return getSpecialists().find((item) => item.id === specialistId) ?? null;
}

async function listDatabaseSpecialists(
  runner?: QueryRunner,
): Promise<AdminSpecialistProfile[]> {
  const overrides = await readSpecialistOverrides(runner);
  return getSpecialists().map((specialist) =>
    mapSpecialistWithOverride(specialist, overrides.get(specialist.id)),
  );
}

async function getDatabaseUser(
  userId?: string,
  runner?: QueryRunner,
): Promise<UserProfile> {
  const resolvedUserId = userId ?? demoUserId;
  const user = await findUserById(resolvedUserId, runner);
  if (!user) {
    throw new Error("El usuario solicitado no existe.");
  }

  return {
    ...user,
    roles: await getUserRoles(user.id),
  };
}

async function isAdminUser(userId?: string): Promise<boolean> {
  return userHasRole(userId ?? demoUserId, "admin");
}

export async function getManagedSpecialistProfileId(
  userId?: string,
): Promise<string | null> {
  const user = isDatabaseConfigured()
    ? await getDatabaseUser(userId)
    : getProfileMock(userId);
  const specialistProfileId = user.specialistProfileId?.trim() ?? "";

  if (user.accountType !== "specialist" || specialistProfileId.length === 0) {
    return null;
  }

  return getSpecialistById(specialistProfileId)?.id ?? null;
}

export async function getUserIdForAccessToken(
  accessToken?: string,
): Promise<string | null> {
  if (!isDatabaseConfigured()) {
    return getUserIdForAccessTokenMock(accessToken);
  }

  if (!accessToken) {
    return null;
  }

  const result = await runQuery<{ user_id: string }>(
    `
      select user_id
      from auth_sessions
      where access_token = $1
        and expires_at > now()
    `,
    [accessToken],
  );

  if (result.rows[0]) {
    return result.rows[0].user_id;
  }

  await runQuery("delete from auth_sessions where access_token = $1", [
    accessToken,
  ]);
  return null;
}

export async function getPhoneAuthSession(
  accessToken: string,
): Promise<PhoneAuthSessionPayload> {
  if (!isDatabaseConfigured()) {
    return getPhoneAuthSessionMock(accessToken);
  }

  const session = await findSessionByAccessToken(accessToken);

  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    await runQuery("delete from auth_sessions where access_token = $1", [
      accessToken,
    ]);
    throw new Error("La sesión ya no es válida. Solicita un nuevo código.");
  }

  return buildPhoneAuthSessionPayloadFromSession(session);
}

export async function revokePhoneAuthSession(
  accessToken: string,
): Promise<void> {
  if (!isDatabaseConfigured()) {
    return revokePhoneAuthSessionMock(accessToken);
  }

  await runQuery("delete from auth_sessions where access_token = $1", [
    accessToken,
  ]);
}

export async function startPhoneAuth(
  input: PhoneAuthStartInput,
): Promise<PhoneAuthStartResult> {
  if (!isDatabaseConfigured()) {
    return startPhoneAuthMock(input);
  }

  const countryCode = (input.countryCode ?? "").trim().toUpperCase();
  const dialCode = normalizeDialCode(input.dialCode);
  const nationalNumber = normalizeNationalNumber(input.nationalNumber);
  const phoneNumber = `${dialCode}${nationalNumber}`;
  const debugCode = generateMockOtpCode();
  const env = getAppEnv();
  const cooldownKey = `auth:otp:cooldown:${phoneNumber}`;

  if (isRedisConfigured()) {
    try {
      const ttl = await getRedisTtl(cooldownKey);
      if (ttl > 0) {
        throw new Error(
          `Espera ${ttl} segundos antes de solicitar otro código.`,
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Espera ")) {
        throw error;
      }
    }
  }

  await runQuery(
    `
      insert into phone_verification_codes (
        phone_number,
        code,
        country_code,
        dial_code,
        expires_at,
        attempts_remaining,
        created_at
      ) values (
        $1,
        $2,
        $3,
        $4,
        now() + make_interval(secs => $5::int),
        3,
        now()
      )
      on conflict (phone_number) do update set
        code = excluded.code,
        country_code = excluded.country_code,
        dial_code = excluded.dial_code,
        expires_at = excluded.expires_at,
        attempts_remaining = 3,
        created_at = now()
    `,
    [phoneNumber, debugCode, countryCode, dialCode, env.otpExpiresInSeconds],
  );

  if (isRedisConfigured()) {
    try {
      await setRedisString(cooldownKey, "1", env.otpResendInSeconds);
    } catch {
      // Si Redis no esta disponible, el flujo sigue funcionando con la base principal.
    }
  }

  return {
    phoneNumber,
    expiresInSeconds: env.otpExpiresInSeconds,
    resendInSeconds: env.otpResendInSeconds,
    debugCode,
  };
}

export async function verifyPhoneAuth(
  input: PhoneAuthVerifyInput,
): Promise<PhoneAuthSessionPayload> {
  if (!isDatabaseConfigured()) {
    return verifyPhoneAuthMock(input);
  }

  const phoneNumber = normalizeFullPhoneNumber(input.phoneNumber);
  const submittedCode = (input.code ?? "").trim();
  const env = getAppEnv();

  return withTransaction(async (client) => {
    const verificationResult = await runQuery<VerificationRow>(
      `
        select
          phone_number,
          code,
          country_code,
          dial_code,
          expires_at,
          attempts_remaining
        from phone_verification_codes
        where phone_number = $1
        for update
      `,
      [phoneNumber],
      client,
    );
    const verificationRecord = verificationResult.rows[0];

    if (!verificationRecord) {
      throw new Error("Primero solicita un código para ese teléfono.");
    }

    if (new Date(verificationRecord.expires_at).getTime() <= Date.now()) {
      await runQuery(
        "delete from phone_verification_codes where phone_number = $1",
        [phoneNumber],
        client,
      );
      throw new Error("El código venció. Solicita uno nuevo.");
    }

    if (!/^\d{6}$/.test(submittedCode)) {
      throw new Error("Ingresa un código de 6 dígitos.");
    }

    if (verificationRecord.code !== submittedCode) {
      if (verificationRecord.attempts_remaining <= 1) {
        await runQuery(
          "delete from phone_verification_codes where phone_number = $1",
          [phoneNumber],
          client,
        );
        throw new Error("Se agotaron los intentos. Solicita un nuevo código.");
      }

      await runQuery(
        `
          update phone_verification_codes
          set attempts_remaining = attempts_remaining - 1
          where phone_number = $1
        `,
        [phoneNumber],
        client,
      );
      throw new Error("El código ingresado no coincide.");
    }

    let identity = await findIdentityByPhone(phoneNumber, client);
    let user: UserProfile;

    if (!identity) {
      user = buildDefaultUser();
      await upsertUserProfile(user, client);
      await setPhoneIdentity(
        {
          phoneNumber,
          userId: user.id,
          countryCode: verificationRecord.country_code,
          dialCode: verificationRecord.dial_code,
          profileCompleted: false,
        },
        client,
      );
      identity = await findIdentityByPhone(phoneNumber, client);
    } else {
      user = await getDatabaseUser(identity.user_id, client);
    }

    const session: SessionRow = {
      access_token: `${randomUUID()}${randomUUID()}`.replaceAll("-", ""),
      refresh_token: `${randomUUID()}${randomUUID()}`.replaceAll("-", ""),
      user_id: user.id,
      phone_number: phoneNumber,
      expires_at: new Date(
        Date.now() + env.authSessionDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
    };

    await runQuery(
      `
        insert into auth_sessions (
          access_token,
          refresh_token,
          user_id,
          phone_number,
          expires_at
        ) values ($1, $2, $3, $4, $5)
      `,
      [
        session.access_token,
        session.refresh_token,
        session.user_id,
        session.phone_number,
        session.expires_at,
      ],
      client,
    );

    await runQuery(
      "delete from phone_verification_codes where phone_number = $1",
      [phoneNumber],
      client,
    );

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      phoneNumber,
      profileCompleted: identity?.profile_completed ?? false,
      user,
    };
  });
}

export async function getProfile(userId?: string): Promise<UserProfile> {
  if (!isDatabaseConfigured()) {
    return getProfileMock(userId);
  }

  return getDatabaseUser(userId);
}

export async function updateCurrentUser(
  input: UpdateUserProfileInput,
  userId?: string,
): Promise<UserProfile> {
  if (!isDatabaseConfigured()) {
    return updateCurrentUserMock(input, userId);
  }

  const existingUser = await getDatabaseUser(userId);
  const updatedUser = mergeUserProfile(existingUser, input);

  await upsertUserProfile(updatedUser);
  await runQuery(
    `
      update phone_auth_identities
      set profile_completed = $2,
          updated_at = now()
      where user_id = $1
    `,
    [updatedUser.id, isProfileCompleted(updatedUser)],
  );

  return updatedUser;
}

export async function completePhoneProfile(
  accessToken: string,
  input: CompletePhoneProfileInput,
): Promise<PhoneAuthSessionPayload> {
  if (!isDatabaseConfigured()) {
    return completePhoneProfileMock(accessToken, input);
  }

  return withTransaction(async (client) => {
    const session = await findSessionByAccessToken(accessToken, client);
    if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
      throw new Error(
        "La sesión ya no es válida. Vuelve a verificar tu teléfono.",
      );
    }

    const normalizedLocation =
      input.location?.trim() ||
      [input.city?.trim(), input.country?.trim()].filter(Boolean).join(", ");

    const existingUser = await getDatabaseUser(session.user_id, client);
    const updatedUser = mergeUserProfile(existingUser, {
      firstName: input.firstName?.trim(),
      lastName: input.lastName?.trim(),
      email: input.email?.trim(),
      location: normalizedLocation,
      accountType: input.accountType ?? "client",
      zodiacSign: input.zodiacSign?.trim() || inferZodiacSign(input.birthDate),
      natalChart: {
        subjectName: input.subjectName?.trim(),
        birthDate: normalizeBirthDateInput(input.birthDate),
        birthTime: input.birthTime?.trim(),
        birthTimeUnknown: Boolean(input.birthTimeUnknown),
        city: input.city?.trim(),
        state: input.state?.trim() ?? "",
        country: input.country?.trim(),
        timeZoneId: input.timeZoneId?.trim() ?? "",
        utcOffset: input.utcOffset?.trim() ?? "",
        latitude: typeof input.latitude === "number" ? input.latitude : null,
        longitude: typeof input.longitude === "number" ? input.longitude : null,
      },
    });

    await upsertUserProfile(updatedUser, client);
    await runQuery(
      `
        update phone_auth_identities
        set profile_completed = $2,
            updated_at = now()
        where user_id = $1
      `,
      [updatedUser.id, isProfileCompleted(updatedUser)],
      client,
    );

    return buildPhoneAuthSessionPayloadFromSession(session, client);
  });
}

export async function getBookings(userId?: string): Promise<Booking[]> {
  if (!isDatabaseConfigured()) {
    return getBookingsMock(userId);
  }

  const user = await getDatabaseUser(userId);
  const isAdmin = user.roles?.includes("admin") ?? false;
  const specialistScope =
    user.accountType === "specialist" &&
    Boolean(user.specialistProfileId?.trim()) &&
    !isAdmin;
  const result = await runQuery<BookingRow>(
    `
      select
        id,
        user_id,
        service_id,
        service_name,
        specialist_id,
        specialist_name,
        scheduled_at,
        mode,
        status,
        price_amount,
        price_currency,
        notes
      from bookings
      ${isAdmin ? "" : `where ${specialistScope ? "specialist_id" : "user_id"} = $1`}
      order by scheduled_at asc
    `,
    isAdmin
      ? []
      : [
          specialistScope
            ? (user.specialistProfileId?.trim() ?? user.id)
            : user.id,
        ],
  );

  return result.rows.map(mapBookingRow);
}

export async function getAllBookingsAdmin(): Promise<Booking[]> {
  if (!isDatabaseConfigured()) {
    return getBookingsMock();
  }

  const result = await runQuery<BookingRow>(
    `
      select
        id,
        user_id,
        service_id,
        service_name,
        specialist_id,
        specialist_name,
        scheduled_at,
        mode,
        status,
        price_amount,
        price_currency,
        notes
      from bookings
      order by scheduled_at asc
    `,
  );

  return result.rows.map(mapBookingRow);
}

export async function createBooking(
  input: CreateBookingInput,
  userId?: string,
): Promise<Booking> {
  if (!isDatabaseConfigured()) {
    return createBookingMock(input, userId);
  }

  const resolvedUserId = userId ?? demoUserId;
  if (
    !input.serviceId ||
    !input.specialistId ||
    !input.scheduledAt ||
    !input.mode
  ) {
    throw new Error("Faltan campos obligatorios para crear la reserva.");
  }

  const service = await getServiceById(input.serviceId);
  if (!service) {
    throw new Error("El servicio no existe.");
  }

  const specialist = getSpecialistById(input.specialistId);
  if (!specialist) {
    throw new Error("El especialista no existe.");
  }

  if (!service.specialistIds.includes(specialist.id)) {
    throw new Error("El especialista no ofrece ese servicio.");
  }

  if (!service.deliveryModes.includes(input.mode)) {
    throw new Error("Ese servicio no admite el modo seleccionado.");
  }

  const booking: Booking = {
    id: randomUUID(),
    userId: resolvedUserId,
    serviceId: service.id,
    serviceName: service.name,
    specialistId: specialist.id,
    specialistName: specialist.name,
    scheduledAt: input.scheduledAt,
    mode: input.mode,
    status: service.price.amount > 0 ? "pending_payment" : "confirmed",
    price: service.price,
    notes: input.notes ?? "",
  };

  await runQuery(
    `
      insert into bookings (
        id,
        user_id,
        service_id,
        service_name,
        specialist_id,
        specialist_name,
        scheduled_at,
        mode,
        status,
        price_amount,
        price_currency,
        notes,
        updated_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now()
      )
    `,
    [
      booking.id,
      booking.userId,
      booking.serviceId,
      booking.serviceName,
      booking.specialistId,
      booking.specialistName,
      booking.scheduledAt,
      booking.mode,
      booking.status,
      booking.price.amount,
      booking.price.currency,
      booking.notes,
    ],
  );

  return booking;
}

export async function updateBooking(
  bookingId: string,
  input: UpdateBookingInput,
  userId?: string,
): Promise<Booking> {
  if (!isDatabaseConfigured()) {
    return updateBookingMock(bookingId, input, userId);
  }

  const user = await getDatabaseUser(userId);
  const specialistScope =
    user.accountType === "specialist" &&
    Boolean(user.specialistProfileId?.trim());
  const scopeValue = specialistScope
    ? (user.specialistProfileId?.trim() ?? user.id)
    : user.id;
  const result = await runQuery<BookingRow>(
    `
      select
        id,
        user_id,
        service_id,
        service_name,
        specialist_id,
        specialist_name,
        scheduled_at,
        mode,
        status,
        price_amount,
        price_currency,
        notes
      from bookings
      where id = $1
        and ${specialistScope ? "specialist_id" : "user_id"} = $2
    `,
    [bookingId, scopeValue],
  );
  const bookingRow = result.rows[0];

  if (!bookingRow) {
    throw new Error("La reserva no existe.");
  }

  const booking = mapBookingRow(bookingRow);
  if (booking.status === "cancelled") {
    throw new Error("La reserva ya fue cancelada.");
  }
  if (booking.status === "completed") {
    throw new Error("No se puede modificar una reserva completada.");
  }

  const service = await getServiceById(booking.serviceId);
  if (!service) {
    throw new Error("El servicio asociado ya no existe.");
  }

  if (input.mode && !service.deliveryModes.includes(input.mode)) {
    throw new Error("Ese servicio no admite el modo seleccionado.");
  }

  if (input.scheduledAt) {
    const parsedDate = new Date(input.scheduledAt);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error("La nueva fecha es inválida.");
    }
    if (parsedDate.getTime() <= Date.now()) {
      throw new Error("La nueva fecha debe estar en el futuro.");
    }
  }

  const updatedBooking: Booking = {
    ...booking,
    scheduledAt: input.scheduledAt?.trim() || booking.scheduledAt,
    mode: input.mode ?? booking.mode,
    notes: input.notes ?? booking.notes,
    status: input.status ?? booking.status,
  };

  await runQuery(
    `
      update bookings
      set scheduled_at = $3,
          mode = $4,
          notes = $5,
          status = $6,
          updated_at = now()
      where id = $1
        and ${specialistScope ? "specialist_id" : "user_id"} = $2
    `,
    [
      updatedBooking.id,
      scopeValue,
      updatedBooking.scheduledAt,
      updatedBooking.mode,
      updatedBooking.notes,
      updatedBooking.status,
    ],
  );

  return updatedBooking;
}

export async function getCurrentSubscription(
  userId?: string,
): Promise<Subscription> {
  return getCurrentSubscriptionBilling(userId);
}

async function listShopProducts(): Promise<ShopProduct[]> {
  const seedProducts = getShopDataMock().products.map(cloneShopProduct);
  const result = await runQuery<ShopProductOverrideRow>(
    `
      select
        product_id,
        name,
        category,
        specialist_id,
        specialist_name,
        store_id,
        store_name,
        short_description,
        description,
        price_amount,
        price_currency,
        sku,
        status,
        image_url,
        artwork,
        badge,
        featured,
        stock_label,
        stock_quantity,
        made_to_order,
        tags,
        created_at,
        updated_at
      from shop_product_overrides
      order by created_at desc
    `,
  );
  const overrides = new Map(
    result.rows.map((row) => [row.product_id, mapShopProductOverrideRow(row)]),
  );
  const seedProductIds = new Set(seedProducts.map((product) => product.id));
  const customProducts = result.rows
    .filter((row) => !seedProductIds.has(row.product_id))
    .map(mapShopProductOverrideRow);

  return [
    ...customProducts,
    ...seedProducts.map((product) => {
      const override = overrides.get(product.id);
      if (!override) {
        return product;
      }

      const primaryImageUrl = override.imageUrl.trim() || product.imageUrl;

      return normalizeShopProductOwnership(
        {
          ...product,
          ...override,
          imageUrl: primaryImageUrl,
          imageUrls: normalizeShopImageUrls(primaryImageUrl, [
            ...override.imageUrls,
            ...product.imageUrls,
          ]).imageUrls,
          artwork: override.artwork.trim() || product.artwork,
        },
        override.specialistId,
        override.specialistName,
      );
    }),
  ];
}

async function upsertShopProductOverride(
  product: ShopProduct,
  runner?: QueryRunner,
): Promise<void> {
  const gallery = normalizeShopImageUrls(product.imageUrl, product.imageUrls);
  const normalizedProduct: ShopProduct = {
    ...product,
    imageUrl: gallery.imageUrl,
    imageUrls: gallery.imageUrls,
    tags: [...product.tags],
    price: cloneMoney(product.price),
  };

  await runQuery(
    `
      insert into shop_product_overrides (
        product_id,
        name,
        category,
        specialist_id,
        specialist_name,
        store_id,
        store_name,
        short_description,
        description,
        price_amount,
        price_currency,
        sku,
        status,
        image_url,
        artwork,
        badge,
        featured,
        stock_label,
        stock_quantity,
        made_to_order,
        tags,
        created_at,
        updated_at
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb, $22, now()
      )
      on conflict (product_id) do update set
        name = excluded.name,
        category = excluded.category,
        specialist_id = excluded.specialist_id,
        specialist_name = excluded.specialist_name,
        store_id = excluded.store_id,
        store_name = excluded.store_name,
        short_description = excluded.short_description,
        description = excluded.description,
        price_amount = excluded.price_amount,
        price_currency = excluded.price_currency,
        sku = excluded.sku,
        status = excluded.status,
        image_url = excluded.image_url,
        artwork = excluded.artwork,
        badge = excluded.badge,
        featured = excluded.featured,
        stock_label = excluded.stock_label,
        stock_quantity = excluded.stock_quantity,
        made_to_order = excluded.made_to_order,
        tags = excluded.tags,
        updated_at = now()
    `,
    [
      product.id,
      product.name,
      product.category,
      product.specialistId,
      product.specialistName,
      product.storeId,
      product.storeName,
      product.shortDescription,
      product.description,
      normalizedProduct.price.amount,
      normalizedProduct.price.currency,
      normalizedProduct.sku,
      normalizedProduct.status,
      normalizedProduct.imageUrl,
      normalizedProduct.artwork,
      normalizedProduct.badge,
      normalizedProduct.featured,
      normalizedProduct.stockLabel,
      normalizedProduct.stockQuantity,
      normalizedProduct.madeToOrder,
      JSON.stringify(normalizedProduct.tags),
      normalizedProduct.createdAt ?? new Date().toISOString(),
    ],
    runner,
  );
}

export async function getShopData(userId?: string): Promise<ShopData> {
  if (!isDatabaseConfigured()) {
    return getShopDataMock(userId);
  }

  const seed = getShopDataMock(userId);
  const user = await getDatabaseUser(userId);
  const scope = buildShopViewerScope(user, await isAdminUser(user.id));
  const products = filterShopProductsForScope(await listShopProducts(), scope);

  return {
    ...seed,
    products,
    orders: await getShopOrders(userId),
  };
}

export async function getShopOrders(userId?: string): Promise<ShopOrder[]> {
  if (!isDatabaseConfigured()) {
    return getShopOrdersMock(userId);
  }

  const user = await getDatabaseUser(userId);
  const scope = buildShopViewerScope(user, await isAdminUser(user.id));
  const specialistScope = user.accountType === "specialist" && !scope.isAdmin;
  const ordersResult = await runQuery<ShopOrderRow>(
    `
      select
        id,
        user_id,
        order_code,
        status,
        created_at,
        specialist_id,
        specialist_name,
        store_id,
        store_name,
        delivery_address,
        notes,
        subtotal_amount,
        subtotal_currency,
        shipping_amount,
        shipping_currency,
        total_amount,
        total_currency,
        item_count
      from shop_orders
      ${scope.isAdmin || specialistScope ? "" : "where user_id = $1"}
      order by created_at desc
    `,
    scope.isAdmin || specialistScope ? [] : [user.id],
  );

  if (ordersResult.rows.length === 0) {
    return getShopOrdersMock(user.id);
  }

  const orderIds = ordersResult.rows.map((order) => order.id);
  const itemsResult = await runQuery<ShopOrderItemRow>(
    `
      select
        order_id,
        product_id,
        product_name,
        category,
        quantity,
        image_url,
        unit_price_amount,
        unit_price_currency,
        line_total_amount,
        line_total_currency
      from shop_order_items
      where order_id = any($1::text[])
      order by created_at asc
    `,
    [orderIds],
  );
  const itemsByOrderId = new Map<string, ShopOrderItemRow[]>();
  for (const item of itemsResult.rows) {
    const group = itemsByOrderId.get(item.order_id) ?? [];
    group.push(item);
    itemsByOrderId.set(item.order_id, group);
  }

  const databaseOrders = ordersResult.rows.map((order) =>
    mapShopOrderRows(order, itemsByOrderId.get(order.id) ?? []),
  );
  const seedOrders = getShopOrdersMock(user.id);
  const databaseOrderIds = new Set(databaseOrders.map((order) => order.id));

  return filterShopOrdersForScope(
    [
      ...databaseOrders,
      ...seedOrders.filter((order) => !databaseOrderIds.has(order.id)),
    ],
    scope,
  );
}

export async function getAllShopOrdersAdmin(): Promise<ShopOrder[]> {
  if (!isDatabaseConfigured()) {
    return getShopOrdersMock();
  }

  const ordersResult = await runQuery<ShopOrderRow>(
    `
      select
        id,
        user_id,
        order_code,
        status,
        created_at,
        specialist_id,
        specialist_name,
        store_id,
        store_name,
        delivery_address,
        notes,
        subtotal_amount,
        subtotal_currency,
        shipping_amount,
        shipping_currency,
        total_amount,
        total_currency,
        item_count
      from shop_orders
      order by created_at desc
    `,
  );

  if (ordersResult.rows.length === 0) {
    return getShopOrdersMock();
  }

  const orderIds = ordersResult.rows.map((order) => order.id);
  const itemsResult = await runQuery<ShopOrderItemRow>(
    `
      select
        order_id,
        product_id,
        product_name,
        category,
        quantity,
        image_url,
        unit_price_amount,
        unit_price_currency,
        line_total_amount,
        line_total_currency
      from shop_order_items
      where order_id = any($1::text[])
      order by created_at asc
    `,
    [orderIds],
  );
  const itemsByOrderId = new Map<string, ShopOrderItemRow[]>();
  for (const item of itemsResult.rows) {
    const group = itemsByOrderId.get(item.order_id) ?? [];
    group.push(item);
    itemsByOrderId.set(item.order_id, group);
  }

  return ordersResult.rows.map((order) =>
    mapShopOrderRows(order, itemsByOrderId.get(order.id) ?? []),
  );
}

export async function getAllShopProductsAdmin(): Promise<ShopProduct[]> {
  if (!isDatabaseConfigured()) {
    return getShopDataMock().products.map(cloneShopProduct);
  }

  return listShopProducts();
}

export async function getShopProductAuditLog(
  options: { productId?: string; limit?: number } = {},
): Promise<ShopProductAuditEntry[]> {
  const safeLimit = Math.max(1, Math.min(options.limit ?? 100, 500));
  const productId = options.productId?.trim() ?? "";

  if (!isDatabaseConfigured()) {
    return mockShopProductAuditLog
      .filter((entry) => (productId.length > 0 ? entry.entityId === productId : true))
      .slice(0, safeLimit);
  }

  const rows = await query<AuditLogRow>(
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
      where entity_type = 'shop_product'
        and ($1::text = '' or entity_id = $1)
      order by created_at desc
      limit $2
    `,
    [productId, safeLimit],
  );

  return rows.rows.map((row) => ({
    id: row.id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    payload: row.payload,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
  }));
}

export async function listServices(options?: {
  includeInactive?: boolean;
  specialistId?: string;
}): Promise<ServiceOffer[]> {
  const includeInactive = Boolean(options?.includeInactive);
  const specialistId = options?.specialistId?.trim() ?? "";
  if (!isDatabaseConfigured()) {
    return getServices().filter((service) => {
      const matchesSpecialist =
        specialistId.length === 0 || service.specialistIds.includes(specialistId);
      const matchesState = includeInactive || (service.isActive && service.isVisible);
      return matchesSpecialist && matchesState;
    });
  }

  const services = await listDatabaseServices();
  return services.filter((service) => {
    const matchesSpecialist =
      specialistId.length === 0 || service.specialistIds.includes(specialistId);
    const matchesState = includeInactive || (service.isActive && service.isVisible);
    return matchesSpecialist && matchesState;
  });
}

export async function listAdminSpecialists(): Promise<AdminSpecialistProfile[]> {
  if (!isDatabaseConfigured()) {
    return getSpecialists().map((specialist) => cloneSpecialistProfile({
      ...specialist,
      publicName: specialist.publicName,
      avatarUrl: specialist.avatarUrl,
      sessionModes: [...specialist.sessionModes],
      languages: [...specialist.languages],
      isActive: specialist.isActive ?? true,
      isPublic: specialist.isPublic ?? true,
    }));
  }

  return listDatabaseSpecialists();
}

export async function getAdminSpecialistById(
  specialistId: string,
): Promise<AdminSpecialistProfile | null> {
  return (
    (await listAdminSpecialists()).find((item) => item.id === specialistId.trim()) ?? null
  );
}

export async function updateServiceOffer(
  serviceId: string,
  input: UpdateServiceOfferInput,
  auditMeta?: AdminAuditMeta,
): Promise<ServiceOffer> {
  if (!isDatabaseConfigured()) {
    const before = getServices().find((item) => item.id === serviceId) ?? null;
    const updated = updateServiceOfferMock(serviceId, input);
    if (before && auditMeta) {
      const fields: Array<keyof UpdateServiceOfferInput> = [
        "name",
        "category",
        "description",
        "price",
        "durationMinutes",
        "isActive",
        "isVisible",
      ];
      for (const field of fields) {
        const previousValue = before[field as keyof ServiceOffer] ?? null;
        const newValue = updated[field as keyof ServiceOffer] ?? null;
        if (JSON.stringify(previousValue) !== JSON.stringify(newValue)) {
          await insertAdminEntityAuditLog(
            "service_offer",
            updated.id,
            field === "isActive" ? (updated.isActive ? "ACTIVATED" : "DEACTIVATED") : "UPDATED",
            String(field),
            previousValue,
            newValue,
            auditMeta,
          );
        }
      }
    }
    return updated;
  }

  const service = await getServiceById(serviceId);
  if (!service) {
    throw new Error("El servicio no existe.");
  }

  const amount =
    input.price?.amount === undefined
      ? service.price.amount
      : Number(input.price.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Ingresa un precio válido.");
  }
  const name = input.name?.trim() || service.name;
  const category = input.category?.trim() || service.category;
  const description = input.description?.trim() || service.description;
  if (name.length < 3) {
    throw new Error("Ingresa un nombre válido.");
  }
  if (category.length < 3) {
    throw new Error("Ingresa una categoría válida.");
  }
  if (description.length < 6) {
    throw new Error("Ingresa una descripción válida.");
  }

  const durationMinutes =
    input.durationMinutes === undefined
      ? service.durationMinutes
      : Math.max(0, Math.round(Number(input.durationMinutes)));
  const updated: ServiceOffer = {
    ...service,
    name,
    category,
    description,
    durationMinutes,
    price: {
      amount: Number(amount.toFixed(2)),
      currency: input.price?.currency?.trim() || service.price.currency,
    },
    isActive: input.isActive ?? service.isActive,
    isVisible: input.isVisible ?? service.isVisible,
  };

  await runQuery(
    `
      insert into service_offer_overrides (
        service_id,
        name,
        category,
        description,
        price_amount,
        price_currency,
        duration_minutes,
        delivery_modes,
        premium_included,
        specialist_ids,
        is_active,
        is_visible,
        updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb, $11, $12, now())
      on conflict (service_id) do update set
        name = excluded.name,
        category = excluded.category,
        description = excluded.description,
        price_amount = excluded.price_amount,
        price_currency = excluded.price_currency,
        duration_minutes = excluded.duration_minutes,
        delivery_modes = excluded.delivery_modes,
        premium_included = excluded.premium_included,
        specialist_ids = excluded.specialist_ids,
        is_active = excluded.is_active,
        is_visible = excluded.is_visible,
        updated_at = now()
    `,
    [
      updated.id,
      updated.name,
      updated.category,
      updated.description,
      updated.price.amount,
      updated.price.currency,
      updated.durationMinutes,
      JSON.stringify(updated.deliveryModes),
      updated.premiumIncluded,
      JSON.stringify(updated.specialistIds),
      updated.isActive,
      updated.isVisible,
    ],
  );

  if (auditMeta) {
    const fields: Array<keyof ServiceOffer> = [
      "name",
      "category",
      "description",
      "price",
      "durationMinutes",
      "isActive",
      "isVisible",
    ];
    for (const field of fields) {
      const previousValue = service[field];
      const newValue = updated[field];
      if (JSON.stringify(previousValue) !== JSON.stringify(newValue)) {
        await insertAdminEntityAuditLog(
          "service_offer",
          updated.id,
          field === "isActive" ? (updated.isActive ? "ACTIVATED" : "DEACTIVATED") : "UPDATED",
          String(field),
          previousValue,
          newValue,
          auditMeta,
        );
      }
    }
  }

  return updated;
}

export async function createServiceOffer(
  specialistId: string,
  input: CreateServiceOfferInput,
  auditMeta?: AdminAuditMeta,
): Promise<ServiceOffer> {
  if (!isDatabaseConfigured()) {
    const created = createServiceOfferMock(input, specialistId);
    if (auditMeta) {
      await insertAdminEntityAuditLog(
        "service_offer",
        created.id,
        "CREATED",
        "created",
        null,
        created,
        auditMeta,
      );
    }
    return created;
  }

  const specialist = await getAdminSpecialistById(specialistId);
  if (!specialist) {
    throw new Error("El especialista no existe.");
  }

  const name = input.name?.trim() ?? "";
  const category = input.category?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  const amount = Number(input.price?.amount ?? 0);
  const durationMinutes = Math.max(1, Math.round(Number(input.durationMinutes ?? 0)));
  if (name.length < 3) {
    throw new Error("Ingresa un nombre válido.");
  }
  if (category.length < 3) {
    throw new Error("Ingresa una categoría válida.");
  }
  if (description.length < 6) {
    throw new Error("Ingresa una descripción válida.");
  }
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Ingresa un precio válido.");
  }

  const created: ServiceOffer = {
    id: `service-${slugifyShopValue(name)}-${randomUUID().slice(0, 8)}`,
    name,
    category,
    description,
    durationMinutes,
    price: {
      amount: Number(amount.toFixed(2)),
      currency: input.price?.currency?.trim() || "USD",
    },
    deliveryModes:
      input.deliveryModes && input.deliveryModes.length > 0
        ? [...input.deliveryModes]
        : specialist.sessionModes.filter(
            (item): item is "chat" | "audio" | "video" =>
              ["chat", "audio", "video"].includes(item),
          ),
    premiumIncluded: Boolean(input.premiumIncluded),
    specialistIds:
      input.specialistIds && input.specialistIds.length > 0
        ? [...new Set(input.specialistIds)]
        : [specialistId],
    isActive: input.isActive ?? true,
    isVisible: input.isVisible ?? true,
  };

  await runQuery(
    `
      insert into service_offer_overrides (
        service_id,
        name,
        category,
        description,
        price_amount,
        price_currency,
        duration_minutes,
        delivery_modes,
        premium_included,
        specialist_ids,
        is_active,
        is_visible,
        updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb, $11, $12, now())
    `,
    [
      created.id,
      created.name,
      created.category,
      created.description,
      created.price.amount,
      created.price.currency,
      created.durationMinutes,
      JSON.stringify(created.deliveryModes),
      created.premiumIncluded,
      JSON.stringify(created.specialistIds),
      created.isActive,
      created.isVisible,
    ],
  );

  if (auditMeta) {
    await insertAdminEntityAuditLog(
      "service_offer",
      created.id,
      "CREATED",
      "created",
      null,
      created,
      auditMeta,
    );
  }
  return created;
}

export async function updateAdminSpecialist(
  specialistId: string,
  input: UpdateSpecialistAdminInput,
  auditMeta?: AdminAuditMeta,
): Promise<AdminSpecialistProfile> {
  if (!isDatabaseConfigured()) {
    const before = getSpecialists().find((item) => item.id === specialistId) ?? null;
    const updated = updateSpecialistAdminMock(specialistId, input);
    if (before && auditMeta) {
      const after = updated;
      const fields: Array<[string, unknown, unknown, string]> = [
        ["isActive", before.isActive, after.isActive, after.isActive ? "ACTIVATED" : "DEACTIVATED"],
        ["isPublic", before.isPublic, after.isPublic, "UPDATED"],
        ["publicName", before.publicName ?? null, after.publicName ?? null, "UPDATED"],
        ["headline", before.headline, after.headline, "UPDATED"],
        ["specialties", before.specialties, after.specialties, "UPDATED"],
        ["bio", before.bio, after.bio, "UPDATED"],
        ["avatarUrl", before.avatarUrl ?? null, after.avatarUrl ?? null, "UPDATED"],
      ];
      for (const [fieldChanged, previousValue, newValue, action] of fields) {
        if (JSON.stringify(previousValue) !== JSON.stringify(newValue)) {
          await insertAdminEntityAuditLog(
            "specialist",
            specialistId,
            action,
            fieldChanged,
            previousValue,
            newValue,
            auditMeta,
          );
        }
      }
    }
    return cloneSpecialistProfile({
      ...updated,
      sessionModes: [...updated.sessionModes],
      languages: [...updated.languages],
    });
  }

  const before = await getAdminSpecialistById(specialistId);
  if (!before) {
    throw new Error("El especialista no existe.");
  }

  const specialtyList =
    input.specialty?.trim().length
      ? input.specialty!.split(",").map((item) => item.trim()).filter(Boolean)
      : before.specialties;
  const after: AdminSpecialistProfile = {
    ...before,
    publicName: input.publicName?.trim() || before.publicName,
    headline: input.headline?.trim() || before.headline,
    bio: input.bio?.trim() || before.bio,
    avatarUrl: input.avatarUrl?.trim() || before.avatarUrl,
    specialties: specialtyList,
    isActive: input.isActive ?? before.isActive,
    isPublic: input.isPublic ?? before.isPublic,
  };

  await runQuery(
    `
      insert into specialist_overrides (
        specialist_id,
        public_name,
        headline,
        specialties,
        bio,
        avatar_url,
        is_active,
        is_public,
        updated_at
      ) values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, now())
      on conflict (specialist_id) do update set
        public_name = excluded.public_name,
        headline = excluded.headline,
        specialties = excluded.specialties,
        bio = excluded.bio,
        avatar_url = excluded.avatar_url,
        is_active = excluded.is_active,
        is_public = excluded.is_public,
        updated_at = now()
    `,
    [
      specialistId,
      after.publicName ?? null,
      after.headline,
      JSON.stringify(after.specialties),
      after.bio,
      after.avatarUrl ?? null,
      after.isActive,
      after.isPublic,
    ],
  );

  if (auditMeta) {
    const fields: Array<[string, unknown, unknown, string]> = [
      ["isActive", before.isActive, after.isActive, after.isActive ? "ACTIVATED" : "DEACTIVATED"],
      ["isPublic", before.isPublic, after.isPublic, "UPDATED"],
      ["publicName", before.publicName ?? null, after.publicName ?? null, "UPDATED"],
      ["headline", before.headline, after.headline, "UPDATED"],
      ["specialties", before.specialties, after.specialties, "UPDATED"],
      ["bio", before.bio, after.bio, "UPDATED"],
      ["avatarUrl", before.avatarUrl ?? null, after.avatarUrl ?? null, "UPDATED"],
    ];
    for (const [fieldChanged, previousValue, newValue, action] of fields) {
      if (JSON.stringify(previousValue) !== JSON.stringify(newValue)) {
        await insertAdminEntityAuditLog(
          "specialist",
          specialistId,
          action,
          fieldChanged,
          previousValue,
          newValue,
          auditMeta,
        );
      }
    }
  }

  return cloneSpecialistProfile(after);
}

export async function getAdminEntityAuditLog(options: {
  entityType?: string;
  specialistId?: string;
  limit?: number;
} = {}): Promise<AdminEntityAuditEntry[]> {
  const safeLimit = Math.max(1, Math.min(options.limit ?? 100, 500));
  const entityType = options.entityType?.trim() ?? "";
  const specialistId = options.specialistId?.trim() ?? "";

  const bySpecialist = (entry: AdminEntityAuditEntry) => {
    if (specialistId.length === 0) {
      return true;
    }
    if (entry.entityType === "specialist" && entry.entityId === specialistId) {
      return true;
    }
    const payloadSpecialistId =
      typeof entry.payload?.specialistId === "string" ? entry.payload.specialistId : "";
    const payloadSpecialistIds = Array.isArray(entry.payload?.specialistIds)
      ? entry.payload.specialistIds.filter((item): item is string => typeof item === "string")
      : [];
    const newValueRecord =
      entry.payload?.newValue && typeof entry.payload.newValue === "object"
        ? (entry.payload.newValue as Record<string, unknown>)
        : null;
    const previousValueRecord =
      entry.payload?.previousValue && typeof entry.payload.previousValue === "object"
        ? (entry.payload.previousValue as Record<string, unknown>)
        : null;
    const nestedSpecialistId =
      typeof newValueRecord?.specialistId === "string"
        ? newValueRecord.specialistId
        : typeof previousValueRecord?.specialistId === "string"
          ? previousValueRecord.specialistId
          : "";
    const nestedSpecialistIds = [
      ...(Array.isArray(newValueRecord?.specialistIds)
        ? newValueRecord.specialistIds.filter((item): item is string => typeof item === "string")
        : []),
      ...(Array.isArray(previousValueRecord?.specialistIds)
        ? previousValueRecord.specialistIds.filter((item): item is string => typeof item === "string")
        : []),
    ];
    return (
      payloadSpecialistId === specialistId ||
      payloadSpecialistIds.includes(specialistId) ||
      nestedSpecialistId === specialistId ||
      nestedSpecialistIds.includes(specialistId)
    );
  };

  if (!isDatabaseConfigured()) {
    return mockAdminEntityAuditLog
      .filter((entry) => (entityType.length > 0 ? entry.entityType === entityType : true))
      .filter(bySpecialist)
      .slice(0, safeLimit);
  }

  const rows = await query<AuditLogRow>(
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
      where ($1::text = '' or entity_type = $1)
      order by created_at desc
      limit $2
    `,
    [entityType, safeLimit],
  );

  return rows.rows.map(mapAdminAuditRow).filter(bySpecialist);
}

function matchesCourseAuditEntry(entry: AdminEntityAuditEntry, courseId: string): boolean {
  const payloadCourseId =
    typeof entry.payload?.courseId === "string" ? entry.payload.courseId : "";
  if (payloadCourseId === courseId) {
    return true;
  }
  if (entry.entityId === courseId) {
    return true;
  }
  return false;
}

export async function getCourseAuditLog(options: {
  courseId: string;
  limit?: number;
}): Promise<CourseAuditLogEntry[]> {
  const safeLimit = Math.max(1, Math.min(options.limit ?? 100, 500));
  const courseId = options.courseId.trim();
  if (courseId.length === 0) {
    return [];
  }

  if (!isDatabaseConfigured()) {
    return mockAdminEntityAuditLog
      .filter((entry) => matchesCourseAuditEntry(entry, courseId))
      .slice(0, safeLimit)
      .map((entry) => mapCourseAuditRow({
        id: entry.id,
        actor_type: entry.actorType,
        actor_id: entry.actorId,
        event_type: entry.eventType,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        payload: entry.payload,
        created_at: entry.createdAt,
      }));
  }

  const rows = await query<AuditLogRow>(
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
      where (
        entity_id = $1
        or payload->>'courseId' = $1
      )
      order by created_at desc
      limit $2
    `,
    [courseId, safeLimit],
  );

  return rows.rows
    .map(mapCourseAuditRow)
    .filter((entry) => entry.courseId === courseId);
}

export async function createShopOrder(
  input: CreateShopOrderInput,
  userId?: string,
): Promise<ShopOrder> {
  if (!isDatabaseConfigured()) {
    return createShopOrderMock(input, userId);
  }

  const user = await getDatabaseUser(userId);
  const products = await listShopProducts();
  const orderCountResult = await runQuery<{ count: string }>(
    "select count(*)::text as count from shop_orders where user_id = $1",
    [user.id],
  );
  const orderDraft = buildShopOrderDraft({
    input,
    products,
    viewer: buildShopViewerScope(user, false),
    orderId: randomUUID(),
    orderCode: buildOrderCode(Number(orderCountResult.rows[0]?.count ?? 0) + 1),
    createdAt: new Date().toISOString(),
    deliveryAddressFallback: user.location,
  });
  const order = orderDraft.order;
  const updatedProducts = orderDraft.updatedProducts.filter((product) => {
    const previous = products.find((item) => item.id === product.id);
    return (
      previous &&
      (previous.stockQuantity !== product.stockQuantity ||
        previous.stockLabel !== product.stockLabel ||
        previous.madeToOrder !== product.madeToOrder)
    );
  });

  await withTransaction(async (client) => {
    await runQuery(
      `
        insert into shop_orders (
          id,
          user_id,
          order_code,
          status,
          created_at,
          specialist_id,
          specialist_name,
          store_id,
          store_name,
          delivery_address,
          notes,
          subtotal_amount,
          subtotal_currency,
          shipping_amount,
          shipping_currency,
          total_amount,
          total_currency,
          item_count,
          updated_at
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, now()
        )
      `,
      [
        order.id,
        order.userId,
        order.orderCode,
        order.status,
        order.createdAt,
        order.specialistId,
        order.specialistName,
        order.storeId,
        order.storeName,
        order.deliveryAddress,
        order.notes,
        order.subtotal.amount,
        order.subtotal.currency,
        order.shipping.amount,
        order.shipping.currency,
        order.total.amount,
        order.total.currency,
        order.itemCount,
      ],
      client,
    );

    for (const item of order.items) {
      await runQuery(
        `
          insert into shop_order_items (
            id,
            order_id,
            product_id,
            product_name,
            category,
            quantity,
            image_url,
            unit_price_amount,
            unit_price_currency,
            line_total_amount,
            line_total_currency
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          randomUUID(),
          order.id,
          item.productId,
          item.productName,
          item.category,
          item.quantity,
          item.imageUrl,
          item.unitPrice.amount,
          item.unitPrice.currency,
          item.lineTotal.amount,
          item.lineTotal.currency,
        ],
        client,
      );
    }

    for (const product of updatedProducts) {
      await upsertShopProductOverride(product, client);
    }
  });

  return order;
}

export async function createShopProduct(
  input: CreateShopProductInput,
  specialistProfileId?: string,
  auditMeta?: ShopProductAuditMeta,
): Promise<ShopProduct> {
  if (!isDatabaseConfigured()) {
    const product = createShopProductMock(input, specialistProfileId);
    void insertShopProductAuditLog(
      product.id,
      auditMeta?.actorType ?? "specialist",
      auditMeta?.actorId ?? specialistProfileId?.trim() ?? "system",
      `shop_product.created`,
      buildProductAuditPayload(
        "CREATED",
        "created",
        null,
        product,
        auditMeta?.source ?? "specialist",
        auditMeta?.actorId ?? specialistProfileId?.trim() ?? "system",
      ),
    );
    return product;
  }

  const name = input.name?.trim() ?? "";
  const category = input.category?.trim() ?? "";
  const amount = Number(input.price?.amount ?? 0);
  const ownerId = specialistProfileId?.trim() ?? "";
  const owner = getSpecialists().find((item) => item.id === ownerId);

  if (name.length < 3) {
    throw new Error("Ingresa un nombre de producto válido.");
  }
  if (category.length < 3) {
    throw new Error("Ingresa una categoría válida.");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Ingresa un precio válido.");
  }
  if (!owner) {
    throw new Error("No se encontró el especialista dueño de esta tienda.");
  }

  const madeToOrder = Boolean(input.madeToOrder);
  const stockQuantity = madeToOrder
    ? 0
    : Math.max(0, Math.round(Number(input.stockQuantity ?? 0)));
  const now = new Date().toISOString();
  const product = normalizeShopProductOwnership(
    {
      id: `shop-${slugifyShopValue(name)}-${randomUUID().slice(0, 8)}`,
      name,
      category,
      specialistId: owner.id,
      specialistName: owner.name,
      storeId: ownerId,
      storeName: owner.name,
      shortDescription:
        input.shortDescription?.trim() ||
        input.description?.trim() ||
        "Producto agregado desde administración.",
      description:
        input.description?.trim() ||
        input.shortDescription?.trim() ||
        "Producto agregado desde administración de tienda.",
      price: {
        amount: Number(amount.toFixed(2)),
        currency: input.price?.currency?.trim() || "USD",
      },
      sku:
        input.sku?.trim() ||
        buildShopSku({
          name,
          category,
          specialistId: owner.id,
        }),
      status: normalizeShopProductStatus(input.status),
      imageUrl: input.imageUrl?.trim() ?? "",
      imageUrls: input.imageUrls ?? [],
      artwork: input.artwork?.trim() || inferShopArtwork(category),
      badge: input.badge?.trim() || "Nuevo",
      featured: input.featured ?? false,
      stockLabel: buildShopStockLabel(stockQuantity, madeToOrder),
      stockQuantity,
      madeToOrder,
      tags: normalizeShopTags(input.tags),
      createdAt: now,
      updatedAt: now,
    },
    owner.id,
    owner.name,
  );

  await upsertShopProductOverride(product);
  void insertShopProductAuditLog(
    product.id,
    auditMeta?.actorType ?? "specialist",
    auditMeta?.actorId ?? owner.id,
    `shop_product.created`,
    buildProductAuditPayload(
      "CREATED",
      "created",
      null,
      product,
      auditMeta?.source ?? "specialist",
      auditMeta?.actorId ?? owner.id,
    ),
  );
  return product;
}

export async function updateShopProduct(
  productId: string,
  input: UpdateShopProductInput,
  managerScope?: { specialistProfileId?: string; isAdmin?: boolean },
  auditMeta?: ShopProductAuditMeta,
): Promise<ShopProduct> {
  if (!isDatabaseConfigured()) {
    const before = getShopDataMock().products.find((item) => item.id === productId) ?? null;
    const updated = updateShopProductMock(productId, input);
    const actorType = auditMeta?.actorType ?? "specialist";
    const actorId = auditMeta?.actorId ?? before?.specialistId ?? "system";
    const entries = collectShopProductAuditEntries(
      before,
      updated,
      auditMeta?.source ?? (actorType === "admin" ? "admin" : "specialist"),
      actorId,
    );
    for (const entry of entries) {
      void insertShopProductAuditLog(
        entry.entityId,
        entry.actorType,
        entry.actorId,
        entry.eventType,
        entry.payload,
      );
    }
    return updated;
  }

  const existing = (await listShopProducts()).find((item) => item.id === productId);
  if (!existing) {
    throw new Error("El producto no existe.");
  }

  const amount =
    input.price?.amount === undefined
      ? existing.price.amount
      : Number(input.price.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Ingresa un precio válido.");
  }
  if (
    managerScope &&
    !canManageShopProduct(existing, {
      userId: "",
      accountType: "specialist",
      specialistProfileId: managerScope.specialistProfileId,
      isAdmin: Boolean(managerScope.isAdmin),
    })
  ) {
    throw new Error(
      "No puedes editar un producto de otra tienda especialista.",
    );
  }

  const category = input.category?.trim() || existing.category;
  const madeToOrder = input.madeToOrder ?? existing.madeToOrder;
  const stockQuantity = madeToOrder
    ? 0
    : input.stockQuantity === undefined
      ? existing.stockQuantity
      : Math.max(0, Math.round(Number(input.stockQuantity)));
  const nextImageUrl = input.imageUrl?.trim() ?? existing.imageUrl;
  const nextImageUrls =
    input.imageUrls ??
    (input.imageUrl == null
      ? existing.imageUrls
      : normalizeShopImageUrls(nextImageUrl, existing.imageUrls).imageUrls);
  const updated: ShopProduct = normalizeShopProductOwnership(
    {
      ...existing,
      name: input.name?.trim() || existing.name,
      category,
      shortDescription:
        input.shortDescription?.trim() || existing.shortDescription,
      description: input.description?.trim() || existing.description,
      price: {
        amount: Number(amount.toFixed(2)),
        currency: input.price?.currency?.trim() || existing.price.currency,
      },
      sku:
        input.sku?.trim() ||
        buildShopSku({
          name: input.name?.trim() || existing.name,
          category,
          specialistId: existing.specialistId,
          productId: existing.id,
        }),
      status: normalizeShopProductStatus(input.status ?? existing.status),
      imageUrl: nextImageUrl,
      imageUrls: nextImageUrls,
      artwork:
        input.artwork?.trim() || existing.artwork || inferShopArtwork(category),
      badge: input.badge?.trim() || existing.badge,
      featured: input.featured ?? existing.featured,
      stockLabel: buildShopStockLabel(stockQuantity, madeToOrder),
      stockQuantity,
      madeToOrder,
      tags:
        input.tags === undefined
          ? existing.tags
          : normalizeShopTags(input.tags),
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    },
    existing.specialistId,
    existing.specialistName,
  );

  await upsertShopProductOverride(updated);
  const actorType = auditMeta?.actorType ?? "specialist";
  const actorId = auditMeta?.actorId ?? existing.specialistId;
  const entries = collectShopProductAuditEntries(
    existing,
    updated,
    auditMeta?.source ?? (actorType === "admin" ? "admin" : "specialist"),
    actorId,
  );
  for (const entry of entries) {
    void insertShopProductAuditLog(
      entry.entityId,
      entry.actorType,
      entry.actorId,
      entry.eventType,
      entry.payload,
    );
  }
  return updated;
}

export async function updateShopOrderStatus(
  orderId: string,
  input: UpdateShopOrderStatusInput,
  userId?: string,
): Promise<ShopOrder> {
  if (!isDatabaseConfigured()) {
    return updateShopOrderStatusMock(orderId, input, userId);
  }

  const status = input.status;
  if (!isShopOrderStatus(status)) {
    throw new Error("Selecciona un estado de orden válido.");
  }

  const user = await getDatabaseUser(userId);
  const scope = buildShopViewerScope(user, await isAdminUser(user.id));
  const currentOrders = await getShopOrders(user.id);
  const currentOrder = currentOrders.find((item) => item.id === orderId);
  if (!currentOrder || !canManageShopOrder(currentOrder, scope)) {
    throw new Error("La orden no existe.");
  }
  const result = await runQuery<ShopOrderRow>(
    `
      update shop_orders
      set status = $2,
          updated_at = now()
      where id = $1
        ${scope.isAdmin ? "" : "and specialist_id = $3"}
      returning
        id,
        user_id,
        order_code,
        status,
        created_at,
        specialist_id,
        specialist_name,
        store_id,
        store_name,
        delivery_address,
        notes,
        subtotal_amount,
        subtotal_currency,
        shipping_amount,
        shipping_currency,
        total_amount,
        total_currency,
        item_count
    `,
    scope.isAdmin
      ? [orderId, status]
      : [orderId, status, currentOrder.specialistId],
  );

  const row = result.rows[0];
  if (!row) {
    return updateShopOrderStatusMock(orderId, input, user.id);
  }

  const itemsResult = await runQuery<ShopOrderItemRow>(
    `
      select
        product_id,
        product_name,
        category,
        quantity,
        image_url,
        unit_price_amount,
        unit_price_currency,
        line_total_amount,
        line_total_currency
      from shop_order_items
      where order_id = $1
      order by created_at asc
    `,
    [row.id],
  );

  return mapShopOrderRows(row, itemsResult.rows);
}

export function getCourses(): Course[] {
  return getCoursesMock();
}

export function getAdminCourses(): Course[] {
  return getAdminCoursesMock();
}

export function getCourseById(courseId: string): Course | null {
  return getCourseByIdMock(courseId);
}

export function getAdminCourseById(courseId: string): Course | null {
  return getAdminCourseByIdMock(courseId);
}

function collectCourseAuditFields(before: Course | null, after: Course): Array<{
  fieldChanged: string;
  previousValue: unknown;
  newValue: unknown;
}> {
  if (!before) {
    return [
      { fieldChanged: "created", previousValue: null, newValue: after },
    ];
  }

  const fields: Array<[string, unknown, unknown]> = [
    ["title", before.title, after.title],
    ["subtitle", before.subtitle, after.subtitle],
    ["category", before.category, after.category],
    ["level", before.level, after.level],
    ["premium", before.premium, after.premium],
    ["featured", before.featured, after.featured],
    ["removable", before.removable, after.removable],
    ["estimatedHours", before.estimatedHours, after.estimatedHours],
    ["progressPercent", before.progressPercent, after.progressPercent],
    ["streakDays", before.streakDays, after.streakDays],
    ["hook", before.hook, after.hook],
    ["description", before.description, after.description],
    ["outcomes", before.outcomes, after.outcomes],
    ["coverImageUrl", before.coverImageUrl ?? null, after.coverImageUrl ?? null],
    ["status", before.status ?? "published", after.status ?? "published"],
    ["isActive", before.isActive ?? true, after.isActive ?? true],
    ["modules", before.modules, after.modules],
  ];

  return fields
    .filter(([, previousValue, newValue]) => JSON.stringify(previousValue) !== JSON.stringify(newValue))
    .map(([fieldChanged, previousValue, newValue]) => ({
      fieldChanged,
      previousValue,
      newValue,
    }));
}

async function recordCourseAudit(
  entityType: string,
  entityId: string,
  courseId: string,
  action: string,
  fieldChanged: string,
  previousValue: unknown,
  newValue: unknown,
  auditMeta: AdminAuditMeta,
  elementLabel?: string,
  courseName?: string | null,
): Promise<void> {
  await insertAdminEntityAuditLog(
    entityType,
    entityId,
    action,
    fieldChanged,
    previousValue,
    newValue,
    auditMeta,
    {
      courseId,
      elementLabel: elementLabel ?? entityType.replaceAll("_", " "),
      courseName: courseName ?? null,
    },
  );
}

export async function createCourse(
  input: Partial<Course>,
  auditMeta: AdminAuditMeta,
): Promise<Course> {
  const saved = upsertCourseMock(input.id?.trim() ?? null, {
    ...input,
    status: input.status ?? "draft",
    isActive: input.isActive ?? false,
  });

  await recordCourseAudit(
    "course",
    saved.id,
    saved.id,
    "CREATED",
    "created",
    null,
    saved,
    auditMeta,
    "Curso",
    saved.title,
  );
  return saved;
}

export async function updateCourse(
  courseId: string,
  input: Partial<Course>,
  auditMeta: AdminAuditMeta,
): Promise<Course> {
  const before = getAdminCourseByIdMock(courseId);
  if (!before) {
    throw new Error("El curso no existe.");
  }

  const saved = updateCourseMock(courseId, {
    ...input,
    updatedAt: new Date().toISOString(),
  });
  if (!saved) {
    throw new Error("El curso no existe.");
  }

  for (const change of collectCourseAuditFields(before, saved)) {
    await recordCourseAudit(
      "course",
      saved.id,
      saved.id,
      "UPDATED",
      change.fieldChanged,
      change.previousValue,
      change.newValue,
      auditMeta,
      "Curso",
      saved.title,
    );
  }

  return saved;
}

export async function archiveCourse(
  courseId: string,
  auditMeta: AdminAuditMeta,
): Promise<Course> {
  const before = getAdminCourseByIdMock(courseId);
  if (!before) {
    throw new Error("El curso no existe.");
  }

  const saved = archiveCourseMock(courseId);
  if (!saved) {
    throw new Error("El curso no existe.");
  }

  await recordCourseAudit(
    "course",
    courseId,
    courseId,
    "ARCHIVED",
    "status",
    before.status ?? "published",
    saved.status ?? "archived",
    auditMeta,
    "Curso",
    saved.title,
  );
  return saved;
}

export async function publishCourse(
  courseId: string,
  auditMeta: AdminAuditMeta,
): Promise<Course> {
  const before = getAdminCourseByIdMock(courseId);
  if (!before) {
    throw new Error("El curso no existe.");
  }

  const saved = setCoursePublicationMock(courseId, true);
  if (!saved) {
    throw new Error("El curso no existe.");
  }

  await recordCourseAudit(
    "course",
    courseId,
    courseId,
    "PUBLISHED",
    "status",
    before.status ?? "draft",
    saved.status ?? "published",
    auditMeta,
    "Curso",
    saved.title,
  );
  return saved;
}

export async function unpublishCourse(
  courseId: string,
  auditMeta: AdminAuditMeta,
): Promise<Course> {
  const before = getAdminCourseByIdMock(courseId);
  if (!before) {
    throw new Error("El curso no existe.");
  }

  const saved = setCoursePublicationMock(courseId, false);
  if (!saved) {
    throw new Error("El curso no existe.");
  }

  await recordCourseAudit(
    "course",
    courseId,
    courseId,
    "UPDATED",
    "status",
    before.status ?? "published",
    saved.status ?? "draft",
    auditMeta,
    "Curso",
    saved.title,
  );
  return saved;
}

export async function createCourseModule(
  courseId: string,
  input: Partial<CourseModule>,
  auditMeta: AdminAuditMeta,
): Promise<Course> {
  const before = getAdminCourseByIdMock(courseId);
  if (!before) {
    throw new Error("El curso no existe.");
  }

  const saved = upsertCourseModuleMock(courseId, null, input);
  if (!saved) {
    throw new Error("El curso no existe.");
  }

  const createdModule =
    saved.modules.find(
      (module) => !before.modules.some((previous) => previous.id === module.id),
    ) ??
    saved.modules.find(
      (module) =>
        module.title === (input.title?.trim() || "Módulo") &&
        module.order ===
          (Number.isFinite(input.order) ? Number(input.order) : before.modules.length + 1),
    ) ??
    saved.modules[saved.modules.length - 1] ??
    null;

  await recordCourseAudit(
    "course_module",
    createdModule?.id ?? courseId,
    courseId,
    "CREATED",
    "module",
    null,
    createdModule ?? input,
    auditMeta,
    "Módulo",
    before.title,
  );
  return saved;
}

export async function updateCourseModule(
  courseId: string,
  moduleId: string,
  input: Partial<CourseModule>,
  auditMeta: AdminAuditMeta,
): Promise<Course> {
  const before = getAdminCourseByIdMock(courseId);
  if (!before) {
    throw new Error("El curso no existe.");
  }
  const currentModule = before.modules.find((module) => module.id === moduleId);
  if (!currentModule) {
    throw new Error("El módulo no existe.");
  }

  const saved = upsertCourseModuleMock(courseId, moduleId, input);
  if (!saved) {
    throw new Error("El curso no existe.");
  }

  await recordCourseAudit(
    "course_module",
    currentModule.id,
    courseId,
    "UPDATED",
    "module",
    currentModule,
    saved.modules.find((module) => module.id === currentModule.id) ?? input,
    auditMeta,
    "Módulo",
    before.title,
  );
  return saved;
}

export async function deleteCourseModule(
  courseId: string,
  moduleId: string,
  auditMeta: AdminAuditMeta,
): Promise<Course> {
  const before = getAdminCourseByIdMock(courseId);
  if (!before) {
    throw new Error("El curso no existe.");
  }
  const currentModule = before.modules.find((module) => module.id === moduleId);
  if (!currentModule) {
    throw new Error("El módulo no existe.");
  }

  const saved = deleteCourseModuleMock(courseId, moduleId);
  if (!saved) {
    throw new Error("El curso no existe.");
  }

  await recordCourseAudit(
    "course_module",
    currentModule.id,
    courseId,
    "ARCHIVED",
    "module",
    currentModule,
    null,
    auditMeta,
    "Módulo",
    before.title,
  );
  return saved;
}

export async function createCourseLesson(
  courseId: string,
  moduleId: string,
  input: Partial<CourseLesson>,
  auditMeta: AdminAuditMeta,
): Promise<Course> {
  const before = getAdminCourseByIdMock(courseId);
  if (!before) {
    throw new Error("El curso no existe.");
  }
  const currentModule = before.modules.find((module) => module.id === moduleId);
  if (!currentModule) {
    throw new Error("El módulo no existe.");
  }

  const saved = upsertCourseLessonMock(courseId, moduleId, null, input);
  if (!saved) {
    throw new Error("El curso no existe.");
  }

  const createdLesson =
    saved.modules
      .find((module) => module.id === moduleId)
      ?.lessons.find(
        (lesson) =>
          !currentModule.lessons.some((previous) => previous.id === lesson.id),
      ) ??
    saved.modules.find((module) => module.id === moduleId)?.lessons.at(-1) ??
    null;

  await recordCourseAudit(
    "course_lesson",
    createdLesson?.id ?? courseId,
    courseId,
    "CREATED",
    "lesson",
    null,
    createdLesson ?? input,
    auditMeta,
    "Lección",
    before.title,
  );
  return saved;
}

export async function updateCourseLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
  input: Partial<CourseLesson>,
  auditMeta: AdminAuditMeta,
): Promise<Course> {
  const before = getAdminCourseByIdMock(courseId);
  if (!before) {
    throw new Error("El curso no existe.");
  }
  const currentLesson = before.modules
    .find((module) => module.id === moduleId)
    ?.lessons.find((lesson) => lesson.id === lessonId);
  if (!currentLesson) {
    throw new Error("La lección no existe.");
  }

  const saved = upsertCourseLessonMock(courseId, moduleId, lessonId, input);
  if (!saved) {
    throw new Error("El curso no existe.");
  }

  const updatedLesson =
    saved.modules
      .find((module) => module.id === moduleId)
      ?.lessons.find((lesson) => lesson.id === currentLesson.id) ?? input;

  await recordCourseAudit(
    "course_lesson",
    currentLesson.id,
    courseId,
    "UPDATED",
    "lesson",
    currentLesson,
    updatedLesson,
    auditMeta,
    "Lección",
    before.title,
  );
  return saved;
}

export async function deleteCourseLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
  auditMeta: AdminAuditMeta,
): Promise<Course> {
  const before = getAdminCourseByIdMock(courseId);
  if (!before) {
    throw new Error("El curso no existe.");
  }
  const currentLesson = before.modules
    .find((module) => module.id === moduleId)
    ?.lessons.find((lesson) => lesson.id === lessonId);
  if (!currentLesson) {
    throw new Error("La lección no existe.");
  }

  const saved = deleteCourseLessonMock(courseId, moduleId, lessonId);
  if (!saved) {
    throw new Error("El curso no existe.");
  }

  await recordCourseAudit(
    "course_lesson",
    currentLesson.id,
    courseId,
    "ARCHIVED",
    "lesson",
    currentLesson,
    null,
    auditMeta,
    "Lección",
    before.title,
  );
  return saved;
}

export function listCourseResources(courseId?: string): CourseResourceRecord[] {
  return mockCourseResourceStore
    .filter((resource) => (courseId ? resource.courseId === courseId : true))
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function upsertCourseResource(
  courseId: string,
  input: Partial<CourseResourceRecord>,
  auditMeta: AdminAuditMeta,
): Promise<CourseResourceRecord> {
  const course = getAdminCourseByIdMock(courseId);
  const record: CourseResourceRecord = {
    id: input.id?.trim() || `resource-${randomUUID()}`,
    courseId,
    moduleId: input.moduleId?.trim() || null,
    lessonId: input.lessonId?.trim() || null,
    title: input.title?.trim() || "Recurso",
    kind: input.kind?.trim() || "link",
    description: input.description?.trim() || "",
    url: input.url?.trim() || "",
    status: input.status ?? "draft",
    isActive: input.isActive ?? true,
    createdAt: input.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingIndex = mockCourseResourceStore.findIndex((item) => item.id === record.id);
  const previousRecord = existingIndex >= 0 ? mockCourseResourceStore[existingIndex] : null;
  if (existingIndex >= 0) {
    mockCourseResourceStore[existingIndex] = record;
  } else {
    mockCourseResourceStore.unshift(record);
  }

  await recordCourseAudit(
    "course_resource",
    courseId,
    courseId,
    existingIndex >= 0 ? "UPDATED" : "CREATED",
    "resource",
    previousRecord,
    record,
    auditMeta,
    "Recurso",
    course?.title ?? null,
  );
  return record;
}

export async function deleteCourseResource(
  courseId: string,
  resourceId: string,
  auditMeta: AdminAuditMeta,
): Promise<void> {
  const course = getAdminCourseByIdMock(courseId);
  const index = mockCourseResourceStore.findIndex((item) => item.id === resourceId);
  if (index < 0) {
    throw new Error("El recurso no existe.");
  }

  const [removed] = mockCourseResourceStore.splice(index, 1);
  await recordCourseAudit(
    "course_resource",
    removed.id,
    courseId,
    "ARCHIVED",
    "resource",
    removed,
    null,
    auditMeta,
    "Recurso",
    course?.title ?? null,
  );
}

export async function listLibraryPdfs(): Promise<LibraryPdfRecord[]> {
  if (isDatabaseConfigured()) {
    return listLibraryPdfsDatabase();
  }

  return mockLibraryPdfStore
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getLibraryPdfById(pdfId: string): Promise<LibraryPdfRecord | null> {
  const normalizedId = pdfId.trim();
  if (!normalizedId) {
    return null;
  }

  if (isDatabaseConfigured()) {
    return getLibraryPdfDatabase(normalizedId);
  }

  return (
    mockLibraryPdfStore.find((item) => item.id === normalizedId) ?? null
  );
}

export async function upsertLibraryPdf(
  input: Partial<LibraryPdfRecord>,
  auditMeta: AdminAuditMeta,
): Promise<LibraryPdfRecord> {
  if (isDatabaseConfigured()) {
    return upsertLibraryPdfDatabase(input, auditMeta);
  }

  const course = input.courseId ? getAdminCourseByIdMock(input.courseId) : null;
  const record: LibraryPdfRecord = {
    id: input.id?.trim() || `pdf-${randomUUID()}`,
    title: input.title?.trim() || "PDF",
    description: input.description?.trim() || "",
    fileUrl: input.fileUrl?.trim() || "",
    courseId: input.courseId?.trim() || null,
    moduleId: input.moduleId?.trim() || null,
    lessonId: input.lessonId?.trim() || null,
    category: input.category?.trim() || "General",
    pageCount: Number.isFinite(input.pageCount) ? Number(input.pageCount) : 0,
    status: input.status ?? "draft",
    isActive: input.isActive ?? true,
    createdAt: input.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingIndex = mockLibraryPdfStore.findIndex((item) => item.id === record.id);
  const previousRecord = existingIndex >= 0 ? mockLibraryPdfStore[existingIndex] : null;
  if (existingIndex >= 0) {
    mockLibraryPdfStore[existingIndex] = record;
  } else {
    mockLibraryPdfStore.unshift(record);
  }

  await recordCourseAudit(
    "library_pdf",
    record.id,
    record.courseId ?? record.id,
    existingIndex >= 0 ? "UPDATED" : "CREATED",
    "library_pdf",
    previousRecord,
    record,
    auditMeta,
    "PDF",
    course?.title ?? null,
  );
  return record;
}

export async function deleteLibraryPdf(
  pdfId: string,
  auditMeta: AdminAuditMeta,
): Promise<void> {
  if (isDatabaseConfigured()) {
    await deleteLibraryPdfDatabase(pdfId, auditMeta);
    return;
  }

  const index = mockLibraryPdfStore.findIndex((item) => item.id === pdfId);
  if (index < 0) {
    throw new Error("El PDF no existe.");
  }

  const [removed] = mockLibraryPdfStore.splice(index, 1);
  const course = removed.courseId ? getAdminCourseByIdMock(removed.courseId) : null;
  await recordCourseAudit(
    "library_pdf",
    removed.id,
    removed.courseId ?? removed.id,
    "ARCHIVED",
    "library_pdf",
    removed,
    null,
    auditMeta,
    "PDF",
    course?.title ?? null,
  );
}

async function listLibraryPdfsDatabase(): Promise<LibraryPdfRecord[]> {
  const result = await query<LibraryPdfRow>(
    `
      select
        pdf_id,
        title,
        description,
        file_url,
        course_id,
        module_id,
        lesson_id,
        category,
        page_count,
        status,
        is_active,
        created_at,
        updated_at
      from library_pdfs
      order by updated_at desc
    `,
  );

  return result.rows.map(mapLibraryPdfRow);
}

async function getLibraryPdfDatabase(pdfId: string): Promise<LibraryPdfRecord | null> {
  const normalizedId = pdfId.trim();
  if (!normalizedId) {
    return null;
  }

  const result = await query<LibraryPdfRow>(
    `
      select
        pdf_id,
        title,
        description,
        file_url,
        course_id,
        module_id,
        lesson_id,
        category,
        page_count,
        status,
        is_active,
        created_at,
        updated_at
      from library_pdfs
      where pdf_id = $1
      limit 1
    `,
    [normalizedId],
  );

  return result.rows[0] ? mapLibraryPdfRow(result.rows[0]) : null;
}

async function upsertLibraryPdfDatabase(
  input: Partial<LibraryPdfRecord>,
  auditMeta: AdminAuditMeta,
): Promise<LibraryPdfRecord> {
  const normalizedId = input.id?.trim() || `pdf-${randomUUID()}`;
  const previous = await getLibraryPdfDatabase(normalizedId);
  const record: LibraryPdfRecord = {
    id: normalizedId,
    title: input.title?.trim() || "PDF",
    description: input.description?.trim() || "",
    fileUrl: input.fileUrl?.trim() || "",
    courseId: input.courseId?.trim() || null,
    moduleId: input.moduleId?.trim() || null,
    lessonId: input.lessonId?.trim() || null,
    category: input.category?.trim() || "General",
    pageCount: Number.isFinite(input.pageCount) ? Number(input.pageCount) : 0,
    status: input.status ?? "draft",
    isActive: input.isActive ?? true,
    createdAt: previous?.createdAt ?? input.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await query<LibraryPdfRow>(
    `
      insert into library_pdfs (
        pdf_id,
        title,
        description,
        file_url,
        course_id,
        module_id,
        lesson_id,
        category,
        page_count,
        status,
        is_active,
        created_at,
        updated_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      on conflict (pdf_id) do update set
        title = excluded.title,
        description = excluded.description,
        file_url = excluded.file_url,
        course_id = excluded.course_id,
        module_id = excluded.module_id,
        lesson_id = excluded.lesson_id,
        category = excluded.category,
        page_count = excluded.page_count,
        status = excluded.status,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at
      returning
        pdf_id,
        title,
        description,
        file_url,
        course_id,
        module_id,
        lesson_id,
        category,
        page_count,
        status,
        is_active,
        created_at,
        updated_at
    `,
    [
      record.id,
      record.title,
      record.description,
      record.fileUrl,
      record.courseId,
      record.moduleId,
      record.lessonId,
      record.category,
      record.pageCount,
      record.status,
      record.isActive,
      record.createdAt,
      record.updatedAt,
    ],
  );

  const saved = mapLibraryPdfRow(result.rows[0]);
  const course = saved.courseId ? getAdminCourseByIdMock(saved.courseId) : null;
  const action = previous ? "UPDATED" : "CREATED";
  await recordCourseAudit(
    "library_pdf",
    saved.id,
    saved.courseId ?? saved.id,
    action,
    previous ? "updated" : "created",
    previous,
    saved,
    auditMeta,
    "PDF",
    course?.title ?? null,
  );
  return saved;
}

async function deleteLibraryPdfDatabase(
  pdfId: string,
  auditMeta: AdminAuditMeta,
): Promise<void> {
  const previous = await getLibraryPdfDatabase(pdfId);
  if (!previous) {
    throw new Error("El PDF no existe.");
  }

  await query(
    `
      update library_pdfs
      set status = 'archived',
          is_active = false,
          updated_at = now()
      where pdf_id = $1
    `,
    [previous.id],
  );

  const course = previous.courseId ? getAdminCourseByIdMock(previous.courseId) : null;
  await recordCourseAudit(
    "library_pdf",
    previous.id,
    previous.courseId ?? previous.id,
    "ARCHIVED",
    "status",
    previous.status ?? "draft",
    "archived",
    auditMeta,
    "PDF",
    course?.title ?? null,
  );
}

export async function getHomePayload(userId?: string): Promise<HomePayload> {
  if (!isDatabaseConfigured()) {
    return getHomePayloadMock(userId);
  }

  const user = await getDatabaseUser(userId);
  const bookings = await getBookings(user.id);
  const upcoming = bookings.find(
    (booking) =>
      booking.status === "confirmed" || booking.status === "pending_payment",
  );
  const { cardOfTheDay, astrologicalEnergy } = buildDailyHomeContent(
    user.timezone,
  );

  return {
    welcomeTitle:
      user.firstName.trim().length === 0
        ? "Hola"
        : `Hola, ${user.firstName.trim()}`,
    welcomeSubtitle:
      "Tu espacio diario para tarot, astrología, consultas y contenido guiado.",
    cardOfTheDay,
    astrologicalEnergy,
    quickActions,
    upcomingBooking: upcoming
      ? {
          id: upcoming.id,
          specialistName: upcoming.specialistName,
          serviceName: upcoming.serviceName,
          scheduledAt: upcoming.scheduledAt,
          status: upcoming.status,
        }
      : null,
    featuredMessage:
      "La mejor primera versión prioriza agenda, contenido diario y una navegación clara por módulo.",
  };
}

export async function getBootstrap(userId?: string): Promise<AppBootstrap> {
  if (!isDatabaseConfigured()) {
    return getBootstrapMock(userId);
  }

  const user = await getDatabaseUser(userId);
  await recordBadgeAction(user.id, {
    actionKey: "app_opened",
  });
  const services = await listServices();
  const specialistScopedServices =
    user.accountType === "specialist" &&
    Boolean(user.specialistProfileId?.trim())
      ? services.filter((service) =>
          service.specialistIds.includes(
            user.specialistProfileId?.trim() ?? "",
          ),
        )
      : services;

  return {
    app: {
      name: "Lo Renaciente",
      tagline: "Autoconocimiento, guía y consultas en un mismo lugar.",
      market: "Perú / Latam",
      timezone: user.timezone,
    },
    user,
    home: await getHomePayload(user.id),
    plans: getPlans(),
    subscription: await getCurrentSubscription(user.id),
    payments: getPaymentsConfigBilling(),
    services: specialistScopedServices,
    specialists: getSpecialists(),
    courses: getCourses(),
    shop: await getShopData(user.id),
    bookings: await getBookings(user.id),
    admin: getAdminSummary(),
    badges: await getUserBadgeProfile(user.id),
  };
}
