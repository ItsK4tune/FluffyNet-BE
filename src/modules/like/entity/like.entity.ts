import { Comment } from 'src/modules/comment/entities/comment.entity';
import { Post } from 'src/modules/post/entities/post.entity';
import { Profile } from 'src/modules/profile/entities/profile.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    Column,
} from 'typeorm';

@Entity('likes')
export class Like {
    @PrimaryGeneratedColumn()
    like_id: number;

    @Column({ nullable: false})
    user_id: number;

    @Column({ nullable: true })
    post_id: number;

    @Column({ nullable: true })
    comment_id: number;

    @ManyToOne(() => Profile, (profile) => profile.user_id, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: "user_id" }) 
    profile: Profile;

    @ManyToOne(() => Post, (post) => post.post_id, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: "post_id" }) 
    post: Post;

    @ManyToOne(() => Comment, (comment) => comment.comment_id, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: "comment_id" }) 
    comment: Comment;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}