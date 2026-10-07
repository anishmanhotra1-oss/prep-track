import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { subscribeUser } from "@/lib/sse";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = user.id;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
      };

      const unsubscribe = subscribeUser(userId, send);

      // Send initial heartbeat
      send(JSON.stringify({ type: "CONNECTED", timestamp: Date.now() }));

      const interval = setInterval(() => {
        send(JSON.stringify({ type: "HEARTBEAT", timestamp: Date.now() }));
      }, 15000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
