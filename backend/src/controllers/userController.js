const userModel = require("../models/userModel");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * POST /api/users/register
 * Legacy register endpoint (deprecated)
 */
const register = asyncHandler(async (req, res) => {
    return res.status(400).json({
        success: false,
        message: "Registration is now handled via Supabase Auth.",
    });
});

/**
 * POST /api/users/login
 * Legacy login endpoint (deprecated)
 */
const login = asyncHandler(async (req, res) => {
    return res.status(400).json({
        success: false,
        message: "Login is now handled via Supabase Auth.",
    });
});

/**
 * GET /api/users/profile
 * Get the currently authenticated user's profile.
 */
const getProfile = asyncHandler(async (req, res) => {
    const user = await userModel.getById(req.userId);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found",
        });
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json({
        success: true,
        data: userWithoutPassword,
    });
});

/**
 * GET /api/users
 * Get all users (admin only).
 */
const getAllUsers = asyncHandler(async (req, res) => {
    const users = await userModel.getAll();

    res.json({
        success: true,
        data: users,
    });
});

module.exports = { register, login, getProfile, getAllUsers };
