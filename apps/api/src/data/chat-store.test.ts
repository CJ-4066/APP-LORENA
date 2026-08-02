import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL = "";

const chatStore = await import("./chat-store.js");

const {
  createChatMessage,
  createChatThread,
  createCommunityChatMessage,
  deleteCommunityChatMessage,
  deleteCommunityChatMessageImage,
  getCommunityChatMessages,
} = chatStore;

test("private chat messages can include an image without text", async () => {
  const thread = await createChatThread({ specialistId: "spec-amaya" });
  const updated = await createChatMessage(thread.thread.id, {
    imageUrl: "/uploads/chat/order-proof.png",
  });
  const target = updated.messages.at(-1);

  assert.ok(target);
  assert.equal(target.body, "");
  assert.equal(target.imageUrl, "/api/uploads/chat/order-proof.png");
  assert.equal(updated.thread.lastMessagePreview, "Imagen adjunta");
});

test("deletes a community message by id", async () => {
  const created = await createCommunityChatMessage({
    body: "Mensaje temporal para eliminar",
  });
  const target = created.at(-1);
  assert.ok(target);

  const next = await deleteCommunityChatMessage(target.id);
  assert.equal(next.some((message) => message.id === target.id), false);
});

test("removes only the image when the message still has body", async () => {
  const created = await createCommunityChatMessage({
    body: "Mensaje con imagen",
    imageUrl: "/uploads/chat/test-image.png",
  });
  const target = created.at(-1);
  assert.ok(target);
  assert.equal(target.imageUrl, "/api/uploads/chat/test-image.png");

  const next = await deleteCommunityChatMessageImage(target.id);
  const updated = next.find((message) => message.id === target.id);
  assert.ok(updated);
  assert.equal(updated.imageUrl, null);
  assert.equal(updated.body, "Mensaje con imagen");
});

test("deleting the image removes the whole message when it has no body", async () => {
  const created = await createCommunityChatMessage({
    imageUrl: "/uploads/chat/image-only.png",
  });
  const target = created.at(-1);
  assert.ok(target);

  const next = await deleteCommunityChatMessageImage(target.id);
  assert.equal(next.some((message) => message.id === target.id), false);

  const current = await getCommunityChatMessages();
  assert.equal(current.some((message) => message.id === target.id), false);
});
