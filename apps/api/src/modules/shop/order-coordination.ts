import {
  ensureOrderChatThread,
  type ChatThreadDetail,
} from "../../data/chat-store.js";
import type {
  ShopOrder,
  UpdateShopOrderStatusInput,
} from "../../data/mock-store.js";

const coordinationStatuses = new Set([
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
]);

function buildOrderItemsSummary(order: ShopOrder): string {
  return order.items
    .slice(0, 3)
    .map((item) => `${item.productName} x${item.quantity}`)
    .join(", ");
}

export function buildOrderCoordinationMessage(
  order: ShopOrder,
  status: string,
  customMessage?: string,
): string {
  const custom = customMessage?.trim() ?? "";
  if (custom.length > 0) {
    return custom;
  }

  const items = buildOrderItemsSummary(order);
  const itemCopy = items.length > 0 ? ` Productos: ${items}.` : "";

  switch (status) {
    case "confirmed":
      return `Hola, confirmamos tu orden ${order.orderCode}. Coordinemos por aquí el pago y la entrega. Dirección registrada: ${order.deliveryAddress}.${itemCopy}`;
    case "preparing":
      return `Tu orden ${order.orderCode} ya está en preparación. Te avisaremos por este chat cualquier detalle antes del envío o recojo.`;
    case "shipped":
      return `Tu orden ${order.orderCode} fue marcada como enviada. Por favor confirma por este chat cuando la recibas o si necesitas ajustar la entrega.`;
    case "delivered":
      return `Marcamos tu orden ${order.orderCode} como entregada. Si quedó algún detalle pendiente de pago o recepción, responde por aquí.`;
    default:
      return `Abrimos este chat para coordinar tu orden ${order.orderCode}.`;
  }
}

export async function maybeOpenOrderCoordinationChat(
  order: ShopOrder,
  input: UpdateShopOrderStatusInput,
  authorId?: string,
): Promise<ChatThreadDetail | null> {
  const status = input.status ?? order.status;
  if (!input.openCoordinationChat && !coordinationStatuses.has(status)) {
    return null;
  }

  return ensureOrderChatThread(order, {
    authorType: "specialist",
    authorId: authorId?.trim() || order.specialistId,
    message: buildOrderCoordinationMessage(
      order,
      status,
      input.coordinationMessage,
    ),
  });
}
