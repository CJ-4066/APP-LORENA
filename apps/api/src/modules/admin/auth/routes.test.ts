import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL = "";
process.env.REDIS_URL = "";
process.env.ADMIN_EMAIL = "admin@lore.com";
process.env.ADMIN_PASSWORD = "Admin123!";
process.env.ADMIN_NAME = "Lore Admin";
process.env.ADMIN_JWT_SECRET = "test-admin-secret";

const { buildServer } = await import("../../../app.js");
const { getBadgeAuditLog } = await import("../../../data/badge-store.js");

const app = await buildServer();

function extractCookie(setCookie: string | string[] | undefined): string {
  if (!setCookie) {
    return "";
  }

  const value = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return value.split(";")[0] ?? "";
}

function buildMultipartBody(parts: Array<{
  fieldName: string;
  value: string | Buffer;
  fileName?: string;
  contentType?: string;
}>) {
  const boundary = `----codex-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const chunks: Buffer[] = [];

  for (const part of parts) {
    const header = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="${part.fieldName}"${part.fileName ? `; filename="${part.fileName}"` : ""}`,
      part.contentType ? `Content-Type: ${part.contentType}` : null,
      "",
      "",
    ]
      .filter((value): value is string => value != null)
      .join("\r\n");

    chunks.push(Buffer.from(header, "utf8"));
    chunks.push(Buffer.isBuffer(part.value) ? part.value : Buffer.from(part.value, "utf8"));
    chunks.push(Buffer.from("\r\n", "utf8"));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));
  return {
    body: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function getPathnameFromUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return new URL(value).pathname;
  }

  return value;
}

test.after(async () => {
  await app.close();
});

test("login correcto devuelve sesión válida y me responde el admin autenticado", async () => {
  const loginResponse = await app.inject({
    method: "POST",
    url: "/api/admin/auth/login",
    payload: {
      email: "admin@lore.com",
      password: "Admin123!",
    },
  });

  assert.equal(loginResponse.statusCode, 200);
  const loginJson = loginResponse.json() as {
    item: { email: string; name: string; role: string };
  };
  assert.equal(loginJson.item.email, "admin@lore.com");
  assert.equal(loginJson.item.name, "Lore Admin");
  assert.equal(loginJson.item.role, "admin");

  const cookie = extractCookie(loginResponse.headers["set-cookie"]);
  assert.ok(cookie.length > 0);

  const meResponse = await app.inject({
    method: "GET",
    url: "/api/admin/auth/me",
    headers: {
      cookie,
    },
  });

  assert.equal(meResponse.statusCode, 200);
  const meJson = meResponse.json() as {
    item: { email: string; name: string; role: string };
  };
  assert.equal(meJson.item.email, "admin@lore.com");
  assert.equal(meJson.item.name, "Lore Admin");
  assert.equal(meJson.item.role, "admin");
});

test("login incorrecto falla con error genérico", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/admin/auth/login",
    payload: {
      email: "admin@lore.com",
      password: "incorrecta",
    },
  });

  assert.equal(response.statusCode, 401);
  const json = response.json() as { error: string };
  assert.equal(json.error, "Credenciales inválidas.");
});

test("endpoint admin protegido devuelve 401 sin sesión", async () => {
  const response = await app.inject({
    method: "GET",
    url: "/api/admin/summary",
  });

  assert.equal(response.statusCode, 401);
});

test("endpoint admin protegido funciona con sesión admin", async () => {
  const loginResponse = await app.inject({
    method: "POST",
    url: "/api/admin/auth/login",
    payload: {
      email: "admin@lore.com",
      password: "Admin123!",
    },
  });
  const cookie = extractCookie(loginResponse.headers["set-cookie"]);

  const response = await app.inject({
    method: "GET",
    url: "/api/admin/summary",
    headers: {
      cookie,
    },
  });

  assert.equal(response.statusCode, 200);
  const json = response.json() as { item: { activeUsers: number } };
  assert.equal(typeof json.item.activeUsers, "number");
});

test("admin puede crear y eliminar un usuario de prueba", async () => {
  const loginResponse = await app.inject({
    method: "POST",
    url: "/api/admin/auth/login",
    payload: {
      email: "admin@lore.com",
      password: "Admin123!",
    },
  });
  const cookie = extractCookie(loginResponse.headers["set-cookie"]);
  const email = `usuario-prueba-${Date.now()}@lore.com`;
  const sharedContentUrls = [
    "/api/admin/courses",
    "/api/admin/shop/products",
    "/api/admin/library/pdfs",
  ];
  const getSharedContentIds = async () =>
    Promise.all(
      sharedContentUrls.map(async (url) => {
        const response = await app.inject({
          method: "GET",
          url,
          headers: { cookie },
        });
        assert.equal(response.statusCode, 200);
        const json = response.json() as {
          items: Array<{ id?: string; courseId?: string; pdfId?: string }>;
        };
        return json.items.map(
          (item) => item.id ?? item.courseId ?? item.pdfId ?? "",
        );
      }),
    );
  const sharedContentBefore = await getSharedContentIds();

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/admin/users",
    headers: { cookie },
    payload: {
      firstName: "Usuario",
      lastName: "Temporal",
      email,
      accountType: "client",
      roles: [],
    },
  });
  assert.equal(createResponse.statusCode, 201);
  const created = createResponse.json() as { item: { id: string } };

  const deleteResponse = await app.inject({
    method: "DELETE",
    url: `/api/admin/users/${created.item.id}`,
    headers: { cookie },
  });
  assert.equal(deleteResponse.statusCode, 200);
  const deleted = deleteResponse.json() as {
    ok: boolean;
    item: { id: string };
  };
  assert.equal(deleted.ok, true);
  assert.equal(deleted.item.id, created.item.id);

  const listResponse = await app.inject({
    method: "GET",
    url: `/api/admin/users?limit=50&search=${encodeURIComponent(email)}`,
    headers: { cookie },
  });
  assert.equal(listResponse.statusCode, 200);
  const listed = listResponse.json() as { items: Array<{ id: string }> };
  assert.equal(listed.items.some((item) => item.id === created.item.id), false);
  assert.deepEqual(await getSharedContentIds(), sharedContentBefore);
});

test("logout invalida la sesión admin", async () => {
  const loginResponse = await app.inject({
    method: "POST",
    url: "/api/admin/auth/login",
    payload: {
      email: "admin@lore.com",
      password: "Admin123!",
    },
  });
  const cookie = extractCookie(loginResponse.headers["set-cookie"]);

  const logoutResponse = await app.inject({
    method: "POST",
    url: "/api/admin/auth/logout",
    headers: {
      cookie,
    },
  });

  assert.equal(logoutResponse.statusCode, 200);

  const meResponse = await app.inject({
    method: "GET",
    url: "/api/admin/auth/me",
    headers: {
      cookie,
    },
  });

  assert.equal(meResponse.statusCode, 401);
});

test("auditoría usa changedBy con el admin autenticado", async () => {
  const loginResponse = await app.inject({
    method: "POST",
    url: "/api/admin/auth/login",
    payload: {
      email: "admin@lore.com",
      password: "Admin123!",
    },
  });
  const cookie = extractCookie(loginResponse.headers["set-cookie"]);
  const badgeId = `admin-badge-${Date.now()}`;

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/badges",
    headers: {
      cookie,
    },
    payload: {
      id: badgeId,
      name: "Badge de auditoría",
      description: "Prueba de auditoría admin",
      category: "AWARD",
      rarity: "RARE",
      type: "MANUAL",
      pathId: "award_path",
      pathOrder: 7,
      stepIndex: 1,
      stepTitle: "Reconocimiento",
      stepDescription: "Audit admin badge",
      prerequisiteBadgeIds: [],
      lockedReason: "Audit admin badge",
      isPathVisible: true,
      isConditionHidden: false,
      iconUrl: "/assets/badges/admin-badge.svg",
      isSecret: false,
      isActive: false,
      rules: [],
    },
  });

  assert.equal(createResponse.statusCode, 201);

  const auditEntries = await getBadgeAuditLog({ badgeId });
  assert.ok(auditEntries.length > 0);
  assert.match(auditEntries[0].changedBy, /Lore Admin/);
});

test("admin puede actualizar especialista y operar disponibilidad protegida", async () => {
  const loginResponse = await app.inject({
    method: "POST",
    url: "/api/admin/auth/login",
    payload: {
      email: "admin@lore.com",
      password: "Admin123!",
    },
  });
  const cookie = extractCookie(loginResponse.headers["set-cookie"]);

  const specialistResponse = await app.inject({
    method: "PATCH",
    url: "/api/admin/specialists/spec-amaya",
    headers: {
      cookie,
    },
    payload: {
      isActive: true,
      isPublic: true,
      publicName: "Amaya Rivas",
    },
  });

  assert.equal(specialistResponse.statusCode, 200);

  const createAvailabilityResponse = await app.inject({
    method: "POST",
    url: "/api/admin/specialists/spec-amaya/availability",
    headers: {
      cookie,
    },
    payload: {
      startsAt: "2026-08-01T15:00:00.000Z",
      endsAt: "2026-08-01T16:00:00.000Z",
      mode: "chat",
      isAvailable: true,
    },
  });

  assert.equal(createAvailabilityResponse.statusCode, 201);
  const createdAvailability = createAvailabilityResponse.json() as {
    item: { id: string; isAvailable: boolean };
  };
  assert.equal(createdAvailability.item.isAvailable, true);

  const updateAvailabilityResponse = await app.inject({
    method: "PATCH",
    url: `/api/admin/specialists/spec-amaya/availability/${createdAvailability.item.id}`,
    headers: {
      cookie,
    },
    payload: {
      startsAt: "2026-08-01T16:00:00.000Z",
      endsAt: "2026-08-01T17:00:00.000Z",
      mode: "chat",
      isAvailable: false,
    },
  });

  assert.equal(updateAvailabilityResponse.statusCode, 200);
  const updatedAvailability = updateAvailabilityResponse.json() as {
    item: { isAvailable: boolean };
  };
  assert.equal(updatedAvailability.item.isAvailable, false);

  const deleteAvailabilityResponse = await app.inject({
    method: "DELETE",
    url: `/api/admin/specialists/spec-amaya/availability/${createdAvailability.item.id}`,
    headers: {
      cookie,
    },
  });

  assert.equal(deleteAvailabilityResponse.statusCode, 204);
});

test("cursos admin soportan crear, publicar y exponer solo publicados en público", async () => {
  const loginResponse = await app.inject({
    method: "POST",
    url: "/api/admin/auth/login",
    payload: {
      email: "admin@lore.com",
      password: "Admin123!",
    },
  });
  const cookie = extractCookie(loginResponse.headers["set-cookie"]);
  const courseId = `course-${Date.now()}`;

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/admin/courses",
    headers: {
      cookie,
    },
    payload: {
      id: courseId,
      title: "Curso de prueba",
      subtitle: "Borrador inicial",
      category: "Pruebas",
      level: "Inicial",
      premium: false,
      featured: false,
      removable: true,
      estimatedHours: 2,
      progressPercent: 0,
      hook: "Hook de prueba",
      description: "Descripción de prueba",
      outcomes: ["Uno", "Dos"],
      status: "draft",
      coverImageUrl: "",
    },
  });
  assert.equal(createResponse.statusCode, 201);

  const publicBeforePublish = await app.inject({
    method: "GET",
    url: "/api/content/courses",
  });
  assert.equal(publicBeforePublish.statusCode, 200);
  const publicBeforeJson = publicBeforePublish.json() as { items: Array<{ id: string }> };
  assert.ok(!publicBeforeJson.items.some((item) => item.id === courseId));

  const publishResponse = await app.inject({
    method: "POST",
    url: `/api/admin/courses/${courseId}/publish`,
    headers: {
      cookie,
    },
  });
  assert.equal(publishResponse.statusCode, 200);

  const moduleResponse = await app.inject({
    method: "POST",
    url: `/api/admin/courses/${courseId}/modules`,
    headers: {
      cookie,
    },
    payload: {
      title: "Módulo 1",
      summary: "Resumen módulo",
      durationMinutes: 45,
      order: 1,
      status: "published",
      isActive: true,
    },
  });
  assert.equal(moduleResponse.statusCode, 201);

  const moduleJson = moduleResponse.json() as {
    item: { modules: Array<{ id: string; lessons: unknown[] }> };
  };
  const moduleId = moduleJson.item.modules[0]?.id;
  assert.ok(moduleId);

  const lessonResponse = await app.inject({
    method: "POST",
    url: `/api/admin/courses/${courseId}/modules/${moduleId}/lessons`,
    headers: {
      cookie,
    },
    payload: {
      title: "Lección 1",
      format: "video",
      durationMinutes: 12,
      prompt: "Prompt de prueba",
      content: "Contenido",
      resourceUrl: "",
      order: 1,
      status: "published",
      isActive: true,
    },
  });
  assert.equal(lessonResponse.statusCode, 201);

  const resourceResponse = await app.inject({
    method: "POST",
    url: "/api/admin/course-resources",
    headers: {
      cookie,
    },
    payload: {
      courseId,
      title: "Recurso 1",
      kind: "link",
      description: "Recurso de prueba",
      url: "https://example.com/recurso",
      status: "published",
      isActive: true,
    },
  });
  assert.equal(resourceResponse.statusCode, 201);

  const pdfResponse = await app.inject({
    method: "POST",
    url: "/api/admin/library/pdfs",
    headers: {
      cookie,
    },
    payload: {
      title: "Guía del curso",
      description: "PDF de prueba",
      fileUrl: "https://example.com/guia.pdf",
      courseId,
      category: "Guías",
      pageCount: 12,
      status: "published",
      isActive: true,
    },
  });
  assert.equal(pdfResponse.statusCode, 201);

  const detailResponse = await app.inject({
    method: "GET",
    url: `/api/admin/courses/${courseId}`,
    headers: {
      cookie,
    },
  });
  assert.equal(detailResponse.statusCode, 200);
  const detailJson = detailResponse.json() as {
    item: { modules: Array<{ lessons: Array<{ title: string }> }> };
  };
  assert.equal(detailJson.item.modules[0]?.lessons[0]?.title, "Lección 1");

  const publicAfterPublish = await app.inject({
    method: "GET",
    url: "/api/content/courses",
  });
  assert.equal(publicAfterPublish.statusCode, 200);
  const publicAfterJson = publicAfterPublish.json() as {
    items: Array<{
      id: string;
      modules: Array<{ lessons: Array<{ title: string; format: string; resourceUrl?: string }> }>;
    }>;
  };
  const publicCourse = publicAfterJson.items.find((item) => item.id === courseId);
  assert.ok(publicCourse);
  const publicLessons = publicCourse.modules.flatMap((module) => module.lessons);
  assert.ok(
    publicLessons.some(
      (lesson) =>
        lesson.title === "Recurso 1" &&
        lesson.format === "link" &&
        lesson.resourceUrl === "https://example.com/recurso",
    ),
  );

  const auditResponse = await app.inject({
    method: "GET",
    url: `/api/admin/courses/${courseId}/audit-log`,
    headers: {
      cookie,
    },
  });
  assert.equal(auditResponse.statusCode, 200);
  const auditJson = auditResponse.json() as {
    items: Array<{
      courseId: string;
      entityType: string;
      action: string;
      fieldChanged: string;
      changedAt: string;
    }>;
  };
  assert.ok(auditJson.items.length >= 5);
  assert.equal(auditJson.items[0]?.courseId, courseId);
  assert.ok([
    "course",
    "course_module",
    "course_lesson",
    "course_resource",
    "library_pdf",
  ].includes(auditJson.items[0]?.entityType ?? ""));
  assert.equal(typeof auditJson.items[0]?.changedAt, "string");
  assert.ok(auditJson.items.some((item) => item.entityType === "course_module"));
  assert.ok(auditJson.items.some((item) => item.entityType === "course_lesson"));
  assert.ok(auditJson.items.some((item) => item.entityType === "course_resource"));
  assert.ok(auditJson.items.some((item) => item.entityType === "library_pdf"));
});

test("biblioteca PDF admin permite crear y listar", async () => {
  const loginResponse = await app.inject({
    method: "POST",
    url: "/api/admin/auth/login",
    payload: {
      email: "admin@lore.com",
      password: "Admin123!",
    },
  });
  const cookie = extractCookie(loginResponse.headers["set-cookie"]);

  const createResponse = await app.inject({
    method: "POST",
    url: "/api/admin/library/pdfs",
    headers: {
      cookie,
    },
    payload: {
      title: "Guía PDF",
      description: "Documento de prueba",
      fileUrl: "https://example.com/guia.pdf",
      category: "Guías",
      pageCount: 12,
      status: "published",
      isActive: true,
    },
  });
  assert.equal(createResponse.statusCode, 201);

  const listResponse = await app.inject({
    method: "GET",
    url: "/api/admin/library/pdfs",
    headers: {
      cookie,
    },
  });
  assert.equal(listResponse.statusCode, 200);
  const listJson = listResponse.json() as { items: Array<{ title: string }> };
  assert.ok(listJson.items.some((item) => item.title === "Guía PDF"));
});

test("admin puede subir archivos y servirlos públicamente", async () => {
  const loginResponse = await app.inject({
    method: "POST",
    url: "/api/admin/auth/login",
    payload: {
      email: "admin@lore.com",
      password: "Admin123!",
    },
  });
  const cookie = extractCookie(loginResponse.headers["set-cookie"]);

  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+b1t0AAAAASUVORK5CYII=",
    "base64",
  );
  const multipart = buildMultipartBody([
    {
      fieldName: "category",
      value: "product",
    },
    {
      fieldName: "entityType",
      value: "shop_product",
    },
    {
      fieldName: "entityId",
      value: "product-test",
    },
    {
      fieldName: "file",
      value: pngBytes,
      fileName: "producto.png",
      contentType: "image/png",
    },
  ]);

  const uploadResponse = await app.inject({
    method: "POST",
    url: "/api/admin/uploads",
    headers: {
      cookie,
      "content-type": multipart.contentType,
    },
    payload: multipart.body,
  });

  assert.equal(uploadResponse.statusCode, 201);
  const uploadJson = uploadResponse.json() as {
    item: {
      id: string;
      publicUrl: string;
      mimeType: string;
      uploadedBy: string;
      category: string;
      entityType: string | null;
      entityId: string | null;
    };
  };
  assert.equal(uploadJson.item.mimeType, "image/png");
  assert.equal(uploadJson.item.category, "product");
  assert.equal(uploadJson.item.entityType, "shop_product");
  assert.equal(uploadJson.item.entityId, "product-test");
  assert.ok(uploadJson.item.publicUrl.includes("/uploads/products/"));

  const detailResponse = await app.inject({
    method: "GET",
    url: `/api/admin/uploads/${uploadJson.item.id}`,
    headers: {
      cookie,
    },
  });
  assert.equal(detailResponse.statusCode, 200);

  const publicPath = getPathnameFromUrl(uploadJson.item.publicUrl);
  const publicResponse = await app.inject({
    method: "GET",
    url: publicPath,
  });
  assert.equal(publicResponse.statusCode, 200);
  assert.equal(publicResponse.headers["content-type"], "image/png");
  assert.equal(publicResponse.headers["accept-ranges"], "bytes");

  const rangeResponse = await app.inject({
    method: "GET",
    url: publicPath,
    headers: {
      range: "bytes=0-7",
    },
  });
  assert.equal(rangeResponse.statusCode, 206);
  assert.equal(
    rangeResponse.headers["content-range"],
    `bytes 0-7/${pngBytes.byteLength}`,
  );
  assert.equal(rangeResponse.headers["content-length"], "8");
  assert.deepEqual(rangeResponse.rawPayload, pngBytes.subarray(0, 8));

  const invalidRangeResponse = await app.inject({
    method: "GET",
    url: publicPath,
    headers: {
      range: `bytes=${pngBytes.byteLength}-`,
    },
  });
  assert.equal(invalidRangeResponse.statusCode, 416);
  assert.equal(
    invalidRangeResponse.headers["content-range"],
    `bytes */${pngBytes.byteLength}`,
  );

  const listResponse = await app.inject({
    method: "GET",
    url: "/api/admin/uploads?category=product",
    headers: {
      cookie,
    },
  });
  assert.equal(listResponse.statusCode, 200);
  const listJson = listResponse.json() as { items: Array<{ id: string }> };
  assert.ok(listJson.items.some((item) => item.id === uploadJson.item.id));

  const deleteResponse = await app.inject({
    method: "DELETE",
    url: `/api/admin/uploads/${uploadJson.item.id}`,
    headers: {
      cookie,
    },
  });
  assert.equal(deleteResponse.statusCode, 200);
});

test("admin puede subir videos de cursos y servirlos públicamente", async () => {
  const loginResponse = await app.inject({
    method: "POST",
    url: "/api/admin/auth/login",
    payload: {
      email: "admin@lore.com",
      password: "Admin123!",
    },
  });
  const cookie = extractCookie(loginResponse.headers["set-cookie"]);

  const mp4Bytes = Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
    0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
    0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
  ]);
  const multipart = buildMultipartBody([
    {
      fieldName: "category",
      value: "course",
    },
    {
      fieldName: "entityType",
      value: "course",
    },
    {
      fieldName: "entityId",
      value: "course-video-test",
    },
    {
      fieldName: "file",
      value: mp4Bytes,
      fileName: "clase.mp4",
      contentType: "video/mp4",
    },
  ]);

  const uploadResponse = await app.inject({
    method: "POST",
    url: "/api/admin/uploads",
    headers: {
      cookie,
      "content-type": multipart.contentType,
    },
    payload: multipart.body,
  });

  assert.equal(uploadResponse.statusCode, 201);
  const uploadJson = uploadResponse.json() as {
    item: {
      publicUrl: string;
      mimeType: string;
      category: string;
      storagePath: string;
    };
  };
  assert.equal(uploadJson.item.mimeType, "video/mp4");
  assert.equal(uploadJson.item.category, "course");
  assert.ok(uploadJson.item.publicUrl.includes("/uploads/courses/"));
  assert.ok(uploadJson.item.storagePath.endsWith(".mp4"));

  const publicResponse = await app.inject({
    method: "GET",
    url: getPathnameFromUrl(uploadJson.item.publicUrl),
  });
  assert.equal(publicResponse.statusCode, 200);
  assert.equal(publicResponse.headers["content-type"], "video/mp4");
});
