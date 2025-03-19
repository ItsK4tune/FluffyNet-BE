import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class PostDto {
  @IsString()
  @IsOptional()
  body?: string;

  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? parseInt(value, 10) : undefined))
  @IsInt()
  @IsOptional()
  repost_id?: number;
}
