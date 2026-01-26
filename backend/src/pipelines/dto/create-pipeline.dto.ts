import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum PipelineVisibility {
    PUBLIC = 'PUBLIC',
    PRIVATE = 'PRIVATE',
    RESTRICTED = 'RESTRICTED',
}

export class CreatePipelineDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(PipelineVisibility)
    @IsOptional()
    visibility?: PipelineVisibility;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;
}
