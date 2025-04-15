import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsOptional()
  userIds?: number[];
}

export class UpdateRoomDto {
  @IsString()
  @IsNotEmpty()
  name?: string;
}
