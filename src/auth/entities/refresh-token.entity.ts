import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'varchar', length: 500 })
  token: string;
  @Column({ type: 'timestamp' })
  expiresAt: Date;
  @Column({ type: 'boolean', default: false })
  isRevoked: boolean;
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
  @Column({ type: 'timestamp', nullable: true })
  usedAt: Date;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
  @Column()
  userId: string;
}
