import type { FastifyInstance } from "fastify";

import {
  deletePushDevice,
  getPushEngagementTemplates,
  getPushDevices,
  recordPushEngagementInvitation,
  registerPushDevice,
  type RegisterPushDeviceInput,
} from "../../data/push-store.js";
import { requireAuthenticatedUser } from "../shared/access.js";

export async function registerPushRoutes(app: FastifyInstance) {
  app.get("/engagement/templates", async (request, reply) => {
    const userId = await requireAuthenticatedUser(request, reply);
    if (!userId) {
      return {
        error: "Inicia sesión para consultar las notificaciones.",
      };
    }

    return {
      items: await getPushEngagementTemplates(userId),
    };
  });

  app.post<{ Body: { templateId?: string } }>(
    "/engagement/queue",
    async (request, reply) => {
      const userId = await requireAuthenticatedUser(request, reply);
      if (!userId) {
        return {
          error: "Inicia sesión para programar la notificación.",
        };
      }

      try {
        reply.code(201);
        return {
          item: await recordPushEngagementInvitation(
            request.body?.templateId ?? "",
            userId,
          ),
        };
      } catch (error) {
        reply.code(400);
        return {
          error:
            error instanceof Error
              ? error.message
              : "No se pudo programar la notificación.",
        };
      }
    },
  );

  app.get("/devices", async (request, reply) => {
    const userId = await requireAuthenticatedUser(request, reply);
    if (!userId) {
      return {
        error: "Inicia sesión para administrar tus dispositivos.",
      };
    }

    return {
      items: await getPushDevices(userId),
    };
  });

  app.post<{ Body: RegisterPushDeviceInput }>("/devices", async (request, reply) => {
    const userId = await requireAuthenticatedUser(request, reply);
    if (!userId) {
      return {
        error: "Inicia sesión para registrar un dispositivo.",
      };
    }

    try {
      reply.code(201);
      return {
        item: await registerPushDevice(request.body ?? {}, userId),
      };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo registrar el dispositivo.",
      };
    }
  });

  app.delete<{ Params: { deviceId: string } }>("/devices/:deviceId", async (request, reply) => {
    const userId = await requireAuthenticatedUser(request, reply);
    if (!userId) {
      return {
        error: "Inicia sesión para eliminar el dispositivo.",
      };
    }

    try {
      await deletePushDevice(request.params.deviceId, userId);
      reply.code(204);
      return null;
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el dispositivo.",
      };
    }
  });

  app.get("/notifications", async (request, reply) => {
    const userId = await requireAuthenticatedUser(request, reply);
    if (!userId) {
      return {
        error: "Inicia sesión para ver tus notificaciones.",
      };
    }

    const { getUserNotifications } = await import("../../data/notification-store.js");
    return {
      items: await getUserNotifications(userId),
    };
  });

  app.post<{ Params: { id: string } }>("/notifications/:id/read", async (request, reply) => {
    const userId = await requireAuthenticatedUser(request, reply);
    if (!userId) {
      return {
        error: "Inicia sesión para actualizar la notificación.",
      };
    }

    const { markNotificationAsRead } = await import("../../data/notification-store.js");
    await markNotificationAsRead(userId, request.params.id);
    return {
      success: true,
    };
  });
}
