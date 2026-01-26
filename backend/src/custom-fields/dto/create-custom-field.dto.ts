import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum FieldType {
    TEXT = 'TEXT',
    NUMBER = 'NUMBER',
    DATE = 'DATE',
    BOOLEAN = 'BOOLEAN',
    SELECT = 'SELECT',
    MULTI_SELECT = 'MULTI_SELECT',
    USER = 'USER',
}

export class CreateCustomFieldDto {
    @IsUUID()
    @IsNotEmpty()
    pipeline_id: string;

    @IsString()
    @IsNotEmpty()
    key: string;

    @IsString()
    @IsNotEmpty()
    label: string;

    @IsEnum(FieldType)
    @IsNotEmpty()
    type: FieldType;

    @IsOptional()
    options?: any; // JSON

    @IsBoolean()
    @IsOptional()
    is_required?: boolean;

    @IsBoolean()
    @IsOptional()
    is_visible?: boolean;
}
