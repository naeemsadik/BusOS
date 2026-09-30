import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import {
  StorefrontDocument,
  StorefrontOrderSettings,
  StorefrontSeoSettings,
  StorefrontThemeTokens,
} from '../storefront/storefront.types';

export enum StorefrontPublicationStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished',
  // Retained only so rows created by the legacy migration can be read safely.
  INACTIVE = 'inactive',
}

@Entity('storefront_sites')
@Index(['organizationId'], { unique: true })
@Index(['slug'], { unique: true })
export class StorefrontSite {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @OneToOne(() => Organization, (organization) => organization.storefrontSite, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;
  @Column({ type: 'varchar', length: 63 }) slug: string;
  @Column({
    type: 'enum',
    enum: StorefrontPublicationStatus,
    default: StorefrontPublicationStatus.DRAFT,
  })
  status: StorefrontPublicationStatus;
  @Column({ type: 'jsonb', default: () => `'["en"]'::jsonb` })
  enabledLocales: Array<'en' | 'bn'>;
  @Column({ type: 'varchar', length: 2, default: 'en' }) defaultLocale:
    | 'en'
    | 'bn';
  @Column({ type: 'jsonb', default: () => "'{}'" })
  themeTokens: StorefrontThemeTokens;
  @Column({ type: 'jsonb', default: () => "'{}'" })
  seoSettings: StorefrontSeoSettings;
  @Column({ type: 'jsonb', default: () => "'{}'" })
  orderSettings: StorefrontOrderSettings;
  @Column({ type: 'boolean', default: true }) aiEnabled: boolean;
  @Column({ type: 'boolean', default: true }) orderingEnabled: boolean;
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  orderingPausedMessage: Partial<Record<'en' | 'bn', string>>;
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  draftSettings: Record<string, any>;
  @Column({ type: 'jsonb', nullable: true })
  publishedSettings: Record<string, any> | null;
  @Column({ type: 'int', default: 1 }) settingsVersion: number;
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  shopProfile: Record<string, any>;
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  setupProgress: Record<string, any>;
  @Column({ type: 'uuid', nullable: true }) publishRequestedBy: string | null;
  @Column({ type: 'timestamp', nullable: true }) publishRequestedAt: Date | null;
  @Column({ type: 'timestamp', nullable: true }) firstPublishedAt: Date | null;
  @Column({ type: 'timestamp', nullable: true }) lastPublishedAt: Date | null;
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  slugChanges: Array<{ from: string; to: string; changedAt: string }>;
  @Column({ type: 'jsonb' }) draftDocument: StorefrontDocument;
  @Column({ type: 'jsonb', nullable: true })
  publishedDocument: StorefrontDocument | null;
  @Column({ type: 'int', default: 1 }) draftVersion: number;
  @Column({ type: 'int', nullable: true }) publishedVersion: number | null;
  @Column({ type: 'timestamp', nullable: true }) publishedAt: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
