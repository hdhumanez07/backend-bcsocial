import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
export enum OnboardingStatus {
  REQUESTED = 'REQUESTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}
@Entity('onboardings')
@Index('IDX_onboarding_user_status', ['userId', 'status'])
export class Onboarding {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'varchar', length: 255 })
  name: string;
  @Column({ type: 'text' })
  document: string;
  @Column({ type: 'varchar', length: 64, unique: true })
  @Index()
  documentHash: string;
  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  email: string;
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  initialAmount: number;
  @Column({
    type: 'enum',
    enum: OnboardingStatus,
    default: OnboardingStatus.REQUESTED,
  })
  status: OnboardingStatus;
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;
  @Column({ name: 'user_id' })
  userId: string;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
