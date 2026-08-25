const pool = require("../config/db");
const { asyncHandler } = require("../middleware/errorHandler");
const userModel = require("../models/userModel");
const activityModel = require("../models/activityModel");
const executionModel = require("../models/executionModel");
const emailLogModel = require("../models/emailLogModel");

const getPlatformStats = asyncHandler(async (req, res) => {
    // Collect stats from multiple tables
    
    // Users
    const usersResult = await pool.query(`SELECT COUNT(*) as count FROM users`);
    const activeUsersResult = await pool.query(`SELECT COUNT(DISTINCT user_id) as count FROM activity_logs WHERE created_at > NOW() - INTERVAL '30 days'`);
    
    // Leads
    const leadsResult = await pool.query(`SELECT COUNT(*) as count FROM leads`);
    const leadsTodayResult = await pool.query(`SELECT COUNT(*) as count FROM leads WHERE created_at > CURRENT_DATE`);
    
    // Automations
    const automationsResult = await pool.query(`SELECT COUNT(*) as count FROM automations`);
    const executionsResult = await pool.query(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM automation_executions
    `);
    
    // Emails
    const emailsResult = await pool.query(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'delivered' OR status = 'sent' THEN 1 ELSE 0 END) as delivered,
            SUM(CASE WHEN status = 'failed' OR status = 'bounced' THEN 1 ELSE 0 END) as failed
        FROM email_logs
    `);

    // Lead Requests
    const leadRequestsResult = await pool.query(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM lead_requests
    `);

    res.json({
        success: true,
        data: {
            users: {
                total: parseInt(usersResult.rows[0].count) || 0,
                active: parseInt(activeUsersResult.rows[0].count) || 0
            },
            leads: {
                total: parseInt(leadsResult.rows[0].count) || 0,
                today: parseInt(leadsTodayResult.rows[0].count) || 0
            },
            automations: {
                totalWorkflows: parseInt(automationsResult.rows[0].count) || 0,
                executions: parseInt(executionsResult.rows[0].total) || 0,
                success: parseInt(executionsResult.rows[0].success) || 0,
                failed: parseInt(executionsResult.rows[0].failed) || 0
            },
            emails: {
                total: parseInt(emailsResult.rows[0].total) || 0,
                delivered: parseInt(emailsResult.rows[0].delivered) || 0,
                failed: parseInt(emailsResult.rows[0].failed) || 0
            },
            leadRequests: {
                total: parseInt(leadRequestsResult.rows[0].total) || 0,
                pending: parseInt(leadRequestsResult.rows[0].pending) || 0,
                approved: parseInt(leadRequestsResult.rows[0].approved) || 0,
                rejected: parseInt(leadRequestsResult.rows[0].rejected) || 0
            }
        }
    });
});

const getUsers = asyncHandler(async (req, res) => {
    // Get users with some basic aggregated stats per user
    const { rows } = await pool.query(`
        SELECT 
            u.id, u.email, u.first_name, u.last_name, u.role, u.created_at,
            (SELECT COUNT(*) FROM leads WHERE user_id = u.id) as leads_count,
            (SELECT COUNT(*) FROM automations WHERE user_id = u.id) as automations_count,
            (SELECT MAX(created_at) FROM activity_logs WHERE user_id = u.id) as last_activity
        FROM users u
        ORDER BY u.created_at DESC
        LIMIT 100
    `);
    
    // Map to camelCase for frontend
    const users = rows.map(r => ({
        id: r.id,
        email: r.email,
        firstName: r.first_name,
        lastName: r.last_name,
        role: r.role,
        createdAt: r.created_at,
        leadsCount: parseInt(r.leads_count) || 0,
        automationsCount: parseInt(r.automations_count) || 0,
        lastActivity: r.last_activity
    }));

    res.json({ success: true, data: users });
});

const getActivity = asyncHandler(async (req, res) => {
    const { rows } = await pool.query(`
        SELECT a.*, u.email, u.first_name, u.last_name 
        FROM activity_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 100
    `);
    
    res.json({ success: true, data: rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        userEmail: r.email,
        userName: \`\${r.first_name || ''} \${r.last_name || ''}\`.trim(),
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        details: r.details,
        ipAddress: r.ip_address,
        createdAt: r.created_at
    }))});
});

const getAutomations = asyncHandler(async (req, res) => {
    const { rows } = await pool.query(`
        SELECT a.id, a.name, a.trigger_type, a.is_active, a.created_at, u.email,
            (SELECT COUNT(*) FROM automation_executions WHERE automation_id = a.id) as total_executions,
            (SELECT COUNT(*) FROM automation_executions WHERE automation_id = a.id AND status = 'failed') as failed_executions
        FROM automations a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 100
    `);
    
    res.json({ success: true, data: rows.map(r => ({
        id: r.id,
        name: r.name,
        triggerType: r.trigger_type,
        isActive: r.is_active,
        userEmail: r.email,
        totalExecutions: parseInt(r.total_executions) || 0,
        failedExecutions: parseInt(r.failed_executions) || 0,
        createdAt: r.created_at
    }))});
});

const getEmails = asyncHandler(async (req, res) => {
    const { rows } = await pool.query(`
        SELECT e.*, u.email as user_email
        FROM email_logs e
        LEFT JOIN users u ON e.user_id = u.id
        ORDER BY e.created_at DESC
        LIMIT 100
    `);
    
    res.json({ success: true, data: rows.map(r => ({
        id: r.id,
        userEmail: r.user_email,
        recipient: r.recipient,
        subject: r.subject,
        status: r.status,
        provider: r.provider,
        errorMessage: r.error_message,
        createdAt: r.created_at
    }))});
});

module.exports = {
    getPlatformStats,
    getUsers,
    getActivity,
    getAutomations,
    getEmails
};
