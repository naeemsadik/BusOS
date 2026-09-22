import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { SocialContentController } from './social-content.controller';
import { SocialContentService } from './social-content.service';

@Module({
  imports: [PermissionsModule],
  controllers: [SocialContentController],
  providers: [SocialContentService],
})
export class SocialContentModule {}
