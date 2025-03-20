import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMessageDto {
  @IsNumber()
  @IsNotEmpty()
  conversationId: number;

  @IsString()
  @IsOptional()
  content: string;

  @IsString()
  @IsOptional()
  imageUrl: string;

  @IsString()
  @IsOptional()
  videoUrl: string;

  @IsString()
  @IsOptional()
  audioUrl: string;

  @IsString()
  @IsOptional()
  fileUrl: string;
}

export class UpdateMessageDto {
  @IsString()
  @IsOptional()
  content: string;

  @IsString()
  @IsOptional()
  imageUrl: string;

  @IsString()
  @IsOptional()
  videoUrl: string;

  @IsString()
  @IsOptional()
  audioUrl: string;

  @IsString()
  @IsOptional()
  fileUrl: string;
}

export class GetMessagesDto {
  @IsNumber()
  conversationId: number;

  @IsOptional()
  @Type(() => Date)
  lastMessageCreatedAt?: Date; // Cursor dựa vào timestamp

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20; // Số tin nhắn tối đa mỗi lần gọi API
}
