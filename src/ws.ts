import { db } from "./db";

const rooms = new Map<string, Set<WebSocket>>();

export function handleWS(ws: WebSocket, canvasId: string) {
  if (!rooms.has(canvasId)) rooms.set(canvasId, new Set());
  rooms.get(canvasId)!.add(ws);

  // Load canvas from DB
  const row = db
    .query("SELECT data FROM canvas WHERE id = ?")
    .get(canvasId) as { data?: string };

  ws.send(
    JSON.stringify({
      type: "INIT",
      canvas: row?.data ? JSON.parse(row.data) : null,
    })
  );

  ws.onmessage = msg => {
    const payload = JSON.parse(msg.data.toString());

    if (payload.type === "UPDATE_CANVAS") {
      db.query(
        `UPDATE canvas SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).run(JSON.stringify(payload.canvas), canvasId);

      rooms.get(canvasId)!.forEach(client => {
        if (client !== ws && client.readyState === 1) {
          client.send(
            JSON.stringify({
              type: "SYNC",
              canvas: payload.canvas,
            })
          );
        }
      });
    }
  };

  ws.onclose = () => {
    rooms.get(canvasId)!.delete(ws);
  };
}
