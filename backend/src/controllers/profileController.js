const userModel = require("../models/userModel");
const { asyncHandler } = require("../middleware/errorHandler");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client for storage
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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
 * Upload profile photo to Supabase Storage and update user profile.
 */
const uploadPhoto = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No photo provided" });
    }

    if (!supabase) {
        return res.status(500).json({ message: "Storage is not configured" });
    }

    try {
        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `${req.userId}-${Date.now()}.${fileExt}`;
        const filePath = `${req.userId}/${fileName}`;

        // Upload to Supabase Storage 'avatars' bucket
        const { error: uploadError, data } = await supabase.storage
            .from('avatars')
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            return res.status(500).json({ message: "Failed to upload to storage" });
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Update user profile in DB
        const user = await userModel.update(req.userId, { profile_image_url: publicUrl });

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
