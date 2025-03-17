import { Entity, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Profile } from 'src/modules/profile/entities/profile.entity';

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

  @ManyToOne(() => Profile, (user) => user.user_id, { onDelete: 'CASCADE' })
  user: Profile;
}
