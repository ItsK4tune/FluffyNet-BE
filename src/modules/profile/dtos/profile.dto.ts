// src/modules/profile/dtos/profile.dto.ts
import { IsOptional, IsString, IsInt, Min, Max, IsUrl, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class ProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 50) 
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255) 
  bio?: string;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null && value !== '' ? parseInt(value, 10) : undefined))
  @IsInt()
  @Min(0)
  @Max(150)
  age?: number;

  @IsOptional()
  @IsString() 
  gender?: string;

  @IsOptional()
  @IsString() 
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  hobby?: string;

  @IsOptional()
  @IsString() 
  @IsUrl()
  socialLink?: string;
}