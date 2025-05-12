import { Entity, PrimaryColumn, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { Profile } from 'src/modules/profile/entities/profile.entity';

@Entity('follow')
export class Follow {
  @PrimaryColumn()
  follower_id: number;

  @PrimaryColumn()
  following_id: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Profile, (user) => user.followers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'follower_id' })
  follower: Profile;

  @ManyToOne(() => Profile, (user) => user.followings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'following_id' })
  following: Profile;
}
