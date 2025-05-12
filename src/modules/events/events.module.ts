import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FollowEventsService } from './follow-events.service';
import { RoomEventsListener } from './room-events.listener';
import { ChatroomModule } from '../chat-room/chatroom.module';
import { MemberModule } from '../chat-member/member.module';

@Module({
  imports: [EventEmitterModule.forRoot(), ChatroomModule, MemberModule],
  providers: [FollowEventsService, RoomEventsListener],
  exports: [FollowEventsService],
})
export class EventsModule {}
