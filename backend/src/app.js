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
const profileRoutes = require("./routes/profileRoutes");
const segmentRoutes = require("./routes/segmentRoutes");
const authRoutes = require("./routes/authRoutes");
const automationRoutes = require("./routes/automationRoutes");
const leadRequestRoutes = require("./routes/leadRequestRoutes");

const dashboardRoutes = require("./routes/dashboardRoutes");
const insightsRoutes = require("./routes/insightsRoutes");
const adminRoutes = require("./routes/adminRoutes");
const workflowRoutes = require("./routes/workflowRoutes");
const emailTemplateRoutes = require("./routes/emailTemplateRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const emailRoutes = require("./routes/emailRoutes");

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
app.use("/api/profile", profileRoutes);
app.use("/api/segments", segmentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/lead-requests", leadRequestRoutes);

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/insights", insightsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/workflows", workflowRoutes);
app.use("/api/email-templates", emailTemplateRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/email", emailRoutes);

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
