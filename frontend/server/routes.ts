import type { Express, Request, Response } from "express";
import { type Server } from "http";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const BACKEND_API_URL = process.env.VITE_API_URL || "http://localhost:5001/api";

  // Proxy /api/* to the actual Express JS backend (backend/)
  app.all("/api/*", async (req: Request, res: Response) => {
    const targetUrl = `${BACKEND_API_URL}${req.path.replace("/api", "")}`;
    const url = new URL(targetUrl);
    
    // Copy query parameters
    Object.entries(req.query).forEach(([key, val]) => {
      if (val !== undefined) {
        url.searchParams.set(key, String(val));
      }
    });

    try {
      const headers: Record<string, string> = {};
      Object.entries(req.headers).forEach(([key, val]) => {
        if (val !== undefined && key.toLowerCase() !== "host") {
          headers[key] = Array.isArray(val) ? val.join(", ") : String(val);
        }
      });

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && req.body) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(url.toString(), fetchOptions);

      // Copy response headers
      response.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      res.status(response.status);

      const body = await response.text();
      res.send(body);
    } catch (err: any) {
      console.error(`[Local API Proxy Error] Failed to forward request to ${url.toString()}:`, err.message);
      res.status(502).json({
        success: false,
        message: `Local API proxy failed: ${err.message}`,
        details: `Make sure the consolidated backend is running (defaulting to http://localhost:5001)`
      });
    }
  });

  return httpServer;
}
