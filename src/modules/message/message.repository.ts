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
    conversation_id: number,
    lastMessageId: Date,
    limit: number = 20,
  ) {
    const whereCondition: any = { conversation_id };

    if (lastMessageId) {
      whereCondition.created_at = LessThan(lastMessageId);
    }

    return this.repo.find({
      where: whereCondition,
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async deleteMessage(id: number) {
    return await this.repo.delete(id);
  }

  async getMessageById(id: number) {
    return await this.repo.findOne({ where: { id } });
  }
}
