import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { UpdateRoomDto } from './dtos/room.dtos';
import { ChatRoom } from './entities/room.entity';

@Injectable()
export class ChatRoomRepository {
  constructor(
    @InjectRepository(ChatRoom)
    private readonly repo: Repository<ChatRoom>,
  ) {}

  async save(chatRoom: ChatRoom) {
    return this.repo.save(chatRoom);
  }

  async delete(room_id: number) {
    return this.repo.delete(room_id);
  }

  async update(chat_room_id: number, updateRoomDto: UpdateRoomDto) {
    return this.repo.update(chat_room_id, updateRoomDto);
  }

  async findByUserId(user_id: number, type: string) {
    return this.repo
      .createQueryBuilder('chat_room')
      .innerJoin(
        'chat_room.members',
        'member',
        'member.user_id = :user_id AND member.type = :type',
        { user_id, type },
      )
      .leftJoinAndSelect('chat_room.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .getMany();
  }

  async findDirectChatRoom(user_id1: number, user_id2: number) {
    return this.repo
      .createQueryBuilder('chat_room')
      .where('chat_room.type = :type', { type: 'direct' })
      .leftJoin('chat_room.members', 'members')
      .andWhere('members.user_id IN (:ids)', { ids: [user_id1, user_id2] })
      .groupBy('chat_room.room_id')
      .having('COUNT(DISTINCT members.user_id) = 2')
      .getOne();
  }

  async findById(room_id: number) {
    return this.repo
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.members', 'members')
      .where('room.room_id = :room_id', { room_id })
      .getOne();
  }
}
