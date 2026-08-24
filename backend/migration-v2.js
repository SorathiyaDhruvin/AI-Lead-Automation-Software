const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const runMigration = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. automation_workflows — replaces frontend-only workflow state
    await client.query(`
      CREATE TABLE IF NOT EXISTS automation_workflows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        trigger_type VARCHAR(100) NOT NULL,
        conditions JSONB DEFAULT '[]'::jsonb,
        actions JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created automation_workflows table');

    // 2. workflow_executions — real execution history with idempotency
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
        lead_id UUID NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        trigger_event VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'skipped')),
        actions_completed INT DEFAULT 0,
        total_actions INT DEFAULT 0,
        error TEXT,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        idempotency_key VARCHAR(500) UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created workflow_executions table');

    // 3. email_templates
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        body_html TEXT NOT NULL,
        variables JSONB DEFAULT '[]'::jsonb,
        is_system BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created email_templates table');

    // 4. email_logs — email delivery tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_id UUID,
        user_id VARCHAR(255),
        recipient VARCHAR(500) NOT NULL,
        subject VARCHAR(500),
        template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
        workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
        provider VARCHAR(100) DEFAULT 'resend',
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'delivered')),
        provider_message_id VARCHAR(500),
        error TEXT,
        sent_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created email_logs table');

    // 5. scheduled_actions — for delayed automation
    await client.query(`
      CREATE TABLE IF NOT EXISTS scheduled_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
        workflow_id UUID REFERENCES automation_workflows(id) ON DELETE CASCADE,
        lead_id UUID NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        action_config JSONB NOT NULL,
        scheduled_at TIMESTAMPTZ NOT NULL,
        executed_at TIMESTAMPTZ,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
        attempts INT DEFAULT 0,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Created scheduled_actions table');

    // 6. Add settings columns to users table
    const settingsColumns = [
      { name: 'email_notifications', type: 'BOOLEAN DEFAULT true' },
      { name: 'sms_notifications', type: 'BOOLEAN DEFAULT false' },
      { name: 'marketing_emails', type: 'BOOLEAN DEFAULT false' },
      { name: 'lead_alerts', type: 'BOOLEAN DEFAULT true' },
      { name: 'automation_alerts', type: 'BOOLEAN DEFAULT true' },
      { name: 'daily_digest', type: 'BOOLEAN DEFAULT false' },
      { name: 'automation_enabled', type: 'BOOLEAN DEFAULT true' },
      { name: 'theme', type: "VARCHAR(20) DEFAULT 'system'" },
      { name: 'timezone', type: "VARCHAR(100) DEFAULT 'UTC'" },
    ];

    for (const col of settingsColumns) {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
    }
    console.log('✅ Added settings columns to users table');

    // 7. Add indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_workflow_executions_lead ON workflow_executions(lead_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_workflow_executions_idempotency ON workflow_executions(idempotency_key);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_logs_lead ON email_logs(lead_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_scheduled_actions_status ON scheduled_actions(status, scheduled_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_workflows_user ON automation_workflows(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_automation_workflows_trigger ON automation_workflows(trigger_type);`);
    console.log('✅ Created indexes');

    // 8. Seed default system email templates
    await client.query(`
      INSERT INTO email_templates (id, user_id, name, subject, body_html, variables, is_system)
      SELECT gen_random_uuid(), NULL, name, subject, body_html, variables, true
      FROM (VALUES
        ('Welcome Email',
         'Welcome {{lead.name}}!',
         '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
           <h2 style="color: #0066FF; margin-top: 0;">Welcome to LeadFlow!</h2>
           <p>Hi {{lead.name}},</p>
           <p>Thank you for your interest. Our team will be in touch with you shortly.</p>
           <p>In the meantime, feel free to reach out if you have any questions.</p>
           <br/>
           <p style="color: #6C5CE7; font-weight: bold; margin-bottom: 0;">The LeadFlow Team</p>
         </div>',
         '["lead.name", "lead.email", "lead.company"]'::jsonb),
        ('Follow-up Email',
         'Following Up - {{lead.company}}',
         '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
           <h2 style="color: #0066FF; margin-top: 0;">Following Up</h2>
           <p>Hi {{lead.name}},</p>
           <p>We wanted to follow up and see if you had any questions about our services.</p>
           <p>We''d love to schedule a call at your convenience.</p>
           <br/>
           <p style="color: #6C5CE7; font-weight: bold; margin-bottom: 0;">The LeadFlow Team</p>
         </div>',
         '["lead.name", "lead.email", "lead.company"]'::jsonb),
        ('Lead Approved',
         'Your Request Has Been Approved, {{lead.name}}!',
         '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
           <h2 style="color: #00D68F; margin-top: 0;">Request Approved!</h2>
           <p>Hi {{lead.name}},</p>
           <p>Great news! Your lead request has been approved by our team.</p>
           <p>A member of our sales team will reach out to you shortly to discuss next steps.</p>
           <br/>
           <p style="color: #6C5CE7; font-weight: bold; margin-bottom: 0;">The LeadFlow Team</p>
         </div>',
         '["lead.name", "lead.email", "lead.company"]'::jsonb),
        ('Hot Lead Alert',
         '🔥 Hot Lead Alert: {{lead.name}} (Score: {{lead.score}})',
         '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
           <h2 style="color: #FF6B6B; margin-top: 0;">🔥 Hot Lead Detected!</h2>
           <p>A new hot lead has been identified:</p>
           <ul>
             <li><strong>Name:</strong> {{lead.name}}</li>
             <li><strong>Email:</strong> {{lead.email}}</li>
             <li><strong>Company:</strong> {{lead.company}}</li>
             <li><strong>AI Score:</strong> {{lead.score}}/100</li>
             <li><strong>Category:</strong> {{lead.category}}</li>
           </ul>
           <p>Please follow up with this lead as soon as possible.</p>
           <br/>
           <p style="color: #6C5CE7; font-weight: bold; margin-bottom: 0;">LeadFlow AI Automation</p>
         </div>',
         '["lead.name", "lead.email", "lead.company", "lead.score", "lead.category"]'::jsonb)
      ) AS t(name, subject, body_html, variables)
      WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE is_system = true LIMIT 1);
    `);
    console.log('✅ Seeded system email templates');

    await client.query('COMMIT');
    console.log('\n🎉 Migration v2 completed successfully!');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration v2 failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

runMigration();
