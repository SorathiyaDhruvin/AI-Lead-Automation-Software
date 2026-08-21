const userModel = require("../models/userModel");
const { asyncHandler } = require("../middleware/errorHandler");
const ImageKit = require("imagekit");

// Initialize ImageKit
const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

/**
 * GET /api/profile
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
 * PUT /api/profile
 * Update the currently authenticated user's profile.
 */
const updateProfile = asyncHandler(async (req, res) => {
    // Prevent updating sensitive fields
    const { id, password, role, created_at, updated_at, ...updates } = req.body;

    // Convert camelCase from frontend to snake_case for DB
    const dbUpdates = {};
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.dob !== undefined) dbUpdates.dob = updates.dob;
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
    if (updates.language !== undefined) dbUpdates.language = updates.language;
    if (updates.jobTitle !== undefined) dbUpdates.occupation = updates.jobTitle;
    if (updates.company !== undefined) dbUpdates.company = updates.company;
    if (updates.department !== undefined) dbUpdates.department = updates.department;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.country !== undefined) dbUpdates.country = updates.country;
    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.postalCode !== undefined) dbUpdates.postal_code = updates.postalCode;
    if (updates.address !== undefined) dbUpdates.street_address = updates.address;
    if (updates.linkedin !== undefined) dbUpdates.linkedin = updates.linkedin;
    if (updates.github !== undefined) dbUpdates.github = updates.github;
    if (updates.portfolio !== undefined) dbUpdates.portfolio = updates.portfolio;
    if (updates.twitter !== undefined) dbUpdates.twitter = updates.twitter;

    const user = await userModel.update(req.userId, dbUpdates);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found or no changes provided",
        });
    }

    const { password: _, ...userWithoutPassword } = user;

    // Return object directly to match frontend expectations
    res.json(userWithoutPassword);
});

/**
 * PATCH /api/profile/photo
 * Upload profile photo to ImageKit and update user profile.
 */
const uploadPhoto = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No photo provided" });
    }

    if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
        return res.status(500).json({ message: "ImageKit is not configured" });
    }

    try {
        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `${req.userId}-${Date.now()}.${fileExt}`;

        // Upload to ImageKit
        const response = await imagekit.upload({
            file: req.file.buffer, // required, can be a base64 string or buffer
            fileName: fileName,
            folder: "/avatars",
        });

        // Update user profile in DB
        const user = await userModel.update(req.userId, { profile_image_url: response.url });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);

    } catch (error) {
        console.error("Photo upload error:", error);
        res.status(500).json({ message: "Failed to process photo upload" });
    }
});

module.exports = { getProfile, updateProfile, uploadPhoto };
