import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SubscriptionGuard } from '../auth/guards/subscription.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, PermissionModuleType } from '../entities';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequiredPermission } from '../permissions/decorators/permission.decorator';
import { HrmService } from './hrm.service';
import {
  CreateDepartmentDto,
  CreateDesignationDto,
  CreateEmployeeDto,
  AttendanceQueryDto,
  AuditQueryDto,
  BulkAttendanceDto,
  CreateHolidayDto,
  CreateCompensationDto,
  CreatePayrollRunDto,
  EmployeeQueryDto,
  LinkEmployeeAccountDto,
  RecordLeaveDto,
  MarkPayrollPaidDto,
  PayrollRunQueryDto,
  UpsertAttendanceDto,
  UpdateHolidayDto,
  UpdateCompensationDto,
  UpdatePayrollItemDto,
  UpdateDepartmentDto,
  UpdateDesignationDto,
  UpdateEmployeeDto,
  UpdateHrmSettingsDto,
} from './dto/hrm.dto';

@Controller('hrm')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class HrmController {
  constructor(private readonly hrm: HrmService) {}

  @Get('settings') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  getSettings(@Request() req) { return this.hrm.getSettings(req.user.organizationId); }

  @Patch('settings') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  updateSettings(@Request() req, @Body() dto: UpdateHrmSettingsDto) {
    return this.audited(req, 'settings.update', 'settings', this.hrm.updateSettings(req.user.organizationId, dto));
  }

  @Get('departments') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'view')
  departments(@Request() req, @Query('includeArchived') includeArchived?: string) {
    return this.hrm.getDepartments(req.user.organizationId, includeArchived === 'true');
  }

  @Post('departments') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'create')
  createDepartment(@Request() req, @Body() dto: CreateDepartmentDto) {
    return this.audited(req, 'department.create', 'department', this.hrm.createDepartment(req.user.organizationId, dto));
  }

  @Patch('departments/:id') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'edit')
  updateDepartment(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDepartmentDto) {
    return this.audited(req, 'department.update', 'department', this.hrm.updateDepartment(req.user.organizationId, id, dto));
  }

  @Post('departments/:id/archive') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'delete')
  archiveDepartment(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.audited(req, 'department.archive', 'department', this.hrm.archiveDepartment(req.user.organizationId, id));
  }

  @Get('designations') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'view')
  designations(@Request() req, @Query('includeArchived') includeArchived?: string) {
    return this.hrm.getDesignations(req.user.organizationId, includeArchived === 'true');
  }

  @Post('designations') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'create')
  createDesignation(@Request() req, @Body() dto: CreateDesignationDto) {
    return this.audited(req, 'designation.create', 'designation', this.hrm.createDesignation(req.user.organizationId, dto));
  }

  @Patch('designations/:id') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'edit')
  updateDesignation(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDesignationDto) {
    return this.audited(req, 'designation.update', 'designation', this.hrm.updateDesignation(req.user.organizationId, id, dto));
  }

  @Post('designations/:id/archive') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'delete')
  archiveDesignation(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.audited(req, 'designation.archive', 'designation', this.hrm.archiveDesignation(req.user.organizationId, id));
  }

  @Get('employees/account-candidates') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'edit')
  accountCandidates(@Request() req) { return this.hrm.getAccountCandidates(req.user.organizationId); }

  @Get('employees') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'view')
  employees(@Request() req, @Query() query: EmployeeQueryDto) {
    return this.hrm.getEmployees(req.user.organizationId, query);
  }

  @Post('employees') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'create')
  createEmployee(@Request() req, @Body() dto: CreateEmployeeDto) {
    return this.audited(req, 'employee.create', 'employee', this.hrm.createEmployee(req.user.organizationId, dto));
  }

  @Get('employees/:id') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'view')
  employee(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.hrm.getEmployee(req.user.organizationId, id);
  }

  @Patch('employees/:id') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'edit')
  updateEmployee(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto) {
    return this.audited(req, 'employee.update', 'employee', this.hrm.updateEmployee(req.user.organizationId, id, dto));
  }

  @Post('employees/:id/archive') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'delete')
  archiveEmployee(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.audited(req, 'employee.archive', 'employee', this.hrm.archiveEmployee(req.user.organizationId, id));
  }

  @Patch('employees/:id/account-link') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'edit')
  linkEmployee(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body() dto: LinkEmployeeAccountDto) {
    return this.audited(req, 'employee.account_link', 'employee', this.hrm.linkEmployeeAccount(req.user.organizationId, id, dto));
  }

  @Get('attendance') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'view')
  attendance(@Request() req, @Query() query: AttendanceQueryDto) {
    return this.hrm.getAttendance(req.user.organizationId, query);
  }

  @Get('attendance/summary') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'view')
  attendanceSummary(@Request() req, @Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.hrm.getAttendanceSummary(req.user.organizationId, startDate, endDate);
  }

  @Post('attendance/manual') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'edit')
  upsertAttendance(@Request() req, @Body() dto: UpsertAttendanceDto) {
    return this.audited(req, 'attendance.update', 'attendance', this.hrm.upsertAttendance(req.user.organizationId, req.user.id, dto));
  }

  @Post('attendance/bulk') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'edit')
  bulkAttendance(@Request() req, @Body() dto: BulkAttendanceDto) {
    return this.audited(req, 'attendance.bulk', 'attendance', this.hrm.bulkAttendance(req.user.organizationId, req.user.id, dto));
  }

  @Post('attendance/leave') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'edit')
  recordLeave(@Request() req, @Body() dto: RecordLeaveDto) {
    return this.audited(req, 'attendance.leave', 'attendance', this.hrm.recordLeave(req.user.organizationId, req.user.id, dto));
  }

  @Get('holidays') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'view')
  holidays(@Request() req, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.hrm.getHolidays(req.user.organizationId, startDate, endDate);
  }

  @Post('holidays') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'create')
  createHoliday(@Request() req, @Body() dto: CreateHolidayDto) {
    return this.audited(req, 'holiday.create', 'holiday', this.hrm.createHoliday(req.user.organizationId, dto));
  }

  @Patch('holidays/:id') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'edit')
  updateHoliday(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateHolidayDto) {
    return this.audited(req, 'holiday.update', 'holiday', this.hrm.updateHoliday(req.user.organizationId, id, dto));
  }

  @Post('holidays/:id/delete') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'delete')
  deleteHoliday(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.audited(req, 'holiday.delete', 'holiday', this.hrm.deleteHoliday(req.user.organizationId, id));
  }

  @Get('employees/:id/compensations') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  compensations(@Request() req, @Param('id', ParseUUIDPipe) employeeId: string) {
    return this.hrm.getCompensations(req.user.organizationId, employeeId);
  }

  @Post('employees/:id/compensations') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  createCompensation(
    @Request() req, @Param('id', ParseUUIDPipe) employeeId: string, @Body() dto: CreateCompensationDto,
  ) {
    return this.audited(req, 'compensation.create', 'compensation', this.hrm.createCompensation(req.user.organizationId, employeeId, req.user.id, dto));
  }

  @Patch('compensations/:id') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  updateCompensation(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCompensationDto) {
    return this.audited(req, 'compensation.update', 'compensation', this.hrm.updateCompensation(req.user.organizationId, id, dto));
  }

  @Get('payroll/runs') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  payrollRuns(@Request() req, @Query() query: PayrollRunQueryDto) {
    return this.hrm.getPayrollRuns(req.user.organizationId, query);
  }

  @Post('payroll/runs') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  generatePayroll(@Request() req, @Body() dto: CreatePayrollRunDto) {
    return this.audited(req, 'payroll.generate', 'payroll', this.hrm.generatePayroll(req.user.organizationId, req.user.id, dto));
  }

  @Get('payroll/runs/:id') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  payrollRun(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.hrm.getPayrollRun(req.user.organizationId, id);
  }

  @Patch('payroll/runs/:runId/items/:itemId') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  updatePayrollItem(
    @Request() req, @Param('runId', ParseUUIDPipe) runId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string, @Body() dto: UpdatePayrollItemDto,
  ) { return this.audited(req, 'payroll.adjust', 'payroll_item', this.hrm.updatePayrollItem(req.user.organizationId, runId, itemId, dto)); }

  @Post('payroll/runs/:id/finalize') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  finalizePayroll(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.audited(req, 'payroll.finalize', 'payroll', this.hrm.finalizePayroll(req.user.organizationId, id));
  }

  @Post('payroll/runs/:id/reopen') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  reopenPayroll(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.audited(req, 'payroll.reopen', 'payroll', this.hrm.reopenPayroll(req.user.organizationId, id));
  }

  @Post('payroll/runs/:id/mark-paid') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  markPayrollPaid(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body() dto: MarkPayrollPaidDto) {
    return this.audited(req, 'payroll.mark_paid', 'payroll', this.hrm.markPayrollPaid(req.user.organizationId, id, dto));
  }

  @Get('overview') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'view')
  overview(@Request() req) { return this.hrm.getOverview(req.user.organizationId); }

  @Get('attendance/export.csv') @UseGuards(PermissionsGuard) @RequiredPermission(PermissionModuleType.HRM, 'view')
  async attendanceExport(@Request() req, @Query() query: AttendanceQueryDto, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"');
    return this.hrm.exportAttendanceCsv(req.user.organizationId, query);
  }

  @Get('payroll/runs/:id/export.csv') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  async payrollExport(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="payroll-${id}.csv"`);
    return this.hrm.exportPayrollCsv(req.user.organizationId, id);
  }

  @Get('audit-logs') @UseGuards(RolesGuard) @Roles(UserRole.OWNER)
  auditLogs(@Request() req, @Query() query: AuditQueryDto) {
    return this.hrm.getAuditLogs(req.user.organizationId, query);
  }

  private async audited(req: any, action: string, entityType: string, operation: Promise<any>) {
    const result = await operation;
    await this.hrm.recordAudit(req.user.organizationId, req.user.id, action, entityType, result?.id || null, result);
    return result;
  }

  @Get('attendance/me')
  myAttendance(@Request() req, @Query() query: AttendanceQueryDto) {
    return this.hrm.getMyAttendance(req.user.organizationId, req.user.id, query);
  }

  @Get('employees/me/profile')
  myEmployee(@Request() req) { return this.hrm.getMyEmployee(req.user.organizationId, req.user.id); }

  @Post('attendance/clock-in')
  clockIn(@Request() req) {
    return this.audited(req, 'attendance.clock_in', 'attendance', this.hrm.clockIn(req.user.organizationId, req.user.id));
  }

  @Post('attendance/clock-out')
  clockOut(@Request() req) {
    return this.audited(req, 'attendance.clock_out', 'attendance', this.hrm.clockOut(req.user.organizationId, req.user.id));
  }
}
