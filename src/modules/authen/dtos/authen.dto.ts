import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class AuthenDTO {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}