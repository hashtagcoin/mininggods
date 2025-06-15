import "reflect-metadata";
import { Server } from "colyseus";
import express from "express";
import cors from "cors";
import http from "http";

import { SimpleGameRoom } from "./rooms/SimpleGameRoom";

const port = Number(process.env.PORT || 2567);
const app = express();

// Enable CORS
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Initialize Colyseus server
const gameServer = new Server({
  server: server,
});

// Register game room
gameServer.define("game", SimpleGameRoom);

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
console.log(`❤️  Health: http://localhost:${port}/health`);
