import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
  Length
} from 'class-validator';

export class PostDto {
  @IsString()
  @IsOptional() 
  @Length(0, 1000) 
  body?: string;

  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? parseInt(value, 10) : undefined))
  @IsInt()
  @IsOptional()
  repost_id?: number | null;

  @ValidateIf(o => o.repost_id !== null && o.repost_id !== undefined)
  isPureRepost?: boolean; 
}