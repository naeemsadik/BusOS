import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum CmsAiSuggestionOutcome {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EDITED = 'edited',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

@Entity('cms_ai_suggestions')
@Index(['organizationId', 'createdAt'])
export class CmsAiSuggestion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @Column({ type: 'uuid' }) userId: string;
  @Column({ type: 'uuid', nullable: true }) pageId: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) sectionId:
    | string
    | null;
  @Column({ type: 'varchar', length: 40 }) actionType: string;
  @Column({ type: 'varchar', length: 100 }) providerModel: string;
  @Column({ type: 'jsonb', default: () => `'[]'::jsonb` })
  inputSourceTypes: string[];
  @Column({
    type: 'enum',
    enum: CmsAiSuggestionOutcome,
    default: CmsAiSuggestionOutcome.PENDING,
  })
  outcome: CmsAiSuggestionOutcome;
  @Column({ type: 'int', nullable: true }) latencyMs: number | null;
  @Column({ type: 'int', nullable: true }) usageEstimate: number | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) failureCode:
    | string
    | null;
  @CreateDateColumn() createdAt: Date;
}
