const pool = require("../config/db");

const emailTemplateModel = {
    async getAll(userId) {
        const { rows } = await pool.query(
            `SELECT * FROM email_templates 
             WHERE user_id = $1 OR is_system = true
             ORDER BY is_system DESC, created_at DESC`,
            [userId]
        );
        return rows;
    },

    async getById(id) {
        const { rows } = await pool.query(
            `SELECT * FROM email_templates WHERE id = $1`,
            [id]
        );
        return rows[0] || null;
    },

    async getByName(name) {
        const { rows } = await pool.query(
            `SELECT * FROM email_templates WHERE name = $1 LIMIT 1`,
            [name]
        );
        return rows[0] || null;
    },

    async create({ userId, name, subject, bodyHtml, variables = [], isSystem = false }) {
        const { rows } = await pool.query(
            `INSERT INTO email_templates (user_id, name, subject, body_html, variables, is_system)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [userId, name, subject, bodyHtml, JSON.stringify(variables), isSystem]
        );
        return rows[0];
    },

    async update(id, userId, fields) {
        const allowed = {
            name: "name",
            subject: "subject",
            bodyHtml: "body_html",
            body_html: "body_html",
            variables: "variables",
        };

        const updates = [];
        const values = [];
        let paramIndex = 1;

        for (const [inputKey, dbCol] of Object.entries(allowed)) {
            if (fields[inputKey] !== undefined) {
                const value = dbCol === "variables" 
                    ? JSON.stringify(fields[inputKey]) 
                    : fields[inputKey];
                updates.push(`${dbCol} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (updates.length === 0) return null;

        updates.push("updated_at = NOW()");

        values.push(id, userId);
        const { rows } = await pool.query(
            `UPDATE email_templates SET ${updates.join(", ")}
             WHERE id = $${paramIndex} AND (user_id = $${paramIndex + 1} OR is_system = true)
             RETURNING *`,
            values
        );
        return rows[0] || null;
    },

    async delete(id, userId) {
        // Prevent deleting system templates
        const { rowCount } = await pool.query(
            `DELETE FROM email_templates WHERE id = $1 AND user_id = $2 AND is_system = false`,
            [id, userId]
        );
        return rowCount > 0;
    },

    /**
     * Render a template with variables replaced.
     * Variables use {{variable}} syntax, e.g. {{lead.name}}, {{lead.email}}
     */
    renderTemplate(template, variables) {
        let subject = template.subject;
        let body = template.body_html;

        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
            subject = subject.replace(regex, value || "");
            body = body.replace(regex, value || "");
        }

        return { subject, body };
    }
};

module.exports = emailTemplateModel;
