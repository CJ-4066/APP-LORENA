import type { FastifyInstance } from "fastify";

import {
  createSupportTicket,
  createSupportTicketMessage,
  getSupportTicket,
  listSupportTickets,
  type CreateSupportMessageInput,
  type CreateSupportTicketInput,
} from "../../data/support-store.js";
import { getProfile } from "../../data/persistent-store.js";
import { emitContentChanged } from "../content/content-events.js";
import { requireAuthenticatedUser } from "../shared/access.js";

function buildProfileName(profile: Awaited<ReturnType<typeof getProfile>>): string {
  const fullName = [profile.firstName, profile.lastName]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" ");
  return fullName || profile.nickname || profile.email || profile.id;
}

export async function registerSupportRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { limit?: string } }>("/tickets", async (request, reply) => {
    const userId = await requireAuthenticatedUser(request, reply);
    if (!userId) {
      return {
        error: "Inicia sesión para abrir soporte.",
      };
    }

    return {
      items: await listSupportTickets({
        userId,
        limit: Number(request.query.limit ?? "20"),
      }),
    };
  });

  app.post<{ Body: CreateSupportTicketInput }>("/tickets", async (request, reply) => {
    const userId = await requireAuthenticatedUser(request, reply);
    if (!userId) {
      return {
        error: "Inicia sesión para crear un ticket de soporte.",
      };
    }

    try {
      reply.code(201);
      const item = await createSupportTicket(request.body ?? {}, userId);
      emitContentChanged({
        entity: "support",
        action: "created",
        entityId: item.ticket.id,
        actor: userId,
      });
      return {
        item,
      };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear el ticket de soporte.",
      };
    }
  });

  app.get<{ Params: { ticketId: string } }>("/tickets/:ticketId", async (request, reply) => {
    const userId = await requireAuthenticatedUser(request, reply);
    if (!userId) {
      return {
        error: "Inicia sesión para ver soporte.",
      };
    }

    try {
      return {
        item: await getSupportTicket(request.params.ticketId, userId),
      };
    } catch (error) {
      reply.code(404);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el ticket de soporte.",
      };
    }
  });

  app.post<{
    Params: { ticketId: string };
    Body: CreateSupportMessageInput;
  }>("/tickets/:ticketId/messages", async (request, reply) => {
    const userId = await requireAuthenticatedUser(request, reply);
    if (!userId) {
      return {
        error: "Inicia sesión para responder soporte.",
      };
    }

    try {
      const profile = await getProfile(userId);
      reply.code(201);
      const item = await createSupportTicketMessage(
        request.params.ticketId,
        request.body ?? {},
        {
          type: "user",
          id: userId,
          name: buildProfileName(profile),
          userIdScope: userId,
        },
      );
      emitContentChanged({
        entity: "support",
        action: "created",
        entityId: item.ticket.id,
        actor: userId,
      });
      return {
        item,
      };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo responder el ticket de soporte.",
      };
    }
  });
}
