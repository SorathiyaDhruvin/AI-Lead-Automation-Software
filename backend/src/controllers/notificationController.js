const notificationModel = require("../models/notificationModel");
const { asyncHandler } = require("../middleware/errorHandler");

const mapToCamelCase = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        userId: row.user_id,
        type: row.type,
        message: row.message,
        isRead: row.is_read,
        createdAt: row.created_at,
    };
};

const getNotifications = asyncHandler(async (req, res) => {
    const rawNotifications = await notificationModel.getByUser(req.userId);
    const notifications = rawNotifications.map(mapToCamelCase);
    const unreadCount = await notificationModel.getUnreadCount(req.userId);
    
    // UI expects { notifications, unreadCount } directly wrapped in data
    res.json({
        success: true,
        data: {
            notifications,
            unreadCount
        }
    });
});

const markRead = asyncHandler(async (req, res) => {
    const notif = await notificationModel.markRead(req.params.id, req.userId);
    if (!notif) {
        return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.json({ success: true, data: mapToCamelCase(notif) });
});

const markAllRead = asyncHandler(async (req, res) => {
    await notificationModel.markAllRead(req.userId);
    res.json({ success: true, message: "All notifications marked as read" });
});

module.exports = {
    getNotifications,
    markRead,
    markAllRead
};
