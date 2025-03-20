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
    conversationId: number,
    lastMessageCreatedAt?: Date,
    limit: number = 20,
  ) {
    const whereCondition: any = { conversationId };

    if (lastMessageCreatedAt) {
      whereCondition.createdAt = LessThan(lastMessageCreatedAt);
    }

    return this.repo.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
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
