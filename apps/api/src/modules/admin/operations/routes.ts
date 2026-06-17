import type { FastifyInstance } from "fastify";

import { createMediaAsset } from "../../../data/media-store.js";
import { getSpecialists } from "../../../data/mock-store.js";
import { getAdminDashboardSummary } from "../../../data/admin-store.js";
import {
  archiveCourse,
  createServiceOffer,
  createCourse,
  createCourseLesson,
  createCourseModule,
  createBooking,
  createShopProduct,
  getAdminEntityAuditLog,
  getAdminCourseById,
  getAdminCourses,
  getCourseAuditLog,
  getAdminSpecialistById,
  getAllBookingsAdmin,
  getAllShopOrdersAdmin,
  getAllShopProductsAdmin,
  getShopProductAuditLog,
  getProfile,
  getLibraryPdfById,
  listAdminSpecialists,
  listCourseResources,
  listLibraryPdfs,
  publishCourse,
  type ShopProductAuditMeta,
  type LibraryPdfRecord,
  listServices,
  deleteCourseLesson,
  deleteCourseModule,
  deleteCourseResource,
  deleteLibraryPdf,
  updateAdminSpecialist,
  updateCourse,
  updateCourseLesson,
  updateCourseModule,
  updateBooking,
  updateServiceOffer,
  updateShopOrderStatus,
  updateShopProduct,
  unpublishCourse,
  upsertCourseResource,
  upsertLibraryPdf,
  type AdminAuditMeta,
  type CreateServiceOfferInput,
  type CreateShopProductInput,
  type CreateBookingInput,
  type UpdateBookingInput,
  type UpdateSpecialistAdminInput,
  type UpdateServiceOfferInput,
  type UpdateShopOrderStatusInput,
  type UpdateShopProductInput,
} from "../../../data/persistent-store.js";
import { getLibraryPdfMetadata } from "../../content/library-pdf-renderer.js";
import { emitContentChanged } from "../../content/content-events.js";
import {
  deleteSpecialistAvailability,
  getSpecialistAvailability,
  upsertSpecialistAvailability,
  type UpsertSpecialistAvailabilityInput,
} from "../../../data/scheduling-store.js";
import { requireAdminSession } from "../../shared/admin-auth.js";

function getAdminError(replyCode: number, hasPermission: boolean): string {
  if (replyCode === 403) {
    return "No tienes permisos de admin.";
  }

  return hasPermission ? "No se pudo completar la acción." : "Falta la sesión de admin.";
}

function buildAdminAuditMeta(admin: {
  id: string;
  email: string;
  name: string;
}): AdminAuditMeta {
  return {
    actorType: "admin",
    actorId: admin.id,
    source: "admin",
    changedBy: admin.name || admin.email || admin.id,
  };
}

function parseBooleanField(value: unknown, fallback: boolean): boolean {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false;
  }

  return fallback;
}

function parseNumberField(value: unknown, fallback: number): number {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeLibraryPdfFormStatus(value: unknown, fallback = "draft"): "draft" | "published" {
  if (value === "published" || value === "draft") {
    return value;
  }
  return fallback === "published" ? "published" : "draft";
}

function normalizeLibraryPdfCategory(value: unknown, fallback = "General"): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function isSupportedLibraryDocumentMime(mimeType: string): boolean {
  const normalized = mimeType.trim().toLowerCase();
  return (
    normalized === "application/pdf" ||
    normalized === "application/msword" ||
    normalized === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

function normalizeNullableLibraryPdfRelation(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function prettifyFileTitle(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/u, "");
  const normalized = baseName
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0 ? normalized : "PDF";
}

async function finalizeLibraryPdfPageCount(
  item: LibraryPdfRecord,
  auditMeta: AdminAuditMeta,
): Promise<LibraryPdfRecord> {
  try {
    const metadata = await getLibraryPdfMetadata(item.id, true);
    if (metadata.pageCount > 0 && metadata.pageCount !== item.pageCount) {
      return upsertLibraryPdf(
        {
          ...item,
          pageCount: metadata.pageCount,
        },
        auditMeta,
      );
    }
  } catch {
    // If the document cannot be analyzed yet, keep the uploaded record.
  }

  return item;
}

async function readLibraryPdfInput(
  request: any,
  uploadedBy: string,
  pdfId?: string,
): Promise<Partial<LibraryPdfRecord>> {
  const existing = pdfId ? await getLibraryPdfById(pdfId) : null;
  const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
  const isMultipart = contentType.includes("multipart/form-data");

  if (!isMultipart) {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const hasCourseId = Object.prototype.hasOwnProperty.call(body, "courseId");
    const hasModuleId = Object.prototype.hasOwnProperty.call(body, "moduleId");
    const hasLessonId = Object.prototype.hasOwnProperty.call(body, "lessonId");
    return {
      id: pdfId ?? (typeof body.id === "string" ? body.id.trim() : ""),
      title: typeof body.title === "string" ? body.title.trim() : existing?.title ?? "",
      description:
        typeof body.description === "string"
          ? body.description.trim()
          : existing?.description ?? "",
      fileUrl:
        typeof body.fileUrl === "string"
          ? body.fileUrl.trim()
          : existing?.fileUrl ?? "",
      courseId: hasCourseId
        ? normalizeNullableLibraryPdfRelation(body.courseId)
        : existing?.courseId ?? null,
      moduleId: hasModuleId
        ? normalizeNullableLibraryPdfRelation(body.moduleId)
        : existing?.moduleId ?? null,
      lessonId: hasLessonId
        ? normalizeNullableLibraryPdfRelation(body.lessonId)
        : existing?.lessonId ?? null,
      category: normalizeLibraryPdfCategory(body.category, existing?.category ?? "General"),
      pageCount: parseNumberField(body.pageCount, existing?.pageCount ?? 0),
      status: normalizeLibraryPdfFormStatus(body.status ?? existing?.status ?? "draft", existing?.status === "published" ? "published" : "draft"),
      isActive: parseBooleanField(body.isActive, existing?.isActive ?? true),
    };
  }

  const fields: Record<string, string> = {};
  let filePart:
    | {
        filename: string;
        mimetype: string;
        bytes: Uint8Array;
      }
    | null = null;

  for await (const part of request.parts()) {
    if (part.type === "file") {
      filePart = {
        filename: part.filename,
        mimetype: part.mimetype,
        bytes: new Uint8Array(await part.toBuffer()),
      };
    } else {
      fields[part.fieldname] = String(part.value ?? "");
    }
  }

  let fileUrl = fields.fileUrl?.trim() || existing?.fileUrl || "";
  const hasCourseId = Object.prototype.hasOwnProperty.call(fields, "courseId");
  const hasModuleId = Object.prototype.hasOwnProperty.call(fields, "moduleId");
  const hasLessonId = Object.prototype.hasOwnProperty.call(fields, "lessonId");
  if (filePart) {
    const asset = await createMediaAsset(
      {
        originalName: filePart.filename,
        mimeType: filePart.mimetype,
        sizeBytes: filePart.bytes.byteLength,
        category: "library",
        entityType: "library_pdf",
        entityId: (pdfId ?? fields.id?.trim()) || null,
        uploadedBy,
      },
      filePart.bytes,
    );

    fileUrl = asset.publicUrl;
  }

  return {
    id: (pdfId ?? fields.id?.trim()) || undefined,
    title: fields.title?.trim() || existing?.title || "",
    description: fields.description?.trim() || existing?.description || "",
    fileUrl,
    courseId: hasCourseId
      ? normalizeNullableLibraryPdfRelation(fields.courseId)
      : existing?.courseId || null,
    moduleId: hasModuleId
      ? normalizeNullableLibraryPdfRelation(fields.moduleId)
      : existing?.moduleId || null,
    lessonId: hasLessonId
      ? normalizeNullableLibraryPdfRelation(fields.lessonId)
      : existing?.lessonId || null,
    category: normalizeLibraryPdfCategory(fields.category, existing?.category ?? "General"),
    pageCount: parseNumberField(fields.pageCount, existing?.pageCount ?? 0),
    status: normalizeLibraryPdfFormStatus(
      fields.status ?? existing?.status ?? "draft",
      existing?.status === "published" ? "published" : "draft",
    ),
    isActive: parseBooleanField(fields.isActive, existing?.isActive ?? true),
  };
}

async function createOrUpdateLibraryPdf(
  input: Partial<LibraryPdfRecord>,
  auditMeta: AdminAuditMeta,
): Promise<LibraryPdfRecord> {
  if (!input.title?.trim()) {
    throw new Error("El título del PDF es obligatorio.");
  }

  if (!input.fileUrl?.trim()) {
    throw new Error("Debes subir un PDF antes de guardar.");
  }

  const item = await upsertLibraryPdf(input, auditMeta);
  return finalizeLibraryPdfPageCount(item, auditMeta);
}

export async function registerAdminOperationsRoutes(app: FastifyInstance) {
  app.get("/specialists", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const services = await listServices({ includeInactive: true });
    const bookings = await getAllBookingsAdmin();
    const specialists = (await listAdminSpecialists()).map((specialist) => {
      const specialistServices = services.filter((service) =>
        service.specialistIds.includes(specialist.id),
      );
      const specialistBookings = bookings.filter(
        (booking) => booking.specialistId === specialist.id,
      );

      return {
        ...specialist,
        isVisible: specialist.isPublic,
        serviceCount: specialistServices.length,
        bookingCount: specialistBookings.length,
        recentBookings: specialistBookings.slice(0, 5),
        services: specialistServices,
      };
    });

    return { items: specialists };
  });

  app.get<{ Params: { specialistId: string } }>("/specialists/:specialistId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const specialist = await getAdminSpecialistById(request.params.specialistId);
    if (!specialist) {
      reply.code(404);
      return { error: "El especialista no existe." };
    }

    const services = await listServices({ includeInactive: true });
    const bookings = await getAllBookingsAdmin();
    const specialistServices = services.filter((service) =>
      service.specialistIds.includes(specialist.id),
    );
    const specialistBookings = bookings.filter(
      (booking) => booking.specialistId === specialist.id,
    );

    return {
      item: {
        ...specialist,
        isVisible: specialist.isPublic,
        serviceCount: specialistServices.length,
        bookingCount: specialistBookings.length,
        services: specialistServices,
        bookings: specialistBookings.slice(0, 20),
      },
    };
  });

  app.patch<{
    Params: { specialistId: string };
    Body: UpdateSpecialistAdminInput;
  }>("/specialists/:specialistId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await updateAdminSpecialist(
        request.params.specialistId,
        request.body ?? {},
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "specialist",
        action: "updated",
        entityId: item.id,
        actor: admin.email,
      });
      return {
        item: {
          ...item,
          isVisible: item.isPublic,
        },
      };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el especialista.",
      };
    }
  });

  app.get<{ Params: { specialistId: string } }>("/specialists/:specialistId/services", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const specialist = await getAdminSpecialistById(request.params.specialistId);
    if (!specialist) {
      reply.code(404);
      return { error: "El especialista no existe." };
    }

    const services = (await listServices({ includeInactive: true })).filter((service) =>
      service.specialistIds.includes(specialist.id),
    );
    return { items: services };
  });

  app.post<{
    Params: { specialistId: string };
    Body: CreateServiceOfferInput;
  }>("/specialists/:specialistId/services", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await createServiceOffer(
        request.params.specialistId,
        request.body ?? {},
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "service",
        action: "created",
        entityId: item.id,
        actor: admin.email,
      });
      reply.code(201);
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo crear el servicio.",
      };
    }
  });

  app.patch<{
    Params: { specialistId: string; serviceId: string };
    Body: UpdateServiceOfferInput;
  }>("/specialists/:specialistId/services/:serviceId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const service = (await listServices({ includeInactive: true })).find(
      (item) => item.id === request.params.serviceId,
    );
    if (!service || !service.specialistIds.includes(request.params.specialistId)) {
      reply.code(404);
      return { error: "El servicio no existe." };
    }

    try {
      const item = await updateServiceOffer(
        request.params.serviceId,
        request.body ?? {},
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "service",
        action: "updated",
        entityId: item.id,
        actor: admin.email,
      });
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo actualizar el servicio.",
      };
    }
  });

  app.get<{ Params: { specialistId: string } }>("/specialists/:specialistId/bookings", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const specialistBookings = (await getAllBookingsAdmin()).filter(
      (booking) => booking.specialistId === request.params.specialistId,
    );

    return { items: specialistBookings };
  });

  app.get<{ Params: { specialistId: string } }>("/specialists/:specialistId/availability", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    return {
      items: await getSpecialistAvailability(request.params.specialistId, {}),
    };
  });

  app.post<{
    Params: { specialistId: string };
    Body: UpsertSpecialistAvailabilityInput;
  }>("/specialists/:specialistId/availability", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await upsertSpecialistAvailability(
        {
          ...(request.body ?? {}),
          specialistId: request.params.specialistId,
        },
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "specialist",
        action: "updated",
        entityId: item.id,
        actor: admin.email,
      });
      reply.code(201);
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo guardar la disponibilidad.",
      };
    }
  });

  app.patch<{
    Params: { specialistId: string; availabilityId: string };
    Body: UpsertSpecialistAvailabilityInput;
  }>("/specialists/:specialistId/availability/:availabilityId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await upsertSpecialistAvailability(
        {
          ...(request.body ?? {}),
          id: request.params.availabilityId,
          specialistId: request.params.specialistId,
        },
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "specialist",
        action: "updated",
        entityId: item.id,
        actor: admin.email,
      });
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la disponibilidad.",
      };
    }
  });

  app.delete<{ Params: { specialistId: string; availabilityId: string } }>(
    "/specialists/:specialistId/availability/:availabilityId",
    async (request, reply) => {
      const admin = await requireAdminSession(request, reply);
      if (!admin) {
        return { error: getAdminError(reply.statusCode, false) };
      }

      try {
        await deleteSpecialistAvailability(
          request.params.availabilityId,
          request.params.specialistId,
          buildAdminAuditMeta(admin),
        );
        emitContentChanged({
          entity: "specialist",
          action: "deleted",
          entityId: request.params.availabilityId,
          actor: admin.email,
        });
        reply.code(204);
        return null;
      } catch (error) {
        reply.code(400);
        return {
          error:
            error instanceof Error ? error.message : "No se pudo eliminar la disponibilidad.",
        };
      }
    },
  );

  app.get<{ Params: { specialistId: string } }>(
    "/specialists/:specialistId/audit-log",
    async (request, reply) => {
      const admin = await requireAdminSession(request, reply);
      if (!admin) {
        return { error: getAdminError(reply.statusCode, false) };
      }

      return {
        items: await getAdminEntityAuditLog({
          specialistId: request.params.specialistId,
          limit: 100,
        }),
      };
    },
  );

  app.get("/orders", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    return { items: await getAllShopOrdersAdmin() };
  });

  app.get<{ Params: { orderId: string } }>("/orders/:orderId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const order = (await getAllShopOrdersAdmin()).find(
      (item) => item.id === request.params.orderId,
    );
    if (!order) {
      reply.code(404);
      return { error: "La orden no existe." };
    }

    return { item: order };
  });

  app.patch<{ Params: { orderId: string }; Body: UpdateShopOrderStatusInput }>(
    "/orders/:orderId",
    async (request, reply) => {
      const admin = await requireAdminSession(request, reply);
      if (!admin) {
        return { error: getAdminError(reply.statusCode, false) };
      }

    const order = (await getAllShopOrdersAdmin()).find(
        (item) => item.id === request.params.orderId,
      );
      if (!order) {
        reply.code(404);
        return { error: "La orden no existe." };
      }

      try {
        const item = await updateShopOrderStatus(
          request.params.orderId,
          request.body ?? { status: order.status },
          order.userId,
        );
        return { item };
      } catch (error) {
        reply.code(400);
        return {
          error:
            error instanceof Error ? error.message : "No se pudo actualizar la orden.",
        };
      }
    },
  );

  app.patch<{ Params: { bookingId: string }; Body: UpdateBookingInput }>(
    "/bookings/:bookingId",
    async (request, reply) => {
      const admin = await requireAdminSession(request, reply);
      if (!admin) {
        return { error: getAdminError(reply.statusCode, false) };
      }

      const booking = (await getAllBookingsAdmin()).find(
        (item) => item.id === request.params.bookingId,
      );
      if (!booking) {
        reply.code(404);
        return { error: "La reserva no existe." };
      }

      try {
        const item = await updateBooking(
          request.params.bookingId,
          request.body ?? {},
          booking.userId,
        );
        emitContentChanged({
          entity: "booking",
          action: "updated",
          entityId: item.id,
          actor: admin.email,
        });
        return { item };
      } catch (error) {
        reply.code(400);
        return {
          error:
            error instanceof Error ? error.message : "No se pudo actualizar la reserva.",
        };
      }
    },
  );

  app.post<{ Body: CreateBookingInput & { userId?: string } }>("/bookings", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const userId = request.body?.userId?.trim();
    if (!userId) {
      reply.code(400);
      return { error: "Selecciona un usuario para crear la reserva." };
    }

      try {
      const item = await createBooking(
        {
          serviceId: request.body?.serviceId,
          specialistId: request.body?.specialistId,
          scheduledAt: request.body?.scheduledAt,
          mode: request.body?.mode,
          notes: request.body?.notes,
        },
        userId,
      );
      emitContentChanged({
        entity: "booking",
        action: "created",
        entityId: item.id,
        actor: admin.email,
      });
      reply.code(201);
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo crear la reserva.",
      };
    }
  });

  app.get("/shop/products", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    return { items: await getAllShopProductsAdmin() };
  });

  app.post<{ Body: CreateShopProductInput & { specialistProfileId?: string } }>(
    "/shop/products",
    async (request, reply) => {
      const admin = await requireAdminSession(request, reply);
      if (!admin) {
        return { error: getAdminError(reply.statusCode, false) };
      }

      const specialistProfileId =
        request.body?.specialistProfileId?.trim() ||
        getSpecialists()[0]?.id ||
        "";
      if (!specialistProfileId) {
        reply.code(400);
        return { error: "Selecciona un especialista." };
      }

      try {
        const item = await createShopProduct(
          request.body ?? {},
          specialistProfileId,
          {
            actorType: "admin",
            actorId: admin.id,
            source: "admin",
          } satisfies ShopProductAuditMeta,
        );
        emitContentChanged({
          entity: "shopProduct",
          action: "created",
          entityId: item.id,
          actor: admin.email,
        });
        reply.code(201);
        return { item };
      } catch (error) {
        reply.code(400);
        return {
          error:
            error instanceof Error ? error.message : "No se pudo crear el producto.",
        };
      }
    },
  );

  app.patch<{ Params: { productId: string }; Body: UpdateShopProductInput }>(
    "/shop/products/:productId",
    async (request, reply) => {
      const admin = await requireAdminSession(request, reply);
      if (!admin) {
        return { error: getAdminError(reply.statusCode, false) };
      }

      try {
        const item = await updateShopProduct(
          request.params.productId,
          request.body ?? {},
          { isAdmin: true },
          {
            actorType: "admin",
            actorId: admin.id,
            source: "admin",
          } satisfies ShopProductAuditMeta,
        );
        emitContentChanged({
          entity: "shopProduct",
          action: "updated",
          entityId: item.id,
          actor: admin.email,
        });
        return { item };
      } catch (error) {
        reply.code(400);
        return {
          error:
            error instanceof Error ? error.message : "No se pudo actualizar el producto.",
        };
      }
    },
  );

  app.get<{ Params: { productId: string } }>("/shop/products/:productId/audit-log", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    return {
      items: await getShopProductAuditLog({
        productId: request.params.productId,
      }),
    };
  });

  app.get("/courses", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    return {
      items: getAdminCourses(),
    };
  });

  app.get<{ Params: { courseId: string } }>("/courses/:courseId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const item = getAdminCourseById(request.params.courseId);
    if (!item) {
      reply.code(404);
      return { error: "El curso no existe." };
    }

    return { item };
  });

  app.get<{ Params: { courseId: string } }>("/courses/:courseId/audit-log", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const item = getAdminCourseById(request.params.courseId);
    if (!item) {
      reply.code(404);
      return { error: "El curso no existe." };
    }

    return {
      items: await getCourseAuditLog({
        courseId: request.params.courseId,
      }),
    };
  });

  app.post<{ Body: Record<string, unknown> }>("/courses", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await createCourse(request.body as never, buildAdminAuditMeta(admin));
      emitContentChanged({
        entity: "course",
        action: "created",
        entityId: item.id,
        actor: admin.email,
      });
      reply.code(201);
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo crear el curso.",
      };
    }
  });

  app.patch<{ Params: { courseId: string }; Body: Record<string, unknown> }>("/courses/:courseId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await updateCourse(
        request.params.courseId,
        request.body as never,
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "course",
        action: "updated",
        entityId: item.id,
        actor: admin.email,
      });
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo actualizar el curso.",
      };
    }
  });

  app.delete<{ Params: { courseId: string } }>("/courses/:courseId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await archiveCourse(request.params.courseId, buildAdminAuditMeta(admin));
      emitContentChanged({
        entity: "course",
        action: "archived",
        entityId: item.id,
        actor: admin.email,
      });
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo archivar el curso.",
      };
    }
  });

  app.post<{ Params: { courseId: string } }>("/courses/:courseId/publish", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await publishCourse(request.params.courseId, buildAdminAuditMeta(admin));
      emitContentChanged({
        entity: "course",
        action: "published",
        entityId: item.id,
        actor: admin.email,
      });
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo publicar el curso.",
      };
    }
  });

  app.post<{ Params: { courseId: string } }>("/courses/:courseId/unpublish", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await unpublishCourse(request.params.courseId, buildAdminAuditMeta(admin));
      emitContentChanged({
        entity: "course",
        action: "unpublished",
        entityId: item.id,
        actor: admin.email,
      });
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo pasar el curso a borrador.",
      };
    }
  });

  app.get<{ Params: { courseId: string } }>("/courses/:courseId/modules", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const item = getAdminCourseById(request.params.courseId);
    if (!item) {
      reply.code(404);
      return { error: "El curso no existe." };
    }

    return { items: item.modules };
  });

  app.post<{ Params: { courseId: string }; Body: Record<string, unknown> }>("/courses/:courseId/modules", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await createCourseModule(
        request.params.courseId,
        request.body as never,
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "course",
        action: "updated",
        entityId: request.params.courseId,
        actor: admin.email,
      });
      reply.code(201);
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo crear el módulo.",
      };
    }
  });

  app.patch<{ Params: { courseId: string; moduleId: string }; Body: Record<string, unknown> }>("/courses/:courseId/modules/:moduleId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await updateCourseModule(
        request.params.courseId,
        request.params.moduleId,
        request.body as never,
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "course",
        action: "updated",
        entityId: request.params.courseId,
        actor: admin.email,
      });
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo actualizar el módulo.",
      };
    }
  });

  app.delete<{ Params: { courseId: string; moduleId: string } }>("/courses/:courseId/modules/:moduleId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await deleteCourseModule(
        request.params.courseId,
        request.params.moduleId,
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "course",
        action: "updated",
        entityId: request.params.courseId,
        actor: admin.email,
      });
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo eliminar el módulo.",
      };
    }
  });

  app.get<{ Params: { courseId: string; moduleId: string } }>("/courses/:courseId/modules/:moduleId/lessons", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const item = getAdminCourseById(request.params.courseId);
    if (!item) {
      reply.code(404);
      return { error: "El curso no existe." };
    }

    const module = item.modules.find((entry) => entry.id === request.params.moduleId);
    if (!module) {
      reply.code(404);
      return { error: "El módulo no existe." };
    }

    return { items: module.lessons };
  });

  app.post<{ Params: { courseId: string; moduleId: string }; Body: Record<string, unknown> }>("/courses/:courseId/modules/:moduleId/lessons", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await createCourseLesson(
        request.params.courseId,
        request.params.moduleId,
        request.body as never,
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "course",
        action: "updated",
        entityId: request.params.courseId,
        actor: admin.email,
      });
      reply.code(201);
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo crear la lección.",
      };
    }
  });

  app.patch<{ Params: { courseId: string; moduleId: string; lessonId: string }; Body: Record<string, unknown> }>("/courses/:courseId/modules/:moduleId/lessons/:lessonId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await updateCourseLesson(
        request.params.courseId,
        request.params.moduleId,
        request.params.lessonId,
        request.body as never,
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "course",
        action: "updated",
        entityId: request.params.courseId,
        actor: admin.email,
      });
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo actualizar la lección.",
      };
    }
  });

  app.delete<{ Params: { courseId: string; moduleId: string; lessonId: string } }>("/courses/:courseId/modules/:moduleId/lessons/:lessonId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await deleteCourseLesson(
        request.params.courseId,
        request.params.moduleId,
        request.params.lessonId,
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "course",
        action: "updated",
        entityId: request.params.courseId,
        actor: admin.email,
      });
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo eliminar la lección.",
      };
    }
  });

  app.get<{ Querystring: { courseId?: string } }>("/course-resources", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    return {
      items: listCourseResources(request.query.courseId),
    };
  });

  app.post<{ Body: Record<string, unknown> }>("/course-resources", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const courseId = String((request.body as { courseId?: string }).courseId ?? "").trim();
    if (!courseId) {
      reply.code(400);
      return { error: "Selecciona un curso." };
    }

    try {
      const item = await upsertCourseResource(
        courseId,
        request.body as never,
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "course",
        action: "updated",
        entityId: courseId,
        actor: admin.email,
      });
      reply.code(201);
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo crear el recurso.",
      };
    }
  });

  app.patch<{ Params: { courseId: string; resourceId: string }; Body: Record<string, unknown> }>("/course-resources/:courseId/:resourceId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const item = await upsertCourseResource(
        request.params.courseId,
        {
          ...(request.body as Record<string, unknown>),
          id: request.params.resourceId,
        } as never,
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "course",
        action: "updated",
        entityId: request.params.courseId,
        actor: admin.email,
      });
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo actualizar el recurso.",
      };
    }
  });

  app.delete<{ Params: { courseId: string; resourceId: string } }>("/course-resources/:courseId/:resourceId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      await deleteCourseResource(
        request.params.courseId,
        request.params.resourceId,
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "course",
        action: "updated",
        entityId: request.params.courseId,
        actor: admin.email,
      });
      return { ok: true };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo eliminar el recurso.",
      };
    }
  });

  app.get("/library/pdfs", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const items = (await listLibraryPdfs()).filter(
      (item) => item.status !== "archived" && item.isActive !== false,
    );
    return { items };
  });

  app.get<{ Params: { pdfId: string } }>("/library/pdfs/:pdfId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const item = await getLibraryPdfById(request.params.pdfId);
    if (!item) {
      reply.code(404);
      return { error: "El PDF no existe." };
    }

    return { item };
  });

  app.post("/library/pdfs", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const input = await readLibraryPdfInput(request, buildAdminAuditMeta(admin).changedBy);
      const item = await createOrUpdateLibraryPdf(input, buildAdminAuditMeta(admin));
      emitContentChanged({
        entity: "libraryPdf",
        action: item.status === "published" ? "published" : "updated",
        entityId: item.id,
        actor: admin.email,
      });
      reply.code(201);
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo guardar el PDF.",
      };
    }
  });

  app.post("/library/pdfs/bulk", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const fields: Record<string, string> = {};
    const files: Array<{ filename: string; mimetype: string; bytes: Uint8Array }> = [];

    for await (const part of request.parts()) {
      if (part.type === "file") {
        files.push({
          filename: part.filename,
          mimetype: part.mimetype,
          bytes: new Uint8Array(await part.toBuffer()),
        });
      } else {
        fields[part.fieldname] = String(part.value ?? "");
      }
    }

    if (files.length === 0) {
      reply.code(400);
      return { error: "Selecciona uno o más archivos PDF." };
    }

    const uploadedBy = buildAdminAuditMeta(admin).changedBy;
    const auditMeta = buildAdminAuditMeta(admin);
    const items: LibraryPdfRecord[] = [];
    const failures: Array<{ fileName: string; error: string }> = [];

    for (const filePart of files) {
      try {
        const asset = await createMediaAsset(
          {
            originalName: filePart.filename,
            mimeType: filePart.mimetype,
            sizeBytes: filePart.bytes.byteLength,
            category: "library",
            entityType: "library_pdf",
            entityId: null,
            uploadedBy,
          },
          filePart.bytes,
        );

        const item = await createOrUpdateLibraryPdf(
          {
            title:
              fields.titlePrefix?.trim().length
                ? `${fields.titlePrefix.trim()} ${prettifyFileTitle(filePart.filename)}`
                : prettifyFileTitle(filePart.filename),
            description: fields.description?.trim() ?? "",
            fileUrl: asset.publicUrl,
            courseId: fields.courseId?.trim() || null,
            moduleId: fields.moduleId?.trim() || null,
            lessonId: fields.lessonId?.trim() || null,
            category: normalizeLibraryPdfCategory(fields.category, "General"),
            pageCount: parseNumberField(fields.pageCount, 0),
            status: normalizeLibraryPdfFormStatus(fields.status ?? "published", "published"),
            isActive: parseBooleanField(fields.isActive, true),
          },
          auditMeta,
        );
        emitContentChanged({
          entity: "libraryPdf",
          action: item.status === "published" ? "published" : "updated",
          entityId: item.id,
          actor: admin.email,
        });
        items.push(item);
      } catch (error) {
        failures.push({
          fileName: filePart.filename,
          error: error instanceof Error ? error.message : "No se pudo guardar este PDF.",
        });
      }
    }

    if (items.length === 0) {
      reply.code(400);
      return {
        error:
          failures[0]?.error ?? "No se pudieron guardar los PDFs.",
        failures,
      };
    }

    if (failures.length > 0) {
      reply.code(207);
      return {
        items,
        warning: `Se publicaron ${items.length} PDF(s) y ${failures.length} quedaron pendientes.`,
        failures,
      };
    }

    reply.code(201);
    return { items };
  });

  app.patch<{ Params: { pdfId: string } }>("/library/pdfs/:pdfId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const input = await readLibraryPdfInput(
        request,
        buildAdminAuditMeta(admin).changedBy,
        request.params.pdfId,
      );
      const item = await createOrUpdateLibraryPdf(input, buildAdminAuditMeta(admin));
      emitContentChanged({
        entity: "libraryPdf",
        action: item.status === "published" ? "published" : "updated",
        entityId: item.id,
        actor: admin.email,
      });
      return { item };
    } catch (error) {
      reply.code(400);
      return {
          error:
          error instanceof Error ? error.message : "No se pudo actualizar el PDF.",
      };
    }
  });

  app.delete<{ Params: { pdfId: string } }>("/library/pdfs/:pdfId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      await deleteLibraryPdf(request.params.pdfId, buildAdminAuditMeta(admin));
      emitContentChanged({
        entity: "libraryPdf",
        action: "deleted",
        entityId: request.params.pdfId,
        actor: admin.email,
      });
      return { ok: true };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo eliminar el PDF.",
      };
    }
  });

  app.post<{ Params: { pdfId: string } }>("/library/pdfs/:pdfId/publish", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const current = await getLibraryPdfById(request.params.pdfId);
      if (!current) {
        reply.code(404);
        return { error: "El PDF no existe." };
      }
      const item = await upsertLibraryPdf(
        {
          ...current,
          status: "published",
          isActive: true,
        },
        buildAdminAuditMeta(admin),
      );
      emitContentChanged({
        entity: "libraryPdf",
        action: "published",
        entityId: item.id,
        actor: admin.email,
      });
      return { item };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo publicar el PDF.",
      };
    }
  });

  app.post<{ Params: { pdfId: string } }>("/library/pdfs/:pdfId/archive", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      const current = await getLibraryPdfById(request.params.pdfId);
      if (!current) {
        reply.code(404);
        return { error: "El PDF no existe." };
      }
      await deleteLibraryPdf(request.params.pdfId, buildAdminAuditMeta(admin));
      emitContentChanged({
        entity: "libraryPdf",
        action: "archived",
        entityId: current.id,
        actor: admin.email,
      });
      return { item: { ...current, status: "archived", isActive: false } };
    } catch (error) {
      reply.code(400);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo archivar el PDF.",
      };
    }
  });

  app.get<{ Params: { userId: string } }>("/users/:userId", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    try {
      return {
        item: await getProfile(request.params.userId),
      };
    } catch (error) {
      reply.code(404);
      return {
        error:
          error instanceof Error ? error.message : "No se pudo cargar el usuario.",
      };
    }
  });

  app.get("/incidents", async (request, reply) => {
    const admin = await requireAdminSession(request, reply);
    if (!admin) {
      return { error: getAdminError(reply.statusCode, false) };
    }

    const summary = await getAdminDashboardSummary();
    return {
      ok: summary.openIncidents === 0,
      summary: {
        open: summary.openIncidents,
      },
      items: [],
    };
  });
}
