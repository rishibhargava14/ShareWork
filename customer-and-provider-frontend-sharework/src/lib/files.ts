import { apiBlob, getApiBaseUrl } from "@/lib/api";

export type StoredFileRef = {
  id: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  url?: string;
};

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function validateUploadFile(file: File) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("File too large. Max 25MB.");
  }
  const mime = file.type || "";
  const allowed = mime.startsWith("image/") || mime === "application/pdf" || mime.includes("zip");
  if (!allowed) {
    throw new Error("Invalid file type. Use images, PDF, or ZIP.");
  }
}

export function fileHref(file: StoredFileRef | string | null | undefined): string | null {
  if (!file) return null;
  if (typeof file === "string") {
    if (file.startsWith("/api/files/")) return `${getApiBaseUrl()}${file}`;
    return null;
  }
  if (file.url?.startsWith("/api/files/")) return `${getApiBaseUrl()}${file.url}`;
  if (file.id) return `${getApiBaseUrl()}/api/files/${file.id}`;
  return null;
}

export async function downloadStoredFile(file: StoredFileRef | string, fallbackName = "download") {
  const path = typeof file === "string" ? file : file.url || (file.id ? `/api/files/${file.id}` : "");
  if (!path.startsWith("/api/files/")) {
    throw new Error("Invalid file reference");
  }
  const { blob, filename } = await apiBlob(path);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename || (typeof file === "string" ? fallbackName : file.originalName) || fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function openStoredFile(file: StoredFileRef | string) {
  const path = typeof file === "string" ? file : file.url || (file.id ? `/api/files/${file.id}` : "");
  if (!path.startsWith("/api/files/")) {
    throw new Error("Invalid file reference");
  }
  const { blob, contentType } = await apiBlob(path);
  const objectUrl = URL.createObjectURL(blob);
  if (contentType.startsWith("image/") || contentType === "application/pdf") {
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return;
  }
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = typeof file === "string" ? "download" : file.originalName || "download";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
