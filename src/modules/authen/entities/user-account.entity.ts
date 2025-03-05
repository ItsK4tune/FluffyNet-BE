import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('User Account')
export class UserAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, default: null })
  username: string;

  @Column()
  password: string;

  @Column({ unique: true, default: null })
  email: string;

  // @Column({ default: '' })
  // avatar: string;

  // @CreateDateColumn()
  // createdAt: Date;

  // @UpdateDateColumn()
  // updatedAt: Date;
}
