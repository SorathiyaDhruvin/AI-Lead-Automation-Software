const userModel = require("../models/userModel");
const { generateToken, hashPassword, comparePassword } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * POST /api/users/register
 * Register a new user with email + password.
 */
const register = asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({
            success: false,
            message: "Email, password, and name are required",
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            message: "Password must be at least 8 characters",
        });
    }

    // Check if email already exists
    const existing = await userModel.getByEmail(email);
    if (existing) {
        return res.status(409).json({
            success: false,
            message: "Email already registered",
        });
    }

    const hashedPassword = await hashPassword(password);
    const user = await userModel.create({
        email,
        password: hashedPassword,
        name,
        role: "user",
    });

    const token = generateToken(user);

    res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: { token, user },
    });
});

/**
 * POST /api/users/login
 * Login with email + password.
 */
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required",
        });
    }

    const user = await userModel.getByEmail(email);
    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password",
        });
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password",
        });
    }

    const token = generateToken(user);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
        success: true,
        message: "Login successful",
        data: { token, user: userWithoutPassword },
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
