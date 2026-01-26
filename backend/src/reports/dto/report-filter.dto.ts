import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';

export class ReportFilterDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsString()
    operatorId?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    origin?: string;

    @IsOptional()
    @IsString()
    campaign?: string;
}
