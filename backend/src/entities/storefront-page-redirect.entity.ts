import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('storefront_page_redirects')
@Index(['siteId', 'fromSlug'], { unique: true })
export class StorefrontPageRedirect {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @Column({ type: 'uuid' }) siteId: string;
  @Column({ type: 'uuid' }) pageId: string;
  @Column({ type: 'varchar', length: 80 }) fromSlug: string;
  @Column({ type: 'varchar', length: 80 }) toSlug: string;
  @CreateDateColumn() createdAt: Date;
}
