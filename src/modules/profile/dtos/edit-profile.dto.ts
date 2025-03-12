import {
  IsEmail,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsUrl,
} from 'class-validator';

export class ProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(150)
  age?: number;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;

  @IsOptional()
  @IsUrl()
  background?: string;

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
