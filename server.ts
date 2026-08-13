import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface RoomData {
  clients?: any[];
  products?: any[];
  savedQuotes?: any[];
  companyInfo?: any;
  quoteSettings?: any;
  lastUpdated: number;
}

const syncRooms = new Map<string, RoomData>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Get Room Sync Data
  app.get("/api/sync/:roomId", (req, res) => {
    const roomId = req.params.roomId.toLowerCase();
    const room = syncRooms.get(roomId);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json(room);
  });

  // Update or Push Sync Data
  app.post("/api/sync/update", (req, res) => {
    const { roomId, data } = req.body || {};
    if (!roomId || !data) {
      return res.status(400).json({ error: "roomId and data are required" });
    }

    const cleanRoomId = String(roomId).toLowerCase();
    const now = Date.now();

    const existing = syncRooms.get(cleanRoomId) || { lastUpdated: 0 };

    const updatedRoom: RoomData = {
      clients: data.clients !== undefined ? data.clients : existing.clients || [],
      products: data.products !== undefined ? data.products : existing.products || [],
      savedQuotes: data.savedQuotes !== undefined ? data.savedQuotes : existing.savedQuotes || [],
      companyInfo: data.companyInfo !== undefined ? data.companyInfo : existing.companyInfo || null,
      quoteSettings: data.quoteSettings !== undefined ? data.quoteSettings : existing.quoteSettings || null,
      lastUpdated: now,
    };

    syncRooms.set(cleanRoomId, updatedRoom);
    res.json({ success: true, lastUpdated: now });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
