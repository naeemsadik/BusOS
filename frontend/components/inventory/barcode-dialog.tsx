import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Barcode from 'react-barcode';
import { useToast } from '@/hooks/use-toast';
import { inventoryService, type Product } from '@/lib/inventory-service';
import { Download, RefreshCw, Printer } from 'lucide-react';

interface BarcodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function BarcodeDialog({ open, onOpenChange, product }: BarcodeDialogProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [barcode, setBarcode] = useState(product?.barcode || '');

  const generateBarcode = async () => {
    if (!product) return;

    setIsGenerating(true);
    try {
      const result = await inventoryService.generateBarcode(product.id);
      setBarcode(result.barcode);
      toast({
        title: 'Success',
        description: 'Barcode generated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to generate barcode',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadBarcode = () => {
    if (!barcode || !product) return;

    // Create a canvas to convert the barcode SVG to image
    const barcodeElement = document.getElementById('barcode-element');
    if (!barcodeElement) return;

    // Get the SVG element from the barcode component
    const svgElement = barcodeElement.querySelector('svg');
    if (!svgElement) return;

    // Convert SVG to canvas and download
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // Get SVG dimensions
    const svgRect = svgElement.getBoundingClientRect();
    canvas.width = svgRect.width || 400;
    canvas.height = svgRect.height || 100;

    img.onload = () => {
      // Fill white background
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `barcode-${product.id}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
    };

    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
  };

  const printBarcode = () => {
    if (!barcode || !product) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode - ${product.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
              margin: 0;
            }
            .barcode-container {
              border: 1px solid #ddd;
              padding: 20px;
              margin: 20px auto;
              width: fit-content;
              background: white;
            }
            .product-info {
              margin-bottom: 15px;
            }
            .product-info h3 {
              margin: 0 0 5px 0;
              font-size: 16px;
            }
            .product-info p {
              margin: 2px 0;
              font-size: 12px;
              color: #666;
            }
            .barcode-wrapper {
              margin: 15px 0;
              display: flex;
              justify-content: center;
            }
            .barcode-text {
              font-family: monospace;
              font-size: 14px;
              margin-top: 10px;
              letter-spacing: 2px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .barcode-container { border: none; margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <div class="product-info">
              <h3>${product.name}</h3>
              <p>Price: ৳${product.price.toLocaleString()}</p>
            </div>
            <div class="barcode-wrapper">
              <svg width="200" height="60">
                <rect width="200" height="60" fill="white"/>
                ${generateSimpleBarcodeSVG(barcode)}
              </svg>
            </div>
            <div class="barcode-text">${barcode}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Simple barcode pattern generator for SVG
  const generateSimpleBarcodeSVG = (code: string) => {
    const bars = [];
    let x = 10;
    const barWidth = 2;
    const barHeight = 40;
    
    // Simple encoding: each character generates a pattern
    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      const pattern = (charCode % 4) + 1; // 1-4 bars per character
      
      for (let j = 0; j < pattern; j++) {
        bars.push(`<rect x="${x}" y="10" width="${barWidth}" height="${barHeight}" fill="black"/>`);
        x += barWidth + 1;
      }
      x += 2; // Space between character patterns
    }
    
    return bars.join('');
  };

  React.useEffect(() => {
    if (open && product) {
      setBarcode(product.barcode || '');
    }
  }, [open, product]);

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Product Barcode</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-base sm:text-lg">{product.name}</h3>
            <p className="text-sm text-muted-foreground">Price: ৳{product.price.toLocaleString()}</p>
          </div>

          {barcode ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="border p-3 sm:p-4 bg-white w-full overflow-x-auto" id="barcode-element">
                <div className="flex justify-center min-w-[300px]">
                  <Barcode
                    value={barcode}
                    width={2}
                    height={60}
                    fontSize={12}
                    background="white"
                    lineColor="black"
                    margin={10}
                  />
                </div>
              </div>
              <p className="font-mono text-sm break-all text-center">{barcode}</p>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={downloadBarcode} className="w-full sm:w-auto">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" size="sm" onClick={printBarcode} className="w-full sm:w-auto">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">No barcode assigned to this product</p>
              <Button onClick={generateBarcode} disabled={isGenerating} className="w-full sm:w-auto">
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Barcode'
                )}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Close
          </Button>
          {barcode && (
            <Button onClick={generateBarcode} disabled={isGenerating} className="w-full sm:w-auto">
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                'Regenerate'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
