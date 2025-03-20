import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsOptional()
  userIds?: number[];
}

export class UpdateConversationDto {
  @IsString()
  @IsOptional()
  name?: string;
}
