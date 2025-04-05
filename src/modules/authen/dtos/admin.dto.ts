import { IsString, IsNotEmpty } from 'class-validator';

export class AdminDTO {
  @IsString()
  @IsNotEmpty()
  username?: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
