import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product, Category, StockMovement, Supplier } from '../entities';
import { ProductService, CategoryService, SupplierService } from './services';
import { ProductController, CategoryController, SupplierController } from './controllers';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, StockMovement, Supplier])],
  controllers: [ProductController, CategoryController, SupplierController],
  providers: [ProductService, CategoryService, SupplierService],
  exports: [ProductService, CategoryService, SupplierService],
})
export class InventoryModule {}
