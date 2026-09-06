import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { inventoryService, type CreateProductData, type UpdateProductData, type Product } from '@/lib/inventory-service';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  cost: z.number().min(0, 'Cost must be positive'),
  stock: z.number().min(0, 'Stock must be non-negative').optional(),
  minStock: z.number().min(0, 'Min stock must be non-negative').optional(),
  maxStock: z.number().min(0, 'Max stock must be non-negative').optional(),
  unit: z.string().optional(),
  weight: z.number().min(0, 'Weight must be positive').optional(),
  weightUnit: z.string().optional(),
  barcode: z.string().optional(),
  image: z.string().optional(),
  status: z.enum(['active', 'inactive', 'discontinued']).optional(),
  trackStock: z.boolean().optional(),
  allowBackorder: z.boolean().optional(),
  taxRate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100').optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  initialValues?: Partial<CreateProductData>;
  onSuccess: () => void;
  categories: string[];
  onCategoryCreate?: (name: string) => Promise<void>;
}

export function ProductDialog({ open, onOpenChange, product, initialValues, onSuccess, categories, onCategoryCreate }: ProductDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      status: 'active',
      trackStock: true,
      allowBackorder: false,
    },
  });

  // Reset form when product changes or dialog opens
  React.useEffect(() => {
    if (open) {
      if (product) {
        reset({
          name: product.name,
          description: product.description || '',
          category: product.category,
          subcategory: product.subcategory || '',
          brand: product.brand || '',
          price: product.price,
          cost: product.cost,
          stock: product.stock,
          minStock: product.minStock,
          maxStock: product.maxStock,
          unit: product.unit || '',
          weight: product.weight,
          weightUnit: product.weightUnit || '',
          barcode: product.barcode || '',
          image: product.image || '',
          status: product.status,
          trackStock: product.trackStock,
          allowBackorder: product.allowBackorder,
          taxRate: product.taxRate,
          supplier: product.supplier || '',
          notes: product.notes || '',
        });
      } else {
        reset({
          name: '',
          description: '',
          category: '',
          subcategory: '',
          brand: '',
          price: 0,
          cost: 0,
          stock: 0,
          minStock: 0,
          maxStock: 0,
          unit: '',
          weight: 0,
          weightUnit: '',
          barcode: '',
          image: '',
          status: 'active',
          trackStock: true,
          allowBackorder: false,
          taxRate: 0,
          supplier: '',
          notes: '',
          ...initialValues,
        });
      }
    }
  }, [open, product, initialValues, reset]);

  const trackStock = watch('trackStock');

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true);
    try {
      console.log('Submitting product data:', data, 'isEditing:', isEditing);
      if (isEditing && product) {
        const result = await inventoryService.updateProduct(product.id, data as UpdateProductData);
        console.log('Update result:', result);
        toast({
          title: 'Success',
          description: 'Product updated successfully',
        });
      } else {
        const result = await inventoryService.createProduct(data as CreateProductData);
        console.log('Create result:', result);
        toast({
          title: 'Success',
          description: 'Product created successfully',
        });
      }
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error('Product submission error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
    setShowCategoryInput(false);
    setNewCategoryName('');
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      if (onCategoryCreate) {
        await onCategoryCreate(newCategoryName.trim());
        setValue('category', newCategoryName.trim());
        setShowCategoryInput(false);
        setNewCategoryName('');
        toast({
          title: 'Success',
          description: 'Category created successfully',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create category',
        variant: 'destructive',
      });
    }
  };

  // Built-in categories that are always available
  const builtInCategories = [
    'Electronics',
    'Computers',
    'Accessories',
    'Mobile Phones',
    'Tablets',
    'Wearables',
    'Audio & Video',
    'Gaming',
    'Office Supplies',
    'Home & Garden',
    'Health & Beauty',
    'Sports & Outdoors',
    'Books & Media',
    'Clothing & Fashion',
    'Toys & Games',
    'Food & Beverages',
    'Automotive',
    'Tools & Hardware',
    'Pet Supplies',
    'Other'
  ];

  // Combine built-in categories with user categories, removing duplicates
  const allCategories = Array.from(new Set([...builtInCategories, ...categories])).sort();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto mx-2 sm:mx-4">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter product name"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter product description"
              rows={2}
              className="min-h-[60px] sm:min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="category">Category *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCategoryInput(!showCategoryInput)}
                  className="text-xs h-7"
                >
                  {showCategoryInput ? 'Cancel' : 'New Category'}
                </Button>
              </div>
              
              {showCategoryInput ? (
                <div className="flex gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter new category name"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCategory();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim()}
                    className="whitespace-nowrap"
                  >
                    Add
                  </Button>
                </div>
              ) : (
                <Select
                  value={watch('category')}
                  onValueChange={(value) => setValue('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {allCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.category && (
                <p className="text-sm text-red-500">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                {...register('subcategory')}
                placeholder="Enter subcategory"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                {...register('brand')}
                placeholder="Enter brand"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                {...register('supplier')}
                placeholder="Enter supplier"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Selling Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                {...register('price', { 
                  valueAsNumber: true,
                  required: 'Price is required',
                  min: { value: 0, message: 'Price must be positive' }
                })}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-sm text-red-500">{errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Cost Price *</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                {...register('cost', { 
                  valueAsNumber: true,
                  required: 'Cost is required',
                  min: { value: 0, message: 'Cost must be positive' }
                })}
                placeholder="0.00"
              />
              {errors.cost && (
                <p className="text-sm text-red-500">{errors.cost.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Current Stock</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                {...register('stock', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Stock must be non-negative' }
                })}
                placeholder="0"
                disabled={!trackStock}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStock">Min Stock</Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                {...register('minStock', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Min stock must be non-negative' }
                })}
                placeholder="0"
                disabled={!trackStock}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxStock">Max Stock</Label>
              <Input
                id="maxStock"
                type="number"
                min="0"
                {...register('maxStock', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Max stock must be non-negative' }
                })}
                placeholder="0"
                disabled={!trackStock}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                {...register('unit')}
                placeholder="pcs, kg, ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                type="number"
                step="0.001"
                min="0"
                {...register('weight', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Weight must be positive' }
                })}
                placeholder="0.000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weightUnit">Weight Unit</Label>
              <Input
                id="weightUnit"
                {...register('weightUnit')}
                placeholder="kg, g, lbs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                {...register('barcode')}
                placeholder="Enter barcode"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('taxRate', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Tax rate must be positive' },
                  max: { value: 100, message: 'Tax rate cannot exceed 100%' }
                })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(value) => setValue('status', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="trackStock"
                checked={watch('trackStock')}
                onCheckedChange={(checked) => setValue('trackStock', !!checked)}
              />
              <Label htmlFor="trackStock">Track Stock</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowBackorder"
                checked={watch('allowBackorder')}
                onCheckedChange={(checked) => setValue('allowBackorder', !!checked)}
              />
              <Label htmlFor="allowBackorder">Allow Backorder</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes"
              rows={2}
              className="min-h-[60px] sm:min-h-[80px]"
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
