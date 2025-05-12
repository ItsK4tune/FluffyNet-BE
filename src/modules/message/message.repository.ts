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
    lastMessageCreateAt?: Date,
    limit: number = 20,
  ): Promise<Message[]> {
    const query = this.repo
      .createQueryBuilder('message')
      .where('message.room_id = :room_id', { room_id });

    if (lastMessageCreateAt) {
      query.andWhere('message.created_at < :lastMessageCreateAt', {
        lastMessageCreateAt,
      });
    }

    return query.orderBy('message.created_at', 'DESC').take(limit).getMany();
  }

  async deleteMessage(message_id: number) {
    return await this.repo.delete({ message_id });
  }

  async getMessageById(message_id: number) {
    return await this.repo.findOne({ where: { message_id } });
  }
}
