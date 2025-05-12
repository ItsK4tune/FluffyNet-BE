import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMessagesDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  roomId: number;

  @IsOptional()
  @Type(() => Date)
  lastMessageCreatedAt?: string; // Cursor dựa vào timestamp

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number; // Số tin nhắn tối đa mỗi lần gọi API
}

export class CreateMessageDto {
  @IsOptional()
  body?: string;

  @IsOptional()
  file?: string;
}

export class UpdateMessageDto {
  @IsOptional()
  body?: string;

  @IsOptional()
  file?: string;
}
