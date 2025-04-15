import { Injectable } from '@nestjs/common';
import { LessThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';

@Injectable()
export class MessageRepository {
  constructor(
    @InjectRepository(Message) private readonly repo: Repository<Message>,
  ) {}
  async saveMessage(message: Message) {
    return await this.repo.save(message);
  }

  async getMessages(
    room_id: number,
    lastMessageCreateAt: Date,
    limit: number = 20,
  ) {
    const whereCondition: any = { room_id };

    if (lastMessageCreateAt)
      whereCondition.created_at = LessThan(lastMessageCreateAt);

    return this.repo.find({
      where: whereCondition,
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async deleteMessage(message_id: number) {
    return await this.repo.delete({ message_id });
  }

  async getMessageById(message_id: number) {
    return await this.repo.findOne({ where: { message_id } });
  }
}
