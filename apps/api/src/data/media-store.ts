import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { basename, extname, join } from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

import type { QueryResultRow } from "pg";

import { isDatabaseConfigured, query } from "../infrastructure/database.js";
import { getAppEnv } from "../infrastructure/env.js";
import {
  getResolvedPublicUrl,
  getUploadPublicPrefix,
  getUploadStoragePath,
  readUploadFile,
  writeUploadFile,
} from "../infrastructure/uploads.js";

export type MediaAssetCategory = "product" | "course" | "library" | "lesson" | "general";
export type MediaAssetAction = "UPLOADED" | "UPDATED" | "DELETED";

export interface MediaAsset {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  publicUrl: string;
  category: MediaAssetCategory;
  entityType: string | null;
  entityId: string | null;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface MediaAssetRow extends QueryResultRow {
  id: string;
  file_name: string;
  original_name: string;
  mime_type: string;
  size_bytes: string | number;
  storage_path: string;
  public_url: string;
  category: MediaAssetCategory;
  entity_type: string | null;
  entity_id: string | null;
  uploaded_by: string;
  created_at: Date | string;
  updated_at: Date | string;
  is_active: boolean;
}

interface StoredMockMediaAsset {
  asset: MediaAsset;
  bytes: Uint8Array;
}

interface MediaAuditRow {
  id: string;
  actorType: string;
  actorId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface MediaAuditMeta {
  actorType: "admin";
  actorId: string;
  changedBy: string;
  source: "admin";
}

export interface CreateMediaAssetInput {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category: MediaAssetCategory;
  entityType?: string | null;
  entityId?: string | null;
  uploadedBy: string;
}

export interface MediaAssetListOptions {
  category?: MediaAssetCategory;
  entityType?: string;
  entityId?: string;
  includeInactive?: boolean;
  limit?: number;
}

const mockMediaAssets = new Map<string, StoredMockMediaAsset>();
const mockMediaAudits: MediaAuditRow[] = [];
const execFileAsync = promisify(execFile);

const dangerousExtensions = new Set(["exe", "js", "html", "php", "sh"]);
const allowedImageMimes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const allowedDocumentMimes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);
const officeDocumentMimes = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

function toIsoString(value: Date | string | null): string {
  if (value == null) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function readUtf8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function sanitizeFileName(value: string): string {
  const normalized = basename(value.trim()).toLowerCase();
  return normalized
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getExtension(value: string): string {
  const extension = extname(value).replace(".", "").toLowerCase();
  return extension.length > 10 ? "" : extension;
}

function getCategoryFolder(category: MediaAssetCategory): string {
  switch (category) {
    case "product":
      return "products";
    case "course":
      return "courses";
    case "library":
      return "library";
    case "lesson":
      return "lessons";
    default:
      return "general";
  }
}

function getMaxBytesForMime(mimeType: string): number {
  const env = getAppEnv();
  if (allowedImageMimes.has(mimeType)) {
    return env.maxImageUploadMb * 1024 * 1024;
  }

  if (allowedDocumentMimes.has(mimeType)) {
    return env.maxPdfUploadMb * 1024 * 1024;
  }

  return 0;
}

function detectMimeType(bytes: Uint8Array): string | null {
  if (bytes.length >= 8) {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (png.every((byte, index) => bytes[index] === byte)) {
      return "image/png";
    }
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 12 &&
    readUtf8(bytes.slice(0, 4)) === "RIFF" &&
    readUtf8(bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  if (bytes.length >= 5 && readUtf8(bytes.slice(0, 5)) === "%PDF-") {
    return "application/pdf";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 &&
    bytes[5] === 0xb1 &&
    bytes[6] === 0x1a &&
    bytes[7] === 0xe1
  ) {
    return "application/msword";
  }

  if (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  ) {
    const zipText = readUtf8(bytes);
    if (
      zipText.includes("[Content_Types].xml") ||
      zipText.includes("word/") ||
      zipText.includes("docProps/")
    ) {
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }
    if (zipText.includes("ppt/")) {
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    }
  }

  const text = readUtf8(bytes).trim();
  if (text.startsWith("<svg") || text.includes("<svg")) {
    const hasScript = /<script[\s>]/i.test(text) || /on\w+\s*=/i.test(text) || /javascript:/i.test(text);
    if (!hasScript) {
      return "image/svg+xml";
    }
  }

  return null;
}

function resolveUploadMimeType(input: CreateMediaAssetInput, bytes: Uint8Array): string {
  const declaredMimeType = input.mimeType.trim().toLowerCase();
  const detectedMimeType = detectMimeType(bytes);

  if (!declaredMimeType || declaredMimeType === "application/octet-stream") {
    if (detectedMimeType) {
      return detectedMimeType;
    }
    throw new Error("Formato no permitido.");
  }

  if (allowedDocumentMimes.has(declaredMimeType) || allowedImageMimes.has(declaredMimeType)) {
    if (detectedMimeType && detectedMimeType !== declaredMimeType) {
      throw new Error("Formato no permitido.");
    }
    return declaredMimeType;
  }

  if (detectedMimeType) {
    return detectedMimeType;
  }

  throw new Error("Formato no permitido.");
}

function validateMimeForCategory(category: MediaAssetCategory, mimeType: string): void {
  const imageAllowed =
    category === "product" || category === "course" || category === "lesson" || category === "general";
  const documentAllowed =
    category === "course" || category === "lesson" || category === "library" || category === "general";

  if (allowedImageMimes.has(mimeType)) {
    if (!imageAllowed) {
      throw new Error("El tipo de archivo no es válido para esta categoría.");
    }
    return;
  }

  if (allowedDocumentMimes.has(mimeType)) {
    if (!documentAllowed) {
      throw new Error("El tipo de archivo no es válido para esta categoría.");
    }
    return;
  }

  throw new Error("Formato no permitido.");
}

async function convertOfficeDocumentToPdfBytes(
  bytes: Uint8Array,
  originalName: string,
): Promise<Uint8Array> {
  const workDir = await mkdtemp(join(tmpdir(), "lo-renaciente-office-"));
  const sanitizedOriginal = sanitizeFileName(originalName);
  const inputFileName =
    sanitizedOriginal.endsWith(".docx") || sanitizedOriginal.endsWith(".doc")
      ? sanitizedOriginal
      : `${sanitizedOriginal}.docx`;
  const inputPath = join(workDir, inputFileName);
  const outputPath = join(
    workDir,
    `${basename(inputFileName, extname(inputFileName))}.pdf`,
  );

  await writeFile(inputPath, bytes);

  try {
    const candidates = ["libreoffice", "soffice"];
    let lastError: unknown = null;

    for (const binary of candidates) {
      try {
        await execFileAsync(binary, [
          "--headless",
          "--nologo",
          "--nolockcheck",
          "--nodefault",
          "--norestore",
          "--convert-to",
          "pdf",
          "--outdir",
          workDir,
          inputPath,
        ]);

        const convertedBytes = await readFile(outputPath);
        if (convertedBytes.byteLength > 0) {
          return new Uint8Array(convertedBytes);
        }
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(
      lastError instanceof Error && lastError.message.trim().length > 0
        ? `No se pudo convertir el documento a PDF: ${lastError.message}`
        : "No se pudo convertir el documento a PDF. Instala LibreOffice en el servidor.",
    );
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function validateFilePayload(input: CreateMediaAssetInput, bytes: Uint8Array): {
  normalizedMimeType: string;
  fileName: string;
  storagePath: string;
  publicUrl: string;
} {
  if (!input.originalName.trim()) {
    throw new Error("El archivo debe tener un nombre.");
  }

  const sanitizedOriginal = sanitizeFileName(input.originalName);
  const extension = getExtension(sanitizedOriginal);
  if (dangerousExtensions.has(extension)) {
    throw new Error("Formato no permitido.");
  }

  const normalizedMimeType = resolveUploadMimeType(input, bytes);
  if (!normalizedMimeType) {
    throw new Error("Formato no permitido.");
  }

  validateMimeForCategory(input.category, normalizedMimeType);

  const maxBytes = getMaxBytesForMime(normalizedMimeType);
  if (maxBytes <= 0) {
    throw new Error("Formato no permitido.");
  }

  if (bytes.byteLength > maxBytes) {
    throw new Error("Archivo demasiado grande.");
  }

  if (normalizedMimeType === "image/svg+xml") {
    const svg = readUtf8(bytes);
    if (
      /<script[\s>]/i.test(svg) ||
      /on\w+\s*=/i.test(svg) ||
      /javascript:/i.test(svg) ||
      /<foreignObject/i.test(svg)
    ) {
      throw new Error("Formato no permitido.");
    }
  }

  const baseName = sanitizedOriginal.replace(new RegExp(`\\.${extension}$`), "");
  const uniqueBase = `${baseName || "archivo"}-${randomUUID()}`;
  const finalFileName = extension ? `${uniqueBase}.${extension}` : uniqueBase;
  const storagePath = getUploadStoragePath(getCategoryFolder(input.category), finalFileName);
  const publicUrl = getResolvedPublicUrl(`${getUploadPublicPrefix()}/${storagePath}`.replaceAll("//", "/"));

  return {
    normalizedMimeType,
    fileName: finalFileName,
    storagePath,
    publicUrl,
  };
}

function buildMediaAuditMeta(uploadedBy: string): MediaAuditMeta {
  return {
    actorType: "admin",
    actorId: uploadedBy,
    changedBy: uploadedBy,
    source: "admin",
  };
}

async function appendMediaAudit(
  entityId: string,
  action: MediaAssetAction,
  fieldChanged: string,
  previousValue: unknown,
  newValue: unknown,
  meta: MediaAuditMeta,
  extraPayload: Record<string, unknown>,
): Promise<void> {
  const payload = {
    action,
    fieldChanged,
    previousValue,
    newValue,
    source: meta.source,
    changedBy: meta.changedBy,
    ...extraPayload,
  };

  const entry: MediaAuditRow = {
    id: randomUUID(),
    actorType: meta.actorType,
    actorId: meta.actorId,
    eventType: `media_asset.${action.toLowerCase()}`,
    entityType: "media_asset",
    entityId,
    payload,
    createdAt: new Date().toISOString(),
  };

  if (!isDatabaseConfigured()) {
    mockMediaAudits.unshift(entry);
    return;
  }

  await query(
    `
      insert into audit_logs (
        id,
        actor_type,
        actor_id,
        event_type,
        entity_type,
        entity_id,
        payload
      ) values ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      entry.id,
      entry.actorType,
      entry.actorId,
      entry.eventType,
      entry.entityType,
      entry.entityId,
      JSON.stringify(entry.payload),
    ],
  );
}

function mapMediaAssetRow(row: MediaAssetRow): MediaAsset {
  return {
    id: row.id,
    fileName: row.file_name,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    category: row.category,
    entityType: row.entity_type,
    entityId: row.entity_id,
    uploadedBy: row.uploaded_by,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    isActive: row.is_active,
  };
}

function normalizeAssetPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\/+/, "");
}

async function findAssetRow(assetId: string): Promise<MediaAssetRow | null> {
  const result = await query<MediaAssetRow>(
    `
      select
        id,
        file_name,
        original_name,
        mime_type,
        size_bytes,
        storage_path,
        public_url,
        category,
        entity_type,
        entity_id,
        uploaded_by,
        created_at,
        updated_at,
        is_active
      from media_assets
      where id = $1
      limit 1
    `,
    [assetId],
  );

  return result.rows[0] ?? null;
}

async function findAssetRowByStoragePath(storagePath: string): Promise<MediaAssetRow | null> {
  const result = await query<MediaAssetRow>(
    `
      select
        id,
        file_name,
        original_name,
        mime_type,
        size_bytes,
        storage_path,
        public_url,
        category,
        entity_type,
        entity_id,
        uploaded_by,
        created_at,
        updated_at,
        is_active
      from media_assets
      where storage_path = $1
      limit 1
    `,
    [storagePath],
  );

  return result.rows[0] ?? null;
}

export async function createMediaAsset(input: CreateMediaAssetInput, bytes: Uint8Array): Promise<MediaAsset> {
  const { normalizedMimeType, fileName, storagePath, publicUrl } = validateFilePayload(input, bytes);
  let storedMimeType = normalizedMimeType;
  let storedFileName = fileName;
  let storedStoragePath = storagePath;
  let storedPublicUrl = publicUrl;
  let storedBytes = bytes;

  if (officeDocumentMimes.has(normalizedMimeType)) {
    storedBytes = await convertOfficeDocumentToPdfBytes(bytes, input.originalName);
    storedMimeType = "application/pdf";
    storedFileName = `${basename(fileName, extname(fileName))}.pdf`;
    storedStoragePath = getUploadStoragePath(
      getCategoryFolder(input.category),
      storedFileName,
    );
    storedPublicUrl = getResolvedPublicUrl(
      `${getUploadPublicPrefix()}/${storedStoragePath}`.replaceAll("//", "/"),
    );
  } else if (normalizedMimeType === "application/pdf") {
    storedBytes = await maybeOcrPdfBytes(bytes, input.originalName);
  }

  const asset: MediaAsset = {
    id: randomUUID(),
    fileName: storedFileName,
    originalName: input.originalName.trim(),
    mimeType: storedMimeType,
    sizeBytes: storedBytes.byteLength,
    storagePath: storedStoragePath,
    publicUrl: storedPublicUrl,
    category: input.category,
    entityType: input.entityType?.trim() || null,
    entityId: input.entityId?.trim() || null,
    uploadedBy: input.uploadedBy.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
  };

  await writeUploadFile(storagePath, storedBytes);

  if (!isDatabaseConfigured()) {
    mockMediaAssets.set(asset.id, { asset, bytes: storedBytes });
  } else {
    await query(
      `
        insert into media_assets (
          id,
          file_name,
          original_name,
          mime_type,
          size_bytes,
          storage_path,
          public_url,
          category,
          entity_type,
          entity_id,
          uploaded_by,
          created_at,
          updated_at,
          is_active
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `,
      [
        asset.id,
        asset.fileName,
        asset.originalName,
        asset.mimeType,
        asset.sizeBytes,
        asset.storagePath,
        asset.publicUrl,
        asset.category,
        asset.entityType,
        asset.entityId,
        asset.uploadedBy,
        asset.createdAt,
        asset.updatedAt,
        asset.isActive,
      ],
    );
  }

  await appendMediaAudit(
    asset.id,
    "UPLOADED",
    "file",
    null,
    {
      fileName: asset.fileName,
      originalName: asset.originalName,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      storagePath: asset.storagePath,
      publicUrl: asset.publicUrl,
      category: asset.category,
      entityType: asset.entityType,
      entityId: asset.entityId,
    },
    buildMediaAuditMeta(asset.uploadedBy),
    {
      category: asset.category,
      entityType: asset.entityType,
      entityId: asset.entityId,
    },
  );

  return asset;
}

async function maybeOcrPdfBytes(bytes: Uint8Array, originalName: string): Promise<Uint8Array> {
  try {
    const workDir = await mkdtemp(join(tmpdir(), "lo-renaciente-ocr-"));
    const inputPath = join(workDir, sanitizeFileName(originalName) || "documento.pdf");
    const outputPath = join(workDir, "ocr-output.pdf");
    await writeFile(inputPath, bytes);

    try {
      await execFileAsync("ocrmypdf", [
        "--skip-text",
        "--deskew",
        "--clean",
        "--rotate-pages",
        "--language",
        "spa+eng",
        "--output-type",
        "pdf",
        "--quiet",
        inputPath,
        outputPath,
      ]);

      const ocrBytes = await readFile(outputPath);
      return ocrBytes.byteLength > 0 ? ocrBytes : bytes;
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  } catch {
    return bytes;
  }
}

export async function listMediaAssets(options: MediaAssetListOptions = {}): Promise<MediaAsset[]> {
  const safeLimit = Math.max(1, Math.min(options.limit ?? 100, 500));
  if (!isDatabaseConfigured()) {
    return [...mockMediaAssets.values()]
      .map((item) => item.asset)
      .filter((asset) => (options.includeInactive ? true : asset.isActive))
      .filter((asset) => (options.category ? asset.category === options.category : true))
      .filter((asset) => (options.entityType ? asset.entityType === options.entityType : true))
      .filter((asset) => (options.entityId ? asset.entityId === options.entityId : true))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, safeLimit);
  }

  const clauses: string[] = [];
  const params: unknown[] = [];

  if (options.category) {
    params.push(options.category);
    clauses.push(`category = $${params.length}`);
  }
  if (options.entityType) {
    params.push(options.entityType);
    clauses.push(`entity_type = $${params.length}`);
  }
  if (options.entityId) {
    params.push(options.entityId);
    clauses.push(`entity_id = $${params.length}`);
  }
  if (!options.includeInactive) {
    clauses.push("is_active = true");
  }

  params.push(safeLimit);
  const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";
  const rows = await query<MediaAssetRow>(
    `
      select
        id,
        file_name,
        original_name,
        mime_type,
        size_bytes,
        storage_path,
        public_url,
        category,
        entity_type,
        entity_id,
        uploaded_by,
        created_at,
        updated_at,
        is_active
      from media_assets
      ${where}
      order by created_at desc
      limit $${params.length}
    `,
    params,
  );

  return rows.rows.map(mapMediaAssetRow);
}

export async function getMediaAsset(assetId: string): Promise<MediaAsset | null> {
  const normalizedId = assetId.trim();
  if (!normalizedId) {
    return null;
  }

  if (!isDatabaseConfigured()) {
    return mockMediaAssets.get(normalizedId)?.asset ?? null;
  }

  const row = await findAssetRow(normalizedId);
  return row ? mapMediaAssetRow(row) : null;
}

export async function getMediaAssetByStoragePath(storagePath: string): Promise<MediaAsset | null> {
  const normalizedPath = normalizeAssetPath(storagePath);
  if (!normalizedPath) {
    return null;
  }

  if (!isDatabaseConfigured()) {
    return [...mockMediaAssets.values()].find((entry) => entry.asset.storagePath === normalizedPath)?.asset ?? null;
  }

  const row = await findAssetRowByStoragePath(normalizedPath);
  return row ? mapMediaAssetRow(row) : null;
}

export async function getMediaAssetBytes(assetId: string): Promise<Uint8Array> {
  const asset = await getMediaAsset(assetId);
  if (!asset) {
    throw new Error("El archivo no existe.");
  }

  if (!isDatabaseConfigured()) {
    const record = mockMediaAssets.get(asset.id);
    if (!record) {
      throw new Error("El archivo no existe.");
    }
    return record.bytes;
  }

  return readUploadFile(asset.storagePath);
}

export async function deleteMediaAsset(assetId: string): Promise<MediaAsset> {
  const asset = await getMediaAsset(assetId);
  if (!asset) {
    throw new Error("El archivo no existe.");
  }

  const deletedAsset = {
    ...asset,
    isActive: false,
    updatedAt: new Date().toISOString(),
  };

  if (!isDatabaseConfigured()) {
    const record = mockMediaAssets.get(asset.id);
    if (record) {
      mockMediaAssets.set(asset.id, {
        ...record,
        asset: deletedAsset,
      });
    }
  } else {
    await query(
      `
        update media_assets
        set is_active = false,
            updated_at = now()
        where id = $1
      `,
      [asset.id],
    );
  }

  await appendMediaAudit(
    asset.id,
    "DELETED",
    "file",
    {
      fileName: asset.fileName,
      publicUrl: asset.publicUrl,
      storagePath: asset.storagePath,
    },
    null,
    buildMediaAuditMeta(asset.uploadedBy),
    {
      category: asset.category,
      entityType: asset.entityType,
      entityId: asset.entityId,
    },
  );

  return deletedAsset;
}

export async function getMediaAssetByPublicPath(publicPath: string): Promise<MediaAsset | null> {
  const prefix = getUploadPublicPrefix();
  const normalized = normalizeAssetPath(publicPath);
  if (!normalized.startsWith(normalizeAssetPath(prefix))) {
    return null;
  }

  const storagePath = normalized.slice(normalizeAssetPath(prefix).length).replace(/^\/+/, "");
  return getMediaAssetByStoragePath(storagePath);
}

export function resolveMediaAssetPublicUrl(publicPath: string): string {
  return getResolvedPublicUrl(publicPath);
}
