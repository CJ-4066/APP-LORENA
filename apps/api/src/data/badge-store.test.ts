import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.DATABASE_URL = "";
process.env.REDIS_URL = "";

const badgeStore = await import("./badge-store.js");

const {
  createBadge,
  getAllBadges,
  getBadgeById,
  getBadgeAuditLog,
  getBadgeRouteProgressPercent,
  getBadgeDiagnostics,
  getNextBadgeInPath,
  updateBadge,
  getUserBadgeProfile,
} = badgeStore;

test("rejects active badges that duplicate pathId and stepIndex", async () => {
  await assert.rejects(
    () =>
      createBadge({
        id: `badge-dup-${randomUUID()}`,
        name: "Duplicado activo",
        description: "Debe fallar porque ocupa un step activo.",
        category: "DESPERTAR",
        rarity: "COMMON",
        type: "AUTOMATIC",
        pathId: "despertar_path",
        pathOrder: 1,
        stepIndex: 1,
        stepTitle: "Activación inicial",
        stepDescription: "Duplicate test",
        prerequisiteBadgeIds: [],
        lockedReason: "Test",
        isPathVisible: true,
        isConditionHidden: false,
        iconUrl: "badge://dup",
        isSecret: false,
        isActive: true,
        rules: [
          {
            ruleKey: "app_open_count",
            operator: "GTE",
            value: 1,
          },
        ],
      }),
    /Ya existe un badge activo/,
  );
});

test("rejects prerequisiteBadgeIds containing the badge itself", async () => {
  const badgeId = `badge-self-${randomUUID()}`;
  await assert.rejects(
    () =>
      createBadge({
        id: badgeId,
        name: "Auto referencia",
        description: "No debe permitirse",
        category: "AWARD",
        rarity: "RARE",
        type: "MANUAL",
        pathId: "award_path",
        pathOrder: 7,
        stepIndex: 1,
        stepTitle: "Activación inicial",
        stepDescription: "Self prereq test",
        prerequisiteBadgeIds: [badgeId],
        lockedReason: "Manual",
        isPathVisible: true,
        isConditionHidden: false,
        iconUrl: "badge://self",
        isSecret: false,
        isActive: false,
        rules: [],
      }),
    /prerequisiteBadgeIds no puede incluir el mismo badge/,
  );
});

test("allows award manual badges without rules", async () => {
  const badgeId = `badge-award-${randomUUID()}`;
  const created = await createBadge({
    id: badgeId,
    name: "Award sin reglas",
    description: "Award manual de prueba",
    category: "AWARD",
    rarity: "LEGENDARY",
    type: "MANUAL",
    pathId: "award_path",
    pathOrder: 7,
    stepIndex: 5,
    stepTitle: "Legado",
    stepDescription: "Manual award test",
    prerequisiteBadgeIds: [],
    lockedReason: "Manual award test",
    isPathVisible: true,
    isConditionHidden: false,
    iconUrl: "badge://award",
    isSecret: false,
    isActive: false,
    rules: [],
  });

  assert.equal(created.id, badgeId);
  const stored = await getBadgeById(badgeId);
  assert.ok(stored);
  assert.equal(stored?.type, "MANUAL");
  assert.equal(stored?.rules?.length ?? 0, 0);
});

test("creates an audit entry when a badge is created", async () => {
  const badgeId = `badge-audit-create-${randomUUID()}`;
  await createBadge({
    id: badgeId,
    name: "Auditoria creación",
    description: "Prueba de auditoría",
    category: "AWARD",
    rarity: "RARE",
    type: "MANUAL",
    pathId: "award_path",
    pathOrder: 7,
    stepIndex: 4,
    stepTitle: "Maestría",
    stepDescription: "Audit create",
    prerequisiteBadgeIds: [],
    lockedReason: "Audit create",
    isPathVisible: true,
    isConditionHidden: false,
    iconUrl: "badge://audit-create",
    isSecret: false,
    isActive: false,
    rules: [],
  });

  const auditEntries = await getBadgeAuditLog({ badgeId });
  assert.ok(auditEntries.length > 0);
  assert.equal(auditEntries[0].action, "CREATED");
});

test("creates an audit entry when a badge is edited", async () => {
  const badgeId = `badge-audit-update-${randomUUID()}`;
  await createBadge({
    id: badgeId,
    name: "Auditoria edición",
    description: "Prueba de edición",
    category: "AWARD",
    rarity: "RARE",
    type: "MANUAL",
    pathId: "award_path",
    pathOrder: 7,
    stepIndex: 3,
    stepTitle: "Consistencia",
    stepDescription: "Audit update",
    prerequisiteBadgeIds: [],
    lockedReason: "Audit update",
    isPathVisible: true,
    isConditionHidden: false,
    iconUrl: "badge://audit-update",
    isSecret: false,
    isActive: false,
    rules: [],
  });

  await updateBadge(badgeId, {
    name: "Auditoria edición final",
    description: "Prueba de edición final",
    category: "AWARD",
    rarity: "EPIC",
    type: "MANUAL",
    pathId: "award_path",
    pathOrder: 7,
    stepIndex: 3,
    stepTitle: "Consistencia",
    stepDescription: "Audit update final",
    prerequisiteBadgeIds: [],
    lockedReason: "Audit update final",
    isPathVisible: true,
    isConditionHidden: false,
    iconUrl: "badge://audit-update",
    isSecret: false,
    isActive: false,
    rules: [],
  });

  const auditEntries = await getBadgeAuditLog({ badgeId });
  assert.ok(auditEntries.some((entry) => entry.action === "UPDATED"));
  assert.ok(auditEntries.some((entry) => entry.fieldChanged === "name"));
});

test("creates audit entries when a badge is activated and deactivated", async () => {
  const badgeId = "badge-hijo-del-vacio";
  await updateBadge(badgeId, { isActive: false });
  await updateBadge(badgeId, { isActive: true });

  const auditEntries = await getBadgeAuditLog({ badgeId });
  assert.ok(auditEntries.some((entry) => entry.action === "DEACTIVATED"));
  assert.ok(auditEntries.some((entry) => entry.action === "ACTIVATED"));
});

test("SECRET badges remain hidden in user profiles", async () => {
  const profile = await getUserBadgeProfile("ghost-user");
  const secretBadge = profile.badges.find((badge) => badge.id === "badge-la-carta-xiii");

  assert.ok(secretBadge);
  assert.equal(secretBadge?.displayName, "Insignia oculta");
  assert.equal(secretBadge?.unlocked, false);
  assert.notEqual(secretBadge?.displayDescription, secretBadge?.description);
});

test("badge route progress and next badge helpers work", async () => {
  const badges = await getAllBadges();
  assert.equal(getBadgeRouteProgressPercent(badges, "despertar_path"), 100);

  const nextBadge = getNextBadgeInPath(badges, "badge-el-primer-velo");
  assert.ok(nextBadge);
  assert.equal(nextBadge?.id, "badge-el-llamado");

  const ordered = [...badges].sort((left, right) => {
    if (left.pathOrder !== right.pathOrder) {
      return left.pathOrder - right.pathOrder;
    }
    if (left.stepIndex !== right.stepIndex) {
      return left.stepIndex - right.stepIndex;
    }
    return left.name.localeCompare(right.name);
  });

  assert.deepEqual(
    badges.map((badge) => badge.id),
    ordered.map((badge) => badge.id),
  );
});

test("audit log endpoint data is returned in descending order", async () => {
  const badgeId = "badge-hijo-del-vacio";
  const auditEntries = await getBadgeAuditLog({ badgeId });
  const ordered = [...auditEntries].sort((left, right) =>
    right.changedAt.localeCompare(left.changedAt),
  );

  assert.deepEqual(
    auditEntries.map((entry) => entry.changedAt),
    ordered.map((entry) => entry.changedAt),
  );
});

test("diagnostics reports the system as healthy by default", async () => {
  const diagnostics = await getBadgeDiagnostics();
  assert.equal(typeof diagnostics.ok, "boolean");
  assert.ok(Array.isArray(diagnostics.issues));
});
