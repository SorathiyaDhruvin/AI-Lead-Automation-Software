const userModel = require("../models/userModel");
const { asyncHandler } = require("../middleware/errorHandler");

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

module.exports = { getAllUsers };
