import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Department, Designation, Employee, EmploymentStatus, HrmSettings, User, UserRole } from '../entities';
import {
  CreateDepartmentDto,
  CreateDesignationDto,
  CreateEmployeeDto,
  EmployeeQueryDto,
  LinkEmployeeAccountDto,
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
