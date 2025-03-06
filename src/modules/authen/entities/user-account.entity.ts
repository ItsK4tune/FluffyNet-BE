import { UserProfile } from 'src/modules/profile/entities/user-profile.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';

@Entity('User Account')
export class UserAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  username: string;

  @Column({ nullable: false })
  password: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ default: 'user' })
  role: string;

  @OneToOne(() => UserProfile, profile => profile.user, { cascade: true }) 
  // @JoinColumn({ name: 'username' })
  profile: UserProfile;
}
