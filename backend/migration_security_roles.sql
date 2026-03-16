-- Security Roles and per-user permission overrides
-- Run manually in your SQL editor (PostgreSQL)

CREATE TABLE IF NOT EXISTS security_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    base_role TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    permissions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by_id UUID NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS security_role_id UUID NULL REFERENCES security_roles(id),
    ADD COLUMN IF NOT EXISTS permissions_override JSONB NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_users_security_role_id ON users(security_role_id);
CREATE INDEX IF NOT EXISTS idx_security_roles_created_by ON security_roles(created_by_id);

-- Seed system role templates (idempotent)
INSERT INTO security_roles (name, description, base_role, is_system, permissions_json)
VALUES
  ('SYSTEM_ADMIN', 'Template padrão ADMIN', 'ADMIN', TRUE, '["crm.view","crm.create_lead","crm.edit_lead","crm.delete_lead","crm.move_kanban","crm.assign_owner","crm.export","users.view","users.create","users.edit","users.delete","security.manage_roles","security.assign_permissions","settings.tabulations","settings.pipelines","settings.custom_fields","settings.form_templates","imports.open_accounts","imports.leads","reports.view","audit.view","api_keys.manage"]'::jsonb),
  ('SYSTEM_SUPERVISOR', 'Template padrão SUPERVISOR', 'SUPERVISOR', TRUE, '["crm.view","crm.create_lead","crm.edit_lead","crm.move_kanban","crm.assign_owner","crm.export","users.view","imports.open_accounts","imports.leads","reports.view","audit.view"]'::jsonb),
  ('SYSTEM_LEADER', 'Template padrão LEADER', 'LEADER', TRUE, '["crm.view","crm.create_lead","crm.edit_lead","crm.move_kanban","reports.view"]'::jsonb),
  ('SYSTEM_OPERATOR', 'Template padrão OPERATOR', 'OPERATOR', TRUE, '["crm.view","crm.create_lead","crm.edit_lead"]'::jsonb)
ON CONFLICT (name) DO NOTHING;
