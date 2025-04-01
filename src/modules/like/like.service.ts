import { Injectable } from '@nestjs/common';
import { LikeUtil } from './like.util';
import { PostService } from '../post/post.service';
import { CommentService } from '../comment/comment.service';
import { NotificationService } from '../notification/notification.service';
import { ProfileService } from '../profile/profile.service';
import { Profile } from '../profile/entities/profile.entity';

@Injectable()
export class LikeService {
    constructor (
        private readonly likeUtil: LikeUtil,
        private readonly postService: PostService,
        private readonly commentService: CommentService,
        private readonly notificationService: NotificationService,
        private readonly profileService: ProfileService,
    ) {}

    async getPostLikeStatus(user_id: number, post_id: number): Promise<boolean> {
        const like = await this.likeUtil.getPostLikeStatus(user_id, post_id);
        return !!like; 
    }

    async getCommentLikeStatus(user_id: number, comment_id: number): Promise<boolean> {
        const like = await this.likeUtil.getCommentLikeStatus(user_id, comment_id);
        return !!like; 
    }

    async getPostLikeCount(post_id: number): Promise<Number | String> {
        const post = this.postService.findOneById(post_id);
        if (!post) {
            return 'No';
        }
        const likeCount = await this.likeUtil.getPostLikeCount(post_id);
        return likeCount;
    }

    async getCommentLikeCount(comment_id: number): Promise<Number | String> {
        const comment = this.commentService.findComment(comment_id);;
        if (!comment) {
            return 'No';
        }
        const likeCount = await this.likeUtil.getCommentLikeCount(comment_id);
        return likeCount;
    }

    async likePost(user_id: number, post_id: number): Promise<Boolean> {
        const post = await this.postService.findOneById(post_id);
        if (!post) {
            return null;
        }
        const postOwnerId = post.user_id;
        const isAlreadyLiked = await this.getPostLikeStatus(user_id, post_id);

        let success: boolean;
        if (isAlreadyLiked) {
            success = await this.likeUtil.deleteLikePost(user_id, post_id);
        } else {
            success = await this.likeUtil.createLikePost(user_id, post_id);
            if (success && user_id !== postOwnerId) {
                try {
                    const likerProfile = await this.profileService.getProfile(user_id) as Profile;
                    if (likerProfile) {
                        const notificationType = 'LIKE_POST';
                        const notificationBody = {
                        liker: {
                            user_id: likerProfile.user_id,
                            displayName: likerProfile.name,
                            avatarUrl: likerProfile.avatar,
                        },
                            post: { id: post_id },
                            message: `${likerProfile.name || `User ${user_id}`} liked your post.`,
                            createdAt: new Date().toISOString(),
                        };
                        this.notificationService.createNotification(postOwnerId, notificationType, notificationBody);
                    } else {
                        console.error(`Profile not found for liker user_id: ${user_id}`);
                    }
                } catch (error) {
                    // TODO: 
                }
            }
        }

        return success;
    }

    async likeComment(user_id: number, comment_id: number): Promise<Boolean> {
        const comment = await this.commentService.findComment(comment_id);
        if (!comment) {
            return null;
        }
        const commentOwnerId = comment.user_id;
        const isAlreadyLiked = await this.getCommentLikeStatus(user_id, comment_id);
        let status: boolean;
        let success: boolean;
        if (isAlreadyLiked) {
            success = await this.likeUtil.deleteLikeComment(user_id, comment_id);
        } else {
            success = await this.likeUtil.createLikeComment(user_id, comment_id);
            if (success && user_id !== commentOwnerId) {
                 try {
                    const likerProfile = await this.profileService.getProfile(user_id) as Profile;
                    if (likerProfile) {
                        const notificationType = 'LIKE_COMMENT';
                        const notificationBody = {
                            liker: {
                                user_id: likerProfile.user_id,
                                displayName: likerProfile.name,
                                avatarUrl: likerProfile.avatar,
                        },
                        comment: { id: comment_id },
                        message: `${likerProfile.name || `User ${user_id}`} liked your comment.`,
                            createdAt: new Date().toISOString(),
                        };

                        this.notificationService.createNotification(commentOwnerId, notificationType, notificationBody);
                    } else {
                        console.error(`Profile not found for liker user_id: ${user_id}`);
                    }
                } catch (error) {
                    // TODO:
                }
            }
        }

        return success;
    }
}
