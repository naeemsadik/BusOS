import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Subscription } from './subscription.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  website: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  city: string;

  @Column({ type: 'varchar', nullable: true })
  state: string;

  @Column({ type: 'varchar', nullable: true })
  country: string;

  @Column({ type: 'varchar', nullable: true })
  postalCode: string;

  @Column({ type: 'varchar', nullable: true })
  logo: string;

  @Column({ default: true })
  isActive: boolean;

  // Courier Service API credentials
  @Column({ type: 'varchar', nullable: true })
  steadfastApiKey: string;

  @Column({ type: 'varchar', nullable: true })
  steadfastSecretKey: string;

  @Column({ type: 'varchar', nullable: true })
  pathaoClientId: string;

  @Column({ type: 'varchar', nullable: true })
  pathaoClientSecret: string;

  @Column({ type: 'varchar', nullable: true })
  pathaoUsername: string;

  @Column({ type: 'varchar', nullable: true })
  pathaoPassword: string;

  @Column({ type: 'text', nullable: true })
  pathaoAccessToken: string;

  @Column({ type: 'text', nullable: true })
  pathaoRefreshToken: string;

  @Column({ type: 'timestamp', nullable: true })
  pathaoTokenExpiresAt: Date;

  @Column({ type: 'varchar', nullable: true })
  redxApiKey: string;

  @Column({ type: 'varchar', nullable: true })
  redxEnvironment: string;

  // Paperfly API credentials (optional, mainly for tracking)
  @Column({ type: 'varchar', nullable: true })
  paperflyApiKey: string;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToOne(() => Subscription, (subscription) => subscription.organization)
  @JoinColumn()
  subscription: Subscription;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
