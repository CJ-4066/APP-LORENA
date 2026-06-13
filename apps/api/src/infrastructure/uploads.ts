import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

import { getAppEnv } from "./env.js";

export function getUploadRootDir(): string {
  return resolve(process.cwd(), getAppEnv().uploadDir);
}

export function getUploadPublicPrefix(): string {
  const prefix = getAppEnv().uploadPublicPath.trim();
  if (!prefix.startsWith("/")) {
    return `/${prefix}`;
  }

  return prefix.replace(/\/+$/u, "");
}

export function getResolvedPublicUrl(publicPath: string): string {
  const trimmed = publicPath.trim();
  if (trimmed.length === 0) {
    return "";
  }

  const baseUrl = getAppEnv().storagePublicBaseUrl?.trim() ?? "";
  if (baseUrl.length > 0) {
    return new URL(
      trimmed.startsWith("/") ? trimmed : `/${trimmed}`,
      baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
    ).toString();
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function resolveUploadStoragePath(storagePath: string): string {
  const root = getUploadRootDir();
  const normalized = storagePath.replaceAll("\\", "/").replace(/^\/+/, "");
  const resolved = resolve(root, normalized);
  if (!resolved.startsWith(root + sep) && resolved !== root) {
    throw new Error("La ruta de almacenamiento no es válida.");
  }

  return resolved;
}

export async function ensureUploadDir(storagePath: string): Promise<string> {
  const absolutePath = resolveUploadStoragePath(storagePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  return absolutePath;
}

export async function writeUploadFile(
  storagePath: string,
  bytes: Uint8Array,
): Promise<void> {
  const absolutePath = await ensureUploadDir(storagePath);
  await writeFile(absolutePath, bytes);
}

export async function readUploadFile(storagePath: string): Promise<Uint8Array> {
  const absolutePath = resolveUploadStoragePath(storagePath);
  return readFile(absolutePath);
}

export async function deleteUploadFile(storagePath: string): Promise<void> {
  const absolutePath = resolveUploadStoragePath(storagePath);
  await rm(absolutePath, { force: true });
}

export async function uploadFileExists(storagePath: string): Promise<boolean> {
  try {
    await stat(resolveUploadStoragePath(storagePath));
    return true;
  } catch {
    return false;
  }
}

export function getUploadStoragePath(category: string, fileName: string): string {
  return join(category, fileName).replaceAll("\\", "/");
}
