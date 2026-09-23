import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Organization } from './organization.entity';

@Entity('storefront_assets')
@Index(['organizationId', 'sortOrder'])
export class StorefrontAsset {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' }) organization: Organization;
  @Column({ type: 'varchar', length: 500 }) url: string;
  @Column({ type: 'varchar', length: 255, unique: true }) storageKey: string;
  @Column({ type: 'varchar', length: 32 }) mimeType: string;
  @Column({ type: 'int' }) size: number;
  @Column({ type: 'int' }) width: number;
  @Column({ type: 'int' }) height: number;
  @Column({ type: 'int', default: 0 }) sortOrder: number;
  @Column({ type: 'varchar', length: 255, nullable: true }) altTextEn: string | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) altTextBn: string | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
