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

@Entity('storefront_page_revisions')
@Index(['pageId', 'createdAt'])
export class StorefrontPageRevision {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @Column({ type: 'uuid' }) pageId: string;
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
  @Column({ type: 'uuid', nullable: true }) authorId: string | null;
  @CreateDateColumn() createdAt: Date;
}
