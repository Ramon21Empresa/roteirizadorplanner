import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Client } from "@googlemaps/google-maps-services-js";
import dotenv from "dotenv";

dotenv.config();

const googleMapsClient = new Client({});
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Geocoding API Proxy
  app.post("/api/geocode", async (req, res) => {
    const { address } = req.body;
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: "Google Maps API Key not configured" });
    }
    try {
      const response = await googleMapsClient.geocode({
        params: {
          address,
          key: GOOGLE_MAPS_API_KEY,
        },
      });
      res.json(response.data);
    } catch (error) {
      console.error("Geocoding error:", error);
      res.status(500).json({ error: "Failed to geocode address" });
    }
  });

  // Directions API Proxy (Routing)
  app.post("/api/directions", async (req, res) => {
    const { origin, destination, waypoints } = req.body;
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: "Google Maps API Key not configured" });
    }
    try {
      const response = await googleMapsClient.directions({
        params: {
          origin,
          destination,
          waypoints,
          optimize: true,
          key: GOOGLE_MAPS_API_KEY,
        },
      });
      res.json(response.data);
    } catch (error) {
      console.error("Directions error:", error);
      res.status(500).json({ error: "Failed to get directions" });
    }
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
