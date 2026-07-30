import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import "./App.css";
import { AdminFileUploader } from "./components/AdminFileUploader";

type HealthResponse = {
  status: string;
  dependencies: {
    database: { status: string };
    redis: { status: string };
    storage: { status: string };
  };
};

type LibraryBulkFailure = {
  fileName: string;
  error: string;
};

type LibraryNoticeTone = "success" | "warning" | "error" | "info";

type LibraryNotice = {
  tone: LibraryNoticeTone;
  title: string;
  message: string;
  details?: string[];
};

type AdminBooking = {
  id: string;
  userId?: string;
  specialistId?: string;
  userName: string;
  serviceId?: string;
  serviceName: string;
  specialistName: string;
  scheduledAt: string;
  status: string;
  mode: string;
  notes?: string;
};

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl?: string;
  planId: string;
  profileCompleted: boolean;
  createdAt: string;
  roles: Array<"admin" | "specialist">;
  accountType: "client" | "specialist";
  access: string[];
  premiumStatus: string;
  premiumStartedAt: string | null;
  premiumRenewsAt: string | null;
};

type AdminChat = {
  totalThreads: number;
  openThreads: number;
  totalMessages: number;
  recentThreads: Array<{
    id: string;
    userName: string;
    specialistName: string;
    status: string;
    lastMessageAt: string | null;
    lastMessagePreview: string;
  }>;
};

type AdminPrivateChatMessage = {
  id: string;
  threadId: string;
  authorType: "user" | "specialist" | "system";
  authorId: string;
  body: string;
  imageUrl?: string | null;
  createdAt: string;
};

type AdminPrivateChatThread = {
  thread: {
    id: string;
    userId: string;
    specialistId: string;
    specialistName: string;
    bookingId: string | null;
    orderId: string | null;
    status: string;
    lastMessagePreview: string;
    lastMessageAt: string | null;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
  };
  messages: AdminPrivateChatMessage[];
};

type AdminService = {
  id: string;
  name: string;
  category: string;
  description: string;
  durationMinutes: number;
  deliveryModes?: string[];
  price: {
    amount: number;
    currency: string;
  };
  premiumIncluded?: boolean;
  specialistIds?: string[];
  isActive?: boolean;
  isVisible?: boolean;
};

type AdminSpecialist = {
  id: string;
  name: string;
  publicName?: string;
  headline: string;
  specialties: string[];
  bio?: string;
  avatarUrl?: string;
  featured: boolean;
  nextAvailableAt: string;
  isActive: boolean;
  isVisible: boolean;
  serviceCount: number;
  bookingCount: number;
  services: AdminService[];
  recentBookings: AdminBooking[];
};

type SpecialistAvailabilitySlot = {
  id: string;
  specialistId: string;
  startsAt: string;
  endsAt: string;
  mode: string;
  isAvailable: boolean;
};

type AdminSpecialistDetail = AdminSpecialist & {
  bookings?: AdminBooking[];
};

type SpecialistAuditEntry = {
  id: string;
  actorType: string;
  actorId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: {
    action?: string;
    fieldChanged?: string;
    previousValue?: unknown;
    newValue?: unknown;
    source?: string;
    changedBy?: string;
    specialistId?: string;
  };
  createdAt: string;
};

type AdminShopProduct = {
  id: string;
  name: string;
  category: string;
  specialistId?: string;
  specialistName: string;
  price: {
    amount: number;
    currency: string;
  };
  sku: string;
  status: string;
  imageUrl?: string;
  imageUrls?: string[];
  artwork?: string;
  badge?: string;
  stockLabel: string;
  stockQuantity: number;
  featured: boolean;
  madeToOrder: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type AdminShopOrder = {
  id: string;
  orderCode: string;
  userId: string;
  userName?: string;
  specialistId: string;
  specialistName: string;
  status: string;
  mode?: string;
  createdAt: string;
  deliveryAddress?: string;
  notes?: string;
  itemCount: number;
  items?: Array<{
    productId: string;
    productName: string;
    category: string;
    quantity: number;
  }>;
  total: {
    amount: number;
    currency: string;
  };
};

type AdminCommunityMessage = {
  id: string;
  authorName: string;
  authorRole: "member" | "guide" | "system";
  authorUserId?: string | null;
  authorAvatarUrl?: string | null;
  authorBadgeName?: string | null;
  authorBadgeIconUrl?: string | null;
  authorBadgePathId?: string | null;
  body: string;
  imageUrl?: string | null;
  createdAt: string;
};

type AdminCommunityModeration = {
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  mutedUntil: string | null;
  bannedUntil: string | null;
  reason: string;
  updatedBy: string;
  updatedAt: string;
  isMuted: boolean;
  isBanned: boolean;
};

type AdminSupportTicketStatus =
  | "open"
  | "in_review"
  | "responded"
  | "closed";

type AdminSupportTicketPriority = "low" | "normal" | "high";

type AdminSupportTicket = {
  id: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  subject: string;
  category: string;
  status: AdminSupportTicketStatus;
  priority: AdminSupportTicketPriority;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

type AdminSupportMessage = {
  id: string;
  ticketId: string;
  authorType: "user" | "admin" | "system";
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

type AdminSupportDetail = {
  ticket: AdminSupportTicket;
  messages: AdminSupportMessage[];
};

type AdminSupportOverview = {
  summary: {
    total: number;
    open: number;
    inReview: number;
    responded: number;
    closed: number;
  };
  items: AdminSupportTicket[];
};

type AdminCourse = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  level?: string;
  premium: boolean;
  featured: boolean;
  removable?: boolean;
  hook?: string;
  description?: string;
  outcomes?: string[];
  estimatedHours?: number;
  lessonCount: number;
  moduleCount: number;
  progressPercent: number;
  status?: "draft" | "published" | "archived";
  coverImageUrl?: string;
  updatedAt?: string;
  modules?: Array<{
    id: string;
    title: string;
    summary: string;
    durationMinutes: number;
    order?: number;
    status?: "draft" | "published" | "archived";
    isActive?: boolean;
    lessons: Array<{
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
    }>;
  }>;
  resources?: Array<{
    id: string;
    courseId: string;
    moduleId?: string | null;
    lessonId?: string | null;
    title: string;
    kind: string;
    description: string;
    url: string;
    status?: "draft" | "published" | "archived";
    isActive?: boolean;
  }>;
};

type AdminCourseResource = {
  id: string;
  courseId: string;
  moduleId?: string | null;
  lessonId?: string | null;
  title: string;
  kind: string;
  description: string;
  url: string;
  status?: "draft" | "published" | "archived";
  isActive?: boolean;
  updatedAt?: string;
};

type AdminLibraryPdf = {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  category: string;
  pageCount: number;
  status?: "draft" | "published" | "archived";
  isActive?: boolean;
  updatedAt?: string;
};

type AdminIncident = {
  id: string;
  title: string;
  status: string;
  severity: string;
  relatedType?: string;
  relatedId?: string;
};

type AdminSession = {
  id: string;
  email: string;
  name: string;
  role: string;
  lastLoginAt: string | null;
};

type AuthStatus = "loading" | "unauthenticated" | "authenticated";
type AdminSection =
  | "specialists"
  | "services"
  | "agenda"
  | "bookings"
  | "orders"
  | "shop"
  | "courses"
  | "library"
  | "users"
  | "community"
  | "support"
  | "developer";

type DeveloperSection =
  "incidents" | "badges" | "audit" | "diagnostics" | "settings";

type ProtectedResourceKey =
  | "bookings"
  | "specialists"
  | "orders"
  | "products"
  | "courses"
  | "courseResources"
  | "libraryPdfs"
  | "users"
  | "chat"
  | "community"
  | "support"
  | "incidents"
  | "diagnostics"
  | "audit";

type SpecialistDetailTab =
  "profile" | "services" | "availability" | "bookings" | "metrics" | "history";

type BadgeCategory =
  | "DESPERTAR"
  | "TAROT"
  | "PSYCHOLOGY"
  | "COMMUNITY"
  | "PURCHASE"
  | "INSTRUCTOR"
  | "AWARD"
  | "SECRET";

type BadgeRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";
type BadgeType = "AUTOMATIC" | "MANUAL" | "SECRET" | "TEMPORARY" | "EVOLVING";
type BadgeRuleOperator = "GTE" | "GT" | "EQ" | "LTE" | "LT";
type BadgePathId =
  | "despertar_path"
  | "tarot_path"
  | "psychology_path"
  | "community_path"
  | "purchase_path"
  | "instructor_path"
  | "award_path"
  | "secret_path";

type BadgeRule = {
  id: string;
  badgeId: string;
  ruleKey: string;
  operator: BadgeRuleOperator;
  value: string;
  isActive: boolean;
};

const protectedResourceKeys: ProtectedResourceKey[] = [
  "bookings",
  "specialists",
  "orders",
  "products",
  "courses",
  "courseResources",
  "libraryPdfs",
  "users",
  "chat",
  "community",
  "support",
  "incidents",
  "diagnostics",
  "audit",
];

function createProtectedResourceLoadState(): Record<
  ProtectedResourceKey,
  boolean
> {
  return protectedResourceKeys.reduce(
    (state, key) => ({ ...state, [key]: false }),
    {} as Record<ProtectedResourceKey, boolean>,
  );
}

type Badge = {
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
};

type BadgeRuleDraft = {
  id: string;
  ruleKey: string;
  operator: BadgeRuleOperator;
  value: string;
  isActive: boolean;
};

type BadgeFormState = {
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  type: BadgeType;
  pathId: BadgePathId;
  pathOrder: string;
  stepIndex: string;
  stepTitle: string;
  stepDescription: string;
  prerequisiteBadgeIds: string;
  lockedReason: string;
  isPathVisible: boolean;
  isConditionHidden: boolean;
  iconUrl: string;
  isSecret: boolean;
  isActive: boolean;
  rules: BadgeRuleDraft[];
};

type BadgePathMeta = {
  pathId: BadgePathId;
  category: BadgeCategory;
  title: string;
  description: string;
  pathOrder: number;
  accentClass: string;
};

type BadgeDiagnosticIssue = {
  severity: "error" | "warning" | "info";
  badgeId?: string;
  pathId?: BadgePathId;
  message: string;
};

type BadgeDiagnosticsResult = {
  ok: boolean;
  issues: BadgeDiagnosticIssue[];
};

type BadgePreviewState = {
  unlocked: boolean;
  blocked: boolean;
  hidden: boolean;
  iconUrl: string;
  iconFallbackLabel: string;
  accentClass: string;
  displayName: string;
  displayDescription: string;
  nextBadgeName: string | null;
};

type ProductFormState = {
  name: string;
  category: string;
  specialistId: string;
  shortDescription: string;
  description: string;
  priceAmount: string;
  priceCurrency: string;
  sku: string;
  status: string;
  imageUrl: string;
  imageUrls: string;
  artwork: string;
  badge: string;
  stockQuantity: string;
  madeToOrder: boolean;
  featured: boolean;
  tags: string;
};

type ProductSortBy = "recent" | "name" | "price" | "stock";

type ProductFilters = {
  search: string;
  category: string;
  status: string;
  featured: string;
  madeToOrder: string;
  sortBy: ProductSortBy;
};

type BookingFormState = {
  userId: string;
  specialistId: string;
  serviceId: string;
  scheduledAt: string;
  mode: string;
  notes: string;
  status: string;
};

type BadgeAuditAction =
  | "CREATED"
  | "UPDATED"
  | "ACTIVATED"
  | "DEACTIVATED"
  | "REORDERED"
  | "ARCHIVED"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "DELETED";
type BadgeAuditSource = "admin" | "manual" | "system";

type BadgeAuditLogEntry = {
  id: string;
  badgeId?: string;
  badgeName?: string | null;
  pathId?: BadgePathId | null;
  action: BadgeAuditAction;
  fieldChanged: string;
  previousValue: unknown;
  newValue: unknown;
  changedAt: string;
  changedBy: string;
  source: BadgeAuditSource;
  entityType?: string;
  entityId?: string;
  courseId?: string;
  courseName?: string | null;
  elementLabel?: string;
};

type BadgeAuditLogResponse = {
  items: BadgeAuditLogEntry[];
};

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  (typeof window === "undefined"
    ? "http://127.0.0.1:4000"
    : import.meta.env.PROD
      ? window.location.origin.replace(/\/+$/u, "")
      : window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1" ||
          window.location.hostname === "0.0.0.0"
        ? `${window.location.protocol === "https:" ? "https:" : "http:"}//127.0.0.1:4000`
        : window.location.origin.replace(/\/+$/u, ""));
const brandLogoUrl = `${import.meta.env.BASE_URL}branding/lo-renaciente-isotipo.png`;
const adminBasePath = import.meta.env.BASE_URL.replace(/\/+$/u, "") || "";
const adminBuildStamp = "reset-2026-06-29-ops-2";

type CourseWorkspaceTab =
  | "data"
  | "modules"
  | "lessons"
  | "resources"
  | "library"
  | "publication"
  | "history";

function AuthParticles() {
  const particles: Array<{
    className: string;
    style: Record<string, string>;
  }> = [
    {
      className: "auth-particle-spark",
      style: {
        top: "8%",
        left: "6%",
        width: "5px",
        height: "5px",
        animationDuration: "11s",
        animationDelay: "-1.4s",
        ["--drift" as never]: "-36px",
        ["--peak-opacity" as never]: "0.6",
        ["--scale-start" as never]: "0.38",
        ["--scale-end" as never]: "0.92",
      },
    },
    {
      className: "auth-particle-orb",
      style: {
        top: "14%",
        left: "18%",
        width: "12px",
        height: "12px",
        animationDuration: "18s",
        animationDelay: "-5s",
        ["--drift" as never]: "28px",
        ["--peak-opacity" as never]: "0.52",
        ["--scale-start" as never]: "0.72",
        ["--scale-end" as never]: "1.12",
      },
    },
    {
      className: "auth-particle-spark",
      style: {
        top: "22%",
        right: "10%",
        width: "4px",
        height: "4px",
        animationDuration: "10s",
        animationDelay: "-6s",
        ["--drift" as never]: "30px",
        ["--peak-opacity" as never]: "0.48",
        ["--scale-start" as never]: "0.32",
        ["--scale-end" as never]: "0.88",
      },
    },
    {
      className: "auth-particle-orb",
      style: {
        top: "9%",
        right: "20%",
        width: "15px",
        height: "15px",
        animationDuration: "20s",
        animationDelay: "-8s",
        ["--drift" as never]: "-64px",
        ["--peak-opacity" as never]: "0.42",
        ["--scale-start" as never]: "0.76",
        ["--scale-end" as never]: "1.16",
      },
    },
    {
      className: "auth-particle-glint",
      style: {
        top: "28%",
        left: "2%",
        width: "3px",
        height: "3px",
        animationDuration: "8.5s",
        animationDelay: "-2.8s",
        ["--drift" as never]: "18px",
        ["--peak-opacity" as never]: "0.7",
        ["--scale-start" as never]: "0.3",
        ["--scale-end" as never]: "0.82",
      },
    },
    {
      className: "auth-particle-spark",
      style: {
        top: "34%",
        right: "2%",
        width: "5px",
        height: "5px",
        animationDuration: "12s",
        animationDelay: "-7.5s",
        ["--drift" as never]: "-22px",
        ["--peak-opacity" as never]: "0.58",
        ["--scale-start" as never]: "0.34",
        ["--scale-end" as never]: "0.9",
      },
    },
    {
      className: "auth-particle-orb",
      style: {
        top: "44%",
        left: "-1%",
        width: "18px",
        height: "18px",
        animationDuration: "22s",
        animationDelay: "-11s",
        ["--drift" as never]: "36px",
        ["--peak-opacity" as never]: "0.36",
        ["--scale-start" as never]: "0.82",
        ["--scale-end" as never]: "1.2",
      },
    },
    {
      className: "auth-particle-glint",
      style: {
        top: "52%",
        right: "14%",
        width: "4px",
        height: "4px",
        animationDuration: "9.5s",
        animationDelay: "-3.8s",
        ["--drift" as never]: "-20px",
        ["--peak-opacity" as never]: "0.68",
        ["--scale-start" as never]: "0.28",
        ["--scale-end" as never]: "0.84",
      },
    },
    {
      className: "auth-particle-spark",
      style: {
        bottom: "22%",
        left: "10%",
        width: "7px",
        height: "7px",
        animationDuration: "14s",
        animationDelay: "-4.2s",
        ["--drift" as never]: "40px",
        ["--peak-opacity" as never]: "0.54",
        ["--scale-start" as never]: "0.52",
        ["--scale-end" as never]: "1.04",
      },
    },
    {
      className: "auth-particle-orb",
      style: {
        bottom: "10%",
        left: "24%",
        width: "14px",
        height: "14px",
        animationDuration: "19s",
        animationDelay: "-9s",
        ["--drift" as never]: "-46px",
        ["--peak-opacity" as never]: "0.46",
        ["--scale-start" as never]: "0.72",
        ["--scale-end" as never]: "1.1",
      },
    },
    {
      className: "auth-particle-glint",
      style: {
        bottom: "18%",
        right: "8%",
        width: "3px",
        height: "3px",
        animationDuration: "8s",
        animationDelay: "-1.1s",
        ["--drift" as never]: "-14px",
        ["--peak-opacity" as never]: "0.74",
        ["--scale-start" as never]: "0.26",
        ["--scale-end" as never]: "0.8",
      },
    },
    {
      className: "auth-particle-spark",
      style: {
        bottom: "32%",
        left: "38%",
        width: "4px",
        height: "4px",
        animationDuration: "10.5s",
        animationDelay: "-5.7s",
        ["--drift" as never]: "16px",
        ["--peak-opacity" as never]: "0.64",
        ["--scale-start" as never]: "0.3",
        ["--scale-end" as never]: "0.86",
      },
    },
    {
      className: "auth-particle-orb",
      style: {
        bottom: "40%",
        right: "22%",
        width: "10px",
        height: "10px",
        animationDuration: "17s",
        animationDelay: "-2.2s",
        ["--drift" as never]: "56px",
        ["--peak-opacity" as never]: "0.5",
        ["--scale-start" as never]: "0.62",
        ["--scale-end" as never]: "1.04",
      },
    },
    {
      className: "auth-particle-glint",
      style: {
        top: "60%",
        left: "16%",
        width: "3px",
        height: "3px",
        animationDuration: "9.2s",
        animationDelay: "-6.4s",
        ["--drift" as never]: "12px",
        ["--peak-opacity" as never]: "0.76",
        ["--scale-start" as never]: "0.22",
        ["--scale-end" as never]: "0.78",
      },
    },
    {
      className: "auth-particle-spark",
      style: {
        top: "70%",
        right: "10%",
        width: "6px",
        height: "6px",
        animationDuration: "13s",
        animationDelay: "-8.8s",
        ["--drift" as never]: "-30px",
        ["--peak-opacity" as never]: "0.56",
        ["--scale-start" as never]: "0.42",
        ["--scale-end" as never]: "0.94",
      },
    },
    {
      className: "auth-particle-orb",
      style: {
        top: "76%",
        left: "52%",
        width: "16px",
        height: "16px",
        animationDuration: "21s",
        animationDelay: "-12s",
        ["--drift" as never]: "-58px",
        ["--peak-opacity" as never]: "0.4",
        ["--scale-start" as never]: "0.74",
        ["--scale-end" as never]: "1.14",
      },
    },
    {
      className: "auth-particle-glint",
      style: {
        top: "18%",
        left: "46%",
        width: "4px",
        height: "4px",
        animationDuration: "8.8s",
        animationDelay: "-4.4s",
        ["--drift" as never]: "14px",
        ["--peak-opacity" as never]: "0.72",
        ["--scale-start" as never]: "0.28",
        ["--scale-end" as never]: "0.8",
      },
    },
    {
      className: "auth-particle-spark",
      style: {
        top: "48%",
        right: "30%",
        width: "5px",
        height: "5px",
        animationDuration: "11.5s",
        animationDelay: "-9.1s",
        ["--drift" as never]: "20px",
        ["--peak-opacity" as never]: "0.6",
        ["--scale-start" as never]: "0.32",
        ["--scale-end" as never]: "0.88",
      },
    },
    {
      className: "auth-particle-orb",
      style: {
        top: "58%",
        right: "40%",
        width: "11px",
        height: "11px",
        animationDuration: "16s",
        animationDelay: "-1.8s",
        ["--drift" as never]: "-26px",
        ["--peak-opacity" as never]: "0.46",
        ["--scale-start" as never]: "0.68",
        ["--scale-end" as never]: "1.06",
      },
    },
    {
      className: "auth-particle-glint",
      style: {
        bottom: "54%",
        left: "6%",
        width: "3px",
        height: "3px",
        animationDuration: "7.8s",
        animationDelay: "-2.1s",
        ["--drift" as never]: "10px",
        ["--peak-opacity" as never]: "0.8",
        ["--scale-start" as never]: "0.2",
        ["--scale-end" as never]: "0.76",
      },
    },
    {
      className: "auth-particle-spark",
      style: {
        bottom: "66%",
        right: "18%",
        width: "6px",
        height: "6px",
        animationDuration: "13.8s",
        animationDelay: "-6.6s",
        ["--drift" as never]: "-16px",
        ["--peak-opacity" as never]: "0.52",
        ["--scale-start" as never]: "0.38",
        ["--scale-end" as never]: "0.92",
      },
    },
  ];

  return (
    <div className="auth-particle-field" aria-hidden="true">
      {particles.map((particle, index) => (
        <span
          key={`${particle.className}-${index}`}
          className={`auth-particle ${particle.className}`}
          style={particle.style as CSSProperties}
        />
      ))}
    </div>
  );
}

function getCourseWorkspaceRouteFromLocation() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const relativePath =
    adminBasePath.length > 0 && pathname.startsWith(`${adminBasePath}/`)
      ? pathname.slice(adminBasePath.length)
      : pathname === adminBasePath
        ? "/"
        : pathname;
  const courseMatch = relativePath.match(/^\/courses\/([^/]+)$/);
  const tabParam = new URLSearchParams(window.location.search).get("tab");

  if (!courseMatch) {
    return {
      open: false,
      courseId: null as string | null,
      tab: (tabParam as CourseWorkspaceTab | null) ?? "data",
    };
  }

  return {
    open: true,
    courseId:
      courseMatch[1] === "new" ? null : decodeURIComponent(courseMatch[1]),
    tab: (tabParam as CourseWorkspaceTab | null) ?? "data",
  };
}

function buildCourseWorkspaceUrl(
  courseId: string | null,
  tab: CourseWorkspaceTab,
) {
  const path = courseId
    ? `/courses/${encodeURIComponent(courseId)}`
    : "/courses/new";
  return `${adminBasePath}${path}?tab=${encodeURIComponent(tab)}`;
}

function createEmptyCourseForm() {
  return {
    title: "",
    subtitle: "",
    category: "",
    level: "Inicial",
    premium: false,
    featured: false,
    removable: true,
    estimatedHours: "",
    progressPercent: "",
    hook: "",
    description: "",
    outcomes: "",
    status: "draft",
    coverImageUrl: "",
  };
}

function buildCourseForm(course: AdminCourse | null) {
  if (!course) {
    return createEmptyCourseForm();
  }

  return {
    title: course.title ?? "",
    subtitle: course.subtitle ?? "",
    category: course.category ?? "",
    level: course.level ?? "Inicial",
    premium: course.premium ?? false,
    featured: course.featured ?? false,
    removable: course.removable ?? true,
    estimatedHours: course.estimatedHours?.toString() ?? "",
    progressPercent: course.progressPercent?.toString() ?? "",
    hook: course.hook ?? "",
    description: course.description ?? "",
    outcomes: course.outcomes?.join("\n") ?? "",
    status: course.status ?? "draft",
    coverImageUrl: course.coverImageUrl ?? "",
  };
}

function getConnectionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "No se pudo conectar con la API de administración. Verifica que el servidor esté en ejecución.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function normalizeLibraryCategoryKey(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return "general";
  }

  return normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatLibraryCategoryLabel(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return "General";
  }

  return normalized
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter((part) => part.trim().length > 0)
    .map((part) => part[0].toUpperCase() + part.substring(1).toLowerCase())
    .join(" ");
}

function isSupportedLibraryFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  return (
    mimeType === "application/pdf" ||
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".pdf") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx")
  );
}

function prettifyLibraryFileTitle(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/u, "");
  const normalized = baseName
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0 ? normalized : "Documento";
}

const badgePathMeta: BadgePathMeta[] = [
  {
    pathId: "despertar_path",
    category: "DESPERTAR",
    title: "Despertar",
    description: "Activación, bienvenida y primeros hábitos.",
    pathOrder: 1,
    accentClass: "path-accent-despertar",
  },
  {
    pathId: "tarot_path",
    category: "TAROT",
    title: "Tarot",
    description: "Práctica simbólica y lectura progresiva.",
    pathOrder: 2,
    accentClass: "path-accent-tarot",
  },
  {
    pathId: "psychology_path",
    category: "PSYCHOLOGY",
    title: "Psicología",
    description: "Proceso interior, terapia y autoconocimiento.",
    pathOrder: 3,
    accentClass: "path-accent-psychology",
  },
  {
    pathId: "community_path",
    category: "COMMUNITY",
    title: "Comunidad",
    description: "Participación, ayuda mutua y pertenencia.",
    pathOrder: 4,
    accentClass: "path-accent-community",
  },
  {
    pathId: "purchase_path",
    category: "PURCHASE",
    title: "Compra",
    description: "Compromiso comercial y conversión.",
    pathOrder: 5,
    accentClass: "path-accent-purchase",
  },
  {
    pathId: "instructor_path",
    category: "INSTRUCTOR",
    title: "Instructor",
    description: "Enseñanza, guía y transmisión.",
    pathOrder: 6,
    accentClass: "path-accent-instructor",
  },
  {
    pathId: "award_path",
    category: "AWARD",
    title: "Reconocimiento",
    description: "Reconocimiento manual y distinciones.",
    pathOrder: 7,
    accentClass: "path-accent-award",
  },
  {
    pathId: "secret_path",
    category: "SECRET",
    title: "Secreto",
    description: "Escalones ocultos y desbloqueos velados.",
    pathOrder: 8,
    accentClass: "path-accent-secret",
  },
];

const badgeCategoryLabels: Record<BadgeCategory, string> = {
  DESPERTAR: "Despertar",
  TAROT: "Tarot",
  PSYCHOLOGY: "Psicología",
  COMMUNITY: "Comunidad",
  PURCHASE: "Compra",
  INSTRUCTOR: "Instructor",
  AWARD: "Reconocimiento",
  SECRET: "Secreto",
};

const badgeStepTitles = [
  "Activación inicial",
  "Práctica repetida",
  "Consistencia",
  "Maestría",
  "Legado",
] as const;

const badgeRarityByStepIndex: Record<number, BadgeRarity> = {
  1: "COMMON",
  2: "RARE",
  3: "EPIC",
  4: "LEGENDARY",
  5: "MYTHIC",
};

const badgeMetricByPath: Record<BadgePathId, string | null> = {
  despertar_path: "app_open_count",
  tarot_path: "tarot_draw_count",
  psychology_path: "psychology_exercise_count",
  community_path: "community_message_count",
  purchase_path: "purchase_count",
  instructor_path: "course_published_count",
  award_path: null,
  secret_path: "app_open_count",
};

const adminSectionLabels: Record<AdminSection, string> = {
  specialists: "Especialistas",
  services: "Servicios",
  agenda: "Agenda",
  bookings: "Reservas",
  orders: "Órdenes",
  shop: "Tienda",
  courses: "Cursos",
  library: "Biblioteca",
  users: "Usuarios",
  community: "Chat",
  support: "Soporte",
  developer: "Admin desarrollador",
};

const developerSectionLabels: Record<DeveloperSection, string> = {
  incidents: "Incidencias",
  badges: "Insignias",
  audit: "Auditoría",
  diagnostics: "Diagnóstico",
  settings: "Configuración",
};

const developerSectionMeta: Record<
  DeveloperSection,
  {
    description: string;
  }
> = {
  incidents: {
    description: "Revisa fallos operativos y estado general del sistema.",
  },
  badges: {
    description: "Gestiona rutas, insignias y progresión de usuarios.",
  },
  audit: {
    description: "Inspecciona cambios, eventos y trazabilidad.",
  },
  diagnostics: {
    description: "Detecta inconsistencias y puntos de atención.",
  },
  settings: {
    description: "Consulta sesión activa y conexiones del panel.",
  },
};

type UserAccessPreset = "client" | "specialist" | "admin";

const userRoleLabels: Record<UserAccessPreset, string> = {
  client: "Cliente",
  specialist: "Especialista",
  admin: "Admin",
};

const userAccessByPreset: Record<UserAccessPreset, string[]> = {
  client: ["Inicio", "Perfil", "Reservas", "Tienda"],
  specialist: ["Especialistas", "Servicios", "Agenda", "Tienda"],
  admin: [
    "Usuarios",
    "Especialistas",
    "Servicios",
    "Agenda",
    "Tienda",
    "Cursos",
    "Biblioteca",
    "Soporte",
    "Auditoría",
  ],
};

function isAdminSection(value: string | null): value is AdminSection {
  return (
    value === "specialists" ||
    value === "services" ||
    value === "agenda" ||
    value === "bookings" ||
    value === "orders" ||
    value === "shop" ||
    value === "courses" ||
    value === "library" ||
    value === "users" ||
    value === "community" ||
    value === "support" ||
    value === "developer"
  );
}

function getInitialAdminSection(): AdminSection {
  if (typeof window !== "undefined") {
    const hashSection = window.location.hash.replace("#", "").trim();
    if (isAdminSection(hashSection)) {
      return hashSection;
    }

    if (window.location.pathname.startsWith("/courses")) {
      return "courses";
    }
  }

  return "specialists";
}

function getUserAccessSummary(user: AdminUser): string[] {
  const roles = user.roles.length > 0 ? user.roles : [];
  const access = new Set<string>(userAccessByPreset[user.accountType]);

  for (const role of roles) {
    for (const item of userAccessByPreset[role]) {
      access.add(item);
    }
  }

  return [...access];
}

type SidebarIconName = AdminSection | DeveloperSection;

function SidebarIcon({ name }: { name: SidebarIconName }) {
  switch (name) {
    case "specialists":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16.5 20v-2a4.5 4.5 0 0 0-9 0v2" />
          <circle cx="12" cy="8" r="3.5" />
          <path d="M18.5 20v-1.25a3.75 3.75 0 0 0-2.25-3.43" />
        </svg>
      );
    case "services":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16v10H4z" />
          <path d="M7 7V4h10v3" />
          <path d="M8 12h8" />
        </svg>
      );
    case "agenda":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3v4M17 3v4M4 8h16" />
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 12h4M8 16h6" />
        </svg>
      );
    case "bookings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 4h12v16H6z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      );
    case "orders":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 7h14l-1 12H6z" />
          <path d="M9 7a3 3 0 0 1 6 0" />
          <path d="M8 11h8" />
        </svg>
      );
    case "shop":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 8h14l-1 12H6z" />
          <path d="M8 8a4 4 0 0 1 8 0" />
        </svg>
      );
    case "courses":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5h14v14H5z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );
    case "library":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 6a2 2 0 0 1 2-2h12v16H7a2 2 0 0 1-2-2z" />
          <path d="M8 8h8M8 12h6M8 16h5" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="8" r="3" />
          <path d="M4.5 20v-1a4.5 4.5 0 0 1 9 0v1" />
          <path d="M15 11.5c2.2.4 3.5 2 3.5 4.5V20" />
        </svg>
      );
    case "community":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 18v-2a3 3 0 0 1 3-3h3" />
          <path d="M19 18v-2a3 3 0 0 0-3-3h-3" />
          <circle cx="9" cy="9" r="2.5" />
          <circle cx="15" cy="9" r="2.5" />
        </svg>
      );
    case "support":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 11a7 7 0 0 1 14 0v4a3 3 0 0 1-3 3h-2" />
          <path d="M7 13v-2a5 5 0 0 1 10 0v2" />
          <path d="M9 13h2v5H9zM13 13h2v5h-2z" />
          <path d="M14 18h-2" />
        </svg>
      );
    case "developer":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 6 3 12l5 6" />
          <path d="M16 6l5 6-5 6" />
          <path d="M13 4 11 20" />
        </svg>
      );
    case "incidents":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4 3.5 19h17z" />
          <path d="M12 9v4" />
          <circle cx="12" cy="16.5" r="1" />
        </svg>
      );
    case "badges":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4 9 8 4 9l3 4-1 5 4-2 4 2-1-5 3-4-5-1z" />
          <circle cx="12" cy="12" r="2.25" />
        </svg>
      );
    case "audit":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 4h8l4 4v12H6z" />
          <path d="M14 4v4h4" />
          <path d="M8 12h8M8 16h5" />
        </svg>
      );
    case "diagnostics":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 18h16" />
          <path d="M6 18v-5M10 18v-8M14 18v-3M18 18v-10" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4.8A7 7 0 0 0 15.8 6l-.4-2.5h-4.8L10.2 6a7 7 0 0 0-1.8 1.8L6 7.5 4 11l2 1.5a7 7 0 0 0 0 2L4 16l2 3.5 2.4-.8A7 7 0 0 0 10.2 18l.4 2.5h4.8L15.8 18a7 7 0 0 0 1.8-1.8l2.4.8 2-3.5-2-1.5c.1-.3.1-.7.1-1z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5h14v14H5z" />
        </svg>
      );
  }
}

type ActionIconName =
  | "login"
  | "logout"
  | "upload"
  | "folder-upload"
  | "edit"
  | "delete"
  | "refresh"
  | "publish"
  | "archive"
  | "save"
  | "success"
  | "warning"
  | "info"
  | "close"
  | "files";

function ActionIcon({ name }: { name: ActionIconName }) {
  switch (name) {
    case "login":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H4" />
          <path d="M20 4v16" />
        </svg>
      );
    case "logout":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 17l5-5-5-5" />
          <path d="M19 12H9" />
          <path d="M12 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6" />
        </svg>
      );
    case "upload":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 16V4" />
          <path d="m8 8 4-4 4 4" />
          <path d="M5 20h14" />
        </svg>
      );
    case "folder-upload":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M12 11v6" />
          <path d="m9 14 3-3 3 3" />
        </svg>
      );
    case "edit":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="m16.5 3.5 4 4L8 20l-4 1 1-4z" />
        </svg>
      );
    case "delete":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16" />
          <path d="M10 11v6M14 11v6" />
          <path d="M6 7l1 13h10l1-13" />
          <path d="M9 7V4h6v3" />
        </svg>
      );
    case "refresh":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 12a8 8 0 0 0-14-5" />
          <path d="M6 4v3h3" />
          <path d="M4 12a8 8 0 0 0 14 5" />
          <path d="M18 20v-3h-3" />
        </svg>
      );
    case "publish":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v12" />
          <path d="m8 8 4-4 4 4" />
          <path d="M5 20h14" />
        </svg>
      );
    case "archive":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16v4H4z" />
          <path d="M6 10v8h12v-8" />
          <path d="M10 14h4" />
        </svg>
      );
    case "save":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 4h11l3 3v13H5z" />
          <path d="M8 4v6h8V4" />
          <path d="M8 14h8" />
        </svg>
      );
    case "success":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      );
    case "warning":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4 3.5 19h17z" />
          <path d="M12 9v4" />
          <circle cx="12" cy="16.5" r="1" />
        </svg>
      );
    case "info":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 10v6" />
          <path d="M12 7.5h.01" />
        </svg>
      );
    case "close":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      );
    case "files":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4h7l4 4v12H7z" />
          <path d="M14 4v4h4" />
          <path d="M10 12h4M10 16h4" />
        </svg>
      );
    default:
      return null;
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getNameInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) {
    return "LR";
  }

  return parts.map((item) => item[0]?.toUpperCase() ?? "").join("");
}

function getCommunityRoleLabel(
  role: AdminCommunityMessage["authorRole"],
): string {
  switch (role) {
    case "guide":
      return "Admin";
    case "system":
      return "Sistema";
    default:
      return "Usuario";
  }
}

function getSupportStatusLabel(status: AdminSupportTicketStatus): string {
  switch (status) {
    case "in_review":
      return "En revisión";
    case "responded":
      return "Respondido";
    case "closed":
      return "Cerrado";
    default:
      return "Abierto";
  }
}

function getSupportPriorityLabel(priority: AdminSupportTicketPriority): string {
  switch (priority) {
    case "high":
      return "Alta";
    case "low":
      return "Baja";
    default:
      return "Normal";
  }
}

function getModerationLabel(moderation?: AdminCommunityModeration): string {
  if (!moderation) {
    return "Sin restricción";
  }
  if (moderation.isBanned) {
    return moderation.bannedUntil
      ? `Baneado hasta ${formatDate(moderation.bannedUntil)}`
      : "Baneado";
  }
  if (moderation.isMuted) {
    return moderation.mutedUntil
      ? `Silenciado hasta ${formatDate(moderation.mutedUntil)}`
      : "Silenciado";
  }
  return "Sin restricción";
}

function formatOptionalDate(value?: string): string {
  return value ? formatDate(value) : "Semilla";
}

function formatBookingStatusLabel(status: string): string {
  switch (status) {
    case "pending_payment":
      return "Pendiente";
    case "confirmed":
      return "Confirmada";
    case "cancelled":
      return "Cancelada";
    case "completed":
      return "Completada";
    default:
      return status;
  }
}

function formatOrderStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "confirmed":
      return "Confirmada";
    case "preparing":
      return "Preparando";
    case "shipped":
      return "Enviada";
    case "delivered":
      return "Entregada";
    case "cancelled":
      return "Cancelada";
    default:
      return status;
  }
}

function formatOrderStatusPurpose(status: string): string {
  switch (status) {
    case "confirmed":
      return "Confirma venta y abre coordinación de pago/entrega.";
    case "preparing":
      return "Avisa que el pedido está en preparación.";
    case "shipped":
      return "Marca salida o envío del pedido.";
    case "delivered":
      return "Cierra la entrega con confirmación final.";
    default:
      return "Pedido recibido, pendiente de gestión.";
  }
}

function formatModeLabel(mode: string): string {
  switch (mode) {
    case "chat":
      return "Chat";
    case "video":
      return "Video";
    case "audio":
      return "Audio";
    case "in_person":
      return "Presencial";
    default:
      return mode;
  }
}

const availabilityWeekdayOptions = [
  { value: "1", label: "Lun" },
  { value: "2", label: "Mar" },
  { value: "3", label: "Mié" },
  { value: "4", label: "Jue" },
  { value: "5", label: "Vie" },
  { value: "6", label: "Sáb" },
  { value: "0", label: "Dom" },
];

function seedServiceDrafts(services: AdminService[]): Record<
  string,
  {
    name: string;
    category: string;
    description: string;
    priceAmount: string;
    priceCurrency: string;
    durationMinutes: string;
    isActive: boolean;
    isVisible: boolean;
  }
> {
  return services.reduce<
    Record<
      string,
      {
        name: string;
        category: string;
        description: string;
        priceAmount: string;
        priceCurrency: string;
        durationMinutes: string;
        isActive: boolean;
        isVisible: boolean;
      }
    >
  >(
    (accumulator, service) => ({
      ...accumulator,
      [service.id]: {
        name: service.name,
        category: service.category,
        description: service.description,
        priceAmount: String(service.price.amount),
        priceCurrency: service.price.currency,
        durationMinutes: String(service.durationMinutes),
        isActive: service.isActive ?? true,
        isVisible: service.isVisible ?? true,
      },
    }),
    {},
  );
}

function toTimestamp(value?: string): number {
  if (!value) {
    return 0;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function toDateTimeLocalValue(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60 * 1000;
  const local = new Date(date.getTime() - offset);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function toDateInputValue(value: Date): string {
  const offset = value.getTimezoneOffset() * 60 * 1000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function parseDateInputValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function isPremiumActiveUser(user: AdminUser): boolean {
  if (user.planId !== "premium" || user.premiumStatus !== "active") {
    return false;
  }

  if (!user.premiumRenewsAt) {
    return true;
  }

  const renewsAt = new Date(user.premiumRenewsAt);
  return Number.isNaN(renewsAt.getTime()) || renewsAt.getTime() >= Date.now();
}

function formatPremiumAccessLabel(user: AdminUser): string {
  if (!isPremiumActiveUser(user)) {
    return "Free";
  }

  return user.premiumRenewsAt
    ? `Premium hasta ${formatDate(user.premiumRenewsAt)}`
    : "Premium activo";
}

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseImageList(value: string): string[] {
  return parseCommaList(value);
}

function buildProductDraft(
  product: AdminShopProduct | null,
  specialistId: string,
): ProductFormState {
  return {
    name: product?.name ?? "",
    category: product?.category ?? "",
    specialistId: product?.specialistId ?? specialistId,
    shortDescription: "",
    description: "",
    priceAmount:
      product?.price.amount != null ? String(product.price.amount) : "",
    priceCurrency: product?.price.currency ?? "USD",
    sku: product?.sku ?? "",
    status: product?.status ?? "active",
    imageUrl: product?.imageUrl ?? "",
    imageUrls: product?.imageUrls?.join(", ") ?? "",
    artwork: product?.artwork ?? "",
    badge: product?.badge ?? "",
    stockQuantity:
      product?.stockQuantity != null ? String(product.stockQuantity) : "0",
    madeToOrder: product?.madeToOrder ?? false,
    featured: product?.featured ?? false,
    tags: "",
  };
}

function getProductVisibilityLabel(status: string): string {
  if (status === "hidden") {
    return "Oculto";
  }

  if (status === "archived") {
    return "Archivado";
  }

  return "Visible";
}

function getProductCommercialLabel(status: string): string {
  if (status === "active") {
    return "Activo";
  }

  if (status === "archived") {
    return "Inactivo";
  }

  return "Borrador";
}

function buildBookingDraft(
  booking: AdminBooking | null,
  userId: string,
  specialistId: string,
): BookingFormState {
  return {
    userId: booking?.userId ?? userId,
    specialistId: booking?.specialistId ?? specialistId,
    serviceId: booking?.serviceId ?? "",
    scheduledAt: booking?.scheduledAt
      ? toDateTimeLocalValue(booking.scheduledAt)
      : "",
    mode: booking?.mode ?? "chat",
    notes: booking?.notes ?? "",
    status: booking?.status ?? "pending_payment",
  };
}

function createRuleDraft(): BadgeRuleDraft {
  return {
    id: crypto.randomUUID(),
    ruleKey: "app_open_count",
    operator: "GTE",
    value: "1",
    isActive: true,
  };
}

function resolvePathMeta(
  pathId: string | undefined,
  category: BadgeCategory,
): BadgePathMeta {
  const byPath = badgePathMeta.find((item) => item.pathId === pathId);
  if (byPath) {
    return byPath;
  }

  return (
    badgePathMeta.find((item) => item.category === category) ?? badgePathMeta[0]
  );
}

function badgeToForm(
  badge: Badge | null,
  pathHint?: BadgePathId,
): BadgeFormState {
  const meta = resolvePathMeta(
    badge?.pathId ?? pathHint,
    badge?.category ?? "DESPERTAR",
  );
  return {
    name: badge?.name ?? "",
    description: badge?.description ?? "",
    category: badge?.category ?? meta.category,
    rarity: badge?.rarity ?? "COMMON",
    type: badge?.type ?? "AUTOMATIC",
    pathId: badge?.pathId ?? meta.pathId,
    pathOrder: String(badge?.pathOrder ?? meta.pathOrder),
    stepIndex: String(badge?.stepIndex ?? 1),
    stepTitle: badge?.stepTitle ?? "",
    stepDescription: badge?.stepDescription ?? badge?.description ?? "",
    prerequisiteBadgeIds: badge?.prerequisiteBadgeIds?.join(", ") ?? "",
    lockedReason: badge?.lockedReason ?? "",
    isPathVisible: badge?.isPathVisible ?? true,
    isConditionHidden: badge?.isConditionHidden ?? false,
    iconUrl: badge?.iconUrl ?? "",
    isSecret:
      typeof badge?.isSecret === "boolean"
        ? badge.isSecret
        : badge?.category === "SECRET",
    isActive: badge?.isActive ?? true,
    rules: badge?.rules?.length
      ? badge.rules.map((rule) => ({
          id: rule.id,
          ruleKey: rule.ruleKey,
          operator: rule.operator,
          value: rule.value,
          isActive: rule.isActive,
        }))
      : [createRuleDraft()],
  };
}

function formToRequestBody(form: BadgeFormState) {
  const pathMeta = resolvePathMeta(form.pathId, form.category);
  const stepIndex = Number.parseInt(form.stepIndex, 10);
  const pathOrder = Number.parseInt(form.pathOrder, 10);
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    category: form.category,
    rarity: form.rarity,
    type: form.type,
    pathId: form.pathId,
    pathOrder: Number.isFinite(pathOrder) ? pathOrder : pathMeta.pathOrder,
    stepIndex: Number.isFinite(stepIndex) ? stepIndex : 1,
    stepTitle: form.stepTitle.trim(),
    stepDescription: form.stepDescription.trim(),
    prerequisiteBadgeIds: parseCommaList(form.prerequisiteBadgeIds),
    lockedReason: form.lockedReason.trim(),
    isPathVisible: form.isPathVisible,
    isConditionHidden: form.isConditionHidden,
    iconUrl: form.iconUrl.trim(),
    isSecret: form.isSecret,
    isActive: form.isActive,
    rules: form.rules
      .map((rule) => ({
        ruleKey: rule.ruleKey.trim(),
        operator: rule.operator,
        value: rule.value.trim(),
        isActive: rule.isActive,
      }))
      .filter((rule) => rule.ruleKey.length > 0),
  };
}

function getBadgePathId(badge: Badge): BadgePathId {
  return badge.pathId ?? resolvePathMeta(undefined, badge.category).pathId;
}

function isBadgeReorderSafe(
  badge: Badge,
  nextStepIndex: number,
  badges: Badge[],
): boolean {
  const conflict = badges.find(
    (item) =>
      item.id !== badge.id &&
      getBadgePathId(item) === getBadgePathId(badge) &&
      item.stepIndex === nextStepIndex &&
      item.isActive,
  );
  return conflict == null;
}

function getBadgeStepTitle(stepIndex: number): string {
  return badgeStepTitles[Math.min(Math.max(stepIndex, 1), 5) - 1];
}

function getBadgeRarityForStep(stepIndex: number): BadgeRarity {
  return (
    badgeRarityByStepIndex[Math.min(Math.max(stepIndex, 1), 5)] ?? "COMMON"
  );
}

function getBadgeMetricForPath(pathId: BadgePathId): string | null {
  return badgeMetricByPath[pathId] ?? null;
}

function buildBadgeRulesForDraft(
  pathId: BadgePathId,
  stepIndex: number,
): BadgeRuleDraft[] {
  const metric = getBadgeMetricForPath(pathId);
  if (!metric) {
    return [];
  }

  return [
    {
      id: crypto.randomUUID(),
      ruleKey: metric,
      operator: "GTE",
      value: String(
        [1, 3, 7, 21, 40][Math.min(Math.max(stepIndex, 1), 5) - 1] ?? 1,
      ),
      isActive: true,
    },
  ];
}

function buildBadgeDraft(
  pathId: BadgePathId,
  stepIndex: number,
  badges: Badge[],
): BadgeFormState {
  const meta = resolvePathMeta(pathId, "DESPERTAR");
  const previousBadge =
    badges.find(
      (badge) =>
        badge.pathId === pathId &&
        badge.stepIndex === Math.max(1, stepIndex - 1) &&
        badge.isActive,
    ) ?? null;
  const isSecret = meta.category === "SECRET";
  const isOccupiedActive = badges.some(
    (badge) =>
      badge.pathId === pathId &&
      badge.stepIndex === stepIndex &&
      badge.isActive,
  );

  return {
    name: "",
    description: "",
    category: meta.category,
    rarity: getBadgeRarityForStep(stepIndex),
    type: isSecret ? "SECRET" : "AUTOMATIC",
    pathId: meta.pathId,
    pathOrder: String(meta.pathOrder),
    stepIndex: String(Math.min(Math.max(stepIndex, 1), 5)),
    stepTitle: getBadgeStepTitle(stepIndex),
    stepDescription: meta.description,
    prerequisiteBadgeIds: previousBadge?.id ?? "",
    lockedReason: isSecret
      ? "Esta condición permanece oculta hasta que se desbloquee."
      : previousBadge
        ? `Completa ${previousBadge.name} para avanzar.`
        : `Completa el escalón anterior para avanzar en ${meta.category}.`,
    isPathVisible: !isSecret,
    isConditionHidden: isSecret,
    iconUrl: `/assets/badges/${pathId}-${stepIndex}.svg`,
    isSecret,
    isActive: !isOccupiedActive,
    rules: isSecret ? [] : buildBadgeRulesForDraft(pathId, stepIndex),
  };
}

function reseedBadgeDraft(
  current: BadgeFormState,
  pathId: BadgePathId,
  stepIndex: number,
  badges: Badge[],
): BadgeFormState {
  const seeded = buildBadgeDraft(pathId, stepIndex, badges);
  return {
    ...seeded,
    name: current.name,
    description: current.description,
    iconUrl: current.iconUrl || seeded.iconUrl,
    lockedReason: current.lockedReason || seeded.lockedReason,
    stepDescription: current.stepDescription || seeded.stepDescription,
  };
}

function buildBadgePreview(
  form: BadgeFormState,
  selectedBadge: Badge | null,
  badges: Badge[],
): BadgePreviewState {
  const pathId = form.pathId;
  const stepIndex = Number.parseInt(form.stepIndex, 10) || 1;
  const isHidden = form.isSecret || form.category === "SECRET";
  const unlocked = form.isActive && !isHidden;
  const blocked =
    !form.isActive || (selectedBadge ? !selectedBadge.isActive : false);
  const pathMeta = resolvePathMeta(pathId, form.category);
  const nextBadge =
    badges
      .filter(
        (badge) =>
          badge.pathId === pathId &&
          badge.stepIndex > stepIndex &&
          badge.isActive,
      )
      .sort((left, right) => left.stepIndex - right.stepIndex)[0] ?? null;

  return {
    unlocked,
    blocked,
    hidden: isHidden,
    iconUrl: form.iconUrl.trim(),
    iconFallbackLabel: getBadgePreviewFallbackLabel(
      pathId,
      stepIndex,
      isHidden,
    ),
    accentClass: pathMeta.accentClass,
    displayName: isHidden ? "Insignia oculta" : form.name || "Nombre pendiente",
    displayDescription: isHidden
      ? "La condición está oculta hasta que el sistema la revele."
      : form.description || "Descripción pendiente",
    nextBadgeName: nextBadge?.name ?? null,
  };
}

function getRouteProgressPercent(badges: Badge[]): number {
  return Math.round(
    (Math.min(badges.filter((badge) => badge.isActive).length, 5) / 5) * 100,
  );
}

function formatAuditValue(value: unknown): string {
  if (value == null) {
    return "—";
  }

  if (typeof value === "string") {
    return value.length > 0 ? value : "—";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatAuditFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    name: "Nombre",
    description: "Descripción",
    category: "Categoría",
    rarity: "Rareza",
    type: "Tipo",
    pathId: "Ruta",
    pathOrder: "Orden de ruta",
    stepIndex: "Escalón",
    stepTitle: "Título del escalón",
    stepDescription: "Descripción del escalón",
    prerequisiteBadgeIds: "Prerrequisitos",
    lockedReason: "Motivo de bloqueo",
    isPathVisible: "Visibilidad de ruta",
    isConditionHidden: "Condición oculta",
    rules: "Regla de desbloqueo",
    iconUrl: "Icono",
    isActive: "Estado",
  };

  return labels[field] ?? field;
}

function formatAuditDetailValue(value: unknown): string {
  if (value == null) {
    return "—";
  }

  if (typeof value === "string") {
    return value.length > 0 ? value : "—";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function summarizeAuditValue(value: unknown): string {
  if (value == null) {
    return "—";
  }

  if (typeof value === "string") {
    return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `Lista (${value.length})`;
  }

  if (typeof value === "object") {
    return "Cambio detallado";
  }

  return String(value);
}

function isAuditStructuredValue(value: unknown): boolean {
  return typeof value === "object" && value !== null;
}

function getAuditChangeLabel(fieldChanged: string): string {
  if (
    [
      "rules",
      "prerequisiteBadgeIds",
      "pathId",
      "pathOrder",
      "stepIndex",
    ].includes(fieldChanged)
  ) {
    return "Cambio de progresión";
  }

  return "Detalle del cambio";
}

function getCourseAuditActionLabel(
  action: string,
  fieldChanged: string,
): string {
  if (action === "PUBLISHED") {
    return "Publicado";
  }
  if (action === "ARCHIVED") {
    return "Archivado";
  }
  if (action === "CREATED") {
    return "Creado";
  }
  if (action === "DELETED") {
    return "Archivado";
  }
  if (action === "REORDERED" || fieldChanged === "order") {
    return "Cambió orden";
  }
  if (fieldChanged === "status") {
    return "Cambió estado";
  }
  if (fieldChanged === "premium") {
    return "Cambió precio";
  }

  return "Editado";
}

function getCourseAuditElementLabel(entry: BadgeAuditLogEntry): string {
  return (
    entry.elementLabel ??
    entry.courseName ??
    entry.badgeName ??
    entry.entityType ??
    "Curso"
  );
}

function hasRenderableBadgeIcon(iconUrl: string): boolean {
  return /^(https?:\/\/|data:image\/|blob:|\/assets\/|assets\/)/i.test(iconUrl);
}

function hasRenderableMediaUrl(url: string): boolean {
  return /^(https?:\/\/|data:image\/|blob:|\/assets\/|assets\/|\/uploads\/|uploads\/|\/api\/storage\/assets\/)/i.test(
    url,
  );
}

function resolveMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  if (/^(\/?uploads\/)/i.test(trimmed)) {
    const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return new URL(`/api${normalized}`, apiBaseUrl).toString();
  }

  if (trimmed.startsWith("/")) {
    return new URL(trimmed, apiBaseUrl).toString();
  }

  return trimmed;
}

function getBadgePreviewFallbackLabel(
  pathId: BadgePathId,
  stepIndex: number,
  hidden: boolean,
) {
  if (hidden) {
    return "⟡\nSECRET";
  }

  const path = badgePathMeta.find((item) => item.pathId === pathId);
  if (!path) {
    return `${Math.max(1, Math.min(5, stepIndex))}`;
  }

  const shortLabel = path.category.slice(0, 3);
  return `${shortLabel}\n${Math.max(1, Math.min(5, stepIndex))}`;
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-lockup ${compact ? "brand-lockup-compact" : ""}`}>
      <img
        src={brandLogoUrl}
        alt="Lo Renaciente"
        className="brand-lockup-mark"
      />
      {!compact ? (
        <div className="brand-lockup-copy">
          <strong>Lo Renaciente</strong>
          <span>Claridad, símbolo y dirección</span>
        </div>
      ) : null}
    </div>
  );
}

function BadgePreviewArtwork({
  iconUrl,
  fallbackLabel,
  hidden,
}: {
  iconUrl: string;
  fallbackLabel: string;
  hidden: boolean;
}) {
  const [loadFailed, setLoadFailed] = useState(false);
  const renderable = hasRenderableBadgeIcon(iconUrl);

  if (hidden || !renderable || loadFailed) {
    return <span className="badge-preview-fallback">{fallbackLabel}</span>;
  }

  return (
    <img
      src={iconUrl}
      alt=""
      className="badge-preview-image"
      onError={() => setLoadFailed(true)}
    />
  );
}

function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [activeSection, setActiveSection] = useState<AdminSection>(
    getInitialAdminSection,
  );
  const [adminUser, setAdminUser] = useState<AdminSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loadedProtectedResources, setLoadedProtectedResources] = useState<
    Record<ProtectedResourceKey, boolean>
  >(() => createProtectedResourceLoadState());
  const [specialists, setSpecialists] = useState<AdminSpecialist[]>([]);
  const [selectedSpecialistId, setSelectedSpecialistId] = useState<
    string | null
  >(null);
  const [selectedSpecialistDetail, setSelectedSpecialistDetail] =
    useState<AdminSpecialistDetail | null>(null);
  const [selectedSpecialistServices, setSelectedSpecialistServices] = useState<
    AdminService[]
  >([]);
  const [selectedSpecialistAvailability, setSelectedSpecialistAvailability] =
    useState<SpecialistAvailabilitySlot[]>([]);
  const [selectedSpecialistBookings, setSelectedSpecialistBookings] = useState<
    AdminBooking[]
  >([]);
  const [selectedSpecialistAudit, setSelectedSpecialistAudit] = useState<
    SpecialistAuditEntry[]
  >([]);
  const [specialistDetailTab, setSpecialistDetailTab] =
    useState<SpecialistDetailTab>("profile");
  const [isSpecialistDrawerOpen, setIsSpecialistDrawerOpen] = useState(false);
  const [specialistDrawerLoading, setSpecialistDrawerLoading] = useState(false);
  const [specialistDrawerError, setSpecialistDrawerError] = useState<
    string | null
  >(null);
  const [specialistFilters, setSpecialistFilters] = useState({
    search: "",
    featured: "",
    active: "",
    visible: "",
  });
  const [specialistServiceDrafts, setSpecialistServiceDrafts] = useState<
    Record<
      string,
      {
        name: string;
        category: string;
        description: string;
        priceAmount: string;
        priceCurrency: string;
        durationMinutes: string;
        isActive: boolean;
        isVisible: boolean;
      }
    >
  >({});
  const [specialistProfileDraft, setSpecialistProfileDraft] = useState({
    publicName: "",
    headline: "",
    specialty: "",
    bio: "",
    avatarUrl: "",
    isActive: true,
    isVisible: true,
  });
  const [newServiceDraft, setNewServiceDraft] = useState({
    name: "",
    category: "",
    description: "",
    priceAmount: "",
    priceCurrency: "USD",
    durationMinutes: "",
    isActive: true,
    isVisible: true,
  });
  const [availabilityDraft, setAvailabilityDraft] = useState({
    startsAt: "",
    endsAt: "",
    mode: "chat",
    isAvailable: true,
    weeklyStartDate: "",
    weeklyEndDate: "",
    weeklyStartTime: "09:00",
    weeklyEndTime: "17:00",
    weeklyWeekdays: ["1", "2", "3", "4", "5"],
  });
  const [serviceFilters, setServiceFilters] = useState({
    specialistId: "",
    category: "",
    search: "",
  });
  const [agendaFilters, setAgendaFilters] = useState({
    specialistId: "",
    status: "",
  });
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [orders, setOrders] = useState<AdminShopOrder[]>([]);
  const [products, setProducts] = useState<AdminShopProduct[]>([]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [courseResources, setCourseResources] = useState<AdminCourseResource[]>(
    [],
  );
  const [libraryPdfs, setLibraryPdfs] = useState<AdminLibraryPdf[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourseModuleId, setSelectedCourseModuleId] = useState<
    string | null
  >(null);
  const [selectedCourseLessonId, setSelectedCourseLessonId] = useState<
    string | null
  >(null);
  const [selectedCourseResourceId, setSelectedCourseResourceId] = useState<
    string | null
  >(null);
  const [selectedLibraryPdfId, setSelectedLibraryPdfId] = useState<
    string | null
  >(null);
  const initialCourseWorkspaceRoute = getCourseWorkspaceRouteFromLocation();
  const [isCourseDrawerOpen, setIsCourseDrawerOpen] = useState(
    initialCourseWorkspaceRoute.open,
  );
  const [courseDrawerTab, setCourseDrawerTab] = useState<CourseWorkspaceTab>(
    initialCourseWorkspaceRoute.tab,
  );
  const previousCourseWorkspaceIdRef = useRef<string | null | undefined>(
    undefined,
  );
  const [courseMessage, setCourseMessage] = useState<string | null>(null);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [savingCourseId, setSavingCourseId] = useState<string | "new" | null>(
    null,
  );
  const [courseForm, setCourseForm] = useState(() => createEmptyCourseForm());
  const [courseModuleForm, setCourseModuleForm] = useState({
    title: "",
    summary: "",
    durationMinutes: "",
    order: "",
    status: "draft",
    isActive: true,
  });
  const [courseLessonForm, setCourseLessonForm] = useState({
    title: "",
    format: "video",
    durationMinutes: "",
    prompt: "",
    content: "",
    resourceUrl: "",
    order: "",
    status: "draft",
    isActive: true,
  });
  const [courseResourceForm, setCourseResourceForm] = useState({
    title: "",
    kind: "link",
    description: "",
    url: "",
    status: "draft",
    isActive: true,
  });
  const [libraryPdfForm, setLibraryPdfForm] = useState({
    title: "",
    description: "",
    fileUrl: "",
    category: "",
    assignCategory: false,
    courseId: "",
    linkToCourse: false,
    status: "published",
    isActive: true,
  });
  const [libraryPdfFile, setLibraryPdfFile] = useState<File | null>(null);
  const [libraryBulkFiles, setLibraryBulkFiles] = useState<File[]>([]);
  const [libraryBulkUploading, setLibraryBulkUploading] = useState(false);
  const [libraryBulkProgress, setLibraryBulkProgress] = useState(0);
  const [libraryBulkNotice, setLibraryBulkNotice] =
    useState<LibraryNotice | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<
    "all" | "free" | "linked" | "published"
  >("all");
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState("all");
  const [libraryBulkForm, setLibraryBulkForm] = useState({
    description: "",
    category: "",
    assignCategory: false,
    courseId: "",
    linkToCourse: false,
    status: "published",
    isActive: true,
  });
  const libraryBulkInputRef = useRef<HTMLInputElement | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | "new" | null>(null);
  const [grantingPremiumUserId, setGrantingPremiumUserId] = useState<
    string | null
  >(null);
  const [premiumPaymentDate, setPremiumPaymentDate] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [premiumGrantNotes, setPremiumGrantNotes] = useState(
    "Pago validado manualmente.",
  );
  const [userFilters, setUserFilters] = useState({
    search: "",
    role: "",
    accountType: "",
  });
  const [userForm, setUserForm] = useState({
    firstName: "",
    lastName: "",
    nickname: "",
    email: "",
    phoneNumber: "",
    planId: "free",
    accountType: "client" as "client" | "specialist",
    adminAccess: false,
    specialistAccess: false,
    profileCompleted: false,
  });
  const [chat, setChat] = useState<AdminChat | null>(null);
  const [orderChat, setOrderChat] = useState<AdminPrivateChatThread | null>(
    null,
  );
  const [orderChatOrder, setOrderChatOrder] = useState<AdminShopOrder | null>(
    null,
  );
  const [orderChatReply, setOrderChatReply] = useState("");
  const [orderChatReplyImageUrl, setOrderChatReplyImageUrl] = useState("");
  const [orderChatReplyImageName, setOrderChatReplyImageName] = useState("");
  const [orderChatReplyImageUploading, setOrderChatReplyImageUploading] =
    useState(false);
  const [orderChatReplyImageProgress, setOrderChatReplyImageProgress] =
    useState(0);
  const [orderChatReplyImageError, setOrderChatReplyImageError] = useState<
    string | null
  >(null);
  const [orderChatError, setOrderChatError] = useState<string | null>(null);
  const [orderChatLoading, setOrderChatLoading] = useState(false);
  const [sendingOrderChatReply, setSendingOrderChatReply] = useState(false);
  const [communityMessages, setCommunityMessages] = useState<
    AdminCommunityMessage[]
  >([]);
  const [communityModerations, setCommunityModerations] = useState<
    AdminCommunityModeration[]
  >([]);
  const [communityReply, setCommunityReply] = useState("");
  const [communityReplyImageUrl, setCommunityReplyImageUrl] = useState("");
  const [communityReplyImageName, setCommunityReplyImageName] = useState("");
  const [communityReplyImageUploading, setCommunityReplyImageUploading] =
    useState(false);
  const [communityReplyImageProgress, setCommunityReplyImageProgress] =
    useState(0);
  const [communityReplyImageError, setCommunityReplyImageError] = useState<
    string | null
  >(null);
  const [communityReplyError, setCommunityReplyError] = useState<string | null>(
    null,
  );
  const [sendingCommunityReply, setSendingCommunityReply] = useState(false);
  const [moderatingCommunityMessageId, setModeratingCommunityMessageId] =
    useState<string | null>(null);
  const [moderatingCommunityUserId, setModeratingCommunityUserId] = useState<
    string | null
  >(null);
  const [supportOverview, setSupportOverview] =
    useState<AdminSupportOverview | null>(null);
  const [selectedSupportTicketId, setSelectedSupportTicketId] = useState<
    string | null
  >(null);
  const [supportDetail, setSupportDetail] =
    useState<AdminSupportDetail | null>(null);
  const [supportReply, setSupportReply] = useState("");
  const [supportError, setSupportError] = useState<string | null>(null);
  const [supportLoadingTicketId, setSupportLoadingTicketId] = useState<
    string | null
  >(null);
  const [sendingSupportReply, setSendingSupportReply] = useState(false);
  const [updatingSupportTicket, setUpdatingSupportTicket] = useState(false);
  const orderChatReplyImageInputRef = useRef<HTMLInputElement | null>(null);
  const communityReplyImageInputRef = useRef<HTMLInputElement | null>(null);
  const [incidents, setIncidents] = useState<AdminIncident[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [diagnostics, setDiagnostics] = useState<BadgeDiagnosticsResult | null>(
    null,
  );
  const [auditEntries, setAuditEntries] = useState<BadgeAuditLogEntry[]>([]);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [selectedAuditEntry, setSelectedAuditEntry] =
    useState<BadgeAuditLogEntry | null>(null);
  const [courseAuditEntries, setCourseAuditEntries] = useState<
    BadgeAuditLogEntry[]
  >([]);
  const [courseAuditError, setCourseAuditError] = useState<string | null>(null);
  const [developerSection, setDeveloperSection] =
    useState<DeveloperSection>("badges");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null,
  );
  const [bookingForm, setBookingForm] = useState<BookingFormState>({
    userId: "",
    specialistId: "",
    serviceId: "",
    scheduledAt: "",
    mode: "chat",
    notes: "",
    status: "pending_payment",
  });
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [productForm, setProductForm] = useState<ProductFormState>({
    name: "",
    category: "",
    specialistId: "",
    shortDescription: "",
    description: "",
    priceAmount: "",
    priceCurrency: "USD",
    sku: "",
    status: "active",
    imageUrl: "",
    imageUrls: "",
    artwork: "",
    badge: "",
    stockQuantity: "0",
    madeToOrder: false,
    featured: false,
    tags: "",
  });
  const [operatingPanelMessage, setOperatingPanelMessage] = useState<
    string | null
  >(null);
  const [operatingPanelError, setOperatingPanelError] = useState<string | null>(
    null,
  );
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [isBookingDrawerOpen, setIsBookingDrawerOpen] = useState(false);
  const [productFilters, setProductFilters] = useState<ProductFilters>({
    search: "",
    category: "",
    status: "",
    featured: "",
    madeToOrder: "",
    sortBy: "recent",
  });
  const [auditFilters, setAuditFilters] = useState({
    badgeId: "",
    pathId: "",
    action: "",
    fieldChanged: "",
    date: "",
  });
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [badgeForm, setBadgeForm] = useState<BadgeFormState>(() =>
    buildBadgeDraft("despertar_path", 1, []),
  );
  const [selectedRouteId, setSelectedRouteId] =
    useState<BadgePathId>("despertar_path");
  const [isBadgeEditorOpen, setIsBadgeEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");
  const [badgeMessage, setBadgeMessage] = useState<string | null>(null);
  const [badgeError, setBadgeError] = useState<string | null>(null);
  const [savingBadgeId, setSavingBadgeId] = useState<string | "new" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [developerAccessGranted, setDeveloperAccessGranted] = useState(false);
  const [developerAccessModalOpen, setDeveloperAccessModalOpen] =
    useState(false);
  const [pendingDeveloperSection, setPendingDeveloperSection] =
    useState<DeveloperSection>("badges");
  const [developerPasscode, setDeveloperPasscode] = useState("");
  const [developerPasscodeError, setDeveloperPasscodeError] = useState<
    string | null
  >(null);

  const requestDeveloperAccess = useCallback(
    (section: DeveloperSection = "badges") => {
      if (developerAccessGranted) {
        setActiveSection("developer");
        setDeveloperSection(section);
        return;
      }

      setPendingDeveloperSection(section);
      setDeveloperAccessModalOpen(true);
      setDeveloperPasscode("");
      setDeveloperPasscodeError(null);
    },
    [developerAccessGranted],
  );

  const handleDeveloperPasscodeSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (developerPasscode.trim() !== "1111") {
        setDeveloperPasscodeError("Contraseña incorrecta.");
        return;
      }

      setDeveloperAccessGranted(true);
      setDeveloperAccessModalOpen(false);
      setActiveSection("developer");
      setDeveloperSection(pendingDeveloperSection);
      setDeveloperPasscode("");
      setDeveloperPasscodeError(null);
    },
    [developerPasscode, pendingDeveloperSection],
  );

  const handleSelectCourseDrawerTab = useCallback(
    (tab: CourseWorkspaceTab) => {
      setCourseDrawerTab(tab);
      if (isCourseDrawerOpen) {
        window.history.replaceState(
          {},
          "",
          buildCourseWorkspaceUrl(selectedCourseId, tab),
        );
      }
    },
    [isCourseDrawerOpen, selectedCourseId],
  );

  const openCourseWorkspaceTab = useCallback(
    (courseId: string | null, tab: CourseWorkspaceTab) => {
      const nextCourse = courseId
        ? (courses.find((course) => course.id === courseId) ?? null)
        : null;

      setActiveSection("courses");
      setIsCourseDrawerOpen(true);
      setCourseDrawerTab(tab);
      setSelectedCourseId(courseId);
      setSelectedCourseModuleId(null);
      setSelectedCourseLessonId(null);
      setSelectedCourseResourceId(null);
      if (tab !== "library") {
        setSelectedLibraryPdfId(null);
      }
      setCourseMessage(null);
      setCourseError(null);
      setCourseForm(buildCourseForm(nextCourse));
      window.history.pushState({}, "", buildCourseWorkspaceUrl(courseId, tab));
      previousCourseWorkspaceIdRef.current = courseId;
    },
    [courses],
  );

  const handleNavigateSection = useCallback(
    (section: AdminSection) => {
      if (section === "developer") {
        requestDeveloperAccess("incidents");
        return;
      }

      if (section === "courses") {
        setActiveSection("courses");
        return;
      }

      if (isCourseDrawerOpen) {
        window.history.pushState({}, "", `${adminBasePath}/`);
        setIsCourseDrawerOpen(false);
        setSelectedCourseId(null);
        setSelectedCourseModuleId(null);
        setSelectedCourseLessonId(null);
        setSelectedCourseResourceId(null);
        setSelectedLibraryPdfId(null);
        setCourseDrawerTab("data");
      }

      if (typeof window !== "undefined") {
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}${window.location.search}#${section}`,
        );
      }
      setActiveSection(section);
    },
    [isCourseDrawerOpen, requestDeveloperAccess],
  );

  useEffect(() => {
    const syncRouteState = () => {
      const route = getCourseWorkspaceRouteFromLocation();
      setIsCourseDrawerOpen(route.open);
      setCourseDrawerTab(route.tab);
      setSelectedCourseId(route.courseId);
      if (route.open) {
        setActiveSection("courses");
      }
      if (route.open) {
        setSelectedCourseModuleId(null);
        setSelectedCourseLessonId(null);
        setSelectedCourseResourceId(null);
        setSelectedLibraryPdfId(null);
      }
    };

    syncRouteState();
    window.addEventListener("popstate", syncRouteState);

    return () => {
      window.removeEventListener("popstate", syncRouteState);
    };
  }, []);

  useEffect(() => {
    if (!isCourseDrawerOpen) {
      previousCourseWorkspaceIdRef.current = undefined;
      return;
    }

    if (previousCourseWorkspaceIdRef.current === selectedCourseId) {
      return;
    }

    previousCourseWorkspaceIdRef.current = selectedCourseId;

    const selectedCourse =
      selectedCourseId == null
        ? null
        : (courses.find((course) => course.id === selectedCourseId) ?? null);

    setCourseForm(buildCourseForm(selectedCourse));
    setSelectedCourseModuleId(null);
    setSelectedCourseLessonId(null);
    setSelectedCourseResourceId(null);
    if (courseDrawerTab !== "library") {
      setSelectedLibraryPdfId(null);
    }
    setCourseMessage(null);
    setCourseError(null);
  }, [courseDrawerTab, courses, isCourseDrawerOpen, selectedCourseId]);

  const clearProtectedState = useCallback(() => {
    setLoadedProtectedResources(createProtectedResourceLoadState());
    setSpecialists([]);
    setSelectedSpecialistId(null);
    setSelectedSpecialistDetail(null);
    setSelectedSpecialistServices([]);
    setSelectedSpecialistAvailability([]);
    setSelectedSpecialistBookings([]);
    setSelectedSpecialistAudit([]);
    setSpecialistDetailTab("profile");
    setIsSpecialistDrawerOpen(false);
    setSpecialistDrawerLoading(false);
    setSpecialistDrawerError(null);
    setSpecialistFilters({
      search: "",
      featured: "",
      active: "",
      visible: "",
    });
    setSpecialistServiceDrafts({});
    setSpecialistProfileDraft({
      publicName: "",
      headline: "",
      specialty: "",
      bio: "",
      avatarUrl: "",
      isActive: true,
      isVisible: true,
    });
    setNewServiceDraft({
      name: "",
      category: "",
      description: "",
      priceAmount: "",
      priceCurrency: "USD",
      durationMinutes: "",
      isActive: true,
      isVisible: true,
    });
    setAvailabilityDraft({
      startsAt: "",
      endsAt: "",
      mode: "chat",
      isAvailable: true,
      weeklyStartDate: "",
      weeklyEndDate: "",
      weeklyStartTime: "09:00",
      weeklyEndTime: "17:00",
      weeklyWeekdays: ["1", "2", "3", "4", "5"],
    });
    setServiceFilters({
      specialistId: "",
      category: "",
      search: "",
    });
    setAgendaFilters({
      specialistId: "",
      status: "",
    });
    setBookings([]);
    setOrders([]);
    setProducts([]);
    setCourses([]);
    setCourseResources([]);
    setLibraryPdfs([]);
    setSelectedCourseId(null);
    setSelectedCourseModuleId(null);
    setSelectedCourseLessonId(null);
    setSelectedCourseResourceId(null);
    setSelectedLibraryPdfId(null);
    setIsCourseDrawerOpen(false);
    setCourseDrawerTab("data");
    setCourseMessage(null);
    setCourseError(null);
    setSavingCourseId(null);
    setCourseForm({
      title: "",
      subtitle: "",
      category: "",
      level: "Inicial",
      premium: false,
      featured: false,
      removable: true,
      estimatedHours: "",
      progressPercent: "",
      hook: "",
      description: "",
      outcomes: "",
      status: "draft",
      coverImageUrl: "",
    });
    setCourseModuleForm({
      title: "",
      summary: "",
      durationMinutes: "",
      order: "",
      status: "draft",
      isActive: true,
    });
    setCourseLessonForm({
      title: "",
      format: "video",
      durationMinutes: "",
      prompt: "",
      content: "",
      resourceUrl: "",
      order: "",
      status: "draft",
      isActive: true,
    });
    setCourseResourceForm({
      title: "",
      kind: "link",
      description: "",
      url: "",
      status: "draft",
      isActive: true,
    });
    setLibraryPdfForm({
      title: "",
      description: "",
      fileUrl: "",
      category: "",
      assignCategory: false,
      courseId: "",
      linkToCourse: false,
      status: "draft",
      isActive: true,
    });
    setUsers([]);
    setChat(null);
    setCommunityMessages([]);
    setCommunityModerations([]);
    setCommunityReply("");
    setCommunityReplyImageUrl("");
    setCommunityReplyImageName("");
    setCommunityReplyImageUploading(false);
    setCommunityReplyImageProgress(0);
    setCommunityReplyImageError(null);
    setCommunityReplyError(null);
    setSendingCommunityReply(false);
    setModeratingCommunityUserId(null);
    setSupportOverview(null);
    setSelectedSupportTicketId(null);
    setSupportDetail(null);
    setSupportReply("");
    setSupportError(null);
    setSupportLoadingTicketId(null);
    setSendingSupportReply(false);
    setUpdatingSupportTicket(false);
    setIncidents([]);
    setDiagnostics(null);
    setAuditEntries([]);
    setAuditError(null);
    setSelectedAuditEntry(null);
    setCourseAuditEntries([]);
    setCourseAuditError(null);
    setSelectedBadgeId(null);
    setBadgeForm(buildBadgeDraft("despertar_path", 1, badges));
    setSelectedRouteId("despertar_path");
    setIsBadgeEditorOpen(false);
    setEditorMode("edit");
    setBadgeMessage(null);
    setBadgeError(null);
    setSavingBadgeId(null);
    setError(null);
    setDeveloperSection("badges");
    setDeveloperAccessGranted(false);
    setDeveloperAccessModalOpen(false);
    setPendingDeveloperSection("badges");
    setDeveloperPasscode("");
    setDeveloperPasscodeError(null);
    setSelectedBookingId(null);
    setSelectedProductId(null);
    setIsProductDrawerOpen(false);
    setIsBookingDrawerOpen(false);
    setOperatingPanelMessage(null);
    setOperatingPanelError(null);
    setProductFilters({
      search: "",
      category: "",
      status: "",
      featured: "",
      madeToOrder: "",
      sortBy: "recent",
    });
  }, [badges]);

  const handleSessionInvalid = useCallback(
    (message: string) => {
      setAdminUser(null);
      setAuthStatus("unauthenticated");
      setAuthError(message);
      clearProtectedState();
    },
    [clearProtectedState],
  );

  const refreshLibraryPdfs = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/api/admin/library/pdfs`, {
      credentials: "include",
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      handleSessionInvalid("Tu sesión de admin expiró.");
      return;
    }

    if (!response.ok) {
      throw new Error("No se pudo recargar la biblioteca.");
    }

    const json = (await response.json()) as { items?: AdminLibraryPdf[] };
    setLibraryPdfs(json.items ?? []);
  }, [apiBaseUrl, handleSessionInvalid]);

  const refreshCommunityChatSnapshot = useCallback(async () => {
    const [chatResponse, communityResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/admin/chat?limit=20`, {
        credentials: "include",
        cache: "no-store",
      }),
      fetch(`${apiBaseUrl}/api/admin/chat/community?limit=40`, {
        credentials: "include",
        cache: "no-store",
      }),
    ]);

    if (
      chatResponse.status === 401 ||
      chatResponse.status === 403 ||
      communityResponse.status === 401 ||
      communityResponse.status === 403
    ) {
      handleSessionInvalid("Tu sesión de admin expiró.");
      return;
    }

    if (!chatResponse.ok || !communityResponse.ok) {
      throw new Error("No se pudo recargar el chat.");
    }

    const [chatJson, communityJson] = await Promise.all([
      chatResponse.json() as Promise<{ item: AdminChat }>,
      communityResponse.json() as Promise<{
        items: AdminCommunityMessage[];
        moderations?: AdminCommunityModeration[];
      }>,
    ]);

    setChat(chatJson.item);
    setCommunityMessages(communityJson.items ?? []);
    setCommunityModerations(communityJson.moderations ?? []);
  }, [apiBaseUrl, handleSessionInvalid]);

  const refreshSupportOverview = useCallback(async () => {
    const response = await fetch(`${apiBaseUrl}/api/admin/support?limit=50`, {
      credentials: "include",
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      handleSessionInvalid("Tu sesión de admin expiró.");
      return;
    }

    if (!response.ok) {
      throw new Error("No se pudo recargar soporte.");
    }

    const json = (await response.json()) as { item?: AdminSupportOverview };
    setSupportOverview(json.item ?? null);
  }, [apiBaseUrl, handleSessionInvalid]);

  const fetchProtectedResource = useCallback(
    (key: ProtectedResourceKey) => {
      const options: RequestInit = { credentials: "include" };
      switch (key) {
        case "bookings":
          return fetch(`${apiBaseUrl}/api/admin/bookings?limit=20`, options);
        case "specialists":
          return fetch(`${apiBaseUrl}/api/admin/specialists`, options);
        case "orders":
          return fetch(`${apiBaseUrl}/api/admin/orders`, options);
        case "products":
          return fetch(`${apiBaseUrl}/api/admin/shop/products`, options);
        case "courses":
          return fetch(`${apiBaseUrl}/api/admin/courses`, options);
        case "courseResources":
          return fetch(`${apiBaseUrl}/api/admin/course-resources`, options);
        case "libraryPdfs":
          return fetch(`${apiBaseUrl}/api/admin/library/pdfs`, options);
        case "users":
          return fetch(`${apiBaseUrl}/api/admin/users?limit=100`, options);
        case "chat":
          return fetch(`${apiBaseUrl}/api/admin/chat?limit=20`, options);
        case "community":
          return fetch(
            `${apiBaseUrl}/api/admin/chat/community?limit=40`,
            options,
          );
        case "support":
          return fetch(`${apiBaseUrl}/api/admin/support?limit=50`, options);
        case "incidents":
          return fetch(`${apiBaseUrl}/api/admin/incidents`, options);
        case "diagnostics":
          return fetch(`${apiBaseUrl}/api/badges/admin/diagnostics`, options);
        case "audit": {
          const query = new URLSearchParams();
          if (auditFilters.badgeId.trim().length > 0) {
            query.set("badgeId", auditFilters.badgeId.trim());
          }
          if (auditFilters.pathId.trim().length > 0) {
            query.set("pathId", auditFilters.pathId.trim());
          }
          if (auditFilters.action.trim().length > 0) {
            query.set("action", auditFilters.action.trim());
          }
          if (auditFilters.fieldChanged.trim().length > 0) {
            query.set("fieldChanged", auditFilters.fieldChanged.trim());
          }
          if (auditFilters.date.trim().length > 0) {
            query.set("date", auditFilters.date.trim());
          }
          return fetch(
            `${apiBaseUrl}/api/badges/admin/audit-log${query.toString().length > 0 ? `?${query.toString()}` : ""}`,
            options,
          );
        }
      }
    },
    [apiBaseUrl, auditFilters],
  );

  const applyProtectedResourcePayload = useCallback(
    async (key: ProtectedResourceKey, response: Response) => {
      switch (key) {
        case "bookings": {
          const json = (await response.json()) as { items?: AdminBooking[] };
          setBookings(json.items ?? []);
          break;
        }
        case "specialists": {
          const json = (await response.json()) as { items?: AdminSpecialist[] };
          setSpecialists(json.items ?? []);
          break;
        }
        case "orders": {
          const json = (await response.json()) as { items?: AdminShopOrder[] };
          setOrders(json.items ?? []);
          break;
        }
        case "products": {
          const json = (await response.json()) as {
            items?: AdminShopProduct[];
          };
          setProducts(json.items ?? []);
          break;
        }
        case "courses": {
          const json = (await response.json()) as { items?: AdminCourse[] };
          setCourses(json.items ?? []);
          break;
        }
        case "courseResources": {
          const json = (await response.json()) as {
            items?: AdminCourseResource[];
          };
          setCourseResources(json.items ?? []);
          break;
        }
        case "libraryPdfs": {
          const json = (await response.json()) as { items?: AdminLibraryPdf[] };
          setLibraryPdfs(json.items ?? []);
          break;
        }
        case "users": {
          const json = (await response.json()) as { items?: AdminUser[] };
          setUsers(json.items ?? []);
          break;
        }
        case "chat": {
          const json = (await response.json()) as { item: AdminChat };
          setChat(json.item);
          break;
        }
        case "community": {
          const json = (await response.json()) as {
            items?: AdminCommunityMessage[];
            moderations?: AdminCommunityModeration[];
          };
          setCommunityMessages(json.items ?? []);
          setCommunityModerations(json.moderations ?? []);
          break;
        }
        case "support": {
          const json = (await response.json()) as {
            item?: AdminSupportOverview;
          };
          setSupportOverview(json.item ?? null);
          break;
        }
        case "incidents": {
          const json = (await response.json()) as { items?: AdminIncident[] };
          setIncidents(json.items ?? []);
          break;
        }
        case "diagnostics": {
          const json = (await response.json()) as BadgeDiagnosticsResult;
          setDiagnostics(json);
          break;
        }
        case "audit": {
          const json = (await response.json()) as BadgeAuditLogResponse;
          setAuditEntries(json.items ?? []);
          setAuditError(null);
          break;
        }
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [healthResponse, badgesResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/health`),
          fetch(`${apiBaseUrl}/api/badges`),
        ]);

        if (!healthResponse.ok || !badgesResponse.ok) {
          throw new Error("No se pudo cargar la API.");
        }

        const [healthJson, badgesJson] = await Promise.all([
          healthResponse.json() as Promise<HealthResponse>,
          badgesResponse.json() as Promise<{ items: Badge[] }>,
        ]);

        if (!cancelled) {
          setHealth(healthJson);
          setBadges(badgesJson.items ?? []);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar la interfaz.",
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/admin/auth/me`, {
          credentials: "include",
        });

        if (response.status === 401 || response.status === 403) {
          if (!cancelled) {
            setAdminUser(null);
            setAuthStatus("unauthenticated");
            setAuthError(null);
          }
          return;
        }

        if (!response.ok) {
          throw new Error("No se pudo validar la sesión de admin.");
        }

        const json = (await response.json()) as { item: AdminSession };
        if (!cancelled) {
          setAdminUser(json.item);
          setAuthStatus("authenticated");
          setAuthError(null);
          setError(null);
        }
      } catch (sessionError) {
        if (!cancelled) {
          setAdminUser(null);
          setAuthStatus("unauthenticated");
          setAuthError(
            getConnectionErrorMessage(
              sessionError,
              "No se pudo validar la sesión de admin.",
            ),
          );
        }
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProtectedData() {
      if (authStatus !== "authenticated") {
        if (!cancelled) {
          setBookings([]);
          setUsers([]);
          setChat(null);
          setDiagnostics(null);
          setAuditEntries([]);
          setAuditError(null);
        }
        return;
      }

      const requiredResources = (() => {
        switch (activeSection) {
          case "specialists":
            return ["specialists", "users"] as ProtectedResourceKey[];
          case "services":
            return ["specialists"] as ProtectedResourceKey[];
          case "agenda":
          case "bookings":
            return [
              "specialists",
              "bookings",
              "users",
            ] as ProtectedResourceKey[];
          case "orders":
            return ["orders"] as ProtectedResourceKey[];
          case "shop":
            return ["products"] as ProtectedResourceKey[];
          case "courses":
            return isCourseDrawerOpen && courseDrawerTab === "library"
              ? ([
                  "courses",
                  "courseResources",
                  "libraryPdfs",
                ] as ProtectedResourceKey[])
              : (["courses", "courseResources"] as ProtectedResourceKey[]);
          case "library":
            return ["libraryPdfs", "courses"] as ProtectedResourceKey[];
          case "users":
            return ["users"] as ProtectedResourceKey[];
          case "community":
            return ["chat", "community"] as ProtectedResourceKey[];
          case "support":
            return ["support"] as ProtectedResourceKey[];
          case "developer":
            switch (developerSection) {
              case "incidents":
                return ["incidents"] as ProtectedResourceKey[];
              case "diagnostics":
                return ["diagnostics"] as ProtectedResourceKey[];
              case "audit":
                return ["audit"] as ProtectedResourceKey[];
              default:
                return [] as ProtectedResourceKey[];
            }
        }
      })();

      const resourcesToLoad = requiredResources.filter(
        (resourceKey) =>
          resourceKey === "audit" || !loadedProtectedResources[resourceKey],
      );

      if (resourcesToLoad.length === 0) {
        return;
      }

      try {
        const responses = await Promise.all(
          resourcesToLoad.map((key) => fetchProtectedResource(key)),
        );

        if (
          responses.some(
            (response) => response.status === 401 || response.status === 403,
          )
        ) {
          if (!cancelled) {
            handleSessionInvalid("Tu sesión de admin expiró.");
          }
          return;
        }

        if (responses.some((response) => !response.ok)) {
          throw new Error(
            "La sesión admin no pudo cargar las vistas protegidas.",
          );
        }

        if (!cancelled) {
          await Promise.all(
            responses.map((response, index) =>
              applyProtectedResourcePayload(resourcesToLoad[index], response),
            ),
          );
          setLoadedProtectedResources((current) => {
            const next = { ...current };
            for (const key of resourcesToLoad) {
              next[key] = true;
            }
            return next;
          });
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar la interfaz.",
          );
        }
      }
    }

    void loadProtectedData();

    return () => {
      cancelled = true;
    };
  }, [
    activeSection,
    applyProtectedResourcePayload,
    authStatus,
    courseDrawerTab,
    developerSection,
    fetchProtectedResource,
    handleSessionInvalid,
    isCourseDrawerOpen,
    loadedProtectedResources,
  ]);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      return;
    }

    const eventSource = new EventSource(`${apiBaseUrl}/api/content/events`, {
      withCredentials: true,
    });

    const handleContentChange = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as {
          entity?: string;
          action?: string;
        };

        if (payload.entity === "libraryPdf" || payload.entity === "all") {
          void refreshLibraryPdfs();
        }

        if (
          activeSection === "community" &&
          (payload.entity === "communityChat" || payload.entity === "all")
        ) {
          void refreshCommunityChatSnapshot();
        }

        if (
          activeSection === "support" &&
          (payload.entity === "support" || payload.entity === "all")
        ) {
          void refreshSupportOverview();
        }
      } catch {
        // Ignore malformed events and keep listening.
      }
    };

    eventSource.addEventListener(
      "content.changed",
      handleContentChange as EventListener,
    );

    return () => {
      eventSource.removeEventListener(
        "content.changed",
        handleContentChange as EventListener,
      );
      eventSource.close();
    };
  }, [
    activeSection,
    apiBaseUrl,
    authStatus,
    refreshCommunityChatSnapshot,
    refreshLibraryPdfs,
    refreshSupportOverview,
  ]);

  useEffect(() => {
    if (authStatus !== "authenticated" || activeSection !== "community") {
      return;
    }

    let cancelled = false;
    const refreshInterval = window.setInterval(() => {
      if (!cancelled) {
        void refreshCommunityChatSnapshot();
      }
    }, 4000);

    const handleVisibilityChange = () => {
      if (!document.hidden && !cancelled) {
        void refreshCommunityChatSnapshot();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void refreshCommunityChatSnapshot();

    return () => {
      cancelled = true;
      window.clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeSection, authStatus, refreshCommunityChatSnapshot]);

  useEffect(() => {
    let cancelled = false;

    async function loadCourseAudit() {
      if (
        !isCourseDrawerOpen ||
        !selectedCourseId ||
        courseDrawerTab !== "history"
      ) {
        if (!cancelled) {
          setCourseAuditEntries([]);
          setCourseAuditError(null);
        }
        return;
      }

      try {
        const response = await fetch(
          `${apiBaseUrl}/api/admin/courses/${encodeURIComponent(selectedCourseId)}/audit-log`,
          {
            credentials: "include",
          },
        );

        if (response.status === 401 || response.status === 403) {
          if (!cancelled) {
            handleSessionInvalid("Tu sesión de admin expiró.");
          }
          return;
        }

        if (!response.ok) {
          throw new Error("No se pudo cargar el historial del curso.");
        }

        const json = (await response.json()) as {
          items: Array<
            BadgeAuditLogEntry & {
              entityType: string;
              entityId: string;
              courseId: string;
              courseName?: string | null;
              elementLabel?: string;
            }
          >;
        };

        if (!cancelled) {
          const nextEntries = (json.items ?? []).map((entry) => ({
            ...entry,
            badgeId: entry.courseId,
            badgeName:
              entry.courseName ?? entry.elementLabel ?? entry.entityType,
            pathId: null,
          }));
          setCourseAuditEntries(nextEntries);
          setCourseAuditError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setCourseAuditError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el historial del curso.",
          );
        }
      }
    }

    void loadCourseAudit();

    return () => {
      cancelled = true;
    };
  }, [
    courseDrawerTab,
    handleSessionInvalid,
    isCourseDrawerOpen,
    selectedCourseId,
  ]);

  useEffect(() => {
    if (selectedBadgeId == null) {
      return;
    }

    const selectedBadge =
      badges.find((badge) => badge.id === selectedBadgeId) ?? null;
    if (selectedBadge) {
      setBadgeForm(badgeToForm(selectedBadge));
    }
  }, [badges, selectedBadgeId]);

  useEffect(() => {
    if (selectedBadgeId !== null) {
      return;
    }

    setBadgeForm((current) =>
      reseedBadgeDraft(
        current,
        current.pathId,
        Number.parseInt(current.stepIndex, 10) || 1,
        badges,
      ),
    );
  }, [badges, selectedBadgeId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedAuditEntry(null);
      }
    }

    if (selectedAuditEntry) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedAuditEntry]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = loginEmail.trim();
    const password = loginPassword.trim();

    if (!email || !password) {
      setAuthError("Ingresa tu email y tu contraseña.");
      return;
    }

    setLoginLoading(true);
    setAuthError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const json = (await response.json()) as {
        item?: AdminSession;
        error?: string;
      };

      if (!response.ok || !json.item) {
        throw new Error(json.error ?? "No se pudo iniciar sesión.");
      }

      setAdminUser(json.item);
      setAuthStatus("authenticated");
      setAuthError(null);
      setError(null);
      setLoginPassword("");
    } catch (loginException) {
      setAdminUser(null);
      setAuthStatus("unauthenticated");
      setAuthError(
        getConnectionErrorMessage(loginException, "No se pudo iniciar sesión."),
      );
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch(`${apiBaseUrl}/api/admin/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Cerrar sesión localmente aunque falle el request.
    } finally {
      setAuthError(null);
      setAdminUser(null);
      setAuthStatus("unauthenticated");
      clearProtectedState();
    }
  }

  async function handleSendCommunityReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = communityReply.trim();
    const imageUrl = communityReplyImageUrl.trim();
    if (!body && !imageUrl) {
      setCommunityReplyError("Escribe un mensaje o adjunta una imagen.");
      return;
    }

    if (communityReplyImageUploading) {
      setCommunityReplyError("Espera a que termine de subirse la imagen.");
      return;
    }

    setSendingCommunityReply(true);
    setCommunityReplyError(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/admin/chat/community/messages`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            body,
            imageUrl: imageUrl.length > 0 ? imageUrl : undefined,
          }),
        },
      );

      const json = (await response.json()) as {
        items?: AdminCommunityMessage[];
        moderations?: AdminCommunityModeration[];
        error?: string;
      };

      if (response.status === 401 || response.status === 403) {
        handleSessionInvalid("Tu sesión de admin expiró.");
        return;
      }

      if (!response.ok) {
        throw new Error(json.error ?? "No se pudo responder al chat.");
      }

      setCommunityMessages(json.items ?? []);
      setCommunityModerations(json.moderations ?? communityModerations);
      setCommunityReply("");
      setCommunityReplyImageUrl("");
      setCommunityReplyImageName("");
      setCommunityReplyImageProgress(0);
      setCommunityReplyImageError(null);
      if (communityReplyImageInputRef.current) {
        communityReplyImageInputRef.current.value = "";
      }
    } catch (sendError) {
      setCommunityReplyError(
        sendError instanceof Error
          ? sendError.message
          : "No se pudo responder al chat.",
      );
    } finally {
      setSendingCommunityReply(false);
    }
  }

  async function uploadCommunityReplyImage(file: File): Promise<string> {
    setCommunityReplyImageUploading(true);
    setCommunityReplyImageProgress(0);
    setCommunityReplyImageError(null);

    try {
      const publicUrl = await new Promise<string>((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", "general");

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${apiBaseUrl}/api/admin/uploads`);
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            return;
          }
          setCommunityReplyImageProgress(
            Math.round((event.loaded / event.total) * 100),
          );
        };

        xhr.onerror = () => reject(new Error("No se pudo subir la imagen."));
        xhr.onload = () => {
          try {
            const payload = JSON.parse(xhr.responseText) as {
              item?: { publicUrl?: string };
              error?: string;
            };

            if (
              xhr.status < 200 ||
              xhr.status >= 300 ||
              !payload.item?.publicUrl
            ) {
              reject(new Error(payload.error ?? "No se pudo subir la imagen."));
              return;
            }

            resolve(payload.item.publicUrl);
          } catch {
            reject(new Error("No se pudo leer la respuesta de la imagen."));
          }
        };

        xhr.send(formData);
      });

      return publicUrl;
    } finally {
      setCommunityReplyImageUploading(false);
    }
  }

  async function handleCommunityReplyImageChange(file: File | null) {
    if (!file) {
      setCommunityReplyImageUrl("");
      setCommunityReplyImageName("");
      setCommunityReplyImageProgress(0);
      setCommunityReplyImageError(null);
      return;
    }

    setCommunityReplyImageName(file.name);
    setCommunityReplyImageUrl("");
    try {
      const publicUrl = await uploadCommunityReplyImage(file);
      setCommunityReplyImageUrl(publicUrl);
    } catch (uploadError) {
      setCommunityReplyImageError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo subir la imagen.",
      );
      setCommunityReplyImageName("");
      setCommunityReplyImageUrl("");
      setCommunityReplyImageProgress(0);
      if (communityReplyImageInputRef.current) {
        communityReplyImageInputRef.current.value = "";
      }
    }
  }

  async function handleModerateCommunityMessage(
    messageId: string,
    action: "delete-message" | "delete-image",
  ) {
    const endpoint =
      action === "delete-image"
        ? `${apiBaseUrl}/api/admin/chat/community/messages/${messageId}/image`
        : `${apiBaseUrl}/api/admin/chat/community/messages/${messageId}`;
    const fallbackError =
      action === "delete-image"
        ? "No se pudo eliminar la imagen."
        : "No se pudo eliminar el mensaje.";

    setModeratingCommunityMessageId(messageId);
    setCommunityReplyError(null);

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        credentials: "include",
      });

      const json = (await response.json()) as {
        items?: AdminCommunityMessage[];
        moderations?: AdminCommunityModeration[];
        error?: string;
      };

      if (response.status === 401 || response.status === 403) {
        handleSessionInvalid("Tu sesión de admin expiró.");
        return;
      }

      if (!response.ok) {
        throw new Error(json.error ?? fallbackError);
      }

      setCommunityMessages(json.items ?? []);
      setCommunityModerations(json.moderations ?? communityModerations);
    } catch (moderationError) {
      setCommunityReplyError(
        moderationError instanceof Error
          ? moderationError.message
          : fallbackError,
      );
    } finally {
      setModeratingCommunityMessageId(null);
    }
  }

  async function handleModerateCommunityUser(
    userId: string,
    action: "mute" | "ban" | "clear",
  ) {
    const reason =
      action === "clear"
        ? ""
        : (window.prompt(
            action === "mute"
              ? "Motivo del silencio temporal:"
              : "Motivo del baneo temporal:",
            "",
          ) ?? "");

    setModeratingCommunityUserId(userId);
    setCommunityReplyError(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/admin/chat/community/moderation`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            userId,
            action,
            durationHours: action === "mute" ? 24 : action === "ban" ? 168 : 0,
            reason,
          }),
        },
      );

      const json = (await response.json()) as {
        moderations?: AdminCommunityModeration[];
        error?: string;
      };

      if (response.status === 401 || response.status === 403) {
        handleSessionInvalid("Tu sesión de admin expiró.");
        return;
      }

      if (!response.ok) {
        throw new Error(
          json.error ?? "No se pudo actualizar la moderación del chat.",
        );
      }

      setCommunityModerations(json.moderations ?? []);
    } catch (moderationError) {
      setCommunityReplyError(
        moderationError instanceof Error
          ? moderationError.message
          : "No se pudo actualizar la moderación del chat.",
      );
    } finally {
      setModeratingCommunityUserId(null);
    }
  }

  async function handleOpenSupportTicket(ticketId: string) {
    setSelectedSupportTicketId(ticketId);
    setSupportLoadingTicketId(ticketId);
    setSupportError(null);
    setSupportReply("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/admin/support/${encodeURIComponent(ticketId)}`,
        {
          credentials: "include",
          cache: "no-store",
        },
      );
      const json = (await response.json()) as {
        item?: AdminSupportDetail;
        error?: string;
      };

      if (response.status === 401 || response.status === 403) {
        handleSessionInvalid("Tu sesión de admin expiró.");
        return;
      }
      if (!response.ok || !json.item) {
        throw new Error(json.error ?? "No se pudo cargar el ticket.");
      }

      setSupportDetail(json.item);
    } catch (loadError) {
      setSupportError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el ticket.",
      );
    } finally {
      setSupportLoadingTicketId(null);
    }
  }

  async function handleUpdateSupportTicket(
    ticketId: string,
    payload: {
      status?: AdminSupportTicketStatus;
      priority?: AdminSupportTicketPriority;
    },
  ) {
    setUpdatingSupportTicket(true);
    setSupportError(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/admin/support/${encodeURIComponent(ticketId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const json = (await response.json()) as {
        item?: AdminSupportDetail;
        error?: string;
      };

      if (response.status === 401 || response.status === 403) {
        handleSessionInvalid("Tu sesión de admin expiró.");
        return;
      }
      if (!response.ok || !json.item) {
        throw new Error(json.error ?? "No se pudo actualizar el ticket.");
      }

      setSupportDetail(json.item);
      await refreshSupportOverview();
    } catch (updateError) {
      setSupportError(
        updateError instanceof Error
          ? updateError.message
          : "No se pudo actualizar el ticket.",
      );
    } finally {
      setUpdatingSupportTicket(false);
    }
  }

  async function handleSendSupportReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = supportReply.trim();
    const ticketId = supportDetail?.ticket.id ?? selectedSupportTicketId ?? "";
    if (!ticketId) {
      setSupportError("Selecciona un ticket para responder.");
      return;
    }
    if (!body) {
      setSupportError("Escribe una respuesta para soporte.");
      return;
    }

    setSendingSupportReply(true);
    setSupportError(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/admin/support/${encodeURIComponent(ticketId)}/messages`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ body }),
        },
      );
      const json = (await response.json()) as {
        item?: AdminSupportDetail;
        error?: string;
      };

      if (response.status === 401 || response.status === 403) {
        handleSessionInvalid("Tu sesión de admin expiró.");
        return;
      }
      if (!response.ok || !json.item) {
        throw new Error(json.error ?? "No se pudo responder soporte.");
      }

      setSupportDetail(json.item);
      setSupportReply("");
      await refreshSupportOverview();
    } catch (sendError) {
      setSupportError(
        sendError instanceof Error
          ? sendError.message
          : "No se pudo responder soporte.",
      );
    } finally {
      setSendingSupportReply(false);
    }
  }

  function handleSelectBadge(badge: Badge) {
    setSelectedBadgeId(badge.id);
    setBadgeMessage(null);
    setBadgeError(null);
    setBadgeForm(badgeToForm(badge));
    setSelectedRouteId(badge.pathId);
    requestDeveloperAccess("badges");
    setEditorMode("edit");
    setIsBadgeEditorOpen(true);
  }

  function handleViewBadgeHistory(badge: Badge) {
    setAuditFilters((current) => ({
      ...current,
      badgeId: badge.id,
      pathId: badge.pathId,
    }));
    requestDeveloperAccess("audit");
  }

  function handleOpenAuditEntry(entry: BadgeAuditLogEntry) {
    setSelectedAuditEntry(entry);
  }

  function handleCloseAuditEntry() {
    setSelectedAuditEntry(null);
  }

  function handleCreateBadge(pathId?: BadgePathId, stepIndex = 1) {
    setSelectedBadgeId(null);
    setBadgeMessage(null);
    setBadgeError(null);
    setEditorMode("edit");
    const nextPathId = pathId ?? selectedRouteId ?? "despertar_path";
    setSelectedRouteId(nextPathId);
    requestDeveloperAccess("badges");
    setBadgeForm(buildBadgeDraft(nextPathId, stepIndex, badges));
    setIsBadgeEditorOpen(true);
  }

  function handleOpenProductDrawer(product?: AdminShopProduct) {
    const nextProduct = product ?? null;
    const specialistId = nextProduct?.specialistId ?? specialists[0]?.id ?? "";
    setSelectedProductId(nextProduct?.id ?? null);
    setProductForm(buildProductDraft(nextProduct, specialistId));
    setOperatingPanelMessage(null);
    setOperatingPanelError(null);
    setActiveSection("shop");
    setIsProductDrawerOpen(true);
  }

  function handleCloseProductDrawer() {
    setIsProductDrawerOpen(false);
    setSelectedProductId(null);
    setOperatingPanelError(null);
  }

  function handleCloseCourseDrawer() {
    window.history.pushState({}, "", `${adminBasePath}/courses`);
    setIsCourseDrawerOpen(false);
    setSelectedCourseId(null);
    setSelectedCourseModuleId(null);
    setSelectedCourseLessonId(null);
    setSelectedCourseResourceId(null);
    setSelectedLibraryPdfId(null);
    setCourseError(null);
    setCourseAuditEntries([]);
    setCourseAuditError(null);
  }

  function resetLibraryPdfDraft(pdf?: AdminLibraryPdf | null) {
    const nextStatus = pdf?.status === "published" ? "published" : "draft";
    setSelectedLibraryPdfId(pdf?.id ?? null);
    setLibraryPdfFile(null);
    setLibraryPdfForm({
      title: pdf?.title ?? "",
      description: pdf?.description ?? "",
      fileUrl: pdf?.fileUrl ?? "",
      category: pdf?.category ?? "",
      assignCategory: Boolean(pdf?.category?.trim()),
      courseId: pdf?.courseId ?? "",
      linkToCourse: Boolean(pdf?.courseId),
      status: nextStatus,
      isActive: pdf?.isActive ?? true,
    });
  }

  async function handleSaveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCourseMessage(null);
    setCourseError(null);
    const wasEditing = Boolean(selectedCourseId);
    setSavingCourseId(wasEditing ? selectedCourseId : "new");
    const payload = {
      title: courseForm.title.trim(),
      subtitle: courseForm.subtitle.trim(),
      category: courseForm.category.trim(),
      level: courseForm.level.trim(),
      premium: courseForm.premium,
      featured: courseForm.featured,
      removable: courseForm.removable,
      estimatedHours: Number(courseForm.estimatedHours || 0),
      progressPercent: Number(courseForm.progressPercent || 0),
      hook: courseForm.hook.trim(),
      description: courseForm.description.trim(),
      outcomes: courseForm.outcomes
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      status: courseForm.status,
      coverImageUrl: courseForm.coverImageUrl.trim(),
    };

    try {
      const response = await fetch(
        selectedCourseId
          ? `${apiBaseUrl}/api/admin/courses/${encodeURIComponent(selectedCourseId)}`
          : `${apiBaseUrl}/api/admin/courses`,
        {
          method: selectedCourseId ? "PATCH" : "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const json = (await response.json()) as {
        item?: AdminCourse;
        error?: string;
      };
      if (!response.ok || !json.item) {
        setCourseError(json.error ?? "No se pudo guardar el curso.");
        return;
      }
      const savedCourse = json.item;

      setCourses((current) => {
        const existingIndex = current.findIndex(
          (item) => item.id === savedCourse.id,
        );
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = savedCourse;
          return next;
        }
        return [savedCourse, ...current];
      });
      setSelectedCourseId(savedCourse.id);
      setCourseForm({
        title: savedCourse.title ?? "",
        subtitle: savedCourse.subtitle ?? "",
        category: savedCourse.category ?? "",
        level: savedCourse.level ?? "Inicial",
        premium: savedCourse.premium ?? false,
        featured: savedCourse.featured ?? false,
        removable: savedCourse.removable ?? true,
        estimatedHours: savedCourse.estimatedHours?.toString() ?? "",
        progressPercent: savedCourse.progressPercent?.toString() ?? "",
        hook: savedCourse.hook ?? "",
        description: savedCourse.description ?? "",
        outcomes: savedCourse.outcomes?.join("\n") ?? "",
        status: savedCourse.status ?? "draft",
        coverImageUrl: savedCourse.coverImageUrl ?? "",
      });
      setCourseMessage(wasEditing ? "Curso actualizado." : "Curso creado.");
    } catch (saveError) {
      setCourseError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el curso.",
      );
    } finally {
      setSavingCourseId(null);
    }
  }

  async function handlePublishCourse(
    nextStatus: "publish" | "unpublish" | "archive",
  ) {
    if (!selectedCourseId) {
      return;
    }

    setCourseMessage(null);
    setCourseError(null);
    setSavingCourseId(selectedCourseId);
    try {
      const response = await fetch(
        nextStatus === "archive"
          ? `${apiBaseUrl}/api/admin/courses/${encodeURIComponent(selectedCourseId)}`
          : `${apiBaseUrl}/api/admin/courses/${encodeURIComponent(selectedCourseId)}/${nextStatus === "publish" ? "publish" : "unpublish"}`,
        {
          method: nextStatus === "archive" ? "DELETE" : "POST",
          credentials: "include",
        },
      );
      const json = (await response.json()) as {
        item?: AdminCourse;
        error?: string;
      };
      if (!response.ok || !json.item) {
        setCourseError(json.error ?? "No se pudo actualizar la publicación.");
        return;
      }
      const savedCourse = json.item;
      setCourses((current) =>
        current.map((item) =>
          item.id === savedCourse.id ? savedCourse : item,
        ),
      );
      setCourseMessage(
        nextStatus === "publish"
          ? "Curso publicado."
          : nextStatus === "unpublish"
            ? "Curso pasado a borrador."
            : "Curso archivado.",
      );
    } catch (publishError) {
      setCourseError(
        publishError instanceof Error
          ? publishError.message
          : "No se pudo actualizar la publicación.",
      );
    } finally {
      setSavingCourseId(null);
    }
  }

  async function handleSaveCourseModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourseId) {
      return;
    }
    setCourseMessage(null);
    setCourseError(null);
    const payload = {
      title: courseModuleForm.title.trim(),
      summary: courseModuleForm.summary.trim(),
      durationMinutes: Number(courseModuleForm.durationMinutes || 0),
      order: Number(courseModuleForm.order || 0),
      status: courseModuleForm.status,
      isActive: courseModuleForm.isActive,
    };
    const response = await fetch(
      selectedCourseModuleId
        ? `${apiBaseUrl}/api/admin/courses/${encodeURIComponent(selectedCourseId)}/modules/${encodeURIComponent(selectedCourseModuleId)}`
        : `${apiBaseUrl}/api/admin/courses/${encodeURIComponent(selectedCourseId)}/modules`,
      {
        method: selectedCourseModuleId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const json = (await response.json()) as {
      item?: AdminCourse;
      error?: string;
    };
    if (!response.ok || !json.item) {
      setCourseError(json.error ?? "No se pudo guardar el módulo.");
      return;
    }
    const savedCourse = json.item;
    setCourses((current) =>
      current.map((item) => (item.id === savedCourse.id ? savedCourse : item)),
    );
    setCourseMessage(
      selectedCourseModuleId ? "Módulo actualizado." : "Módulo creado.",
    );
  }

  async function handleSaveCourseLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourseId || !selectedCourseModuleId) {
      setCourseError("Selecciona un curso y un módulo.");
      return;
    }
    setCourseMessage(null);
    setCourseError(null);
    const payload = {
      title: courseLessonForm.title.trim(),
      format: courseLessonForm.format.trim(),
      durationMinutes: Number(courseLessonForm.durationMinutes || 0),
      prompt: courseLessonForm.prompt.trim(),
      content: courseLessonForm.content.trim(),
      resourceUrl: courseLessonForm.resourceUrl.trim(),
      order: Number(courseLessonForm.order || 0),
      status: courseLessonForm.status,
      isActive: courseLessonForm.isActive,
    };
    const response = await fetch(
      selectedCourseLessonId
        ? `${apiBaseUrl}/api/admin/courses/${encodeURIComponent(selectedCourseId)}/modules/${encodeURIComponent(selectedCourseModuleId)}/lessons/${encodeURIComponent(selectedCourseLessonId)}`
        : `${apiBaseUrl}/api/admin/courses/${encodeURIComponent(selectedCourseId)}/modules/${encodeURIComponent(selectedCourseModuleId)}/lessons`,
      {
        method: selectedCourseLessonId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const json = (await response.json()) as {
      item?: AdminCourse;
      error?: string;
    };
    if (!response.ok || !json.item) {
      setCourseError(json.error ?? "No se pudo guardar la lección.");
      return;
    }
    const savedCourse = json.item;
    setCourses((current) =>
      current.map((item) => (item.id === savedCourse.id ? savedCourse : item)),
    );
    setCourseMessage(
      selectedCourseLessonId ? "Lección actualizada." : "Lección creada.",
    );
  }

  async function handleSaveCourseResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourseId) {
      setCourseError("Selecciona un curso.");
      return;
    }

    setCourseMessage(null);
    setCourseError(null);
    const response = await fetch(
      `${apiBaseUrl}/api/admin/course-resources${selectedCourseResourceId ? `/${encodeURIComponent(selectedCourseId)}/${encodeURIComponent(selectedCourseResourceId)}` : ""}`,
      {
        method: selectedCourseResourceId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: selectedCourseResourceId ?? undefined,
          title: courseResourceForm.title.trim(),
          kind: courseResourceForm.kind.trim(),
          description: courseResourceForm.description.trim(),
          url: courseResourceForm.url.trim(),
          status: courseResourceForm.status,
          isActive: courseResourceForm.isActive,
          courseId: selectedCourseId,
        }),
      },
    );
    const json = (await response.json()) as { item?: unknown; error?: string };
    if (!response.ok || !json.item) {
      setCourseError(json.error ?? "No se pudo guardar el recurso.");
      return;
    }
    const savedItem = json.item as AdminCourseResource;
    setCourseResources((current) => {
      const existingIndex = current.findIndex(
        (item) => item.id === savedItem.id,
      );
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = savedItem;
        return next;
      }
      return [savedItem, ...current];
    });
    setSelectedCourseResourceId(savedItem.id);
    setCourseMessage(
      selectedCourseResourceId ? "Recurso actualizado." : "Recurso creado.",
    );
  }

  async function handleSaveLibraryPdf(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCourseMessage(null);
    setCourseError(null);
    if (!libraryPdfForm.title.trim()) {
      setCourseError("El título del PDF es obligatorio.");
      return;
    }
    if (!libraryPdfFile && !libraryPdfForm.fileUrl.trim()) {
      setCourseError("Selecciona un archivo PDF para subir.");
      return;
    }
    const normalizedCategory = libraryPdfForm.assignCategory
      ? formatLibraryCategoryLabel(libraryPdfForm.category)
      : "";
    if (libraryPdfForm.assignCategory && !normalizedCategory.trim()) {
      setCourseError("Elige o crea una categoría para el PDF.");
      return;
    }

    const formData = new FormData();
    formData.append("title", libraryPdfForm.title.trim());
    formData.append("description", libraryPdfForm.description.trim());
    formData.append("category", normalizedCategory);
    const selectedCourseForLibrary = libraryPdfForm.linkToCourse
      ? libraryPdfForm.courseId.trim() || selectedCourseId || ""
      : "";
    if (libraryPdfForm.linkToCourse && !selectedCourseForLibrary) {
      setCourseError(
        "Selecciona un curso para vincular este PDF o desactiva la vinculación.",
      );
      return;
    }
    formData.append("courseId", selectedCourseForLibrary);
    formData.append("status", libraryPdfForm.status);
    formData.append("isActive", String(libraryPdfForm.isActive));
    if (selectedLibraryPdfId) {
      formData.append("id", selectedLibraryPdfId);
    }
    if (libraryPdfFile) {
      formData.append("file", libraryPdfFile);
    } else if (libraryPdfForm.fileUrl.trim()) {
      formData.append("fileUrl", libraryPdfForm.fileUrl.trim());
    }

    const response = await fetch(
      `${apiBaseUrl}/api/admin/library/pdfs${selectedLibraryPdfId ? `/${encodeURIComponent(selectedLibraryPdfId)}` : ""}`,
      {
        method: selectedLibraryPdfId ? "PATCH" : "POST",
        credentials: "include",
        body: formData,
      },
    );
    const json = (await response.json()) as { item?: unknown; error?: string };
    if (!response.ok || !json.item) {
      setCourseError(json.error ?? "No se pudo guardar el PDF.");
      return;
    }
    const savedItem = json.item as AdminLibraryPdf;
    setLibraryPdfs((current) => {
      const existingIndex = current.findIndex(
        (item) => item.id === savedItem.id,
      );
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = savedItem;
        return next;
      }
      return [savedItem, ...current];
    });
    setSelectedLibraryPdfId(savedItem.id);
    setLibraryPdfFile(null);
    setLibraryPdfForm({
      title: savedItem.title,
      description: savedItem.description,
      fileUrl: savedItem.fileUrl,
      category: savedItem.category,
      assignCategory: Boolean(savedItem.category?.trim()),
      courseId: savedItem.courseId ?? "",
      linkToCourse: Boolean(savedItem.courseId),
      status: savedItem.status ?? "draft",
      isActive: savedItem.isActive ?? true,
    });
    await refreshLibraryPdfs();
    setCourseMessage(
      selectedLibraryPdfId ? "PDF actualizado." : "PDF agregado.",
    );
  }

  function buildBulkUploadSummary() {
    const count = libraryBulkFiles.length;
    const category = libraryBulkForm.assignCategory
      ? formatLibraryCategoryLabel(libraryBulkForm.category)
      : "General";
    const courseId = libraryBulkForm.linkToCourse
      ? libraryBulkForm.courseId.trim() || selectedCourseId || ""
      : "";
    const courseLabel = courseId
      ? (courses.find((course) => course.id === courseId)?.title ??
        "Curso seleccionado")
      : "Sin vínculo";

    return {
      count,
      category,
      courseLabel,
    };
  }

  async function performBulkLibraryUpload() {
    setCourseMessage(null);
    setCourseError(null);
    setLibraryBulkNotice(null);
    setLibraryBulkProgress(0);

    if (libraryBulkFiles.length === 0) {
      setLibraryBulkNotice({
        tone: "error",
        title: "Sin archivos",
        message: "Selecciona uno o más PDFs antes de publicar la carpeta.",
      });
      return;
    }

    const normalizedCategory = libraryBulkForm.assignCategory
      ? formatLibraryCategoryLabel(libraryBulkForm.category)
      : "";
    if (libraryBulkForm.assignCategory && !normalizedCategory.trim()) {
      setLibraryBulkNotice({
        tone: "warning",
        title: "Categoría incompleta",
        message: "Elige o crea una categoría para los PDFs antes de continuar.",
      });
      return;
    }

    setLibraryBulkUploading(true);
    setLibraryBulkProgress(0);

    try {
      const formData = new FormData();
      const courseId = libraryBulkForm.linkToCourse
        ? libraryBulkForm.courseId.trim() || selectedCourseId || ""
        : "";
      if (libraryBulkForm.linkToCourse && !courseId) {
        throw new Error(
          "Selecciona un curso para vincular estos PDFs o desactiva la vinculación.",
        );
      }
      formData.append("description", libraryBulkForm.description.trim());
      formData.append("category", normalizedCategory);
      formData.append("courseId", courseId);
      formData.append("status", libraryBulkForm.status || "published");
      formData.append("isActive", String(libraryBulkForm.isActive));
      libraryBulkFiles.forEach((file) => {
        formData.append("file", file);
      });

      const json = await new Promise<{
        items?: AdminLibraryPdf[];
        error?: string;
        warning?: string;
        failures?: LibraryBulkFailure[];
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${apiBaseUrl}/api/admin/library/pdfs/bulk`);
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            return;
          }

          setLibraryBulkProgress(
            Math.round((event.loaded / event.total) * 100),
          );
        };

        xhr.onerror = () => {
          reject(new Error("No se pudieron subir los PDFs."));
        };

        xhr.onload = () => {
          try {
            const payload = JSON.parse(xhr.responseText) as {
              items?: AdminLibraryPdf[];
              error?: string;
              warning?: string;
              failures?: LibraryBulkFailure[];
            };
            if (xhr.status < 200 || xhr.status >= 300) {
              reject(
                new Error(payload.error ?? "No se pudieron subir los PDFs."),
              );
              return;
            }
            resolve(payload);
          } catch {
            reject(new Error("No se pudo leer la respuesta de subida."));
          }
        };

        xhr.send(formData);
      });

      if (!json.items || json.items.length === 0) {
        throw new Error(json.error ?? "No se pudo subir ningún PDF.");
      }

      setLibraryPdfs((current) => {
        const next = [...json.items!, ...current];
        const seen = new Set<string>();
        return next.filter((item) => {
          if (seen.has(item.id)) {
            return false;
          }
          seen.add(item.id);
          return true;
        });
      });

      setLibraryBulkFiles([]);
      if (libraryBulkInputRef.current) {
        libraryBulkInputRef.current.value = "";
      }
      await refreshLibraryPdfs();
      setLibraryFilter("all");
      setLibrarySearch("");

      const failures = json.failures ?? [];
      if (failures.length > 0) {
        setLibraryBulkNotice({
          tone: "warning",
          title: "Carga parcial",
          message:
            json.warning ??
            `Se publicaron ${json.items.length} PDF(s) y ${failures.length} quedaron pendientes.`,
          details: failures
            .slice(0, 4)
            .map((failure) => `${failure.fileName}: ${failure.error}`),
        });
      } else {
        setLibraryBulkNotice({
          tone: "success",
          title: "Carga completada",
          message: `${json.items.length} PDF(s) publicados y visibles en la biblioteca.`,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron subir los PDFs.";
      setLibraryBulkNotice({
        tone: "error",
        title: "No se pudo publicar",
        message,
      });
      setCourseError(message);
    } finally {
      setLibraryBulkUploading(false);
      setTimeout(() => setLibraryBulkProgress(0), 1000);
    }
  }

  async function handleSaveBulkLibraryPdfs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCourseMessage(null);
    setCourseError(null);
    setLibraryBulkNotice(null);

    if (libraryBulkFiles.length === 0) {
      setLibraryBulkNotice({
        tone: "error",
        title: "Sin archivos",
        message: "Selecciona uno o más PDFs para subir.",
      });
      return;
    }

    const normalizedCategory = libraryBulkForm.assignCategory
      ? formatLibraryCategoryLabel(libraryBulkForm.category)
      : "";
    if (libraryBulkForm.assignCategory && !normalizedCategory.trim()) {
      setLibraryBulkNotice({
        tone: "warning",
        title: "Categoría incompleta",
        message: "Elige o crea una categoría para los PDFs antes de continuar.",
      });
      return;
    }

    if (libraryBulkForm.linkToCourse) {
      const courseId =
        libraryBulkForm.courseId.trim() || selectedCourseId || "";
      if (!courseId) {
        setLibraryBulkNotice({
          tone: "warning",
          title: "Falta curso",
          message:
            "Selecciona un curso o desactiva la vinculación para continuar.",
        });
        return;
      }
    }

    await performBulkLibraryUpload();
  }

  async function handleLibraryPdfAction(
    pdfId: string,
    action: "publish" | "archive" | "delete",
  ) {
    setCourseMessage(null);
    setCourseError(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/admin/library/pdfs/${encodeURIComponent(pdfId)}${action === "publish" ? "/publish" : action === "archive" ? "/archive" : ""}`,
        {
          method: action === "delete" ? "DELETE" : "POST",
          credentials: "include",
        },
      );

      const json = (await response.json()) as {
        item?: AdminLibraryPdf;
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || (action === "delete" ? !json.ok : !json.item)) {
        throw new Error(
          json.error ??
            (action === "publish"
              ? "No se pudo publicar el PDF."
              : action === "archive"
                ? "No se pudo archivar el PDF."
                : "No se pudo eliminar el PDF."),
        );
      }

      if (action === "delete") {
        setLibraryPdfs((current) =>
          current.filter((item) => item.id !== pdfId),
        );
        if (selectedLibraryPdfId === pdfId) {
          resetLibraryPdfDraft(null);
        }
      } else {
        const savedItem = json.item!;
        setLibraryPdfs((current) =>
          current.map((item) => (item.id === savedItem.id ? savedItem : item)),
        );
        if (selectedLibraryPdfId === pdfId) {
          resetLibraryPdfDraft(savedItem);
        }
      }
      await refreshLibraryPdfs();

      setCourseMessage(
        action === "publish"
          ? "PDF publicado."
          : action === "archive"
            ? "PDF archivado."
            : "PDF eliminado.",
      );
    } catch (actionError) {
      setCourseError(
        actionError instanceof Error
          ? actionError.message
          : "No se pudo completar la acción.",
      );
    }
  }

  function handleOpenBookingDrawer(
    booking?: AdminBooking,
    specialistHintId?: string,
  ) {
    const nextBooking = booking ?? null;
    const nextSpecialistId =
      nextBooking?.specialistId ?? specialistHintId ?? specialists[0]?.id ?? "";
    const nextUserId = nextBooking?.userId ?? users[0]?.id ?? "";
    const nextSpecialist =
      specialists.find((item) => item.id === nextSpecialistId) ?? null;
    const nextServiceId =
      nextBooking?.serviceId ??
      nextSpecialist?.services[0]?.id ??
      nextSpecialist?.services.find((service) =>
        service.specialistIds?.includes(nextSpecialist.id),
      )?.id ??
      "";
    setSelectedBookingId(nextBooking?.id ?? null);
    setBookingForm({
      ...buildBookingDraft(nextBooking, nextUserId, nextSpecialistId),
      serviceId: nextServiceId,
    });
    setOperatingPanelMessage(null);
    setOperatingPanelError(null);
    setActiveSection("bookings");
    setIsBookingDrawerOpen(true);
  }

  function handleCloseBookingDrawer() {
    setIsBookingDrawerOpen(false);
    setSelectedBookingId(null);
    setOperatingPanelError(null);
  }

  function handleOpenUserDrawer(user?: AdminUser) {
    const nextUser = user ?? null;
    setSelectedUserId(nextUser?.id ?? null);
    setUserForm({
      firstName: nextUser?.fullName?.split(" ").slice(0, 1).join(" ") ?? "",
      lastName: nextUser?.fullName?.split(" ").slice(1).join(" ") ?? "",
      nickname: "",
      email: nextUser?.email ?? "",
      phoneNumber: nextUser?.phoneNumber ?? "",
      planId: nextUser?.planId ?? "free",
      accountType: nextUser?.accountType ?? "client",
      adminAccess: nextUser?.roles.includes("admin") ?? false,
      specialistAccess:
        nextUser?.accountType === "specialist" ||
        nextUser?.roles.includes("specialist") ||
        false,
      profileCompleted: nextUser?.profileCompleted ?? false,
    });
    setUserError(null);
    setUserMessage(null);
    setIsUserDrawerOpen(true);
    setActiveSection("users");
  }

  function handleCloseUserDrawer() {
    setIsUserDrawerOpen(false);
    setSelectedUserId(null);
    setUserError(null);
  }

  async function handleSaveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserError(null);
    setUserMessage(null);
    setSavingUserId(selectedUserId ?? "new");

    const payload = {
      firstName: userForm.firstName.trim(),
      lastName: userForm.lastName.trim(),
      nickname: userForm.nickname.trim(),
      email: userForm.email.trim(),
      phoneNumber: userForm.phoneNumber.trim(),
      planId: userForm.planId.trim() || "free",
      accountType: userForm.accountType,
      roles: [
        ...(userForm.adminAccess ? (["admin"] as const) : []),
        ...(userForm.specialistAccess || userForm.accountType === "specialist"
          ? (["specialist"] as const)
          : []),
      ],
      profileCompleted: userForm.profileCompleted,
    };

    try {
      const response = await fetch(
        selectedUserId
          ? `${apiBaseUrl}/api/admin/users/${encodeURIComponent(selectedUserId)}`
          : `${apiBaseUrl}/api/admin/users`,
        {
          method: selectedUserId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await response.json()) as {
        item?: AdminUser;
        error?: string;
      };
      if (!response.ok || !json.item) {
        setUserError(json.error ?? "No se pudo guardar el usuario.");
        return;
      }

      const savedUser = json.item;
      setUsers((current) => {
        const existingIndex = current.findIndex(
          (item) => item.id === savedUser.id,
        );
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = savedUser;
          return next;
        }
        return [savedUser, ...current];
      });
      setSelectedUserId(savedUser.id);
      setUserMessage(
        selectedUserId ? "Usuario actualizado." : "Usuario creado.",
      );
      setOperatingPanelMessage(
        selectedUserId ? "Usuario actualizado." : "Usuario creado.",
      );
      setIsUserDrawerOpen(false);
    } catch (error) {
      setUserError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el usuario.",
      );
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleGrantPremium(user: AdminUser) {
    const paymentDate = parseDateInputValue(premiumPaymentDate);
    if (!paymentDate) {
      setUserError("Selecciona una fecha de pago válida.");
      return;
    }

    setUserError(null);
    setUserMessage(null);
    setGrantingPremiumUserId(user.id);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/admin/users/${encodeURIComponent(user.id)}/premium`,
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            paymentDate: paymentDate.toISOString(),
            notes: premiumGrantNotes.trim(),
          }),
        },
      );
      const json = (await response.json()) as {
        item?: AdminUser;
        error?: string;
      };
      if (!response.ok || !json.item) {
        setUserError(json.error ?? "No se pudo habilitar Premium.");
        return;
      }

      const savedUser = json.item;
      setUsers((current) =>
        current.map((item) => (item.id === savedUser.id ? savedUser : item)),
      );
      setUserMessage(`Premium habilitado para ${savedUser.fullName}.`);
      setOperatingPanelMessage(
        `Premium activo por un mes para ${savedUser.fullName}.`,
      );
    } catch (error) {
      setUserError(
        error instanceof Error
          ? error.message
          : "No se pudo habilitar Premium.",
      );
    } finally {
      setGrantingPremiumUserId(null);
    }
  }

  async function handleOpenSpecialistDrawer(
    specialist: AdminSpecialist,
    initialTab: SpecialistDetailTab = "profile",
  ) {
    setSelectedSpecialistId(specialist.id);
    setSpecialistDetailTab(initialTab);
    setSpecialistDrawerLoading(true);
    setSpecialistDrawerError(null);
    setIsSpecialistDrawerOpen(true);

    try {
      const [
        detailResponse,
        servicesResponse,
        availabilityResponse,
        bookingsResponse,
        auditResponse,
      ] = await Promise.all([
        fetch(`${apiBaseUrl}/api/admin/specialists/${specialist.id}`, {
          credentials: "include",
        }),
        fetch(`${apiBaseUrl}/api/admin/specialists/${specialist.id}/services`, {
          credentials: "include",
        }),
        fetch(
          `${apiBaseUrl}/api/admin/specialists/${specialist.id}/availability`,
          {
            credentials: "include",
          },
        ),
        fetch(`${apiBaseUrl}/api/admin/specialists/${specialist.id}/bookings`, {
          credentials: "include",
        }),
        fetch(
          `${apiBaseUrl}/api/admin/specialists/${specialist.id}/audit-log`,
          {
            credentials: "include",
          },
        ),
      ]);

      if (
        detailResponse.status === 401 ||
        servicesResponse.status === 401 ||
        availabilityResponse.status === 401 ||
        bookingsResponse.status === 401 ||
        auditResponse.status === 401
      ) {
        handleSessionInvalid("Tu sesión de admin expiró.");
        return;
      }

      if (
        !detailResponse.ok ||
        !servicesResponse.ok ||
        !availabilityResponse.ok ||
        !bookingsResponse.ok ||
        !auditResponse.ok
      ) {
        throw new Error("No se pudo cargar el detalle del especialista.");
      }

      const [
        detailJson,
        servicesJson,
        availabilityJson,
        bookingsJson,
        auditJson,
      ] = await Promise.all([
        detailResponse.json() as Promise<{ item: AdminSpecialistDetail }>,
        servicesResponse.json() as Promise<{ items: AdminService[] }>,
        availabilityResponse.json() as Promise<{
          items: SpecialistAvailabilitySlot[];
        }>,
        bookingsResponse.json() as Promise<{ items: AdminBooking[] }>,
        auditResponse.json() as Promise<{ items: SpecialistAuditEntry[] }>,
      ]);

      const nextServices = servicesJson.items ?? [];
      const nextAvailability = (availabilityJson.items ?? [])
        .slice()
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
      const nextBookings = (bookingsJson.items ?? [])
        .slice()
        .sort((left, right) =>
          right.scheduledAt.localeCompare(left.scheduledAt),
        );

      const nextDetail = detailJson.item ?? specialist;
      setSelectedSpecialistDetail(nextDetail);
      setSelectedSpecialistServices(nextServices);
      setSelectedSpecialistAvailability(nextAvailability);
      setSelectedSpecialistBookings(nextBookings);
      setSelectedSpecialistAudit(auditJson.items ?? []);
      setSpecialistServiceDrafts(seedServiceDrafts(nextServices));
      setSpecialistProfileDraft({
        publicName: nextDetail.publicName ?? nextDetail.name ?? "",
        headline: nextDetail.headline ?? "",
        specialty: (nextDetail.specialties ?? []).join(", "),
        bio: nextDetail.bio ?? "",
        avatarUrl: nextDetail.avatarUrl ?? "",
        isActive: nextDetail.isActive,
        isVisible: nextDetail.isVisible,
      });
      setNewServiceDraft({
        name: "",
        category: "",
        description: "",
        priceAmount: "",
        priceCurrency: "USD",
        durationMinutes: "",
        isActive: true,
        isVisible: true,
      });
      setAvailabilityDraft({
        startsAt: "",
        endsAt: "",
        mode: nextServices[0]?.deliveryModes?.[0] ?? "chat",
        isAvailable: true,
        weeklyStartDate: "",
        weeklyEndDate: "",
        weeklyStartTime: "09:00",
        weeklyEndTime: "17:00",
        weeklyWeekdays: ["1", "2", "3", "4", "5"],
      });
    } catch (loadError) {
      setSpecialistDrawerError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar el detalle del especialista.",
      );
    } finally {
      setSpecialistDrawerLoading(false);
    }
  }

  function handleCloseSpecialistDrawer() {
    setIsSpecialistDrawerOpen(false);
    setSelectedSpecialistId(null);
    setSelectedSpecialistDetail(null);
    setSelectedSpecialistServices([]);
    setSelectedSpecialistAvailability([]);
    setSelectedSpecialistBookings([]);
    setSelectedSpecialistAudit([]);
    setSpecialistDrawerError(null);
    setSpecialistDrawerLoading(false);
  }

  async function refreshSpecialistAudit(specialistId: string) {
    const response = await fetch(
      `${apiBaseUrl}/api/admin/specialists/${specialistId}/audit-log`,
      {
        credentials: "include",
      },
    );
    if (response.status === 401) {
      handleSessionInvalid("Tu sesión de admin expiró.");
      return;
    }
    if (!response.ok) {
      return;
    }
    const json = (await response.json()) as { items: SpecialistAuditEntry[] };
    setSelectedSpecialistAudit(json.items ?? []);
  }

  function updateSpecialistServiceDraft(
    serviceId: string,
    key:
      | "name"
      | "category"
      | "description"
      | "priceAmount"
      | "priceCurrency"
      | "durationMinutes"
      | "isActive"
      | "isVisible",
    value: string | boolean,
  ) {
    setSpecialistServiceDrafts((current) => ({
      ...current,
      [serviceId]: {
        ...(current[serviceId] ?? {
          name: "",
          category: "",
          description: "",
          priceAmount: "",
          priceCurrency: "USD",
          durationMinutes: "",
          isActive: true,
          isVisible: true,
        }),
        [key]: value,
      },
    }));
  }

  async function handleSaveSpecialistService(service: AdminService) {
    if (!selectedSpecialistId) {
      return;
    }

    const draft = specialistServiceDrafts[service.id];
    const name = draft?.name?.trim() || service.name;
    const category = draft?.category?.trim() || service.category;
    const description = draft?.description?.trim() || service.description;
    const amount = Number(draft?.priceAmount ?? service.price.amount);
    const durationMinutes = Number(
      draft?.durationMinutes ?? service.durationMinutes,
    );
    const priceCurrency =
      (draft?.priceCurrency ?? service.price.currency).trim() || "USD";

    if (name.length < 3) {
      setSpecialistDrawerError("Ingresa un nombre válido.");
      return;
    }
    if (category.length < 3) {
      setSpecialistDrawerError("Ingresa una categoría válida.");
      return;
    }
    if (description.length < 6) {
      setSpecialistDrawerError("Ingresa una descripción válida.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setSpecialistDrawerError("Ingresa un precio válido.");
      return;
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setSpecialistDrawerError("Ingresa una duración válida.");
      return;
    }

    setSpecialistDrawerError(null);
    const response = await fetch(
      `${apiBaseUrl}/api/admin/specialists/${selectedSpecialistId}/services/${service.id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          category,
          description,
          price: {
            amount,
            currency: priceCurrency,
          },
          durationMinutes,
          isActive: draft?.isActive ?? service.isActive ?? true,
          isVisible: draft?.isVisible ?? service.isVisible ?? true,
        }),
      },
    );

    const json = (await response.json()) as {
      item?: AdminService;
      error?: string;
    };
    if (response.status === 401) {
      handleSessionInvalid("Tu sesión de admin expiró.");
      return;
    }
    if (!response.ok || !json.item) {
      setSpecialistDrawerError(json.error ?? "No se pudo guardar el servicio.");
      return;
    }

    const savedService = json.item;
    setSelectedSpecialistServices((current) =>
      current.map((item) =>
        item.id === savedService.id ? savedService : item,
      ),
    );
    setSpecialists((current) =>
      current.map((item) =>
        item.id !== selectedSpecialistId
          ? item
          : {
              ...item,
              services: item.services.map((serviceItem) =>
                serviceItem.id === savedService.id ? savedService : serviceItem,
              ),
            },
      ),
    );
    setSpecialistServiceDrafts((current) => ({
      ...current,
      [savedService.id]: {
        name: savedService.name,
        category: savedService.category,
        description: savedService.description,
        priceAmount: String(savedService.price.amount),
        priceCurrency: savedService.price.currency,
        durationMinutes: String(savedService.durationMinutes),
        isActive: savedService.isActive ?? true,
        isVisible: savedService.isVisible ?? true,
      },
    }));
    setOperatingPanelMessage(`Servicio ${savedService.name} actualizado.`);
    await refreshSpecialistAudit(selectedSpecialistId);
  }

  async function handleSaveSpecialistProfile() {
    if (!selectedSpecialistId) {
      return;
    }

    setSpecialistDrawerError(null);
    const response = await fetch(
      `${apiBaseUrl}/api/admin/specialists/${selectedSpecialistId}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          isActive: specialistProfileDraft.isActive,
          isPublic: specialistProfileDraft.isVisible,
          publicName: specialistProfileDraft.publicName,
          headline: specialistProfileDraft.headline,
          specialty: specialistProfileDraft.specialty,
          bio: specialistProfileDraft.bio,
          avatarUrl: specialistProfileDraft.avatarUrl,
        }),
      },
    );

    const json = (await response.json()) as {
      item?: AdminSpecialistDetail;
      error?: string;
    };
    if (response.status === 401) {
      handleSessionInvalid("Tu sesión de admin expiró.");
      return;
    }
    if (!response.ok || !json.item) {
      setSpecialistDrawerError(json.error ?? "No se pudo guardar.");
      return;
    }

    const saved = json.item;
    setSelectedSpecialistDetail((current) => ({
      ...(current ?? saved),
      ...saved,
    }));
    setSpecialists((current) =>
      current.map((item) =>
        item.id === selectedSpecialistId ? { ...item, ...saved } : item,
      ),
    );
    setOperatingPanelMessage("Guardado correctamente.");
    await refreshSpecialistAudit(selectedSpecialistId);
  }

  async function handleCreateSpecialistService() {
    if (!selectedSpecialistId) {
      return;
    }

    const name = newServiceDraft.name.trim();
    const category = newServiceDraft.category.trim();
    const description = newServiceDraft.description.trim();
    const amount = Number(newServiceDraft.priceAmount);
    const durationMinutes = Number(newServiceDraft.durationMinutes);
    if (name.length < 3) {
      setSpecialistDrawerError("Ingresa un nombre válido.");
      return;
    }
    if (category.length < 3) {
      setSpecialistDrawerError("Ingresa una categoría válida.");
      return;
    }
    if (description.length < 6) {
      setSpecialistDrawerError("Ingresa una descripción válida.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setSpecialistDrawerError("Ingresa un precio válido.");
      return;
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setSpecialistDrawerError("Ingresa una duración válida.");
      return;
    }

    setSpecialistDrawerError(null);
    const response = await fetch(
      `${apiBaseUrl}/api/admin/specialists/${selectedSpecialistId}/services`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          category,
          description,
          price: {
            amount,
            currency: newServiceDraft.priceCurrency.trim() || "USD",
          },
          durationMinutes,
          isActive: newServiceDraft.isActive,
          isVisible: newServiceDraft.isVisible,
        }),
      },
    );

    const json = (await response.json()) as {
      item?: AdminService;
      error?: string;
    };
    if (response.status === 401) {
      handleSessionInvalid("Tu sesión de admin expiró.");
      return;
    }
    if (!response.ok || !json.item) {
      setSpecialistDrawerError(json.error ?? "No se pudo guardar.");
      return;
    }

    const created = json.item;
    setSelectedSpecialistServices((current) => [created, ...current]);
    setSpecialists((current) =>
      current.map((item) =>
        item.id === selectedSpecialistId
          ? {
              ...item,
              services: [created, ...item.services],
              serviceCount: item.serviceCount + 1,
            }
          : item,
      ),
    );
    setSpecialistServiceDrafts((current) => ({
      ...current,
      [created.id]: {
        name: created.name,
        category: created.category,
        description: created.description,
        priceAmount: String(created.price.amount),
        priceCurrency: created.price.currency,
        durationMinutes: String(created.durationMinutes),
        isActive: created.isActive ?? true,
        isVisible: created.isVisible ?? true,
      },
    }));
    setNewServiceDraft({
      name: "",
      category: "",
      description: "",
      priceAmount: "",
      priceCurrency: "USD",
      durationMinutes: "",
      isActive: true,
      isVisible: true,
    });
    setOperatingPanelMessage("Servicio creado.");
    await refreshSpecialistAudit(selectedSpecialistId);
  }

  async function handleCreateServiceFromServicesSection() {
    setOperatingPanelMessage(null);
    setOperatingPanelError(null);

    if (!serviceFilters.specialistId) {
      setOperatingPanelError(
        "Selecciona un especialista para crearle un servicio.",
      );
      return;
    }

    const specialist = specialists.find(
      (item) => item.id === serviceFilters.specialistId,
    );
    if (!specialist) {
      setOperatingPanelError("No se encontró el especialista seleccionado.");
      return;
    }

    await handleOpenSpecialistDrawer(specialist, "services");
  }

  async function handleCreateAvailability() {
    if (!selectedSpecialistId) {
      return;
    }

    if (!availabilityDraft.startsAt || !availabilityDraft.endsAt) {
      setSpecialistDrawerError("Completa inicio y fin del bloque.");
      return;
    }

    setSpecialistDrawerError(null);
    const response = await fetch(
      `${apiBaseUrl}/api/admin/specialists/${selectedSpecialistId}/availability`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          startsAt: fromDateTimeLocalValue(availabilityDraft.startsAt),
          endsAt: fromDateTimeLocalValue(availabilityDraft.endsAt),
          mode: availabilityDraft.mode,
          isAvailable: availabilityDraft.isAvailable,
        }),
      },
    );

    const json = (await response.json()) as {
      item?: SpecialistAvailabilitySlot;
      error?: string;
    };
    if (response.status === 401) {
      handleSessionInvalid("Tu sesión de admin expiró.");
      return;
    }
    if (!response.ok || !json.item) {
      setSpecialistDrawerError(
        json.error ?? "No se pudo guardar la disponibilidad.",
      );
      return;
    }

    setSelectedSpecialistAvailability((current) =>
      [...current, json.item!].sort((left, right) =>
        left.startsAt.localeCompare(right.startsAt),
      ),
    );
    setAvailabilityDraft((current) => ({
      ...current,
      startsAt: "",
      endsAt: "",
    }));
    setOperatingPanelMessage("Disponibilidad guardada.");
    await refreshSpecialistAudit(selectedSpecialistId);
  }

  async function handleCreateWeeklyAvailability() {
    if (!selectedSpecialistId) {
      return;
    }

    const startDate = parseDateInputValue(availabilityDraft.weeklyStartDate);
    const endDate = parseDateInputValue(availabilityDraft.weeklyEndDate);
    const selectedWeekdays = new Set(availabilityDraft.weeklyWeekdays);

    if (
      !startDate ||
      !endDate ||
      !availabilityDraft.weeklyStartTime ||
      !availabilityDraft.weeklyEndTime
    ) {
      setSpecialistDrawerError("Completa fechas, horas y días de atención.");
      return;
    }

    if (endDate.getTime() < startDate.getTime()) {
      setSpecialistDrawerError(
        "La fecha final debe ser igual o posterior a la fecha inicial.",
      );
      return;
    }

    if (selectedWeekdays.size === 0) {
      setSpecialistDrawerError("Selecciona al menos un día de atención.");
      return;
    }

    const blocks: Array<{
      startsAt: string;
      endsAt: string;
      mode: string;
      isAvailable: boolean;
    }> = [];
    const cursor = new Date(startDate);

    while (cursor.getTime() <= endDate.getTime()) {
      const weekday = String(cursor.getDay());
      if (selectedWeekdays.has(weekday)) {
        const dateValue = toDateInputValue(cursor);
        const startsAt = fromDateTimeLocalValue(
          `${dateValue}T${availabilityDraft.weeklyStartTime}`,
        );
        const endsAt = fromDateTimeLocalValue(
          `${dateValue}T${availabilityDraft.weeklyEndTime}`,
        );

        if (new Date(startsAt).getTime() >= new Date(endsAt).getTime()) {
          setSpecialistDrawerError(
            "La hora final debe ser posterior a la hora inicial.",
          );
          return;
        }

        blocks.push({
          startsAt,
          endsAt,
          mode: availabilityDraft.mode,
          isAvailable: availabilityDraft.isAvailable,
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    if (blocks.length === 0) {
      setSpecialistDrawerError(
        "No hay días seleccionados dentro del rango indicado.",
      );
      return;
    }

    setSpecialistDrawerError(null);
    const savedSlots: SpecialistAvailabilitySlot[] = [];

    for (const block of blocks) {
      const response = await fetch(
        `${apiBaseUrl}/api/admin/specialists/${selectedSpecialistId}/availability`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(block),
        },
      );

      const json = (await response.json()) as {
        item?: SpecialistAvailabilitySlot;
        error?: string;
      };
      if (response.status === 401) {
        handleSessionInvalid("Tu sesión de admin expiró.");
        return;
      }
      if (!response.ok || !json.item) {
        setSpecialistDrawerError(
          json.error ?? "No se pudieron generar todos los horarios.",
        );
        return;
      }

      savedSlots.push(json.item);
    }

    setSelectedSpecialistAvailability((current) =>
      [...current, ...savedSlots].sort((left, right) =>
        left.startsAt.localeCompare(right.startsAt),
      ),
    );
    setAvailabilityDraft((current) => ({
      ...current,
      weeklyStartDate: "",
      weeklyEndDate: "",
    }));
    setOperatingPanelMessage(
      `${savedSlots.length} horarios de atención generados.`,
    );
    await refreshSpecialistAudit(selectedSpecialistId);
  }

  async function handleUpdateAvailability(slot: SpecialistAvailabilitySlot) {
    if (!selectedSpecialistId) {
      return;
    }

    setSpecialistDrawerError(null);
    const response = await fetch(
      `${apiBaseUrl}/api/admin/specialists/${selectedSpecialistId}/availability/${slot.id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          mode: slot.mode,
          isAvailable: slot.isAvailable,
        }),
      },
    );

    const json = (await response.json()) as {
      item?: SpecialistAvailabilitySlot;
      error?: string;
    };
    if (response.status === 401) {
      handleSessionInvalid("Tu sesión de admin expiró.");
      return;
    }
    if (!response.ok || !json.item) {
      setSpecialistDrawerError(json.error ?? "No se pudo guardar.");
      return;
    }

    setSelectedSpecialistAvailability((current) =>
      current
        .map((item) => (item.id === json.item!.id ? json.item! : item))
        .sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    );
    setOperatingPanelMessage("Disponibilidad actualizada.");
    await refreshSpecialistAudit(selectedSpecialistId);
  }

  async function handleDeleteAvailability(slot: SpecialistAvailabilitySlot) {
    const confirmed = window.confirm("¿Eliminar este bloque horario?");
    if (!confirmed) {
      return;
    }
    const response = await fetch(
      `${apiBaseUrl}/api/admin/specialists/${slot.specialistId}/availability/${slot.id}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );

    if (response.status === 401) {
      handleSessionInvalid("Tu sesión de admin expiró.");
      return;
    }
    if (!response.ok && response.status !== 204) {
      setSpecialistDrawerError("No se pudo eliminar la disponibilidad.");
      return;
    }

    setSelectedSpecialistAvailability((current) =>
      current.filter((item) => item.id !== slot.id),
    );
    setOperatingPanelMessage("Bloque horario eliminado.");
    await refreshSpecialistAudit(slot.specialistId);
  }

  function handleCloseBadgeEditor() {
    setIsBadgeEditorOpen(false);
  }

  function handleSelectRoute(pathId: BadgePathId) {
    setSelectedRouteId(pathId);
    requestDeveloperAccess("badges");
  }

  function updateBadgeForm<K extends keyof BadgeFormState>(
    key: K,
    value: BadgeFormState[K],
  ) {
    setBadgeForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOperatingPanelMessage(null);
    setOperatingPanelError(null);

    const payload = {
      name: productForm.name.trim(),
      category: productForm.category.trim(),
      specialistProfileId: productForm.specialistId.trim(),
      shortDescription: productForm.shortDescription.trim(),
      description: productForm.description.trim(),
      price: {
        amount: Number(productForm.priceAmount),
        currency: productForm.priceCurrency.trim() || "USD",
      },
      sku: productForm.sku.trim(),
      status: productForm.status.trim(),
      imageUrl: productForm.imageUrl.trim(),
      imageUrls: parseImageList(productForm.imageUrls),
      artwork: productForm.artwork.trim(),
      badge: productForm.badge.trim(),
      stockQuantity: Number(productForm.stockQuantity),
      madeToOrder: productForm.madeToOrder,
      featured: productForm.featured,
      tags: parseCommaList(productForm.tags),
    };

    const response = await fetch(
      selectedProductId
        ? `${apiBaseUrl}/api/admin/shop/products/${selectedProductId}`
        : `${apiBaseUrl}/api/admin/shop/products`,
      {
        method: selectedProductId ? "PATCH" : "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const json = (await response.json()) as {
      item?: AdminShopProduct;
      error?: string;
    };
    if (!response.ok || !json.item) {
      setOperatingPanelError(json.error ?? "No se pudo guardar el producto.");
      return;
    }
    const savedProduct = json.item;

    setProducts((current) => {
      const existingIndex = current.findIndex(
        (item) => item.id === savedProduct.id,
      );
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = savedProduct;
        return next;
      }
      return [savedProduct, ...current];
    });
    setSelectedProductId(savedProduct.id);
    setProductForm(
      buildProductDraft(
        savedProduct,
        savedProduct.specialistId ?? productForm.specialistId,
      ),
    );
    setOperatingPanelMessage(`Producto ${savedProduct.name} guardado.`);
    setIsProductDrawerOpen(false);
  }

  async function patchProduct(
    productId: string,
    input: Partial<{
      name: string;
      category: string;
      shortDescription: string;
      description: string;
      price: { amount: number; currency?: string };
      sku: string;
      status: string;
      imageUrl: string;
      imageUrls: string[];
      artwork: string;
      badge: string;
      featured: boolean;
      stockQuantity: number;
      madeToOrder: boolean;
      tags: string[];
    }>,
  ) {
    return fetch(`${apiBaseUrl}/api/admin/shop/products/${productId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    });
  }

  async function handleQuickProductPatch(
    product: AdminShopProduct,
    patch: Parameters<typeof patchProduct>[1],
    successMessage: string,
  ) {
    setOperatingPanelMessage(null);
    setOperatingPanelError(null);

    const response = await patchProduct(product.id, patch);
    const json = (await response.json()) as {
      item?: AdminShopProduct;
      error?: string;
    };

    if (!response.ok || !json.item) {
      setOperatingPanelError(
        json.error ?? "No se pudo actualizar el producto.",
      );
      return;
    }

    const savedProduct = json.item;
    setProducts((current) =>
      current.map((item) =>
        item.id === savedProduct.id ? savedProduct : item,
      ),
    );
    setOperatingPanelMessage(successMessage);
  }

  async function handleArchiveProduct(product: AdminShopProduct) {
    const confirmed = window.confirm(
      "Esta acción puede afectar el catálogo, órdenes o sincronización. Revisa antes de continuar.",
    );
    if (!confirmed) {
      return;
    }

    await handleQuickProductPatch(
      product,
      { status: "archived" },
      `Producto ${product.name} archivado.`,
    );
  }

  async function handleToggleProductVisibility(product: AdminShopProduct) {
    const nextStatus = product.status === "hidden" ? "active" : "hidden";
    await handleQuickProductPatch(
      product,
      { status: nextStatus },
      `Producto ${product.name} ${nextStatus === "hidden" ? "oculto" : "visible"}.`,
    );
  }

  async function handleToggleProductFeatured(product: AdminShopProduct) {
    await handleQuickProductPatch(
      product,
      { featured: !product.featured },
      product.featured
        ? `Producto ${product.name} desmarcado como destacado.`
        : `Producto ${product.name} marcado como destacado.`,
    );
  }

  async function handleAdjustProductPrice(product: AdminShopProduct) {
    const nextValue = window.prompt(
      `Nuevo precio para ${product.name}`,
      String(product.price.amount),
    );
    if (nextValue == null) {
      return;
    }

    const nextAmount = Number(nextValue);
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      setOperatingPanelError("Ingresa un precio válido.");
      return;
    }

    await handleQuickProductPatch(
      product,
      { price: { amount: nextAmount, currency: product.price.currency } },
      `Precio actualizado para ${product.name}.`,
    );
  }

  async function handleAdjustProductStock(product: AdminShopProduct) {
    const nextValue = window.prompt(
      `Nuevo stock para ${product.name}`,
      String(product.stockQuantity),
    );
    if (nextValue == null) {
      return;
    }

    const nextStock = Number(nextValue);
    if (!Number.isFinite(nextStock) || nextStock < 0) {
      setOperatingPanelError("Ingresa un stock válido.");
      return;
    }

    await handleQuickProductPatch(
      product,
      {
        stockQuantity: Math.round(nextStock),
        madeToOrder: product.madeToOrder,
      },
      `Stock actualizado para ${product.name}.`,
    );
  }

  function handleDuplicateProduct(product: AdminShopProduct) {
    setSelectedProductId(null);
    setProductForm({
      ...buildProductDraft(
        product,
        product.specialistId ?? specialists[0]?.id ?? "",
      ),
      name: `${product.name} copia`,
      sku: "",
      imageUrls: product.imageUrls?.join(", ") ?? "",
    });
    setOperatingPanelMessage(null);
    setOperatingPanelError(null);
    setActiveSection("shop");
    setIsProductDrawerOpen(true);
  }

  async function handleSaveBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOperatingPanelMessage(null);
    setOperatingPanelError(null);

    const payload = {
      userId: bookingForm.userId.trim(),
      specialistId: bookingForm.specialistId.trim(),
      serviceId: bookingForm.serviceId.trim(),
      scheduledAt: fromDateTimeLocalValue(bookingForm.scheduledAt.trim()),
      mode: bookingForm.mode.trim(),
      notes: bookingForm.notes.trim(),
    };

    const response = selectedBookingId
      ? await fetch(`${apiBaseUrl}/api/admin/bookings/${selectedBookingId}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            scheduledAt: payload.scheduledAt,
            mode: payload.mode,
            notes: payload.notes,
            status: bookingForm.status,
          }),
        })
      : await fetch(`${apiBaseUrl}/api/admin/bookings`, {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        });

    const json = (await response.json()) as {
      item?: AdminBooking;
      error?: string;
    };
    if (!response.ok || !json.item) {
      setOperatingPanelError(json.error ?? "No se pudo guardar la reserva.");
      return;
    }
    const savedBooking = json.item;

    setBookings((current) => {
      const existingIndex = current.findIndex(
        (item) => item.id === savedBooking.id,
      );
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = savedBooking;
        return next;
      }
      return [savedBooking, ...current];
    });
    setSelectedBookingId(savedBooking.id);
    setBookingForm(
      buildBookingDraft(
        savedBooking,
        savedBooking.userId ?? bookingForm.userId,
        savedBooking.specialistId ?? bookingForm.specialistId,
      ),
    );
    setOperatingPanelMessage(`Reserva ${savedBooking.serviceName} guardada.`);
    setIsBookingDrawerOpen(false);
  }

  async function handleUpdateBookingStatus(
    booking: AdminBooking,
    nextStatus: string,
  ) {
    setOperatingPanelMessage(null);
    setOperatingPanelError(null);

    const response = await fetch(
      `${apiBaseUrl}/api/admin/bookings/${booking.id}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
          scheduledAt: booking.scheduledAt,
          mode: booking.mode,
          notes: booking.notes ?? "",
        }),
      },
    );

    const json = (await response.json()) as {
      item?: AdminBooking;
      error?: string;
    };
    if (!response.ok || !json.item) {
      setOperatingPanelError(json.error ?? "No se pudo actualizar la reserva.");
      return;
    }
    const savedBooking = json.item;

    setBookings((current) =>
      current.map((item) =>
        item.id === savedBooking.id ? savedBooking : item,
      ),
    );
    setOperatingPanelMessage(
      `Reserva ${savedBooking.serviceName} actualizada.`,
    );
  }

  function resetOrderChatAttachment() {
    setOrderChatReplyImageUrl("");
    setOrderChatReplyImageName("");
    setOrderChatReplyImageProgress(0);
    setOrderChatReplyImageError(null);
    if (orderChatReplyImageInputRef.current) {
      orderChatReplyImageInputRef.current.value = "";
    }
  }

  async function handleUpdateOrderStatus(
    order: AdminShopOrder,
    nextStatus: string,
    options: { openChat?: boolean } = {},
  ) {
    setOperatingPanelMessage(null);
    setOperatingPanelError(null);

    const response = await fetch(`${apiBaseUrl}/api/admin/orders/${order.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        status: nextStatus,
        openCoordinationChat: options.openChat ?? true,
      }),
    });

    const json = (await response.json()) as {
      item?: AdminShopOrder;
      chatThread?: AdminPrivateChatThread | null;
      error?: string;
    };
    if (!response.ok || !json.item) {
      setOperatingPanelError(json.error ?? "No se pudo actualizar la orden.");
      return;
    }

    setOrders((current) =>
      current.map((item) => (item.id === json.item?.id ? json.item : item)),
    );
    if (json.chatThread) {
      setOrderChat(json.chatThread);
      setOrderChatOrder(json.item);
      setOrderChatReply("");
      resetOrderChatAttachment();
      setOrderChatError(null);
    }
    setOperatingPanelMessage(
      json.chatThread
        ? `Orden ${json.item.orderCode} actualizada y chat abierto.`
        : `Orden ${json.item.orderCode} actualizada.`,
    );
  }

  async function handleOpenOrderChat(order: AdminShopOrder) {
    setOrderChatLoading(true);
    setOrderChatError(null);
    setOrderChatOrder(order);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/admin/orders/${order.id}/chat`,
        {
          credentials: "include",
        },
      );
      const json = (await response.json()) as {
        item?: AdminPrivateChatThread;
        error?: string;
      };
      if (!response.ok || !json.item) {
        throw new Error(json.error ?? "No se pudo abrir el chat.");
      }
      setOrderChat(json.item);
      setOrderChatReply("");
      resetOrderChatAttachment();
    } catch (error) {
      setOrderChatError(
        error instanceof Error ? error.message : "No se pudo abrir el chat.",
      );
    } finally {
      setOrderChatLoading(false);
    }
  }

  async function handleSendOrderChatReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const order = orderChatOrder;
    const body = orderChatReply.trim();
    const imageUrl = orderChatReplyImageUrl.trim();
    if (!order || (body.length === 0 && imageUrl.length === 0)) {
      setOrderChatError("Escribe un mensaje o adjunta una imagen.");
      return;
    }

    if (orderChatReplyImageUploading) {
      setOrderChatError("Espera a que termine de subirse la imagen.");
      return;
    }

    setSendingOrderChatReply(true);
    setOrderChatError(null);
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/admin/orders/${order.id}/chat/messages`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            body,
            imageUrl: imageUrl.length > 0 ? imageUrl : undefined,
          }),
        },
      );
      const json = (await response.json()) as {
        item?: AdminPrivateChatThread;
        error?: string;
      };
      if (!response.ok || !json.item) {
        throw new Error(json.error ?? "No se pudo enviar el mensaje.");
      }
      setOrderChat(json.item);
      setOrderChatReply("");
      resetOrderChatAttachment();
      setOperatingPanelMessage(`Mensaje enviado para ${order.orderCode}.`);
    } catch (error) {
      setOrderChatError(
        error instanceof Error
          ? error.message
          : "No se pudo enviar el mensaje.",
      );
    } finally {
      setSendingOrderChatReply(false);
    }
  }

  async function uploadOrderChatImage(file: File): Promise<string> {
    setOrderChatReplyImageUploading(true);
    setOrderChatReplyImageProgress(0);
    setOrderChatReplyImageError(null);

    try {
      const publicUrl = await new Promise<string>((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", "general");
        if (orderChatOrder?.id) {
          formData.append("entityType", "shop_order");
          formData.append("entityId", orderChatOrder.id);
        }

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${apiBaseUrl}/api/admin/uploads`);
        xhr.withCredentials = true;

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            return;
          }
          setOrderChatReplyImageProgress(
            Math.round((event.loaded / event.total) * 100),
          );
        };

        xhr.onerror = () => reject(new Error("No se pudo subir la imagen."));
        xhr.onload = () => {
          try {
            const payload = JSON.parse(xhr.responseText) as {
              item?: { publicUrl?: string };
              error?: string;
            };

            if (
              xhr.status < 200 ||
              xhr.status >= 300 ||
              !payload.item?.publicUrl
            ) {
              reject(new Error(payload.error ?? "No se pudo subir la imagen."));
              return;
            }

            resolve(payload.item.publicUrl);
          } catch {
            reject(new Error("No se pudo leer la respuesta de la imagen."));
          }
        };

        xhr.send(formData);
      });

      return publicUrl;
    } finally {
      setOrderChatReplyImageUploading(false);
    }
  }

  async function handleOrderChatImageChange(file: File | null) {
    if (!file) {
      resetOrderChatAttachment();
      return;
    }

    setOrderChatReplyImageName(file.name);
    setOrderChatReplyImageUrl("");
    try {
      const publicUrl = await uploadOrderChatImage(file);
      setOrderChatReplyImageUrl(publicUrl);
    } catch (uploadError) {
      setOrderChatReplyImageError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo subir la imagen.",
      );
      setOrderChatReplyImageName("");
      setOrderChatReplyImageUrl("");
      setOrderChatReplyImageProgress(0);
      if (orderChatReplyImageInputRef.current) {
        orderChatReplyImageInputRef.current.value = "";
      }
    }
  }

  async function persistBadge(
    badgeIdOverride?: string | null,
    nextActiveState?: boolean,
    stepDelta?: number,
  ) {
    const payload = formToRequestBody({
      ...badgeForm,
      isActive:
        typeof nextActiveState === "boolean"
          ? nextActiveState
          : badgeForm.isActive,
      stepIndex:
        typeof stepDelta === "number"
          ? String(
              Math.max(
                1,
                Math.min(
                  5,
                  Number.parseInt(badgeForm.stepIndex, 10) + stepDelta,
                ),
              ),
            )
          : badgeForm.stepIndex,
    });

    const badgeId = badgeIdOverride ?? selectedBadgeId;
    const method = badgeId ? "PATCH" : "POST";
    const endpoint = badgeId
      ? `${apiBaseUrl}/api/badges/${encodeURIComponent(badgeId)}`
      : `${apiBaseUrl}/api/badges`;

    setSavingBadgeId(badgeId ?? "new");
    setBadgeError(null);
    setBadgeMessage(null);

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "content-type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        handleSessionInvalid("Tu sesión de admin expiró.");
        return;
      }
      const json = (await response.json()) as { item?: Badge; error?: string };
      const savedItem = json.item;
      if (!response.ok || !savedItem) {
        throw new Error(json.error ?? "No se pudo guardar la insignia.");
      }

      const savedBadge: Badge = {
        ...savedItem,
        rules: payload.rules.map((rule, index) => ({
          id: savedItem.rules?.[index]?.id ?? `rule-${index}`,
          badgeId: savedItem.id,
          ruleKey: rule.ruleKey,
          operator: rule.operator,
          value: rule.value,
          isActive: rule.isActive,
        })),
      };

      setBadges((current) => {
        const existingIndex = current.findIndex(
          (item) => item.id === savedBadge.id,
        );
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = savedBadge;
          return next;
        }
        return [savedBadge, ...current];
      });
      setSelectedBadgeId(savedBadge.id);
      setBadgeForm(badgeToForm(savedBadge));
      setBadgeMessage(
        badgeId
          ? `Badge ${savedBadge.name} actualizado.`
          : `Badge ${savedBadge.name} creado.`,
      );

      const diagnosticsResponse = await fetch(
        `${apiBaseUrl}/api/badges/admin/diagnostics`,
        {
          credentials: "include",
        },
      );
      if (diagnosticsResponse.status === 401) {
        handleSessionInvalid("Tu sesión de admin expiró.");
        return;
      }
      if (diagnosticsResponse.ok) {
        setDiagnostics(
          (await diagnosticsResponse.json()) as BadgeDiagnosticsResult,
        );
      }
      setAuditFilters((current) => ({ ...current }));
    } catch (saveError) {
      setBadgeError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar la insignia.",
      );
    } finally {
      setSavingBadgeId(null);
    }
  }

  async function toggleBadgeActive(badge: Badge) {
    setSelectedBadgeId(badge.id);
    setBadgeForm(badgeToForm(badge));
    await persistBadge(badge.id, !badge.isActive);
  }

  async function moveBadge(badge: Badge, delta: number) {
    const nextStep = badge.stepIndex + delta;
    if (nextStep < 1 || nextStep > 5) {
      return;
    }

    if (!isBadgeReorderSafe(badge, nextStep, badges)) {
      setBadgeError(
        "No se puede reordenar: el escalón destino ya tiene un badge activo.",
      );
      return;
    }

    setSelectedBadgeId(badge.id);
    setBadgeForm({
      ...badgeToForm(badge),
      stepIndex: String(nextStep),
    });
    await persistBadge(badge.id, undefined, delta);
  }

  const groupedBadges = badgePathMeta.map((pathMeta) => {
    const items = badges
      .filter((badge) => getBadgePathId(badge) === pathMeta.pathId)
      .sort((left, right) => {
        if (left.stepIndex !== right.stepIndex) {
          return left.stepIndex - right.stepIndex;
        }
        if (left.isActive !== right.isActive) {
          return left.isActive ? -1 : 1;
        }
        if (left.pathOrder !== right.pathOrder) {
          return left.pathOrder - right.pathOrder;
        }
        return left.name.localeCompare(right.name);
      });

    const steps = Array.from({ length: 5 }, (_, index) => {
      const stepIndex = index + 1;
      return items.find((badge) => badge.stepIndex === stepIndex) ?? null;
    });

    return {
      ...pathMeta,
      items,
      steps,
    };
  });

  const selectedBadge =
    selectedBadgeId == null
      ? null
      : (badges.find((badge) => badge.id === selectedBadgeId) ?? null);
  const currentStepIndex = Number.parseInt(badgeForm.stepIndex, 10) || 1;
  const currentPathMeta = resolvePathMeta(badgeForm.pathId, badgeForm.category);
  const occupiedActiveBadge =
    badges.find(
      (badge) =>
        badge.pathId === badgeForm.pathId &&
        badge.stepIndex === currentStepIndex &&
        badge.isActive &&
        badge.id !== selectedBadge?.id,
    ) ?? null;
  const previewState = buildBadgePreview(badgeForm, selectedBadge, badges);
  const diagnosticsIssues = diagnostics?.issues ?? [];
  const diagnosticsSummary = {
    error: diagnosticsIssues.filter((issue) => issue.severity === "error")
      .length,
    warning: diagnosticsIssues.filter((issue) => issue.severity === "warning")
      .length,
    info: diagnosticsIssues.filter((issue) => issue.severity === "info").length,
  };
  const selectedRoute =
    groupedBadges.find((route) => route.pathId === selectedRouteId) ??
    groupedBadges[0];
  const saveBlockedByActiveConflict = Boolean(
    occupiedActiveBadge && badgeForm.isActive,
  );
  const auditBadgeOptions = [...badges].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const productCategories = Array.from(
    new Set(products.map((product) => product.category)),
  ).sort((left, right) => left.localeCompare(right));
  const filteredProducts = [...products]
    .filter((product) => {
      const query = productFilters.search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        [
          product.name,
          product.sku,
          product.category,
          product.badge,
          product.specialistName,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesCategory =
        productFilters.category.length === 0 ||
        product.category === productFilters.category;
      const matchesStatus =
        productFilters.status.length === 0 ||
        product.status === productFilters.status;
      const matchesFeatured =
        productFilters.featured.length === 0 ||
        (productFilters.featured === "true"
          ? product.featured
          : !product.featured);
      const matchesMadeToOrder =
        productFilters.madeToOrder.length === 0 ||
        (productFilters.madeToOrder === "true"
          ? product.madeToOrder
          : !product.madeToOrder);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesFeatured &&
        matchesMadeToOrder
      );
    })
    .sort((left, right) => {
      switch (productFilters.sortBy) {
        case "name":
          return left.name.localeCompare(right.name);
        case "price":
          return right.price.amount - left.price.amount;
        case "stock":
          return right.stockQuantity - left.stockQuantity;
        case "recent":
          return (
            toTimestamp(right.updatedAt ?? right.createdAt) -
            toTimestamp(left.updatedAt ?? left.createdAt)
          );
        default:
          return 0;
      }
    });
  const visibleProducts = filteredProducts.slice(0, 24);
  const hasProductFilters =
    productFilters.search.trim().length > 0 ||
    productFilters.category.length > 0 ||
    productFilters.status.length > 0 ||
    productFilters.featured.length > 0 ||
    productFilters.madeToOrder.length > 0 ||
    productFilters.sortBy !== "recent";
  const filteredSpecialists = specialists
    .filter((specialist) => {
      const query = specialistFilters.search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        [
          specialist.name,
          specialist.headline,
          specialist.specialties.join(" "),
          specialist.services.map((service) => service.name).join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesFeatured =
        specialistFilters.featured.length === 0 ||
        (specialistFilters.featured === "true"
          ? specialist.featured
          : !specialist.featured);
      const matchesActive =
        specialistFilters.active.length === 0 ||
        String(specialist.isActive) === specialistFilters.active;
      const matchesVisible =
        specialistFilters.visible.length === 0 ||
        String(specialist.isVisible) === specialistFilters.visible;
      return (
        matchesSearch && matchesFeatured && matchesActive && matchesVisible
      );
    })
    .sort((left, right) => left.name.localeCompare(right.name));
  const specialistOverview = {
    total: filteredSpecialists.length,
    active: filteredSpecialists.filter((specialist) => specialist.isActive)
      .length,
    visible: filteredSpecialists.filter((specialist) => specialist.isVisible)
      .length,
    featured: filteredSpecialists.filter((specialist) => specialist.featured)
      .length,
  };
  const filteredUsers = users
    .filter((user) => {
      const query = userFilters.search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        [
          user.fullName,
          user.email,
          user.phoneNumber,
          user.planId,
          user.roles.join(" "),
          user.accountType,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesRole =
        userFilters.role.length === 0 ||
        (userFilters.role === "client"
          ? user.accountType === "client" && user.roles.length === 0
          : user.roles.includes(userFilters.role as "admin" | "specialist"));
      const matchesAccountType =
        userFilters.accountType.length === 0 ||
        (userFilters.accountType === "normal"
          ? user.accountType === "client" &&
            !user.roles.includes("specialist") &&
            !user.roles.includes("admin")
          : userFilters.accountType === "specialist"
            ? user.accountType === "specialist" ||
              user.roles.includes("specialist")
            : user.roles.includes("admin"));
      return matchesSearch && matchesRole && matchesAccountType;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const userTotals = {
    total: users.length,
    clients: users.filter(
      (user) => user.accountType === "client" && user.roles.length === 0,
    ).length,
    specialists: users.filter((user) => user.roles.includes("specialist"))
      .length,
    admins: users.filter((user) => user.roles.includes("admin")).length,
    premium: users.filter(isPremiumActiveUser).length,
  };
  const communityModerationByUserId = new Map(
    communityModerations.map((moderation) => [moderation.userId, moderation]),
  );
  const activeCommunityModerations = communityModerations.filter(
    (moderation) => moderation.isMuted || moderation.isBanned,
  );
  const selectedSupportTicket =
    supportDetail?.ticket ??
    supportOverview?.items.find((item) => item.id === selectedSupportTicketId) ??
    null;
  const courseStats = {
    total: courses.length,
    published: courses.filter((course) => course.status === "published").length,
    draft: courses.filter((course) => course.status === "draft").length,
    archived: courses.filter((course) => course.status === "archived").length,
  };
  const allServices = specialists
    .flatMap((specialist) =>
      specialist.services.map((service) => ({
        specialist,
        service,
      })),
    )
    .filter(({ specialist, service }) => {
      const query = serviceFilters.search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        [service.name, service.description, service.category, specialist.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesSpecialist =
        serviceFilters.specialistId.length === 0 ||
        specialist.id === serviceFilters.specialistId;
      const matchesCategory =
        serviceFilters.category.length === 0 ||
        service.category === serviceFilters.category;
      return matchesSearch && matchesSpecialist && matchesCategory;
    })
    .sort((left, right) =>
      left.specialist.name.localeCompare(right.specialist.name),
    );
  const serviceCategories = Array.from(
    new Set(
      specialists.flatMap((specialist) =>
        specialist.services.map((service) => service.category),
      ),
    ),
  ).sort((left, right) => left.localeCompare(right));
  const agendaBookings = [...bookings]
    .filter((booking) => {
      const matchesSpecialist =
        agendaFilters.specialistId.length === 0 ||
        booking.specialistId === agendaFilters.specialistId;
      const matchesStatus =
        agendaFilters.status.length === 0 ||
        booking.status === agendaFilters.status;
      return matchesSpecialist && matchesStatus;
    })
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
  const specialistMetrics = {
    bookings: selectedSpecialistBookings.length,
    services: selectedSpecialistServices.length,
    availability: selectedSpecialistAvailability.filter(
      (slot) => slot.isAvailable,
    ).length,
    nextAvailableAt:
      selectedSpecialistAvailability.find(
        (slot) => new Date(slot.startsAt).getTime() > Date.now(),
      )?.startsAt ??
      selectedSpecialistDetail?.nextAvailableAt ??
      "",
  };
  const selectedProduct = selectedProductId
    ? (products.find((product) => product.id === selectedProductId) ?? null)
    : null;
  const selectedCourse = selectedCourseId
    ? (courses.find((course) => course.id === selectedCourseId) ?? null)
    : null;
  const selectedCourseModules = selectedCourse?.modules ?? [];
  const selectedCourseModule = selectedCourseModuleId
    ? (selectedCourseModules.find(
        (module) => module.id === selectedCourseModuleId,
      ) ?? null)
    : null;
  const selectedCourseLessons = selectedCourseModule?.lessons ?? [];
  const selectedCourseResources = courseResources.filter(
    (resource) =>
      resource.courseId === (selectedCourse?.id ?? selectedCourseId ?? ""),
  );
  const libraryCategorySummaries = (() => {
    const categories = new Map<
      string,
      {
        key: string;
        label: string;
        count: number;
        publishedCount: number;
        linkedCount: number;
      }
    >();

    for (const pdf of libraryPdfs) {
      const rawCategory = pdf.category?.trim() ?? "";
      const key = normalizeLibraryCategoryKey(rawCategory);
      const label = formatLibraryCategoryLabel(rawCategory);
      const current = categories.get(key) ?? {
        key,
        label,
        count: 0,
        publishedCount: 0,
        linkedCount: 0,
      };

      current.count += 1;
      if (pdf.status === "published" && pdf.isActive !== false) {
        current.publishedCount += 1;
      }
      if (pdf.courseId) {
        current.linkedCount += 1;
      }

      categories.set(key, current);
    }

    return [...categories.values()].sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  })();
  const libraryCategorySuggestions = libraryCategorySummaries.map(
    (item) => item.label,
  );
  const libraryRecentPdfs = [...libraryPdfs].sort((left, right) => {
    const rightUpdated = right.updatedAt ?? "";
    const leftUpdated = left.updatedAt ?? "";
    const updatedComparison = rightUpdated.localeCompare(leftUpdated);
    if (updatedComparison !== 0) {
      return updatedComparison;
    }

    return left.title.localeCompare(right.title);
  });
  const librarySearchTerm = librarySearch.trim().toLowerCase();
  const libraryCategoryFilterKey = normalizeLibraryCategoryKey(
    libraryCategoryFilter,
  );
  const libraryFolderInputProps = {
    webkitdirectory: "",
    directory: "",
  } as Record<string, unknown>;
  const libraryVisiblePdfs = libraryRecentPdfs.filter((pdf) => {
    const searchableText = [
      pdf.title,
      pdf.description,
      pdf.category,
      pdf.courseId
        ? (courses.find((course) => course.id === pdf.courseId)?.title ??
          pdf.courseId)
        : "",
      pdf.status ?? "",
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch =
      !librarySearchTerm || searchableText.includes(librarySearchTerm);
    const matchesCategory =
      libraryCategoryFilterKey === "all" ||
      normalizeLibraryCategoryKey(pdf.category ?? "") ===
        libraryCategoryFilterKey;
    const matchesFilter =
      libraryFilter === "all"
        ? true
        : libraryFilter === "free"
          ? !pdf.courseId
          : libraryFilter === "linked"
            ? Boolean(pdf.courseId)
            : pdf.status === "published" && pdf.isActive !== false;

    return matchesSearch && matchesCategory && matchesFilter;
  });
  const libraryStandaloneCount = libraryPdfs.filter(
    (pdf) => !pdf.courseId,
  ).length;
  const libraryLinkedCount = libraryPdfs.filter((pdf) =>
    Boolean(pdf.courseId),
  ).length;
  const libraryPublishedCount = libraryPdfs.filter(
    (pdf) => pdf.status === "published" && pdf.isActive !== false,
  ).length;
  const libraryArchivedCount = libraryPdfs.filter(
    (pdf) => pdf.status === "archived" || pdf.isActive === false,
  ).length;
  const selectedLibraryCourse = libraryPdfForm.linkToCourse
    ? (courses.find((course) => course.id === libraryPdfForm.courseId) ?? null)
    : null;
  const openLibraryPdfEditor = (pdf: AdminLibraryPdf) => {
    resetLibraryPdfDraft(pdf);
    setActiveSection("courses");
    setIsCourseDrawerOpen(true);
    setSelectedCourseId(pdf.courseId ?? null);
    setCourseDrawerTab("library");
    window.history.pushState(
      {},
      "",
      buildCourseWorkspaceUrl(pdf.courseId ?? null, "library"),
    );
  };
  const selectedBooking = selectedBookingId
    ? (bookings.find((booking) => booking.id === selectedBookingId) ?? null)
    : null;
  const selectedBookingSpecialist =
    specialists.find(
      (specialist) => specialist.id === bookingForm.specialistId,
    ) ?? null;
  const selectedBookingServices = selectedBookingSpecialist?.services ?? [];
  const selectedBookingService =
    selectedBookingServices.find(
      (service) => service.id === bookingForm.serviceId,
    ) ?? null;
  const auditRouteOptions = badgePathMeta.reduce<Record<string, BadgePathMeta>>(
    (accumulator, path) => ({
      ...accumulator,
      [path.pathId]: path,
    }),
    {},
  );
  const selectedAuditPath = selectedAuditEntry?.pathId
    ? auditRouteOptions[selectedAuditEntry.pathId]
    : null;
  const selectedAuditPreviousValue = selectedAuditEntry
    ? formatAuditDetailValue(selectedAuditEntry.previousValue)
    : "—";
  const selectedAuditNewValue = selectedAuditEntry
    ? formatAuditDetailValue(selectedAuditEntry.newValue)
    : "—";
  const selectedAuditNeedsComparison =
    selectedAuditEntry != null &&
    [
      "rules",
      "prerequisiteBadgeIds",
      "pathId",
      "pathOrder",
      "stepIndex",
      "status",
      "premium",
      "featured",
      "order",
      "module",
      "lesson",
      "resource",
      "library_pdf",
      "title",
      "subtitle",
      "description",
      "category",
      "level",
    ].includes(selectedAuditEntry.fieldChanged);

  if (authStatus === "loading") {
    return null;
  }

  if (authStatus !== "authenticated") {
    const loginErrorMessage = authError ?? error;

    return (
      <main
        className="admin-shell admin-auth-shell container-xxl"
        data-build={adminBuildStamp}
      >
        <section className="admin-auth-panel admin-auth-panel-entry">
          <AuthParticles />
          <form
            className="auth-card auth-entry-card"
            onSubmit={(event) => void handleLogin(event)}
          >
            <div className="auth-entry-brand">
              <BrandLockup />
              <h1>Acceso seguro</h1>
            </div>

            <label>
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="admin@tudominio.com"
              />
            </label>
            <label>
              <span>Contraseña</span>
              <input
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Tu contraseña"
              />
            </label>
            <button
              type="submit"
              className="primary-button button-with-icon"
              disabled={loginLoading}
            >
              <span className="button-icon" aria-hidden="true">
                <ActionIcon name="login" />
              </span>
              <span>{loginLoading ? "Ingresando..." : "Ingresar"}</span>
            </button>
            {loginErrorMessage ? (
              <p className="badge-feedback badge-feedback-error">
                {loginErrorMessage}
              </p>
            ) : null}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main
      className={
        isCourseDrawerOpen
          ? "admin-shell admin-dashboard-shell admin-shell-course-view container-xxl"
          : "admin-shell admin-dashboard-shell container-xxl"
      }
      data-build={adminBuildStamp}
    >
      <div
        className={
          isCourseDrawerOpen
            ? "admin-layout admin-layout-course-view"
            : "admin-layout"
        }
      >
        <aside className="admin-sidebar">
          <BrandLockup compact />

          <nav className="admin-nav" aria-label="Secciones administrativas">
            {(
              Object.entries(adminSectionLabels) as Array<
                [AdminSection, string]
              >
            ).map(([section, label]) => (
              <button
                key={section}
                type="button"
                className={
                  activeSection === section
                    ? "nav-item nav-item-active"
                    : "nav-item"
                }
                onClick={() => handleNavigateSection(section)}
              >
                <span className="nav-item-icon" aria-hidden="true">
                  <SidebarIcon name={section} />
                </span>
                <span className="nav-item-copy">
                  <strong>{label}</strong>
                </span>
              </button>
            ))}
          </nav>

          <div className="sidebar-session">
            <span>Sesión activa</span>
            <strong>Cuenta activa</strong>
            <p>{adminUser?.email ?? "Sin email"}</p>
            <button
              type="button"
              className="secondary-button button-with-icon"
              onClick={() => void handleLogout()}
            >
              <span className="button-icon" aria-hidden="true">
                <ActionIcon name="logout" />
              </span>
              Cerrar sesión
            </button>
          </div>
        </aside>

        <div className="admin-content">
          <header className="admin-topbar" />

          {error ? (
            <section className="admin-panel admin-error">
              <h2>Conexión pendiente</h2>
              <p>{error}</p>
              <code>{apiBaseUrl}</code>
            </section>
          ) : null}

          {operatingPanelError ? (
            <section className="admin-panel admin-error">
              <h2>Operación pendiente</h2>
              <p>{operatingPanelError}</p>
            </section>
          ) : null}

          {operatingPanelMessage ? (
            <section className="admin-panel admin-success">
              <h2>Actualización correcta</h2>
              <p>{operatingPanelMessage}</p>
            </section>
          ) : null}

          {activeSection === "specialists" ? (
            <section className="admin-panel admin-panel-wide">
              <div className="panel-head badge-panel-head">
                <div>
                  <p className="eyebrow">Especialistas</p>
                  <h2>Equipo operativo</h2>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setActiveSection("agenda")}
                >
                  Ver agenda
                </button>
              </div>

              <div className="specialist-summary-grid">
                <article className="metric-card specialist-summary-card">
                  <span>Total</span>
                  <strong>{specialistOverview.total}</strong>
                </article>
                <article className="metric-card specialist-summary-card">
                  <span>Activos</span>
                  <strong>{specialistOverview.active}</strong>
                </article>
                <article className="metric-card specialist-summary-card">
                  <span>Visibles</span>
                  <strong>{specialistOverview.visible}</strong>
                </article>
                <article className="metric-card specialist-summary-card">
                  <span>Destacados</span>
                  <strong>{specialistOverview.featured}</strong>
                </article>
              </div>

              <div className="product-toolbar specialist-toolbar">
                <label>
                  <span>Buscar</span>
                  <input
                    value={specialistFilters.search}
                    onChange={(event) =>
                      setSpecialistFilters((current) => ({
                        ...current,
                        search: event.target.value,
                      }))
                    }
                    placeholder="Nombre, titular o servicio"
                  />
                </label>
                <label>
                  <span>Destacado</span>
                  <select
                    value={specialistFilters.featured}
                    onChange={(event) =>
                      setSpecialistFilters((current) => ({
                        ...current,
                        featured: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <label>
                  <span>Activo</span>
                  <select
                    value={specialistFilters.active}
                    onChange={(event) =>
                      setSpecialistFilters((current) => ({
                        ...current,
                        active: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <label>
                  <span>Visible</span>
                  <select
                    value={specialistFilters.visible}
                    onChange={(event) =>
                      setSpecialistFilters((current) => ({
                        ...current,
                        visible: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </label>
              </div>

              <div className="specialist-grid">
                {filteredSpecialists.map((specialist) => (
                  <article key={specialist.id} className="specialist-card">
                    <div className="specialist-card-top">
                      <div className="specialist-avatar-shell">
                        {specialist.avatarUrl ? (
                          <img
                            src={specialist.avatarUrl}
                            alt={specialist.name}
                            className="specialist-avatar"
                          />
                        ) : (
                          <span
                            className="specialist-avatar specialist-avatar-fallback"
                            aria-hidden="true"
                          >
                            {specialist.name
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((chunk) => chunk[0]?.toUpperCase() ?? "")
                              .join("")}
                          </span>
                        )}
                      </div>
                      <div className="specialist-card-head">
                        <div>
                          <h3>{specialist.name}</h3>
                          <p className="product-card-meta specialist-headline">
                            {specialist.headline}
                          </p>
                        </div>
                        <span className="topbar-pill">
                          {specialist.featured ? "Destacado" : "Especialista"}
                        </span>
                      </div>
                    </div>

                    <div className="badge-pill-row product-badges">
                      <span className="badge-pill badge-pill-type">
                        {specialist.isActive ? "Activo" : "Inactivo"}
                      </span>
                      <span className="badge-pill badge-pill-rarity">
                        {specialist.isVisible ? "Visible" : "Oculto"}
                      </span>
                    </div>

                    <div className="specialist-card-body">
                      <p className="muted-copy specialist-specialties">
                        {specialist.specialties.slice(0, 2).join(" · ") ||
                          "Sin especialidad"}
                      </p>
                      <p className="muted-copy specialist-services-preview">
                        {specialist.services.length > 0
                          ? specialist.services
                              .slice(0, 2)
                              .map((service) => service.name)
                              .join(" · ")
                          : "Sin servicios"}
                        {specialist.services.length > 2
                          ? ` +${specialist.services.length - 2}`
                          : ""}
                      </p>
                    </div>

                    <div className="specialist-metrics-inline">
                      <div className="status-card specialist-status-card">
                        <span>Servicios</span>
                        <strong>{specialist.serviceCount}</strong>
                      </div>
                      <div className="status-card specialist-status-card">
                        <span>Reservas</span>
                        <strong>{specialist.bookingCount}</strong>
                      </div>
                    </div>

                    <div className="product-card-actions specialist-card-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() =>
                          void handleOpenSpecialistDrawer(specialist, "profile")
                        }
                      >
                        Gestionar
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          void handleOpenSpecialistDrawer(
                            specialist,
                            "services",
                          )
                        }
                      >
                        Servicios
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          handleOpenBookingDrawer(undefined, specialist.id)
                        }
                      >
                        Nueva reunión
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === "services" ? (
            <section className="admin-panel admin-panel-wide">
              <div className="panel-head badge-panel-head">
                <div>
                  <p className="eyebrow">Servicios</p>
                  <h2>Precio y duración</h2>
                  <p className="hero-copy">
                    Filtra por especialista y abre el editor para crear un nuevo
                    servicio.
                  </p>
                </div>
                <div className="editor-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      void handleCreateServiceFromServicesSection()
                    }
                  >
                    Nuevo servicio
                  </button>
                </div>
              </div>

              <div className="product-toolbar specialist-toolbar">
                <label>
                  <span>Especialista</span>
                  <select
                    value={serviceFilters.specialistId}
                    onChange={(event) =>
                      setServiceFilters((current) => ({
                        ...current,
                        specialistId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    {specialists.map((specialist) => (
                      <option key={specialist.id} value={specialist.id}>
                        {specialist.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Categoría</span>
                  <select
                    value={serviceFilters.category}
                    onChange={(event) =>
                      setServiceFilters((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todas</option>
                    {serviceCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Buscar</span>
                  <input
                    value={serviceFilters.search}
                    onChange={(event) =>
                      setServiceFilters((current) => ({
                        ...current,
                        search: event.target.value,
                      }))
                    }
                    placeholder="Servicio o especialista"
                  />
                </label>
              </div>

              <div className="table-list">
                {allServices.map(({ specialist, service }) => (
                  <article
                    key={`${specialist.id}-${service.id}`}
                    className="table-row service-row"
                  >
                    <div>
                      <strong>{service.name}</strong>
                      <p>{specialist.name}</p>
                      <small>{service.category}</small>
                    </div>
                    <div>
                      <strong>
                        {formatMoney(
                          service.price.amount,
                          service.price.currency,
                        )}
                      </strong>
                      <p>{service.durationMinutes} min</p>
                    </div>
                    <div className="align-right">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          void handleOpenSpecialistDrawer(
                            specialist,
                            "services",
                          )
                        }
                      >
                        Editar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === "agenda" ? (
            <section className="admin-panel admin-panel-wide">
              <div className="panel-head badge-panel-head">
                <div>
                  <p className="eyebrow">Agenda</p>
                  <h2>Próximas sesiones</h2>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleOpenBookingDrawer()}
                >
                  Nueva reunión
                </button>
              </div>

              <div className="product-toolbar specialist-toolbar">
                <label>
                  <span>Especialista</span>
                  <select
                    value={agendaFilters.specialistId}
                    onChange={(event) =>
                      setAgendaFilters((current) => ({
                        ...current,
                        specialistId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    {specialists.map((specialist) => (
                      <option key={specialist.id} value={specialist.id}>
                        {specialist.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Estado</span>
                  <select
                    value={agendaFilters.status}
                    onChange={(event) =>
                      setAgendaFilters((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    <option value="pending_payment">Pendiente</option>
                    <option value="confirmed">Confirmada</option>
                    <option value="cancelled">Cancelada</option>
                    <option value="completed">Completada</option>
                  </select>
                </label>
              </div>

              <div className="table-list">
                {agendaBookings.map((booking) => (
                  <article key={booking.id} className="table-row">
                    <div>
                      <strong>{booking.serviceName}</strong>
                      <p>{booking.userName}</p>
                    </div>
                    <div>
                      <strong>{booking.specialistName}</strong>
                      <p>{formatDate(booking.scheduledAt)}</p>
                    </div>
                    <div className="align-right">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleOpenBookingDrawer(booking)}
                      >
                        Editar
                      </button>
                      <span className="topbar-pill">
                        {formatBookingStatusLabel(booking.status)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === "bookings" ? (
            <section className="admin-panel admin-panel-wide">
              <div className="panel-head badge-panel-head">
                <div>
                  <p className="eyebrow">Reservas / Agenda</p>
                  <h2>Agenda global</h2>
                </div>
                <div className="editor-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleOpenBookingDrawer()}
                  >
                    Nueva reunión
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setActiveSection("orders")}
                  >
                    Órdenes
                  </button>
                </div>
              </div>
              <div className="table-list">
                {bookings.slice(0, 8).map((booking) => (
                  <article key={booking.id} className="table-row">
                    <div>
                      <strong>{booking.serviceName}</strong>
                      <p>{booking.userName}</p>
                    </div>
                    <div>
                      <strong>{booking.specialistName}</strong>
                      <p>{formatDate(booking.scheduledAt)}</p>
                    </div>
                    <div className="align-right">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleOpenBookingDrawer(booking)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          void handleUpdateBookingStatus(booking, "confirmed")
                        }
                      >
                        Confirmar
                      </button>
                      <span className="topbar-pill">
                        {formatBookingStatusLabel(booking.status)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === "orders" ? (
            <section className="admin-panel admin-panel-wide">
              <div className="panel-head badge-panel-head">
                <div>
                  <p className="eyebrow">Órdenes</p>
                  <h2>Seguimiento comercial</h2>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setActiveSection("shop")}
                >
                  Tienda
                </button>
              </div>
              <div className="table-list">
                {orders.slice(0, 8).map((order) => (
                  <article key={order.id} className="table-row">
                    <div>
                      <strong>{order.orderCode}</strong>
                      <p>{order.userName ?? order.userId}</p>
                      {order.deliveryAddress ? (
                        <p>{order.deliveryAddress}</p>
                      ) : null}
                    </div>
                    <div>
                      <strong>{order.specialistName}</strong>
                      <p>{formatDate(order.createdAt)}</p>
                      <p>{formatOrderStatusPurpose(order.status)}</p>
                    </div>
                    <div className="align-right">
                      <div className="editor-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            void handleUpdateOrderStatus(order, "confirmed")
                          }
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            void handleUpdateOrderStatus(order, "preparing")
                          }
                        >
                          Preparar
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            void handleUpdateOrderStatus(order, "shipped")
                          }
                        >
                          Enviar
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            void handleUpdateOrderStatus(order, "delivered")
                          }
                        >
                          Entregada
                        </button>
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => void handleOpenOrderChat(order)}
                        >
                          Chat
                        </button>
                      </div>
                      <strong>{formatOrderStatusLabel(order.status)}</strong>
                      <p>{order.itemCount} items</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === "shop" ? (
            <section className="admin-panel admin-panel-wide product-admin-panel">
              <div className="panel-head badge-panel-head">
                <div>
                  <p className="eyebrow">Productos</p>
                  <h2>Administra catálogo, precios, stock y visibilidad.</h2>
                  <p className="hero-copy">
                    Filtra, edita y archiva productos reales sin salir de la
                    vista.
                  </p>
                </div>
                <div className="editor-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleOpenProductDrawer()}
                  >
                    Nuevo producto
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setActiveSection("orders")}
                  >
                    Órdenes
                  </button>
                </div>
              </div>

              <div className="product-toolbar">
                <label>
                  <span>Buscar</span>
                  <input
                    value={productFilters.search}
                    onChange={(event) =>
                      setProductFilters((current) => ({
                        ...current,
                        search: event.target.value,
                      }))
                    }
                    placeholder="Nombre, SKU o código"
                  />
                </label>
                <label>
                  <span>Categoría</span>
                  <select
                    value={productFilters.category}
                    onChange={(event) =>
                      setProductFilters((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todas</option>
                    {productCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Estado</span>
                  <select
                    value={productFilters.status}
                    onChange={(event) =>
                      setProductFilters((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    <option value="active">Activos</option>
                    <option value="hidden">Ocultos</option>
                    <option value="draft">Borradores</option>
                    <option value="archived">Archivados</option>
                  </select>
                </label>
                <label>
                  <span>Destacado</span>
                  <select
                    value={productFilters.featured}
                    onChange={(event) =>
                      setProductFilters((current) => ({
                        ...current,
                        featured: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <label>
                  <span>Hecho a pedido</span>
                  <select
                    value={productFilters.madeToOrder}
                    onChange={(event) =>
                      setProductFilters((current) => ({
                        ...current,
                        madeToOrder: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <label>
                  <span>Orden</span>
                  <select
                    value={productFilters.sortBy}
                    onChange={(event) =>
                      setProductFilters((current) => ({
                        ...current,
                        sortBy: event.target.value as ProductSortBy,
                      }))
                    }
                  >
                    <option value="recent">Recientes</option>
                    <option value="name">Nombre</option>
                    <option value="price">Precio</option>
                    <option value="stock">Stock</option>
                  </select>
                </label>
                <div className="toolbar-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setProductFilters({
                        search: "",
                        category: "",
                        status: "",
                        featured: "",
                        madeToOrder: "",
                        sortBy: "recent",
                      })
                    }
                    disabled={!hasProductFilters}
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>

              <div className="hero-status product-stats-grid">
                <div className="status-card">
                  <span>Total</span>
                  <strong>{products.length}</strong>
                </div>
                <div className="status-card">
                  <span>Visibles</span>
                  <strong>
                    {
                      products.filter(
                        (product) =>
                          product.status !== "hidden" &&
                          product.status !== "archived",
                      ).length
                    }
                  </strong>
                </div>
                <div className="status-card">
                  <span>Destacados</span>
                  <strong>
                    {products.filter((product) => product.featured).length}
                  </strong>
                </div>
                <div className="status-card">
                  <span>Sin stock</span>
                  <strong>
                    {
                      products.filter(
                        (product) =>
                          product.stockQuantity <= 0 && !product.madeToOrder,
                      ).length
                    }
                  </strong>
                </div>
              </div>

              {visibleProducts.length > 0 ? (
                <div className="product-grid">
                  {visibleProducts.map((product) => {
                    const primaryImage =
                      product.imageUrl || product.imageUrls?.[0] || "";
                    const resolvedPrimaryImage = resolveMediaUrl(primaryImage);
                    return (
                      <article key={product.id} className="product-card">
                        <div className="product-card-media">
                          {hasRenderableMediaUrl(primaryImage) ? (
                            <img
                              src={resolvedPrimaryImage}
                              alt={product.name}
                              className="product-card-image"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="product-card-image product-card-image-fallback">
                              {product.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="product-card-body">
                          <div className="product-card-head">
                            <div>
                              <p className="product-card-meta">
                                {product.category} · {product.sku}
                              </p>
                              <h3>{product.name}</h3>
                              <p className="product-card-meta">
                                Actualizado{" "}
                                {formatOptionalDate(
                                  product.updatedAt ?? product.createdAt,
                                )}
                              </p>
                            </div>
                            <span className="topbar-pill">
                              {product.status}
                            </span>
                          </div>

                          <div className="product-card-pricing">
                            <strong>
                              {formatMoney(
                                product.price.amount,
                                product.price.currency,
                              )}
                            </strong>
                            <span>{product.stockLabel}</span>
                          </div>

                          <div className="badge-pill-row product-badges">
                            <span className="badge-pill badge-pill-type">
                              {getProductVisibilityLabel(product.status)}
                            </span>
                            <span className="badge-pill badge-pill-type">
                              {getProductCommercialLabel(product.status)}
                            </span>
                            <span
                              className={`badge-pill ${
                                product.featured
                                  ? "badge-pill-manual"
                                  : "badge-pill-rarity"
                              }`}
                            >
                              {product.featured ? "Destacado" : "Normal"}
                            </span>
                            <span className="badge-pill badge-pill-type">
                              {product.madeToOrder ? "A pedido" : "Stock"}
                            </span>
                          </div>

                          <div className="product-card-actions">
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleOpenProductDrawer(product)}
                            >
                              Ver detalle
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleOpenProductDrawer(product)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => handleDuplicateProduct(product)}
                            >
                              Duplicar
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                void handleToggleProductVisibility(product)
                              }
                            >
                              {product.status === "hidden"
                                ? "Mostrar"
                                : "Ocultar"}
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                void handleToggleProductFeatured(product)
                              }
                            >
                              {product.featured
                                ? "Quitar destacado"
                                : "Destacar"}
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                void handleAdjustProductPrice(product)
                              }
                            >
                              Precio
                            </button>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                void handleAdjustProductStock(product)
                              }
                            >
                              Stock
                            </button>
                            <button
                              type="button"
                              className="danger-button"
                              onClick={() => void handleArchiveProduct(product)}
                            >
                              Archivar
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>No hay productos con esos filtros.</h3>
                  <p>
                    Ajusta los filtros o crea un producto nuevo para comenzar.
                  </p>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handleOpenProductDrawer()}
                  >
                    Crear producto
                  </button>
                </div>
              )}
            </section>
          ) : null}

          {activeSection === "courses" ? (
            isCourseDrawerOpen ? null : (
              <section className="admin-panel admin-panel-wide">
                <div className="panel-head badge-panel-head course-panel-head">
                  <div>
                    <p className="eyebrow">Cursos</p>
                    <h2>Biblioteca formativa</h2>
                    <p className="hero-copy">
                      Gestiona cursos, módulos, lecciones, biblioteca PDF y
                      publicación desde un solo panel.
                    </p>
                  </div>
                  <div className="course-panel-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        openCourseWorkspaceTab(courses[0]?.id ?? null, "data")
                      }
                      disabled={courses.length === 0}
                    >
                      Continuar edición
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => openCourseWorkspaceTab(null, "data")}
                    >
                      Crear curso
                    </button>
                  </div>
                </div>

                <div className="course-stat-grid">
                  <article className="course-stat-card">
                    <span>Total</span>
                    <strong>{courseStats.total}</strong>
                    <p>Biblioteca completa</p>
                  </article>
                  <article className="course-stat-card">
                    <span>Publicados</span>
                    <strong>{courseStats.published}</strong>
                    <p>Listos para consumo</p>
                  </article>
                  <article className="course-stat-card">
                    <span>Borradores</span>
                    <strong>{courseStats.draft}</strong>
                    <p>En edición</p>
                  </article>
                  <article className="course-stat-card">
                    <span>Archivados</span>
                    <strong>{courseStats.archived}</strong>
                    <p>Guardados fuera de la vista</p>
                  </article>
                </div>

                <div className="course-grid">
                  {courses.slice(0, 12).map((course) => (
                    <article key={course.id} className="course-card">
                      <div className="course-card-head">
                        <div>
                          <p className="product-card-meta">
                            {course.category || "Sin categoría"}
                          </p>
                          <h3>{course.title}</h3>
                          <p className="course-card-copy">{course.subtitle}</p>
                        </div>
                        <span className="topbar-pill">
                          {course.status === "published"
                            ? "Publicado"
                            : course.status === "archived"
                              ? "Archivado"
                              : "Borrador"}
                        </span>
                      </div>

                      <div className="course-card-metrics">
                        <div className="course-mini-metric">
                          <span>Módulos</span>
                          <strong>{course.moduleCount}</strong>
                        </div>
                        <div className="course-mini-metric">
                          <span>Lecciones</span>
                          <strong>{course.lessonCount}</strong>
                        </div>
                        <div className="course-mini-metric">
                          <span>Progreso</span>
                          <strong>{course.progressPercent}%</strong>
                        </div>
                      </div>

                      <div className="badge-pill-row course-card-badges">
                        <span className="badge-pill badge-pill-type">
                          {course.premium ? "Premium" : "Libre"}
                        </span>
                        <span className="badge-pill badge-pill-rarity">
                          {course.featured ? "Destacado" : "Normal"}
                        </span>
                      </div>

                      <div className="course-card-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            openCourseWorkspaceTab(course.id, "data")
                          }
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            openCourseWorkspaceTab(course.id, "modules")
                          }
                        >
                          Módulos
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            openCourseWorkspaceTab(course.id, "library")
                          }
                        >
                          Biblioteca
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            openCourseWorkspaceTab(course.id, "publication")
                          }
                        >
                          Publicación
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                {courses.length === 0 ? (
                  <div className="empty-state">
                    <h3>No hay cursos todavía.</h3>
                    <p>
                      Crea un curso para empezar a organizar módulos, lecciones
                      y biblioteca.
                    </p>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => openCourseWorkspaceTab(null, "data")}
                    >
                      Crear curso
                    </button>
                  </div>
                ) : null}
              </section>
            )
          ) : null}

          {activeSection === "library" ? (
            <section className="admin-panel admin-panel-wide">
              <div className="library-shell">
                <div className="library-hero">
                  <div className="library-hero-copy">
                    <p className="eyebrow">Biblioteca</p>
                    <h2>Gestión simple de PDFs</h2>
                    <p className="hero-copy">
                      Sube uno o varios PDFs, define una categoría clara y
                      decide si el material queda libre o vinculado a un curso.
                    </p>
                  </div>
                  <div className="library-hero-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setActiveSection("courses")}
                    >
                      Ir a cursos
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => openCourseWorkspaceTab(null, "library")}
                    >
                      Abrir editor
                    </button>
                  </div>
                </div>

                <div className="library-metrics">
                  <article className="library-metric-card">
                    <span>Total PDFs</span>
                    <strong>{libraryPdfs.length}</strong>
                    <p>Material registrado</p>
                  </article>
                  <article className="library-metric-card">
                    <span>Publicados</span>
                    <strong>{libraryPublishedCount}</strong>
                    <p>Visibles en la app móvil</p>
                  </article>
                  <article className="library-metric-card">
                    <span>Sin vínculo</span>
                    <strong>{libraryStandaloneCount}</strong>
                    <p>Material libre por categoría</p>
                  </article>
                  <article className="library-metric-card">
                    <span>Con curso</span>
                    <strong>{libraryLinkedCount}</strong>
                    <p>Material conectado al aula</p>
                  </article>
                  <article className="library-metric-card">
                    <span>Archivados</span>
                    <strong>{libraryArchivedCount}</strong>
                    <p>Ocultos del catálogo y de la app</p>
                  </article>
                </div>

                <div className="library-workspace-grid">
                  <article className="course-subview-card library-workbench-card">
                    <div className="panel-head library-panel-head">
                      <div>
                        <p className="eyebrow">PDF único</p>
                        <h3>Subir un archivo</h3>
                      </div>
                      <span className="topbar-pill">1 PDF</span>
                    </div>
                    <form
                      className="badge-form-grid badge-form-grid-compact"
                      onSubmit={(event) => void handleSaveLibraryPdf(event)}
                    >
                      <label className="form-wide">
                        <span>Archivo PDF</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            setLibraryPdfFile(file);
                            if (file && !libraryPdfForm.title.trim()) {
                              const prettyName = prettifyLibraryFileTitle(
                                file.name,
                              );
                              if (prettyName) {
                                setLibraryPdfForm((current) => ({
                                  ...current,
                                  title: prettyName,
                                }));
                              }
                            }
                          }}
                        />
                        <p className="muted-copy" style={{ marginTop: 8 }}>
                          {libraryPdfFile
                            ? `Seleccionado: ${libraryPdfFile.name}`
                            : libraryPdfForm.fileUrl
                              ? "Archivo cargado anteriormente"
                              : "Selecciona un PDF, DOC o DOCX para subirlo."}
                        </p>
                      </label>
                      <label className="form-wide">
                        <span>Título</span>
                        <input
                          value={libraryPdfForm.title}
                          onChange={(event) =>
                            setLibraryPdfForm((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          placeholder="Nombre del PDF"
                        />
                      </label>
                      <label className="form-wide">
                        <div className="library-toggle-row">
                          <span>Categoría</span>
                          <label className="switch-row compact">
                            <input
                              type="checkbox"
                              checked={libraryPdfForm.assignCategory}
                              onChange={(event) =>
                                setLibraryPdfForm((current) => ({
                                  ...current,
                                  assignCategory: event.target.checked,
                                  category: event.target.checked
                                    ? current.category
                                    : "",
                                }))
                              }
                            />
                            <span>Asignar</span>
                          </label>
                        </div>
                        {libraryPdfForm.assignCategory ? (
                          <>
                            <input
                              list="library-category-suggestions"
                              value={libraryPdfForm.category}
                              onChange={(event) =>
                                setLibraryPdfForm((current) => ({
                                  ...current,
                                  category: event.target.value,
                                }))
                              }
                              placeholder="Ej. Tarot, Guías, Rituales"
                            />
                            <datalist id="library-category-suggestions">
                              {libraryCategorySuggestions.map((category) => (
                                <option key={category} value={category} />
                              ))}
                            </datalist>
                            <div className="library-chip-row">
                              {libraryCategorySuggestions.length > 0 ? (
                                libraryCategorySuggestions
                                  .slice(0, 6)
                                  .map((category) => (
                                    <button
                                      key={category}
                                      type="button"
                                      className={`library-chip${libraryPdfForm.category.trim().toLowerCase() === category.toLowerCase() ? " library-chip-active" : ""}`}
                                      onClick={() =>
                                        setLibraryPdfForm((current) => ({
                                          ...current,
                                          category,
                                        }))
                                      }
                                    >
                                      {category}
                                    </button>
                                  ))
                              ) : (
                                <span className="muted-copy">
                                  Sin categorías aún.
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="muted-copy">
                            Se guardará como General.
                          </p>
                        )}
                      </label>
                      <div className="library-link-card form-wide">
                        <div className="library-link-card-head">
                          <div>
                            <span className="course-drawer-kicker">Curso</span>
                            <strong>Vinculación opcional</strong>
                          </div>
                          <label className="switch-row">
                            <input
                              type="checkbox"
                              checked={libraryPdfForm.linkToCourse}
                              onChange={(event) =>
                                setLibraryPdfForm((current) => ({
                                  ...current,
                                  linkToCourse: event.target.checked,
                                  courseId: event.target.checked
                                    ? current.courseId
                                    : "",
                                }))
                              }
                            />
                            <span>Vincular</span>
                          </label>
                        </div>
                        {libraryPdfForm.linkToCourse ? (
                          <select
                            value={libraryPdfForm.courseId}
                            onChange={(event) =>
                              setLibraryPdfForm((current) => ({
                                ...current,
                                courseId: event.target.value,
                              }))
                            }
                          >
                            <option value="">Selecciona un curso</option>
                            {courses.map((course) => (
                              <option key={course.id} value={course.id}>
                                {course.title}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="muted-copy">
                            El PDF quedará suelto en la biblioteca.
                          </p>
                        )}
                      </div>
                      <label>
                        <span>Estado</span>
                        <select
                          value={libraryPdfForm.status}
                          onChange={(event) =>
                            setLibraryPdfForm((current) => ({
                              ...current,
                              status: event.target.value as
                                "draft" | "published",
                            }))
                          }
                        >
                          <option value="published">Publicado</option>
                          <option value="draft">Borrador</option>
                        </select>
                      </label>
                      <div className="editor-actions form-wide">
                        <button
                          type="submit"
                          className="primary-button button-with-icon"
                        >
                          <span className="button-icon" aria-hidden="true">
                            <ActionIcon name="upload" />
                          </span>
                          <span>Subir archivo</span>
                        </button>
                      </div>
                    </form>
                  </article>

                  <article className="course-subview-card library-workbench-card">
                    <div className="panel-head library-panel-head">
                      <div>
                        <p className="eyebrow">Carpeta</p>
                        <h3>Subir varios PDFs</h3>
                      </div>
                      <span className="topbar-pill">Múltiples archivos</span>
                    </div>
                    <form
                      className="badge-form-grid badge-form-grid-compact"
                      onSubmit={(event) =>
                        void handleSaveBulkLibraryPdfs(event)
                      }
                    >
                      <label className="form-wide">
                        <span>Carpeta o PDFs</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          multiple
                          ref={libraryBulkInputRef}
                          {...libraryFolderInputProps}
                          onChange={(event) => {
                            setLibraryBulkFiles(
                              Array.from(event.target.files ?? []).filter(
                                (file) => isSupportedLibraryFile(file),
                              ),
                            );
                            event.currentTarget.value = "";
                          }}
                        />
                        <p className="muted-copy" style={{ marginTop: 8 }}>
                          {libraryBulkFiles.length > 0
                            ? `${libraryBulkFiles.length} archivo(s) seleccionados`
                            : "Selecciona una carpeta con PDFs o varios archivos a la vez."}
                        </p>
                      </label>
                      <label className="form-wide">
                        <div className="library-toggle-row">
                          <span>Categoría</span>
                          <label className="switch-row compact">
                            <input
                              type="checkbox"
                              checked={libraryBulkForm.assignCategory}
                              onChange={(event) =>
                                setLibraryBulkForm((current) => ({
                                  ...current,
                                  assignCategory: event.target.checked,
                                  category: event.target.checked
                                    ? current.category
                                    : "",
                                }))
                              }
                            />
                            <span>Asignar</span>
                          </label>
                        </div>
                        {libraryBulkForm.assignCategory ? (
                          <>
                            <input
                              list="library-category-suggestions"
                              value={libraryBulkForm.category}
                              onChange={(event) =>
                                setLibraryBulkForm((current) => ({
                                  ...current,
                                  category: event.target.value,
                                }))
                              }
                              placeholder="Ej. Tarot, Guías, Rituales"
                            />
                            <div className="library-chip-row">
                              {libraryCategorySuggestions.length > 0 ? (
                                libraryCategorySuggestions
                                  .slice(0, 6)
                                  .map((category) => (
                                    <button
                                      key={category}
                                      type="button"
                                      className={`library-chip${libraryBulkForm.category.trim().toLowerCase() === category.toLowerCase() ? " library-chip-active" : ""}`}
                                      onClick={() =>
                                        setLibraryBulkForm((current) => ({
                                          ...current,
                                          category,
                                        }))
                                      }
                                    >
                                      {category}
                                    </button>
                                  ))
                              ) : (
                                <span className="muted-copy">
                                  Sin categorías aún.
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="muted-copy">
                            Se guardará como General.
                          </p>
                        )}
                      </label>
                      <div className="library-link-card form-wide">
                        <div className="library-link-card-head">
                          <div>
                            <span className="course-drawer-kicker">Curso</span>
                            <strong>Vinculación opcional</strong>
                          </div>
                          <label className="switch-row">
                            <input
                              type="checkbox"
                              checked={libraryBulkForm.linkToCourse}
                              onChange={(event) =>
                                setLibraryBulkForm((current) => ({
                                  ...current,
                                  linkToCourse: event.target.checked,
                                  courseId: event.target.checked
                                    ? current.courseId
                                    : "",
                                }))
                              }
                            />
                            <span>Vincular</span>
                          </label>
                        </div>
                        {libraryBulkForm.linkToCourse ? (
                          <select
                            value={libraryBulkForm.courseId}
                            onChange={(event) =>
                              setLibraryBulkForm((current) => ({
                                ...current,
                                courseId: event.target.value,
                              }))
                            }
                          >
                            <option value="">Selecciona un curso</option>
                            {courses.map((course) => (
                              <option key={course.id} value={course.id}>
                                {course.title}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="muted-copy">
                            Quedará libre en la biblioteca.
                          </p>
                        )}
                      </div>
                      <label>
                        <span>Estado</span>
                        <select
                          value={libraryBulkForm.status}
                          onChange={(event) =>
                            setLibraryBulkForm((current) => ({
                              ...current,
                              status: event.target.value as
                                "draft" | "published",
                            }))
                          }
                        >
                          <option value="published">Publicado</option>
                          <option value="draft">Borrador</option>
                        </select>
                      </label>
                      {libraryBulkFiles.length > 0 ? (
                        <section
                          className="library-bulk-preview form-wide"
                          aria-live="polite"
                        >
                          <div>
                            <span>Listo para publicar</span>
                            <strong>
                              {buildBulkUploadSummary().count} PDF(s)
                            </strong>
                            <p>
                              Categoría: {buildBulkUploadSummary().category} ·
                              Curso: {buildBulkUploadSummary().courseLabel}
                            </p>
                          </div>
                          <div className="library-bulk-preview-pills">
                            <span className="topbar-pill">
                              {libraryBulkForm.status === "published"
                                ? "Publicado"
                                : "Borrador"}
                            </span>
                            <span className="topbar-pill">
                              {libraryBulkForm.linkToCourse
                                ? "Con vínculo"
                                : "Sin vínculo"}
                            </span>
                          </div>
                        </section>
                      ) : null}
                      <div className="editor-actions form-wide">
                        <button
                          type="button"
                          className="primary-button button-with-icon"
                          disabled={
                            libraryBulkUploading ||
                            libraryBulkFiles.length === 0
                          }
                          onClick={() => void performBulkLibraryUpload()}
                        >
                          <span className="button-icon" aria-hidden="true">
                            <ActionIcon name="folder-upload" />
                          </span>
                          <span>
                            {libraryBulkUploading
                              ? "Subiendo..."
                              : libraryBulkFiles.length > 0
                                ? `Subir ${libraryBulkFiles.length} archivo(s)`
                                : "Subir carpeta"}
                          </span>
                        </button>
                      </div>
                      {libraryBulkUploading ? (
                        <div
                          className="library-upload-progress form-wide"
                          aria-live="polite"
                        >
                          <div
                            className="library-upload-progress-bar"
                            aria-hidden="true"
                          >
                            <div
                              className="library-upload-progress-fill"
                              style={{
                                width: `${Math.max(8, Math.min(libraryBulkProgress, 100))}%`,
                              }}
                            />
                          </div>
                          <p className="muted-copy">
                            Subiendo PDFs: {libraryBulkProgress}% completado.
                          </p>
                        </div>
                      ) : libraryBulkFiles.length > 0 ? (
                        <p className="muted-copy form-wide">
                          Pulsa el botón para publicar {libraryBulkFiles.length}{" "}
                          PDF(s) con la categoría seleccionada.
                        </p>
                      ) : null}
                    </form>
                  </article>
                </div>

                <article className="course-subview-card library-catalog-card">
                  <div className="panel-head library-panel-head">
                    <div>
                      <p className="eyebrow">Catálogo</p>
                      <h3>PDFs publicados</h3>
                      <p className="hero-copy">
                        Filtra por estado, categoría o busca por título o curso.
                      </p>
                    </div>
                    <span className="topbar-pill">
                      {libraryVisiblePdfs.length} visibles
                    </span>
                  </div>
                  <div className="library-toolbar">
                    <input
                      className="library-search"
                      value={librarySearch}
                      onChange={(event) => setLibrarySearch(event.target.value)}
                      placeholder="Buscar PDF, categoría o curso"
                    />
                    <select
                      className="library-search"
                      value={libraryCategoryFilter}
                      onChange={(event) =>
                        setLibraryCategoryFilter(event.target.value)
                      }
                    >
                      <option value="all">Todas las categorías</option>
                      {libraryCategorySummaries.map((category) => (
                        <option key={category.key} value={category.label}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    <div
                      className="library-filter-pills"
                      role="tablist"
                      aria-label="Filtros de biblioteca"
                    >
                      {[
                        ["all", "Todo"],
                        ["free", "Libres"],
                        ["linked", "Con curso"],
                        ["published", "Publicados"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          role="tab"
                          aria-selected={libraryFilter === value}
                          className={`library-filter-pill${libraryFilter === value ? " library-filter-pill-active" : ""}`}
                          onClick={() =>
                            setLibraryFilter(value as typeof libraryFilter)
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {libraryVisiblePdfs.length > 0 ? (
                    <div className="library-list">
                      {libraryVisiblePdfs.slice(0, 12).map((pdf) => (
                        <article key={pdf.id} className="library-list-row">
                          <div className="library-list-main">
                            <div className="library-list-title">
                              <strong>{pdf.title}</strong>
                              <p>{pdf.description || "Sin descripción"}</p>
                            </div>
                            <div className="library-list-meta">
                              <span>{pdf.category || "Sin categoría"}</span>
                              <span>
                                {pdf.courseId
                                  ? (courses.find(
                                      (course) => course.id === pdf.courseId,
                                    )?.title ?? pdf.courseId)
                                  : "Sin curso"}
                              </span>
                              <span>{pdf.pageCount} páginas</span>
                              <span className="topbar-pill">
                                {pdf.status ?? "draft"}
                              </span>
                            </div>
                          </div>
                          <div className="library-list-actions">
                            <button
                              type="button"
                              className="secondary-button button-with-icon"
                              onClick={() => openLibraryPdfEditor(pdf)}
                            >
                              <span className="button-icon" aria-hidden="true">
                                <ActionIcon name="edit" />
                              </span>
                              Editar
                            </button>
                            <button
                              type="button"
                              className="danger-button button-with-icon"
                              onClick={() => {
                                if (
                                  window.confirm(`¿Eliminar "${pdf.title}"?`)
                                ) {
                                  void handleLibraryPdfAction(pdf.id, "delete");
                                }
                              }}
                            >
                              <span className="button-icon" aria-hidden="true">
                                <ActionIcon name="delete" />
                              </span>
                              Eliminar
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <h3>No hay PDFs con ese filtro.</h3>
                      <p>
                        Prueba con otra búsqueda o sube un nuevo PDF desde la
                        parte superior.
                      </p>
                    </div>
                  )}
                </article>
              </div>
            </section>
          ) : null}

          {activeSection === "users" ? (
            <section className="admin-panel admin-panel-wide">
              <div className="panel-head badge-panel-head">
                <div>
                  <p className="eyebrow">Usuarios</p>
                  <h2>Usuarios y accesos</h2>
                  <p className="hero-copy">
                    Crea usuarios, filtra por rol y define qué partes del panel
                    pueden ver.
                  </p>
                </div>
                <div className="editor-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleOpenUserDrawer()}
                  >
                    Nuevo usuario
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setActiveSection("community")}
                  >
                    Chat
                  </button>
                </div>
              </div>

              <div className="product-toolbar user-toolbar">
                <label>
                  <span>Buscar</span>
                  <input
                    value={userFilters.search}
                    onChange={(event) =>
                      setUserFilters((current) => ({
                        ...current,
                        search: event.target.value,
                      }))
                    }
                    placeholder="Nombre, email o teléfono"
                  />
                </label>
                <label>
                  <span>Rol</span>
                  <select
                    value={userFilters.role}
                    onChange={(event) =>
                      setUserFilters((current) => ({
                        ...current,
                        role: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    <option value="client">Cliente</option>
                    <option value="specialist">Especialista</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <label>
                  <span>Tipo de cuenta</span>
                  <select
                    value={userFilters.accountType}
                    onChange={(event) =>
                      setUserFilters((current) => ({
                        ...current,
                        accountType: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    <option value="normal">Normal</option>
                    <option value="specialist">Especialista</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
                <div className="toolbar-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setUserFilters({
                        search: "",
                        role: "",
                        accountType: "",
                      })
                    }
                    disabled={
                      !userFilters.search &&
                      !userFilters.role &&
                      !userFilters.accountType
                    }
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>

              <div className="hero-status user-stats-grid">
                <div className="status-card">
                  <span>Total</span>
                  <strong>{userTotals.total}</strong>
                </div>
                <div className="status-card">
                  <span>Normales</span>
                  <strong>{userTotals.clients}</strong>
                </div>
                <div className="status-card">
                  <span>Especialistas</span>
                  <strong>{userTotals.specialists}</strong>
                </div>
                <div className="status-card">
                  <span>Admins</span>
                  <strong>{userTotals.admins}</strong>
                </div>
                <div className="status-card">
                  <span>Premium</span>
                  <strong>{userTotals.premium}</strong>
                </div>
              </div>

              <div className="premium-grant-panel">
                <div>
                  <p className="eyebrow">Premium mensual</p>
                  <h3>Habilitación por pago validado</h3>
                  <p>
                    Selecciona la fecha de pago y activa Premium por un mes al
                    usuario correspondiente.
                  </p>
                </div>
                <label>
                  <span>Fecha de pago</span>
                  <input
                    type="date"
                    value={premiumPaymentDate}
                    onChange={(event) =>
                      setPremiumPaymentDate(event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Nota interna</span>
                  <input
                    value={premiumGrantNotes}
                    onChange={(event) =>
                      setPremiumGrantNotes(event.target.value)
                    }
                    placeholder="Pago validado manualmente."
                  />
                </label>
              </div>

              {filteredUsers.length > 0 ? (
                <div className="user-grid">
                  {filteredUsers.map((user) => {
                    const effectiveRoles =
                      user.roles.length > 0 ? user.roles : [];
                    const accessSummary = getUserAccessSummary(user);
                    return (
                      <article key={user.id} className="user-card">
                        <div className="user-card-head">
                          <div className="user-card-identity">
                            <div className="user-card-avatar" aria-hidden="true">
                              {user.avatarUrl ? (
                                <img
                                  src={resolveMediaUrl(user.avatarUrl)}
                                  alt=""
                                />
                              ) : (
                                <span>{getNameInitials(user.fullName)}</span>
                              )}
                            </div>
                            <div>
                              <p className="product-card-meta">
                                {formatPremiumAccessLabel(user)}
                              </p>
                              <h3>{user.fullName || user.id}</h3>
                              <p className="muted-copy">
                                {user.email || "sin email"}
                              </p>
                            </div>
                          </div>
                          <span className="topbar-pill">
                            {user.profileCompleted
                              ? "Perfil listo"
                              : "Pendiente"}
                          </span>
                        </div>

                        <div className="badge-pill-row user-role-row">
                          {effectiveRoles.length > 0 ? (
                            effectiveRoles.map((role) => (
                              <span
                                key={`${user.id}-${role}`}
                                className="badge-pill badge-pill-type"
                              >
                                {userRoleLabels[role as UserAccessPreset]}
                              </span>
                            ))
                          ) : (
                            <span className="badge-pill badge-pill-rarity">
                              {userRoleLabels.client}
                            </span>
                          )}
                        </div>

                        <div className="user-contact">
                          <p>{user.phoneNumber || "sin teléfono"}</p>
                          <span>{formatOptionalDate(user.createdAt)}</span>
                        </div>

                        <div className="user-access">
                          <span>Accesos</span>
                          <p>{accessSummary.join(" · ")}</p>
                        </div>

                        <div className="user-access">
                          <span>Premium</span>
                          <p>
                            {isPremiumActiveUser(user)
                              ? user.premiumRenewsAt
                                ? `Habilitado hasta ${formatDate(user.premiumRenewsAt)}`
                                : "Habilitado sin vencimiento"
                              : "Bloqueado para funciones Premium"}
                          </p>
                        </div>

                        <div className="product-card-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleOpenUserDrawer(user)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => void handleGrantPremium(user)}
                            disabled={grantingPremiumUserId === user.id}
                          >
                            {grantingPremiumUserId === user.id
                              ? "Habilitando..."
                              : "Habilitar Premium 30 días"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>No hay usuarios con esos filtros.</h3>
                  <p>
                    Crea un nuevo usuario o limpia los filtros para ver el
                    listado completo.
                  </p>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => handleOpenUserDrawer()}
                  >
                    Crear usuario
                  </button>
                </div>
              )}
            </section>
          ) : null}

          {activeSection === "community" ? (
            <section className="admin-panel admin-panel-wide">
              <div className="chat-summary">
                <span>Total hilos: {chat?.totalThreads ?? 0}</span>
                <span>Abiertos: {chat?.openThreads ?? 0}</span>
                <span>Mensajes: {chat?.totalMessages ?? 0}</span>
                <span>Mensajes visibles: {communityMessages.length}</span>
                <span>Restricciones: {activeCommunityModerations.length}</span>
              </div>
              <div className="admin-chat-layout">
                <section className="admin-chat-panel">
                  <form
                    className="chat-compose"
                    onSubmit={handleSendCommunityReply}
                  >
                    <textarea
                      className="chat-compose-textarea"
                      value={communityReply}
                      onChange={(event) =>
                        setCommunityReply(event.target.value)
                      }
                      placeholder="Mensaje"
                      rows={4}
                    />
                    <input
                      ref={communityReplyImageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      className="admin-uploader-input"
                      onChange={(event) =>
                        void handleCommunityReplyImageChange(
                          event.target.files?.[0] ?? null,
                        )
                      }
                    />
                    {communityReplyImageName || communityReplyImageUrl ? (
                      <div className="chat-compose-attachment">
                        {communityReplyImageUrl ? (
                          <img
                            src={communityReplyImageUrl}
                            alt="Adjunto del chat"
                          />
                        ) : (
                          <div className="chat-compose-attachment-placeholder">
                            <strong>{communityReplyImageName}</strong>
                            <span>
                              Subiendo imagen: {communityReplyImageProgress}%
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setCommunityReplyImageUrl("");
                            setCommunityReplyImageName("");
                            setCommunityReplyImageProgress(0);
                            setCommunityReplyImageError(null);
                            if (communityReplyImageInputRef.current) {
                              communityReplyImageInputRef.current.value = "";
                            }
                          }}
                        >
                          Quitar
                        </button>
                      </div>
                    ) : null}
                    {communityReplyImageUploading ? (
                      <div
                        className="library-upload-progress form-wide"
                        aria-live="polite"
                      >
                        <div
                          className="library-upload-progress-bar"
                          aria-hidden="true"
                        >
                          <span
                            className="library-upload-progress-fill"
                            style={{ width: `${communityReplyImageProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                    {communityReplyImageError ? (
                      <p className="form-error form-wide">
                        {communityReplyImageError}
                      </p>
                    ) : null}
                    {communityReplyError ? (
                      <p className="form-error form-wide">
                        {communityReplyError}
                      </p>
                    ) : null}
                    <div className="chat-compose-actions">
                      <button
                        type="button"
                        className="secondary-button button-with-icon"
                        onClick={() =>
                          communityReplyImageInputRef.current?.click()
                        }
                        disabled={communityReplyImageUploading}
                      >
                        <span className="button-icon" aria-hidden="true">
                          <ActionIcon name="upload" />
                        </span>
                        Imagen
                      </button>
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={
                          sendingCommunityReply || communityReplyImageUploading
                        }
                      >
                        {sendingCommunityReply ? "Enviando..." : "Publicar"}
                      </button>
                    </div>
                  </form>
                  <div className="chat-message-feed">
                    {communityMessages.length > 0
                      ? communityMessages
                          .slice()
                          .reverse()
                          .map((message) => {
                            const moderation = message.authorUserId
                              ? communityModerationByUserId.get(
                                  message.authorUserId,
                                )
                              : undefined;
                            const canModerateUser =
                              message.authorRole === "member" &&
                              Boolean(message.authorUserId);
                            const moderationBusy =
                              moderatingCommunityUserId ===
                              message.authorUserId;

                            return (
                              <article
                                key={message.id}
                                className={`chat-message-card${message.authorRole === "guide" ? " chat-message-card-guide" : " chat-message-card-member"}`}
                              >
                                <div className="chat-message-head">
                                  <div className="chat-message-author">
                                    <div
                                      className="chat-message-avatar"
                                      aria-hidden="true"
                                    >
                                      {message.authorAvatarUrl ? (
                                        <img
                                          src={resolveMediaUrl(
                                            message.authorAvatarUrl,
                                          )}
                                          alt=""
                                        />
                                      ) : (
                                        <span>
                                          {getNameInitials(message.authorName)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="chat-message-author-meta">
                                      <div className="chat-message-author-line">
                                        <strong>{message.authorName}</strong>
                                        {message.authorBadgeName ? (
                                          <span className="chat-message-badge">
                                            {message.authorBadgeIconUrl ? (
                                              <img
                                                src={resolveMediaUrl(
                                                  message.authorBadgeIconUrl,
                                                )}
                                                alt=""
                                              />
                                            ) : null}
                                            <span>
                                              {message.authorBadgeName}
                                            </span>
                                          </span>
                                        ) : null}
                                      </div>
                                      <span>
                                        {getCommunityRoleLabel(
                                          message.authorRole,
                                        )}
                                        {canModerateUser
                                          ? ` · ${getModerationLabel(moderation)}`
                                          : ""}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="chat-message-tools">
                                    {canModerateUser ? (
                                      <>
                                        <button
                                          type="button"
                                          className="secondary-button chat-message-tool-button"
                                          onClick={() =>
                                            void handleModerateCommunityUser(
                                              message.authorUserId ?? "",
                                              "mute",
                                            )
                                          }
                                          disabled={moderationBusy}
                                        >
                                          {moderationBusy
                                            ? "Procesando..."
                                            : "Silenciar 24h"}
                                        </button>
                                        <button
                                          type="button"
                                          className="danger-button chat-message-tool-button"
                                          onClick={() =>
                                            void handleModerateCommunityUser(
                                              message.authorUserId ?? "",
                                              "ban",
                                            )
                                          }
                                          disabled={moderationBusy}
                                        >
                                          Banear 7d
                                        </button>
                                        {moderation?.isMuted ||
                                        moderation?.isBanned ? (
                                          <button
                                            type="button"
                                            className="secondary-button chat-message-tool-button"
                                            onClick={() =>
                                              void handleModerateCommunityUser(
                                                message.authorUserId ?? "",
                                                "clear",
                                              )
                                            }
                                            disabled={moderationBusy}
                                          >
                                            Limpiar
                                          </button>
                                        ) : null}
                                      </>
                                    ) : null}
                                    {message.imageUrl ? (
                                      <button
                                        type="button"
                                        className="secondary-button chat-message-tool-button"
                                        onClick={() =>
                                          void handleModerateCommunityMessage(
                                            message.id,
                                            "delete-image",
                                          )
                                        }
                                        disabled={
                                          moderatingCommunityMessageId ===
                                          message.id
                                        }
                                      >
                                        {moderatingCommunityMessageId ===
                                        message.id
                                          ? "Procesando..."
                                          : "Quitar imagen"}
                                      </button>
                                    ) : null}
                                    <button
                                      type="button"
                                      className="danger-button chat-message-tool-button"
                                      onClick={() =>
                                        void handleModerateCommunityMessage(
                                          message.id,
                                          "delete-message",
                                        )
                                      }
                                      disabled={
                                        moderatingCommunityMessageId ===
                                        message.id
                                      }
                                    >
                                      {moderatingCommunityMessageId ===
                                      message.id
                                        ? "Procesando..."
                                        : "Eliminar"}
                                    </button>
                                  </div>
                                </div>
                                {message.imageUrl ? (
                                  <a
                                    href={resolveMediaUrl(message.imageUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="chat-message-image-link"
                                  >
                                    <img
                                      src={resolveMediaUrl(message.imageUrl)}
                                      alt={
                                        message.body || "Adjunto del mensaje"
                                      }
                                    />
                                  </a>
                                ) : null}
                                {message.body ? <p>{message.body}</p> : null}
                                <small>{formatDate(message.createdAt)}</small>
                              </article>
                            );
                          })
                      : null}
                  </div>
                </section>
                <section className="admin-chat-panel">
                  <div className="panel-head chat-side-head">
                    <div>
                      <p className="eyebrow">Moderación</p>
                      <h3>Usuarios restringidos</h3>
                    </div>
                  </div>
                  <div className="chat-thread-list moderation-list">
                    {activeCommunityModerations.length > 0 ? (
                      activeCommunityModerations.map((moderation) => (
                        <article
                          key={moderation.userId}
                          className="chat-thread-card moderation-card"
                        >
                          <div>
                            <strong>{moderation.userName}</strong>
                            <p>{getModerationLabel(moderation)}</p>
                          </div>
                          <div className="align-right">
                            <p>{moderation.reason || "Sin motivo"}</p>
                            <button
                              type="button"
                              className="secondary-button chat-message-tool-button"
                              onClick={() =>
                                void handleModerateCommunityUser(
                                  moderation.userId,
                                  "clear",
                                )
                              }
                              disabled={
                                moderatingCommunityUserId === moderation.userId
                              }
                            >
                              Quitar
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="order-chat-empty">
                        No hay usuarios silenciados ni baneados.
                      </div>
                    )}
                  </div>
                  <div className="panel-head chat-side-head">
                    <div>
                      <p className="eyebrow">Privados</p>
                      <h3>Hilos recientes</h3>
                    </div>
                  </div>
                  <div className="chat-thread-list">
                    {chat?.recentThreads.slice(0, 5).map((thread) => (
                      <article key={thread.id} className="chat-thread-card">
                        <div>
                          <strong>{thread.userName}</strong>
                          <p>{thread.specialistName}</p>
                        </div>
                        <div>
                          <strong>{thread.status}</strong>
                          <p>
                            {thread.lastMessageAt
                              ? formatDate(thread.lastMessageAt)
                              : "sin mensajes"}
                          </p>
                        </div>
                        <div className="align-right">
                          <p>{thread.lastMessagePreview || "sin contenido"}</p>
                        </div>
                      </article>
                    )) ?? null}
                  </div>
                </section>
              </div>
            </section>
          ) : null}

          {activeSection === "support" ? (
            <section className="admin-panel admin-panel-wide support-panel">
              <div className="panel-head badge-panel-head">
                <div>
                  <p className="eyebrow">Soporte</p>
                  <h2>Tickets y chat con administración</h2>
                  <p className="hero-copy">
                    Responde solicitudes, cambia estados y mantén el conteo de
                    tickets abierto al día.
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void refreshSupportOverview()}
                >
                  Actualizar
                </button>
              </div>

              <div className="hero-status support-stats-grid">
                <div className="status-card">
                  <span>Total</span>
                  <strong>{supportOverview?.summary.total ?? 0}</strong>
                </div>
                <div className="status-card">
                  <span>Abiertos</span>
                  <strong>{supportOverview?.summary.open ?? 0}</strong>
                </div>
                <div className="status-card">
                  <span>En revisión</span>
                  <strong>{supportOverview?.summary.inReview ?? 0}</strong>
                </div>
                <div className="status-card">
                  <span>Respondidos</span>
                  <strong>{supportOverview?.summary.responded ?? 0}</strong>
                </div>
                <div className="status-card">
                  <span>Cerrados</span>
                  <strong>{supportOverview?.summary.closed ?? 0}</strong>
                </div>
              </div>

              {supportError ? (
                <p className="form-error form-wide">{supportError}</p>
              ) : null}

              <div className="support-layout">
                <section className="support-ticket-list">
                  {(supportOverview?.items ?? []).length > 0 ? (
                    supportOverview?.items.map((ticket) => (
                      <button
                        key={ticket.id}
                        type="button"
                        className={
                          selectedSupportTicketId === ticket.id
                            ? "support-ticket-card support-ticket-card-active"
                            : "support-ticket-card"
                        }
                        onClick={() => void handleOpenSupportTicket(ticket.id)}
                      >
                        <span className="support-ticket-avatar">
                          {ticket.userAvatarUrl ? (
                            <img
                              src={resolveMediaUrl(ticket.userAvatarUrl)}
                              alt=""
                            />
                          ) : (
                            <span>{getNameInitials(ticket.userName)}</span>
                          )}
                        </span>
                        <span className="support-ticket-copy">
                          <strong>{ticket.subject}</strong>
                          <span>{ticket.userName}</span>
                          <small>
                            {ticket.ticketNumber} ·{" "}
                            {getSupportStatusLabel(ticket.status)} ·{" "}
                            {ticket.messageCount} mensajes
                          </small>
                          <span className="support-ticket-preview">
                            {ticket.lastMessagePreview || "Sin mensajes"}
                          </span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="empty-state">
                      <h3>No hay tickets todavía.</h3>
                      <p>Cuando un usuario abra soporte aparecerá aquí.</p>
                    </div>
                  )}
                </section>

                <section className="support-detail">
                  {supportLoadingTicketId ? (
                    <div className="order-chat-empty">Cargando ticket...</div>
                  ) : selectedSupportTicket ? (
                    <>
                      <div className="support-detail-head">
                        <div>
                          <p className="eyebrow">
                            {selectedSupportTicket.ticketNumber}
                          </p>
                          <h3>{selectedSupportTicket.subject}</h3>
                          <p>
                            {selectedSupportTicket.userName} ·{" "}
                            {selectedSupportTicket.category}
                          </p>
                        </div>
                        <div className="support-detail-controls">
                          <label>
                            <span>Estado</span>
                            <select
                              value={selectedSupportTicket.status}
                              onChange={(event) =>
                                void handleUpdateSupportTicket(
                                  selectedSupportTicket.id,
                                  {
                                    status: event.target
                                      .value as AdminSupportTicketStatus,
                                  },
                                )
                              }
                              disabled={updatingSupportTicket}
                            >
                              <option value="open">Abierto</option>
                              <option value="in_review">En revisión</option>
                              <option value="responded">Respondido</option>
                              <option value="closed">Cerrado</option>
                            </select>
                          </label>
                          <label>
                            <span>Prioridad</span>
                            <select
                              value={selectedSupportTicket.priority}
                              onChange={(event) =>
                                void handleUpdateSupportTicket(
                                  selectedSupportTicket.id,
                                  {
                                    priority: event.target
                                      .value as AdminSupportTicketPriority,
                                  },
                                )
                              }
                              disabled={updatingSupportTicket}
                            >
                              <option value="low">Baja</option>
                              <option value="normal">Normal</option>
                              <option value="high">Alta</option>
                            </select>
                          </label>
                        </div>
                      </div>

                      <div className="support-message-feed">
                        {(supportDetail?.messages ?? []).map((message) => (
                          <article
                            key={message.id}
                            className={`support-message support-message-${message.authorType}`}
                          >
                            <div>
                              <strong>{message.authorName}</strong>
                              <span>{formatDate(message.createdAt)}</span>
                            </div>
                            <p>{message.body}</p>
                          </article>
                        ))}
                      </div>

                      <form
                        className="chat-compose support-compose"
                        onSubmit={handleSendSupportReply}
                      >
                        <textarea
                          className="chat-compose-textarea"
                          value={supportReply}
                          onChange={(event) =>
                            setSupportReply(event.target.value)
                          }
                          rows={4}
                          placeholder="Responder al usuario"
                        />
                        <div className="chat-compose-actions">
                          <span className="muted-copy">
                            Prioridad{" "}
                            {getSupportPriorityLabel(
                              selectedSupportTicket.priority,
                            )}
                          </span>
                          <button
                            type="submit"
                            className="primary-button"
                            disabled={sendingSupportReply}
                          >
                            {sendingSupportReply
                              ? "Enviando..."
                              : "Enviar respuesta"}
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="empty-state">
                      <h3>Selecciona un ticket.</h3>
                      <p>
                        El chat directo con el usuario aparecerá en este panel.
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </section>
          ) : null}

          {activeSection === "developer" ? (
            <section className="admin-panel admin-panel-wide developer-panel">
              <div className="panel-head badge-panel-head">
                <div>
                  <p className="eyebrow">Admin desarrollador</p>
                  <h2>Herramientas técnicas</h2>
                  <p className="hero-copy">
                    Agrupa incidencias, insignias, auditoría, diagnóstico y
                    configuración.
                  </p>
                </div>
              </div>
              <div className="developer-tabs">
                {(
                  Object.entries(developerSectionLabels) as Array<
                    [DeveloperSection, string]
                  >
                ).map(([section, label]) => (
                  <button
                    key={section}
                    type="button"
                    className={
                      developerSection === section
                        ? "developer-tab-card developer-tab-card-active"
                        : "developer-tab-card"
                    }
                    onClick={() => setDeveloperSection(section)}
                  >
                    <span className="developer-tab-icon" aria-hidden="true">
                      <SidebarIcon name={section} />
                    </span>
                    <span className="developer-tab-copy">
                      <strong>{label}</strong>
                      <span>{developerSectionMeta[section].description}</span>
                    </span>
                    <span className="developer-tab-chevron" aria-hidden="true">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === "developer" && developerSection === "incidents" ? (
            <section className="admin-panel admin-panel-wide">
              <div className="panel-head badge-panel-head">
                <div>
                  <p className="eyebrow">Incidencias</p>
                  <h2>Estado básico</h2>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setDeveloperSection("badges")}
                >
                  Insignias
                </button>
              </div>
              <div className="hero-status">
                <div className="status-card">
                  <span>Abiertas</span>
                  <strong>
                    {
                      incidents.filter(
                        (incident) => incident.status !== "closed",
                      ).length
                    }
                  </strong>
                </div>
                <div className="status-card">
                  <span>Registradas</span>
                  <strong>{incidents.length}</strong>
                </div>
              </div>
              <div className="table-list">
                {incidents.length > 0 ? (
                  incidents.map((incident) => (
                    <article key={incident.id} className="table-row">
                      <div>
                        <strong>{incident.title}</strong>
                        <p>{incident.relatedType ?? "Sin relación"}</p>
                      </div>
                      <div className="align-right">
                        <span className="topbar-pill">{incident.status}</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="diagnostic-empty">
                    Sin incidencias cargadas todavía.
                  </p>
                )}
              </div>
            </section>
          ) : null}

          {activeSection === "developer" && developerSection === "badges" ? (
            <section className="admin-panel admin-panel-wide badge-atlas-panel">
              <div className="panel-head badge-panel-head">
                <div>
                  <p className="eyebrow">Insignias</p>
                  <h2>Trabaja una ruta a la vez</h2>
                  <p className="hero-copy">
                    Elige una ruta, revisa sus 5 escalones y abre el editor solo
                    cuando haga falta.
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleCreateBadge(selectedRoute.pathId)}
                >
                  Crear insignia
                </button>
              </div>

              {badgeError ? (
                <p className="badge-feedback badge-feedback-error">
                  {badgeError}
                </p>
              ) : null}
              {badgeMessage ? (
                <p className="badge-feedback badge-feedback-success">
                  {badgeMessage}
                </p>
              ) : null}

              <div className="route-selector">
                {groupedBadges.map((route) => {
                  const activeCount = route.items.filter(
                    (badge) => badge.isActive,
                  ).length;
                  return (
                    <button
                      key={route.pathId}
                      type="button"
                      className={
                        selectedRouteId === route.pathId
                          ? "route-chip route-chip-active"
                          : "route-chip"
                      }
                      onClick={() => handleSelectRoute(route.pathId)}
                    >
                      <strong>{route.title}</strong>
                      <span>{activeCount}/5</span>
                    </button>
                  );
                })}
              </div>

              {selectedRoute ? (
                <article
                  className={`badge-route-card ${selectedRoute.accentClass} ${
                    selectedRoute.category === "SECRET"
                      ? "badge-route-secret"
                      : ""
                  }`}
                >
                  <div className="badge-route-head">
                    <div>
                      <p className="badge-route-title">
                        {selectedRoute.category}
                      </p>
                      <h3>{selectedRoute.title}</h3>
                      <p className="badge-route-copy">
                        {selectedRoute.description}
                      </p>
                    </div>
                    <div className="badge-route-meta">
                      <span>
                        {
                          selectedRoute.items.filter((badge) => badge.isActive)
                            .length
                        }{" "}
                        activos
                      </span>
                      <span>{selectedRoute.items.length} badges</span>
                    </div>
                  </div>

                  <div
                    className="badge-route-progress"
                    aria-label={`Progreso ${selectedRoute.title}`}
                  >
                    <span
                      style={{
                        width: `${getRouteProgressPercent(selectedRoute.items)}%`,
                      }}
                    />
                  </div>

                  <div className="badge-track">
                    {selectedRoute.steps.map((badge, index) => {
                      const stepIndex = index + 1;
                      const isSelected = badge?.id === selectedBadgeId;
                      return (
                        <div
                          key={`${selectedRoute.pathId}-${stepIndex}`}
                          className={`badge-step ${badge ? "badge-step-filled" : "badge-step-empty"} ${
                            isSelected ? "badge-step-selected" : ""
                          }`}
                          onClick={() => {
                            if (badge) {
                              handleSelectBadge(badge);
                            } else {
                              handleCreateBadge(
                                selectedRoute.pathId,
                                stepIndex,
                              );
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <span className="badge-step-index">{stepIndex}</span>
                          <strong>{badge?.name ?? "Vacío"}</strong>
                          <p>
                            {badge
                              ? `${badge.rarity} · ${badge.type}`
                              : "Crea un nuevo escalón."}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="badge-route-list">
                    {selectedRoute.steps.map((badge, index) =>
                      badge ? (
                        <article
                          key={badge.id}
                          className={`badge-card ${badge.isActive ? "badge-card-active" : "badge-card-disabled"} ${
                            selectedBadgeId === badge.id
                              ? "badge-card-selected"
                              : ""
                          }`}
                        >
                          <div className="badge-card-top">
                            <div>
                              <p className="badge-card-path">
                                Ruta {selectedRoute.pathOrder} · Escalón{" "}
                                {badge.stepIndex} ·{" "}
                                {badgeCategoryLabels[badge.category]}
                              </p>
                              <h4>{badge.name}</h4>
                            </div>
                            <div className="badge-pill-row">
                              <span
                                className={`badge-pill badge-pill-rarity badge-pill-${badge.rarity.toLowerCase()}`}
                              >
                                {badge.rarity}
                              </span>
                              <span className="badge-pill badge-pill-type">
                                {badge.type}
                              </span>
                              {badge.category === "SECRET" ? (
                                <span className="badge-pill badge-pill-secret">
                                  SECRET
                                </span>
                              ) : null}
                              {badge.type === "MANUAL" ? (
                                <span className="badge-pill badge-pill-manual">
                                  MANUAL
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <p className="badge-card-description">
                            {badge.description}
                          </p>

                          <div className="badge-card-actions">
                            <button
                              type="button"
                              onClick={() => handleSelectBadge(badge)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleViewBadgeHistory(badge)}
                            >
                              Historial
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleBadgeActive(badge)}
                              disabled={savingBadgeId === badge.id}
                            >
                              {badge.isActive ? "Desactivar" : "Activar"}
                            </button>
                          </div>
                        </article>
                      ) : (
                        <article
                          key={`${selectedRoute.pathId}-empty-${index + 1}`}
                          className="badge-card badge-card-empty"
                        >
                          <p>Escalón {index + 1}</p>
                          <strong>Sin badge</strong>
                          <button
                            type="button"
                            onClick={() =>
                              handleCreateBadge(selectedRoute.pathId, index + 1)
                            }
                          >
                            Crear aquí
                          </button>
                        </article>
                      ),
                    )}
                  </div>
                </article>
              ) : null}
            </section>
          ) : null}

          {activeSection === "developer" &&
          developerSection === "diagnostics" ? (
            <section className="admin-panel admin-panel-wide badge-diagnostics-panel">
              <div className="panel-head badge-panel-head">
                <div>
                  <p className="eyebrow">Diagnóstico</p>
                  <h2>Estado general y problemas detectados</h2>
                </div>
                <div className="diagnostics-summary">
                  <span className="diagnostic-pill diagnostic-pill-error">
                    Errores {diagnosticsSummary.error}
                  </span>
                  <span className="diagnostic-pill diagnostic-pill-warning">
                    Alertas {diagnosticsSummary.warning}
                  </span>
                  <span className="diagnostic-pill diagnostic-pill-info">
                    Info {diagnosticsSummary.info}
                  </span>
                </div>
              </div>

              <div className="badge-route-health">
                {groupedBadges.map((route) => {
                  const activeCount = route.items.filter(
                    (badge) => badge.isActive,
                  ).length;
                  return (
                    <article key={route.pathId} className="badge-health-card">
                      <h3>{route.category}</h3>
                      <p>{route.pathId}</p>
                      <strong>{activeCount}/5 activos</strong>
                      <span>
                        {activeCount === 5
                          ? "Ruta completa"
                          : "Ruta incompleta"}
                      </span>
                    </article>
                  );
                })}
              </div>

              <div className="diagnostic-issues">
                {diagnosticsIssues.length > 0 ? (
                  diagnosticsIssues.map((issue, index) => (
                    <article
                      key={`${issue.pathId ?? issue.badgeId ?? "system"}-${index}`}
                      className={`diagnostic-issue diagnostic-issue-${issue.severity}`}
                    >
                      <span>{issue.severity.toUpperCase()}</span>
                      <p>{issue.message}</p>
                      <small>
                        {issue.pathId ?? "sin path"}{" "}
                        {issue.badgeId ? `· ${issue.badgeId}` : ""}
                      </small>
                    </article>
                  ))
                ) : (
                  <p className="diagnostic-empty">
                    Sin inconsistencias detectadas.
                  </p>
                )}
              </div>
            </section>
          ) : null}

          {activeSection === "developer" && developerSection === "audit" ? (
            <section className="admin-panel admin-panel-wide badge-audit-panel">
              <div className="panel-head badge-panel-head">
                <div>
                  <p className="eyebrow">Auditoría</p>
                  <h2>Historial compacto de cambios</h2>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setAuditFilters({
                      badgeId: "",
                      pathId: "",
                      action: "",
                      fieldChanged: "",
                      date: "",
                    })
                  }
                >
                  Limpiar filtros
                </button>
              </div>

              {auditError ? (
                <p className="badge-feedback badge-feedback-error">
                  {auditError}
                </p>
              ) : null}

              <div className="audit-filters">
                <label>
                  <span>Insignia</span>
                  <select
                    value={auditFilters.badgeId}
                    onChange={(event) =>
                      setAuditFilters((current) => ({
                        ...current,
                        badgeId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todos</option>
                    {auditBadgeOptions.map((badge) => (
                      <option key={badge.id} value={badge.id}>
                        {badge.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Ruta</span>
                  <select
                    value={auditFilters.pathId}
                    onChange={(event) =>
                      setAuditFilters((current) => ({
                        ...current,
                        pathId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todas</option>
                    {badgePathMeta.map((path) => (
                      <option key={path.pathId} value={path.pathId}>
                        {path.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Acción</span>
                  <select
                    value={auditFilters.action}
                    onChange={(event) =>
                      setAuditFilters((current) => ({
                        ...current,
                        action: event.target.value,
                      }))
                    }
                  >
                    <option value="">Todas</option>
                    {[
                      ["CREATED", "Creada"],
                      ["UPDATED", "Actualizada"],
                      ["ACTIVATED", "Activada"],
                      ["DEACTIVATED", "Desactivada"],
                      ["REORDERED", "Reordenada"],
                    ].map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Campo</span>
                  <input
                    value={auditFilters.fieldChanged}
                    onChange={(event) =>
                      setAuditFilters((current) => ({
                        ...current,
                        fieldChanged: event.target.value,
                      }))
                    }
                    placeholder="name, stepIndex, rules"
                  />
                </label>
                <label>
                  <span>Fecha</span>
                  <input
                    type="date"
                    value={auditFilters.date}
                    onChange={(event) =>
                      setAuditFilters((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="audit-table">
                <div className="audit-table-head">
                  <span>Fecha</span>
                  <span>Insignia</span>
                  <span>Acción</span>
                  <span>Campo</span>
                  <span>Antes</span>
                  <span>Después</span>
                  <span>Usuario/admin</span>
                </div>
                <div className="audit-table-body">
                  {auditEntries.length > 0 ? (
                    auditEntries.map((entry) => (
                      <article
                        key={entry.id}
                        className="audit-row"
                        onClick={() => handleOpenAuditEntry(entry)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleOpenAuditEntry(entry);
                          }
                        }}
                      >
                        <strong>{formatDate(entry.changedAt)}</strong>
                        <p>
                          {entry.badgeName ?? entry.badgeId}
                          <span>
                            {badgePathMeta.find(
                              (path) => path.pathId === entry.pathId,
                            )?.title ?? "sin ruta"}
                          </span>
                        </p>
                        <span>{entry.action}</span>
                        <span>{formatAuditFieldLabel(entry.fieldChanged)}</span>
                        <code>{formatAuditValue(entry.previousValue)}</code>
                        <code>{formatAuditValue(entry.newValue)}</code>
                        <div className="audit-row-footer">
                          <p>
                            {entry.changedBy}
                            <span>{entry.source}</span>
                          </p>
                          <button
                            type="button"
                            className="secondary-button audit-detail-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenAuditEntry(entry);
                            }}
                          >
                            Ver detalle
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="diagnostic-empty">
                      Sin cambios para estos filtros.
                    </p>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === "developer" && developerSection === "settings" ? (
            <section className="admin-grid">
              <article className="admin-panel">
                <div className="panel-head">
                  <p className="eyebrow">Sesión</p>
                  <h2>Estado actual</h2>
                </div>
                <div className="admin-session-card">
                  <span>Usuario</span>
                  <strong>Cuenta activa</strong>
                  <p>{adminUser?.email ?? "Sin email"}</p>
                  <button
                    type="button"
                    className="secondary-button button-with-icon"
                    onClick={() => void handleLogout()}
                  >
                    <span className="button-icon" aria-hidden="true">
                      <ActionIcon name="logout" />
                    </span>
                    Cerrar sesión
                  </button>
                </div>
              </article>

              <article className="admin-panel">
                <div className="panel-head">
                  <p className="eyebrow">Salud</p>
                  <h2>Conexiones</h2>
                </div>
                <div className="hero-status">
                  <div className="status-card">
                    <span>API</span>
                    <strong>{health?.status ?? "cargando"}</strong>
                  </div>
                  <div className="status-card">
                    <span>Base de datos</span>
                    <strong>
                      {health?.dependencies.database.status ?? "..."}
                    </strong>
                  </div>
                  <div className="status-card">
                    <span>Redis</span>
                    <strong>
                      {health?.dependencies.redis.status ?? "..."}
                    </strong>
                  </div>
                  <div className="status-card">
                    <span>Almacenamiento</span>
                    <strong>
                      {health?.dependencies.storage.status ?? "..."}
                    </strong>
                  </div>
                </div>
              </article>
            </section>
          ) : null}
        </div>
      </div>

      {isSpecialistDrawerOpen ? (
        <div
          className="badge-editor-backdrop"
          onClick={handleCloseSpecialistDrawer}
          role="presentation"
        >
          <aside
            className="badge-editor-drawer admin-drawer-wide"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="specialist-drawer-title"
          >
            <div className="audit-detail-head">
              <div>
                <p className="eyebrow">Especialista</p>
                <h2 id="specialist-drawer-title">
                  {selectedSpecialistDetail?.name ?? "Detalle operativo"}
                </h2>
                <p className="badge-editor-copy">
                  Perfil, servicios, disponibilidad, reservas, métricas e
                  historial.
                </p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCloseSpecialistDrawer}
              >
                Cerrar
              </button>
            </div>

            <div className="developer-tabs specialist-tabs">
              {[
                ["profile", "Perfil"],
                ["services", "Servicios"],
                ["availability", "Disponibilidad"],
                ["bookings", "Reservas"],
                ["metrics", "Métricas"],
                ["history", "Historial"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    specialistDetailTab === value
                      ? "route-chip route-chip-active"
                      : "route-chip"
                  }
                  onClick={() =>
                    setSpecialistDetailTab(value as SpecialistDetailTab)
                  }
                >
                  <strong>{label}</strong>
                </button>
              ))}
            </div>

            {specialistDrawerError ? (
              <p className="badge-feedback badge-feedback-error">
                {specialistDrawerError}
              </p>
            ) : null}

            {specialistDrawerLoading ? (
              <div className="empty-state">
                <h3>Cargando detalle</h3>
              </div>
            ) : null}

            {!specialistDrawerLoading && specialistDetailTab === "profile" ? (
              <section className="table-list">
                <article className="service-editor-card specialist-profile-card">
                  <label>
                    <span>Nombre público</span>
                    <input
                      value={specialistProfileDraft.publicName}
                      onChange={(event) =>
                        setSpecialistProfileDraft((current) => ({
                          ...current,
                          publicName: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Titular</span>
                    <input
                      value={specialistProfileDraft.headline}
                      onChange={(event) =>
                        setSpecialistProfileDraft((current) => ({
                          ...current,
                          headline: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Especialidades</span>
                    <input
                      value={specialistProfileDraft.specialty}
                      onChange={(event) =>
                        setSpecialistProfileDraft((current) => ({
                          ...current,
                          specialty: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-wide">
                    <span>Bio</span>
                    <textarea
                      rows={3}
                      value={specialistProfileDraft.bio}
                      onChange={(event) =>
                        setSpecialistProfileDraft((current) => ({
                          ...current,
                          bio: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="form-wide">
                    <span>Avatar</span>
                    <input
                      value={specialistProfileDraft.avatarUrl}
                      onChange={(event) =>
                        setSpecialistProfileDraft((current) => ({
                          ...current,
                          avatarUrl: event.target.value,
                        }))
                      }
                      placeholder="https://..."
                    />
                  </label>
                  <label className="switch-row">
                    <input
                      type="checkbox"
                      checked={specialistProfileDraft.isActive}
                      onChange={(event) =>
                        setSpecialistProfileDraft((current) => ({
                          ...current,
                          isActive: event.target.checked,
                        }))
                      }
                    />
                    <span>
                      {specialistProfileDraft.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </label>
                  <label className="switch-row">
                    <input
                      type="checkbox"
                      checked={specialistProfileDraft.isVisible}
                      onChange={(event) =>
                        setSpecialistProfileDraft((current) => ({
                          ...current,
                          isVisible: event.target.checked,
                        }))
                      }
                    />
                    <span>
                      {specialistProfileDraft.isVisible ? "Visible" : "Oculto"}
                    </span>
                  </label>
                  <div className="align-right">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleSaveSpecialistProfile()}
                    >
                      Guardar cambios
                    </button>
                  </div>
                </article>
              </section>
            ) : null}

            {!specialistDrawerLoading && specialistDetailTab === "services" ? (
              <div className="table-list">
                <article className="service-editor-card">
                  <div>
                    <strong>Crear servicio</strong>
                    <p>Nuevo servicio del especialista</p>
                  </div>
                  <label>
                    <span>Nombre</span>
                    <input
                      value={newServiceDraft.name}
                      onChange={(event) =>
                        setNewServiceDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Categoría</span>
                    <input
                      value={newServiceDraft.category}
                      onChange={(event) =>
                        setNewServiceDraft((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Descripción</span>
                    <input
                      value={newServiceDraft.description}
                      onChange={(event) =>
                        setNewServiceDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Precio</span>
                    <input
                      type="number"
                      step="0.01"
                      value={newServiceDraft.priceAmount}
                      onChange={(event) =>
                        setNewServiceDraft((current) => ({
                          ...current,
                          priceAmount: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Moneda</span>
                    <input
                      value={newServiceDraft.priceCurrency}
                      onChange={(event) =>
                        setNewServiceDraft((current) => ({
                          ...current,
                          priceCurrency: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Duración</span>
                    <input
                      type="number"
                      value={newServiceDraft.durationMinutes}
                      onChange={(event) =>
                        setNewServiceDraft((current) => ({
                          ...current,
                          durationMinutes: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="switch-row">
                    <input
                      type="checkbox"
                      checked={newServiceDraft.isActive}
                      onChange={(event) =>
                        setNewServiceDraft((current) => ({
                          ...current,
                          isActive: event.target.checked,
                        }))
                      }
                    />
                    <span>
                      {newServiceDraft.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </label>
                  <label className="switch-row">
                    <input
                      type="checkbox"
                      checked={newServiceDraft.isVisible}
                      onChange={(event) =>
                        setNewServiceDraft((current) => ({
                          ...current,
                          isVisible: event.target.checked,
                        }))
                      }
                    />
                    <span>
                      {newServiceDraft.isVisible ? "Visible" : "Oculto"}
                    </span>
                  </label>
                  <div className="align-right">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleCreateSpecialistService()}
                    >
                      Crear servicio
                    </button>
                  </div>
                </article>

                {selectedSpecialistServices.map((service) => {
                  const draft = specialistServiceDrafts[service.id];
                  return (
                    <article key={service.id} className="service-editor-card">
                      <div>
                        <strong>{service.name}</strong>
                        <p>{service.category}</p>
                      </div>
                      <label>
                        <span>Nombre</span>
                        <input
                          value={draft?.name ?? service.name}
                          onChange={(event) =>
                            updateSpecialistServiceDraft(
                              service.id,
                              "name",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      <label>
                        <span>Categoría</span>
                        <input
                          value={draft?.category ?? service.category}
                          onChange={(event) =>
                            updateSpecialistServiceDraft(
                              service.id,
                              "category",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="form-wide">
                        <span>Descripción</span>
                        <input
                          value={draft?.description ?? service.description}
                          onChange={(event) =>
                            updateSpecialistServiceDraft(
                              service.id,
                              "description",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      <label>
                        <span>Precio</span>
                        <input
                          type="number"
                          step="0.01"
                          value={
                            draft?.priceAmount ?? String(service.price.amount)
                          }
                          onChange={(event) =>
                            updateSpecialistServiceDraft(
                              service.id,
                              "priceAmount",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      <label>
                        <span>Moneda</span>
                        <input
                          value={draft?.priceCurrency ?? service.price.currency}
                          onChange={(event) =>
                            updateSpecialistServiceDraft(
                              service.id,
                              "priceCurrency",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      <label>
                        <span>Duración</span>
                        <input
                          type="number"
                          value={
                            draft?.durationMinutes ??
                            String(service.durationMinutes)
                          }
                          onChange={(event) =>
                            updateSpecialistServiceDraft(
                              service.id,
                              "durationMinutes",
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="switch-row">
                        <input
                          type="checkbox"
                          checked={draft?.isActive ?? service.isActive ?? true}
                          onChange={(event) =>
                            updateSpecialistServiceDraft(
                              service.id,
                              "isActive",
                              event.target.checked,
                            )
                          }
                        />
                        <span>
                          {(draft?.isActive ?? service.isActive ?? true)
                            ? "Activo"
                            : "Inactivo"}
                        </span>
                      </label>
                      <label className="switch-row">
                        <input
                          type="checkbox"
                          checked={
                            draft?.isVisible ?? service.isVisible ?? true
                          }
                          onChange={(event) =>
                            updateSpecialistServiceDraft(
                              service.id,
                              "isVisible",
                              event.target.checked,
                            )
                          }
                        />
                        <span>
                          {(draft?.isVisible ?? service.isVisible ?? true)
                            ? "Visible"
                            : "Oculto"}
                        </span>
                      </label>
                      <div className="align-right">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            void handleSaveSpecialistService(service)
                          }
                        >
                          Guardar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {!specialistDrawerLoading &&
            specialistDetailTab === "availability" ? (
              <div className="table-list">
                <article className="service-editor-card availability-weekly-card">
                  <div className="availability-card-head form-wide">
                    <div>
                      <span>Horario semanal</span>
                      <strong>Configura días y rangos de atención</strong>
                    </div>
                    <p>
                      La app móvil mostrará horarios disponibles según estos
                      rangos y la duración del servicio.
                    </p>
                  </div>
                  <label>
                    <span>Desde</span>
                    <input
                      type="date"
                      value={availabilityDraft.weeklyStartDate}
                      onChange={(event) =>
                        setAvailabilityDraft((current) => ({
                          ...current,
                          weeklyStartDate: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Hasta</span>
                    <input
                      type="date"
                      value={availabilityDraft.weeklyEndDate}
                      onChange={(event) =>
                        setAvailabilityDraft((current) => ({
                          ...current,
                          weeklyEndDate: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Hora inicio</span>
                    <input
                      type="time"
                      value={availabilityDraft.weeklyStartTime}
                      onChange={(event) =>
                        setAvailabilityDraft((current) => ({
                          ...current,
                          weeklyStartTime: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Hora fin</span>
                    <input
                      type="time"
                      value={availabilityDraft.weeklyEndTime}
                      onChange={(event) =>
                        setAvailabilityDraft((current) => ({
                          ...current,
                          weeklyEndTime: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Modo</span>
                    <select
                      value={availabilityDraft.mode}
                      onChange={(event) =>
                        setAvailabilityDraft((current) => ({
                          ...current,
                          mode: event.target.value,
                        }))
                      }
                    >
                      {["chat", "video", "audio"].map((mode) => (
                        <option key={mode} value={mode}>
                          {formatModeLabel(mode)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="switch-row">
                    <input
                      type="checkbox"
                      checked={availabilityDraft.isAvailable}
                      onChange={(event) =>
                        setAvailabilityDraft((current) => ({
                          ...current,
                          isAvailable: event.target.checked,
                        }))
                      }
                    />
                    <span>Disponible</span>
                  </label>
                  <div className="availability-weekdays form-wide">
                    {availabilityWeekdayOptions.map((day) => {
                      const selected =
                        availabilityDraft.weeklyWeekdays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          className={`weekday-toggle ${selected ? "is-selected" : ""}`}
                          onClick={() =>
                            setAvailabilityDraft((current) => {
                              const nextWeekdays =
                                current.weeklyWeekdays.includes(day.value)
                                  ? current.weeklyWeekdays.filter(
                                      (value) => value !== day.value,
                                    )
                                  : [...current.weeklyWeekdays, day.value];
                              return {
                                ...current,
                                weeklyWeekdays: nextWeekdays.sort(
                                  (left, right) => Number(left) - Number(right),
                                ),
                              };
                            })
                          }
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="align-right form-wide">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void handleCreateWeeklyAvailability()}
                    >
                      Generar horarios
                    </button>
                  </div>
                </article>

                <article className="service-editor-card availability-create-card">
                  <div className="availability-card-head form-wide">
                    <div>
                      <span>Bloque puntual</span>
                      <strong>Crear una disponibilidad específica</strong>
                    </div>
                  </div>
                  <label>
                    <span>Inicio</span>
                    <input
                      type="datetime-local"
                      value={availabilityDraft.startsAt}
                      onChange={(event) =>
                        setAvailabilityDraft((current) => ({
                          ...current,
                          startsAt: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Fin</span>
                    <input
                      type="datetime-local"
                      value={availabilityDraft.endsAt}
                      onChange={(event) =>
                        setAvailabilityDraft((current) => ({
                          ...current,
                          endsAt: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Modo</span>
                    <select
                      value={availabilityDraft.mode}
                      onChange={(event) =>
                        setAvailabilityDraft((current) => ({
                          ...current,
                          mode: event.target.value,
                        }))
                      }
                    >
                      {["chat", "video", "audio"].map((mode) => (
                        <option key={mode} value={mode}>
                          {formatModeLabel(mode)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="switch-row">
                    <input
                      type="checkbox"
                      checked={availabilityDraft.isAvailable}
                      onChange={(event) =>
                        setAvailabilityDraft((current) => ({
                          ...current,
                          isAvailable: event.target.checked,
                        }))
                      }
                    />
                    <span>Disponible</span>
                  </label>
                  <div className="align-right">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleCreateAvailability()}
                    >
                      Guardar bloque
                    </button>
                  </div>
                </article>

                {selectedSpecialistAvailability.map((slot) => (
                  <article key={slot.id} className="table-row service-row">
                    <div>
                      <label>
                        <span>Inicio</span>
                        <input
                          type="datetime-local"
                          value={toDateTimeLocalValue(slot.startsAt)}
                          onChange={(event) =>
                            setSelectedSpecialistAvailability((current) =>
                              current.map((item) =>
                                item.id === slot.id
                                  ? {
                                      ...item,
                                      startsAt: fromDateTimeLocalValue(
                                        event.target.value,
                                      ),
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                    </div>
                    <div>
                      <label>
                        <span>Fin</span>
                        <input
                          type="datetime-local"
                          value={toDateTimeLocalValue(slot.endsAt)}
                          onChange={(event) =>
                            setSelectedSpecialistAvailability((current) =>
                              current.map((item) =>
                                item.id === slot.id
                                  ? {
                                      ...item,
                                      endsAt: fromDateTimeLocalValue(
                                        event.target.value,
                                      ),
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                    </div>
                    <div className="align-right">
                      <label>
                        <span>Modo</span>
                        <select
                          value={slot.mode}
                          onChange={(event) =>
                            setSelectedSpecialistAvailability((current) =>
                              current.map((item) =>
                                item.id === slot.id
                                  ? {
                                      ...item,
                                      mode: event.target.value,
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          {["chat", "video", "audio"].map((mode) => (
                            <option key={mode} value={mode}>
                              {formatModeLabel(mode)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="switch-row">
                        <input
                          type="checkbox"
                          checked={slot.isAvailable}
                          onChange={(event) =>
                            setSelectedSpecialistAvailability((current) =>
                              current.map((item) =>
                                item.id === slot.id
                                  ? {
                                      ...item,
                                      isAvailable: event.target.checked,
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                        <span>{slot.isAvailable ? "Activo" : "Inactivo"}</span>
                      </label>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleUpdateAvailability(slot)}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => void handleDeleteAvailability(slot)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {!specialistDrawerLoading && specialistDetailTab === "bookings" ? (
              <div className="table-list">
                {selectedSpecialistBookings.map((booking) => (
                  <article key={booking.id} className="table-row">
                    <div>
                      <strong>{booking.serviceName}</strong>
                      <p>{booking.userName}</p>
                    </div>
                    <div>
                      <strong>{formatDate(booking.scheduledAt)}</strong>
                      <p>{formatModeLabel(booking.mode)}</p>
                    </div>
                    <div className="align-right">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleOpenBookingDrawer(booking)}
                      >
                        Editar
                      </button>
                      <span className="topbar-pill">
                        {formatBookingStatusLabel(booking.status)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {!specialistDrawerLoading && specialistDetailTab === "metrics" ? (
              <section className="specialist-detail-grid">
                <article className="metric-card">
                  <span>Reservas</span>
                  <strong>{specialistMetrics.bookings}</strong>
                </article>
                <article className="metric-card">
                  <span>Servicios</span>
                  <strong>{specialistMetrics.services}</strong>
                </article>
                <article className="metric-card">
                  <span>Bloques activos</span>
                  <strong>{specialistMetrics.availability}</strong>
                </article>
                <article className="metric-card">
                  <span>Próximo bloque</span>
                  <strong>
                    {specialistMetrics.nextAvailableAt
                      ? formatDate(specialistMetrics.nextAvailableAt)
                      : "Sin bloque"}
                  </strong>
                </article>
              </section>
            ) : null}

            {!specialistDrawerLoading && specialistDetailTab === "history" ? (
              <div className="table-list">
                {selectedSpecialistAudit.slice(0, 20).map((entry) => (
                  <article key={entry.id} className="table-row">
                    <div>
                      <strong>{entry.payload.action ?? entry.eventType}</strong>
                      <p>{entry.payload.fieldChanged ?? entry.entityType}</p>
                    </div>
                    <div>
                      <strong>
                        {entry.payload.changedBy ?? entry.actorId}
                      </strong>
                      <p>{formatDate(entry.createdAt)}</p>
                    </div>
                    <div className="align-right">
                      <span className="topbar-pill">
                        {entry.payload.source ?? "admin"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}

      {isProductDrawerOpen ? (
        <div
          className="badge-editor-backdrop"
          onClick={handleCloseProductDrawer}
          role="presentation"
        >
          <aside
            className="badge-editor-drawer admin-drawer-wide"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-drawer-title"
          >
            <div className="audit-detail-head">
              <div>
                <p className="eyebrow">Tienda</p>
                <h2 id="product-drawer-title">
                  {selectedProduct
                    ? `Editar ${selectedProduct.name}`
                    : "Nuevo producto"}
                </h2>
                <p className="badge-editor-copy">
                  Gestiona fotos, precio, stock y estado desde un solo panel.
                </p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCloseProductDrawer}
              >
                Cerrar
              </button>
            </div>

            <form
              className="badge-editor-form"
              onSubmit={(event) => void handleSaveProduct(event)}
            >
              <div className="badge-preview">
                <article className="badge-preview-card">
                  <div className="badge-preview-icon">
                    {hasRenderableMediaUrl(productForm.imageUrl) ? (
                      <img
                        src={resolveMediaUrl(productForm.imageUrl)}
                        alt={productForm.name || "Producto"}
                        className="badge-preview-image"
                      />
                    ) : (
                      <span className="badge-preview-fallback">
                        {productForm.name
                          ? productForm.name.slice(0, 2).toUpperCase()
                          : "PR"}
                      </span>
                    )}
                  </div>
                  <div className="badge-preview-copy">
                    <p>{productForm.category || "Categoría pendiente"}</p>
                    <h3>{productForm.name || "Nombre pendiente"}</h3>
                    <strong>
                      {formatMoney(
                        Number(productForm.priceAmount || 0),
                        productForm.priceCurrency || "USD",
                      )}
                    </strong>
                    <p>
                      {productForm.shortDescription ||
                        "Agrega una descripción breve."}
                    </p>
                  </div>
                </article>
              </div>

              <div className="badge-form-grid badge-form-grid-compact">
                <label className="form-wide">
                  <span>Nombre</span>
                  <input
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Categoría</span>
                  <input
                    value={productForm.category}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Especialista</span>
                  <select
                    value={productForm.specialistId}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        specialistId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona</option>
                    {specialists.map((specialist) => (
                      <option key={specialist.id} value={specialist.id}>
                        {specialist.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Precio</span>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.priceAmount}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        priceAmount: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Moneda</span>
                  <input
                    value={productForm.priceCurrency}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        priceCurrency: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Stock</span>
                  <input
                    type="number"
                    value={productForm.stockQuantity}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        stockQuantity: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Estado</span>
                  <select
                    value={productForm.status}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                  >
                    {["active", "draft", "hidden", "archived"].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>SKU</span>
                  <input
                    value={productForm.sku}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        sku: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-wide">
                  <span>Resumen corto</span>
                  <textarea
                    rows={2}
                    value={productForm.shortDescription}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        shortDescription: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-wide">
                  <span>Descripción</span>
                  <textarea
                    rows={3}
                    value={productForm.description}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="form-wide">
                  <AdminFileUploader
                    apiBaseUrl={apiBaseUrl}
                    label="Foto principal"
                    description="Sube una imagen PNG, JPG, WEBP o SVG."
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    mode="image"
                    value={productForm.imageUrl}
                    category="product"
                    entityType="shop_product"
                    entityId={selectedProductId ?? undefined}
                    onUploaded={(asset) =>
                      setProductForm((current) => ({
                        ...current,
                        imageUrl: asset.publicUrl,
                      }))
                    }
                    onClear={() =>
                      setProductForm((current) => ({
                        ...current,
                        imageUrl: "",
                      }))
                    }
                  />
                </div>
                <label className="form-wide">
                  <span>URL externa de imagen principal</span>
                  <input
                    value={productForm.imageUrl}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        imageUrl: event.target.value,
                      }))
                    }
                    placeholder="https://..."
                  />
                </label>
                <div className="form-wide">
                  <AdminFileUploader
                    apiBaseUrl={apiBaseUrl}
                    label="Galería"
                    description="Agrega imágenes adicionales al producto."
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    mode="image"
                    value={
                      productForm.imageUrls
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)[0] ?? ""
                    }
                    category="product"
                    entityType="shop_product"
                    entityId={selectedProductId ?? undefined}
                    onUploaded={(asset) =>
                      setProductForm((current) => {
                        const currentImages = parseImageList(current.imageUrls);
                        const nextImages = [...currentImages, asset.publicUrl];
                        return {
                          ...current,
                          imageUrls: nextImages.join(", "),
                        };
                      })
                    }
                    onClear={() =>
                      setProductForm((current) => {
                        const currentImages = parseImageList(current.imageUrls);
                        return {
                          ...current,
                          imageUrls: currentImages.slice(1).join(", "),
                        };
                      })
                    }
                  />
                </div>
                <label className="form-wide">
                  <span>URLs de galería</span>
                  <textarea
                    rows={2}
                    value={productForm.imageUrls}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        imageUrls: event.target.value,
                      }))
                    }
                    placeholder="https://..., https://..."
                  />
                </label>
                <label className="form-wide">
                  <span>Artwork</span>
                  <input
                    value={productForm.artwork}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        artwork: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-wide">
                  <span>Badge</span>
                  <input
                    value={productForm.badge}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        badge: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-wide">
                  <span>Tags</span>
                  <input
                    value={productForm.tags}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        tags: event.target.value,
                      }))
                    }
                    placeholder="ritual, premium, kit"
                  />
                </label>
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={productForm.madeToOrder}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        madeToOrder: event.target.checked,
                      }))
                    }
                  />
                  <span>Hecho a pedido</span>
                </label>
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={productForm.featured}
                    onChange={(event) =>
                      setProductForm((current) => ({
                        ...current,
                        featured: event.target.checked,
                      }))
                    }
                  />
                  <span>Destacado</span>
                </label>
              </div>

              <div className="editor-actions">
                <button type="submit" className="primary-button">
                  Guardar producto
                </button>
                <button type="button" onClick={handleCloseProductDrawer}>
                  Cancelar
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {isBookingDrawerOpen ? (
        <div
          className="badge-editor-backdrop"
          onClick={handleCloseBookingDrawer}
          role="presentation"
        >
          <aside
            className="badge-editor-drawer admin-drawer-wide"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-drawer-title"
          >
            <div className="audit-detail-head">
              <div>
                <p className="eyebrow">Agenda</p>
                <h2 id="booking-drawer-title">
                  {selectedBooking
                    ? `Editar ${selectedBooking.serviceName}`
                    : "Nueva reunión"}
                </h2>
                <p className="badge-editor-copy">
                  Crea o ajusta citas, estados y horarios sin salir de la vista.
                </p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCloseBookingDrawer}
              >
                Cerrar
              </button>
            </div>

            <form
              className="badge-editor-form"
              onSubmit={(event) => void handleSaveBooking(event)}
            >
              <div className="badge-form-grid badge-form-grid-compact">
                <label>
                  <span>Usuario</span>
                  <select
                    value={bookingForm.userId}
                    onChange={(event) =>
                      setBookingForm((current) => ({
                        ...current,
                        userId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.fullName || user.email || user.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Especialista</span>
                  <select
                    value={bookingForm.specialistId}
                    onChange={(event) => {
                      const nextSpecialistId = event.target.value;
                      const nextSpecialist =
                        specialists.find(
                          (item) => item.id === nextSpecialistId,
                        ) ?? null;
                      const nextServiceId =
                        nextSpecialist?.services[0]?.id ?? "";
                      setBookingForm((current) => ({
                        ...current,
                        specialistId: nextSpecialistId,
                        serviceId: nextServiceId,
                      }));
                    }}
                  >
                    <option value="">Selecciona</option>
                    {specialists.map((specialist) => (
                      <option key={specialist.id} value={specialist.id}>
                        {specialist.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Servicio</span>
                  <select
                    value={bookingForm.serviceId}
                    onChange={(event) =>
                      setBookingForm((current) => ({
                        ...current,
                        serviceId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona</option>
                    {selectedBookingServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Fecha y hora</span>
                  <input
                    type="datetime-local"
                    value={bookingForm.scheduledAt}
                    onChange={(event) =>
                      setBookingForm((current) => ({
                        ...current,
                        scheduledAt: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  <span>Modo</span>
                  <select
                    value={bookingForm.mode}
                    onChange={(event) =>
                      setBookingForm((current) => ({
                        ...current,
                        mode: event.target.value,
                      }))
                    }
                  >
                    {["chat", "audio", "video"].map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Estado</span>
                  <select
                    value={bookingForm.status}
                    onChange={(event) =>
                      setBookingForm((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                  >
                    {[
                      "pending_payment",
                      "confirmed",
                      "in_progress",
                      "completed",
                      "cancelled",
                    ].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-wide">
                  <span>Notas</span>
                  <textarea
                    rows={3}
                    value={bookingForm.notes}
                    onChange={(event) =>
                      setBookingForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="badge-preview-meta">
                <div>
                  <span>Servicio seleccionado</span>
                  <strong>
                    {selectedBookingService?.name ?? "Sin servicio"}
                  </strong>
                </div>
                <div>
                  <span>Duración</span>
                  <strong>
                    {selectedBookingService?.durationMinutes
                      ? `${selectedBookingService.durationMinutes} min`
                      : "Sin definir"}
                  </strong>
                </div>
                <div>
                  <span>Modos</span>
                  <strong>
                    {selectedBookingService?.deliveryModes?.length
                      ? selectedBookingService.deliveryModes.join(" · ")
                      : "chat · audio · video"}
                  </strong>
                </div>
              </div>

              <div className="editor-actions">
                <button type="submit" className="primary-button">
                  Guardar reunión
                </button>
                <button type="button" onClick={handleCloseBookingDrawer}>
                  Cancelar
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {isUserDrawerOpen ? (
        <div
          className="badge-editor-backdrop"
          onClick={handleCloseUserDrawer}
          role="presentation"
        >
          <aside
            className="badge-editor-drawer admin-drawer-wide"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-drawer-title"
          >
            <div className="audit-detail-head">
              <div>
                <p className="eyebrow">Usuarios</p>
                <h2 id="user-drawer-title">
                  {selectedUserId ? "Editar usuario" : "Nuevo usuario"}
                </h2>
                <p className="badge-editor-copy">
                  Define datos básicos, plan y roles para controlar qué puede
                  ver cada usuario.
                </p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCloseUserDrawer}
              >
                Cerrar
              </button>
            </div>

            {userError ? (
              <p className="badge-feedback badge-feedback-error">{userError}</p>
            ) : null}
            {userMessage ? (
              <p className="badge-feedback badge-feedback-success">
                {userMessage}
              </p>
            ) : null}

            <form
              className="badge-editor-form"
              onSubmit={(event) => void handleSaveUser(event)}
            >
              <div className="badge-form-grid badge-form-grid-compact">
                <label>
                  <span>Nombre</span>
                  <input
                    value={userForm.firstName}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                    placeholder="Nombre"
                  />
                </label>
                <label>
                  <span>Apellido</span>
                  <input
                    value={userForm.lastName}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                    placeholder="Apellido"
                  />
                </label>
                <label>
                  <span>Alias</span>
                  <input
                    value={userForm.nickname}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        nickname: event.target.value,
                      }))
                    }
                    placeholder="Alias"
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="correo@dominio.com"
                  />
                </label>
                <label>
                  <span>Teléfono</span>
                  <input
                    value={userForm.phoneNumber}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        phoneNumber: event.target.value,
                      }))
                    }
                    placeholder="+598..."
                  />
                </label>
                <label>
                  <span>Plan base</span>
                  <select
                    value={userForm.planId}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        planId: event.target.value,
                      }))
                    }
                  >
                    <option value="free">free</option>
                    <option value="premium">premium</option>
                  </select>
                </label>
                <label>
                  <span>Tipo de cuenta</span>
                  <select
                    value={userForm.accountType}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        accountType: event.target.value as
                          "client" | "specialist",
                        specialistAccess:
                          event.target.value === "specialist"
                            ? true
                            : current.specialistAccess,
                      }))
                    }
                  >
                    <option value="client">Cliente</option>
                    <option value="specialist">Especialista</option>
                  </select>
                </label>
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={userForm.specialistAccess}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        specialistAccess: event.target.checked,
                        accountType: event.target.checked
                          ? "specialist"
                          : current.accountType,
                      }))
                    }
                  />
                  <span>Acceso especialista</span>
                </label>
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={userForm.adminAccess}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        adminAccess: event.target.checked,
                      }))
                    }
                  />
                  <span>Acceso admin</span>
                </label>
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={userForm.profileCompleted}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        profileCompleted: event.target.checked,
                      }))
                    }
                  />
                  <span>Perfil completo</span>
                </label>
              </div>

              <div className="badge-preview-meta">
                <div>
                  <span>Rol principal</span>
                  <strong>
                    {userForm.adminAccess
                      ? userRoleLabels.admin
                      : userForm.specialistAccess
                        ? userRoleLabels.specialist
                        : userRoleLabels.client}
                  </strong>
                </div>
                <div>
                  <span>Accesos</span>
                  <strong>
                    {getUserAccessSummary({
                      id: "preview",
                      fullName: "",
                      email: "",
                      phoneNumber: "",
                      planId: userForm.planId,
                      profileCompleted: userForm.profileCompleted,
                      createdAt: "",
                      roles: [
                        ...(userForm.adminAccess
                          ? (["admin"] as Array<"admin" | "specialist">)
                          : []),
                        ...(userForm.specialistAccess
                          ? (["specialist"] as Array<"admin" | "specialist">)
                          : []),
                      ],
                      accountType: userForm.accountType,
                      access: [],
                      premiumStatus: "",
                      premiumStartedAt: null,
                      premiumRenewsAt: null,
                    }).join(" · ") || "Sin accesos"}
                  </strong>
                </div>
                <div>
                  <span>Perfil</span>
                  <strong>
                    {userForm.profileCompleted ? "Completo" : "Pendiente"}
                  </strong>
                </div>
              </div>

              <div className="editor-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingUserId !== null}
                >
                  {savingUserId
                    ? "Guardando..."
                    : selectedUserId
                      ? "Actualizar usuario"
                      : "Crear usuario"}
                </button>
                <button type="button" onClick={handleCloseUserDrawer}>
                  Cancelar
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {isCourseDrawerOpen ? (
        <section className="admin-panel admin-panel-wide course-workspace-page">
          <div className="course-workspace-shell">
            <div className="audit-detail-head course-drawer-head">
              <div>
                <p className="eyebrow">
                  {courseDrawerTab === "library" ? "Biblioteca" : "Cursos"}
                </p>
                <h2 id="course-drawer-title">
                  {courseDrawerTab === "library"
                    ? selectedLibraryPdfId
                      ? "Editar PDF"
                      : "Nuevo PDF"
                    : selectedCourse
                      ? `Editar ${selectedCourse.title}`
                      : "Nuevo curso"}
                </h2>
                <p className="badge-editor-copy">
                  {courseDrawerTab === "library"
                    ? "Datos del PDF, categoría, vínculo opcional y publicación."
                    : "Datos del curso, módulos, lecciones, biblioteca PDF y publicación."}
                </p>
              </div>
              <div className="course-drawer-head-actions">
                <span className="topbar-pill">
                  {selectedCourse?.status === "published"
                    ? "Publicado"
                    : selectedCourse?.status === "archived"
                      ? "Archivado"
                      : "Borrador"}
                </span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => openCourseWorkspaceTab(null, "data")}
                >
                  Nuevo curso
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCloseCourseDrawer}
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="course-drawer-layout">
              <aside className="course-drawer-sidebar">
                <div className="course-drawer-summary">
                  <div>
                    <span className="course-drawer-kicker">
                      Vista del curso
                    </span>
                    <strong>
                      {selectedCourse?.title ?? "Nuevo curso sin nombre"}
                    </strong>
                    <p>
                      {selectedCourse
                        ? selectedCourse.subtitle || "Sin subtítulo todavía"
                        : "Completa la base, luego agrega módulos, lecciones y publicación."}
                    </p>
                  </div>
                  <div className="course-drawer-metrics">
                    <div>
                      <span>Módulos</span>
                      <strong>{selectedCourseModules.length}</strong>
                    </div>
                    <div>
                      <span>Lecciones</span>
                      <strong>{selectedCourseLessons.length}</strong>
                    </div>
                    <div>
                      <span>Recursos</span>
                      <strong>{selectedCourseResources.length}</strong>
                    </div>
                  </div>
                </div>

                <div className="course-drawer-rail">
                  {[
                    ["data", "Datos", "Título, resumen y portada"],
                    ["modules", "Módulos", "Estructura del curso"],
                    ["lessons", "Lecciones", "Contenido detallado"],
                    ["resources", "Recursos", "Material asociado"],
                    ["library", "Biblioteca", "PDFs y descargas"],
                    ["publication", "Publicación", "Estado y visibilidad"],
                    ["history", "Historial", "Cambios y auditoría"],
                  ].map(([value, label, hint]) => (
                    <button
                      key={value}
                      type="button"
                      className={
                        courseDrawerTab === value
                          ? "course-drawer-nav-item course-drawer-nav-item-active"
                          : "course-drawer-nav-item"
                      }
                      onClick={() =>
                        handleSelectCourseDrawerTab(value as CourseWorkspaceTab)
                      }
                    >
                      <strong>{label}</strong>
                      <span>{hint}</span>
                    </button>
                  ))}
                </div>

                <div className="course-drawer-note">
                  <span>Atajo</span>
                  <p>
                    Usa la pestaña activa para editar una sola capa del curso
                    sin perder el contexto del resto.
                  </p>
                </div>
              </aside>

              <section className="course-drawer-main">
                {courseError ? (
                  <p className="badge-feedback badge-feedback-error">
                    {courseError}
                  </p>
                ) : null}
                {courseMessage ? (
                  <p className="badge-feedback badge-feedback-success">
                    {courseMessage}
                  </p>
                ) : null}

                {courseDrawerTab === "data" ? (
                  <form
                    className="badge-editor-form course-editor-form"
                    onSubmit={(event) => void handleSaveCourse(event)}
                  >
                    <div className="course-editor-grid">
                      <section className="course-editor-card">
                        <div className="course-editor-card-head">
                          <div>
                            <p className="eyebrow">Datos base</p>
                            <h3>Identidad y alcance</h3>
                          </div>
                        </div>
                        <div className="badge-form-grid badge-form-grid-compact">
                          <label className="form-wide">
                            <span>Título</span>
                            <input
                              value={courseForm.title}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="form-wide">
                            <span>Subtítulo</span>
                            <input
                              value={courseForm.subtitle}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  subtitle: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>Categoría</span>
                            <input
                              value={courseForm.category}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  category: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>Nivel</span>
                            <input
                              value={courseForm.level}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  level: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>Horas estimadas</span>
                            <input
                              type="number"
                              step="0.1"
                              value={courseForm.estimatedHours}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  estimatedHours: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>Progreso</span>
                            <input
                              type="number"
                              value={courseForm.progressPercent}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  progressPercent: event.target.value,
                                }))
                              }
                            />
                          </label>
                        </div>
                      </section>

                      <section className="course-editor-card">
                        <div className="course-editor-card-head">
                          <div>
                            <p className="eyebrow">Narrativa</p>
                            <h3>Texto y orientación</h3>
                          </div>
                        </div>
                        <div className="badge-form-grid badge-form-grid-compact">
                          <label className="form-wide">
                            <span>Hook</span>
                            <textarea
                              rows={2}
                              value={courseForm.hook}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  hook: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="form-wide">
                            <span>Descripción</span>
                            <textarea
                              rows={4}
                              value={courseForm.description}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  description: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="form-wide">
                            <span>Objetivos</span>
                            <textarea
                              rows={4}
                              value={courseForm.outcomes}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  outcomes: event.target.value,
                                }))
                              }
                              placeholder="Un objetivo por línea"
                            />
                          </label>
                        </div>
                      </section>

                      <section className="course-editor-card course-editor-card-visual">
                        <div className="course-editor-card-head">
                          <div>
                            <p className="eyebrow">Portada y estado</p>
                            <h3>Publicación</h3>
                          </div>
                        </div>
                        <AdminFileUploader
                          apiBaseUrl={apiBaseUrl}
                          label="Portada"
                          description="Sube una imagen para el curso o pega una URL externa."
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                          mode="image"
                          value={courseForm.coverImageUrl}
                          category="course"
                          entityType="course"
                          entityId={selectedCourseId ?? undefined}
                          onUploaded={(asset) =>
                            setCourseForm((current) => ({
                              ...current,
                              coverImageUrl: asset.publicUrl,
                            }))
                          }
                          onClear={() =>
                            setCourseForm((current) => ({
                              ...current,
                              coverImageUrl: "",
                            }))
                          }
                        />
                        <label className="form-wide">
                          <span>URL externa de portada</span>
                          <input
                            value={courseForm.coverImageUrl}
                            onChange={(event) =>
                              setCourseForm((current) => ({
                                ...current,
                                coverImageUrl: event.target.value,
                              }))
                            }
                            placeholder="https://..."
                          />
                        </label>
                        <div className="course-editor-switches">
                          <label>
                            <span>Estado</span>
                            <select
                              value={courseForm.status}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  status: event.target.value,
                                }))
                              }
                            >
                              <option value="draft">Borrador</option>
                              <option value="published">Publicado</option>
                              <option value="archived">Archivado</option>
                            </select>
                          </label>
                          <label className="switch-row">
                            <input
                              type="checkbox"
                              checked={courseForm.premium}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  premium: event.target.checked,
                                }))
                              }
                            />
                            <span>Premium</span>
                          </label>
                          <label className="switch-row">
                            <input
                              type="checkbox"
                              checked={courseForm.featured}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  featured: event.target.checked,
                                }))
                              }
                            />
                            <span>Destacado</span>
                          </label>
                          <label className="switch-row">
                            <input
                              type="checkbox"
                              checked={courseForm.removable}
                              onChange={(event) =>
                                setCourseForm((current) => ({
                                  ...current,
                                  removable: event.target.checked,
                                }))
                              }
                            />
                            <span>Eliminable</span>
                          </label>
                        </div>
                      </section>
                    </div>

                    <div className="editor-actions course-editor-actions">
                      <button
                        type="submit"
                        className="primary-button"
                        disabled={savingCourseId !== null}
                      >
                        {savingCourseId ? "Guardando..." : "Guardar curso"}
                      </button>
                      <button type="button" onClick={handleCloseCourseDrawer}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : null}

                {courseDrawerTab === "modules" ? (
                  <div className="course-subview-grid course-subview-grid-modules">
                    <article className="course-subview-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Módulos</p>
                          <h3>
                            {selectedCourseModuleId
                              ? "Editar módulo"
                              : "Nuevo módulo"}
                          </h3>
                          <p>
                            {selectedCourse?.title ?? "Selecciona un curso"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setSelectedCourseModuleId(null);
                            setCourseModuleForm({
                              title: "",
                              summary: "",
                              durationMinutes: "",
                              order: "",
                              status: "draft",
                              isActive: true,
                            });
                          }}
                        >
                          Nuevo
                        </button>
                      </div>
                      <form
                        className="badge-form-grid badge-form-grid-compact"
                        onSubmit={(event) => void handleSaveCourseModule(event)}
                      >
                        <label className="form-wide">
                          <span>Título</span>
                          <input
                            value={courseModuleForm.title}
                            onChange={(event) =>
                              setCourseModuleForm((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="form-wide">
                          <span>Resumen</span>
                          <textarea
                            rows={2}
                            value={courseModuleForm.summary}
                            onChange={(event) =>
                              setCourseModuleForm((current) => ({
                                ...current,
                                summary: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <div className="course-inline-fields">
                          <label>
                            <span>Duración</span>
                            <input
                              type="number"
                              value={courseModuleForm.durationMinutes}
                              onChange={(event) =>
                                setCourseModuleForm((current) => ({
                                  ...current,
                                  durationMinutes: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>Orden</span>
                            <input
                              type="number"
                              value={courseModuleForm.order}
                              onChange={(event) =>
                                setCourseModuleForm((current) => ({
                                  ...current,
                                  order: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>Estado</span>
                            <select
                              value={courseModuleForm.status}
                              onChange={(event) =>
                                setCourseModuleForm((current) => ({
                                  ...current,
                                  status: event.target.value,
                                }))
                              }
                            >
                              <option value="draft">Borrador</option>
                              <option value="published">Publicado</option>
                              <option value="archived">Archivado</option>
                            </select>
                          </label>
                        </div>
                        <label className="switch-row">
                          <input
                            type="checkbox"
                            checked={courseModuleForm.isActive}
                            onChange={(event) =>
                              setCourseModuleForm((current) => ({
                                ...current,
                                isActive: event.target.checked,
                              }))
                            }
                          />
                          <span>
                            {courseModuleForm.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </label>
                        <div className="editor-actions form-wide">
                          <button type="submit" className="primary-button">
                            {selectedCourseModuleId
                              ? "Guardar módulo"
                              : "Crear módulo"}
                          </button>
                        </div>
                      </form>
                    </article>

                    <article className="course-subview-card course-subview-list-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Lista</p>
                          <h3>{selectedCourseModules.length} módulos</h3>
                        </div>
                      </div>
                      {selectedCourseModules.length > 0 ? (
                        <div className="course-item-list">
                          {selectedCourseModules.map((module) => (
                            <article
                              key={module.id}
                              className="course-item-row"
                            >
                              <div>
                                <strong>{module.title}</strong>
                                <p>{module.summary}</p>
                              </div>
                              <div className="course-item-meta">
                                <span>{module.lessons.length} lecciones</span>
                                <strong className="topbar-pill">
                                  {module.status ?? "draft"}
                                </strong>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => {
                                    setSelectedCourseModuleId(module.id);
                                    setCourseModuleForm({
                                      title: module.title,
                                      summary: module.summary,
                                      durationMinutes: String(
                                        module.durationMinutes,
                                      ),
                                      order: String(module.order ?? 1),
                                      status: module.status ?? "draft",
                                      isActive: module.isActive ?? true,
                                    });
                                    handleSelectCourseDrawerTab("modules");
                                  }}
                                >
                                  Editar
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <h3>No hay módulos todavía.</h3>
                          <p>
                            Agrega el primer módulo para empezar a estructurar
                            el curso.
                          </p>
                        </div>
                      )}
                    </article>
                  </div>
                ) : null}

                {courseDrawerTab === "lessons" ? (
                  <div className="course-subview-grid">
                    <article className="course-subview-card">
                      <div className="panel-head">
                        <div>
                          <strong>
                            {selectedCourseLessonId
                              ? "Editar lección"
                              : "Nueva lección"}
                          </strong>
                          <p>
                            {selectedCourse?.title ?? "Selecciona un curso"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setSelectedCourseLessonId(null);
                            setCourseLessonForm({
                              title: "",
                              format: "video",
                              durationMinutes: "",
                              prompt: "",
                              content: "",
                              resourceUrl: "",
                              order: "",
                              status: "draft",
                              isActive: true,
                            });
                          }}
                        >
                          Nueva
                        </button>
                      </div>
                      <label>
                        <span>Módulo</span>
                        <select
                          value={selectedCourseModuleId ?? ""}
                          onChange={(event) =>
                            setSelectedCourseModuleId(
                              event.target.value || null,
                            )
                          }
                        >
                          <option value="">Selecciona</option>
                          {selectedCourseModules.map((module) => (
                            <option key={module.id} value={module.id}>
                              {module.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <form
                        className="badge-form-grid badge-form-grid-compact"
                        onSubmit={(event) => void handleSaveCourseLesson(event)}
                      >
                        <label className="form-wide">
                          <span>Título</span>
                          <input
                            value={courseLessonForm.title}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Formato</span>
                          <input
                            value={courseLessonForm.format}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                format: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Duración</span>
                          <input
                            type="number"
                            value={courseLessonForm.durationMinutes}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                durationMinutes: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Orden</span>
                          <input
                            type="number"
                            value={courseLessonForm.order}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                order: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="form-wide">
                          <span>Prompt</span>
                          <textarea
                            rows={3}
                            value={courseLessonForm.prompt}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                prompt: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="form-wide">
                          <span>Contenido</span>
                          <textarea
                            rows={4}
                            value={courseLessonForm.content}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                content: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="form-wide">
                          <span>Recurso</span>
                          <input
                            value={courseLessonForm.resourceUrl}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                resourceUrl: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <div className="form-wide">
                          <AdminFileUploader
                            apiBaseUrl={apiBaseUrl}
                            label="Archivo de la lección"
                            description="PDF, imagen o exportación de Canva."
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,application/pdf"
                            mode="general"
                            value={courseLessonForm.resourceUrl}
                            category="lesson"
                            entityType="course_lesson"
                            entityId={selectedCourseLessonId ?? undefined}
                            onUploaded={(asset) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                resourceUrl: asset.publicUrl,
                              }))
                            }
                            onClear={() =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                resourceUrl: "",
                              }))
                            }
                          />
                        </div>
                        <label>
                          <span>Estado</span>
                          <select
                            value={courseLessonForm.status}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                status: event.target.value,
                              }))
                            }
                          >
                            <option value="draft">Borrador</option>
                            <option value="published">Publicado</option>
                            <option value="archived">Archivado</option>
                          </select>
                        </label>
                        <label className="switch-row">
                          <input
                            type="checkbox"
                            checked={courseLessonForm.isActive}
                            onChange={(event) =>
                              setCourseLessonForm((current) => ({
                                ...current,
                                isActive: event.target.checked,
                              }))
                            }
                          />
                          <span>
                            {courseLessonForm.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </label>
                        <div className="editor-actions form-wide">
                          <button type="submit" className="primary-button">
                            {selectedCourseLessonId
                              ? "Guardar lección"
                              : "Crear lección"}
                          </button>
                        </div>
                      </form>
                    </article>

                    <article className="course-subview-card course-subview-list-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Lista</p>
                          <h3>{selectedCourseLessons.length} lecciones</h3>
                        </div>
                      </div>
                      {selectedCourseLessons.length > 0 ? (
                        <div className="course-item-list">
                          {selectedCourseLessons.map((lesson) => (
                            <article
                              key={lesson.id}
                              className="course-item-row"
                            >
                              <div>
                                <strong>{lesson.title}</strong>
                                <p>{lesson.prompt || lesson.content}</p>
                              </div>
                              <div className="course-item-meta">
                                <span>{lesson.format}</span>
                                <strong>{lesson.durationMinutes} min</strong>
                                <span className="topbar-pill">
                                  {lesson.status ?? "draft"}
                                </span>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => {
                                    setSelectedCourseLessonId(lesson.id);
                                    setCourseLessonForm({
                                      title: lesson.title,
                                      format: lesson.format,
                                      durationMinutes: String(
                                        lesson.durationMinutes,
                                      ),
                                      prompt: lesson.prompt,
                                      content: lesson.content ?? "",
                                      resourceUrl: lesson.resourceUrl ?? "",
                                      order: String(lesson.order ?? 1),
                                      status: lesson.status ?? "draft",
                                      isActive: lesson.isActive ?? true,
                                    });
                                    handleSelectCourseDrawerTab("lessons");
                                  }}
                                >
                                  Editar
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <h3>No hay lecciones todavía.</h3>
                          <p>
                            Selecciona un módulo y agrega la primera lección
                            para completar la ruta.
                          </p>
                        </div>
                      )}
                    </article>
                  </div>
                ) : null}

                {courseDrawerTab === "resources" ? (
                  <div className="course-subview-grid">
                    <article className="course-subview-card">
                      <div className="panel-head">
                        <div>
                          <strong>Recurso</strong>
                          <p>
                            {selectedCourse?.title ?? "Selecciona un curso"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setSelectedCourseResourceId(null);
                            setCourseResourceForm({
                              title: "",
                              kind: "link",
                              description: "",
                              url: "",
                              status: "draft",
                              isActive: true,
                            });
                          }}
                        >
                          Nuevo
                        </button>
                      </div>
                      <form
                        className="badge-form-grid badge-form-grid-compact"
                        onSubmit={(event) =>
                          void handleSaveCourseResource(event)
                        }
                      >
                        <label className="form-wide">
                          <span>Título</span>
                          <input
                            value={courseResourceForm.title}
                            onChange={(event) =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span>Tipo</span>
                          <select
                            value={courseResourceForm.kind}
                            onChange={(event) =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                kind: event.target.value,
                              }))
                            }
                          >
                            <option value="pdf">PDF</option>
                            <option value="canva">Canva</option>
                            <option value="file">Archivo</option>
                            <option value="image">Imagen</option>
                            <option value="link">Enlace</option>
                          </select>
                        </label>
                        <label className="form-wide">
                          <span>Descripción</span>
                          <textarea
                            rows={3}
                            value={courseResourceForm.description}
                            onChange={(event) =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label className="form-wide">
                          <span>Archivo o enlace Canva</span>
                          <input
                            placeholder="Pega el enlace Canva/PDF o sube un archivo abajo"
                            value={courseResourceForm.url}
                            onChange={(event) =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                url: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <div className="form-wide">
                          <AdminFileUploader
                            apiBaseUrl={apiBaseUrl}
                            label="Recurso descargable"
                            description="Sube PDF, DOC, DOCX o imagen; para Canva pega el enlace compartido."
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            mode="general"
                            value={courseResourceForm.url}
                            category="course"
                            entityType="course_resource"
                            entityId={selectedCourseResourceId ?? undefined}
                            onUploaded={(asset) =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                kind:
                                  asset.mimeType === "application/pdf"
                                    ? "pdf"
                                    : asset.mimeType.startsWith("image/")
                                      ? "image"
                                      : "file",
                                url: asset.publicUrl,
                              }))
                            }
                            onClear={() =>
                              setCourseResourceForm((current) => ({
                                ...current,
                                url: "",
                              }))
                            }
                          />
                        </div>
                        <div className="editor-actions form-wide">
                          <button type="submit" className="primary-button">
                            Guardar recurso
                          </button>
                        </div>
                      </form>
                    </article>

                    <article className="course-subview-card course-subview-list-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Lista</p>
                          <h3>{selectedCourseResources.length} recursos</h3>
                        </div>
                      </div>
                      {selectedCourseResources.length > 0 ? (
                        <div className="course-item-list">
                          {selectedCourseResources.map((resource) => (
                            <article
                              key={resource.id}
                              className="course-item-row"
                            >
                              <div>
                                <strong>{resource.title}</strong>
                                <p>{resource.description}</p>
                              </div>
                              <div className="course-item-meta">
                                <span>{resource.kind}</span>
                                <strong className="topbar-pill">
                                  {resource.status ?? "draft"}
                                </strong>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  onClick={() => {
                                    setSelectedCourseResourceId(resource.id);
                                    setCourseResourceForm({
                                      title: resource.title,
                                      kind: resource.kind,
                                      description: resource.description,
                                      url: resource.url,
                                      status: resource.status ?? "draft",
                                      isActive: resource.isActive ?? true,
                                    });
                                    handleSelectCourseDrawerTab("resources");
                                  }}
                                >
                                  Editar
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">
                          <h3>No hay recursos todavía.</h3>
                          <p>
                            Agrega PDFs, enlaces o materiales extra para
                            complementar el curso.
                          </p>
                        </div>
                      )}
                    </article>
                  </div>
                ) : null}

                {courseDrawerTab === "library" ? (
                  <>
                    {libraryBulkNotice ? (
                      <section
                        className={`library-notice library-notice-${libraryBulkNotice.tone}`}
                      >
                        <div className="library-notice-icon" aria-hidden="true">
                          <ActionIcon
                            name={
                              libraryBulkNotice.tone === "success"
                                ? "success"
                                : libraryBulkNotice.tone === "warning"
                                  ? "warning"
                                  : libraryBulkNotice.tone === "info"
                                    ? "info"
                                    : "close"
                            }
                          />
                        </div>
                        <div className="library-notice-copy">
                          <strong>{libraryBulkNotice.title}</strong>
                          <p>{libraryBulkNotice.message}</p>
                          {libraryBulkNotice.details &&
                          libraryBulkNotice.details.length > 0 ? (
                            <ul>
                              {libraryBulkNotice.details.map((detail) => (
                                <li key={detail}>{detail}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className="secondary-button library-notice-close"
                          onClick={() => setLibraryBulkNotice(null)}
                        >
                          <span className="button-icon" aria-hidden="true">
                            <ActionIcon name="close" />
                          </span>
                        </button>
                      </section>
                    ) : null}

                    <div className="course-subview-grid">
                      <article className="course-subview-card">
                        <div className="panel-head">
                          <div>
                            <strong>
                              {selectedLibraryPdfId
                                ? "Editar PDF"
                                : "Nuevo PDF"}
                            </strong>
                            <p>Biblioteca formativa</p>
                          </div>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                              resetLibraryPdfDraft(null);
                            }}
                          >
                            Nuevo
                          </button>
                        </div>
                        <p className="muted-copy">
                          Este editor sirve para ajustar un PDF ya cargado o
                          crear uno nuevo con vínculo opcional a un curso.
                        </p>
                        <form
                          className="badge-form-grid badge-form-grid-compact"
                          onSubmit={(event) => void handleSaveLibraryPdf(event)}
                        >
                          <label className="form-wide">
                            <span>Título</span>
                            <input
                              value={libraryPdfForm.title}
                              onChange={(event) =>
                                setLibraryPdfForm((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <label className="form-wide">
                            <span>Archivo PDF, DOC o DOCX</span>
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={(event) => {
                                const file = event.target.files?.[0] ?? null;
                                setLibraryPdfFile(file);
                                if (file && !libraryPdfForm.title.trim()) {
                                  const prettyName = prettifyLibraryFileTitle(
                                    file.name,
                                  );
                                  if (prettyName) {
                                    setLibraryPdfForm((current) => ({
                                      ...current,
                                      title: prettyName,
                                    }));
                                  }
                                }
                              }}
                            />
                            <p className="muted-copy" style={{ marginTop: 8 }}>
                              {libraryPdfFile
                                ? `Seleccionado: ${libraryPdfFile.name}`
                                : libraryPdfForm.fileUrl
                                  ? "Archivo actual cargado"
                                  : "Selecciona un PDF, DOC o DOCX para subirlo al servidor."}
                            </p>
                          </label>
                          <label className="form-wide">
                            <div className="library-toggle-row">
                              <span>Categoría</span>
                              <label className="switch-row compact">
                                <input
                                  type="checkbox"
                                  checked={libraryPdfForm.assignCategory}
                                  onChange={(event) =>
                                    setLibraryPdfForm((current) => ({
                                      ...current,
                                      assignCategory: event.target.checked,
                                      category: event.target.checked
                                        ? current.category
                                        : "",
                                    }))
                                  }
                                />
                                <span>Asignar</span>
                              </label>
                            </div>
                            {libraryPdfForm.assignCategory ? (
                              <>
                                <input
                                  list="library-category-suggestions"
                                  value={libraryPdfForm.category}
                                  onChange={(event) =>
                                    setLibraryPdfForm((current) => ({
                                      ...current,
                                      category: event.target.value,
                                    }))
                                  }
                                  placeholder="Ej. Guías, Tarot, Ritual"
                                />
                                <datalist id="library-category-suggestions">
                                  {libraryCategorySuggestions.map(
                                    (category) => (
                                      <option key={category} value={category} />
                                    ),
                                  )}
                                </datalist>
                              </>
                            ) : (
                              <p className="muted-copy">
                                Se guardará como General.
                              </p>
                            )}
                          </label>
                          <div className="library-link-card form-wide">
                            <div className="library-link-card-head">
                              <div>
                                <span className="course-drawer-kicker">
                                  Relación con curso
                                </span>
                                <strong>Vinculación opcional</strong>
                              </div>
                              <label className="switch-row">
                                <input
                                  type="checkbox"
                                  checked={libraryPdfForm.linkToCourse}
                                  onChange={(event) =>
                                    setLibraryPdfForm((current) => ({
                                      ...current,
                                      linkToCourse: event.target.checked,
                                      courseId: event.target.checked
                                        ? current.courseId
                                        : "",
                                    }))
                                  }
                                />
                                <span>Vincular a un curso</span>
                              </label>
                            </div>
                            <p className="muted-copy">
                              La categoría organiza la app móvil. El vínculo a
                              curso solo agrega contexto editorial.
                            </p>
                            {libraryPdfForm.linkToCourse ? (
                              <select
                                value={libraryPdfForm.courseId}
                                onChange={(event) =>
                                  setLibraryPdfForm((current) => ({
                                    ...current,
                                    courseId: event.target.value,
                                  }))
                                }
                              >
                                <option value="">Selecciona un curso</option>
                                {courses.map((course) => (
                                  <option key={course.id} value={course.id}>
                                    {course.title}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="library-link-preview">
                                <span className="topbar-pill">Sin vínculo</span>
                                <p>
                                  {selectedLibraryCourse
                                    ? `Si activas la vinculación se asociará con ${selectedLibraryCourse.title}.`
                                    : "No estará asociado a ningún curso."}
                                </p>
                              </div>
                            )}
                          </div>
                          <label>
                            <span>Estado</span>
                            <select
                              value={libraryPdfForm.status}
                              onChange={(event) =>
                                setLibraryPdfForm((current) => ({
                                  ...current,
                                  status: event.target.value as
                                    "draft" | "published",
                                }))
                              }
                            >
                              <option value="published">Publicado</option>
                              <option value="draft">Borrador</option>
                            </select>
                          </label>
                          <div className="editor-actions form-wide">
                            <button type="submit" className="primary-button">
                              Guardar PDF
                            </button>
                          </div>
                        </form>
                      </article>

                      <article className="course-subview-card course-subview-list-card">
                        <div className="panel-head">
                          <div>
                            <p className="eyebrow">Lista</p>
                            <h3>{libraryPdfs.length} PDFs</h3>
                          </div>
                        </div>
                        {libraryPdfs.length > 0 ? (
                          <div className="library-list">
                            {libraryPdfs.map((pdf) => (
                              <article
                                key={pdf.id}
                                className="library-list-row"
                              >
                                <div className="library-list-main">
                                  <div className="library-list-title">
                                    <strong>{pdf.title}</strong>
                                    <p>
                                      {pdf.description || "Sin descripción"}
                                    </p>
                                  </div>
                                  <div className="library-list-meta">
                                    <span>{pdf.category}</span>
                                    <span>
                                      {pdf.courseId
                                        ? pdf.courseId
                                        : "Sin vínculo"}
                                    </span>
                                    <span>{pdf.pageCount} páginas</span>
                                    <span className="topbar-pill">
                                      {pdf.status ?? "draft"}
                                    </span>
                                  </div>
                                </div>
                                <div className="library-list-actions">
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => openLibraryPdfEditor(pdf)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `¿Eliminar "${pdf.title}"?`,
                                        )
                                      ) {
                                        void handleLibraryPdfAction(
                                          pdf.id,
                                          "delete",
                                        );
                                      }
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-state">
                            <h3>No hay PDFs todavía.</h3>
                            <p>
                              Sube material de apoyo para que la biblioteca
                              quede ordenada por curso.
                            </p>
                          </div>
                        )}
                      </article>
                    </div>
                  </>
                ) : null}

                {courseDrawerTab === "publication" ? (
                  <section className="course-publication-grid">
                    <article className="course-subview-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Publicación</p>
                          <h3>Estado actual</h3>
                        </div>
                      </div>
                      <div className="metric-card">
                        <span>
                          {selectedCourse?.title ?? "Selecciona un curso"}
                        </span>
                        <strong>{selectedCourse?.status ?? "draft"}</strong>
                        <p>
                          {selectedCourse?.status === "published"
                            ? "Visible para alumnos"
                            : selectedCourse?.status === "archived"
                              ? "Archivado"
                              : "Aún en edición"}
                        </p>
                      </div>
                    </article>
                    <article className="course-subview-card">
                      <div className="panel-head">
                        <div>
                          <p className="eyebrow">Acciones</p>
                          <h3>Control de publicación</h3>
                        </div>
                      </div>
                      <div className="course-publication-actions">
                        <button
                          type="button"
                          className="primary-button button-with-icon"
                          onClick={() => void handlePublishCourse("publish")}
                        >
                          <span className="button-icon" aria-hidden="true">
                            <ActionIcon name="publish" />
                          </span>
                          <span>Publicar</span>
                        </button>
                        <button
                          type="button"
                          className="secondary-button button-with-icon"
                          onClick={() => void handlePublishCourse("unpublish")}
                        >
                          <span className="button-icon" aria-hidden="true">
                            <ActionIcon name="refresh" />
                          </span>
                          <span>Volver a borrador</span>
                        </button>
                        <button
                          type="button"
                          className="danger-button button-with-icon"
                          onClick={() => void handlePublishCourse("archive")}
                        >
                          <span className="button-icon" aria-hidden="true">
                            <ActionIcon name="archive" />
                          </span>
                          <span>Archivar</span>
                        </button>
                      </div>
                    </article>
                  </section>
                ) : null}

                {courseDrawerTab === "history" ? (
                  <section className="course-audit-panel">
                    <div className="panel-head">
                      <div>
                        <p className="eyebrow">Historial</p>
                        <h3>Cambios registrados</h3>
                      </div>
                    </div>

                    {courseAuditError ? (
                      <p className="badge-feedback badge-feedback-error">
                        {courseAuditError}
                      </p>
                    ) : null}

                    {courseAuditEntries.length > 0 ? (
                      <div className="audit-table">
                        <div className="audit-table-head audit-table-row">
                          <span>Fecha</span>
                          <span>Acción</span>
                          <span>Elemento</span>
                          <span>Campo</span>
                          <span>Antes</span>
                          <span>Después</span>
                          <span>Origen</span>
                          <span />
                        </div>
                        {courseAuditEntries.map((entry) => (
                          <article key={entry.id} className="audit-table-row">
                            <span>{formatDate(entry.changedAt)}</span>
                            <span>
                              {getCourseAuditActionLabel(
                                entry.action,
                                entry.fieldChanged,
                              )}
                            </span>
                            <span>{getCourseAuditElementLabel(entry)}</span>
                            <span>
                              {formatAuditFieldLabel(entry.fieldChanged)}
                            </span>
                            <span>
                              {summarizeAuditValue(entry.previousValue)}
                            </span>
                            <span>{summarizeAuditValue(entry.newValue)}</span>
                            <span>{entry.changedBy}</span>
                            <span className="align-right">
                              <button
                                type="button"
                                className="secondary-button audit-detail-button"
                                onClick={() => handleOpenAuditEntry(entry)}
                              >
                                Ver detalle
                              </button>
                            </span>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <h3>No hay cambios registrados todavía.</h3>
                        <p>
                          Los cambios de curso, módulos, lecciones, PDFs y
                          recursos aparecerán aquí.
                        </p>
                      </div>
                    )}
                  </section>
                ) : null}
              </section>
            </div>
          </div>
        </section>
      ) : null}

      {isBadgeEditorOpen ? (
        <div
          className="badge-editor-backdrop"
          onClick={handleCloseBadgeEditor}
          role="presentation"
        >
          <aside
            className="badge-editor-drawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="badge-editor-title"
          >
            <div className="audit-detail-head">
              <div>
                <p className="eyebrow">Editor de insignia</p>
                <h2 id="badge-editor-title">
                  {selectedBadge
                    ? `Editar ${selectedBadge.name}`
                    : "Nueva insignia"}
                </h2>
                <p className="badge-editor-copy">
                  La progresión depende de la ruta y del escalón. La rareza solo
                  cambia la apariencia.
                </p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCloseBadgeEditor}
              >
                Cerrar
              </button>
            </div>

            <div className="editor-mode-switch">
              <button
                type="button"
                className={
                  editorMode === "edit"
                    ? "secondary-button active"
                    : "secondary-button"
                }
                onClick={() => setEditorMode("edit")}
              >
                Editar
              </button>
              <button
                type="button"
                className={
                  editorMode === "preview"
                    ? "secondary-button active"
                    : "secondary-button"
                }
                onClick={() => setEditorMode("preview")}
              >
                Preview
              </button>
              {selectedBadge ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleViewBadgeHistory(selectedBadge)}
                >
                  Ver historial
                </button>
              ) : null}
            </div>

            {occupiedActiveBadge ? (
              <p className="badge-feedback badge-feedback-error">
                El escalón {currentStepIndex} de {currentPathMeta.pathId} ya
                tiene un badge activo:
                {` ${occupiedActiveBadge.name}`}. Puedes guardar la nueva
                insignia en estado inactivo, pero no activa.
              </p>
            ) : null}

            {editorMode === "preview" ? (
              <section className="badge-preview">
                <article
                  className={`badge-preview-card ${previewState.hidden ? "badge-preview-hidden" : ""} ${previewState.accentClass}`}
                >
                  <div className="badge-preview-icon">
                    <BadgePreviewArtwork
                      key={previewState.iconUrl}
                      iconUrl={previewState.iconUrl}
                      fallbackLabel={previewState.iconFallbackLabel}
                      hidden={previewState.hidden}
                    />
                  </div>
                  <div>
                    <p className="badge-preview-state">
                      {previewState.hidden
                        ? "Oculta"
                        : previewState.unlocked
                          ? "Desbloqueada"
                          : "Bloqueada"}
                    </p>
                    <h3>{previewState.displayName}</h3>
                    <p className="badge-preview-copy">
                      {previewState.displayDescription}
                    </p>
                  </div>
                  <div className="badge-pill-row">
                    <span
                      className={`badge-pill badge-pill-rarity badge-pill-${badgeForm.rarity.toLowerCase()}`}
                    >
                      {badgeForm.rarity}
                    </span>
                    <span className="badge-pill badge-pill-type">
                      {badgeForm.type}
                    </span>
                    {badgeForm.isConditionHidden ? (
                      <span className="badge-pill badge-pill-secret">
                        SECRET
                      </span>
                    ) : null}
                  </div>
                </article>
                <div className="badge-preview-meta">
                  <div>
                    <span>Título del escalón</span>
                    <strong>
                      {badgeForm.stepTitle ||
                        getBadgeStepTitle(currentStepIndex)}
                    </strong>
                  </div>
                  <div>
                    <span>Descripción del escalón</span>
                    <strong>
                      {badgeForm.stepDescription || currentPathMeta.description}
                    </strong>
                  </div>
                  <div>
                    <span>Motivo de bloqueo</span>
                    <strong>
                      {badgeForm.lockedReason || "Sin bloqueo definido"}
                    </strong>
                  </div>
                  <div>
                    <span>Siguiente badge</span>
                    <strong>
                      {previewState.nextBadgeName ?? "No hay siguiente escalón"}
                    </strong>
                  </div>
                </div>
              </section>
            ) : null}

            <details className="badge-editor-section" open>
              <summary>Básico</summary>
              <div className="badge-form-grid badge-form-grid-compact">
                <label>
                  <span>Nombre</span>
                  <input
                    value={badgeForm.name}
                    onChange={(event) =>
                      updateBadgeForm("name", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Categoría</span>
                  <select
                    value={badgeForm.category}
                    onChange={(event) =>
                      updateBadgeForm(
                        "category",
                        event.target.value as BadgeCategory,
                      )
                    }
                  >
                    {Object.keys(badgeCategoryLabels).map((category) => (
                      <option key={category} value={category}>
                        {badgeCategoryLabels[category as BadgeCategory]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-wide">
                  <span>Descripción</span>
                  <textarea
                    value={badgeForm.description}
                    onChange={(event) =>
                      updateBadgeForm("description", event.target.value)
                    }
                    rows={3}
                  />
                </label>
                <label>
                  <span>Rareza</span>
                  <select
                    value={badgeForm.rarity}
                    onChange={(event) =>
                      updateBadgeForm(
                        "rarity",
                        event.target.value as BadgeRarity,
                      )
                    }
                  >
                    {["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"].map(
                      (rarity) => (
                        <option key={rarity} value={rarity}>
                          {rarity}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  <span>Tipo</span>
                  <select
                    value={badgeForm.type}
                    onChange={(event) =>
                      updateBadgeForm("type", event.target.value as BadgeType)
                    }
                  >
                    {[
                      "AUTOMATIC",
                      "MANUAL",
                      "SECRET",
                      "TEMPORARY",
                      "EVOLVING",
                    ].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={badgeForm.isActive}
                    onChange={(event) =>
                      updateBadgeForm("isActive", event.target.checked)
                    }
                  />
                  <span>active/enabled</span>
                </label>
              </div>
            </details>

            <details className="badge-editor-section">
              <summary>Progreso</summary>
              <div className="badge-form-grid badge-form-grid-compact">
                <label>
                  <span>pathId</span>
                  <select
                    value={badgeForm.pathId}
                    onChange={(event) =>
                      setBadgeForm((current) =>
                        selectedBadgeId == null
                          ? reseedBadgeDraft(
                              current,
                              event.target.value as BadgePathId,
                              Number.parseInt(current.stepIndex, 10) || 1,
                              badges,
                            )
                          : {
                              ...current,
                              pathId: event.target.value as BadgePathId,
                            },
                      )
                    }
                  >
                    {badgePathMeta.map((path) => (
                      <option key={path.pathId} value={path.pathId}>
                        {path.pathId}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>pathOrder</span>
                  <input
                    type="number"
                    value={badgeForm.pathOrder}
                    onChange={(event) =>
                      updateBadgeForm("pathOrder", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>stepIndex</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={badgeForm.stepIndex}
                    onChange={(event) =>
                      setBadgeForm((current) =>
                        selectedBadgeId == null
                          ? reseedBadgeDraft(
                              current,
                              current.pathId,
                              Number.parseInt(event.target.value, 10) || 1,
                              badges,
                            )
                          : {
                              ...current,
                              stepIndex: event.target.value,
                            },
                      )
                    }
                  />
                </label>
                <label>
                  <span>stepTitle</span>
                  <input
                    value={badgeForm.stepTitle}
                    onChange={(event) =>
                      updateBadgeForm("stepTitle", event.target.value)
                    }
                  />
                </label>
                <label className="form-wide">
                  <span>stepDescription</span>
                  <textarea
                    value={badgeForm.stepDescription}
                    onChange={(event) =>
                      updateBadgeForm("stepDescription", event.target.value)
                    }
                    rows={2}
                  />
                </label>
                <label className="form-wide">
                  <span>prerequisiteBadgeIds</span>
                  <textarea
                    value={badgeForm.prerequisiteBadgeIds}
                    onChange={(event) =>
                      updateBadgeForm(
                        "prerequisiteBadgeIds",
                        event.target.value,
                      )
                    }
                    rows={2}
                    placeholder="badge-a, badge-b"
                  />
                </label>
                <label className="form-wide">
                  <span>lockedReason</span>
                  <textarea
                    value={badgeForm.lockedReason}
                    onChange={(event) =>
                      updateBadgeForm("lockedReason", event.target.value)
                    }
                    rows={2}
                  />
                </label>
              </div>
            </details>

            <details className="badge-editor-section">
              <summary>Regla</summary>
              <div className="rule-editor">
                <div className="rule-editor-head">
                  <h3>Reglas</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setBadgeForm((current) => ({
                        ...current,
                        rules: [...current.rules, createRuleDraft()],
                      }))
                    }
                  >
                    Agregar regla
                  </button>
                </div>
                <div className="rule-list">
                  {badgeForm.rules.map((rule, index) => (
                    <div key={rule.id} className="rule-row">
                      <span className="rule-index">{index + 1}</span>
                      <input
                        value={rule.ruleKey}
                        onChange={(event) =>
                          setBadgeForm((current) => ({
                            ...current,
                            rules: current.rules.map((item) =>
                              item.id === rule.id
                                ? { ...item, ruleKey: event.target.value }
                                : item,
                            ),
                          }))
                        }
                        placeholder="metric_key"
                      />
                      <select
                        value={rule.operator}
                        onChange={(event) =>
                          setBadgeForm((current) => ({
                            ...current,
                            rules: current.rules.map((item) =>
                              item.id === rule.id
                                ? {
                                    ...item,
                                    operator: event.target
                                      .value as BadgeRuleOperator,
                                  }
                                : item,
                            ),
                          }))
                        }
                      >
                        {["GTE", "GT", "EQ", "LTE", "LT"].map((operator) => (
                          <option key={operator} value={operator}>
                            {operator}
                          </option>
                        ))}
                      </select>
                      <input
                        value={rule.value}
                        onChange={(event) =>
                          setBadgeForm((current) => ({
                            ...current,
                            rules: current.rules.map((item) =>
                              item.id === rule.id
                                ? { ...item, value: event.target.value }
                                : item,
                            ),
                          }))
                        }
                        placeholder="1"
                      />
                      <label className="switch-row compact">
                        <input
                          type="checkbox"
                          checked={rule.isActive}
                          onChange={(event) =>
                            setBadgeForm((current) => ({
                              ...current,
                              rules: current.rules.map((item) =>
                                item.id === rule.id
                                  ? { ...item, isActive: event.target.checked }
                                  : item,
                              ),
                            }))
                          }
                        />
                        <span>activa</span>
                      </label>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() =>
                          setBadgeForm((current) => ({
                            ...current,
                            rules: current.rules.filter(
                              (item) => item.id !== rule.id,
                            ),
                          }))
                        }
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </details>

            <details className="badge-editor-section">
              <summary>Icono</summary>
              <div className="badge-form-grid badge-form-grid-compact">
                <label className="form-wide">
                  <span>iconUrl</span>
                  <input
                    value={badgeForm.iconUrl}
                    onChange={(event) =>
                      updateBadgeForm("iconUrl", event.target.value)
                    }
                    placeholder="/assets/badges/..."
                  />
                </label>
                <div className="badge-preview-meta form-wide">
                  <div>
                    <span>Vista previa</span>
                    <strong>
                      {previewState.hidden ? "Ícono oculto" : "Ícono visible"}
                    </strong>
                  </div>
                  <div>
                    <span>Fallback</span>
                    <strong>{previewState.iconFallbackLabel}</strong>
                  </div>
                </div>
              </div>
            </details>

            <details className="badge-editor-section">
              <summary>Avanzado</summary>
              <div className="badge-form-grid badge-form-grid-compact">
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={badgeForm.isPathVisible}
                    onChange={(event) =>
                      updateBadgeForm("isPathVisible", event.target.checked)
                    }
                  />
                  <span>isPathVisible</span>
                </label>
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={badgeForm.isConditionHidden}
                    onChange={(event) =>
                      updateBadgeForm("isConditionHidden", event.target.checked)
                    }
                  />
                  <span>isConditionHidden</span>
                </label>
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={badgeForm.isSecret}
                    onChange={(event) =>
                      updateBadgeForm("isSecret", event.target.checked)
                    }
                  />
                  <span>isSecret</span>
                </label>
                {selectedBadge ? (
                  <div className="editor-actions form-wide">
                    <button
                      type="button"
                      onClick={() => void moveBadge(selectedBadge, -1)}
                      disabled={selectedBadge.stepIndex <= 1}
                    >
                      Subir escalón
                    </button>
                    <button
                      type="button"
                      onClick={() => void moveBadge(selectedBadge, 1)}
                      disabled={selectedBadge.stepIndex >= 5}
                    >
                      Bajar escalón
                    </button>
                  </div>
                ) : null}
              </div>
            </details>

            <div className="badge-editor-summary">
              <div>
                <span>Prerrequisitos</span>
                <strong>
                  {badgeForm.prerequisiteBadgeIds
                    ? parseCommaList(badgeForm.prerequisiteBadgeIds).length
                    : 0}
                </strong>
              </div>
              <div>
                <span>Ruta</span>
                <strong>{badgeForm.pathId}</strong>
              </div>
              <div>
                <span>Escalón</span>
                <strong>{badgeForm.stepIndex}</strong>
              </div>
              <div>
                <span>Ocupación</span>
                <strong>{occupiedActiveBadge ? "ocupado" : "libre"}</strong>
              </div>
            </div>

            <div className="editor-actions">
              <button
                type="button"
                className="primary-button"
                disabled={
                  savingBadgeId === (selectedBadgeId ?? "new") ||
                  saveBlockedByActiveConflict
                }
                onClick={() => void persistBadge()}
              >
                {saveBlockedByActiveConflict
                  ? "Escalón ocupado"
                  : savingBadgeId === (selectedBadgeId ?? "new")
                    ? "Guardando..."
                    : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={() => handleCreateBadge(badgeForm.pathId)}
              >
                Limpiar editor
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {selectedAuditEntry ? (
        <div
          className="audit-detail-backdrop"
          onClick={handleCloseAuditEntry}
          role="presentation"
        >
          <aside
            className="audit-detail-drawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-detail-title"
          >
            <div className="audit-detail-head">
              <div>
                <p className="eyebrow">Detalle de auditoría</p>
                <h2 id="audit-detail-title">
                  {selectedAuditEntry.courseName ??
                    selectedAuditEntry.badgeName ??
                    selectedAuditEntry.badgeId ??
                    selectedAuditEntry.entityId ??
                    "Detalle"}
                </h2>
                <p className="audit-detail-copy">
                  {selectedAuditEntry.courseId
                    ? getCourseAuditActionLabel(
                        selectedAuditEntry.action,
                        selectedAuditEntry.fieldChanged,
                      )
                    : selectedAuditEntry.action}
                  {" · "}
                  {selectedAuditEntry.fieldChanged} ·{" "}
                  {formatDate(selectedAuditEntry.changedAt)}
                </p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCloseAuditEntry}
              >
                Cerrar
              </button>
            </div>

            <div className="audit-detail-meta">
              <div>
                <span>
                  {selectedAuditEntry.courseId ? "courseId" : "badgeId"}
                </span>
                <strong>
                  {selectedAuditEntry.courseId ??
                    selectedAuditEntry.badgeId ??
                    "—"}
                </strong>
              </div>
              <div>
                <span>{selectedAuditEntry.courseId ? "Curso" : "Badge"}</span>
                <strong>
                  {selectedAuditEntry.courseName ??
                    selectedAuditEntry.badgeName ??
                    selectedAuditEntry.elementLabel ??
                    "Sin nombre"}
                </strong>
              </div>
              <div>
                <span>{selectedAuditEntry.courseId ? "Elemento" : "Ruta"}</span>
                <strong>
                  {selectedAuditEntry.courseId
                    ? (selectedAuditEntry.elementLabel ??
                      selectedAuditEntry.entityType ??
                      "Curso")
                    : (selectedAuditEntry.pathId ?? "sin ruta")}
                </strong>
              </div>
              <div>
                <span>Acción</span>
                <strong>
                  {selectedAuditEntry.courseId
                    ? getCourseAuditActionLabel(
                        selectedAuditEntry.action,
                        selectedAuditEntry.fieldChanged,
                      )
                    : selectedAuditEntry.action}
                </strong>
              </div>
              <div>
                <span>Campo</span>
                <strong>{selectedAuditEntry.fieldChanged}</strong>
              </div>
              <div>
                <span>Usuario/admin</span>
                <strong>{selectedAuditEntry.changedBy}</strong>
              </div>
              <div>
                <span>Source</span>
                <strong>{selectedAuditEntry.source}</strong>
              </div>
              {selectedAuditEntry.entityType ? (
                <div>
                  <span>Entidad</span>
                  <strong>{selectedAuditEntry.entityType}</strong>
                </div>
              ) : null}
              <div>
                <span>Fecha</span>
                <strong>{formatDate(selectedAuditEntry.changedAt)}</strong>
              </div>
            </div>

            {selectedAuditNeedsComparison ? (
              <section className="audit-detail-comparison">
                <div className="audit-detail-section-head">
                  <h3>
                    {getAuditChangeLabel(selectedAuditEntry.fieldChanged)}
                  </h3>
                  {selectedAuditPath ? (
                    <span>{selectedAuditPath.title}</span>
                  ) : null}
                </div>
                <div className="audit-detail-grid">
                  <article>
                    <span>Antes</span>
                    <pre>{selectedAuditPreviousValue}</pre>
                  </article>
                  <article>
                    <span>Después</span>
                    <pre>{selectedAuditNewValue}</pre>
                  </article>
                </div>
              </section>
            ) : null}

            <section className="audit-detail-section">
              <div className="audit-detail-section-head">
                <h3>Valor anterior</h3>
                {isAuditStructuredValue(selectedAuditEntry.previousValue) ? (
                  <span>JSON formateado</span>
                ) : null}
              </div>
              <pre className="audit-detail-code">
                {selectedAuditPreviousValue}
              </pre>
            </section>

            <section className="audit-detail-section">
              <div className="audit-detail-section-head">
                <h3>Valor nuevo</h3>
                {isAuditStructuredValue(selectedAuditEntry.newValue) ? (
                  <span>JSON formateado</span>
                ) : null}
              </div>
              <pre className="audit-detail-code">{selectedAuditNewValue}</pre>
            </section>
          </aside>
        </div>
      ) : null}

      {orderChatOrder ? (
        <div
          className="audit-detail-backdrop"
          onClick={() => {
            setOrderChatOrder(null);
            setOrderChat(null);
            setOrderChatError(null);
            setOrderChatReply("");
            resetOrderChatAttachment();
          }}
          role="presentation"
        >
          <aside
            className="audit-detail-drawer order-chat-drawer"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-chat-title"
          >
            <div className="audit-detail-head">
              <div>
                <p className="eyebrow">Chat de orden</p>
                <h2 id="order-chat-title">{orderChatOrder.orderCode}</h2>
                <p className="audit-detail-copy">
                  {orderChatOrder.userName ?? orderChatOrder.userId} ·{" "}
                  {formatOrderStatusLabel(orderChatOrder.status)}
                </p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setOrderChatOrder(null);
                  setOrderChat(null);
                  setOrderChatError(null);
                  setOrderChatReply("");
                  resetOrderChatAttachment();
                }}
              >
                Cerrar
              </button>
            </div>

            <div className="order-chat-summary">
              <div>
                <span>Entrega</span>
                <strong>
                  {orderChatOrder.deliveryAddress || "Pendiente de confirmar"}
                </strong>
              </div>
              <div>
                <span>Total</span>
                <strong>
                  {formatMoney(
                    orderChatOrder.total.amount,
                    orderChatOrder.total.currency || "USD",
                  )}
                </strong>
              </div>
              <div>
                <span>Especialista</span>
                <strong>{orderChatOrder.specialistName}</strong>
              </div>
            </div>

            {orderChatLoading ? (
              <p className="muted-copy">Cargando conversación...</p>
            ) : null}
            {orderChatError ? (
              <p className="form-error">{orderChatError}</p>
            ) : null}

            <div className="chat-message-feed order-chat-feed">
              {orderChat?.messages.length ? (
                orderChat.messages.map((message) => (
                  <article
                    key={message.id}
                    className={`chat-message-card${
                      message.authorType === "user"
                        ? " chat-message-card-member"
                        : " chat-message-card-guide"
                    }`}
                  >
                    <div className="chat-message-head">
                      <div className="chat-message-author">
                        <div className="chat-message-avatar" aria-hidden="true">
                          <span>
                            {message.authorType === "user"
                              ? getNameInitials(
                                  orderChatOrder.userName ?? "Cliente",
                                )
                              : "LR"}
                          </span>
                        </div>
                        <div className="chat-message-author-meta">
                          <div className="chat-message-author-line">
                            <strong>
                              {message.authorType === "user"
                                ? (orderChatOrder.userName ?? "Cliente")
                                : message.authorType === "system"
                                  ? "Sistema"
                                  : "Especialista"}
                            </strong>
                          </div>
                          <span>{formatDate(message.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    {message.imageUrl ? (
                      <a
                        href={resolveMediaUrl(message.imageUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="chat-message-image-link"
                      >
                        <img
                          src={resolveMediaUrl(message.imageUrl)}
                          alt={message.body || "Adjunto del mensaje"}
                        />
                      </a>
                    ) : null}
                    {message.body ? <p>{message.body}</p> : null}
                  </article>
                ))
              ) : (
                <div className="empty-state order-chat-empty">
                  <h3>Sin mensajes todavía.</h3>
                  <p>
                    Escribe el primer mensaje para coordinar pago y entrega con
                    el cliente.
                  </p>
                </div>
              )}
            </div>

            <form
              className="chat-compose order-chat-compose"
              onSubmit={handleSendOrderChatReply}
            >
              <textarea
                className="chat-compose-textarea"
                value={orderChatReply}
                onChange={(event) => setOrderChatReply(event.target.value)}
                placeholder="Escribe detalles de pago, entrega o recojo"
                rows={4}
              />
              <input
                ref={orderChatReplyImageInputRef}
                className="admin-uploader-input"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  void handleOrderChatImageChange(
                    event.target.files?.[0] ?? null,
                  )
                }
              />
              {orderChatReplyImageName || orderChatReplyImageUrl ? (
                <div className="chat-compose-attachment">
                  {orderChatReplyImageUrl ? (
                    <img
                      src={resolveMediaUrl(orderChatReplyImageUrl)}
                      alt="Adjunto del chat de orden"
                    />
                  ) : (
                    <div className="chat-compose-attachment-placeholder">
                      <strong>{orderChatReplyImageName}</strong>
                      <span>
                        Subiendo imagen: {orderChatReplyImageProgress}%
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={resetOrderChatAttachment}
                  >
                    Quitar
                  </button>
                </div>
              ) : null}
              {orderChatReplyImageUploading ? (
                <div className="library-upload-progress" aria-live="polite">
                  <div
                    className="library-upload-progress-bar"
                    aria-hidden="true"
                  >
                    <span
                      className="library-upload-progress-fill"
                      style={{ width: `${orderChatReplyImageProgress}%` }}
                    />
                  </div>
                </div>
              ) : null}
              {orderChatReplyImageError ? (
                <p className="form-error">{orderChatReplyImageError}</p>
              ) : null}
              <div className="chat-compose-actions">
                <span className="muted-copy">
                  El cliente verá este mensaje como aviso dentro de su pedido.
                </span>
                <button
                  type="button"
                  className="secondary-button button-with-icon"
                  onClick={() => orderChatReplyImageInputRef.current?.click()}
                  disabled={orderChatReplyImageUploading}
                >
                  <span className="button-icon" aria-hidden="true">
                    <ActionIcon name="upload" />
                  </span>
                  Imagen
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    sendingOrderChatReply ||
                    orderChatReplyImageUploading ||
                    (orderChatReply.trim().length === 0 &&
                      orderChatReplyImageUrl.trim().length === 0)
                  }
                >
                  {sendingOrderChatReply ? "Enviando..." : "Enviar mensaje"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {developerAccessModalOpen ? (
        <div
          className="developer-access-backdrop"
          onClick={() => setDeveloperAccessModalOpen(false)}
          role="presentation"
        >
          <section
            className="auth-card developer-access-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="developer-access-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-head badge-panel-head">
              <div>
                <p className="eyebrow">Admin desarrollador</p>
                <h2 id="developer-access-title">Acceso protegido</h2>
                <p className="hero-copy">
                  Ingresa la contraseña para abrir las herramientas técnicas.
                </p>
              </div>
            </div>
            <form
              className="auth-entry-card"
              onSubmit={(event) => void handleDeveloperPasscodeSubmit(event)}
            >
              <label>
                <span>Contraseña</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  value={developerPasscode}
                  onChange={(event) =>
                    setDeveloperPasscode(
                      event.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                  placeholder="1111"
                  autoComplete="current-password"
                  autoFocus
                />
              </label>
              <div className="editor-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setDeveloperAccessModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-button">
                  Entrar
                </button>
              </div>
              {developerPasscodeError ? (
                <p className="badge-feedback badge-feedback-error">
                  {developerPasscodeError}
                </p>
              ) : null}
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export default App;
