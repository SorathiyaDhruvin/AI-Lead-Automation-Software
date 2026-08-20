const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET = process.env.JWT_SECRET || "leadflow-default-secret-change-me";
const JWT_EXPIRES_IN = "7d";

// --- Helper functions ---

const generateToken = (user) => {
    return jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
};

const hashPassword = async (password) => {
    return bcrypt.hash(password, 10);
};

const comparePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};

// --- Middleware ---

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }

    const token = authHeader.substring(7);
    
    try {
        // Use SUPABASE_JWT_SECRET if available, fallback to local for dev
        const secret = process.env.SUPABASE_JWT_SECRET || JWT_SECRET;
        const decoded = jwt.verify(token, secret);
        
        // Supabase JWT stores the user UUID in the 'sub' claim
        req.userId = decoded.sub || decoded.userId;
        req.userEmail = decoded.email;
        req.userRole = decoded.role;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};

const adminMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }

    if (decoded.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Admin access required",
        });
    }

    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    next();
};

module.exports = {
    generateToken,
    verifyToken,
    hashPassword,
    comparePassword,
    authMiddleware,
    adminMiddleware,
};
