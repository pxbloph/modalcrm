import { IsString, IsNotEmpty, IsOptional, IsEmail, IsPhoneNumber, IsBoolean, IsNumber } from 'class-validator';

export class CreateN8nClientDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    surname?: string;

    @IsString()
    @IsNotEmpty()
    cnpj: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    @IsOptional()
    tabulacao?: string;

    @IsString()
    @IsOptional()
    created_by_id?: string;

    // Campos extras de qualificação (opcionais) que o n8n pode mandar
    @IsNumber()
    @IsOptional()
    faturamento_mensal?: number;

    @IsNumber()
    @IsOptional()
    faturamento_maquina?: number;

    @IsString()
    @IsOptional()
    maquininha_atual?: string;

    @IsString()
    @IsOptional()
    produto_interesse?: string;
}
