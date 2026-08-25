export type CourseMediaType =
  | "image"
  | "video"
  | "pdf"
  | "canva"
  | "external_link"
  | "document"
  | "unknown";

export function normalizeMediaType(
  kindOrFormat?: string | null,
  url?: string | null,
  mimeType?: string | null
): CourseMediaType {
  const normalized = (kindOrFormat ?? "").trim().toLowerCase();
  const lowercaseUrl = (url ?? "").trim().toLowerCase();
  const mime = (mimeType ?? "").trim().toLowerCase();

  // 1. First priority: explicit valid normalized mediaType
  if (["image", "video", "pdf", "canva", "external_link", "document"].includes(normalized)) {
    return normalized as CourseMediaType;
  }

  // 2. Second priority: legacy format mappings
  if (normalized === "link") return "external_link";
  if (normalized === "file") return "document";
  if (normalized === "imagen") return "image";

  // 3. Third priority: MIME type inspection (if provided from upload)
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  if (
    mime.includes("document") || 
    mime.includes("msword") || 
    mime.includes("presentation") || 
    mime.includes("powerpoint")
  ) {
    return "document";
  }

  // 4. Fourth priority: URL extension fallback
  if (lowercaseUrl.includes("canva.com")) {
    return "canva";
  }
  if (lowercaseUrl.endsWith(".pdf") || lowercaseUrl.includes("/pdf")) {
    return "pdf";
  }
  if (/\.(png|jpe?g|webp|gif|svg)(\?|#|$)/.test(lowercaseUrl)) {
    return "image";
  }
  if (/\.(mp4|m4v|mov|webm)(\?|#|$)/.test(lowercaseUrl) || lowercaseUrl.includes("video")) {
    return "video";
  }

  if (lowercaseUrl.startsWith("http://") || lowercaseUrl.startsWith("https://")) {
    return "external_link";
  }

  return "unknown";
}
