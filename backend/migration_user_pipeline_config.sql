-- CreateTable
CREATE TABLE "user_pipeline_configs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "card_config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pipeline_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_pipeline_configs_user_id_pipeline_id_key" ON "user_pipeline_configs"("user_id", "pipeline_id");

-- AddForeignKey
ALTER TABLE "user_pipeline_configs" ADD CONSTRAINT "user_pipeline_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_pipeline_configs" ADD CONSTRAINT "user_pipeline_configs_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
