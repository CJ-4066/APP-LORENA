sed -i '' 's/format: string;/format: string;\n  mediaType?: string;\n  mimeType?: string | null;/g' apps/api/src/data/mock-store.ts
sed -i '' 's/kind: string;/kind: string;\n  mediaType?: string;\n  mimeType?: string | null;/g' apps/api/src/data/mock-store.ts
