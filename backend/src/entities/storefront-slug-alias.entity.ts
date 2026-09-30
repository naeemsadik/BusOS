import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StorefrontSite } from './storefront-site.entity';

@Entity('storefront_slug_aliases')
@Index(['oldSlug'], { unique: true })
@Index(['siteId', 'expiresAt'])
export class StorefrontSlugAlias {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @Column({ type: 'uuid' }) siteId: string;
  @ManyToOne(() => StorefrontSite, { onDelete: 'CASCADE' })
  site: StorefrontSite;
  @Column({ type: 'varchar', length: 63 }) oldSlug: string;
  @Column({ type: 'timestamp' }) expiresAt: Date;
  @CreateDateColumn() createdAt: Date;
}
