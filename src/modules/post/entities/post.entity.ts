import { Account } from 'src/modules/authen/entities/account.entity';
import { Like } from 'src/modules/like/entity/like.entity';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, RelationCount } from 'typeorm';

@Entity('post')
export class Post {
  @PrimaryGeneratedColumn()
  post_id: number;

  @Column()
  user_id: number;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ nullable: true })
  image: string | null;

  @Column({ nullable: true })
  video: string | null;

  @Index()
  @Column({ nullable: true })
  repost_id: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
  
  @CreateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToMany(() => Like, (like) => like.post)
  likes: Like[];

  @RelationCount((post: Post) => post.likes)
  like_count: number;
 
  @OneToMany(() => Post, (post) => post.repostOrigin)
  reposts: Post[];

  @ManyToOne(() => Account, (account) => account.posts, { onDelete: "CASCADE" })
  @JoinColumn({ name: 'user_id' })
  user: Account;  

  @ManyToOne(() => Post, (post) => post.reposts, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: 'repost_id' })
  repostOrigin: Post;
}
