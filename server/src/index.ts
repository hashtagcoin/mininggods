import "reflect-metadata";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
// import { playground } from "@colyseus/playground"; // Removed temporarily
import express from "express";
import cors from "cors";
import http from "http";

import { SimpleGameRoom } from "./rooms/SimpleGameRoom";

const port = Number(process.env.PORT || 2567);
const app = express();

// Enable CORS for all origins in development
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Initialize Colyseus server
const gameServer = new Server({
  server: server,
});

// Register game room
gameServer.define("game", SimpleGameRoom);

// Development tools (only in development)
if (process.env.NODE_ENV !== "production") {
  // app.use("/playground", playground); // Temporarily disabled due to middleware typing issues
  app.use("/monitor", monitor());
}

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    server: "Mining Gods Game Server"
  });
});

// Start the server
gameServer.listen(port);

console.log(`🚀 Mining Gods Server listening on port ${port}`);
console.log(`📊 Monitor: http://localhost:${port}/monitor`);
console.log(`🎮 Playground: http://localhost:${port}/playground`);
console.log(`❤️  Health: http://localhost:${port}/health`);
