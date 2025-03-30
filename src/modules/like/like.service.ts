import { Injectable } from '@nestjs/common';
import { LikeUtil } from './like.util';
import { PostService } from '../post/post.service';
import { CommentUtil } from '../comment/comment.util';
import { CommentService } from '../comment/comment.service';

@Injectable()
export class LikeService {
    constructor (
        private readonly likeUtil: LikeUtil,
        private readonly postService: PostService,
        private readonly commentService: CommentService,
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
        const profile = this.postService.findOneById(post_id);

        if (!profile) {
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

        const likeCount = await this.likeUtil.getPostLikeCount(comment_id);
        return likeCount;
    }

    async likePost(user_id: number, post_id: number): Promise<Boolean> {
        const profile = this.postService.findOneById(post_id);
        if (!profile) {
            return null;
        }

        const log = await this.getPostLikeStatus(user_id, post_id);
        let status: boolean;
        if (log) status = await this.likeUtil.deleteLikePost(user_id, post_id);
        else status = await this.likeUtil.createLikePost(user_id, post_id);

        return status;
    }

    async likeComment(user_id: number, comment_id: number): Promise<Boolean> {
        const comment = this.commentService.findComment(comment_id);
        if (!comment) {
            return null;
        }

        const log = await this.getCommentLikeStatus(user_id, comment_id);
        let status: boolean;
        if (log) status = await this.likeUtil.deleteLikeComment(user_id, comment_id);
        else status = await this.likeUtil.createLikeComment(user_id, comment_id);

        return status;
    }
}
