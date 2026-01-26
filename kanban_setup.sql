-- SAFE ENUM CREATION
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PipelineVisibility') THEN
        CREATE TYPE "PipelineVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'RESTRICTED');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FieldType') THEN
        CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'USER');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DealStatus') THEN
        CREATE TYPE "DealStatus" AS ENUM ('OPEN', 'WON', 'LOST', 'ABANDONED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DealPriority') THEN
        CREATE TYPE "DealPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AutomationTrigger') THEN
        CREATE TYPE "AutomationTrigger" AS ENUM ('ENTER_STAGE', 'LEAVE_STAGE', 'SLA_BREACH', 'FIELD_UPDATE');
    END IF;
END $$;

-- PIPELINES
CREATE TABLE IF NOT EXISTS "pipelines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "PipelineVisibility" NOT NULL DEFAULT 'PUBLIC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- PIPELINE STAGES
CREATE TABLE IF NOT EXISTS "pipeline_stages" (
    "id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#000000',
    "order_index" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "sla_minutes" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CUSTOM FIELDS
CREATE TABLE IF NOT EXISTS "custom_fields" (
    "id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FieldType" NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);

-- DEALS
CREATE TABLE IF NOT EXISTS "deals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "client_id" TEXT,
    "responsible_id" TEXT,
    "status" "DealStatus" NOT NULL DEFAULT 'OPEN',
    "value" DECIMAL(15, 2),
    "priority" "DealPriority" NOT NULL DEFAULT 'NORMAL',
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "stage_entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- DEAL CUSTOM FIELD VALUES
CREATE TABLE IF NOT EXISTS "deal_custom_field_values" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "value" TEXT,
    "value_json" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_custom_field_values_pkey" PRIMARY KEY ("id")
);

-- DEAL HISTORY
CREATE TABLE IF NOT EXISTS "deal_history" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_history_pkey" PRIMARY KEY ("id")
);

-- AUTOMATIONS
CREATE TABLE IF NOT EXISTS "automations" (
    "id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "stage_id" TEXT,
    "name" TEXT NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "conditions" JSONB DEFAULT '[]',
    "actions" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- TAGS
CREATE TABLE IF NOT EXISTS "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- DEAL TAGS
CREATE TABLE IF NOT EXISTS "deal_tags" (
    "deal_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_tags_pkey" PRIMARY KEY ("deal_id","tag_id")
);

-- UNIQUE INDEXES (Using IF NOT EXISTS logic via DO block or just CREATE UNIQUE INDEX IF NOT EXISTS if PG version supports it, defaulting to standard CREATE INDEX IF NOT EXISTS for PG12+)
CREATE UNIQUE INDEX IF NOT EXISTS "pipeline_stages_pipeline_id_order_index_key" ON "pipeline_stages"("pipeline_id", "order_index");
CREATE INDEX IF NOT EXISTS "pipeline_stages_pipeline_id_order_index_idx" ON "pipeline_stages"("pipeline_id", "order_index");

CREATE UNIQUE INDEX IF NOT EXISTS "custom_fields_pipeline_id_key_key" ON "custom_fields"("pipeline_id", "key");
CREATE UNIQUE INDEX IF NOT EXISTS "deal_custom_field_values_deal_id_field_id_key" ON "deal_custom_field_values"("deal_id", "field_id");
CREATE UNIQUE INDEX IF NOT EXISTS "tags_name_key" ON "tags"("name");

-- FOREIGN KEYS (Ideally should check existence first, but commonly ALTER TABLE ADD CONSTRAINT fails if exists. We will use DO block for robust FK addition)

DO $$ 
BEGIN 
    -- PIPELINE STAGES
    BEGIN
        ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    -- CUSTOM FIELDS
    BEGIN
        ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    -- DEALS
    BEGIN
        ALTER TABLE "deals" ADD CONSTRAINT "deals_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER TABLE "deals" ADD CONSTRAINT "deals_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER TABLE "deals" ADD CONSTRAINT "deals_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER TABLE "deals" ADD CONSTRAINT "deals_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    -- DEAL CUSTOM FIELD VALUES
    BEGIN
        ALTER TABLE "deal_custom_field_values" ADD CONSTRAINT "deal_custom_field_values_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER TABLE "deal_custom_field_values" ADD CONSTRAINT "deal_custom_field_values_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "custom_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    -- DEAL HISTORY
    BEGIN
        ALTER TABLE "deal_history" ADD CONSTRAINT "deal_history_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER TABLE "deal_history" ADD CONSTRAINT "deal_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    -- AUTOMATIONS
    BEGIN
        ALTER TABLE "automations" ADD CONSTRAINT "automations_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER TABLE "automations" ADD CONSTRAINT "automations_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    -- DEAL TAGS
    BEGIN
        ALTER TABLE "deal_tags" ADD CONSTRAINT "deal_tags_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER TABLE "deal_tags" ADD CONSTRAINT "deal_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
