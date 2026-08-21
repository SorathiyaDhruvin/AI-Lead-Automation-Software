const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ SUPABASE_URL or SUPABASE_SECRET_KEY not provided. Authentication may fail.");
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// --- Middleware ---

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }

    const token = authHeader.substring(7);
    
    try {
        if (!supabase) {
            throw new Error("Supabase client not initialized.");
        }

        // Validate the token securely with Supabase Auth
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error("Supabase Auth Error:", error?.message);
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token",
            });
        }
        
        // Populate req.user details
        req.userId = user.id;
        req.userEmail = user.email;
        req.userRole = user.user_metadata?.role || "user";
        
        next();
    } catch (error) {
        console.error("Auth Middleware Error:", error.message);
        return res.status(401).json({
            success: false,
            message: "Authentication failed",
        });
    }
};

const adminMiddleware = async (req, res, next) => {
    // First, pass through standard auth
    await authMiddleware(req, res, () => {
        // Then, check if the authenticated user has admin role
        if (req.userRole !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access required",
            });
        }
        next();
    });
};

module.exports = {
    authMiddleware,
    adminMiddleware,
};

