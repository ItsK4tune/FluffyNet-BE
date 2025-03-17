import { IsString, IsNotEmpty, IsEmail, ValidateIf } from 'class-validator';

export class AuthenDTO {
  @ValidateIf((o) => !o.email) 
  @IsString()
  @IsNotEmpty()
  username?: string;

  @ValidateIf((o) => !o.username) 
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}