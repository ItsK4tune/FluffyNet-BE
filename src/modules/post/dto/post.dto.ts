import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class PostDto {
  @IsString()
  @IsOptional()
  body?: string;

  @IsNumber()
  @IsOptional()
  repost_id?: number;
}
