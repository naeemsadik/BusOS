import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getTeamMembers(organizationId: string): Promise<User[]> {
    return this.userRepository.find({
      where: { organizationId },
      relations: ['organization'],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
        organization: {
          id: true,
          name: true,
        },
        // Exclude sensitive fields like password
      },
    });
  }

  async getTeamMember(organizationId: string, userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { 
        id: userId,
        organizationId,
      },
      relations: ['organization'],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
        organization: {
          id: true,
          name: true,
        },
        // Exclude sensitive fields like password
      },
    });
  }
}
