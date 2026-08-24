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
        
        // Strictly enforce admin role for the specified email
        if (user.email?.toLowerCase() === "sorathiyadhruvin2005@gmail.com") {
            req.userRole = "admin";
        } else {
            req.userRole = user.user_metadata?.role === "admin" ? "user" : (user.user_metadata?.role || "user");
            // Do not trust frontend admin claims for other users
        }
        
        // Ensure user exists in our local PostgreSQL database
        try {
            const userModel = require("../models/userModel");
            let dbUser = await userModel.getById(user.id);
            
            if (!dbUser && user.email) {
                dbUser = await userModel.getByEmail(user.email);
            }
            
            if (!dbUser) {
                const fullName = user.user_metadata?.full_name || "";
                const nameParts = fullName.split(" ");
                const firstName = user.user_metadata?.first_name || nameParts[0] || "User";
                const lastName = user.user_metadata?.last_name || nameParts.slice(1).join(" ") || "";
                
                try {
                    await userModel.create({
                        id: user.id,
                        email: user.email,
                        first_name: firstName,
                        last_name: lastName,
                        role: req.userRole
                    });
                    console.log(`[Auth Sync] Created user record for ID: ${user.id}, Email: ${user.email}`);
                } catch (insertErr) {
                    if (insertErr.code === '23505') {
                        console.log(`[Auth Sync] User already exists by email (race condition): ${user.email}`);
                    } else {
                        throw insertErr;
                    }
                }
            } else if (dbUser.id !== user.id) {
                // User exists with same email but different ID (e.g. from legacy login)
                // Overwrite req.userId to point to the actual database ID to maintain relations
                req.userId = dbUser.id;
            }
        } catch (syncError) {
            console.error("[Auth Sync] Failed to synchronize user profile:", syncError.message);
        }
        
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

