export type PublicContentEntity =
  | "all"
  | "course"
  | "libraryPdf"
  | "service"
  | "specialist"
  | "shopProduct"
  | "booking"
  | "communityChat";

export type PublicContentAction =
  | "created"
  | "updated"
  | "published"
  | "unpublished"
  | "archived"
  | "deleted"
  | "activated"
  | "deactivated";

export type PublicContentChangeEvent = {
  id: string;
  type: "content.changed";
  entity: PublicContentEntity;
  action: PublicContentAction;
  entityId?: string;
  at: string;
  actor?: string;
};

type ContentChangeListener = (event: PublicContentChangeEvent) => void;

const listeners = new Set<ContentChangeListener>();
let sequence = 0;

export function emitContentChanged(input: {
  entity: PublicContentEntity;
  action: PublicContentAction;
  entityId?: string;
  actor?: string;
}): PublicContentChangeEvent {
  sequence += 1;

  const event: PublicContentChangeEvent = {
    id: `${Date.now()}-${sequence}`,
    type: "content.changed",
    entity: input.entity,
    action: input.action,
    entityId: input.entityId,
    actor: input.actor,
    at: new Date().toISOString(),
  };

  for (const listener of [...listeners]) {
    try {
      listener(event);
    } catch {
      // Do not allow one broken listener to affect the others.
    }
  }

  return event;
}

export function subscribeContentChanges(
  listener: ContentChangeListener,
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getContentChangeListenerCount(): number {
  return listeners.size;
}
