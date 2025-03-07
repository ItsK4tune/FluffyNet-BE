import { Entity, Column, PrimaryColumn, OneToOne, JoinColumn } from 'typeorm';
import { UserAccount } from 'src/modules/authen/entities/user-account.entity';

@Entity('User Profile')
export class UserProfile {
  @PrimaryColumn()
  username: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  age: number;

  @Column({ nullable: true })
  gender: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  hobby: string;

  @Column({ nullable: true })
  socialLink: string;

  @OneToOne(() => UserAccount, account => account.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'username' })
  user: UserAccount;
}
