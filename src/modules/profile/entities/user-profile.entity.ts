import { Entity, Column, PrimaryColumn, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserAccount } from 'src/modules/authen/entities/user-account.entity';

@Entity('user_profile')
export class UserProfile {
  @PrimaryColumn()
  user_id: number;

  @Column({ nullable: true, default: 'user' })
  name: string;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  age: number;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  background: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  hobby: string;

  @Column({ nullable: true })
  socialLink: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToOne(() => UserAccount, account => account.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserAccount;
}
