import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { getMediaAssetBytes, getMediaAssetByPublicPath } from "../../data/media-store.js";

interface ByteRange {
  start: number;
  end: number;
}

function parseByteRange(value: string, size: number): ByteRange | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || size <= 0 || (!match[1] && !match[2])) {
    return null;
  }

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return null;
    }
    return {
      start: Math.max(0, size - suffixLength),
      end: size - 1,
    };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    requestedEnd < start ||
    start >= size
  ) {
    return null;
  }

  return {
    start,
    end: Math.min(requestedEnd, size - 1),
  };
}

export async function registerPublicUploadRoutes(app: FastifyInstance) {
  const serveUpload = async (
    request: FastifyRequest<{ Params: { "*": string } }>,
    reply: FastifyReply,
  ) => {
    const publicPath = `/uploads/${request.params["*"] ?? ""}`.replace(/\/+/g, "/");
    const asset = await getMediaAssetByPublicPath(publicPath);
    if (!asset) {
      reply.code(404);
      return { error: "El archivo no existe." };
    }

    try {
      const bytes = await getMediaAssetBytes(asset.id);
      const rangeHeader = request.headers.range;
      reply.header("content-type", asset.mimeType);
      reply.header("cache-control", "public, max-age=86400");
      reply.header("accept-ranges", "bytes");

      if (rangeHeader) {
        const range = parseByteRange(rangeHeader, bytes.byteLength);
        if (!range) {
          reply.header("content-range", `bytes */${bytes.byteLength}`);
          reply.code(416);
          return Buffer.alloc(0);
        }

        const chunk = bytes.subarray(range.start, range.end + 1);
        reply.header(
          "content-range",
          `bytes ${range.start}-${range.end}/${bytes.byteLength}`,
        );
        reply.header("content-length", String(chunk.byteLength));
        reply.code(206);
        return Buffer.from(chunk);
      }

      reply.header("content-length", String(bytes.byteLength));
      return Buffer.from(bytes);
    } catch (error) {
      reply.code(404);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo recuperar el archivo.",
      };
    }
  };

  app.get<{ Params: { "*": string } }>("/uploads/*", serveUpload);
  app.get<{ Params: { "*": string } }>("/api/uploads/*", serveUpload);
}
