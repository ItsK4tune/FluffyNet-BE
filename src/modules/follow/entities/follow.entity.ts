import { Entity, PrimaryColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserProfile } from 'src/modules/profile/entities/user-profile.entity';

@Entity('follow')
export class Follow {
  @PrimaryColumn()
  follower_id: number;

  @PrimaryColumn()
  following_id: number;

  @ManyToOne(() => UserProfile, (user) => user.followers, { onDelete: 'CASCADE' })
  follower: UserProfile;

  @ManyToOne(() => UserProfile, (user) => user.following, { onDelete: 'CASCADE' })
  following: UserProfile;

  @CreateDateColumn()
  createdAt: Date;
}