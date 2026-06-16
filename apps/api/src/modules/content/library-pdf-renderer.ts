import { createCanvas, DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getLibraryPdfById } from "../../data/persistent-store.js";
import {
  getMediaAssetBytes,
  getMediaAssetByPublicPath,
  listMediaAssets,
} from "../../data/media-store.js";
import {
  readUploadFile,
  resolveUploadStoragePath,
  uploadFileExists,
  writeUploadFile,
} from "../../infrastructure/uploads.js";

const globalCanvas = globalThis as any;

if (!globalCanvas.DOMMatrix) {
  globalCanvas.DOMMatrix = DOMMatrix;
}
if (!globalCanvas.ImageData) {
  globalCanvas.ImageData = ImageData;
}
if (!globalCanvas.Path2D) {
  globalCanvas.Path2D = Path2D;
}

const pdfRequestCache = new Map<string, Promise<Uint8Array>>();
const pdfjsRootDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../node_modules/pdfjs-dist",
);
const pdfjsCMapUrl = `${pathToFileURL(join(pdfjsRootDir, "cmaps")).toString()}/`;
const pdfjsStandardFontsUrl = `${pathToFileURL(
  join(pdfjsRootDir, "standard_fonts"),
).toString()}/`;

export interface LibraryPdfMetadata {
  id: string;
  pageCount: number;
  title: string | null;
}

export interface LibraryPdfSearchMatch {
  pageNumber: number;
  snippet: string;
}

export interface LibraryPdfTextLine {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fontSize: number;
}

export interface LibraryPdfTextLayout {
  pageWidth: number;
  pageHeight: number;
  lines: LibraryPdfTextLine[];
}

export async function getLibraryPdfMetadata(
  pdfId: string,
  refresh = false,
): Promise<LibraryPdfMetadata> {
  const loaded = await openPdfDocument(pdfId, refresh);
  try {
    const metadata = await (loaded.document as any).getMetadata().catch(() => null);
    const metadataInfo = metadata as
      | {
          info?: { Title?: string };
          metadata?: { get?: (key: string) => string | null };
        }
      | null;
    const title = normalizePdfTitle(
      metadataInfo?.info?.Title ?? metadataInfo?.metadata?.get?.("dc:title") ?? null,
    );

    return {
      id: pdfId,
      pageCount: loaded.document.numPages,
      title,
    };
  } finally {
    await destroyPdfDocument(loaded.document);
  }
}

export async function renderLibraryPdfPageImage(
  pdfId: string,
  pageNumber: number,
  width = 1200,
  refresh = false,
): Promise<Uint8Array> {
  const safeWidth = Math.min(Math.max(Math.trunc(width) || 1200, 360), 3200);
  const cachePath = buildPageImageCachePath(pdfId, pageNumber, safeWidth);
  if (!refresh && (await uploadFileExists(cachePath))) {
    return readUploadFile(cachePath);
  }

  const loaded = await openPdfDocument(pdfId, refresh);
  try {
    if (pageNumber < 1 || pageNumber > loaded.document.numPages) {
      throw new Error("La página solicitada no existe.");
    }

    const page = await loaded.document.getPage(pageNumber);
    try {
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = safeWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );
      const context = canvas.getContext("2d", { alpha: false });
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({
        canvas: canvas as any,
        canvasContext: context as any,
        viewport,
      } as any).promise;
      const imageBytes = canvas.toBuffer("image/png");
      await writeUploadFile(cachePath, imageBytes);
      return imageBytes;
    } finally {
      page.cleanup?.();
    }
  } finally {
    await destroyPdfDocument(loaded.document);
  }
}

export async function getLibraryPdfPageTextLayout(
  pdfId: string,
  pageNumber: number,
  width = 1200,
  refresh = false,
): Promise<LibraryPdfTextLayout> {
  const safeWidth = Math.min(Math.max(Math.trunc(width) || 1200, 360), 3200);
  const loaded = await openPdfDocument(pdfId, refresh);
  try {
    if (pageNumber < 1 || pageNumber > loaded.document.numPages) {
      throw new Error("La página solicitada no existe.");
    }

    const page = await loaded.document.getPage(pageNumber);
    try {
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = safeWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const textContent = await page.getTextContent();
      const lines = buildTextLines(
        textContent.items as Array<Record<string, unknown>>,
        viewport,
        scale,
      );
      return {
        pageWidth: Math.ceil(viewport.width),
        pageHeight: Math.ceil(viewport.height),
        lines,
      };
    } finally {
      page.cleanup?.();
    }
  } finally {
    await destroyPdfDocument(loaded.document);
  }
}

export async function searchLibraryPdfPages(
  pdfId: string,
  query: string,
  refresh = false,
): Promise<{ pageCount: number; matches: LibraryPdfSearchMatch[] }> {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return { pageCount: 0, matches: [] };
  }

  const loaded = await openPdfDocument(pdfId, refresh);
  try {
    const matches: LibraryPdfSearchMatch[] = [];
    for (let pageNumber = 1; pageNumber <= loaded.document.numPages; pageNumber += 1) {
      const text = await loadPageText(loaded.document, pdfId, pageNumber, refresh);
      const normalizedText = normalizeQuery(text);
      const index = normalizedText.indexOf(normalizedQuery);
      if (index < 0) {
        continue;
      }

      matches.push({
        pageNumber,
        snippet: buildSnippet(text, index, normalizedQuery.length),
      });
    }

    return { pageCount: loaded.document.numPages, matches };
  } finally {
    await destroyPdfDocument(loaded.document);
  }
}

async function openPdfDocument(pdfId: string, refresh = false) {
  const bytes = new Uint8Array(await loadLibraryPdfBytes(pdfId, refresh));
  const loadingTask = pdfjsLib.getDocument({
    data: bytes,
    useWorkerFetch: false,
    disableFontFace: false,
    cMapUrl: pdfjsCMapUrl,
    cMapPacked: true,
    standardFontDataUrl: pdfjsStandardFontsUrl,
  } as any);
  const document = await loadingTask.promise;
  return { bytes, document };
}

async function loadLibraryPdfBytes(
  pdfId: string,
  refresh = false,
): Promise<Uint8Array> {
  const cachePath = `library-cache/pdfs/${pdfId}.pdf`;
  if (!refresh && (await uploadFileExists(cachePath))) {
    return readUploadFile(cachePath);
  }

  const record = await getLibraryPdfById(pdfId);
  if (record?.fileUrl?.trim()) {
    const storedBytes = await loadStoredLibraryPdfBytes(pdfId, record.fileUrl.trim());
    if (storedBytes) {
      const tempPath = `${cachePath}.${Date.now()}.tmp`;
      await writeUploadFile(tempPath, storedBytes);
      await rename(
        resolveUploadStoragePath(tempPath),
        resolveUploadStoragePath(cachePath),
      );
      return storedBytes;
    }
  }

  const cachedPromise = refresh ? null : pdfRequestCache.get(pdfId);
  if (cachedPromise) {
    return cachedPromise;
  }

  const requestPromise = fetchAndCacheLibraryPdf(pdfId, cachePath).finally(() => {
    pdfRequestCache.delete(pdfId);
  });
  pdfRequestCache.set(pdfId, requestPromise);
  return requestPromise;
}

async function fetchAndCacheLibraryPdf(
  pdfId: string,
  cachePath: string,
): Promise<Uint8Array> {
  const candidates = [
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(pdfId)}`,
    `https://drive.google.com/uc?id=${encodeURIComponent(pdfId)}&export=download`,
  ];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        redirect: "follow",
        headers: {
          "user-agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile",
        },
      });

      if (!response.ok) {
        continue;
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!looksLikePdf(bytes)) {
        continue;
      }

      const tempPath = `${cachePath}.${Date.now()}.tmp`;
      await writeUploadFile(tempPath, bytes);
      await rename(
        resolveUploadStoragePath(tempPath),
        resolveUploadStoragePath(cachePath),
      );
      return bytes;
    } catch {
      continue;
    }
  }

  throw new Error("No se pudo abrir el PDF de la biblioteca.");
}

async function loadStoredLibraryPdfBytes(
  pdfId: string,
  fileUrl: string,
): Promise<Uint8Array | null> {
  const normalized = fileUrl.trim();
  if (!normalized) {
    return null;
  }

  const linkedAsset = (await listMediaAssets({
    category: "library",
    entityType: "library_pdf",
    entityId: pdfId,
    includeInactive: true,
    limit: 1,
  }))[0];
  if (linkedAsset?.mimeType === "application/pdf") {
    return getMediaAssetBytes(linkedAsset.id);
  }

  try {
    const parsed = new URL(normalized, "http://localhost");
    const asset = await getMediaAssetByPublicPath(parsed.pathname);
    if (asset?.mimeType === "application/pdf") {
      return getMediaAssetBytes(asset.id);
    }
  } catch {
    // Ignore malformed URLs and fall back to remote fetch below.
  }

  if (/^https?:\/\//i.test(normalized)) {
    const response = await fetch(normalized, {
      redirect: "follow",
    });
    if (response.ok) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (looksLikePdf(bytes)) {
        return bytes;
      }
    }
  }

  return null;
}

async function loadPageText(
  document: any,
  pdfId: string,
  pageNumber: number,
  refresh = false,
): Promise<string> {
  const cachePath = buildPageTextCachePath(pdfId, pageNumber);
  if (!refresh && (await uploadFileExists(cachePath))) {
    const cached = await readUploadFile(cachePath);
    return new TextDecoder().decode(cached);
  }

  const page = await document.getPage(pageNumber);
  try {
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item: { str?: string }) => item.str ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    await writeUploadFile(cachePath, new TextEncoder().encode(text));
    return text;
  } finally {
    page.cleanup?.();
  }
}

function buildPageImageCachePath(pdfId: string, pageNumber: number, width: number): string {
  const safePdfId = sanitizePathSegment(pdfId);
  return `library-cache/rendered/${safePdfId}/page-${String(pageNumber).padStart(4, "0")}-w${width}.png`;
}

function buildPageTextCachePath(pdfId: string, pageNumber: number): string {
  const safePdfId = sanitizePathSegment(pdfId);
  return `library-cache/text/${safePdfId}/page-${String(pageNumber).padStart(4, "0")}.txt`;
}

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function looksLikePdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

function normalizePdfTitle(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function destroyPdfDocument(document: any): Promise<void> {
  try {
    const result = document?.destroy?.();
    if (result && typeof result.then === "function") {
      await result.catch(() => undefined);
    }
  } catch {
    // ignore cleanup failures
  }
}

function normalizeQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildSnippet(text: string, startIndex: number, length: number): string {
  const safeStart = Math.max(0, startIndex - 60);
  const safeEnd = Math.min(text.length, startIndex + length + 60);
  return text.slice(safeStart, safeEnd).replace(/\s+/g, " ").trim();
}

type TextItem = {
  str?: string;
  width?: number;
  height?: number;
  transform?: number[];
};

type TextLineBuilder = {
  textParts: string[];
  left: number;
  top: number;
  right: number;
  bottom: number;
  maxHeight: number;
  lastRight: number;
};

function buildTextLines(items: unknown[], viewport: any, scale: number): LibraryPdfTextLine[] {
  const extractedItems = items
    .filter((item): item is TextItem => Boolean(item && typeof item === "object"))
    .map((item) => {
      const transform = item.transform;
      const rawText = typeof item.str === "string" ? item.str : "";
      if (!transform || rawText.trim().length === 0) {
        return null;
      }

      if (
        typeof transform[4] !== "number" ||
        typeof transform[5] !== "number"
      ) {
        return null;
      }

      const [x, y] = viewport.convertToViewportPoint(transform[4] ?? 0, transform[5] ?? 0);
      const width = Math.max(1, Number(item.width ?? 0) * scale);
      const height = Math.max(1, Number(item.height ?? 0) * scale);

      return {
        text: rawText,
        left: Math.max(0, x),
        top: Math.max(0, y - height),
        width,
        height,
      };
    })
    .filter(
      (
        item,
      ): item is {
        text: string;
        left: number;
        top: number;
        width: number;
        height: number;
      } => item !== null,
    )
    .sort((left, right) => {
      if (Math.abs(left.top - right.top) > 3) {
        return left.top - right.top;
      }
      return left.left - right.left;
    });

  const lines: TextLineBuilder[] = [];
  for (const item of extractedItems) {
    const threshold = Math.max(6, item.height * 0.65);
    const current = lines[lines.length - 1];
    if (!current || Math.abs(item.top - current.top) > threshold) {
      lines.push({
        textParts: [item.text.trim()],
        left: item.left,
        top: item.top,
        right: item.left + item.width,
        bottom: item.top + item.height,
        maxHeight: item.height,
        lastRight: item.left + item.width,
      });
      continue;
    }

    const gap = item.left - current.lastRight;
    if (gap > Math.max(4, item.height * 0.22)) {
      current.textParts.push(" ");
    }
    current.textParts.push(item.text.trim());
    current.left = Math.min(current.left, item.left);
    current.top = Math.min(current.top, item.top);
    current.right = Math.max(current.right, item.left + item.width);
    current.bottom = Math.max(current.bottom, item.top + item.height);
    current.maxHeight = Math.max(current.maxHeight, item.height);
    current.lastRight = Math.max(current.lastRight, item.left + item.width);
  }

  return lines
    .map((line) => {
      const text = line.textParts.join(" ").replace(/\s+/g, " ").trim();
      return {
        text,
        left: roundCoord(line.left),
        top: roundCoord(line.top),
        width: roundCoord(Math.max(1, line.right - line.left)),
        height: roundCoord(Math.max(1, line.bottom - line.top)),
        fontSize: roundCoord(Math.max(10, line.maxHeight * 0.9)),
      };
    })
    .filter((line) => line.text.length > 0);
}

function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}
