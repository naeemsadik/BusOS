import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  Attendance, AttendanceSource, AttendanceStatus, Department, Designation, Employee,
  EmployeeCompensation, EmploymentStatus, Holiday, HrmSettings, PayrollItem, PayrollStatus,
  HrmAuditLog, PayrollAdjustmentType, PayrollRun, PayType, User, UserRole,
} from '../entities';
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

@Injectable()
export class HrmService {
  constructor(
    @InjectRepository(HrmSettings) private readonly settingsRepo: Repository<HrmSettings>,
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Designation) private readonly designationRepo: Repository<Designation>,
    @InjectRepository(Employee) private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Attendance) private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(Holiday) private readonly holidayRepo: Repository<Holiday>,
    @InjectRepository(EmployeeCompensation) private readonly compensationRepo: Repository<EmployeeCompensation>,
    @InjectRepository(PayrollItem) private readonly payrollItemRepo: Repository<PayrollItem>,
    @InjectRepository(PayrollRun) private readonly payrollRunRepo: Repository<PayrollRun>,
    @InjectRepository(HrmAuditLog) private readonly auditRepo: Repository<HrmAuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async getSettings(organizationId: string): Promise<HrmSettings> {
    let settings = await this.settingsRepo.findOne({ where: { organizationId } });
    if (!settings) {
      await this.settingsRepo.createQueryBuilder().insert().values({ organizationId }).orIgnore().execute();
      settings = await this.settingsRepo.findOne({ where: { organizationId } });
    }
    if (!settings) throw new NotFoundException('Unable to initialize HRM settings');
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

  recordLeave(organizationId: string, actorUserId: string, dto: RecordLeaveDto) {
    return this.bulkAttendance(organizationId, actorUserId, dto);
  }

  getHolidays(organizationId: string, startDate?: string, endDate?: string): Promise<Holiday[]> {
    const qb = this.holidayRepo.createQueryBuilder('holiday')
      .where('holiday.organizationId = :organizationId', { organizationId });
    if (startDate) qb.andWhere('holiday.holidayDate >= :startDate', { startDate });
    if (endDate) qb.andWhere('holiday.holidayDate <= :endDate', { endDate });
    return qb.orderBy('holiday.holidayDate', 'ASC').getMany();
  }

  async createHoliday(organizationId: string, dto: CreateHolidayDto): Promise<Holiday> {
    if (await this.holidayRepo.findOne({ where: { organizationId, holidayDate: dto.holidayDate } })) {
      throw new ConflictException('A holiday already exists on this date');
    }
    return this.holidayRepo.save(this.holidayRepo.create({ ...dto, name: dto.name.trim(), organizationId }));
  }

  async updateHoliday(organizationId: string, id: string, dto: UpdateHolidayDto): Promise<Holiday> {
    const holiday = await this.holidayRepo.findOne({ where: { id, organizationId } });
    if (!holiday) throw new NotFoundException('Holiday not found');
    if (dto.holidayDate && dto.holidayDate !== holiday.holidayDate) {
      const duplicate = await this.holidayRepo.findOne({ where: { organizationId, holidayDate: dto.holidayDate } });
      if (duplicate) throw new ConflictException('A holiday already exists on this date');
    }
    Object.assign(holiday, dto, dto.name ? { name: dto.name.trim() } : {});
    return this.holidayRepo.save(holiday);
  }

  async deleteHoliday(organizationId: string, id: string): Promise<void> {
    const result = await this.holidayRepo.delete({ id, organizationId });
    if (!result.affected) throw new NotFoundException('Holiday not found');
  }

  async getCompensations(organizationId: string, employeeId: string): Promise<EmployeeCompensation[]> {
    await this.getEmployee(organizationId, employeeId);
    return this.compensationRepo.find({ where: { organizationId, employeeId }, order: { effectiveFrom: 'DESC' } });
  }

  async createCompensation(
    organizationId: string, employeeId: string, actorUserId: string, dto: CreateCompensationDto,
  ): Promise<EmployeeCompensation> {
    const employee = await this.getEmployee(organizationId, employeeId);
    if (dto.effectiveFrom < employee.joiningDate) throw new BadRequestException('Compensation cannot start before joining date');
    const settings = await this.getSettings(organizationId);
    if (!settings.isConfigured) throw new BadRequestException('Configure HRM settings before adding compensation');
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(EmployeeCompensation);
      const revisions = await repo.find({ where: { organizationId, employeeId }, order: { effectiveFrom: 'ASC' } });
      if (revisions.some((item) => item.effectiveFrom === dto.effectiveFrom)) {
        throw new ConflictException('A compensation revision already starts on this date');
      }
      const previous = [...revisions].reverse().find((item) => item.effectiveFrom < dto.effectiveFrom);
      const next = revisions.find((item) => item.effectiveFrom > dto.effectiveFrom);
      if (previous) {
        previous.effectiveTo = this.addDays(dto.effectiveFrom, -1);
        await repo.save(previous);
      }
      return repo.save(repo.create({
        ...dto, organizationId, employeeId, createdById: actorUserId,
        currencyCode: settings.currencyCode, effectiveTo: next ? this.addDays(next.effectiveFrom, -1) : null,
      }));
    });
  }

  async updateCompensation(
    organizationId: string, id: string, dto: UpdateCompensationDto,
  ): Promise<EmployeeCompensation> {
    const compensation = await this.compensationRepo.findOne({ where: { id, organizationId } });
    if (!compensation) throw new NotFoundException('Compensation revision not found');
    const usedByFinalized = await this.payrollItemRepo.createQueryBuilder('item')
      .innerJoin('item.run', 'run')
      .where('item.compensationId = :id', { id })
      .andWhere('run.status IN (:...statuses)', { statuses: [PayrollStatus.FINALIZED, PayrollStatus.PAID] })
      .getCount();
    if (usedByFinalized) throw new ConflictException('Compensation used by finalized payroll cannot be edited');
    Object.assign(compensation, dto);
    return this.compensationRepo.save(compensation);
  }

  async getPayrollRuns(organizationId: string, query: PayrollRunQueryDto) {
    const qb = this.payrollRunRepo.createQueryBuilder('run')
      .where('run.organizationId = :organizationId', { organizationId });
    if (query.year) qb.andWhere('run.year = :year', { year: query.year });
    if (query.status) qb.andWhere('run.status = :status', { status: query.status });
    const [runs, total] = await qb.orderBy('run.year', 'DESC').addOrderBy('run.month', 'DESC')
      .skip((query.page - 1) * query.limit).take(query.limit).getManyAndCount();
    return { runs, total, page: query.page, totalPages: Math.ceil(total / query.limit) };
  }

  async getPayrollRun(organizationId: string, id: string): Promise<PayrollRun> {
    const run = await this.payrollRunRepo.findOne({
      where: { id, organizationId }, relations: ['items'],
      order: { items: { employeeCode: 'ASC' } },
    });
    if (!run) throw new NotFoundException('Payroll run not found');
    return run;
  }

  async generatePayroll(organizationId: string, actorUserId: string, dto: CreatePayrollRunDto): Promise<PayrollRun> {
    const settings = await this.getSettings(organizationId);
    if (!settings.isConfigured) throw new BadRequestException('Configure HRM settings before generating payroll');
    const periodStart = `${dto.year}-${String(dto.month).padStart(2, '0')}-01`;
    const periodEnd = new Date(Date.UTC(dto.year, dto.month, 0)).toISOString().slice(0, 10);
    return this.dataSource.transaction(async (manager) => {
      const runRepo = manager.getRepository(PayrollRun);
      const itemRepo = manager.getRepository(PayrollItem);
      let run = await runRepo.findOne({ where: { organizationId, year: dto.year, month: dto.month }, relations: ['items'] });
      if (run && run.status !== PayrollStatus.DRAFT) throw new ConflictException('Only draft payroll can be regenerated');
      const oldAdjustments = new Map((run?.items || []).map((item) => [item.employeeId, item.adjustments]));
      if (!run) {
        run = await runRepo.save(runRepo.create({
          organizationId, year: dto.year, month: dto.month, periodStart, periodEnd,
          currencyCode: settings.currencyCode, status: PayrollStatus.DRAFT, generatedById: actorUserId,
        }));
      } else {
        await itemRepo.delete({ runId: run.id });
      }

      const employees = await manager.getRepository(Employee).createQueryBuilder('employee')
        .where('employee.organizationId = :organizationId', { organizationId })
        .andWhere('employee.joiningDate <= :periodEnd', { periodEnd })
        .andWhere('(employee.terminationDate IS NULL OR employee.terminationDate >= :periodStart)', { periodStart })
        .orderBy('employee.employeeCode', 'ASC').getMany();
      const holidays = await manager.getRepository(Holiday).createQueryBuilder('holiday')
        .where('holiday.organizationId = :organizationId', { organizationId })
        .andWhere('holiday.holidayDate BETWEEN :periodStart AND :periodEnd', { periodStart, periodEnd }).getMany();
      const holidayMap = new Map(holidays.map((holiday) => [holiday.holidayDate, holiday]));
      let totalNetMinor = 0;

      for (const employee of employees) {
        const revisions = await manager.getRepository(EmployeeCompensation).createQueryBuilder('compensation')
          .where('compensation.organizationId = :organizationId', { organizationId })
          .andWhere('compensation.employeeId = :employeeId', { employeeId: employee.id })
          .andWhere('compensation.effectiveFrom <= :periodEnd', { periodEnd })
          .andWhere('(compensation.effectiveTo IS NULL OR compensation.effectiveTo >= :periodStart)', { periodStart })
          .orderBy('compensation.effectiveFrom', 'ASC').getMany();
        if (!revisions.length) continue;
        const records = await manager.getRepository(Attendance).createQueryBuilder('attendance')
          .where('attendance.organizationId = :organizationId', { organizationId })
          .andWhere('attendance.employeeId = :employeeId', { employeeId: employee.id })
          .andWhere('attendance.workDate BETWEEN :periodStart AND :periodEnd', { periodStart, periodEnd }).getMany();
        const recordMap = new Map(records.map((record) => [record.workDate, record]));
        const workDays = employee.workDaysOverride || settings.workDays;
        const allScheduledDates = this.dateRange(periodStart, periodEnd).filter((date) => workDays.includes(this.weekday(date)));
        if (!allScheduledDates.length) throw new BadRequestException(`No scheduled workdays exist for ${employee.employeeCode}`);
        let scheduledDays = 0, presentDays = 0, absentDays = 0, paidLeaveDays = 0;
        let unpaidLeaveDays = 0, paidHolidayDays = 0, unresolvedDays = 0, workedMinutes = 0, lateMinutes = 0;
        let baseMinor = 0;
        for (const date of allScheduledDates) {
          if (date < employee.joiningDate || (employee.terminationDate && date > employee.terminationDate)) continue;
          scheduledDays += 1;
          const compensation = [...revisions].reverse().find((item) => item.effectiveFrom <= date && (!item.effectiveTo || item.effectiveTo >= date));
          if (!compensation) throw new BadRequestException(`Compensation does not cover ${date} for ${employee.employeeCode}`);
          const attendance = recordMap.get(date);
          const holiday = holidayMap.get(date);
          let payableDaily = false;
          if (holiday?.isPaid || attendance?.status === AttendanceStatus.HOLIDAY) {
            paidHolidayDays += 1;
            payableDaily = true;
          } else if (!attendance) {
            unresolvedDays += 1;
          } else {
            workedMinutes += attendance.workedMinutes;
            lateMinutes += attendance.lateMinutes;
            if (attendance.status === AttendanceStatus.PRESENT) { presentDays += 1; payableDaily = true; }
            else if (attendance.status === AttendanceStatus.ABSENT) absentDays += 1;
            else if (attendance.status === AttendanceStatus.PAID_LEAVE) { paidLeaveDays += 1; payableDaily = true; }
            else if (attendance.status === AttendanceStatus.UNPAID_LEAVE) unpaidLeaveDays += 1;
          }
          const rateMinor = this.toMinor(Number(compensation.baseRate));
          if (compensation.payType === PayType.DAILY) {
            if (payableDaily) baseMinor += rateMinor;
          } else {
            baseMinor += rateMinor / allScheduledDates.length;
          }
        }
        baseMinor = Math.round(baseMinor);
        const latest = revisions[revisions.length - 1];
        const adjustments = oldAdjustments.get(employee.id) || [];
        const additionsMinor = adjustments.filter((item) => item.type === PayrollAdjustmentType.EARNING)
          .reduce((sum, item) => sum + this.toMinor(item.amount), 0);
        const deductionsMinor = adjustments.filter((item) => item.type === PayrollAdjustmentType.DEDUCTION)
          .reduce((sum, item) => sum + this.toMinor(item.amount), 0);
        const netMinor = Math.max(0, baseMinor + additionsMinor - deductionsMinor);
        totalNetMinor += netMinor;
        await itemRepo.save(itemRepo.create({
          runId: run.id, employeeId: employee.id, compensationId: latest.id,
          employeeCode: employee.employeeCode, employeeName: `${employee.firstName} ${employee.lastName}`.trim(),
          payType: latest.payType, baseRate: Number(latest.baseRate), baseEarnings: this.fromMinor(baseMinor),
          adjustments, additionsTotal: this.fromMinor(additionsMinor), deductionsTotal: this.fromMinor(deductionsMinor),
          netPay: this.fromMinor(netMinor), scheduledDays, presentDays, absentDays, paidLeaveDays,
          unpaidLeaveDays, paidHolidayDays, unresolvedDays, workedMinutes, lateMinutes,
        }));
      }
      run.totalNetPay = this.fromMinor(totalNetMinor);
      run.generatedById = actorUserId;
      await runRepo.save(run);
      return runRepo.findOneOrFail({ where: { id: run.id, organizationId }, relations: ['items'] });
    });
  }

  async updatePayrollItem(organizationId: string, runId: string, itemId: string, dto: UpdatePayrollItemDto) {
    const run = await this.getPayrollRun(organizationId, runId);
    if (run.status !== PayrollStatus.DRAFT) throw new ConflictException('Only draft payroll can be edited');
    const item = await this.payrollItemRepo.findOne({ where: { id: itemId, runId } });
    if (!item) throw new NotFoundException('Payroll item not found');
    item.adjustments = dto.adjustments;
    const additions = dto.adjustments.filter((value) => value.type === PayrollAdjustmentType.EARNING)
      .reduce((sum, value) => sum + this.toMinor(value.amount), 0);
    const deductions = dto.adjustments.filter((value) => value.type === PayrollAdjustmentType.DEDUCTION)
      .reduce((sum, value) => sum + this.toMinor(value.amount), 0);
    item.additionsTotal = this.fromMinor(additions);
    item.deductionsTotal = this.fromMinor(deductions);
    item.netPay = this.fromMinor(Math.max(0, this.toMinor(Number(item.baseEarnings)) + additions - deductions));
    await this.payrollItemRepo.save(item);
    await this.recalculateRunTotal(runId);
    return item;
  }

  async finalizePayroll(organizationId: string, id: string): Promise<PayrollRun> {
    const run = await this.getPayrollRun(organizationId, id);
    if (run.status !== PayrollStatus.DRAFT) throw new ConflictException('Only draft payroll can be finalized');
    const settings = await this.getSettings(organizationId);
    if (this.localDate(new Date(), settings.timezone) <= run.periodEnd) {
      throw new BadRequestException('Payroll cannot be finalized before the period ends');
    }
    if (!run.items.length) throw new BadRequestException('Payroll has no employees');
    if (run.items.some((item) => item.unresolvedDays > 0)) throw new BadRequestException('Resolve all missing attendance before finalizing');
    run.status = PayrollStatus.FINALIZED;
    run.finalizedAt = new Date();
    return this.payrollRunRepo.save(run);
  }

  async reopenPayroll(organizationId: string, id: string): Promise<PayrollRun> {
    const run = await this.getPayrollRun(organizationId, id);
    if (run.status !== PayrollStatus.FINALIZED) throw new ConflictException('Only finalized unpaid payroll can be reopened');
    run.status = PayrollStatus.DRAFT;
    run.finalizedAt = null;
    return this.payrollRunRepo.save(run);
  }

  async markPayrollPaid(organizationId: string, id: string, dto: MarkPayrollPaidDto): Promise<PayrollRun> {
    const run = await this.getPayrollRun(organizationId, id);
    if (run.status !== PayrollStatus.FINALIZED) throw new ConflictException('Only finalized payroll can be marked paid');
    run.status = PayrollStatus.PAID;
    run.paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    run.paymentReference = dto.paymentReference || null;
    run.paymentNote = dto.paymentNote || null;
    return this.payrollRunRepo.save(run);
  }

  async recordAudit(
    organizationId: string,
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string | null,
    after: unknown,
  ): Promise<void> {
    const serialized = after === undefined ? null : JSON.parse(JSON.stringify(after));
    await this.auditRepo.save(this.auditRepo.create({
      organizationId, actorUserId, action, entityType, entityId, before: null, after: serialized,
    }));
  }

  async getAuditLogs(organizationId: string, query: AuditQueryDto) {
    const qb = this.auditRepo.createQueryBuilder('audit')
      .where('audit.organizationId = :organizationId', { organizationId });
    if (query.entityType) qb.andWhere('audit.entityType = :entityType', { entityType: query.entityType });
    if (query.action) qb.andWhere('audit.action = :action', { action: query.action });
    const [logs, total] = await qb.orderBy('audit.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit).take(query.limit).getManyAndCount();
    return { logs, total, page: query.page, totalPages: Math.ceil(total / query.limit) };
  }

  async exportAttendanceCsv(organizationId: string, query: AttendanceQueryDto): Promise<string> {
    const qb = this.attendanceRepo.createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .where('attendance.organizationId = :organizationId', { organizationId });
    if (query.employeeId) qb.andWhere('attendance.employeeId = :employeeId', { employeeId: query.employeeId });
    if (query.startDate) qb.andWhere('attendance.workDate >= :startDate', { startDate: query.startDate });
    if (query.endDate) qb.andWhere('attendance.workDate <= :endDate', { endDate: query.endDate });
    if (query.status) qb.andWhere('attendance.status = :status', { status: query.status });
    const records = await qb.orderBy('attendance.workDate', 'ASC').addOrderBy('employee.employeeCode', 'ASC').take(5001).getMany();
    if (records.length > 5000) throw new BadRequestException('Export is limited to 5000 attendance records');
    const rows = records.map((record) => [
      record.workDate, record.employee.employeeCode,
      `${record.employee.firstName} ${record.employee.lastName}`.trim(), record.status,
      record.checkInAt?.toISOString() || '', record.checkOutAt?.toISOString() || '',
      record.workedMinutes, record.lateMinutes, record.notes || '',
    ]);
    return this.toCsv(['Work date', 'Employee code', 'Employee', 'Status', 'Check in', 'Check out', 'Worked minutes', 'Late minutes', 'Notes'], rows);
  }

  async exportPayrollCsv(organizationId: string, runId: string): Promise<string> {
    const run = await this.getPayrollRun(organizationId, runId);
    const rows = run.items.map((item) => [
      item.employeeCode, item.employeeName, item.payType, item.baseRate, item.baseEarnings,
      item.additionsTotal, item.deductionsTotal, item.netPay, item.presentDays, item.absentDays,
      item.paidLeaveDays, item.unpaidLeaveDays, item.paidHolidayDays, item.unresolvedDays,
    ]);
    return this.toCsv(
      ['Employee code', 'Employee', 'Pay type', 'Rate', 'Base earnings', 'Additions', 'Deductions', 'Net pay',
        'Present', 'Absent', 'Paid leave', 'Unpaid leave', 'Paid holidays', 'Unresolved'], rows,
    );
  }

  async getOverview(organizationId: string) {
    const settings = await this.getSettings(organizationId);
    const today = this.localDate(new Date(), settings.timezone);
    const [activeEmployees, todayAttendance, draftPayroll] = await Promise.all([
      this.employeeRepo.count({ where: { organizationId, status: EmploymentStatus.ACTIVE } }),
      this.attendanceRepo.count({ where: { organizationId, workDate: today } }),
      this.payrollRunRepo.findOne({ where: { organizationId, status: PayrollStatus.DRAFT }, order: { year: 'DESC', month: 'DESC' } }),
    ]);
    return { activeEmployees, todayAttendance, today, currentDraftPayroll: draftPayroll };
  }

  private async recalculateRunTotal(runId: string): Promise<void> {
    const items = await this.payrollItemRepo.find({ where: { runId } });
    await this.payrollRunRepo.update(runId, {
      totalNetPay: this.fromMinor(items.reduce((sum, item) => sum + this.toMinor(Number(item.netPay)), 0)),
    });
  }

  private weekday(date: string): number { return new Date(`${date}T00:00:00Z`).getUTCDay(); }
  private toMinor(value: number): number { return Math.round(value * 100); }
  private fromMinor(value: number): number { return value / 100; }
  private toCsv(headers: string[], rows: Array<Array<string | number>>): string {
    const cell = (value: string | number) => {
      let text = String(value ?? '');
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    return [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
  }

  async getMyEmployee(organizationId: string, userId: string): Promise<Employee> {
    const employee = await this.employeeRepo.findOne({
      where: { organizationId, linkedUserId: userId }, relations: ['department', 'designation'],
    });
    if (!employee) throw new NotFoundException('No employee profile is linked to this account');
    return employee;
  }

  async getMyAttendance(organizationId: string, userId: string, query: AttendanceQueryDto) {
    const employee = await this.getMyEmployee(organizationId, userId);
    return this.getAttendance(organizationId, { ...query, employeeId: employee.id });
  }

  async clockIn(organizationId: string, userId: string): Promise<Attendance> {
    const employee = await this.getMyEmployee(organizationId, userId);
    if (employee.status !== EmploymentStatus.ACTIVE) throw new BadRequestException('Employee profile is not active');
    const settings = await this.getSettings(organizationId);
    if (!settings.isConfigured) throw new BadRequestException('The owner must configure HRM settings before clock-in');
    const now = new Date();
    const workDate = this.localDate(now, settings.timezone);
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Attendance);
      const existing = await repo.createQueryBuilder('attendance')
        .setLock('pessimistic_write')
        .where('attendance.organizationId = :organizationId', { organizationId })
        .andWhere('attendance.employeeId = :employeeId', { employeeId: employee.id })
        .andWhere('attendance.workDate = :workDate', { workDate }).getOne();
      if (existing) throw new ConflictException(existing.checkOutAt ? 'Attendance is already complete for today' : 'Already clocked in');
      const attendance = repo.create({
        organizationId, employeeId: employee.id, workDate, status: AttendanceStatus.PRESENT,
        source: AttendanceSource.SELF, checkInAt: now, checkOutAt: null,
        ...(await this.getScheduleSnapshot(employee, workDate)), createdById: userId, updatedById: userId,
      });
      this.calculateAttendanceMinutes(attendance, employee.graceMinutesOverride ?? settings.graceMinutes);
      return repo.save(attendance);
    });
  }

  async clockOut(organizationId: string, userId: string): Promise<Attendance> {
    const employee = await this.getMyEmployee(organizationId, userId);
    const settings = await this.getSettings(organizationId);
    if (!settings.isConfigured) throw new BadRequestException('The owner must configure HRM settings before clock-out');
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Attendance);
      const attendance = await repo.createQueryBuilder('attendance')
        .setLock('pessimistic_write')
        .where('attendance.organizationId = :organizationId', { organizationId })
        .andWhere('attendance.employeeId = :employeeId', { employeeId: employee.id })
        .andWhere('attendance.checkInAt IS NOT NULL').andWhere('attendance.checkOutAt IS NULL')
        .orderBy('attendance.checkInAt', 'DESC').getOne();
      if (!attendance) throw new ConflictException('No open clock-in was found');
      attendance.checkOutAt = new Date();
      attendance.updatedById = userId;
      this.calculateAttendanceMinutes(attendance, employee.graceMinutesOverride ?? settings.graceMinutes);
      return repo.save(attendance);
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

  private localDate(date: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
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
