import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { userHasRole } from "../../data/authz-store.js";
import {
  createCourse,
  createCourseLesson,
  createCourseModule,
  getManagedSpecialistProfileId,
  getProfile,
  upsertCourseResource,
  type AdminAuditMeta,
} from "../../data/persistent-store.js";
import { requireAuthenticatedUser } from "../shared/access.js";

interface CreateCourseFromResourceInput {
  title?: string;
  subtitle?: string;
  category?: string;
  description?: string;
  resourceTitle?: string;
  resourceKind?: string;
  resourceUrl?: string;
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeResourceKind(value: string, resourceUrl: string): string {
  const normalized = value.trim().toLowerCase();
  if (["pdf", "canva", "file", "image", "link"].includes(normalized)) {
    return normalized;
  }

  const url = resourceUrl.toLowerCase();
  if (url.includes("canva.com")) {
    return "canva";
  }
  if (url.endsWith(".pdf") || url.includes("application/pdf")) {
    return "pdf";
  }
  if (/\.(png|jpe?g|webp|svg)(\?|$)/.test(url)) {
    return "image";
  }

  return resourceUrl.startsWith("http://") || resourceUrl.startsWith("https://") ? "link" : "file";
}

async function requireCourseManagerAccess(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<{ userId: string; auditMeta: AdminAuditMeta } | null> {
  const userId = await requireAuthenticatedUser(request, reply);
  if (!userId) {
    return null;
  }

  const isAdmin = await userHasRole(userId, "admin");
  const specialistProfileId = await getManagedSpecialistProfileId(userId);
  if (!isAdmin && !specialistProfileId) {
    reply.code(403);
    return null;
  }

  const profile = await getProfile(userId);
  const changedBy =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() ||
    profile.nickname ||
    profile.email ||
    userId;

  return {
    userId,
    auditMeta: {
      actorType: "admin",
      actorId: userId,
      source: "admin",
      changedBy,
    },
  };
}

export async function registerCourseRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateCourseFromResourceInput }>("/", async (request, reply) => {
    const access = await requireCourseManagerAccess(request, reply);
    if (!access) {
      return {
        error:
          reply.statusCode === 403
            ? "Configura un perfil especialista o ingresa como admin para crear cursos."
            : "Inicia sesión para crear cursos.",
      };
    }

    const title = readText(request.body?.title);
    const description = readText(request.body?.description);
    const resourceUrl = readText(request.body?.resourceUrl);

    if (!title) {
      reply.code(400);
      return { error: "El título del curso es obligatorio." };
    }
    if (!resourceUrl) {
      reply.code(400);
      return { error: "Sube un archivo o pega un enlace para el curso." };
    }

    try {
      const category = readText(request.body?.category) || "General";
      const subtitle =
        readText(request.body?.subtitle) ||
        (description.length > 0 ? description.slice(0, 140) : "Material creado desde la app móvil.");
      const resourceTitle = readText(request.body?.resourceTitle) || title;
      const resourceKind = normalizeResourceKind(
        readText(request.body?.resourceKind),
        resourceUrl,
      );

      const course = await createCourse(
        {
          title,
          subtitle,
          category,
          level: "Inicial",
          premium: false,
          featured: false,
          removable: true,
          estimatedHours: 0,
          progressPercent: 0,
          streakDays: 0,
          hook: "Curso creado desde la app móvil.",
          description: description || subtitle,
          outcomes: [],
          modules: [],
          status: "draft",
          isActive: false,
        },
        access.auditMeta,
      );

      const courseWithModule = await createCourseModule(
        course.id,
        {
          title: "Material principal",
          summary: description || "Archivo principal del curso.",
          durationMinutes: 0,
          order: 1,
          status: "draft",
          isActive: true,
          lessons: [],
        },
        access.auditMeta,
      );
      const createdModule = courseWithModule.modules[0];
      if (!createdModule) {
        throw new Error("No se pudo crear el módulo del curso.");
      }

      const courseWithLesson = await createCourseLesson(
        course.id,
        createdModule.id,
        {
          title: resourceTitle,
          format: resourceKind,
          durationMinutes: 0,
          prompt: "Revisar el material adjunto.",
          content: description,
          resourceUrl,
          order: 1,
          status: "draft",
          isActive: true,
        },
        access.auditMeta,
      );
      const createdLesson =
        courseWithLesson.modules
          .find((module) => module.id === createdModule.id)
          ?.lessons.find((lesson) => lesson.resourceUrl === resourceUrl) ?? null;

      const resource = await upsertCourseResource(
        course.id,
        {
          moduleId: createdModule.id,
          lessonId: createdLesson?.id ?? null,
          title: resourceTitle,
          kind: resourceKind,
          description,
          url: resourceUrl,
          status: "draft",
          isActive: true,
        },
        access.auditMeta,
      );

      reply.code(201);
      return {
        item: courseWithLesson,
        resource,
      };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo crear el curso.",
      };
    }
  });
}
