import { IsString, IsNotEmpty } from 'class-validator';

export class AuthenDTO {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}