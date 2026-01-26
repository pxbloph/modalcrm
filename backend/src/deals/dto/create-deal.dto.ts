import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export enum DealStatus {
    OPEN = 'OPEN',
    WON = 'WON',
    LOST = 'LOST',
    ABANDONED = 'ABANDONED',
}

export enum DealPriority {
    LOW = 'LOW',
    NORMAL = 'NORMAL',
    HIGH = 'HIGH',
}

export class CreateDealDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsUUID()
    @IsNotEmpty()
    pipeline_id: string;

    @IsUUID()
    @IsOptional()
    stage_id?: string;

    @IsUUID()
    @IsOptional()
    client_id?: string;

    @IsUUID()
    @IsOptional()
    responsible_id?: string;

    @IsNumber()
    @IsOptional()
    value?: number;

    @IsEnum(DealPriority)
    @IsOptional()
    priority?: DealPriority;

    @IsEnum(DealStatus)
    @IsOptional()
    status?: DealStatus;

    @IsOptional()
    custom_fields?: Record<string, any>; // Key: Field Key, Value: Value
}
