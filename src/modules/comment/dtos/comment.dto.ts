import { Transform } from 'class-transformer';
import { IsOptional, IsString, ValidateIf, IsNumber } from 'class-validator';

export class CommentDto {
  @IsString()
  @IsOptional()
  body?: string;

  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsNumber()
  parent_id?: number;

  @ValidateIf(o => o.parent_id !== null && o.parent_id !== undefined)
  isPure?: boolean; 
}