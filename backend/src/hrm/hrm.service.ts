import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  Attendance, AttendanceSource, AttendanceStatus, Department, Designation, Employee,
  EmploymentStatus, HrmSettings, User, UserRole,
} from '../entities';
import {
  CreateDepartmentDto,
  CreateDesignationDto,
  CreateEmployeeDto,
  AttendanceQueryDto,
  BulkAttendanceDto,
  EmployeeQueryDto,
  LinkEmployeeAccountDto,
  UpsertAttendanceDto,
  UpdateDepartmentDto,
  UpdateDesignationDto,
  UpdateEmployeeDto,
  UpdateHrmSettingsDto,
} from './dto/hrm.dto';

@Injectable()
export class HrmService {
  constructor(
    @InjectRepository(HrmSettings) private readonly settingsRepo: Repository<HrmSettings>,
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Designation) private readonly designationRepo: Repository<Designation>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Attendance) private readonly attendanceRepo: Repository<Attendance>,
    private readonly dataSource: DataSource,
  ) {}

  async getSettings(organizationId: string): Promise<HrmSettings> {
    let settings = await this.settingsRepo.findOne({ where: { organizationId } });
    if (!settings) settings = await this.settingsRepo.save(this.settingsRepo.create({ organizationId }));
    return settings;
  }

  async updateSettings(organizationId: string, dto: UpdateHrmSettingsDto): Promise<HrmSettings> {
    if (new Set(dto.workDays).size !== dto.workDays.length) throw new BadRequestException('Work days must be unique');
    const settings = await this.getSettings(organizationId);
    Object.assign(settings, dto, { currencyCode: dto.currencyCode.toUpperCase(), isConfigured: true });
    return this.settingsRepo.save(settings);
  }

  getDepartments(organizationId: string, includeArchived = false): Promise<Department[]> {
    return this.departmentRepo.find({
      where: { organizationId, ...(includeArchived ? {} : { isActive: true }) },
      order: { name: 'ASC' },
    });
  }

  async createDepartment(organizationId: string, dto: CreateDepartmentDto): Promise<Department> {
    await this.ensureUniqueName(this.departmentRepo, organizationId, dto.name);
    return this.departmentRepo.save(this.departmentRepo.create({ ...dto, name: dto.name.trim(), organizationId }));
  }

  async updateDepartment(organizationId: string, id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const department = await this.requireDepartment(organizationId, id);
    if (dto.name && dto.name.trim().toLowerCase() !== department.name.toLowerCase()) {
      await this.ensureUniqueName(this.departmentRepo, organizationId, dto.name);
    }
    Object.assign(department, dto, dto.name ? { name: dto.name.trim() } : {});
    return this.departmentRepo.save(department);
  }

  async archiveDepartment(organizationId: string, id: string): Promise<Department> {
    const department = await this.requireDepartment(organizationId, id);
    department.isActive = false;
    return this.departmentRepo.save(department);
  }

  getDesignations(organizationId: string, includeArchived = false): Promise<Designation[]> {
    return this.designationRepo.find({
      where: { organizationId, ...(includeArchived ? {} : { isActive: true }) },
      relations: ['department'],
      order: { name: 'ASC' },
    });
  }

  async createDesignation(organizationId: string, dto: CreateDesignationDto): Promise<Designation> {
    if (dto.departmentId) await this.requireDepartment(organizationId, dto.departmentId);
    await this.ensureUniqueName(this.designationRepo, organizationId, dto.name);
    return this.designationRepo.save(this.designationRepo.create({ ...dto, name: dto.name.trim(), organizationId }));
  }

  async updateDesignation(organizationId: string, id: string, dto: UpdateDesignationDto): Promise<Designation> {
    const designation = await this.designationRepo.findOne({ where: { id, organizationId } });
    if (!designation) throw new NotFoundException('Designation not found');
    if (dto.departmentId) await this.requireDepartment(organizationId, dto.departmentId);
    if (dto.name && dto.name.trim().toLowerCase() !== designation.name.toLowerCase()) {
      await this.ensureUniqueName(this.designationRepo, organizationId, dto.name);
    }
    Object.assign(designation, dto, dto.name ? { name: dto.name.trim() } : {});
    return this.designationRepo.save(designation);
  }

  async archiveDesignation(organizationId: string, id: string): Promise<Designation> {
    const designation = await this.designationRepo.findOne({ where: { id, organizationId } });
    if (!designation) throw new NotFoundException('Designation not found');
    designation.isActive = false;
    return this.designationRepo.save(designation);
  }

  async getEmployees(organizationId: string, query: EmployeeQueryDto) {
    const qb = this.employeeRepo.createQueryBuilder('employee')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.designation', 'designation')
      .where('employee.organizationId = :organizationId', { organizationId });
    if (query.search) {
      const search = `%${query.search.replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(`(employee.firstName ILIKE :search ESCAPE '\\' OR employee.lastName ILIKE :search ESCAPE '\\'
        OR employee.employeeCode ILIKE :search ESCAPE '\\' OR employee.email ILIKE :search ESCAPE '\\')`, { search });
    }
    if (query.status) qb.andWhere('employee.status = :status', { status: query.status });
    if (query.departmentId) qb.andWhere('employee.departmentId = :departmentId', { departmentId: query.departmentId });
    if (query.designationId) qb.andWhere('employee.designationId = :designationId', { designationId: query.designationId });
    const [employees, total] = await qb.orderBy('employee.employeeCode', 'ASC')
      .skip((query.page - 1) * query.limit).take(query.limit).getManyAndCount();
    return { employees, total, page: query.page, totalPages: Math.ceil(total / query.limit) };
  }

  async getEmployee(organizationId: string, id: string): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { id, organizationId }, relations: ['department', 'designation'],
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async createEmployee(organizationId: string, dto: CreateEmployeeDto): Promise<Employee> {
    await this.validateEmployeeReferences(organizationId, dto.departmentId, dto.designationId);
    if (dto.linkedUserId) await this.requireLinkableUser(organizationId, dto.linkedUserId);
    const employeeCode = (dto.employeeCode || `EMP-${randomUUID().replace(/-/g, '').slice(0, 8)}`).toUpperCase();
    if (await this.employeeRepo.findOne({ where: { organizationId, employeeCode } })) {
      throw new ConflictException('Employee code already exists');
    }
    const employee = this.employeeRepo.create({ ...dto, employeeCode, organizationId, status: EmploymentStatus.ACTIVE });
    return this.employeeRepo.save(employee);
  }

  async updateEmployee(organizationId: string, id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.getEmployee(organizationId, id);
    await this.validateEmployeeReferences(organizationId, dto.departmentId, dto.designationId);
    if (dto.employeeCode) dto.employeeCode = dto.employeeCode.toUpperCase();
    if (dto.status === EmploymentStatus.TERMINATED && !dto.terminationDate) {
      throw new BadRequestException('Termination date is required for terminated employees');
    }
    Object.assign(employee, dto);
    return this.employeeRepo.save(employee);
  }

  async archiveEmployee(organizationId: string, id: string): Promise<Employee> {
    const employee = await this.getEmployee(organizationId, id);
    employee.status = EmploymentStatus.INACTIVE;
    return this.employeeRepo.save(employee);
  }

  async linkEmployeeAccount(organizationId: string, id: string, dto: LinkEmployeeAccountDto): Promise<Employee> {
    const employee = await this.getEmployee(organizationId, id);
    if (!dto.userId) {
      employee.linkedUserId = null;
    } else {
      await this.requireLinkableUser(organizationId, dto.userId, id);
      employee.linkedUserId = dto.userId;
    }
    return this.employeeRepo.save(employee);
  }

  async getAccountCandidates(organizationId: string) {
    const users = await this.userRepo.find({
      where: { organizationId, role: UserRole.STAFF },
      select: { id: true, firstName: true, lastName: true, email: true, status: true },
      order: { firstName: 'ASC', lastName: 'ASC' },
    });
    const linked = new Set((await this.employeeRepo.find({
      where: { organizationId }, select: { linkedUserId: true },
    })).map((employee) => employee.linkedUserId).filter(Boolean));
    return users.filter((user) => !linked.has(user.id));
  }

  async getAttendance(organizationId: string, query: AttendanceQueryDto) {
    const qb = this.attendanceRepo.createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .where('attendance.organizationId = :organizationId', { organizationId });
    if (query.employeeId) qb.andWhere('attendance.employeeId = :employeeId', { employeeId: query.employeeId });
    if (query.startDate) qb.andWhere('attendance.workDate >= :startDate', { startDate: query.startDate });
    if (query.endDate) qb.andWhere('attendance.workDate <= :endDate', { endDate: query.endDate });
    if (query.status) qb.andWhere('attendance.status = :status', { status: query.status });
    const [records, total] = await qb.orderBy('attendance.workDate', 'DESC')
      .addOrderBy('employee.employeeCode', 'ASC')
      .skip((query.page - 1) * query.limit).take(query.limit).getManyAndCount();
    return { records, total, page: query.page, totalPages: Math.ceil(total / query.limit) };
  }

  async getAttendanceSummary(organizationId: string, startDate: string, endDate: string) {
    const rows = await this.attendanceRepo.createQueryBuilder('attendance')
      .select('attendance.status', 'status').addSelect('COUNT(*)', 'count')
      .where('attendance.organizationId = :organizationId', { organizationId })
      .andWhere('attendance.workDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('attendance.status').getRawMany<{ status: AttendanceStatus; count: string }>();
    return Object.values(AttendanceStatus).reduce((summary, status) => {
      summary[status] = Number(rows.find((row) => row.status === status)?.count || 0);
      return summary;
    }, {} as Record<AttendanceStatus, number>);
  }

  async upsertAttendance(organizationId: string, actorUserId: string, dto: UpsertAttendanceDto): Promise<Attendance> {
    const employee = await this.getEmployee(organizationId, dto.employeeId);
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Attendance);
      let attendance = await repo.findOne({ where: { organizationId, employeeId: employee.id, workDate: dto.workDate } });
      const schedule = await this.getScheduleSnapshot(employee, dto.workDate);
      if (!attendance) attendance = repo.create({ organizationId, employeeId: employee.id, workDate: dto.workDate });
      Object.assign(attendance, dto, schedule, {
        source: AttendanceSource.MANUAL,
        checkInAt: dto.checkInAt ? new Date(dto.checkInAt) : null,
        checkOutAt: dto.checkOutAt ? new Date(dto.checkOutAt) : null,
        createdById: attendance.createdById || actorUserId,
        updatedById: actorUserId,
      });
      this.calculateAttendanceMinutes(attendance, employee.graceMinutesOverride ?? (await this.getSettings(organizationId)).graceMinutes);
      return repo.save(attendance);
    });
  }

  async bulkAttendance(organizationId: string, actorUserId: string, dto: BulkAttendanceDto) {
    const dates = this.dateRange(dto.startDate, dto.endDate);
    if (dates.length > 366) throw new BadRequestException('Attendance range cannot exceed 366 days');
    const employees = await this.employeeRepo.createQueryBuilder('employee')
      .where('employee.organizationId = :organizationId', { organizationId })
      .andWhere('employee.id IN (:...ids)', { ids: dto.employeeIds }).getMany();
    if (employees.length !== new Set(dto.employeeIds).size) throw new NotFoundException('One or more employees were not found');
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Attendance);
      let saved = 0;
      for (const employee of employees) for (const workDate of dates) {
        let attendance = await repo.findOne({ where: { organizationId, employeeId: employee.id, workDate } });
        if (!attendance) attendance = repo.create({ organizationId, employeeId: employee.id, workDate });
        Object.assign(attendance, await this.getScheduleSnapshot(employee, workDate), {
          status: dto.status, source: AttendanceSource.MANUAL, notes: dto.notes || null,
          checkInAt: null, checkOutAt: null, workedMinutes: 0, lateMinutes: 0,
          createdById: attendance.createdById || actorUserId, updatedById: actorUserId,
        });
        await repo.save(attendance);
        saved += 1;
      }
      return { saved };
    });
  }

  private async getScheduleSnapshot(employee: Employee, workDate: string) {
    const settings = await this.getSettings(employee.organizationId);
    const start = employee.workStartTimeOverride || settings.workStartTime;
    const end = employee.workEndTimeOverride || settings.workEndTime;
    const scheduledStartAt = this.zonedDateTimeToUtc(workDate, start, settings.timezone);
    let endDate = workDate;
    if (end <= start) endDate = this.addDays(workDate, 1);
    return { scheduledStartAt, scheduledEndAt: this.zonedDateTimeToUtc(endDate, end, settings.timezone) };
  }

  private calculateAttendanceMinutes(attendance: Attendance, graceMinutes: number): void {
    attendance.workedMinutes = attendance.checkInAt && attendance.checkOutAt
      ? Math.max(0, Math.floor((attendance.checkOutAt.getTime() - attendance.checkInAt.getTime()) / 60000)) : 0;
    attendance.lateMinutes = attendance.checkInAt && attendance.scheduledStartAt
      ? Math.max(0, Math.floor((attendance.checkInAt.getTime() - attendance.scheduledStartAt.getTime()) / 60000) - graceMinutes) : 0;
  }

  private zonedDateTimeToUtc(date: string, time: string, timezone: string): Date {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute, second = 0] = time.split(':').map(Number);
    const target = Date.UTC(year, month - 1, day, hour, minute, second);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
    const parts = Object.fromEntries(formatter.formatToParts(new Date(target)).map((part) => [part.type, part.value]));
    const represented = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    return new Date(target - (represented - target));
  }

  private dateRange(start: string, end: string): string[] {
    if (end < start) throw new BadRequestException('End date must be on or after start date');
    const dates: string[] = [];
    for (let date = start; date <= end; date = this.addDays(date, 1)) dates.push(date);
    return dates;
  }

  private addDays(date: string, days: number): string {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  private async validateEmployeeReferences(organizationId: string, departmentId?: string, designationId?: string) {
    if (departmentId) await this.requireDepartment(organizationId, departmentId);
    if (designationId && !(await this.designationRepo.findOne({ where: { id: designationId, organizationId } }))) {
      throw new NotFoundException('Designation not found');
    }
  }

  private async requireLinkableUser(organizationId: string, userId: string, currentEmployeeId?: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId, organizationId, role: UserRole.STAFF } });
    if (!user) throw new NotFoundException('Staff account not found');
    const linked = await this.employeeRepo.findOne({ where: { linkedUserId: userId } });
    if (linked && linked.id !== currentEmployeeId) throw new ConflictException('Staff account is already linked');
    return user;
  }

  private async requireDepartment(organizationId: string, id: string): Promise<Department> {
    const department = await this.departmentRepo.findOne({ where: { id, organizationId } });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  private async ensureUniqueName<T extends { name: string; organizationId: string }>(
    repo: Repository<T>, organizationId: string, name: string,
  ): Promise<void> {
    const found = await repo.createQueryBuilder('item')
      .where('item.organizationId = :organizationId', { organizationId })
      .andWhere('lower(item.name) = lower(:name)', { name: name.trim() })
      .getOne();
    if (found) throw new ConflictException('Name already exists');
  }
}
