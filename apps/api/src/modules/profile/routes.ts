import type { FastifyInstance } from "fastify";

import {
  getUserBadgeProfile,
  recordBadgeAction,
  evaluateUserBadges,
  type TrackBadgeActionInput,
} from "../../data/badge-store.js";
import {
  getProfile,
  type UpdateUserProfileInput,
  updateCurrentUser,
} from "../../data/persistent-store.js";
import { requireAuthenticatedUser } from "../shared/access.js";

export async function registerProfileRoutes(app: FastifyInstance) {
  app.get("/me", async (request, reply) => {
    const userId = await requireAuthenticatedUser(request, reply);
    if (!userId) {
      return {
        error: "Inicia sesión para ver tu perfil.",
      };
    }

    return {
      item: await getProfile(userId),
    };
  });

  app.patch<{ Body: UpdateUserProfileInput }>("/me", async (request, reply) => {
    const userId = await requireAuthenticatedUser(request, reply);
    if (!userId) {
      return {
        error: "Inicia sesión para actualizar tu perfil.",
      };
    }

    try {
      const item = await updateCurrentUser(request.body ?? {}, userId);
      reply.code(200);

      return {
        item,
      };
    } catch (error) {
      reply.code(400);

      return {
        error:
          error instanceof Error ? error.message : "No se pudo actualizar el perfil.",
      };
    }
  });

  app.get("/badges", async (request, reply) => {
    const userId = await requireAuthenticatedUser(request, reply);
    if (!userId) {
      return {
        error: "Inicia sesión para ver tus insignias.",
      };
    }

    return {
      item: await getUserBadgeProfile(userId),
    };
  });

  app.post<{ Body: TrackBadgeActionInput }>(
    "/badges/track",
    async (request, reply) => {
      const userId = await requireAuthenticatedUser(request, reply);
      if (!userId) {
        return {
          error: "Inicia sesión para registrar progreso de insignias.",
        };
      }

      try {
        reply.code(200);
        return {
          item: await recordBadgeAction(userId, request.body ?? {}),
        };
      } catch (error) {
        reply.code(400);
        return {
          error:
            error instanceof Error
              ? error.message
              : "No se pudo registrar el progreso de insignias.",
        };
      }
    },
  );

  app.post("/badges/evaluate", async (request, reply) => {
    const userId = await requireAuthenticatedUser(request, reply);
    if (!userId) {
      return {
        error: "Inicia sesión para evaluar tus insignias.",
      };
    }

    try {
      const unlocked = await evaluateUserBadges(userId);
      return {
        unlocked,
        item: await getUserBadgeProfile(userId),
      };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo evaluar las insignias del usuario.",
      };
    }
  });
}
