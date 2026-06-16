import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getCourses,
  getHomePayload,
  listLibraryPdfs,
  listServices,
} from "../../data/persistent-store.js";
import { getSpecialistCatalog } from "../../data/scheduling-store.js";
import {
  subscribeContentChanges,
  type PublicContentChangeEvent,
} from "./content-events.js";
import {
  readUploadFile,
  resolveUploadStoragePath,
  uploadFileExists,
  writeUploadFile,
} from "../../infrastructure/uploads.js";
import {
  getLibraryPdfMetadata,
  getLibraryPdfPageTextLayout,
  renderLibraryPdfPageImage,
  searchLibraryPdfPages,
} from "./library-pdf-renderer.js";

const libraryPdfRequestCache = new Map<string, Promise<Uint8Array>>();
const pdfJsRootDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../node_modules/pdfjs-dist",
);

export async function registerContentRoutes(app: FastifyInstance) {
  app.get("/events", async (request, reply) => {
    reply.hijack();

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const sendEvent = (event: PublicContentChangeEvent) => {
      if (reply.raw.destroyed) {
        return;
      }

      reply.raw.write(`id: ${event.id}\n`);
      reply.raw.write("event: content.changed\n");
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    reply.raw.write("event: connected\n");
    reply.raw.write(
      `data: ${JSON.stringify({
        ok: true,
        at: new Date().toISOString(),
      })}\n\n`,
    );

    const unsubscribe = subscribeContentChanges(sendEvent);

    const heartbeat = setInterval(() => {
      if (!reply.raw.destroyed) {
        reply.raw.write(`: ping ${Date.now()}\n\n`);
      }
    }, 25_000);

    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  app.get("/courses", async () => {
    return {
      items: getCourses(),
    };
  });

  app.get("/version", async () => {
    const [courses, libraryPdfs, specialists, services] = await Promise.all([
      Promise.resolve(getCourses()),
      listLibraryPdfs(),
      getSpecialistCatalog(),
      listServices({ includeInactive: true }),
    ]);

    const snapshot = {
      courses: courses.map((item) => ({
        id: item.id,
        status: item.status ?? "draft",
        isActive: item.isActive ?? true,
        updatedAt: item.updatedAt ?? null,
      })),
      libraryPdfs: libraryPdfs.map((item) => ({
        id: item.id,
        status: item.status ?? "draft",
        isActive: item.isActive ?? true,
        updatedAt: item.updatedAt ?? null,
      })),
      specialists: specialists.map((item) => ({
        id: item.id,
        isActive: item.isActive ?? true,
        isPublic: item.isPublic ?? true,
        featured: item.featured ?? false,
      })),
      services: services.map((item) => ({
        id: item.id,
        isActive: item.isActive ?? true,
        isVisible: item.isVisible ?? true,
        premiumIncluded: item.premiumIncluded ?? false,
      })),
    };
    const version = createHash("sha256")
      .update(JSON.stringify(snapshot))
      .digest("hex");

    return {
      item: {
        version,
        updatedAt: new Date().toISOString(),
        counts: {
          courses: courses.filter((item) => item.status === "published" && item.isActive !== false).length,
          libraryPdfs: libraryPdfs.filter((item) => item.status === "published" && item.isActive !== false).length,
          specialists: specialists.filter((item) => item.isPublic !== false && item.isActive !== false).length,
          services: services.filter((item) => item.isActive !== false && item.isVisible !== false).length,
        },
      },
    };
  });

  app.get("/library/pdfs", async () => {
    const items = (await listLibraryPdfs())
      .filter((item) => item.isActive && item.status === "published")
      .map((item) => ({
        ...item,
        viewUrl: `/api/content/library/pdfs/${encodeURIComponent(item.id)}/view`,
        fileUrl: `/api/content/library/pdfs/${encodeURIComponent(item.id)}/file`,
        thumbnailUrl: `/api/content/library/pdfs/${encodeURIComponent(item.id)}/pages/1/image?width=900`,
      }));

    return { items };
  });

  app.get<{
    Params: { pdfId: string };
    Querystring: { refresh?: string };
  }>("/library/pdfs/:pdfId/meta", async (request, reply) => {
    const pdfId = request.params.pdfId.trim();
    if (!pdfId) {
      reply.code(400);
      return { error: "El identificador del PDF es obligatorio." };
    }

    try {
      const refresh = String(request.query.refresh ?? "").trim() === "1";
      return {
        item: await getLibraryPdfMetadata(pdfId, refresh),
      };
    } catch (error) {
      reply.code(502);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo leer la metadata del PDF.",
      };
    }
  });

  app.get<{
    Params: { pdfId: string; pageNumber: string };
    Querystring: { width?: string; refresh?: string };
  }>("/library/pdfs/:pdfId/pages/:pageNumber/image", async (request, reply) => {
    const pdfId = request.params.pdfId.trim();
    const pageNumber = Number(request.params.pageNumber);
    const width = Number(request.query.width ?? "1200");
    if (!pdfId || !Number.isFinite(pageNumber) || pageNumber < 1) {
      reply.code(400);
      return { error: "Parámetros inválidos." };
    }

    try {
      const refresh = String(request.query.refresh ?? "").trim() === "1";
      const bytes = await renderLibraryPdfPageImage(
        pdfId,
        pageNumber,
        width,
        refresh,
      );
      reply
        .header("Content-Type", "image/png")
        .header("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return reply.send(Buffer.from(bytes));
    } catch (error) {
      reply.code(502);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo renderizar la página.",
      };
    }
  });

  app.get<{
    Params: { pdfId: string; pageNumber: string };
    Querystring: { width?: string; refresh?: string };
  }>("/library/pdfs/:pdfId/pages/:pageNumber/text", async (request, reply) => {
    const pdfId = request.params.pdfId.trim();
    const pageNumber = Number(request.params.pageNumber);
    const width = Number(request.query.width ?? "1200");
    if (!pdfId || !Number.isFinite(pageNumber) || pageNumber < 1) {
      reply.code(400);
      return { error: "Parámetros inválidos." };
    }

    try {
      const refresh = String(request.query.refresh ?? "").trim() === "1";
      return {
        item: await getLibraryPdfPageTextLayout(pdfId, pageNumber, width, refresh),
      };
    } catch (error) {
      reply.code(502);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo leer la capa de texto.",
      };
    }
  });

  app.get<{
    Params: { pdfId: string };
    Querystring: { q?: string; refresh?: string };
  }>("/library/pdfs/:pdfId/search", async (request, reply) => {
    const pdfId = request.params.pdfId.trim();
    const query = request.query.q?.trim() ?? "";
    if (!pdfId || query.length === 0) {
      reply.code(400);
      return { error: "Debes enviar un término de búsqueda." };
    }

    try {
      const refresh = String(request.query.refresh ?? "").trim() === "1";
      const result = await searchLibraryPdfPages(pdfId, query, refresh);
      return { item: result };
    } catch (error) {
      reply.code(502);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo buscar dentro del PDF.",
      };
    }
  });

  app.get<{
    Params: { pdfId: string };
    Querystring: { refresh?: string };
  }>("/library/pdfs/:pdfId/file", async (request, reply) => {
    const pdfId = request.params.pdfId.trim();
    if (!pdfId) {
      reply.code(400);
      return {
        error: "El identificador del PDF es obligatorio.",
      };
    }

    try {
      const refresh = String(request.query.refresh ?? "").trim() === "1";
      const bytes = await loadLibraryPdfBytes(pdfId, refresh);
      reply.raw.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdfId}.pdf"`,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      });
      reply.raw.end(Buffer.from(bytes));
      return reply;
    } catch (error) {
      reply.code(502);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo abrir el PDF de la biblioteca.",
      };
    }
  });

  app.get<{
    Params: { pdfId: string };
    Querystring: { refresh?: string };
  }>("/library/pdfs/:pdfId/view", async (request, reply) => {
    const pdfId = request.params.pdfId.trim();
    if (!pdfId) {
      reply.code(400);
      return {
        error: "El identificador del PDF es obligatorio.",
      };
    }

    const refresh = String(request.query.refresh ?? "").trim() === "1";
    const pdfFileUrl = `/api/content/library/pdfs/${encodeURIComponent(pdfId)}/file${
      refresh ? "?refresh=1" : ""
    }`;

    reply.type("text/html; charset=utf-8");
    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(pdfId)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f1e8;
      --panel: #fffdf8;
      --ink: #1d1a2a;
      --muted: #746b87;
      --line: rgba(71, 61, 90, 0.14);
      --accent: #6d4fff;
      --accent2: #f1b54c;
    }
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      background: linear-gradient(180deg, #f7f1e8 0%, #f2eadf 100%);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      padding: 12px 14px;
      background: rgba(255, 253, 248, 0.94);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--line);
      box-shadow: 0 8px 24px rgba(29, 26, 42, 0.04);
    }
    .title {
      font-size: 15px;
      font-weight: 800;
      flex: 1 1 auto;
      min-width: 140px;
    }
    .toolbar input, .toolbar button {
      border-radius: 14px;
      border: 1px solid var(--line);
      background: white;
      color: var(--ink);
      padding: 10px 12px;
      font-size: 14px;
      outline: none;
    }
    .toolbar input {
      min-width: 110px;
    }
    .toolbar button.primary {
      background: linear-gradient(135deg, var(--accent), #845cff);
      color: white;
      border: 0;
      font-weight: 700;
    }
    .meta {
      font-size: 12px;
      color: var(--muted);
      padding: 0 14px 10px;
    }
    #status {
      font-size: 12px;
      color: var(--muted);
    }
    #viewer {
      flex: 1;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      padding: 16px 0 30px;
    }
    .page {
      width: min(100vw - 24px, 760px);
      margin: 0 auto 14px;
      background: white;
      border-radius: 18px;
      box-shadow: 0 10px 28px rgba(29, 26, 42, 0.08);
      border: 1px solid rgba(29, 26, 42, 0.08);
      overflow: hidden;
      scroll-margin-top: 120px;
    }
    .pageHeader {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      border-bottom: 1px solid rgba(29, 26, 42, 0.08);
      background: linear-gradient(180deg, #fff, #fbf7f2);
      font-size: 12px;
      color: var(--muted);
      font-weight: 700;
    }
    .pageCanvas {
      width: 100%;
      display: block;
      background: white;
    }
    .page.active {
      border-color: rgba(109, 79, 255, 0.34);
      box-shadow: 0 14px 34px rgba(109, 79, 255, 0.14);
    }
    .empty {
      padding: 28px 20px;
      text-align: center;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="title">${escapeHtml(pdfId)}</div>
    <button id="prev">Anterior</button>
    <button id="next">Siguiente</button>
    <input id="pageInput" inputmode="numeric" pattern="[0-9]*" placeholder="Página" />
    <button class="primary" id="go">Ir</button>
    <input id="searchInput" placeholder="Buscar texto" style="min-width: 160px; flex: 1 1 160px;" />
    <button id="searchBtn">Buscar</button>
    <button id="refreshBtn">Recargar</button>
    <button id="forceBtn">Forzar</button>
  </div>
  <div class="meta">
    <span id="status">Cargando visor...</span>
  </div>
  <div id="viewer"><div class="empty">Cargando PDF...</div></div>
  <script type="module">
    import * as pdfjsLib from '/api/content/library/pdfjs/build/pdf.mjs';
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/api/content/library/pdfjs/build/pdf.worker.mjs';

    const pdfUrl = ${JSON.stringify(pdfFileUrl)};
    const viewer = document.getElementById('viewer');
    const status = document.getElementById('status');
    const pageInput = document.getElementById('pageInput');
    const searchInput = document.getElementById('searchInput');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    const goBtn = document.getElementById('go');
    const searchBtn = document.getElementById('searchBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const forceBtn = document.getElementById('forceBtn');
    let pdfDoc = null;
    let pageCount = 0;
    let currentPage = 1;
    let activePage = null;
    let searchMatches = [];

    function setStatus(text) {
      status.textContent = text;
    }

    function setEmpty(message) {
      viewer.innerHTML = '<div class="empty">' + message + '</div>';
    }

    async function loadPdf(force = false) {
      setStatus('Cargando PDF...');
      viewer.scrollTop = 0;
      const url = force ? pdfUrl + (pdfUrl.includes('?') ? '&' : '?') + 'refresh=1' : pdfUrl;
      pdfDoc = await pdfjsLib.getDocument({
        url,
        withCredentials: true,
        cMapUrl: '/api/content/library/pdfjs/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: '/api/content/library/pdfjs/standard_fonts/',
      }).promise;
      pageCount = pdfDoc.numPages;
      currentPage = 1;
      pageInput.value = '1';
      searchMatches = [];
      viewer.innerHTML = '';
      for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
        const pageWrap = document.createElement('section');
        pageWrap.className = 'page';
        pageWrap.id = 'page-' + pageNum;
        pageWrap.dataset.page = String(pageNum);
        pageWrap.innerHTML = '<div class="pageHeader"><span>Página ' + pageNum + '</span><span class="pageStatus">renderizando...</span></div>';
        const canvas = document.createElement('canvas');
        canvas.className = 'pageCanvas';
        pageWrap.appendChild(canvas);
        viewer.appendChild(pageWrap);
      }
      setStatus('PDF cargado. Renderizando páginas...');
      await renderVisiblePages();
      setStatus('Documento listo. ' + pageCount + ' páginas.');
      if (!pageInput.value) {
        pageInput.value = '1';
      }
    }

    async function renderVisiblePages() {
      const pages = Array.from(viewer.querySelectorAll('.page'));
      for (const pageWrap of pages) {
        const pageNum = Number(pageWrap.dataset.page);
        const canvas = pageWrap.querySelector('canvas');
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.35 });
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.height = viewport.height + 'px';
        canvas.style.width = viewport.width + 'px';
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        await page.render({ canvasContext: ctx, viewport }).promise;
        pageWrap.querySelector('.pageStatus').textContent = 'lista';
      }
      observeActivePage();
    }

    function observeActivePage() {
      const observer = new IntersectionObserver((entries) => {
        let mostVisible = null;
        for (const entry of entries) {
          if (entry.isIntersecting && (!mostVisible || entry.intersectionRatio > mostVisible.intersectionRatio)) {
            mostVisible = entry;
          }
        }
        if (mostVisible) {
          setActivePage(Number(mostVisible.target.dataset.page));
        }
      }, { root: viewer, threshold: [0.25, 0.5, 0.75] });
      document.querySelectorAll('.page').forEach((el) => observer.observe(el));
    }

    function setActivePage(pageNum) {
      currentPage = pageNum;
      pageInput.value = String(pageNum);
      document.querySelectorAll('.page.active').forEach((el) => el.classList.remove('active'));
      activePage = document.getElementById('page-' + pageNum);
      if (activePage) {
        activePage.classList.add('active');
      }
    }

    function goToPage(pageNum) {
      if (!pageCount) return;
      const clamped = Math.min(Math.max(1, pageNum), pageCount);
      const target = document.getElementById('page-' + clamped);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActivePage(clamped);
      }
    }

    async function searchText(query) {
      searchMatches = [];
      const normalized = query.trim().toLowerCase();
      if (!normalized) {
        setStatus('Búsqueda limpia.');
        return;
      }
      setStatus('Buscando "' + query + '"...');
      for (let pageNum = 1; pageNum <= pageCount; pageNum += 1) {
        const page = await pdfDoc.getPage(pageNum);
        const text = await page.getTextContent();
        const fullText = text.items.map((item) => item.str).join(' ').toLowerCase();
        if (fullText.includes(normalized)) {
          searchMatches.push(pageNum);
        }
      }
      if (searchMatches.length === 0) {
        setStatus('Sin coincidencias para "' + query + '".');
        return;
      }
      setStatus(searchMatches.length + ' coincidencia(s). Mostrando la primera.');
      goToPage(searchMatches[0]);
    }

    prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
    goBtn.addEventListener('click', () => goToPage(Number(pageInput.value || '1')));
    pageInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') goToPage(Number(pageInput.value || '1'));
    });
    searchBtn.addEventListener('click', () => searchText(searchInput.value));
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') searchText(searchInput.value);
    });
    refreshBtn.addEventListener('click', () => loadPdf(false));
    forceBtn.addEventListener('click', () => loadPdf(true));

    loadPdf(false).catch((error) => {
      console.error(error);
      viewer.innerHTML = '<div class="empty">No se pudo cargar el PDF.</div>';
      setStatus(String(error?.message || error));
    });
  </script>
</body>
</html>`;
  });

  app.get<{ Params: { "*": string } }>("/library/pdfjs/*", async (request, reply) => {
    const requestedPath = request.params["*"]?.trim() ?? "";
    if (!requestedPath) {
      reply.code(404);
      return { error: "Archivo no encontrado." };
    }

    const normalized = requestedPath.replace(/^\/+/, "");
    const absolutePath = join(pdfJsRootDir, normalized);
    if (!absolutePath.startsWith(pdfJsRootDir)) {
      reply.code(400);
      return { error: "Ruta inválida." };
    }

    try {
      const bytes = await readFile(absolutePath);
      reply.header("Cache-Control", "public, max-age=86400");
      reply.type(getPdfJsContentType(absolutePath));
      return Buffer.from(bytes);
    } catch {
      reply.code(404);
      return { error: "Archivo no encontrado." };
    }
  });

  app.get("/daily", async () => {
    const home = await getHomePayload();

    return {
      cardOfTheDay: home.cardOfTheDay,
      astrologicalEnergy: home.astrologicalEnergy,
    };
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getPdfJsContentType(path: string): string {
  if (path.endsWith(".mjs") || path.endsWith(".js")) {
    return "application/javascript";
  }
  if (path.endsWith(".css")) {
    return "text/css";
  }
  if (path.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (path.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (path.endsWith(".png")) {
    return "image/png";
  }
  if (path.endsWith(".gif")) {
    return "image/gif";
  }
  if (path.endsWith(".json")) {
    return "application/json";
  }
  if (path.endsWith(".map")) {
    return "application/json";
  }
  return "application/octet-stream";
}

async function loadLibraryPdfBytes(
  pdfId: string,
  refresh = false,
): Promise<Uint8Array> {
  const cachePath = `library-cache/pdfs/${pdfId}.pdf`;
  if (!refresh && (await uploadFileExists(cachePath))) {
    return readUploadFile(cachePath);
  }

  const cachedPromise = refresh ? null : libraryPdfRequestCache.get(pdfId);
  if (cachedPromise) {
    return cachedPromise;
  }

  const requestPromise = fetchAndCacheLibraryPdf(pdfId, cachePath).finally(() => {
    libraryPdfRequestCache.delete(pdfId);
  });
  libraryPdfRequestCache.set(pdfId, requestPromise);
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

function looksLikePdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}
