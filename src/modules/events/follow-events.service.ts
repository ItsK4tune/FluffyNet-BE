import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface FollowEvent {
  followerId: number;
  followingId: number;
  isFollowing: boolean;
}

@Injectable()
export class FollowEventsService {
  constructor(private eventEmitter: EventEmitter2) {}

  emitFollowEvent(
    followerId: number,
    followingId: number,
    isFollowing: boolean,
  ): void {
    this.eventEmitter.emit('follow.created', {
      followerId,
      followingId,
      isFollowing,
    } as FollowEvent);
  }
}
