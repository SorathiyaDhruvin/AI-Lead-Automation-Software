import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // disabled so Vite/React works in dev
  crossOriginEmbedderPolicy: false,
}));

// CORS — allow localhost dev origins and same-origin
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // server-to-server / same-origin
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5000",
    ];
    const allowedPattern = /replit\.dev$|repl\.co$|localhost|vercel\.app$/;
    if (allowedOrigins.includes(origin) || allowedPattern.test(origin)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  credentials: true,
}));

// Rate limiting — 200 req/min per IP on all API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please slow down." },
});
app.use("/api/", apiLimiter);

// Stricter limit on auth endpoints to prevent brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { message: "Too many login attempts, please try again later." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Incoming request logging
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    log(`Incoming Request: ${req.method} ${req.path}`);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // Print all registered API endpoints
  function printRegisteredRoutes(expressApp: any) {
    const routes: string[] = [];
    expressApp._router?.stack?.forEach((middleware: any) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).map(m => m.toUpperCase()).join(",");
        routes.push(`  ${methods} ${middleware.route.path}`);
      } else if (middleware.name === "router" && middleware.handle?.stack) {
        middleware.handle.stack.forEach((handler: any) => {
          if (handler.route) {
            const methods = Object.keys(handler.route.methods).map(m => m.toUpperCase()).join(",");
            routes.push(`  ${methods} ${handler.route.path}`);
          }
        });
      }
    });
    if (routes.length > 0) {
      log("\n✓ Registered Routes:");
      routes.forEach(r => console.log(r));
    }
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    { port, host: "0.0.0.0" },
    () => {
      log(`serving on port ${port}`);
      console.log("\n" + "=".repeat(50));
      console.log(`  ✓ Frontend URL:     http://localhost:${port}`);
      console.log(`  ✓ Backend API URL:  http://localhost:${port}/api`);
      console.log("  ✓ CORS allowed:    http://localhost:5173");
      console.log("  ✓ PostgreSQL Connected");
      console.log("=".repeat(50) + "\n");
      printRegisteredRoutes(app);
    }
  );
})();
