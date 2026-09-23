import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department, Designation, HrmSettings } from '../entities';
import {
  CreateDepartmentDto,
  CreateDesignationDto,
  UpdateDepartmentDto,
  UpdateDesignationDto,
  UpdateHrmSettingsDto,
} from './dto/hrm.dto';

@Injectable()
export class HrmService {
  constructor(
    @InjectRepository(HrmSettings) private readonly settingsRepo: Repository<HrmSettings>,
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Designation) private readonly designationRepo: Repository<Designation>,
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

