import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdatePostDto {
  @ValidateIf((o) => !o.image && !o.video)
  @IsString()
  @IsNotEmpty()
  body?: string;

  @ValidateIf((o) => !o.body && !o.video)
  @IsString()
  @IsNotEmpty()
  image?: string;

  @ValidateIf((o) => !o.body && !o.image)
  @IsString()
  @IsNotEmpty()
  video?: string;

  @IsNumber()
  @IsOptional()
  repost_id?: number;
}
