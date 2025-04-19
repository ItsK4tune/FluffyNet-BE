import { Profile } from 'src/modules/profile/entities/profile.entity';
import {
  Entity,
  Column,
  OneToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RefreshToken } from './refresh.entity';

@Entity('account')
export class Account {
  @PrimaryGeneratedColumn()
  user_id: number;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ nullable: false })
  password: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ default: false })
  is_banned: boolean;

  @Column({ type: 'text', nullable: true })
  ban_reason: string;
  
  @Column({ default: false })
  is_suspended: boolean;
  
  @Column({ default: null })
  suspended_until: Date;
  
  @Column({ type: 'text', nullable: true })
  suspend_reason: string;

  @Column({ default: false })
  is_verified: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToOne(() => Profile, (profile) => profile.user, { cascade: true })
  profile: Profile;

  @OneToMany(() => RefreshToken, refreshToken => refreshToken.user)
  refreshTokens: RefreshToken[];
}
