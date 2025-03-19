import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

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

  @ManyToOne(() => Post, (post) => post.reposts, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "repost_id" })
  repost: Post;
 
  @OneToMany(() => Post, (post) => post.repost)
  reposts: Post[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
  
  @CreateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
