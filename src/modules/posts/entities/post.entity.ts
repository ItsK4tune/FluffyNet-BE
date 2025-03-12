import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('post')
export class Post {
  @PrimaryGeneratedColumn()
  post_id: number;

  @Column()
  user_id: number;

  @Column({ nullable: true })
  body: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  video: string;

  @Column({ nullable: true })
  repost_id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
