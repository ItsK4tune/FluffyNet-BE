import { IsEmail, IsOptional, IsString, ValidateIf } from 'class-validator';

export class ViewProfileDto {
  @ValidateIf((o) => !o.email)
  @IsOptional()
  @IsString()
  username?: string;

  @ValidateIf((o) => !o.username)
  @IsOptional()
  @IsEmail()
  email?: string;
}