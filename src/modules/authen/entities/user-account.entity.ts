import { UserProfile } from 'src/modules/profile/entities/user-profile.entity';
import {
  Entity,
  Column,
  OneToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_account')
export class UserAccount {
  @PrimaryGeneratedColumn()
  user_id: number;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ nullable: false })
  password: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ default: false })
  verifyEmail: boolean;

  @Column({ default: 'user' })
  role: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToOne(() => UserProfile, (profile) => profile.user, { cascade: true })
  profile: UserProfile;
}
