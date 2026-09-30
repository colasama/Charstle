export type ServerEvent = { type: string; payload?: unknown };
export function connectEvents(
  onEvent: (e: ServerEvent) => void,
  onState: (connected: boolean) => void,
): () => void {
  let socket: WebSocket | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let delay = 500;
  const connect = () => {
    socket = new WebSocket(
      location.origin.replace(/^http/, "ws") + "/api/events",
    );
    socket.onopen = () => {
      delay = 500;
      onState(true);
      onEvent({ type: "resync" });
    };
    socket.onmessage = (e) => {
      try {
        const events: ServerEvent[] = JSON.parse(e.data);
        events.forEach(onEvent);
      } catch {
        onEvent({ type: "resync" });
      }
    };
    socket.onclose = () => {
      onState(false);
      if (!stopped) {
        retry = setTimeout(connect, delay);
        delay = Math.min(delay * 2, 10000);
      }
    };
    socket.onerror = () => socket?.close();
  };
  connect();
  return () => {
    stopped = true;
    clearTimeout(retry);
    socket?.close();
  };
}
