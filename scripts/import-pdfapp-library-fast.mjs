#!/usr/bin/env node
import { mkdtemp, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const ROOT_DIR = process.env.PDFAPP_DIR || "/Users/mark/Desktop/PDFAPP";
const SSH_HOST = process.env.SSH_HOST || "187.127.248.226";
const SSH_USER = process.env.SSH_USER || "root";
const SSH_PASSWORD = process.env.SSH_PASSWORD || "Pr0j3ct00r1g1n@l";
const execFileAsync = promisify(execFile);
const stagingDir = await mkdtemp(join(tmpdir(), "pdfapp-fast-"));

function normalizeCategory(folderName) {
  return folderName.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildStableId(filePath) {
  return `pdf-${createHash("sha1").update(filePath).digest("hex").slice(0, 20)}`;
}

function prettifyTitle(fileName) {
  const baseName = fileName.replace(/\.[^.]+$/u, "");
  return baseName.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim() || "PDF";
}

async function walkPdfs(rootDir) {
  const categories = [];
  const entries = await readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folder = entry.name;
    const pdfs = [];
    const queue = [join(rootDir, folder)];
    while (queue.length > 0) {
      const current = queue.pop();
      const items = await readdir(current, { withFileTypes: true });
      for (const item of items) {
        const full = join(current, item.name);
        if (item.isDirectory()) {
          queue.push(full);
        } else if (item.isFile() && /\.pdf$/i.test(item.name)) {
          pdfs.push(full);
        }
      }
    }
    pdfs.sort((a, b) => a.localeCompare(b));
    if (pdfs.length > 0) {
      categories.push({ folder, category: normalizeCategory(folder), pdfs });
    }
  }
  categories.sort((a, b) => a.category.localeCompare(b.category));
  return categories;
}

function quoteSql(value) {
  return String(value).replaceAll("'", "''");
}

function spawnWithInput(command, args, input, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], ...options });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || stdout || `Command failed: ${command} ${args.join(" ")}`));
      }
    });
    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

async function ensureRemotePath(path) {
  await execFileAsync("sshpass", [
    "-e",
    "ssh",
    "-o",
    "PreferredAuthentications=password",
    "-o",
    "PubkeyAuthentication=no",
    "-o",
    "StrictHostKeyChecking=accept-new",
    `${SSH_USER}@${SSH_HOST}`,
    `mkdir -p '${path}'`,
  ], {
    env: { ...process.env, SSHPASS: SSH_PASSWORD },
    maxBuffer: 1024 * 1024,
  });
}

async function copyToRemote(localDir, remoteDir) {
  await execFileAsync("sshpass", [
    "-e",
    "rsync",
    "-aL",
    "--delete",
    "-e",
    "ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=accept-new",
    `${localDir}/`,
    `${SSH_USER}@${SSH_HOST}:${remoteDir}/`,
  ], {
    env: { ...process.env, SSHPASS: SSH_PASSWORD },
    maxBuffer: 1024 * 1024 * 20,
  });
}

const rootStat = await stat(ROOT_DIR).catch(() => null);
if (!rootStat || !rootStat.isDirectory()) {
  throw new Error(`No encuentro la carpeta ${ROOT_DIR}`);
}

const categories = await walkPdfs(ROOT_DIR);
console.log(`Carpetas detectadas: ${categories.length}`);

const items = [];
for (const group of categories) {
  console.log(`- ${group.folder}: ${group.pdfs.length} PDFs -> category=${group.category}`);
  for (const filePath of group.pdfs) {
    const id = buildStableId(relative(ROOT_DIR, filePath));
    const fileName = basename(filePath);
    const stagedPath = join(stagingDir, `${id}.pdf`);
    try {
      await symlink(filePath, stagedPath);
    } catch {
      // ignore and try again after cleanup
      await rm(stagedPath, { force: true });
      await symlink(filePath, stagedPath);
    }
    items.push({
      id,
      title: prettifyTitle(fileName),
      category: group.category,
      sourcePath: filePath,
      stagedPath,
    });
  }
}

await ensureRemotePath("/var/www/lo-renaciente/api/uploads/library/pdfs");
await ensureRemotePath("/var/www/lo-renaciente/api/uploads/library-cache/rendered");
await ensureRemotePath("/var/www/lo-renaciente/api/uploads/library-cache/text");

console.log("Limpiando cache derivada en el servidor...");
await spawnWithInput(
  "sshpass",
  [
    "-e",
    "ssh",
    "-o",
    "PreferredAuthentications=password",
    "-o",
    "PubkeyAuthentication=no",
    "-o",
    "StrictHostKeyChecking=accept-new",
    `${SSH_USER}@${SSH_HOST}`,
    "rm -rf /var/www/lo-renaciente/api/uploads/library-cache/rendered /var/www/lo-renaciente/api/uploads/library-cache/text && mkdir -p /var/www/lo-renaciente/api/uploads/library/pdfs /var/www/lo-renaciente/api/uploads/library-cache/rendered /var/www/lo-renaciente/api/uploads/library-cache/text",
  ],
  "",
  { env: { ...process.env, SSHPASS: SSH_PASSWORD }, maxBuffer: 1024 * 1024 * 10 },
);

console.log("Copiando PDFs al servidor...");
await copyToRemote(stagingDir, "/var/www/lo-renaciente/api/uploads/library/pdfs");

console.log("Escribiendo biblioteca en PostgreSQL...");
const now = new Date().toISOString();
const sql = `
begin;
delete from library_pdfs;
insert into library_pdfs (
  pdf_id,
  title,
  description,
  file_url,
  course_id,
  module_id,
  lesson_id,
  category,
  page_count,
  status,
  is_active,
  created_at,
  updated_at
) values
${items.map((item) => `(
  '${quoteSql(item.id)}',
  '${quoteSql(item.title)}',
  '',
  '/uploads/library/pdfs/${quoteSql(item.id)}.pdf',
  null,
  null,
  null,
  '${quoteSql(item.category)}',
  0,
  'published',
  true,
  '${now}',
  '${now}'
)`).join(",\n")}
on conflict (pdf_id) do update set
  title = excluded.title,
  description = excluded.description,
  file_url = excluded.file_url,
  course_id = excluded.course_id,
  module_id = excluded.module_id,
  lesson_id = excluded.lesson_id,
  category = excluded.category,
  page_count = excluded.page_count,
  status = excluded.status,
  is_active = excluded.is_active,
  updated_at = excluded.updated_at;
commit;
`;

await spawnWithInput(
  "sshpass",
  [
    "-e",
    "ssh",
    "-o",
    "PreferredAuthentications=password",
    "-o",
    "PubkeyAuthentication=no",
    "-o",
    "StrictHostKeyChecking=accept-new",
    `${SSH_USER}@${SSH_HOST}`,
    "sudo -u postgres psql -d lo_renaciente -v ON_ERROR_STOP=1",
  ],
  sql,
  { env: { ...process.env, SSHPASS: SSH_PASSWORD }, maxBuffer: 1024 * 1024 * 10 },
);

await rm(stagingDir, { recursive: true, force: true });
console.log(`Importación rápida completada. PDFs procesados: ${items.length}`);
