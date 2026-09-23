import { Column, CreateDateColumn, Entity, Index, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { StorefrontDocument } from '../storefront/storefront.types';

export enum StorefrontPublicationStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  INACTIVE = 'inactive',
}

@Entity('storefront_sites')
@Index(['organizationId'], { unique: true })
@Index(['slug'], { unique: true })
export class StorefrontSite {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @OneToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' }) organization: Organization;
  @Column({ type: 'varchar', length: 63 }) slug: string;
  @Column({ type: 'enum', enum: StorefrontPublicationStatus, default: StorefrontPublicationStatus.DRAFT }) status: StorefrontPublicationStatus;
  @Column({ type: 'jsonb', default: () => `'["en"]'::jsonb` }) enabledLocales: Array<'en' | 'bn'>;
  @Column({ type: 'varchar', length: 2, default: 'en' }) defaultLocale: 'en' | 'bn';
  @Column({ type: 'jsonb', default: () => "'{}'" }) themeTokens: Record<string, unknown>;
  @Column({ type: 'jsonb', default: () => "'{}'" }) seoSettings: Record<string, unknown>;
  @Column({ type: 'jsonb', default: () => "'{}'" }) orderSettings: Record<string, unknown>;
  @Column({ type: 'jsonb' }) draftDocument: StorefrontDocument;
  @Column({ type: 'jsonb', nullable: true }) publishedDocument: StorefrontDocument | null;
  @Column({ type: 'int', default: 1 }) draftVersion: number;
  @Column({ type: 'int', nullable: true }) publishedVersion: number | null;
  @Column({ type: 'timestamp', nullable: true }) publishedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
