import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Attendance, Department, Designation, Employee, EmployeeCompensation, Holiday,
  HrmAuditLog, HrmSettings, PayrollItem, PayrollRun, Subscription, User,
} from '../entities';
import { PermissionsModule } from '../permissions/permissions.module';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';
import { HrmController } from './hrm.controller';
import { HrmService } from './hrm.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Attendance, Department, Designation, Employee, EmployeeCompensation, Holiday,
      HrmAuditLog, HrmSettings, PayrollItem, PayrollRun, Subscription, User,
    ]),
    PermissionsModule,
  ],
  controllers: [HrmController],
  providers: [HrmService, SubscriptionGuard],
  exports: [HrmService],
})
export class HrmModule {}

