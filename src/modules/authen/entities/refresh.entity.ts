import { Entity, Column, ManyToOne, CreateDateColumn, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Account } from './account.entity';

@Entity('refresh_token')
export class RefreshToken {
  @PrimaryGeneratedColumn()
  refresh_id: number;

  @Column({ type: 'text' })
  token: string;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  isRevoked: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Account, account => account.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Account;
}

