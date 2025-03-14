import { Entity, Column, PrimaryColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserProfile } from 'src/modules/profile/entities/user-profile.entity';

@Entity('comment')
export class Comment {
  @PrimaryColumn()
  comment_id: string;

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

  @Column()
  user_id: string;

  @Column()
  post_id: string;

  @ManyToOne(() => UserProfile, (user) => user.user_id, { onDelete: 'CASCADE' })
  user: UserProfile;
}
