import { IsOptional, IsString, IsNotEmpty, ValidateIf } from 'class-validator';

export class CommentDto {
  @ValidateIf((o) => !o.image && !o.video)  
  @IsString()
  @IsNotEmpty()
  body?: string;

  @ValidateIf((o) => !o.body && !o.video)  
  @IsOptional()
  @IsString()
  image?: string;

  @ValidateIf((o) => !o.body && !o.image) 
  @IsOptional()
  @IsString()
  video?: string;
}