import type { FastifyInstance } from "fastify";

import {
  awardManualBadge,
  createBadge,
  evaluateUserBadges,
  getAllBadges,
  getBadgeById,
  getUserBadgeProfile,
  getUserBadges,
  type CreateBadgeInput,
  type ManualBadgeAwardInput,
} from "../../data/badge-store.js";
import { requireRole } from "../shared/access.js";

export async function registerBadgeRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return {
      items: await getAllBadges(),
    };
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
    const adminId = await requireRole(request, reply, "admin");
    if (!adminId) {
      return {
        error: "Necesitas permisos de admin para crear insignias.",
      };
    }

    try {
      reply.code(201);
      return {
        item: await createBadge(request.body ?? {}),
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

  app.get<{ Params: { userId: string } }>("/users/:userId", async (request, reply) => {
    const adminId = await requireRole(request, reply, "admin");
    if (!adminId) {
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
      const adminId = await requireRole(request, reply, "admin");
      if (!adminId) {
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
      const adminId = await requireRole(request, reply, "admin");
      if (!adminId) {
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
    const adminId = await requireRole(request, reply, "admin");
    if (!adminId) {
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
          adminId,
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
