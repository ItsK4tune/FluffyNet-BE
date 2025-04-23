import { IsOptional, IsString, IsUrl, Length, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class ProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 20) 
  nickname?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20) 
  realname?: string;

  @IsOptional()
  @IsString()
  @Length(0, 250) 
  bio?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dob?: Date;

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