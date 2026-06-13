import type { FastifyInstance } from "fastify";

import {
  createAdminUser,
  getAdminChatOverview,
  getAdminDashboardSummary,
  getAdminRecentBookings,
  getAdminRecentUsers,
  updateAdminUser,
} from "../../data/admin-store.js";
import { requireAdminSession } from "../shared/admin-auth.js";

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get("/summary", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return {
        error:
          reply.statusCode === 403
            ? "No tienes permisos de admin."
            : "Falta la sesión de admin.",
      };
    }

    return {
      item: await getAdminDashboardSummary(),
    };
  });

  app.get<{ Querystring: { limit?: string } }>("/bookings", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return {
        error:
          reply.statusCode === 403
            ? "No tienes permisos de admin."
            : "Falta la sesión de admin.",
      };
    }

    return {
      items: await getAdminRecentBookings(Number(request.query.limit ?? "10")),
    };
  });

  app.get<{
    Querystring: { limit?: string; role?: "client" | "admin" | "specialist"; search?: string };
  }>("/users", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return {
        error:
          reply.statusCode === 403
            ? "No tienes permisos de admin."
            : "Falta la sesión de admin.",
      };
    }

    return {
      items: await getAdminRecentUsers(Number(request.query.limit ?? "10"), {
        role: request.query.role,
        search: request.query.search,
      }),
    };
  });

  app.post<{ Body: Parameters<typeof createAdminUser>[0] }>("/users", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return {
        error:
          reply.statusCode === 403
            ? "No tienes permisos de admin."
            : "Falta la sesión de admin.",
      };
    }

    try {
      const item = await createAdminUser(request.body ?? {});
      reply.code(201);
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error: error instanceof Error ? error.message : "No se pudo crear el usuario.",
      };
    }
  });

  app.patch<{ Params: { userId: string }; Body: Parameters<typeof updateAdminUser>[1] }>(
    "/users/:userId",
    async (request, reply) => {
      const admin = await requireAdminSession(request, reply);
      if (!admin) {
        return {
          error:
            reply.statusCode === 403
              ? "No tienes permisos de admin."
              : "Falta la sesión de admin.",
        };
      }

      try {
        return {
          item: await updateAdminUser(request.params.userId, request.body ?? {}),
        };
      } catch (error) {
        reply.code(400);
        return {
          error: error instanceof Error ? error.message : "No se pudo actualizar el usuario.",
        };
      }
    },
  );

  app.get<{ Querystring: { limit?: string } }>("/chat", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return {
        error:
          reply.statusCode === 403
            ? "No tienes permisos de admin."
            : "Falta la sesión de admin.",
      };
    }

    return {
      item: await getAdminChatOverview(Number(request.query.limit ?? "10")),
    };
  });
}
