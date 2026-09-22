import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, Organization } from '../../entities';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    organization: Organization,
  ): Promise<Category> {
    // Check if category name already exists for this organization
    const existingCategory = await this.categoryRepository.findOne({
      where: {
        name: createCategoryDto.name,
        organization: { id: organization.id },
      },
    });

    if (existingCategory) {
      throw new ConflictException('Category with this name already exists');
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      organization,
    });

    return await this.categoryRepository.save(category);
  }

  async findAll(organization: Organization): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { organization: { id: organization.id } },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string, organization: Organization): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id, organization: { id: organization.id } },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    organization: Organization,
  ): Promise<Category> {
    const category = await this.findOne(id, organization);

    // Check if category name is being updated and if it already exists
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.categoryRepository.findOne({
        where: {
          name: updateCategoryDto.name,
          organization: { id: organization.id },
        },
      });

      if (existingCategory) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    Object.assign(category, updateCategoryDto);
    return await this.categoryRepository.save(category);
  }

  async remove(id: string, organization: Organization): Promise<void> {
    const category = await this.findOne(id, organization);
    await this.categoryRepository.remove(category);
  }
}
