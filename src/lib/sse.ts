type ClientSubscriber = (data: string) => void;
const subscribers = new Map<string, Set<ClientSubscriber>>();

export function subscribeUser(userId: string, send: ClientSubscriber) {
  if (!subscribers.has(userId)) {
    subscribers.set(userId, new Set());
  }
  subscribers.get(userId)!.add(send);

  return () => {
    const userSubs = subscribers.get(userId);
    if (userSubs) {
      userSubs.delete(send);
      if (userSubs.size === 0) subscribers.delete(userId);
    }
  };
}

export function notifyUserSync(userId: string, event: { type: string; entity: string; id?: string }) {
  const userSubs = subscribers.get(userId);
  if (userSubs) {
    const payload = JSON.stringify(event);
    userSubs.forEach((send) => send(payload));
  }
}
