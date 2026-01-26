import { IsBoolean, IsHexColor, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStageDto {
    @IsUUID()
    @IsNotEmpty()
    pipeline_id: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsHexColor()
    @IsOptional()
    color?: string;

    @IsInt()
    @IsNotEmpty()
    order_index: number;

    @IsBoolean()
    @IsOptional()
    is_locked?: boolean;
}
