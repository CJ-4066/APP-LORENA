import type { FastifyInstance } from "fastify";

import {
  createMediaAsset,
  deleteMediaAsset,
  getMediaAsset,
  listMediaAssets,
  type MediaAssetCategory,
} from "../../../data/media-store.js";
import { requireAdminSession } from "../../shared/admin-auth.js";

function getAdminError(replyCode: number, hasPermission: boolean): string {
  if (replyCode === 403) {
    return "No tienes permisos de admin.";
  }

  return hasPermission ? "No se pudo completar la acción." : "Falta la sesión de admin.";
}

function normalizeCategory(value?: string, entityType?: string | null): MediaAssetCategory {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized === "product" || normalized === "course" || normalized === "library" || normalized === "lesson" || normalized === "general") {
    return normalized;
  }

  if (entityType?.trim().length) {
    const entity = entityType.trim().toLowerCase();
    if (entity.includes("product")) {
      return "product";
    }
    if (entity.includes("course")) {
      return "course";
    }
    if (entity.includes("lesson")) {
      return "lesson";
    }
    if (entity.includes("library") || entity.includes("pdf")) {
      return "library";
    }
  }

  return "general";
}

export async function registerAdminUploadRoutes(app: FastifyInstance) {
  app.post("/uploads", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    let filePart: {
      filename: string;
      mimetype: string;
      bytes: Buffer;
    } | null = null;
    const fields: Record<string, string> = {};

    for await (const part of request.parts()) {
      if (part.type === "file") {
        filePart = {
          filename: part.filename,
          mimetype: part.mimetype,
          bytes: await part.toBuffer(),
        };
      } else {
        fields[part.fieldname] = String(part.value ?? "");
      }
    }

    if (!filePart) {
      reply.code(400);
      return { error: "Selecciona un archivo." };
    }

    try {
      const bytes = filePart.bytes;
      const item = await createMediaAsset(
        {
          originalName: filePart.filename,
          mimeType: filePart.mimetype,
          sizeBytes: bytes.byteLength,
          category: normalizeCategory(fields.category, fields.entityType),
          entityType: fields.entityType?.trim() || null,
          entityId: fields.entityId?.trim() || null,
          uploadedBy: admin.name || admin.email || admin.id,
        },
        bytes,
      );

      reply.code(201);
      return {
        item,
      };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo subir el archivo.",
      };
    }
  });

  app.get("/uploads", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const query = request.query as {
      category?: string;
      entityType?: string;
      entityId?: string;
      includeInactive?: string;
    };

    return {
      items: await listMediaAssets({
        category: query.category as MediaAssetCategory | undefined,
        entityType: query.entityType,
        entityId: query.entityId,
        includeInactive: query.includeInactive === "true",
      }),
    };
  });

  app.get<{ Params: { fileId: string } }>("/uploads/:fileId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const item = await getMediaAsset(request.params.fileId);
    if (!item) {
      reply.code(404);
      return { error: "El archivo no existe." };
    }

    return { item };
  });

  app.delete<{ Params: { fileId: string } }>("/uploads/:fileId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await deleteMediaAsset(request.params.fileId);
      return { item };
    } catch (error) {
      reply.code(404);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo eliminar el archivo.",
      };
    }
  });
}
