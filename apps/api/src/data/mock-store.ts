import { randomUUID } from "node:crypto";

import {
  getUserBadgeProfile,
  recordBadgeAction,
  type UserBadgeProfile,
} from "./badge-store.js";
import { buildDailyHomeContent } from "./home-daily.js";
import {
  buildShopSku,
  buildShopOrderDraft,
  buildShopStoreId,
  buildShopStoreName,
  buildShopStockLabel,
  buildShopViewerScope,
  canManageShopOrder,
  filterShopOrdersForScope,
  filterShopProductsForScope,
  normalizeShopImageUrls,
  normalizeShopProductStatus,
  normalizeShopProductOwnership,
} from "./shop-domain.js";

export type SessionMode = "chat" | "audio" | "video";
export type AccountType = "client" | "specialist";
export type BookingStatus =
  | "confirmed"
  | "pending_payment"
  | "completed"
  | "cancelled";

export interface Money {
  amount: number;
  currency: string;
}

export interface Plan {
  id: string;
  name: string;
  tier: "free" | "premium";
  priceMonthly: number;
  currency: string;
  isPopular: boolean;
  features: string[];
  sessionMessageLimit: number | null;
  consultationAccess: string[];
}

export interface NatalChart {
  subjectName: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  city: string;
  state: string;
  country: string;
  timeZoneId: string;
  utcOffset: string;
  latitude: number | null;
  longitude: number | null;
}

export interface UserPreferences {
  focusAreas: string[];
  preferredSessionModes: SessionMode[];
  receivesPush: boolean;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  avatarUrl: string;
  location: string;
  timezone: string;
  zodiacSign: string;
  planId: string;
  accountType: AccountType;
  specialistProfileId?: string;
  roles?: string[];
  natalChart: NatalChart;
  preferences: UserPreferences;
}

export interface AdminManagedUserRecord {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  planId: string;
  profileCompleted: boolean;
  createdAt: string;
  roles: Array<"admin" | "specialist">;
  accountType: AccountType;
  access: string[];
}

export interface AdminManagedUserInput {
  firstName?: string;
  lastName?: string;
  nickname?: string;
  email?: string;
  phoneNumber?: string;
  planId?: string;
  accountType?: AccountType;
  roles?: Array<"admin" | "specialist">;
  profileCompleted?: boolean;
}

export interface DailyCard {
  title: string;
  cardName: string;
  message: string;
  ritual: string;
  imageUrl: string;
}

export interface AstrologicalEnergy {
  title: string;
  summary: string;
  advice: string;
  intensity: string;
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  type: "content" | "booking" | "subscription" | "profile";
}

export interface ServiceOffer {
  id: string;
  name: string;
  category: string;
  description: string;
  durationMinutes: number;
  price: Money;
  deliveryModes: SessionMode[];
  premiumIncluded: boolean;
  specialistIds: string[];
  isActive: boolean;
  isVisible: boolean;
}

export interface Specialist {
  id: string;
  name: string;
  publicName?: string;
  headline: string;
  specialties: string[];
  bio: string;
  avatarUrl?: string;
  yearsExperience: number;
  sessionModes: SessionMode[];
  languages: string[];
  rating: number;
  reviewCount: number;
  featured: boolean;
  nextAvailableAt: string;
  isActive: boolean;
  isPublic: boolean;
}

export interface CourseLesson {
  id: string;
  title: string;
  format: string;
  durationMinutes: number;
  prompt: string;
  content?: string;
  resourceUrl?: string;
  order?: number;
  status?: "draft" | "published" | "archived";
  isActive?: boolean;
}

export interface CourseModule {
  id: string;
  title: string;
  summary: string;
  durationMinutes: number;
  lessons: CourseLesson[];
  order?: number;
  status?: "draft" | "published" | "archived";
  isActive?: boolean;
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  level: string;
  premium: boolean;
  featured: boolean;
  removable: boolean;
  estimatedHours: number;
  moduleCount: number;
  lessonCount: number;
  progressPercent: number;
  streakDays: number;
  hook: string;
  description: string;
  outcomes: string[];
  modules: CourseModule[];
  coverImageUrl?: string;
  status?: "draft" | "published" | "archived";
  isActive?: boolean;
  updatedAt?: string;
}

export interface Booking {
  id: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  specialistId: string;
  specialistName: string;
  scheduledAt: string;
  mode: SessionMode;
  status: BookingStatus;
  price: Money;
  notes: string;
}

export type ShopOrderStatus = "pending" | "confirmed" | "preparing" | "shipped";
export type ShopProductStatus = "active" | "draft" | "hidden" | "archived";

export interface ShopProduct {
  id: string;
  name: string;
  category: string;
  specialistId: string;
  specialistName: string;
  storeId: string;
  storeName: string;
  shortDescription: string;
  description: string;
  price: Money;
  sku: string;
  status: ShopProductStatus;
  imageUrl: string;
  imageUrls: string[];
  artwork: string;
  badge: string;
  featured: boolean;
  stockLabel: string;
  stockQuantity: number;
  madeToOrder: boolean;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateShopProductInput {
  name?: string;
  category?: string;
  shortDescription?: string;
  description?: string;
  price?: Partial<Money>;
  sku?: string;
  status?: ShopProductStatus;
  imageUrl?: string;
  imageUrls?: string[];
  artwork?: string;
  badge?: string;
  featured?: boolean;
  stockQuantity?: number;
  madeToOrder?: boolean;
  tags?: string[];
}

export interface UpdateShopProductInput {
  name?: string;
  category?: string;
  shortDescription?: string;
  description?: string;
  price?: Partial<Money>;
  sku?: string;
  status?: ShopProductStatus;
  imageUrl?: string;
  imageUrls?: string[];
  artwork?: string;
  badge?: string;
  featured?: boolean;
  stockQuantity?: number;
  madeToOrder?: boolean;
  tags?: string[];
}

export interface UpdateShopOrderStatusInput {
  status?: ShopOrderStatus;
}

export interface ShopOrderItem {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  imageUrl: string;
  unitPrice: Money;
  lineTotal: Money;
}

export interface ShopOrder {
  id: string;
  userId: string;
  orderCode: string;
  status: ShopOrderStatus;
  createdAt: string;
  specialistId: string;
  specialistName: string;
  storeId: string;
  storeName: string;
  deliveryAddress: string;
  notes: string;
  subtotal: Money;
  shipping: Money;
  total: Money;
  itemCount: number;
  items: ShopOrderItem[];
}

export interface ShopData {
  title: string;
  subtitle: string;
  featuredNote: string;
  supportNote: string;
  currency: string;
  products: ShopProduct[];
  orders: ShopOrder[];
}

export interface Subscription {
  planId: string;
  planName: string;
  status: "active" | "inactive" | "trial";
  renewsAt: string | null;
  platform: "ios" | "android" | "web";
  billingProvider: "app_store" | "play_store" | "mercado_pago";
  entitlements: string[];
}

export interface PaymentsConfig {
  consultationProvider: string;
  premiumProvider: string;
  supportedMethods: string[];
  notes: string[];
}

export interface AdminSummary {
  activeUsers: number;
  premiumSubscribers: number;
  monthlyBookings: number;
  activeSpecialists: number;
  openIncidents: number;
}

export interface BookingSummary {
  id: string;
  specialistName: string;
  serviceName: string;
  scheduledAt: string;
  status: BookingStatus;
}

export interface HomePayload {
  welcomeTitle: string;
  welcomeSubtitle: string;
  cardOfTheDay: DailyCard;
  astrologicalEnergy: AstrologicalEnergy;
  quickActions: QuickAction[];
  upcomingBooking: BookingSummary | null;
  featuredMessage: string;
}

export interface AppBootstrap {
  app: {
    name: string;
    tagline: string;
    market: string;
    timezone: string;
  };
  user: UserProfile;
  home: HomePayload;
  plans: Plan[];
  subscription: Subscription;
  payments: PaymentsConfig;
  services: ServiceOffer[];
  specialists: Specialist[];
  courses: Course[];
  shop: ShopData;
  bookings: Booking[];
  admin: AdminSummary;
  badges: UserBadgeProfile;
}

export interface CreateBookingInput {
  specialistId?: string;
  serviceId?: string;
  scheduledAt?: string;
  mode?: SessionMode;
  notes?: string;
}

export interface UpdateBookingInput {
  scheduledAt?: string;
  mode?: SessionMode;
  notes?: string;
  status?: BookingStatus;
  cancellationReason?: string;
  rescheduleReason?: string;
}

export interface UpdateUserProfileInput {
  firstName?: string;
  lastName?: string;
  nickname?: string;
  email?: string;
  avatarUrl?: string;
  location?: string;
  zodiacSign?: string;
  accountType?: AccountType;
  specialistProfileId?: string;
  natalChart?: Partial<NatalChart>;
  preferences?: Partial<UserPreferences>;
}

export interface CreateShopOrderItemInput {
  productId?: string;
  quantity?: number;
}

export interface CreateShopOrderInput {
  items?: CreateShopOrderItemInput[];
  deliveryAddress?: string;
  notes?: string;
}

export interface PhoneAuthStartInput {
  countryCode?: string;
  dialCode?: string;
  nationalNumber?: string;
}

export interface PhoneAuthStartResult {
  phoneNumber: string;
  expiresInSeconds: number;
  resendInSeconds: number;
  debugCode: string;
}

export interface PhoneAuthVerifyInput {
  phoneNumber?: string;
  code?: string;
}

export interface CompletePhoneProfileInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  location?: string;
  accountType?: AccountType;
  subjectName?: string;
  birthDate?: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  city?: string;
  state?: string;
  country?: string;
  timeZoneId?: string;
  utcOffset?: string;
  latitude?: number;
  longitude?: number;
  zodiacSign?: string;
}

export interface UpdateServiceOfferInput {
  name?: string;
  category?: string;
  description?: string;
  price?: Partial<Money>;
  durationMinutes?: number;
  isActive?: boolean;
  isVisible?: boolean;
}

export interface CreateServiceOfferInput {
  name?: string;
  category?: string;
  description?: string;
  price?: Partial<Money>;
  durationMinutes?: number;
  deliveryModes?: SessionMode[];
  premiumIncluded?: boolean;
  specialistIds?: string[];
  isActive?: boolean;
  isVisible?: boolean;
}

export interface UpdateSpecialistAdminInput {
  isActive?: boolean;
  isPublic?: boolean;
  publicName?: string;
  headline?: string;
  specialty?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface PhoneAuthSessionPayload {
  accessToken: string;
  refreshToken: string;
  phoneNumber: string;
  profileCompleted: boolean;
  user: UserProfile;
}

interface PhoneAuthIdentity {
  userId: string;
  phoneNumber: string;
  countryCode: string;
  dialCode: string;
  profileCompleted: boolean;
}

interface PhoneVerificationRecord {
  phoneNumber: string;
  code: string;
  countryCode: string;
  dialCode: string;
  expiresAt: number;
  attemptsRemaining: number;
}

interface PhoneAuthSessionRecord {
  accessToken: string;
  refreshToken: string;
  userId: string;
  phoneNumber: string;
  expiresAt: number;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    tier: "free",
    priceMonthly: 0,
    currency: "USD",
    isPopular: false,
    features: [
      "Carta del día",
      "Energía astrológica básica",
      "Agenda limitada",
      "Chat con límite mensual",
    ],
    sessionMessageLimit: 20,
    consultationAccess: ["tarot", "astrología"],
  },
  {
    id: "premium",
    name: "Premium",
    tier: "premium",
    priceMonthly: 14.99,
    currency: "USD",
    isPopular: true,
    features: [
      "Lectura diaria ampliada",
      "Astrología personalizada",
      "Cursos premium",
      "Chat ilimitado",
      "Acceso a especialistas avanzados",
    ],
    sessionMessageLimit: null,
    consultationAccess: [
      "tarot",
      "astrología",
      "numerología",
      "reiki",
      "diseños humanos",
      "feng shui",
    ],
  },
];

const services: ServiceOffer[] = [
  {
    id: "service-tarot",
    name: "Lectura de tarot terapéutico",
    category: "Tarot",
    description:
      "Sesión enfocada en claridad emocional, decisiones y cierres de ciclo.",
    durationMinutes: 45,
    price: { amount: 32, currency: "USD" },
    deliveryModes: ["chat", "video"],
    premiumIncluded: false,
    specialistIds: ["spec-amaya", "spec-lorena"],
    isActive: true,
    isVisible: true,
  },
  {
    id: "service-tarot-love",
    name: "Tirada de vínculos y amor",
    category: "Tarot",
    description:
      "Lectura enfocada en relaciones, dinámicas afectivas y claridad vincular.",
    durationMinutes: 40,
    price: { amount: 30, currency: "USD" },
    deliveryModes: ["chat", "video"],
    premiumIncluded: false,
    specialistIds: ["spec-amaya", "spec-lucia"],
    isActive: true,
    isVisible: true,
  },
  {
    id: "service-tarot-cycle",
    name: "Tirada de ciclo y decisiones",
    category: "Tarot",
    description:
      "Sesión para ordenar procesos, cierres, aperturas y decisiones de corto plazo.",
    durationMinutes: 50,
    price: { amount: 36, currency: "USD" },
    deliveryModes: ["audio", "video"],
    premiumIncluded: false,
    specialistIds: ["spec-lucia"],
    isActive: true,
    isVisible: true,
  },
  {
    id: "service-astro",
    name: "Astrología natal personalizada",
    category: "Astrología",
    description:
      "Lectura de carta natal con foco en identidad, relaciones y timing.",
    durationMinutes: 60,
    price: { amount: 48, currency: "USD" },
    deliveryModes: ["audio", "video"],
    premiumIncluded: false,
    specialistIds: ["spec-elian"],
    isActive: true,
    isVisible: true,
  },
  {
    id: "service-numerologia",
    name: "Consulta de numerología",
    category: "Numerología",
    description:
      "Interpretación de ciclos, talentos y aprendizajes por vibración numérica.",
    durationMinutes: 40,
    price: { amount: 29, currency: "USD" },
    deliveryModes: ["chat", "audio"],
    premiumIncluded: false,
    specialistIds: ["spec-mila", "spec-lorena"],
    isActive: true,
    isVisible: true,
  },
  {
    id: "service-numerologia-mapa",
    name: "Mapa numerológico personal",
    category: "Numerología",
    description:
      "Lectura de sendero de vida, expresión, alma, personalidad, desafíos y pináculos.",
    durationMinutes: 60,
    price: { amount: 42, currency: "USD" },
    deliveryModes: ["audio", "video"],
    premiumIncluded: false,
    specialistIds: ["spec-mila", "spec-noa"],
    isActive: true,
    isVisible: true,
  },
  {
    id: "service-numerologia-year",
    name: "Año personal y ciclos",
    category: "Numerología",
    description:
      "Sesión centrada en año personal, mes personal, timing y decisiones del periodo.",
    durationMinutes: 35,
    price: { amount: 26, currency: "USD" },
    deliveryModes: ["chat", "audio"],
    premiumIncluded: false,
    specialistIds: ["spec-mila", "spec-noa"],
    isActive: true,
    isVisible: true,
  },
  {
    id: "service-numerologia-compat",
    name: "Compatibilidad numerológica",
    category: "Numerología",
    description:
      "Análisis de afinidades, tensiones y acuerdos entre dos perfiles numerológicos.",
    durationMinutes: 50,
    price: { amount: 38, currency: "USD" },
    deliveryModes: ["audio", "video"],
    premiumIncluded: false,
    specialistIds: ["spec-noa"],
    isActive: true,
    isVisible: true,
  },
  {
    id: "service-campus",
    name: "Campus de cursos guiados",
    category: "Contenido",
    description:
      "Acceso continuo a rutas de aprendizaje, prácticas guiadas y material accionable.",
    durationMinutes: 0,
    price: { amount: 0, currency: "USD" },
    deliveryModes: ["chat"],
    premiumIncluded: true,
    specialistIds: [],
    isActive: true,
    isVisible: true,
  },
];

const specialists: Specialist[] = [
  {
    id: "spec-amaya",
    name: "Amaya Rivas",
    headline: "Tarot terapéutico y lectura intuitiva",
    specialties: ["Tarot", "Procesos emocionales", "Rituales de cierre"],
    bio: "Acompaña procesos de cambio con tarot, escucha activa y trabajo simbólico.",
    yearsExperience: 8,
    sessionModes: ["chat", "video"],
    languages: ["es", "pt"],
    rating: 4.9,
    reviewCount: 128,
    featured: true,
    nextAvailableAt: "2026-03-24T19:00:00-03:00",
    isActive: true,
    isPublic: true,
  },
  {
    id: "spec-elian",
    name: "Elian Duarte",
    headline: "Astrología natal, sinastría y ciclos",
    specialties: ["Astrología natal", "Sinastría", "Revolución solar"],
    bio: "Trabaja con mapa natal y tránsitos para ordenar decisiones y tiempos.",
    yearsExperience: 11,
    sessionModes: ["audio", "video"],
    languages: ["es", "en"],
    rating: 4.8,
    reviewCount: 96,
    featured: true,
    nextAvailableAt: "2026-03-28T18:30:00-03:00",
    isActive: true,
    isPublic: true,
  },
  {
    id: "spec-lucia",
    name: "Lucía Beltrán",
    headline: "Tarot evolutivo, vínculos y elecciones",
    specialties: ["Tarot", "Vínculos", "Tarot de Marsella"],
    bio: "Integra tarot simbólico con preguntas concretas para ordenar decisiones y vínculos.",
    yearsExperience: 9,
    sessionModes: ["audio", "video"],
    languages: ["es"],
    rating: 4.9,
    reviewCount: 84,
    featured: true,
    nextAvailableAt: "2026-03-25T20:00:00-03:00",
    isActive: true,
    isPublic: true,
  },
  {
    id: "spec-lorena",
    name: "Lorena Domínguez",
    headline: "Tarot intuitivo, numerología y claridad de decisiones",
    specialties: ["Tarot", "Numerología", "Lectura simbólica"],
    bio: "Combina tarot, numerología y lectura simbólica para orientar decisiones sin ruido.",
    yearsExperience: 7,
    sessionModes: ["chat", "video"],
    languages: ["es"],
    rating: 4.8,
    reviewCount: 74,
    featured: true,
    nextAvailableAt: "2026-03-29T18:00:00-03:00",
    isActive: true,
    isPublic: true,
  },
  {
    id: "spec-mila",
    name: "Mila Ortega",
    headline: "Numerología aplicada a relaciones y propósito",
    specialties: ["Numerología", "Compatibilidad", "Ciclos personales"],
    bio: "Ayuda a leer patrones vitales desde la numerología contemporánea.",
    yearsExperience: 6,
    sessionModes: ["chat", "audio"],
    languages: ["es"],
    rating: 4.7,
    reviewCount: 61,
    featured: false,
    nextAvailableAt: "2026-03-26T17:00:00-03:00",
    isActive: true,
    isPublic: true,
  },
  {
    id: "spec-noa",
    name: "Noa Ferrer",
    headline: "Numerología pitagórica, ciclos y lectura de nombre",
    specialties: [
      "Numerología pitagórica",
      "Año personal",
      "Lectura de nombre natal",
    ],
    bio: "Trabaja con números nucleares, periodos, pináculos y compatibilidad.",
    yearsExperience: 7,
    sessionModes: ["audio", "video"],
    languages: ["es", "en"],
    rating: 4.8,
    reviewCount: 47,
    featured: true,
    nextAvailableAt: "2026-03-27T18:00:00-03:00",
    isActive: true,
    isPublic: true,
  },
];

const courseDraftStatus = "draft" as const;
const coursePublishedStatus = "published" as const;
const courseArchivedStatus = "archived" as const;

let courses: Course[] = [
  {
    id: "course-tarot-sin-ruido",
    title: "Tarot sin ruido",
    subtitle: "Intuición, símbolo y decisiones sin respuestas literales",
    category: "Tarot",
    level: "Inicial",
    premium: false,
    featured: true,
    removable: true,
    estimatedHours: 3.5,
    moduleCount: 4,
    lessonCount: 12,
    progressPercent: 28,
    streakDays: 4,
    hook: "Una ruta corta, elegante y muy práctica para que el tarot deje de sentirse confuso y empiece a darte claridad accionable.",
    description:
      "Este curso cambia la lógica de 'decir el futuro' por lectura simbólica, foco emocional y pequeñas decisiones concretas después de cada tirada.",
    outcomes: [
      "Aprender a formular preguntas que abren lectura útil.",
      "Leer arcanos sin depender de palabras clave rígidas.",
      "Cerrar cada tirada con una acción observable en tu semana.",
    ],
    modules: [
      {
        id: "course-tarot-sin-ruido-m1",
        title: "Bajar el ruido mental",
        summary:
          "Cómo entrar al tarot sin ansiedad por acertar y sin buscar respuestas literales.",
        durationMinutes: 48,
        order: 1,
        status: "published",
        isActive: true,
        lessons: [
          {
            id: "course-tarot-sin-ruido-m1-l1",
            title: "La pregunta que abre símbolo",
            format: "video",
            durationMinutes: 11,
            prompt:
              "Reescribe una pregunta cerrada como una pregunta de claridad.",
            order: 1,
            status: "published",
            isActive: true,
          },
          {
            id: "course-tarot-sin-ruido-m1-l2",
            title: "Intención antes de barajar",
            format: "audio",
            durationMinutes: 9,
            prompt:
              "Detecta si estás entrando desde ansiedad, curiosidad o decisión.",
            order: 2,
            status: "published",
            isActive: true,
          },
          {
            id: "course-tarot-sin-ruido-m1-l3",
            title: "La carta como espejo",
            format: "práctica",
            durationMinutes: 28,
            prompt:
              "Haz una lectura de una sola carta y anota tres reflejos del momento.",
            order: 3,
            status: "published",
            isActive: true,
          },
        ],
      },
      {
        id: "course-tarot-sin-ruido-m2",
        title: "Arcanos que sí cambian una decisión",
        summary:
          "Aprende a distinguir energía de fondo, advertencia y oportunidad.",
        durationMinutes: 56,
        order: 2,
        status: "published",
        isActive: true,
        lessons: [
          {
            id: "course-tarot-sin-ruido-m2-l1",
            title: "Mayores como bisagra",
            format: "video",
            durationMinutes: 14,
            prompt:
              "Ubica en qué área de tu vida ya se siente un cambio de etapa.",
            order: 1,
            status: "published",
            isActive: true,
          },
          {
            id: "course-tarot-sin-ruido-m2-l2",
            title: "Menores como clima real",
            format: "lectura",
            durationMinutes: 16,
            prompt:
              "Relaciona palo, número y contexto actual sin memorizar recetas.",
            order: 2,
            status: "published",
            isActive: true,
          },
          {
            id: "course-tarot-sin-ruido-m2-l3",
            title: "Integracion express",
            format: "práctica",
            durationMinutes: 26,
            prompt:
              "Resume una tirada en una frase de acción para las próximas 48 horas.",
            order: 3,
            status: "published",
            isActive: true,
          },
        ],
      },
      {
        id: "course-tarot-sin-ruido-m3",
        title: "Tirada de claridad",
        summary:
          "Una estructura simple de tres cartas para decisiones afectivas, laborales o creativas.",
        durationMinutes: 62,
        order: 3,
        status: "published",
        isActive: true,
        lessons: [
          {
            id: "course-tarot-sin-ruido-m3-l1",
            title: "Antes de la tirada",
            format: "audio",
            durationMinutes: 10,
            prompt:
              "Define que necesitas entender hoy y que no necesitas controlar.",
            order: 1,
            status: "published",
            isActive: true,
          },
          {
            id: "course-tarot-sin-ruido-m3-l2",
            title: "Presente, tension y salida",
            format: "video",
            durationMinutes: 18,
            prompt:
              "Aplica la estructura completa con un asunto real de tu semana.",
            order: 2,
            status: "published",
            isActive: true,
          },
          {
            id: "course-tarot-sin-ruido-m3-l3",
            title: "Chequeo de realidad",
            format: "práctica",
            durationMinutes: 34,
            prompt: "Convierte el mensaje final en una decisión verificable.",
            order: 3,
            status: "published",
            isActive: true,
          },
        ],
      },
      {
        id: "course-tarot-sin-ruido-m4",
        title: "Cierre y ritual mínimo",
        summary:
          "Salir de la lectura con dirección, no con dependencia del mazo.",
        durationMinutes: 44,
        order: 4,
        status: "published",
        isActive: true,
        lessons: [
          {
            id: "course-tarot-sin-ruido-m4-l1",
            title: "Ritual de cierre de 5 minutos",
            format: "audio",
            durationMinutes: 8,
            prompt: "Cierra energía y registra la acción elegida.",
            order: 1,
            status: "published",
            isActive: true,
          },
          {
            id: "course-tarot-sin-ruido-m4-l2",
            title: "Bitácora para no depender",
            format: "lectura",
            durationMinutes: 12,
            prompt:
              "Crea una bitácora con fecha, símbolos, acción y resultado.",
            order: 2,
            status: "published",
            isActive: true,
          },
          {
            id: "course-tarot-sin-ruido-m4-l3",
            title: "Sprint de integración",
            format: "práctica",
            durationMinutes: 24,
            prompt:
              "Sostiene siete días de lectura corta sin repetir la misma pregunta.",
            order: 3,
            status: "published",
            isActive: true,
          },
        ],
      },
    ],
  },
  {
    id: "course-arquitectura-del-destino",
    title: "Arquitectura del destino",
    subtitle: "Astrología y numerología para leer tu año sin improvisar",
    category: "Astro + Numerología",
    level: "Intermedio",
    premium: true,
    featured: false,
    removable: true,
    estimatedHours: 5.2,
    moduleCount: 5,
    lessonCount: 15,
    progressPercent: 8,
    streakDays: 1,
    hook: "Una experiencia con ritmo de serie corta: entiendes tus ciclos, reconoces tus ventanas y sales con mapa de acción trimestral.",
    description:
      "Cruza sendero de vida, año personal, Sol, Luna y tránsitos clave para pasar de intuición suelta a estrategia personal con timing.",
    outcomes: [
      "Ubicar tu tema rector del año con astrología y numerología.",
      "Detectar meses de avance, corrección y repliegue.",
      "Construir un tablero de decisiones por trimestre.",
    ],
    modules: [
      {
        id: "course-arquitectura-del-destino-m1",
        title: "Tu mapa rector",
        summary:
          "Junta Sol, Luna, Ascendente y sendero de vida para encontrar el patrón de fondo.",
        durationMinutes: 58,
        order: 1,
        status: "published",
        isActive: true,
        lessons: [
          {
            id: "course-arquitectura-del-destino-m1-l1",
            title: "Sol, Luna y Ascendente en lenguaje humano",
            format: "video",
            durationMinutes: 18,
            prompt:
              "Describe tu energía base, necesidad emocional y forma de entrar al mundo.",
            order: 1,
            status: "published",
            isActive: true,
          },
          {
            id: "course-arquitectura-del-destino-m1-l2",
            title: "Sendero de vida como columna",
            format: "lectura",
            durationMinutes: 12,
            prompt:
              "Relaciona tu número central con decisiones repetidas en tu historia.",
            order: 2,
            status: "published",
            isActive: true,
          },
          {
            id: "course-arquitectura-del-destino-m1-l3",
            title: "Síntesis del patrón",
            format: "práctica",
            durationMinutes: 28,
            prompt: "Redacta una frase directriz para tu año actual.",
            order: 3,
            status: "published",
            isActive: true,
          },
        ],
      },
      {
        id: "course-arquitectura-del-destino-m2",
        title: "Año personal y tránsitos",
        summary:
          "Cruza timing numerológico con el cielo para detectar presión, expansión y limpieza.",
        durationMinutes: 64,
        order: 2,
        status: "published",
        isActive: true,
        lessons: [
          {
            id: "course-arquitectura-del-destino-m2-l1",
            title: "Leer el año personal",
            format: "video",
            durationMinutes: 16,
            prompt:
              "Identifica el verbo central del año: sembrar, ordenar, exponer o cerrar.",
            order: 1,
            status: "published",
            isActive: true,
          },
          {
            id: "course-arquitectura-del-destino-m2-l2",
            title: "Tránsitos que activan decisión",
            format: "audio",
            durationMinutes: 14,
            prompt:
              "Anota qué áreas se mueven cuando el cielo acelera tu mapa natal.",
            order: 2,
            status: "published",
            isActive: true,
          },
          {
            id: "course-arquitectura-del-destino-m2-l3",
            title: "Cruce estrategico",
            format: "práctica",
            durationMinutes: 34,
            prompt:
              "Marca tus próximas tres ventanas de acción y una ventana de pausa.",
            order: 3,
            status: "published",
            isActive: true,
          },
        ],
      },
      {
        id: "course-arquitectura-del-destino-m3",
        title: "Trabajo, dinero y estructura",
        summary:
          "Cómo ordenar foco profesional, energía y recursos sin sobrecargarte.",
        durationMinutes: 52,
        order: 3,
        status: "published",
        isActive: true,
        lessons: [
          {
            id: "course-arquitectura-del-destino-m3-l1",
            title: "La casa profesional y tus números de expresión",
            format: "video",
            durationMinutes: 17,
            prompt:
              "Detecta dónde tu talento pide más visibilidad o más sistema.",
            order: 1,
            status: "published",
            isActive: true,
          },
          {
            id: "course-arquitectura-del-destino-m3-l2",
            title: "Prioridades del trimestre",
            format: "práctica",
            durationMinutes: 35,
            prompt:
              "Convierte tu lectura en tres decisiones concretas para ingresos y foco.",
            order: 2,
            status: "published",
            isActive: true,
          },
        ],
      },
      {
        id: "course-arquitectura-del-destino-m4",
        title: "Vínculos y energía relacional",
        summary:
          "Relaciona necesidades emocionales, compatibilidades y límites sanos.",
        durationMinutes: 49,
        order: 4,
        status: "published",
        isActive: true,
        lessons: [
          {
            id: "course-arquitectura-del-destino-m4-l1",
            title: "Tu forma de vincular",
            format: "audio",
            durationMinutes: 15,
            prompt:
              "Observa qué patrón repites cuando buscas seguridad o cercanía.",
            order: 1,
            status: "published",
            isActive: true,
          },
          {
            id: "course-arquitectura-del-destino-m4-l2",
            title: "Meses sensibles y meses de expansión",
            format: "lectura",
            durationMinutes: 14,
            prompt:
              "Distingue cuándo empujar y cuándo cuidar energía afectiva.",
            order: 2,
            status: "published",
            isActive: true,
          },
          {
            id: "course-arquitectura-del-destino-m4-l3",
            title: "Mapa de conversaciones clave",
            format: "práctica",
            durationMinutes: 20,
            prompt:
              "Programa una conversación necesaria en una ventana favorable.",
            order: 3,
            status: "published",
            isActive: true,
          },
        ],
      },
      {
        id: "course-arquitectura-del-destino-m5",
        title: "Cierre con tablero anual",
        summary:
          "Arma un tablero liviano para sostener el aprendizaje sin perderte en teoria.",
        durationMinutes: 41,
        order: 5,
        status: "published",
        isActive: true,
        lessons: [
          {
            id: "course-arquitectura-del-destino-m5-l1",
            title: "Checklist de tu año",
            format: "práctica",
            durationMinutes: 21,
            prompt: "Resume prioridades, riesgos y rituales de mantenimiento.",
            order: 1,
            status: "published",
            isActive: true,
          },
          {
            id: "course-arquitectura-del-destino-m5-l2",
            title: "Ritmo de seguimiento",
            format: "audio",
            durationMinutes: 20,
            prompt:
              "Define un sistema semanal para revisar tu mapa sin obsesionarte.",
            order: 2,
            status: "published",
            isActive: true,
          },
        ],
      },
    ],
    status: "published",
    isActive: true,
  },
];

function cloneCourse(value: Course): Course {
  return JSON.parse(JSON.stringify(value)) as Course;
}

function normalizeCourseStatus(value?: string): "draft" | "published" | "archived" {
  if (value === "draft" || value === "published" || value === "archived") {
    return value;
  }

  return coursePublishedStatus;
}

function normalizeCourseTree(course: Course): Course {
  const normalized = cloneCourse(course);
  normalized.status = normalizeCourseStatus(normalized.status);
  normalized.isActive = normalized.isActive ?? normalized.status !== courseArchivedStatus;
  normalized.modules = [...normalized.modules]
    .map((module, moduleIndex) => ({
      ...module,
      order: module.order ?? moduleIndex + 1,
      status: normalizeCourseStatus(module.status),
      isActive: module.isActive ?? module.status !== courseArchivedStatus,
      lessons: [...module.lessons]
        .map((lesson, lessonIndex) => ({
          ...lesson,
          order: lesson.order ?? lessonIndex + 1,
          status: normalizeCourseStatus(lesson.status),
          isActive: lesson.isActive ?? lesson.status !== courseArchivedStatus,
        }))
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
    }))
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  normalized.moduleCount = normalized.modules.length;
  normalized.lessonCount = normalized.modules.reduce(
    (total, module) => total + module.lessons.length,
    0,
  );
  return normalized;
}

function filterPublishedCourseTree(course: Course): Course {
  const normalized = normalizeCourseTree(course);
  return {
    ...normalized,
    modules: normalized.modules
      .filter((module) => normalizeCourseStatus(module.status) === coursePublishedStatus)
      .map((module) => ({
        ...module,
        lessons: module.lessons.filter(
          (lesson) => normalizeCourseStatus(lesson.status) === coursePublishedStatus,
        ),
      })),
  };
}

function isCourseVisible(course: Course): boolean {
  return normalizeCourseStatus(course.status) !== courseArchivedStatus;
}

function isCoursePublished(course: Course): boolean {
  return normalizeCourseStatus(course.status) === coursePublishedStatus;
}

function replaceCourse(courseId: string, updater: (course: Course) => Course | null): Course | null {
  const index = courses.findIndex((item) => item.id === courseId);
  if (index < 0) {
    return null;
  }

  const next = updater(normalizeCourseTree(courses[index]));
  if (!next) {
    courses.splice(index, 1);
    return null;
  }

  courses[index] = normalizeCourseTree(next);
  return cloneCourse(courses[index]);
}

let currentUser: UserProfile = {
  id: "user-mark",
  firstName: "Mark",
  lastName: "Lore",
  nickname: "mark",
  email: "mark@example.com",
  avatarUrl: "",
  location: "Lima, Perú",
  timezone: "America/Lima",
  zodiacSign: "Sagitario",
  planId: "free",
  accountType: "specialist",
  specialistProfileId: "spec-amaya",
  roles: ["admin"],
  natalChart: {
    subjectName: "Mark",
    birthDate: "2000-11-28",
    birthTime: "01:40",
    birthTimeUnknown: false,
    city: "Lima",
    state: "Lima",
    country: "Perú",
    timeZoneId: "America/Lima",
    utcOffset: "-05:00",
    latitude: -12.0464,
    longitude: -77.0428,
  },
  preferences: {
    focusAreas: ["claridad", "propósito", "vínculos"],
    preferredSessionModes: ["chat", "video"],
    receivesPush: true,
  },
};

const adminAccessByRole: Record<"admin" | "specialist" | "client", string[]> = {
  admin: ["Resumen", "Usuarios", "Especialistas", "Servicios", "Agenda", "Tienda", "Cursos", "Biblioteca", "Auditoría"],
  specialist: ["Especialistas", "Servicios", "Agenda", "Tienda"],
  client: ["Inicio", "Perfil", "Reservas", "Tienda"],
};

let bookings: Booking[] = [
  {
    id: "booking-1",
    userId: currentUser.id,
    serviceId: "service-tarot",
    serviceName: "Lectura de tarot terapéutico",
    specialistId: "spec-amaya",
    specialistName: "Amaya Rivas",
    scheduledAt: "2026-03-24T19:00:00-03:00",
    mode: "video",
    status: "confirmed",
    price: { amount: 32, currency: "USD" },
    notes: "Quiero trabajar claridad sobre una decisión profesional.",
  },
  {
    id: "booking-2",
    userId: currentUser.id,
    serviceId: "service-astro",
    serviceName: "Astrología natal personalizada",
    specialistId: "spec-elian",
    specialistName: "Elian Duarte",
    scheduledAt: "2026-03-28T18:30:00-03:00",
    mode: "audio",
    status: "pending_payment",
    price: { amount: 48, currency: "USD" },
    notes: "Revisar tránsitos y energía del trimestre.",
  },
];

const usersById = new Map<string, UserProfile>([[currentUser.id, currentUser]]);
const userCreatedAtById = new Map<string, string>([
  [currentUser.id, "2026-03-20T12:00:00.000Z"],
]);
const phoneAuthIdentitiesByPhone = new Map<string, PhoneAuthIdentity>([
  [
    "+59891111111",
    {
      userId: currentUser.id,
      phoneNumber: "+59891111111",
      countryCode: "UY",
      dialCode: "+598",
      profileCompleted: true,
    },
  ],
]);
const verificationRecordsByPhone = new Map<string, PhoneVerificationRecord>();
const authSessionsByAccessToken = new Map<string, PhoneAuthSessionRecord>();

const paymentsConfig: PaymentsConfig = {
  consultationProvider: "Mercado Pago",
  premiumProvider: "Apple In-App Purchase / Google Play Billing",
  supportedMethods: [
    "Tarjetas crédito/débito",
    "Transferencias",
    "Pago en efectivo habilitado por Mercado Pago",
    "Suscripcion mensual o anual en stores",
  ],
  notes: [
    "Premium y contenido digital se gestionan por billing de tienda.",
    "Consultas 1:1 pueden evaluarse con Mercado Pago segun el flujo final.",
  ],
};

const adminSummary: AdminSummary = {
  activeUsers: 324,
  premiumSubscribers: 81,
  monthlyBookings: 146,
  activeSpecialists: 7,
  openIncidents: 2,
};

const seedShopProducts = [
  {
    id: "shop-vela-luna-nueva",
    name: "Vela ritual Luna Nueva",
    category: "Velas",
    shortDescription: "Cera vegetal con notas de mirra y jazmín.",
    description:
      "Vela pensada para aperturas, intenciones y limpiezas suaves del espacio.",
    price: { amount: 18, currency: "USD" },
    sku: "VELA-LUNA-NUEVA-AMAYA",
    status: "active",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/db/Ritual-_Candles.jpg",
    imageUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/d/db/Ritual-_Candles.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/f/f5/Candle_black.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/8/83/Tarot_cards_-_3_card_spread_with_candles.jpg",
    ],
    artwork: "candle-moon",
    badge: "Ritual inicial",
    featured: true,
    stockLabel: "Disponible",
    tags: ["cera vegetal", "intención", "altar"],
  },
  {
    id: "shop-vela-proteccion",
    name: "Vela Protección Obsidiana",
    category: "Velas",
    shortDescription: "Blend oscuro para cierres y contención energética.",
    description:
      "Ideal para rituales de protección, límites y cierres de ciclo con humo suave.",
    price: { amount: 21, currency: "USD" },
    sku: "VELA-OBSIDIANA-AMAYA",
    status: "active",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/f5/Candle_black.jpg",
    imageUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/f/f5/Candle_black.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/d/db/Ritual-_Candles.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/8/83/Tarot_cards_-_3_card_spread_with_candles.jpg",
    ],
    artwork: "candle-obsidian",
    badge: "Protección",
    featured: false,
    stockLabel: "Pocas unidades",
    tags: ["obsidiana", "protección", "limpieza"],
  },
  {
    id: "shop-cuadro-carta-dorada",
    name: "Cuadro carta natal dorada",
    category: "Cuadros",
    shortDescription: "Impresión premium con mapa natal en foil.",
    description:
      "Tu carta natal en composición vertical con acentos dorados y datos de nacimiento.",
    price: { amount: 64, currency: "USD" },
    sku: "CUADRO-NATAL-DORADA-ELIAN",
    status: "active",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/0/03/Astrological_birth_chart_for_1st_Duke_of_Albemarle_Wellcome_L0040335.jpg",
    imageUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/0/03/Astrological_birth_chart_for_1st_Duke_of_Albemarle_Wellcome_L0040335.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/b/b5/12_star_charts_of_the_signs_of_the_Zodiac_by_John_Bevis.jpg",
    ],
    artwork: "natal-gold",
    badge: "Personalizable",
    featured: true,
    stockLabel: "Hecho a pedido",
    tags: ["carta natal", "foil", "decoración"],
  },
  {
    id: "shop-cuadro-carta-nocturna",
    name: "Cuadro carta natal nocturna",
    category: "Cuadros",
    shortDescription: "Lámina azul profundo con constelaciones y casas.",
    description:
      "Versión en paleta noche con círculos zodiacales y espacio para dedicatoria.",
    price: { amount: 58, currency: "USD" },
    sku: "CUADRO-NATAL-NOCTURNA-ELIAN",
    status: "active",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/b5/12_star_charts_of_the_signs_of_the_Zodiac_by_John_Bevis.jpg",
    imageUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/b/b5/12_star_charts_of_the_signs_of_the_Zodiac_by_John_Bevis.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/0/03/Astrological_birth_chart_for_1st_Duke_of_Albemarle_Wellcome_L0040335.jpg",
    ],
    artwork: "natal-night",
    badge: "Edición estudio",
    featured: false,
    stockLabel: "Disponible",
    tags: ["constelaciones", "hogar", "regalo"],
  },
  {
    id: "shop-estatua-triple-luna",
    name: "Estatua Triple Luna",
    category: "Estatuas",
    shortDescription: "Figura resina marfil para altar o biblioteca.",
    description:
      "Pieza decorativa inspirada en la triple luna para espacios de práctica y contemplación.",
    price: { amount: 46, currency: "USD" },
    sku: "ESTATUA-TRIPLE-LUNA-MILA",
    status: "active",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/bd/Moon_Statue.jpg",
    imageUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/b/bd/Moon_Statue.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/3/34/Dhyana_buddha_statue_in_Amaravathi.jpg",
    ],
    artwork: "statue-moon",
    badge: "Altar",
    featured: false,
    stockLabel: "Disponible",
    tags: ["resina", "altar", "luna"],
  },
  {
    id: "shop-estatua-buda-lunar",
    name: "Estatua Buda lunar",
    category: "Estatuas",
    shortDescription: "Figura pequeña para meditación y calma visual.",
    description:
      "Acabado piedra suave para rincones de lectura, meditación y descanso.",
    price: { amount: 39, currency: "USD" },
    sku: "ESTATUA-BUDA-LUNAR-MILA",
    status: "active",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/34/Dhyana_buddha_statue_in_Amaravathi.jpg",
    imageUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/3/34/Dhyana_buddha_statue_in_Amaravathi.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/b/bd/Moon_Statue.jpg",
    ],
    artwork: "statue-buddha",
    badge: "Calma",
    featured: false,
    stockLabel: "Disponible",
    tags: ["meditación", "hogar", "serenidad"],
  },
  {
    id: "shop-simbolo-flor-vida",
    name: "Símbolo Flor de la Vida",
    category: "Símbolos",
    shortDescription: "Placa metálica para pared o altar.",
    description:
      "Símbolo geométrico en acabado dorado mate para armonizar el espacio.",
    price: { amount: 27, currency: "USD" },
    sku: "SIMBOLO-FLOR-VIDA-ELIAN",
    status: "active",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/f4/Flower_of_life_black.png",
    imageUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/f/f4/Flower_of_life_black.png",
      "https://upload.wikimedia.org/wikipedia/commons/8/87/Steel_pentagram_01.jpg",
    ],
    artwork: "symbol-flower",
    badge: "Geometría sagrada",
    featured: false,
    stockLabel: "Disponible",
    tags: ["geometría", "armonía", "pared"],
  },
  {
    id: "shop-simbolo-pentagrama",
    name: "Pentagrama ceremonial",
    category: "Símbolos",
    shortDescription: "Pieza de altar en madera oscura y latón.",
    description:
      "Símbolo para mesa ritual, prácticas de enfoque e intención consciente.",
    price: { amount: 24, currency: "USD" },
    sku: "SIMBOLO-PENTAGRAMA-ELIAN",
    status: "active",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/87/Steel_pentagram_01.jpg",
    imageUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/8/87/Steel_pentagram_01.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/f/f4/Flower_of_life_black.png",
    ],
    artwork: "symbol-pentacle",
    badge: "Mesa ritual",
    featured: false,
    stockLabel: "Disponible",
    tags: ["latón", "altar", "foco"],
  },
  {
    id: "shop-tarot-rider-waite",
    name: "Tarot Rider Waite lino",
    category: "Tarot",
    shortDescription: "Mazo clásico con acabado mate texturizado.",
    description:
      "Versión suave al tacto, ideal para práctica diaria y lecturas guiadas.",
    price: { amount: 33, currency: "USD" },
    sku: "TAROT-RIDER-WAITE-AMAYA",
    status: "active",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/3e/Rider-Waite_Major_Arcana_full.png",
    imageUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/3/3e/Rider-Waite_Major_Arcana_full.png",
      "https://upload.wikimedia.org/wikipedia/commons/8/83/Tarot_cards_-_3_card_spread_with_candles.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/3/3f/Tarot_De_Marseille.jpg",
    ],
    artwork: "tarot-rider",
    badge: "Clásico",
    featured: true,
    stockLabel: "Disponible",
    tags: ["78 cartas", "clásico", "aprendizaje"],
  },
  {
    id: "shop-tarot-marsella",
    name: "Tarot de Marsella restaurado",
    category: "Tarot",
    shortDescription: "Paleta restaurada con guía breve incluida.",
    description:
      "Mazo enfocado en lectura simbólica tradicional con colores renovados.",
    price: { amount: 37, currency: "USD" },
    sku: "TAROT-MARSELLA-AMAYA",
    status: "active",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/3f/Tarot_De_Marseille.jpg",
    imageUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/3/3f/Tarot_De_Marseille.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/3/3e/Rider-Waite_Major_Arcana_full.png",
      "https://upload.wikimedia.org/wikipedia/commons/8/83/Tarot_cards_-_3_card_spread_with_candles.jpg",
    ],
    artwork: "tarot-marsella",
    badge: "Marsella",
    featured: true,
    stockLabel: "Disponible",
    tags: ["tradicional", "restaurado", "guía"],
  },
  {
    id: "shop-tarot-thoth-pocket",
    name: "Tarot Thoth pocket",
    category: "Tarot",
    shortDescription: "Formato compacto para lecturas de viaje.",
    description:
      "Mazo reducido con impresión nítida y estuche rígido para llevar contigo.",
    price: { amount: 29, currency: "USD" },
    sku: "TAROT-THOTH-POCKET-AMAYA",
    status: "active",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/fb/Thoth_Tarot_Cards_in_the_Museum_of_Witchcraft_and_Magic.jpg",
    imageUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/f/fb/Thoth_Tarot_Cards_in_the_Museum_of_Witchcraft_and_Magic.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/8/83/Tarot_cards_-_3_card_spread_with_candles.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/3/3e/Rider-Waite_Major_Arcana_full.png",
    ],
    artwork: "tarot-thoth",
    badge: "Pocket",
    featured: false,
    stockLabel: "Disponible",
    tags: ["viaje", "compacto", "estuche"],
  },
  {
    id: "shop-tarot-lunar-oracle",
    name: "Tarot Lunar Vision",
    category: "Tarot",
    shortDescription: "Mazo ilustrado con tono místico contemporáneo.",
    description:
      "Ideal para lecturas intuitivas, journaling y trabajo con fases lunares.",
    price: { amount: 41, currency: "USD" },
    sku: "TAROT-LUNAR-VISION-AMAYA",
    status: "active",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/83/Tarot_cards_-_3_card_spread_with_candles.jpg",
    imageUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/8/83/Tarot_cards_-_3_card_spread_with_candles.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/f/fb/Thoth_Tarot_Cards_in_the_Museum_of_Witchcraft_and_Magic.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/3/3f/Tarot_De_Marseille.jpg",
    ],
    artwork: "tarot-lunar",
    badge: "Edición visual",
    featured: false,
    stockLabel: "Nueva llegada",
    tags: ["luna", "intuición", "journaling"],
  },
];

function getShopSeedOwner(category: string, index: number): Specialist {
  if (category === "Velas" || category === "Tarot") {
    return (
      specialists.find((item) => item.id === "spec-amaya") ?? specialists[0]
    );
  }
  if (category === "Cuadros" || category === "Símbolos") {
    return (
      specialists.find((item) => item.id === "spec-elian") ?? specialists[0]
    );
  }

  return specialists.find((item) => item.id === "spec-mila") ?? specialists[0];
}

function createManagedShopProduct(
  ownerId: string,
  product: Omit<
    ShopProduct,
    "specialistId" | "specialistName" | "storeId" | "storeName"
  >,
): ShopProduct {
  const owner =
    specialists.find((item) => item.id === ownerId) ?? specialists[0];

  return normalizeShopProductOwnership(
    {
      ...product,
      specialistId: owner.id,
      specialistName: owner.name,
      storeId: buildShopStoreId(owner.id),
      storeName: buildShopStoreName(owner.name),
    },
    owner.id,
    owner.name,
  );
}

const demoManagementShopProducts: ShopProduct[] = [
  createManagedShopProduct("spec-amaya", {
    id: "shop-oraculo-sombras-lab",
    name: "Oráculo Sombras · laboratorio",
    category: "Tarot",
    shortDescription:
      "Mazo en preparación para la próxima vitrina de temporada.",
    description:
      "Producto interno para pruebas de catálogo. Sirve para validar borradores, filtros de estado y cards de inventario sin exponerlo al cliente final.",
    price: { amount: 45, currency: "USD" },
    sku: "ORACULO-SOMBRAS-LAB-AMAYA",
    status: "draft",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/fb/Thoth_Tarot_Cards_in_the_Museum_of_Witchcraft_and_Magic.jpg",
    imageUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/f/fb/Thoth_Tarot_Cards_in_the_Museum_of_Witchcraft_and_Magic.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/8/83/Tarot_cards_-_3_card_spread_with_candles.jpg",
    ],
    artwork: "tarot-thoth",
    badge: "Borrador interno",
    featured: false,
    stockLabel: "Disponible",
    stockQuantity: 5,
    madeToOrder: false,
    tags: ["demo", "borrador", "curaduría"],
  }),
  createManagedShopProduct("spec-elian", {
    id: "shop-placa-geometria-secreta",
    name: "Placa Geometría Secreta",
    category: "Símbolos",
    shortDescription: "Pieza oculta para probar visibilidad comercial y stock.",
    description:
      "Producto reservado para testear estados ocultos, filtros de inventario y control de SKU dentro del panel admin.",
    price: { amount: 31, currency: "USD" },
    sku: "PLACA-GEOMETRIA-SECRETA-ELIAN",
    status: "hidden",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/f4/Flower_of_life_black.png",
    imageUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/f/f4/Flower_of_life_black.png",
      "https://upload.wikimedia.org/wikipedia/commons/8/87/Steel_pentagram_01.jpg",
    ],
    artwork: "symbol-flower",
    badge: "Oculto",
    featured: false,
    stockLabel: "Disponible",
    stockQuantity: 4,
    madeToOrder: false,
    tags: ["demo", "oculto", "inventario"],
  }),
  createManagedShopProduct("spec-elian", {
    id: "shop-cuadro-archivo-celeste",
    name: "Cuadro Archivo Celeste",
    category: "Cuadros",
    shortDescription: "Ficha archivada para validar estados no visibles.",
    description:
      "Usado para comprobar filtros de archivado, lectura de SKU y comportamiento de productos fuera del catálogo activo.",
    price: { amount: 52, currency: "USD" },
    sku: "CUADRO-ARCHIVO-CELESTE-ELIAN",
    status: "archived",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/b5/12_star_charts_of_the_signs_of_the_Zodiac_by_John_Bevis.jpg",
    imageUrls: [
      "https://upload.wikimedia.org/wikipedia/commons/b/b5/12_star_charts_of_the_signs_of_the_Zodiac_by_John_Bevis.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/0/03/Astrological_birth_chart_for_1st_Duke_of_Albemarle_Wellcome_L0040335.jpg",
    ],
    artwork: "natal-night",
    badge: "Archivado",
    featured: false,
    stockLabel: "Agotado",
    stockQuantity: 0,
    madeToOrder: false,
    tags: ["demo", "archivado", "backoffice"],
  }),
];

function buildShopSeedTimestamp(index: number): string {
  const base = Date.UTC(2026, 0, 1, 12, 0, 0);
  return new Date(base + index * 24 * 60 * 60 * 1000).toISOString();
}

const shopProducts: ShopProduct[] = [
  ...seedShopProducts.map((product, index) => {
    const owner = getShopSeedOwner(product.category, index);
    const stockQuantity =
      product.stockLabel === "Pocas unidades"
        ? 3
        : product.stockLabel === "Nueva llegada"
          ? 7
          : product.stockLabel === "Hecho a pedido"
            ? 0
            : 9;

    return normalizeShopProductOwnership(
      {
        ...product,
        sku: product.sku,
        status: normalizeShopProductStatus(product.status),
        specialistId: owner.id,
        specialistName: owner.name,
        storeId: buildShopStoreId(owner.id),
        storeName: buildShopStoreName(owner.name),
        stockQuantity,
        madeToOrder: product.stockLabel === "Hecho a pedido",
        createdAt: buildShopSeedTimestamp(index),
        updatedAt: buildShopSeedTimestamp(index),
      },
      owner.id,
      owner.name,
    );
  }),
  ...demoManagementShopProducts.map((product, index) => {
    const timestamp = buildShopSeedTimestamp(seedShopProducts.length + index);
    return {
      ...product,
      createdAt: product.createdAt ?? timestamp,
      updatedAt: product.updatedAt ?? timestamp,
    };
  }),
];

function buildShopOrderItem(
  productId: string,
  quantity: number,
): ShopOrderItem {
  const product = shopProducts.find((item) => item.id === productId);
  if (!product) {
    throw new Error(`No existe el producto ${productId} para el seed de Shop.`);
  }

  return {
    productId: product.id,
    productName: product.name,
    category: product.category,
    quantity,
    imageUrl: product.imageUrl,
    unitPrice: { ...product.price },
    lineTotal: {
      amount: Number((product.price.amount * quantity).toFixed(2)),
      currency: product.price.currency,
    },
  };
}

function buildShopDemoOrder(input: {
  id: string;
  orderCode: string;
  status: ShopOrderStatus;
  createdAt: string;
  specialistId: string;
  specialistName: string;
  deliveryAddress: string;
  notes: string;
  lines: Array<{ productId: string; quantity: number }>;
}): ShopOrder {
  const items = input.lines.map((line) =>
    buildShopOrderItem(line.productId, line.quantity),
  );
  const subtotalAmount = items.reduce(
    (sum, item) => sum + item.lineTotal.amount,
    0,
  );
  const shippingAmount = subtotalAmount >= 120 ? 0 : 9;

  return {
    id: input.id,
    userId: currentUser.id,
    orderCode: input.orderCode,
    status: input.status,
    createdAt: input.createdAt,
    specialistId: input.specialistId,
    specialistName: input.specialistName,
    storeId: buildShopStoreId(input.specialistId),
    storeName: buildShopStoreName(input.specialistName),
    deliveryAddress: input.deliveryAddress,
    notes: input.notes,
    subtotal: { amount: subtotalAmount, currency: "USD" },
    shipping: { amount: shippingAmount, currency: "USD" },
    total: {
      amount: Number((subtotalAmount + shippingAmount).toFixed(2)),
      currency: "USD",
    },
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
  };
}

const shopOrdersByUserId = new Map<string, ShopOrder[]>([
  [
    currentUser.id,
    [
      buildShopDemoOrder({
        id: "order-seed-1",
        orderCode: "LR-2026-041",
        status: "shipped",
        createdAt: "2026-04-11T16:40:00-05:00",
        specialistId: "spec-elian",
        specialistName: "Elian Duarte",
        deliveryAddress: "Miraflores, Lima, Perú",
        notes: "Recibido por portería. Cliente pidió empaque discreto.",
        lines: [
          { productId: "shop-simbolo-flor-vida", quantity: 1 },
          { productId: "shop-simbolo-pentagrama", quantity: 1 },
        ],
      }),
      buildShopDemoOrder({
        id: "order-seed-2",
        orderCode: "LR-2026-042",
        status: "preparing",
        createdAt: "2026-04-15T10:15:00-05:00",
        specialistId: "spec-elian",
        specialistName: "Elian Duarte",
        deliveryAddress: "Barranco, Lima, Perú",
        notes: "Validar dedicatoria breve antes de cerrar la impresión.",
        lines: [{ productId: "shop-cuadro-carta-dorada", quantity: 1 }],
      }),
      buildShopDemoOrder({
        id: "order-seed-3",
        orderCode: "LR-2026-043",
        status: "confirmed",
        createdAt: "2026-04-18T14:20:00-05:00",
        specialistId: "spec-amaya",
        specialistName: "Amaya Rivas",
        deliveryAddress: "Surco, Lima, Perú",
        notes: "Coordinar envío luego de las 6 p. m.",
        lines: [
          { productId: "shop-vela-luna-nueva", quantity: 1 },
          { productId: "shop-tarot-rider-waite", quantity: 1 },
        ],
      }),
      buildShopDemoOrder({
        id: "order-seed-4",
        orderCode: "LR-2026-044",
        status: "pending",
        createdAt: "2026-04-20T09:05:00-05:00",
        specialistId: "spec-amaya",
        specialistName: "Amaya Rivas",
        deliveryAddress: "San Isidro, Lima, Perú",
        notes: "Cliente pidió confirmar stock antes de coordinar pago.",
        lines: [
          { productId: "shop-vela-proteccion", quantity: 1 },
          { productId: "shop-tarot-lunar-oracle", quantity: 1 },
        ],
      }),
    ],
  ],
]);

function getUserById(userId?: string): UserProfile {
  if (userId && usersById.has(userId)) {
    return usersById.get(userId)!;
  }

  return currentUser;
}

function setCurrentUser(user: UserProfile) {
  currentUser = user;
  usersById.set(user.id, user);
}

function normalizeAdminRoles(roles?: Array<"admin" | "specialist">): Array<"admin" | "specialist"> {
  return Array.from(new Set((roles ?? []).filter(
    (role): role is "admin" | "specialist" => role === "admin" || role === "specialist",
  ))).sort((left, right) => left.localeCompare(right));
}

function buildAdminAccess(accountType: AccountType, roles: Array<"admin" | "specialist">): string[] {
  const access = new Set<string>(adminAccessByRole[accountType === "specialist" ? "specialist" : "client"]);

  for (const role of roles) {
    for (const entry of adminAccessByRole[role]) {
      access.add(entry);
    }
  }

  return [...access];
}

function getUserPhoneNumber(userId: string): string {
  for (const identity of phoneAuthIdentitiesByPhone.values()) {
    if (identity.userId === userId) {
      return identity.phoneNumber;
    }
  }

  return "";
}

function toAdminUserRecord(user: UserProfile): AdminManagedUserRecord {
  const roles = normalizeAdminRoles(user.roles as Array<"admin" | "specialist"> | undefined);
  const accountType = user.accountType;
  const fullName = `${user.firstName} ${user.lastName}`.trim() || user.nickname || user.email || user.id;

  return {
    id: user.id,
    fullName,
    email: user.email,
    phoneNumber: getUserPhoneNumber(user.id),
    planId: user.planId,
    profileCompleted: Boolean(
      user.firstName.trim() &&
      user.lastName.trim() &&
      user.email.trim()
    ),
    createdAt: userCreatedAtById.get(user.id) ?? new Date().toISOString(),
    roles,
    accountType,
    access: buildAdminAccess(accountType, roles),
  };
}

function getPhoneIdentityByUserId(userId: string): PhoneAuthIdentity | null {
  for (const identity of phoneAuthIdentitiesByPhone.values()) {
    if (identity.userId === userId) {
      return identity;
    }
  }

  return null;
}

function createOpaqueToken(): string {
  return `${randomUUID()}${randomUUID()}`.replaceAll("-", "");
}

function generateMockOtpCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
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

function inferZodiacSign(birthDate?: string): string {
  const normalizedBirthDate = normalizeBirthDateInput(birthDate);
  const match = normalizedBirthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "";
  }

  const month = Number(match[2]);
  const day = Number(match[3]);

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) {
    return "Aries";
  }
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) {
    return "Tauro";
  }
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) {
    return "Geminis";
  }
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) {
    return "Cancer";
  }
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    return "Leo";
  }
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) {
    return "Virgo";
  }
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) {
    return "Libra";
  }
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) {
    return "Escorpio";
  }
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) {
    return "Sagitario";
  }
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) {
    return "Capricornio";
  }
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) {
    return "Acuario";
  }
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) {
    return "Piscis";
  }

  return "";
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

function getCurrentPlan(userId?: string): Plan {
  const user = getUserById(userId);
  return plans.find((plan) => plan.id === user.planId) ?? plans[0];
}

function resolveShopOwnerId(userId?: string): string {
  return userId?.trim() || currentUser.id;
}

function getUserLocationFallback(userId?: string): string {
  const ownerId = resolveShopOwnerId(userId);
  return usersById.get(ownerId)?.location?.trim() || currentUser.location;
}

function cloneMoney(value: Money): Money {
  return {
    amount: value.amount,
    currency: value.currency,
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

function getUpcomingBooking(userId?: string): Booking | null {
  const ordered = getBookings(userId).filter(
    (booking) =>
      booking.status === "confirmed" || booking.status === "pending_payment",
  );

  return ordered[0] ?? null;
}

function buildPhoneAuthSessionPayload(
  session: PhoneAuthSessionRecord,
): PhoneAuthSessionPayload {
  const user = getUserById(session.userId);
  const identity = phoneAuthIdentitiesByPhone.get(session.phoneNumber);

  if (!identity) {
    throw new Error("No se encontró la identidad del teléfono autenticado.");
  }

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    phoneNumber: session.phoneNumber,
    profileCompleted: identity.profileCompleted,
    user,
  };
}

function buildPendingPhoneAuthUser(phoneNumber: string): UserProfile {
  const suffix = phoneNumber.replace(/\D/g, "").slice(-4);

  return {
    id: randomUUID(),
    firstName: "",
    lastName: "",
    nickname: suffix.length === 0 ? "" : `user${suffix}`,
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

export function getHomePayload(userId?: string): HomePayload {
  const user = getUserById(userId);
  const upcoming = getUpcomingBooking(user.id);
  const firstName = user.firstName.trim();
  const { cardOfTheDay, astrologicalEnergy } = buildDailyHomeContent(
    user.timezone,
  );

  return {
    welcomeTitle: firstName.length === 0 ? "Hola" : `Hola, ${firstName}`,
    welcomeSubtitle:
      "Tu espacio diario para tarot, astrología, consultas y contenido guiado.",
    cardOfTheDay,
    astrologicalEnergy,
    quickActions: [
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
    ],
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

export function getPlans(): Plan[] {
  return plans;
}

export function getServices(): ServiceOffer[] {
  return services;
}

export function createServiceOffer(
  input: CreateServiceOfferInput,
  specialistId: string,
): ServiceOffer {
  const name = input.name?.trim() ?? "";
  const category = input.category?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  const priceAmount = Number(input.price?.amount ?? 0);
  const durationMinutes = Math.max(1, Math.round(Number(input.durationMinutes ?? 0)));
  const specialist = specialists.find((item) => item.id === specialistId);

  if (!specialist) {
    throw new Error("El especialista no existe.");
  }
  if (name.length < 3) {
    throw new Error("Ingresa un nombre válido.");
  }
  if (category.length < 3) {
    throw new Error("Ingresa una categoría válida.");
  }
  if (description.length < 6) {
    throw new Error("Ingresa una descripción válida.");
  }
  if (!Number.isFinite(priceAmount) || priceAmount < 0) {
    throw new Error("Ingresa un precio válido.");
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Ingresa una duración válida.");
  }

  const service: ServiceOffer = {
    id: `service-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomUUID().slice(0, 8)}`,
    name,
    category,
    description,
    durationMinutes,
    price: {
      amount: Number(priceAmount.toFixed(2)),
      currency: input.price?.currency?.trim() || "USD",
    },
    deliveryModes:
      input.deliveryModes && input.deliveryModes.length > 0
        ? [...input.deliveryModes]
        : [...specialist.sessionModes],
    premiumIncluded: Boolean(input.premiumIncluded),
    specialistIds:
      input.specialistIds && input.specialistIds.length > 0
        ? [...new Set(input.specialistIds)]
        : [specialistId],
    isActive: input.isActive ?? true,
    isVisible: input.isVisible ?? true,
  };

  services.unshift(service);
  return service;
}

export function updateServiceOffer(
  serviceId: string,
  input: UpdateServiceOfferInput,
): ServiceOffer {
  const index = services.findIndex((item) => item.id === serviceId);
  if (index < 0) {
    throw new Error("El servicio no existe.");
  }

  const existing = services[index];
  const amount =
    input.price?.amount === undefined
      ? existing.price.amount
      : Number(input.price.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Ingresa un precio válido.");
  }

  const durationMinutes =
    input.durationMinutes === undefined
      ? existing.durationMinutes
      : Math.max(0, Math.round(Number(input.durationMinutes)));
  const name = input.name?.trim() || existing.name;
  const category = input.category?.trim() || existing.category;
  const description = input.description?.trim() || existing.description;

  const updated: ServiceOffer = {
    ...existing,
    name,
    category,
    description,
    durationMinutes,
    price: {
      amount: Number(amount.toFixed(2)),
      currency: input.price?.currency?.trim() || existing.price.currency,
    },
    isActive: input.isActive ?? existing.isActive,
    isVisible: input.isVisible ?? existing.isVisible,
  };

  services[index] = updated;
  return updated;
}

export function updateSpecialistAdmin(
  specialistId: string,
  input: UpdateSpecialistAdminInput,
): Specialist {
  const index = specialists.findIndex((item) => item.id === specialistId);
  if (index < 0) {
    throw new Error("El especialista no existe.");
  }

  const existing = specialists[index];
  const specialty = input.specialty?.trim();
  const updated: Specialist = {
    ...existing,
    publicName: input.publicName?.trim() || existing.publicName,
    headline: input.headline?.trim() || existing.headline,
    bio: input.bio?.trim() || existing.bio,
    avatarUrl: input.avatarUrl?.trim() || existing.avatarUrl,
    specialties:
      specialty && specialty.length > 0
        ? specialty.split(",").map((item) => item.trim()).filter(Boolean)
        : existing.specialties,
    isActive: input.isActive ?? existing.isActive,
    isPublic: input.isPublic ?? existing.isPublic,
  };

  specialists[index] = updated;
  return updated;
}

export function getSpecialists(): Specialist[] {
  return specialists;
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
  const existingSpecialistProfileId = existingUser.specialistProfileId?.trim() ?? "";

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

export function getCourses(): Course[] {
  return courses
    .filter(isCoursePublished)
    .map((course) => cloneCourse(filterPublishedCourseTree(course)));
}

export function getAdminCourses(): Course[] {
  return courses.map((course) => cloneCourse(normalizeCourseTree(course)));
}

export function getCourseById(courseId: string): Course | null {
  const course = courses.find((item) => item.id === courseId);
  if (!course || !isCoursePublished(course)) {
    return null;
  }

  return cloneCourse(filterPublishedCourseTree(course));
}

export function getAdminCourseById(courseId: string): Course | null {
  const course = courses.find((item) => item.id === courseId);
  if (!course) {
    return null;
  }

  return cloneCourse(normalizeCourseTree(course));
}

export function upsertCourse(courseId: string | null, input: Partial<Course>): Course {
  const normalizedInput = normalizeCourseTree({
    id: courseId ?? input.id ?? `course-${randomUUID()}`,
    title: input.title?.trim() || "Curso nuevo",
    subtitle: input.subtitle?.trim() || "Descripción pendiente",
    category: input.category?.trim() || "General",
    level: input.level?.trim() || "Inicial",
    premium: input.premium ?? false,
    featured: input.featured ?? false,
    removable: input.removable ?? true,
    estimatedHours: Number.isFinite(input.estimatedHours) ? Number(input.estimatedHours) : 0,
    moduleCount: Array.isArray(input.modules) ? input.modules.length : 0,
    lessonCount: Array.isArray(input.modules)
      ? input.modules.reduce((total, module) => total + module.lessons.length, 0)
      : 0,
    progressPercent: Number.isFinite(input.progressPercent) ? Number(input.progressPercent) : 0,
    streakDays: Number.isFinite(input.streakDays) ? Number(input.streakDays) : 0,
    hook: input.hook?.trim() || "Curso administrado desde el panel.",
    description: input.description?.trim() || "Descripción pendiente.",
    outcomes: Array.isArray(input.outcomes)
      ? input.outcomes.filter((item): item is string => typeof item === "string")
      : [],
    modules: Array.isArray(input.modules)
      ? input.modules.map((module, moduleIndex) => ({
          id: module.id || `module-${randomUUID()}`,
          title: module.title?.trim() || `Módulo ${moduleIndex + 1}`,
          summary: module.summary?.trim() || "Resumen pendiente",
          durationMinutes: Number.isFinite(module.durationMinutes)
            ? Number(module.durationMinutes)
            : 0,
          order: module.order ?? moduleIndex + 1,
          status: normalizeCourseStatus(module.status),
          isActive: module.isActive ?? true,
          lessons: module.lessons.map((lesson, lessonIndex) => ({
            id: lesson.id || `lesson-${randomUUID()}`,
            title: lesson.title?.trim() || `Lección ${lessonIndex + 1}`,
            format: lesson.format?.trim() || "video",
            durationMinutes: Number.isFinite(lesson.durationMinutes)
              ? Number(lesson.durationMinutes)
              : 0,
            prompt: lesson.prompt?.trim() || "",
            content: lesson.content?.trim(),
            resourceUrl: lesson.resourceUrl?.trim(),
            order: lesson.order ?? lessonIndex + 1,
            status: normalizeCourseStatus(lesson.status),
            isActive: lesson.isActive ?? true,
          })),
        }))
      : [],
    coverImageUrl: input.coverImageUrl?.trim(),
    status: normalizeCourseStatus(input.status),
    isActive: input.isActive ?? normalizeCourseStatus(input.status) !== courseArchivedStatus,
    updatedAt: new Date().toISOString(),
  } as Course);

  const existingIndex = courses.findIndex((item) => item.id === normalizedInput.id);
  if (existingIndex >= 0) {
    courses[existingIndex] = normalizedInput;
    return cloneCourse(normalizedInput);
  }

  courses = [normalizedInput, ...courses];
  return cloneCourse(normalizedInput);
}

export function updateCourse(courseId: string, input: Partial<Course>): Course | null {
  return replaceCourse(courseId, (course) =>
    normalizeCourseTree({
      ...course,
      ...input,
      id: course.id,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function archiveCourse(courseId: string): Course | null {
  return replaceCourse(courseId, (course) =>
    normalizeCourseTree({
      ...course,
      status: courseArchivedStatus,
      isActive: false,
      modules: course.modules.map((module) => ({
        ...module,
        status: courseArchivedStatus,
        isActive: false,
        lessons: module.lessons.map((lesson) => ({
          ...lesson,
          status: courseArchivedStatus,
          isActive: false,
        })),
      })),
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function setCoursePublication(courseId: string, published: boolean): Course | null {
  return replaceCourse(courseId, (course) =>
    normalizeCourseTree({
      ...course,
      status: published ? coursePublishedStatus : courseDraftStatus,
      isActive: published,
      modules: published
        ? course.modules.map((module) => ({
            ...module,
            status: coursePublishedStatus,
            isActive: module.isActive ?? true,
            lessons: module.lessons.map((lesson) => ({
              ...lesson,
              status: coursePublishedStatus,
              isActive: lesson.isActive ?? true,
            })),
          }))
        : course.modules,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function upsertCourseModule(
  courseId: string,
  moduleId: string | null,
  input: Partial<CourseModule>,
): Course | null {
  return replaceCourse(courseId, (course) => {
    const modules = [...course.modules];
    const normalizedModule = {
      id: moduleId ?? input.id ?? `module-${randomUUID()}`,
      title: input.title?.trim() || "Módulo",
      summary: input.summary?.trim() || "Resumen pendiente",
      durationMinutes: Number.isFinite(input.durationMinutes)
        ? Number(input.durationMinutes)
        : 0,
      order: Number.isFinite(input.order) ? Number(input.order) : modules.length + 1,
      status: normalizeCourseStatus(input.status),
      isActive: input.isActive ?? normalizeCourseStatus(input.status) !== courseArchivedStatus,
      lessons: Array.isArray(input.lessons)
        ? input.lessons.map((lesson, index) => ({
            id: lesson.id ?? `lesson-${randomUUID()}`,
            title: lesson.title?.trim() || `Lección ${index + 1}`,
            format: lesson.format?.trim() || "video",
            durationMinutes: Number.isFinite(lesson.durationMinutes)
              ? Number(lesson.durationMinutes)
              : 0,
            prompt: lesson.prompt?.trim() || "",
            content: lesson.content?.trim(),
            resourceUrl: lesson.resourceUrl?.trim(),
            order: Number.isFinite(lesson.order) ? Number(lesson.order) : index + 1,
            status: normalizeCourseStatus(lesson.status),
            isActive: lesson.isActive ?? true,
          }))
        : [],
    } satisfies CourseModule;
    const existingIndex = modules.findIndex((item) => item.id === normalizedModule.id);
    if (existingIndex >= 0) {
      modules[existingIndex] = normalizedModule;
    } else {
      modules.push(normalizedModule);
    }

    return {
      ...course,
      modules: modules.sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
      updatedAt: new Date().toISOString(),
    };
  });
}

export function deleteCourseModule(courseId: string, moduleId: string): Course | null {
  return replaceCourse(courseId, (course) => ({
    ...course,
    modules: course.modules.filter((module) => module.id !== moduleId),
    updatedAt: new Date().toISOString(),
  }));
}

export function upsertCourseLesson(
  courseId: string,
  moduleId: string,
  lessonId: string | null,
  input: Partial<CourseLesson>,
): Course | null {
  return replaceCourse(courseId, (course) => {
    const modules = course.modules.map((module) => {
      if (module.id !== moduleId) {
        return module;
      }

      const lessons = [...module.lessons];
      const normalizedLesson = {
        id: lessonId ?? input.id ?? `lesson-${randomUUID()}`,
        title: input.title?.trim() || "Lección",
        format: input.format?.trim() || "video",
        durationMinutes: Number.isFinite(input.durationMinutes)
          ? Number(input.durationMinutes)
          : 0,
        prompt: input.prompt?.trim() || "",
        content: input.content?.trim(),
        resourceUrl: input.resourceUrl?.trim(),
        order: Number.isFinite(input.order) ? Number(input.order) : lessons.length + 1,
        status: normalizeCourseStatus(input.status),
        isActive: input.isActive ?? normalizeCourseStatus(input.status) !== courseArchivedStatus,
      } satisfies CourseLesson;

      const existingIndex = lessons.findIndex((item) => item.id === normalizedLesson.id);
      if (existingIndex >= 0) {
        lessons[existingIndex] = normalizedLesson;
      } else {
        lessons.push(normalizedLesson);
      }

      return {
        ...module,
        lessons: lessons.sort((left, right) => (left.order ?? 0) - (right.order ?? 0)),
      };
    });

    return {
      ...course,
      modules,
      updatedAt: new Date().toISOString(),
    };
  });
}

export function deleteCourseLesson(courseId: string, moduleId: string, lessonId: string): Course | null {
  return replaceCourse(courseId, (course) => ({
    ...course,
    modules: course.modules.map((module) =>
      module.id === moduleId
        ? {
            ...module,
            lessons: module.lessons.filter((lesson) => lesson.id !== lessonId),
          }
        : module,
    ),
    updatedAt: new Date().toISOString(),
  }));
}

export function getShopOrders(userId?: string): ShopOrder[] {
  const user = getUserById(userId);
  const scope = buildShopViewerScope(
    user,
    user.roles?.includes("admin") ?? false,
  );
  const items = [...shopOrdersByUserId.values()].flat();

  return filterShopOrdersForScope(items, scope).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export function getShopData(userId?: string): ShopData {
  const user = getUserById(userId);
  const scope = buildShopViewerScope(
    user,
    user.roles?.includes("admin") ?? false,
  );
  return {
    title: "Shop Renaciente",
    subtitle:
      "Una selección cuidada de productos para acompañar tu espacio y tu práctica.",
    featuredNote:
      "Este catálogo inicial es seed y sirve para validar interés, ticket promedio y familias de producto.",
    supportNote:
      "Este seed incluye pedidos en todos los estados y productos de inventario/admin para testear trayecto, filtros y backoffice.",
    currency: "USD",
    products: filterShopProductsForScope(shopProducts, scope),
    orders: getShopOrders(userId),
  };
}

export function createShopProduct(
  input: CreateShopProductInput,
  specialistProfileId?: string,
): ShopProduct {
  const name = input.name?.trim() ?? "";
  const category = input.category?.trim() ?? "";
  const amount = Number(input.price?.amount ?? 0);
  const ownerId =
    specialistProfileId?.trim() ||
    currentUser.specialistProfileId?.trim() ||
    "";
  const owner = specialists.find((item) => item.id === ownerId);

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
  if (!madeToOrder && stockQuantity < 0) {
    throw new Error("Ingresa un stock válido.");
  }

  const product = normalizeShopProductOwnership(
    {
      id: `shop-${slugifyShopValue(name)}-${randomUUID().slice(0, 8)}`,
      name,
      category,
      specialistId: owner.id,
      specialistName: owner.name,
      storeId: buildShopStoreId(owner.id),
      storeName: buildShopStoreName(owner.name),
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    owner.id,
    owner.name,
  );

  shopProducts.unshift(product);
  return product;
}

export function updateShopProduct(
  productId: string,
  input: UpdateShopProductInput,
): ShopProduct {
  const index = shopProducts.findIndex((item) => item.id === productId);
  if (index < 0) {
    throw new Error("El producto no existe.");
  }

  const existing = shopProducts[index];
  const amount =
    input.price?.amount === undefined
      ? existing.price.amount
      : Number(input.price.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Ingresa un precio válido.");
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

  shopProducts[index] = updated;
  return updated;
}

export function updateShopOrderStatus(
  orderId: string,
  input: UpdateShopOrderStatusInput,
  userId?: string,
): ShopOrder {
  const status = input.status;
  if (!isShopOrderStatus(status)) {
    throw new Error("Selecciona un estado de orden válido.");
  }

  const user = getUserById(userId);
  const scope = buildShopViewerScope(
    user,
    user.roles?.includes("admin") ?? false,
  );
  let ownerId: string | null = null;
  let index = -1;

  for (const [candidateOwnerId, orders] of shopOrdersByUserId.entries()) {
    const candidateIndex = orders.findIndex(
      (item) => item.id === orderId && canManageShopOrder(item, scope),
    );
    if (candidateIndex >= 0) {
      ownerId = candidateOwnerId;
      index = candidateIndex;
      break;
    }
  }

  if (!ownerId || index < 0) {
    throw new Error("La orden no existe.");
  }

  const orders = shopOrdersByUserId.get(ownerId) ?? [];

  const updated: ShopOrder = {
    ...orders[index],
    status,
  };

  orders[index] = updated;
  shopOrdersByUserId.set(ownerId, [...orders]);
  return updated;
}

export function getBookings(userId?: string): Booking[] {
  const user = getUserById(userId);
  const isAdmin = user.roles?.includes("admin") ?? false;
  const specialistScope =
    user.accountType === "specialist" &&
    Boolean(user.specialistProfileId?.trim()) &&
    !isAdmin;

  return [...bookings]
    .filter((booking) => {
      if (isAdmin) {
        return true;
      }
      if (specialistScope) {
        return booking.specialistId === user.specialistProfileId;
      }

      return booking.userId === user.id;
    })
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
}

export function getProfile(userId?: string): UserProfile {
  return getUserById(userId);
}

export function listAdminUsers(
  options: { limit?: number; role?: "client" | "admin" | "specialist"; search?: string } = {},
): AdminManagedUserRecord[] {
  const safeLimit = Math.max(1, Math.min(options.limit ?? 10, 200));
  const search = options.search?.trim().toLowerCase() ?? "";

  return [...usersById.values()]
    .map(toAdminUserRecord)
    .filter((user) => {
      const matchesSearch =
        search.length === 0 ||
        [user.fullName, user.email, user.phoneNumber, user.planId, user.roles.join(" "), user.accountType]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      const normalizedRole =
        options.role && options.role !== "client" ? options.role : "client";
      const matchesRole =
        !options.role
          ? true
          : options.role === "client"
            ? user.roles.length === 0
            : user.roles.includes(normalizedRole as "admin" | "specialist");

      return matchesSearch && matchesRole;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, safeLimit);
}

export function createAdminUser(input: AdminManagedUserInput): AdminManagedUserRecord {
  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";
  const nickname = input.nickname?.trim() ?? "";
  const email = input.email?.trim().toLowerCase() ?? "";
  const phoneNumber = input.phoneNumber?.trim() ?? "";
  const planId = input.planId?.trim() || "free";
  const accountType = input.accountType ?? "client";
  const roles = normalizeAdminRoles(input.roles);
  const id = `user-${randomUUID().slice(0, 8)}`;

  if (firstName.length === 0) {
    throw new Error("Ingresa un nombre válido.");
  }
  if (email.length === 0) {
    throw new Error("Ingresa un email válido.");
  }
  if ([...usersById.values()].some((user) => user.email.trim().toLowerCase() === email)) {
    throw new Error("Ya existe un usuario con ese email.");
  }
  if (phoneNumber.length > 0 && [...phoneAuthIdentitiesByPhone.values()].some((identity) => identity.phoneNumber === phoneNumber)) {
    throw new Error("Ya existe un usuario con ese teléfono.");
  }

  const user: UserProfile = {
    id,
    firstName,
    lastName,
    nickname,
    email,
    avatarUrl: "",
    location: "",
    timezone: "America/Lima",
    zodiacSign: "",
    planId,
    accountType,
    specialistProfileId: accountType === "specialist" ? (roles.includes("specialist") ? "spec-amaya" : "") : "",
    roles,
    natalChart: {
      subjectName: firstName,
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

  usersById.set(id, user);
  userCreatedAtById.set(id, new Date().toISOString());

  if (phoneNumber.length > 0) {
    phoneAuthIdentitiesByPhone.set(phoneNumber, {
      userId: id,
      phoneNumber,
      countryCode: "",
      dialCode: "",
      profileCompleted: Boolean(input.profileCompleted),
    });
  }

  if (currentUser.id === id) {
    currentUser = user;
  }

  return toAdminUserRecord(user);
}

export function updateAdminUser(
  userId: string,
  input: AdminManagedUserInput,
): AdminManagedUserRecord {
  const existingUser = getUserById(userId);
  const nextFirstName = input.firstName?.trim() ?? existingUser.firstName;
  const nextLastName = input.lastName?.trim() ?? existingUser.lastName;
  const nextNickname = input.nickname?.trim() ?? existingUser.nickname;
  const nextEmail = input.email?.trim().toLowerCase() ?? existingUser.email;
  const nextPhone = input.phoneNumber?.trim() ?? getUserPhoneNumber(existingUser.id);
  const nextPlanId = input.planId?.trim() || existingUser.planId;
  const nextAccountType = input.accountType ?? existingUser.accountType;
  const nextRoles = normalizeAdminRoles(input.roles ?? (existingUser.roles as Array<"admin" | "specialist"> | undefined));

  const updatedUser: UserProfile = {
    ...existingUser,
    firstName: nextFirstName,
    lastName: nextLastName,
    nickname: nextNickname,
    email: nextEmail,
    planId: nextPlanId,
    accountType: nextAccountType,
    roles: nextRoles,
    specialistProfileId:
      nextAccountType === "specialist" || nextRoles.includes("specialist")
        ? existingUser.specialistProfileId?.trim() || "spec-amaya"
        : "",
  };

  usersById.set(updatedUser.id, updatedUser);

  const existingIdentity = getPhoneIdentityByUserId(updatedUser.id);
  if (nextPhone.length > 0) {
    if (existingIdentity) {
      phoneAuthIdentitiesByPhone.delete(existingIdentity.phoneNumber);
    }
    phoneAuthIdentitiesByPhone.set(nextPhone, {
      userId: updatedUser.id,
      phoneNumber: nextPhone,
      countryCode: existingIdentity?.countryCode ?? "",
      dialCode: existingIdentity?.dialCode ?? "",
      profileCompleted: Boolean(input.profileCompleted ?? existingIdentity?.profileCompleted ?? false),
    });
  }

  return toAdminUserRecord(updatedUser);
}

export function setUserPlan(planId: string, userId?: string): UserProfile {
  const existingUser = getUserById(userId);
  const updatedUser = {
    ...existingUser,
    planId,
  };

  setCurrentUser(updatedUser);
  return updatedUser;
}

export function setBookingStatus(
  bookingId: string,
  status: BookingStatus,
  userId?: string,
): Booking {
  const user = getUserById(userId);
  const specialistScope =
    user.accountType === "specialist" &&
    Boolean(user.specialistProfileId?.trim());
  const bookingIndex = bookings.findIndex(
    (item) =>
      item.id === bookingId &&
      (specialistScope
        ? item.specialistId === user.specialistProfileId
        : item.userId === user.id),
  );

  if (bookingIndex < 0) {
    throw new Error("La reserva no existe.");
  }

  const booking = bookings[bookingIndex];
  if (booking.status === "cancelled") {
    throw new Error("La reserva ya fue cancelada.");
  }
  if (booking.status === "completed") {
    throw new Error("La reserva ya fue completada.");
  }
  if (booking.status === status) {
    return booking;
  }
  if (status === "confirmed" && booking.status !== "pending_payment") {
    throw new Error("La reserva ya no admite este pago.");
  }

  const updatedBooking: Booking = {
    ...booking,
    status,
  };

  bookings[bookingIndex] = updatedBooking;
  return updatedBooking;
}

export function getCurrentSubscription(userId?: string): Subscription {
  const plan = getCurrentPlan(userId);

  return {
    planId: plan.id,
    planName: plan.name,
    status: plan.id === "premium" ? "active" : "inactive",
    renewsAt: plan.id === "premium" ? "2026-04-20T00:00:00-03:00" : null,
    platform: "ios",
    billingProvider: plan.id === "premium" ? "app_store" : "mercado_pago",
    entitlements: plan.features,
  };
}

export function getPaymentsConfig(): PaymentsConfig {
  return paymentsConfig;
}

export function getAdminSummary(): AdminSummary {
  return adminSummary;
}

export function createShopOrder(
  input: CreateShopOrderInput,
  userId?: string,
): ShopOrder {
  const user = getUserById(userId);
  const existingOrders = getShopOrders(user.id);
  const result = buildShopOrderDraft({
    input,
    products: shopProducts,
    viewer: buildShopViewerScope(user, false),
    orderId: randomUUID(),
    orderCode: buildOrderCode(existingOrders.length + 1),
    createdAt: new Date().toISOString(),
    deliveryAddressFallback: getUserLocationFallback(user.id),
  });

  shopProducts.splice(0, shopProducts.length, ...result.updatedProducts);
  shopOrdersByUserId.set(user.id, [result.order, ...existingOrders]);
  return result.order;
}

export async function getBootstrap(userId?: string): Promise<AppBootstrap> {
  const user = getUserById(userId);
  const services =
    user.accountType === "specialist" &&
    Boolean(user.specialistProfileId?.trim())
      ? getServices().filter((service) =>
          service.specialistIds.includes(user.specialistProfileId ?? ""),
        )
      : getServices();
  await recordBadgeAction(user.id, {
    actionKey: "app_opened",
  });

  return {
    app: {
      name: "Lo Renaciente",
      tagline: "Autoconocimiento, guía y consultas en un mismo lugar.",
      market: "Perú / Latam",
      timezone: user.timezone,
    },
    user,
    home: getHomePayload(user.id),
    plans: getPlans(),
    subscription: getCurrentSubscription(user.id),
    payments: getPaymentsConfig(),
    services: services,
    specialists: getSpecialists(),
    courses: getCourses(),
    shop: getShopData(user.id),
    bookings: getBookings(user.id),
    admin: getAdminSummary(),
    badges: await getUserBadgeProfile(user.id),
  };
}

export function getUserIdForAccessToken(accessToken?: string): string | null {
  if (!accessToken) {
    return null;
  }

  const session = authSessionsByAccessToken.get(accessToken);
  if (!session || session.expiresAt < Date.now()) {
    if (session) {
      authSessionsByAccessToken.delete(accessToken);
    }

    return null;
  }

  return session.userId;
}

export function getPhoneAuthSession(
  accessToken: string,
): PhoneAuthSessionPayload {
  const session = authSessionsByAccessToken.get(accessToken);

  if (!session || session.expiresAt < Date.now()) {
    throw new Error("La sesión ya no es válida. Solicita un nuevo código.");
  }

  return buildPhoneAuthSessionPayload(session);
}

export function updateCurrentUser(
  input: UpdateUserProfileInput,
  userId?: string,
): UserProfile {
  const existingUser = getUserById(userId);
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
  const updatedUser: UserProfile = {
    ...existingUser,
    firstName: input.firstName ?? existingUser.firstName,
    lastName: input.lastName ?? existingUser.lastName,
    nickname: input.nickname ?? existingUser.nickname,
    email: input.email ?? existingUser.email,
    avatarUrl: input.avatarUrl ?? existingUser.avatarUrl,
    location: input.location ?? existingUser.location,
    accountType: input.accountType ?? existingUser.accountType,
    specialistProfileId: specialistProfileId,
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

  usersById.set(updatedUser.id, updatedUser);
  if (currentUser.id === updatedUser.id) {
    currentUser = updatedUser;
  }

  return updatedUser;
}

export function startPhoneAuth(
  input: PhoneAuthStartInput,
): PhoneAuthStartResult {
  const countryCode = (input.countryCode ?? "").trim().toUpperCase();
  const dialCode = normalizeDialCode(input.dialCode);
  const nationalNumber = normalizeNationalNumber(input.nationalNumber);
  const phoneNumber = `${dialCode}${nationalNumber}`;
  const debugCode = generateMockOtpCode();

  verificationRecordsByPhone.set(phoneNumber, {
    phoneNumber,
    code: debugCode,
    countryCode,
    dialCode,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attemptsRemaining: 3,
  });

  return {
    phoneNumber,
    expiresInSeconds: 300,
    resendInSeconds: 30,
    debugCode,
  };
}

export function verifyPhoneAuth(
  input: PhoneAuthVerifyInput,
): PhoneAuthSessionPayload {
  const phoneNumber = normalizeFullPhoneNumber(input.phoneNumber);
  const submittedCode = (input.code ?? "").trim();
  const verificationRecord = verificationRecordsByPhone.get(phoneNumber);

  if (!verificationRecord) {
    throw new Error("Primero solicita un código para ese teléfono.");
  }

  if (verificationRecord.expiresAt < Date.now()) {
    verificationRecordsByPhone.delete(phoneNumber);
    throw new Error("El código venció. Solicita uno nuevo.");
  }

  if (!/^\d{6}$/.test(submittedCode)) {
    throw new Error("Ingresa un código de 6 dígitos.");
  }

  if (verificationRecord.code !== submittedCode) {
    verificationRecord.attemptsRemaining -= 1;
    if (verificationRecord.attemptsRemaining <= 0) {
      verificationRecordsByPhone.delete(phoneNumber);
      throw new Error("Se agotaron los intentos. Solicita un nuevo código.");
    }

    throw new Error("El código ingresado no coincide.");
  }

  let identity = phoneAuthIdentitiesByPhone.get(phoneNumber);
  let user: UserProfile;

  if (!identity) {
    user = buildPendingPhoneAuthUser(phoneNumber);

    identity = {
      userId: user.id,
      phoneNumber,
      countryCode: verificationRecord.countryCode,
      dialCode: verificationRecord.dialCode,
      profileCompleted: false,
    };

    usersById.set(user.id, user);
    phoneAuthIdentitiesByPhone.set(phoneNumber, identity);
  } else {
    user = getUserById(identity.userId);
  }

  setCurrentUser(user);
  verificationRecordsByPhone.delete(phoneNumber);

  const session: PhoneAuthSessionRecord = {
    accessToken: createOpaqueToken(),
    refreshToken: createOpaqueToken(),
    userId: user.id,
    phoneNumber,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };

  authSessionsByAccessToken.set(session.accessToken, session);
  return buildPhoneAuthSessionPayload(session);
}

export function completePhoneProfile(
  accessToken: string,
  input: CompletePhoneProfileInput,
): PhoneAuthSessionPayload {
  const session = authSessionsByAccessToken.get(accessToken);

  if (!session || session.expiresAt < Date.now()) {
    throw new Error(
      "La sesión ya no es válida. Vuelve a verificar tu teléfono.",
    );
  }

  const normalizedLocation =
    input.location?.trim() ||
    [input.city?.trim(), input.country?.trim()].filter(Boolean).join(", ");

  const user = updateCurrentUser(
    {
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
    },
    session.userId,
  );

  const identity = getPhoneIdentityByUserId(user.id);
  if (identity) {
    identity.profileCompleted = Boolean(
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

  setCurrentUser(user);
  return buildPhoneAuthSessionPayload(session);
}

export function revokePhoneAuthSession(accessToken: string): void {
  authSessionsByAccessToken.delete(accessToken);
}

export function createBooking(
  input: CreateBookingInput,
  userId?: string,
): Booking {
  const user = getUserById(userId);

  if (
    !input.serviceId ||
    !input.specialistId ||
    !input.scheduledAt ||
    !input.mode
  ) {
    throw new Error("Faltan campos obligatorios para crear la reserva.");
  }

  const service = services.find((item) => item.id === input.serviceId);
  if (!service) {
    throw new Error("El servicio no existe.");
  }

  const specialist = specialists.find((item) => item.id === input.specialistId);
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
    userId: user.id,
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

  bookings = [booking, ...bookings];
  return booking;
}

export function updateBooking(
  bookingId: string,
  input: UpdateBookingInput,
  userId?: string,
): Booking {
  const user = getUserById(userId);
  const specialistScope =
    user.accountType === "specialist" &&
    Boolean(user.specialistProfileId?.trim());
  const bookingIndex = bookings.findIndex(
    (item) =>
      item.id === bookingId &&
      (specialistScope
        ? item.specialistId === user.specialistProfileId
        : item.userId === user.id),
  );

  if (bookingIndex < 0) {
    throw new Error("La reserva no existe.");
  }

  const booking = bookings[bookingIndex];
  if (booking.status === "cancelled") {
    throw new Error("La reserva ya fue cancelada.");
  }
  if (booking.status === "completed") {
    throw new Error("No se puede modificar una reserva completada.");
  }

  const service = services.find((item) => item.id === booking.serviceId);
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

  bookings[bookingIndex] = updatedBooking;
  return updatedBooking;
}
