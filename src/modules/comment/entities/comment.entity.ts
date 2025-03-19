import { Entity, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { Profile } from 'src/modules/profile/entities/profile.entity';

@Entity('comment')
export class Comment {
  @PrimaryGeneratedColumn()
  comment_id: number;

  @Column()
  user_id: number;

  @Column()
  post_id: number;

  @Column({ nullable: true })
  parent_id?: number;

  @Column()
  body: string;

  @Column({ nullable: true })
  image?: string;

  @Column({ nullable: true })
  video?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Profile, (user) => user.user_id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: "user_id" })
  user: Profile;

  @ManyToOne(() => Comment, (comment) => comment.replies, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: "parent_id" })
  parentComment?: Comment;

  @OneToMany(() => Comment, (comment) => comment.parentComment)
  replies: Comment[];
}
