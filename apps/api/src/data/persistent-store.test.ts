import assert from "node:assert/strict";
import test from "node:test";

process.env.FORCE_MOCK_DATA = "true";

import {
  createServiceOffer,
  createShopProduct,
  getAdminEntityAuditLog,
  getShopProductAuditLog,
  updateAdminSpecialist,
  updateShopProduct,
} from "./persistent-store.js";

test("createShopProduct records an audit entry", async () => {
  const product = await createShopProduct(
    {
      name: `Producto auditoria ${Date.now()}`,
      category: "Tarot",
      shortDescription: "Producto para probar auditoría",
      description: "Producto para probar auditoría",
      price: {
        amount: 42,
        currency: "USD",
      },
      sku: `AUD-${Date.now()}`,
      status: "active",
      imageUrl: "https://example.com/product.jpg",
      imageUrls: ["https://example.com/product.jpg"],
      artwork: "tarot",
      badge: "Nuevo",
      featured: false,
      stockQuantity: 3,
      madeToOrder: false,
      tags: ["audit"],
    },
    "spec-amaya",
    {
      actorType: "admin",
      actorId: "admin-test",
      source: "admin",
    },
  );

  const auditEntries = await getShopProductAuditLog({ productId: product.id });
  assert.ok(auditEntries.length > 0);
  assert.equal(auditEntries[0].entityId, product.id);
  assert.equal(auditEntries[0].payload.action, "CREATED");
  assert.equal(auditEntries[0].payload.fieldChanged, "created");
});

test("updateShopProduct records field changes and latest timestamps", async () => {
  const product = await createShopProduct(
    {
      name: `Producto edición ${Date.now()}`,
      category: "Tarot",
      shortDescription: "Producto para probar edición",
      description: "Producto para probar edición",
      price: {
        amount: 24,
        currency: "USD",
      },
      sku: `ED-${Date.now()}`,
      status: "active",
      imageUrl: "https://example.com/product-edit.jpg",
      imageUrls: ["https://example.com/product-edit.jpg"],
      artwork: "tarot",
      badge: "Nuevo",
      featured: false,
      stockQuantity: 5,
      madeToOrder: false,
      tags: ["audit"],
    },
    "spec-amaya",
    {
      actorType: "admin",
      actorId: "admin-test",
      source: "admin",
    },
  );

  const updated = await updateShopProduct(
    product.id,
    {
      price: {
        amount: 31,
        currency: "USD",
      },
      stockQuantity: 8,
      featured: true,
    },
    { specialistProfileId: "spec-amaya", isAdmin: true },
    {
      actorType: "admin",
      actorId: "admin-test",
      source: "admin",
    },
  );

  assert.ok(updated.updatedAt);
  assert.ok(updated.createdAt);

  const auditEntries = await getShopProductAuditLog({ productId: product.id });
  assert.ok(auditEntries.some((entry) => entry.payload.fieldChanged === "price"));
  assert.ok(auditEntries.some((entry) => entry.payload.fieldChanged === "stockQuantity"));
  assert.ok(auditEntries.some((entry) => entry.payload.fieldChanged === "featured"));
});

test("deactivating a product records the audit action", async () => {
  const product = await createShopProduct(
    {
      name: `Producto baja ${Date.now()}`,
      category: "Tarot",
      shortDescription: "Producto para probar desactivación",
      description: "Producto para probar desactivación",
      price: {
        amount: 18,
        currency: "USD",
      },
      sku: `DEACT-${Date.now()}`,
      status: "active",
      imageUrl: "https://example.com/product-disable.jpg",
      imageUrls: ["https://example.com/product-disable.jpg"],
      artwork: "tarot",
      badge: "Nuevo",
      featured: false,
      stockQuantity: 2,
      madeToOrder: false,
      tags: ["audit"],
    },
    "spec-amaya",
    {
      actorType: "admin",
      actorId: "admin-test",
      source: "admin",
    },
  );

  await updateShopProduct(
    product.id,
    {
      status: "archived",
    },
    { specialistProfileId: "spec-amaya", isAdmin: true },
    {
      actorType: "admin",
      actorId: "admin-test",
      source: "admin",
    },
  );

  const auditEntries = await getShopProductAuditLog({ productId: product.id });
  assert.ok(
    auditEntries.some((entry) => entry.payload.action === "DEACTIVATED"),
  );
});

test("updateAdminSpecialist records activation and visibility audit", async () => {
  const specialist = await updateAdminSpecialist(
    "spec-amaya",
    {
      isActive: false,
      isPublic: false,
      publicName: "Amaya Test",
    },
    {
      actorType: "admin",
      actorId: "admin-test",
      source: "admin",
      changedBy: "Admin Test",
    },
  );

  assert.equal(specialist.isActive, false);
  assert.equal(specialist.isPublic, false);

  const auditEntries = await getAdminEntityAuditLog({
    specialistId: "spec-amaya",
  });
  assert.ok(auditEntries.some((entry) => entry.entityType === "specialist"));
  assert.ok(auditEntries.some((entry) => entry.payload.fieldChanged === "isActive"));
  assert.ok(auditEntries.some((entry) => entry.payload.fieldChanged === "isPublic"));
});

test("createServiceOffer records admin audit and associates specialist", async () => {
  const service = await createServiceOffer(
    "spec-amaya",
    {
      name: `Servicio admin ${Date.now()}`,
      category: "Tarot",
      description: "Servicio creado para prueba de auditoría",
      price: {
        amount: 55,
        currency: "USD",
      },
      durationMinutes: 50,
      isActive: true,
      isVisible: true,
    },
    {
      actorType: "admin",
      actorId: "admin-test",
      source: "admin",
      changedBy: "Admin Test",
    },
  );

  assert.ok(service.specialistIds.includes("spec-amaya"));

  const auditEntries = await getAdminEntityAuditLog({
    specialistId: "spec-amaya",
  });
  assert.ok(auditEntries.some((entry) => entry.entityId === service.id));
  assert.ok(auditEntries.some((entry) => entry.payload.action === "CREATED"));
});
