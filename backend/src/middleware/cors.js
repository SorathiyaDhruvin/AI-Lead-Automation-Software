const cors = require("cors");

const ALLOWED_ORIGINS = [
    "https://ai-lead-automation-software.vercel.app",
];

// Allow localhost origins in development
if (process.env.NODE_ENV !== "production") {
    ALLOWED_ORIGINS.push(
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174"
    );
}

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., Postman, curl, server-to-server)
        if (!origin) return callback(null, true);

        if (ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: Origin ${origin} not allowed`));
        }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400, // Cache preflight for 24 hours
};

module.exports = cors(corsOptions);
