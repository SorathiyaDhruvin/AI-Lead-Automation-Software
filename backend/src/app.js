const express = require("express");
require("dotenv").config();

const corsMiddleware = require("./middleware/cors");
const { errorHandler } = require("./middleware/errorHandler");

// Route imports
const healthRoutes = require("./routes/healthRoutes");
const userRoutes = require("./routes/userRoutes");
const leadRoutes = require("./routes/leadRoutes");
const activityRoutes = require("./routes/activityRoutes");
const aiSuggestionRoutes = require("./routes/aiSuggestionRoutes");

const app = express();

// ── Global Middleware ──
app.use(corsMiddleware);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ──
app.use("/api/health", healthRoutes);
app.use("/api/users", userRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/ai-suggestions", aiSuggestionRoutes);

// ── Root route ──
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "AI Lead Automation API",
        version: "1.0.0",
        endpoints: {
            health: "/api/health",
            users: "/api/users",
            leads: "/api/leads",
            activities: "/api/activities",
            aiSuggestions: "/api/ai-suggestions",
        },
    });
});

// ── 404 handler ──
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

// ── Global error handler (must be last) ──
app.use(errorHandler);

module.exports = app;
