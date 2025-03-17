import { BufferedFile } from 'src/modules/minio-client/file.model';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  @Max(150)
  age?: number;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  hobby?: string;

  @IsOptional()
  @IsUrl()
  socialLink?: string;
}
