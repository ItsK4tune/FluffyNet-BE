import { Entity, Column, PrimaryColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm';
import { UserProfile } from 'src/modules/profile/entities/user-profile.entity';

@Entity('comment')
export class Comment {
  @PrimaryGeneratedColumn()
  comment_id: number;

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
  user_id: number;

  @Column()
  post_id: number;

  @ManyToOne(() => UserProfile, (user) => user.user_id, { onDelete: 'CASCADE' })
  user: UserProfile;
}
