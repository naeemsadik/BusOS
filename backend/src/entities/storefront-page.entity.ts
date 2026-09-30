import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  StorefrontDocument,
  StorefrontLocale,
  StorefrontSeoSettings,
} from '../storefront/storefront.types';
import { StorefrontSite } from './storefront-site.entity';

export enum StorefrontPageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum StorefrontPageKind {
  HOME = 'home',
  CUSTOM = 'custom',
}

export enum StorefrontPageLifecycleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished',
}

export enum StorefrontPageType {
  HOME = 'home',
  ABOUT = 'about',
  CONTACT = 'contact',
  PROMOTION = 'promotion',
  LANDING = 'landing',
  DELIVERY = 'delivery',
  FAQ = 'faq',
  CUSTOM = 'custom',
}

@Entity('storefront_pages')
@Index(['siteId', 'slug'], { unique: true })
@Index(['organizationId', 'status'])
export class StorefrontPage {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @Column({ type: 'uuid' }) siteId: string;
  @ManyToOne(() => StorefrontSite, { onDelete: 'CASCADE' })
  site: StorefrontSite;
  @Column({ type: 'varchar', length: 120 }) title: string;
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  localizedTitle: Partial<Record<StorefrontLocale, string>>;
  @Column({ type: 'varchar', length: 80 }) slug: string;
  @Column({
    type: 'enum',
    enum: StorefrontPageType,
    default: StorefrontPageType.CUSTOM,
  })
  pageType: StorefrontPageType;
  @Column({
    type: 'enum',
    enum: StorefrontPageStatus,
    default: StorefrontPageStatus.DRAFT,
  })
  status: StorefrontPageStatus;
  @Column({ type: 'enum', enum: StorefrontPageKind })
  kind: StorefrontPageKind;
  @Column({
    type: 'enum',
    enum: StorefrontPageLifecycleStatus,
    default: StorefrontPageLifecycleStatus.DRAFT,
  })
  lifecycleStatus: StorefrontPageLifecycleStatus;
  @Column({ type: 'boolean', default: false }) isHomePage: boolean;
  @Column({ type: 'boolean', default: false }) includeInNavigation: boolean;
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  navigationLabel: Partial<Record<StorefrontLocale, string>>;
  @Column({ type: 'int', default: 0 }) navigationOrder: number;
  @Column({ type: 'boolean', default: false }) showInMenu: boolean;
  @Column({ type: 'int', default: 0 }) menuOrder: number;
  @Column({ type: 'jsonb', default: () => `'["en"]'::jsonb` })
  enabledLocales: StorefrontLocale[];
  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  seoSettings: StorefrontSeoSettings;
  @Column({ type: 'jsonb' }) draftDocument: StorefrontDocument;
  @Column({ type: 'jsonb', nullable: true })
  publishedDocument: StorefrontDocument | null;
  @Column({ type: 'int', default: 1 }) draftVersion: number;
  @Column({ type: 'int', nullable: true }) publishedVersion: number | null;
  @Column({ type: 'timestamp', nullable: true }) publishedAt: Date | null;
  @Column({ type: 'uuid', nullable: true }) createdBy: string | null;
  @Column({ type: 'uuid', nullable: true }) updatedBy: string | null;
  @Column({ type: 'timestamp', nullable: true }) deletedAt: Date | null;
  @Column({ type: 'timestamp', nullable: true }) purgeAfter: Date | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
