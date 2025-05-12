import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChatroomService } from '../chat-room/chatroom.service';
import { MemberService } from '../chat-member/member.service';
import { FollowEvent } from './follow-events.service';

@Injectable()
export class RoomEventsListener {
  private readonly logger = new Logger(RoomEventsListener.name);

  constructor(
    private readonly chatroomService: ChatroomService,
    private readonly memberService: MemberService,
  ) {}

  @OnEvent('follow.created')
  async handleFollowEvent(event: FollowEvent) {
    try {
      const { followerId, followingId, isFollowing } = event;
      // If user unfollowed, we don't need to do anything
      if (!isFollowing) {
        return;
      }

      // Check if there's an existing direct room between the users
      const existingRoom = await this.chatroomService.findDirectChatRoom(
        followerId,
        followingId,
      );

      if (existingRoom) {
        // Room exists, check if any member is in pending state
        const members = existingRoom.members || [];
        for (const member of members) {
          if (member.type === 'pending' && member.user_id === followerId) {
            // Accept the pending room
            this.logger.log(
              `Accepting pending room ${existingRoom.room_id} for user ${member.user_id}`,
            );
            await this.memberService.acceptChat(
              existingRoom.room_id,
              member.user_id,
            );
          }
        }
      } else {
        // No room exists, create a new direct room
        this.logger.log(
          `Creating new direct room between ${followerId} and ${followingId}`,
        );
        await this.chatroomService.createDirectChatRoom(
          followerId,
          followingId,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error handling follow event: ${error.message}`,
        error.stack,
      );
    }
  }
}
