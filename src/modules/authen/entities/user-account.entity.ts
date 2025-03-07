import { UserProfile } from 'src/modules/profile/entities/user-profile.entity';
import { Entity, Column, PrimaryColumn, OneToOne } from 'typeorm';

@Entity('User Account')
export class UserAccount {
  @PrimaryColumn()
  username: string;

  @Column({ nullable: false })
  password: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ default: 'user' })
  role: string;

  @OneToOne(() => UserProfile, profile => profile.user, { cascade: true }) 
  profile: UserProfile;
}
