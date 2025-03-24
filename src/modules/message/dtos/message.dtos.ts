import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

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
