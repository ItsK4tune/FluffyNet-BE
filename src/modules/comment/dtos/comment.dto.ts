import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsNotEmpty, ValidateIf, IsNumber } from 'class-validator';

export class CommentDto {
  @IsString()
  @IsNotEmpty()
  body?: string;

  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsNumber()
  parent_id?: number;
}