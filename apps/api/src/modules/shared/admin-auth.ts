import type { FastifyReply, FastifyRequest } from "fastify";

import { getAdminUserBySessionToken, readAdminSessionToken } from "../../data/admin-auth-store.js";

export async function requireAdminSession(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const sessionToken = readAdminSessionToken(request.headers.cookie);
  if (!sessionToken) {
    reply.code(401);
    return null;
  }

  const admin = await getAdminUserBySessionToken(sessionToken);
  if (!admin) {
    reply.code(401);
    return null;
  }

  if (admin.role !== "admin" || !admin.isActive) {
    reply.code(403);
    return null;
  }

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  };
}
