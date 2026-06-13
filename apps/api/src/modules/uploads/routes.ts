import type { FastifyInstance } from "fastify";

import { getMediaAssetBytes, getMediaAssetByPublicPath } from "../../data/media-store.js";

export async function registerPublicUploadRoutes(app: FastifyInstance) {
  app.get<{ Params: { "*": string } }>("/uploads/*", async (request, reply) => {
    const publicPath = `/uploads/${request.params["*"] ?? ""}`.replace(/\/+/g, "/");
    const asset = await getMediaAssetByPublicPath(publicPath);
    if (!asset) {
      reply.code(404);
      return { error: "El archivo no existe." };
    }

    try {
      const bytes = await getMediaAssetBytes(asset.id);
      reply.header("content-type", asset.mimeType);
      reply.header("cache-control", "public, max-age=86400");
      return Buffer.from(bytes);
    } catch (error) {
      reply.code(404);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo recuperar el archivo.",
      };
    }
  });
}

