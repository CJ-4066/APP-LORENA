#!/usr/bin/env node
import { mkdtemp, readdir, readFile, rm, stat, symlink } from "node:fs/promises";
import { join, relative, basename, extname, dirname } from "node:path";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const ROOT_DIR = process.env.PDFAPP_DIR || "/Users/mark/Desktop/PDFAPP";
const API_BASE_URL = (process.env.API_BASE_URL || "https://lorenaciente.com").replace(/\/+$/, "");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@lore.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123!";
const CONCURRENCY = Math.max(1, Number(process.env.IMPORT_CONCURRENCY || "3"));
const FILE_TIMEOUT_SECONDS = Math.max(30, Number(process.env.FILE_TIMEOUT_SECONDS || "120"));
const STAGING_DIR = await mkdtemp(join(tmpdir(), "pdfapp-import-"));
const execFileAsync = promisify(execFile);

function prettifyTitle(fileName) {
  const baseName = fileName.replace(/\.[^.]+$/u, "");
  const normalized = baseName
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0 ? normalized : "PDF";
}

function normalizeCategory(folderName) {
  return folderName.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildStableId(filePath) {
  return `pdf-${createHash("sha1").update(filePath).digest("hex").slice(0, 20)}`;
}

async function walkPdfs(rootDir) {
  const categories = [];
  const entries = await readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const categoryDir = join(rootDir, entry.name);
    const pdfs = [];
    const queue = [categoryDir];

    while (queue.length > 0) {
      const currentDir = queue.pop();
      const items = await readdir(currentDir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = join(currentDir, item.name);
        if (item.isDirectory()) {
          queue.push(fullPath);
          continue;
        }

        if (item.isFile() && /\.(pdf)$/i.test(item.name)) {
          pdfs.push(fullPath);
        }
      }
    }

    pdfs.sort((a, b) => a.localeCompare(b));
    if (pdfs.length > 0) {
      categories.push({
        category: normalizeCategory(entry.name),
        folder: entry.name,
        pdfs,
      });
    }
  }

  categories.sort((left, right) => left.category.localeCompare(right.category));
  return categories;
}

async function login() {
  const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login falló: ${response.status} ${await response.text()}`);
  }

  const setCookie = response.headers.get("set-cookie") || "";
  const token = setCookie.match(/admin_session=([^;]+)/)?.[1];
  if (!token) {
    throw new Error("No pude leer la cookie admin_session.");
  }

  return token;
}

async function uploadPdf({ cookie, category, filePath, pdfId }) {
  const fileName = basename(filePath);
  const relativePath = relative(ROOT_DIR, filePath);
  const id = pdfId || buildStableId(relativePath);
  const stagedPath = join(STAGING_DIR, `${id}.pdf`);
  try {
    await symlink(filePath, stagedPath);
  } catch {
    await rm(stagedPath, { force: true });
    await symlink(filePath, stagedPath);
  }

  const payloadText = await execFileAsync(
    "curl",
    [
      "-sS",
      "--http1.1",
      "--max-time",
      String(FILE_TIMEOUT_SECONDS),
      "--fail",
      "--cookie",
      `admin_session=${cookie}`,
      "-X",
      "POST",
      `${API_BASE_URL}/api/admin/library/pdfs`,
      "-F",
      `id=${id}`,
      "-F",
      `title=${prettifyTitle(fileName)}`,
      "-F",
      "description=",
      "-F",
      `category=${category}`,
      "-F",
      "status=published",
      "-F",
      "isActive=true",
      "-F",
      "skipAnalysis=true",
      "-F",
      `file=@${stagedPath};type=application/pdf`,
    ],
    { maxBuffer: 1024 * 1024 * 20 },
  ).then((result) => result.stdout);

  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    payload = { raw: payloadText };
  }

  if (!payload.item) {
    throw new Error(
      `Upload error en ${relativePath}: ${JSON.stringify(payload)}`,
    );
  }

  return {
    id,
    title: prettifyTitle(fileName),
    category,
    fileUrl: payload.item?.fileUrl || "",
  };
}

async function runPool(items, worker) {
  const results = [];
  const failures = [];
  let cursor = 0;
  async function next() {
    const index = cursor++;
    if (index >= items.length) {
      return;
    }
    try {
      results[index] = await worker(items[index], index);
    } catch (error) {
      failures[index] = error instanceof Error ? error.message : String(error);
    }
    return next();
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => next());
  await Promise.all(workers);
  return { results, failures };
}

const rootStat = await stat(ROOT_DIR).catch(() => null);
if (!rootStat || !rootStat.isDirectory()) {
  throw new Error(`No encuentro la carpeta ${ROOT_DIR}`);
}

const categories = await walkPdfs(ROOT_DIR);
if (categories.length === 0) {
  console.log(`No encontré PDFs en ${ROOT_DIR}`);
  process.exit(0);
}

console.log(`Carpetas detectadas: ${categories.length}`);
for (const item of categories) {
  console.log(`- ${item.folder}: ${item.pdfs.length} PDFs -> category=${item.category}`);
}

const cookie = await login();
console.log("Login OK.");

let total = 0;
for (const group of categories) {
  console.log(`Importando ${group.folder}...`);
  const { results, failures } = await runPool(group.pdfs, async (filePath) => {
    const result = await uploadPdf({ cookie, category: group.category, filePath });
    total += 1;
    console.log(`  [${total}] ${group.category} :: ${basename(filePath)}`);
    return result;
  });

  const okCount = results.filter(Boolean).length;
  const failCount = failures.filter(Boolean).length;
  console.log(`Terminado ${group.folder}: ${okCount}/${group.pdfs.length}`);
  if (failCount > 0) {
    console.log(`  Omitidos en ${group.folder}: ${failCount}`);
  }
}
console.log(`Importación completada. PDFs procesados: ${total}`);
await rm(STAGING_DIR, { recursive: true, force: true });
