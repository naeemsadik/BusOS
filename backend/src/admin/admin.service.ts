import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Admin } from '../entities/admin.entity';
import { AdminLoginDto, CreateAdminDto, UpdateAdminDto, ChangeAdminPasswordDto } from '../auth/dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: AdminLoginDto) {
    const admin = await this.adminRepository.findOne({
      where: { username: loginDto.username, isActive: true },
    });

    if (!admin || !await bcrypt.compare(loginDto.password, admin.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    admin.lastLoginAt = new Date();
    await this.adminRepository.save(admin);

    const payload = { sub: admin.id, username: admin.username, type: 'admin' };
    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
    };
  }

  async createAdmin(createAdminDto: CreateAdminDto) {
    // Check if username or email already exists
    const existingAdmin = await this.adminRepository.findOne({
      where: [
        { username: createAdminDto.username },
        { email: createAdminDto.email }
      ],
    });

    if (existingAdmin) {
      throw new ConflictException('Username or email already exists');
    }

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);

    const admin = this.adminRepository.create({
      ...createAdminDto,
      password: hashedPassword,
    });

    const savedAdmin = await this.adminRepository.save(admin);

    return {
      id: savedAdmin.id,
      username: savedAdmin.username,
      email: savedAdmin.email,
      firstName: savedAdmin.firstName,
      lastName: savedAdmin.lastName,
      isActive: savedAdmin.isActive,
      createdAt: savedAdmin.createdAt,
    };
  }

  async updateAdmin(adminId: string, updateAdminDto: UpdateAdminDto) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });
    
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (updateAdminDto.email) {
      const existingAdmin = await this.adminRepository.findOne({
        where: { email: updateAdminDto.email },
      });

      if (existingAdmin && existingAdmin.id !== adminId) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(admin, updateAdminDto);
    const updatedAdmin = await this.adminRepository.save(admin);

    return {
      id: updatedAdmin.id,
      username: updatedAdmin.username,
      email: updatedAdmin.email,
      firstName: updatedAdmin.firstName,
      lastName: updatedAdmin.lastName,
      isActive: updatedAdmin.isActive,
      updatedAt: updatedAdmin.updatedAt,
    };
  }

  async changePassword(adminId: string, changePasswordDto: ChangeAdminPasswordDto) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });
    
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (!await bcrypt.compare(changePasswordDto.currentPassword, admin.password)) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    admin.password = hashedPassword;
    
    await this.adminRepository.save(admin);

    return { message: 'Password changed successfully' };
  }

  async getProfile(adminId: string) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });
    
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      isActive: admin.isActive,
      lastLoginAt: admin.lastLoginAt,
      createdAt: admin.createdAt,
    };
  }

  async getAllAdmins() {
    const admins = await this.adminRepository.find({
      select: ['id', 'username', 'email', 'firstName', 'lastName', 'isActive', 'lastLoginAt', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    return admins;
  }

  async deactivateAdmin(adminId: string) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });
    
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    admin.isActive = false;
    await this.adminRepository.save(admin);

    return { message: 'Admin deactivated successfully' };
  }
}
