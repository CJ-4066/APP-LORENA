#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ROOT_DIR = process.env.PDFAPP_DIR || "/Users/mark/Desktop/PDFAPP  ";
const SSH_HOST = process.env.SSH_HOST || "187.127.248.226";
const SSH_USER = process.env.SSH_USER || "root";
const SSH_PASSWORD = process.env.SSH_PASSWORD || "Pr0j3ct00r1g1n@l";
const REMOTE_UPLOAD_DIR =
  process.env.REMOTE_UPLOAD_DIR ||
  "/root/app-de-lorena/apps/api/uploads/library/pdfs";
const DB_NAME = process.env.DB_NAME || "lo_renaciente";

function quoteSql(value) {
  return String(value).replaceAll("'", "''");
}

function buildStableId(filePath) {
  return `pdf-${createHash("sha1").update(filePath).digest("hex").slice(0, 20)}`;
}

async function walkPdfs(rootDir) {
  const pdfs = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const currentDir = queue.pop();
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (entry.isFile() && /\.pdf$/i.test(entry.name)) {
        pdfs.push(fullPath);
      }
    }
  }

  pdfs.sort((left, right) => left.localeCompare(right));
  return pdfs;
}

async function ssh(command, options = {}) {
  return execFileAsync(
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
      command,
    ],
    {
      env: { ...process.env, SSHPASS: SSH_PASSWORD },
      maxBuffer: 1024 * 1024 * 50,
      ...options,
    },
  );
}

async function rsyncDir(localDir, remoteDir) {
  return execFileAsync(
    "sshpass",
    [
      "-e",
      "rsync",
      "-aL",
      "--delete",
      "-e",
      "ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o StrictHostKeyChecking=accept-new",
      `${localDir}/`,
      `${SSH_USER}@${SSH_HOST}:${remoteDir}/`,
    ],
    {
      env: { ...process.env, SSHPASS: SSH_PASSWORD },
      maxBuffer: 1024 * 1024 * 50,
    },
  );
}

async function main() {
  console.log(`Leyendo PDFs desde ${ROOT_DIR}`);
  const pdfs = await walkPdfs(ROOT_DIR);
  console.log(`PDFs locales detectados: ${pdfs.length}`);

  const sql =
    "select pdf_id from library_pdfs where file_url like '/uploads/library-cache/%';";
  const { stdout: badIdsOutput } = await ssh(
    `sudo -u postgres psql -d ${DB_NAME} -Atc ${JSON.stringify(sql)}`,
  );
  const badIds = new Set(
    badIdsOutput
      .split(/\r?\n/u)
      .map((item) => item.trim())
      .filter(Boolean),
  );
  console.log(`Registros heredados a reparar: ${badIds.size}`);

  const matches = [];
  for (const filePath of pdfs) {
    const relPath = relative(ROOT_DIR, filePath);
    const id = buildStableId(relPath);
    if (badIds.has(id)) {
      matches.push({ id, filePath });
    }
  }

  if (matches.length !== badIds.size) {
    throw new Error(
      `No coinciden los archivos locales (${matches.length}) con los registros rotos (${badIds.size}).`,
    );
  }

  const stagingDir = await mkdtemp(join(tmpdir(), "lorena-library-repair-"));
  try {
    console.log(`Preparando staging en ${stagingDir}`);
    for (const item of matches) {
      const stagedPath = join(stagingDir, `${item.id}.pdf`);
      try {
        await symlink(item.filePath, stagedPath);
      } catch {
        await rm(stagedPath, { force: true });
        await symlink(item.filePath, stagedPath);
      }
    }

    console.log(`Asegurando directorio remoto ${REMOTE_UPLOAD_DIR}`);
    await ssh(`mkdir -p '${REMOTE_UPLOAD_DIR}'`);

    console.log("Copiando PDFs reparados al servidor...");
    await rsyncDir(stagingDir, REMOTE_UPLOAD_DIR);

    console.log("Actualizando file_url en PostgreSQL...");
    const updateSql = `begin;
${matches
  .map(
    (item) =>
      `update library_pdfs set file_url = '/uploads/library/pdfs/${quoteSql(
        item.id,
      )}.pdf', updated_at = now() where pdf_id = '${quoteSql(item.id)}';`,
  )
  .join("\n")}
commit;
`;
    await ssh(`sudo -u postgres psql -d ${DB_NAME} -v ON_ERROR_STOP=1`, {
      input: updateSql,
    });

    console.log(`Reparacion completada. PDFs corregidos: ${matches.length}`);
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
}

await main();
