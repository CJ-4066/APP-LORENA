import { useId, useRef, useState, type DragEvent } from "react";

type AdminUploadedMediaAsset = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  publicUrl: string;
  category: string;
  entityType: string | null;
  entityId: string | null;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
};

type AdminFileUploaderProps = {
  apiBaseUrl: string;
  label: string;
  description?: string;
  accept: string;
  mode?: "image" | "pdf" | "general";
  value: string;
  category: "product" | "course" | "library" | "lesson" | "general";
  entityType?: string;
  entityId?: string;
  onUploaded: (asset: AdminUploadedMediaAsset) => void;
  onClear: () => void;
};

function resolveMediaUrl(apiBaseUrl: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith("/uploads/")) {
        return new URL(`/api${parsed.pathname}${parsed.search}${parsed.hash}`, apiBaseUrl).toString();
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  if (/^(\/?uploads\/)/i.test(trimmed)) {
    const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return new URL(`/api${normalized}`, apiBaseUrl).toString();
  }

  return new URL(trimmed, apiBaseUrl.endsWith("/") ? apiBaseUrl : `${apiBaseUrl}/`).toString();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AdminFileUploader({
  apiBaseUrl,
  label,
  description,
  accept,
  mode = "general",
  value,
  category,
  entityType,
  entityId,
  onUploaded,
  onClear,
}: AdminFileUploaderProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handlePickFile(file: File | null) {
    setError(null);
    setMessage(null);
    setSelectedFile(file);
  }

  function startUpload() {
    if (!selectedFile || uploading) {
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${apiBaseUrl.replace(/\/+$/, "")}/api/admin/uploads`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      setProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onerror = () => {
      setUploading(false);
      setProgress(0);
      setError("No se pudo subir el archivo.");
    };

    xhr.onload = () => {
      setUploading(false);
      setProgress(0);

      try {
        const payload = JSON.parse(xhr.responseText) as {
          item?: AdminUploadedMediaAsset;
          error?: string;
        };

        if (xhr.status < 200 || xhr.status >= 300 || !payload.item) {
          setError(payload.error ?? "No se pudo subir el archivo.");
          return;
        }

        onUploaded(payload.item);
        setSelectedFile(null);
        setMessage("Archivo subido correctamente.");
      } catch {
        setError("No se pudo subir el archivo.");
      }
    };

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("category", category);
    if (entityType) {
      formData.append("entityType", entityType);
    }
    if (entityId) {
      formData.append("entityId", entityId);
    }

    setUploading(true);
    xhr.send(formData);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0] ?? null;
    if (file) {
      handlePickFile(file);
    }
  }

  const previewUrl = resolveMediaUrl(apiBaseUrl, value);
  const hasImagePreview = mode === "image" && previewUrl.length > 0;

  return (
    <div className="admin-uploader">
      <div className="admin-uploader-head">
        <div>
          <span>{label}</span>
          {description ? <p>{description}</p> : null}
        </div>
        <span className="topbar-pill">{mode === "pdf" ? "PDF" : mode === "image" ? "Imagen" : "Archivo"}</span>
      </div>

      <label
        className={`admin-uploader-dropzone ${selectedFile ? "is-filled" : ""}`}
        htmlFor={inputId}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          id={inputId}
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="admin-uploader-input"
          onChange={(event) => handlePickFile(event.target.files?.[0] ?? null)}
        />
        <div className="admin-uploader-preview">
          {hasImagePreview ? (
            <img src={previewUrl} alt={label} className="admin-uploader-image" />
          ) : (
            <div className="admin-uploader-placeholder">
              <strong>{mode === "pdf" ? "PDF" : "Archivo"}</strong>
              <p>
                {selectedFile
                  ? selectedFile.name
                  : value
                    ? value.split("/").pop() ?? value
                    : "Arrastra un archivo aquí"}
              </p>
            </div>
          )}
        </div>

        <div className="admin-uploader-body">
          <strong>{selectedFile ? selectedFile.name : value ? "Archivo cargado" : "Sin archivo"}</strong>
          <p>
            {selectedFile
              ? formatSize(selectedFile.size)
              : value
                ? value
                : "PNG, JPG, WEBP, SVG o PDF según el modo."}
          </p>
          <div className="admin-uploader-actions">
            <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>
              Seleccionar archivo
            </button>
            <button type="button" className="primary-button" onClick={startUpload} disabled={!selectedFile || uploading}>
              {uploading ? "Subiendo..." : "Subir archivo"}
            </button>
            {value ? (
              <button type="button" className="secondary-button" onClick={onClear}>
                Quitar archivo
              </button>
            ) : null}
          </div>
          {uploading ? (
            <div className="admin-uploader-progress">
              <span style={{ width: `${progress}%` }} />
            </div>
          ) : null}
          {message ? <p className="badge-feedback">{message}</p> : null}
          {error ? <p className="badge-feedback badge-feedback-error">{error}</p> : null}
        </div>
      </label>
    </div>
  );
}
