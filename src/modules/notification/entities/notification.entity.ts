// import {
//   Column,
//   Entity,
//   JoinColumn,
//   ManyToOne,
//   PrimaryGeneratedColumn,
// } from 'typeorm';
// import { Profile } from '../../profile/entities/profile.entity';
//
// @Entity('notification')
// export class Notify {
//   @PrimaryGeneratedColumn()
//   id: number;
//
//   @Column()
//   user_id: number;
//
//   @Column()
//   type: string; // 'message' | 'mention' | 'reaction' | 'reply' | 'follow' | 'like' | 'share' | 'invite' | 'request' | 'reminder' | 'alert' | 'warning' | 'error'
//
//   @Column()
//   title: string;
//
//   @Column()
//   body: string;
//
//   @Column()
//   read: boolean;
//
//   @Column()
//   created_at: Date;
//
//   @Column()
//   updated_at: Date;
//
//   @ManyToOne(() => Profile, (user) => user.notifies)
//   @JoinColumn({ name: 'user_id' })
//   user: Profile;
// }