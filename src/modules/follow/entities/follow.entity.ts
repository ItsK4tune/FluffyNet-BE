import { Entity, PrimaryColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { Profile } from 'src/modules/profile/entities/user-profile.entity';

@Entity('follow')
export class Follow {
  @PrimaryColumn()
  follower_id: number;

  @PrimaryColumn()
  following_id: number;

  @ManyToOne(() => Profile, (user) => user.followers, {
    onDelete: 'CASCADE',
  })
  follower: Profile;

  @ManyToOne(() => Profile, (user) => user.following, {
    onDelete: 'CASCADE',
  })
  following: Profile;

  @CreateDateColumn()
  createdAt: Date;
}
