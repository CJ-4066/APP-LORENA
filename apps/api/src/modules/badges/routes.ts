import type { FastifyInstance } from "fastify";

import {
  awardManualBadge,
  createBadge,
  evaluateUserBadges,
  getBadgeAuditLog,
  getBadgeDiagnostics,
  getAllBadges,
  getBadgeById,
  getUserBadgeProfile,
  getUserBadges,
  updateBadge,
  type CreateBadgeInput,
  type ManualBadgeAwardInput,
  type UpdateBadgeInput,
} from "../../data/badge-store.js";
import { requireAdminSession } from "../shared/admin-auth.js";

function getAdminActorLabel(admin: { id: string; email: string; name: string }): string {
  if (admin.name.trim().length > 0 && admin.email.trim().length > 0) {
    return `${admin.name} <${admin.email}>`;
  }

  return admin.name.trim().length > 0 ? admin.name : admin.email || admin.id;
}

export async function registerBadgeRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return {
      items: await getAllBadges(),
    };
  });

  app.get<{
    Querystring: {
      badgeId?: string;
      pathId?: string;
      action?: string;
      fieldChanged?: string;
      date?: string;
    };
  }>("/admin/audit-log", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return {
        error: "Necesitas permisos de admin para revisar el historial.",
      };
    }

    return {
      items: await getBadgeAuditLog({
        badgeId: request.query.badgeId,
        pathId: request.query.pathId as
          | "despertar_path"
          | "tarot_path"
          | "psychology_path"
          | "community_path"
          | "purchase_path"
          | "instructor_path"
          | "award_path"
          | "secret_path"
          | undefined,
        action: request.query.action as
          | "CREATED"
          | "UPDATED"
          | "ACTIVATED"
          | "DEACTIVATED"
          | "REORDERED"
          | undefined,
        fieldChanged: request.query.fieldChanged,
        date: request.query.date,
      }),
    };
  });

  app.get("/admin/diagnostics", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return {
        error: "Necesitas permisos de admin para revisar el diagnóstico.",
      };
    }

    return await getBadgeDiagnostics();
  });

  app.get<{ Params: { badgeId: string } }>("/:badgeId", async (request, reply) => {
    const item = await getBadgeById(request.params.badgeId);
    if (!item) {
      reply.code(404);
      return {
        error: "La insignia no existe.",
      };
    }

    return {
      item,
    };
  });

  app.post<{ Body: CreateBadgeInput }>("/", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return {
        error: "Necesitas permisos de admin para crear insignias.",
      };
    }

    try {
      reply.code(201);
      return {
        item: await createBadge(request.body ?? {}, getAdminActorLabel(admin)),
      };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear la insignia.",
      };
    }
  });

  app.patch<{
    Params: { badgeId: string };
    Body: UpdateBadgeInput;
  }>("/:badgeId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return {
        error: "Necesitas permisos de admin para editar insignias.",
      };
    }

    try {
      const item = await updateBadge(
        request.params.badgeId,
        request.body ?? {},
        getAdminActorLabel(admin),
      );
      return {
        item,
      };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la insignia.",
      };
    }
  });

  app.get<{ Params: { userId: string } }>("/users/:userId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return {
        error: "Necesitas permisos de admin para revisar insignias de usuarios.",
      };
    }

    return {
      items: await getUserBadges(request.params.userId),
    };
  });

  app.get<{ Params: { userId: string } }>(
    "/users/:userId/profile",
    async (request, reply) => {
      const admin = await requireAdminSession(request, reply);
      if (!admin) {
        return {
          error: "Necesitas permisos de admin para revisar el perfil de insignias.",
        };
      }

      return {
        item: await getUserBadgeProfile(request.params.userId),
      };
    },
  );

  app.post<{ Params: { userId: string } }>(
    "/users/:userId/evaluate",
    async (request, reply) => {
      const admin = await requireAdminSession(request, reply);
      if (!admin) {
        return {
          error: "Necesitas permisos de admin para evaluar insignias.",
        };
      }

      try {
        const unlocked = await evaluateUserBadges(request.params.userId);
        return {
          unlocked,
          item: await getUserBadgeProfile(request.params.userId),
        };
      } catch (error) {
        reply.code(400);
        return {
          error:
            error instanceof Error
              ? error.message
              : "No se pudo evaluar el perfil de insignias.",
        };
      }
    },
  );

  app.post<{
    Params: { userId: string; badgeId: string };
    Body: ManualBadgeAwardInput;
  }>("/users/:userId/manual-awards/:badgeId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return {
        error: "Necesitas permisos de admin para otorgar insignias manuales.",
      };
    }

    try {
      reply.code(201);
      return {
        item: await awardManualBadge(
          request.params.userId,
          request.params.badgeId,
          getAdminActorLabel(admin),
          request.body?.reason ?? "",
        ),
        profile: await getUserBadgeProfile(request.params.userId),
      };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo otorgar la insignia manual.",
      };
    }
  });
}
