import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  StorefrontDocument,
  StorefrontSeoSettings,
} from '../storefront/storefront.types';
import { StorefrontPage } from './storefront-page.entity';

export enum StorefrontRevisionOrigin {
  MANUAL = 'manual',
  TEMPLATE = 'template',
  AI = 'ai',
  RESTORE = 'restore',
}

export enum StorefrontRevisionKind {
  PUBLISHED = 'published',
  CHECKPOINT = 'checkpoint',
}

@Entity('storefront_page_revisions')
@Index(['pageId', 'createdAt'])
export class StorefrontPageRevision {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @Column({ type: 'uuid', nullable: true }) siteId: string | null;
  @Column({ type: 'uuid', nullable: true }) pageId: string | null;
  @ManyToOne(() => StorefrontPage, { onDelete: 'CASCADE' })
  page: StorefrontPage;
  @Column({ type: 'int' }) version: number;
  @Column({ type: 'jsonb' }) document: StorefrontDocument;
  @Column({ type: 'jsonb' }) settings: {
    seoSettings: StorefrontSeoSettings;
    enabledLocales: string[];
  };
  @Column({
    type: 'enum',
    enum: StorefrontRevisionOrigin,
    default: StorefrontRevisionOrigin.MANUAL,
  })
  origin: StorefrontRevisionOrigin;
  @Column({
    type: 'enum',
    enum: StorefrontRevisionKind,
    default: StorefrontRevisionKind.CHECKPOINT,
  })
  kind: StorefrontRevisionKind;
  @Column({ type: 'varchar', length: 160, default: 'Checkpoint' })
  label: string;
  @Column({ type: 'uuid', nullable: true }) authorId: string | null;
  @Column({ type: 'uuid', nullable: true }) createdBy: string | null;
  @CreateDateColumn() createdAt: Date;
}
