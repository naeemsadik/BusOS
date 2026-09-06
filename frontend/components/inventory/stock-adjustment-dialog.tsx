import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { inventoryService, type StockAdjustmentData, type Product } from '@/lib/inventory-service';

const stockAdjustmentSchema = z.object({
  quantity: z.coerce.number({ 
    required_error: 'Quantity is required',
    invalid_type_error: 'Quantity must be a number' 
  }).min(-1000000, 'Quantity must be greater than -1,000,000'),
  notes: z.string().optional(),
  unitCost: z.coerce.number().min(0, 'Unit cost must be positive').optional().nullable(),
});

type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>;

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess: () => void;
}

export function StockAdjustmentDialog({ open, onOpenChange, product, onSuccess }: StockAdjustmentDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<StockAdjustmentFormData>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      quantity: 0,
      notes: '',
      unitCost: 0,
    },
  });

  // Reset form when product changes or dialog opens
  React.useEffect(() => {
    if (open && product) {
      reset({
        quantity: 0,
        notes: '',
        unitCost: product.cost || 0,
      });
    }
  }, [open, product, reset]);

  const quantity = watch('quantity');
  const newStock = (product?.stock || 0) + (quantity || 0);

  const onSubmit = async (data: StockAdjustmentFormData) => {
    if (!product) return;

    // Ensure quantity is a valid number
    const quantity = Number(data.quantity);
    if (isNaN(quantity)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid quantity',
        variant: 'destructive',
      });
      return;
    }

    const submitData = {
      quantity,
      notes: data.notes || '',
      unitCost: data.unitCost ? Number(data.unitCost) : undefined,
    };

    setIsLoading(true);
    try {
      console.log('Adjusting stock:', { productId: product.id, data: submitData });
      const result = await inventoryService.adjustStock(product.id, submitData);
      console.log('Stock adjustment result:', result);
      toast({
        title: 'Success',
        description: 'Stock adjusted successfully',
      });
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error('Stock adjustment error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'An error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Adjust Stock</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center p-3 sm:p-4 bg-muted rounded-lg">
            <h3 className="font-semibold text-sm sm:text-base">{product.name}</h3>
            <p className="text-base sm:text-lg font-bold">Current Stock: {product.stock}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-sm">Adjustment Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="1"
                {...register('quantity', { 
                  valueAsNumber: true,
                  required: 'Quantity is required',
                })}
                placeholder="Enter positive for increase, negative for decrease"
              />
              {errors.quantity && (
                <p className="text-sm text-red-500">{errors.quantity.message}</p>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground">
                New stock will be: <span className={`font-semibold ${newStock < 0 ? 'text-red-500' : ''}`}>
                  {newStock}
                </span>
              </p>
              {newStock < 0 && (
                <p className="text-xs sm:text-sm text-red-500">Warning: This will result in negative stock!</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitCost" className="text-sm">Unit Cost (Optional)</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                min="0"
                {...register('unitCost', { 
                  valueAsNumber: true,
                })}
                placeholder="Enter unit cost"
              />
              {errors.unitCost && (
                <p className="text-sm text-red-500">{errors.unitCost.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm">Notes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Reason for adjustment (optional)"
                rows={2}
                className="min-h-[60px] sm:min-h-[80px]"
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? 'Adjusting...' : 'Adjust Stock'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
