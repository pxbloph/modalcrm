import { IsBoolean, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export enum AutomationTrigger {
    ENTER_STAGE = 'ENTER_STAGE',
    LEAVE_STAGE = 'LEAVE_STAGE',
    SLA_BREACH = 'SLA_BREACH',
    FIELD_UPDATE = 'FIELD_UPDATE',
}

export class CreateAutomationDto {
    @IsUUID()
    @IsNotEmpty()
    pipeline_id: string;

    @IsUUID()
    @IsOptional()
    stage_id?: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEnum(AutomationTrigger)
    @IsNotEmpty()
    trigger: AutomationTrigger;

    @IsObject()
    @IsOptional()
    conditions?: any; // JSON logic or simple array

    @IsObject()
    @IsNotEmpty()
    actions: any; // { type: 'WEBHOOK', url: '...' } etc

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}
