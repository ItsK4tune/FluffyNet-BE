import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MessageDto {
  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  video?: string;

  @IsString()
  @IsOptional()
  audio?: string;

  @IsString()
  @IsOptional()
  file?: string;
}

export class CreateMessageDto extends MessageDto{
  @IsNumber()
  @IsNotEmpty()
  conversation_id: number;
}

export class GetMessagesDto {
  @IsNumber()
  conversation_id: number;

  @IsOptional()
  @Type(() => Date)
  lastMessageCreatedAt?: Date; // Cursor dựa vào timestamp

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20; // Số tin nhắn tối đa mỗi lần gọi API
}
