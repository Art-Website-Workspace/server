import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { db } from "./src/db";
import { generateShortId } from "./src/utils";
import { handleWS } from "./src/ws";

const app = new Hono();


app.post("/canvas/create", c => {
  const id = generateShortId();

  db.query("INSERT INTO canvas (id, data) VALUES (?, ?)").run(id, null);

  return c.json({
    success: true,
    canvasId: id,
    editorUrl: `/editor/${id}`,
  });
});


app.get("/canvas/:id", c => {
  const row = db
    .query("SELECT data FROM canvas WHERE id = ?")
    .get(c.req.param("id")) as { data?: string };

  if (!row) return c.json({ error: "Not found" }, 404);

  return c.json({
    canvas: row.data ? JSON.parse(row.data) : null,
  });
});

const server = serve({
  fetch: app.fetch,
  port: 3000,
});


const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url!, "http://localhost");
  const canvasId = url.searchParams.get("room");
  if (!canvasId) return ws.close();

  handleWS(ws, canvasId);
});

console.log("SQLite backend running on http://localhost:3000");
