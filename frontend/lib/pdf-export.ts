import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ProfitStats } from './pos-service'
import { brandConfig } from './brand-config'

interface PDFExportOptions {
  profitStats: ProfitStats
  organizationName?: string
  organizationLogo?: string
}

export class PDFExportService {
  private formatCurrency(amount: number): string {
    return `BDT ${amount.toFixed(2)}`
  }

  private formatPercentage(percentage: number): string {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`
  }

  private drawRoundedRect(doc: jsPDF, x: number, y: number, width: number, height: number, radius: number): void {
    // Draw rounded rectangle using path operations
    doc.roundedRect(x, y, width, height, radius, radius, 'F')
  }

  private addInsights(doc: jsPDF, profitStats: ProfitStats, yPos: number): number {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Business Insights & Recommendations', 20, yPos)
    yPos += 15

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    // Profit Analysis
    if (profitStats.totalProfit > 0) {
      doc.setTextColor(0, 0, 0)
      doc.text('• POSITIVE PROFIT: Your business is generating profit during this period.', 25, yPos)
      yPos += 6
    } else {
      doc.setTextColor(0, 0, 0)
      doc.text('• LOSS ALERT: Your business is operating at a loss. Review costs and pricing.', 25, yPos)
      yPos += 6
    }

    // Margin Analysis
    doc.setTextColor(0, 0, 0)
    if (profitStats.profitMargin >= 20) {
      doc.text('• EXCELLENT PROFIT MARGIN: Your margin is healthy and sustainable.', 25, yPos)
    } else if (profitStats.profitMargin >= 10) {
      doc.text('• GOOD PROFIT MARGIN: Consider optimizing costs for better margins.', 25, yPos)
    } else if (profitStats.profitMargin >= 0) {
      doc.text('• LOW PROFIT MARGIN: Focus on cost reduction and pricing optimization.', 25, yPos)
    } else {
      doc.text('• NEGATIVE MARGIN: Immediate action required to reduce costs.', 25, yPos)
    }
    yPos += 6

    doc.setTextColor(0, 0, 0)

    // Recommendations header
    doc.text('• Recommendations:', 25, yPos)
    yPos += 6

    if (profitStats.topProfitableProducts.length > 0) {
      const topProduct = profitStats.topProfitableProducts[0]
      const secondProduct = profitStats.topProfitableProducts[1]
      
      doc.text(`  - Focus on promoting "${topProduct.productName}" and "${secondProduct?.productName || 'top products'}" (highest profit contributors)`, 30, yPos)
      yPos += 6
      doc.text('  - Monitor top-performing products and consider expanding similar inventory', 30, yPos)
      yPos += 6
      doc.text('  - Regular profit analysis helps identify trends and opportunities', 30, yPos)
      yPos += 6
      
      if (profitStats.topProfitableProducts.length > 2) {
        doc.text(`  - Explore bundling "${profitStats.topProfitableProducts[2].productName}" with accessories for increased sales`, 30, yPos)
        yPos += 6
      }

      // Find lowest margin product for specific recommendation
      const lowestMarginProduct = profitStats.topProfitableProducts
        .sort((a, b) => a.profitMargin - b.profitMargin)[0]
      
      if (lowestMarginProduct && lowestMarginProduct.profitMargin < 45) {
        doc.text(`  - Review pricing on lower-margin items like "${lowestMarginProduct.productName}"`, 30, yPos)
        yPos += 6
      }
    }

    if (profitStats.totalDiscount > profitStats.totalProfit * 0.5) {
      doc.text('  - Review discount strategy - high discounts are impacting profitability', 30, yPos)
      yPos += 6
    }

    return yPos + 10
  }

  public async exportToPDF(options: PDFExportOptions): Promise<void> {
    const { profitStats, organizationName = brandConfig.name } = options

    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      let yPos = 20

      // Page 1: Executive Summary
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text(organizationName, 20, yPos)
      yPos += 10

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Profit Analysis Report', 20, yPos)
      yPos += 15

      // Report metadata
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const currentDate = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric', 
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      doc.text(`Generated on: ${currentDate}`, 20, yPos)
      yPos += 6
      doc.text(`Analysis Period: ${profitStats.period.charAt(0).toUpperCase() + profitStats.period.slice(1).replace('-', ' ')}`, 20, yPos)
      yPos += 15

      // Executive Summary header
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Executive Summary', 20, yPos)
      yPos += 15

      // Key metrics boxes layout - 4 boxes in a row with borders
      const metrics = [
        { label: 'Net Profit', value: this.formatCurrency(profitStats.totalProfit) },
        { label: 'Profit Margin', value: this.formatPercentage(profitStats.profitMargin) },
        { label: 'Total Revenue', value: this.formatCurrency(profitStats.totalRevenue) },
        { label: 'Total Cost', value: this.formatCurrency(profitStats.totalCost) }
      ]

      const boxWidth = 35
      const boxHeight = 25
      const startX = 20
      let currentX = startX

      metrics.forEach((metric, index) => {
        // Draw border
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.5)
        doc.rect(currentX, yPos, boxWidth, boxHeight)
        
        // Center text in box
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        const labelWidth = doc.getTextWidth(metric.label)
        doc.text(metric.label, currentX + (boxWidth - labelWidth) / 2, yPos + 8)
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const valueWidth = doc.getTextWidth(metric.value)
        doc.text(metric.value, currentX + (boxWidth - valueWidth) / 2, yPos + 16)
        
        currentX += boxWidth + 5
      })

      yPos += boxHeight + 20

      // Summary table
      const summaryData = [
        ['Metric', 'Amount', 'Performance Indicator'],
        ['Total Revenue', this.formatCurrency(profitStats.totalRevenue), 'Gross Sales'],
        ['Total Cost', this.formatCurrency(profitStats.totalCost), 'COGS'],
        ['Total Discounts', this.formatCurrency(profitStats.totalDiscount), 'Reductions'],
        ['Net Profit', this.formatCurrency(profitStats.totalProfit), profitStats.totalProfit >= 0 ? 'Profitable' : 'Loss'],
        ['Profit Margin', this.formatPercentage(profitStats.profitMargin), 
          profitStats.profitMargin >= 47 ? 'Excellent' : 
          profitStats.profitMargin >= 20 ? 'Good' : 
          profitStats.profitMargin >= 0 ? 'Break-even' : 'Critical']
      ]

      autoTable(doc, {
        startY: yPos,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: 'grid',
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineWidth: 1,
          lineColor: [0, 0, 0]
        },
        bodyStyles: {
          lineWidth: 1,
          lineColor: [0, 0, 0]
        },
        styles: {
          fontSize: 10,
          cellPadding: 4,
          textColor: [0, 0, 0],
          halign: 'left'
        },
        columnStyles: {
          0: { fontStyle: 'normal' },
          1: { fontStyle: 'normal' },
          2: { fontStyle: 'normal' }
        }
      })

      // Footer for page 1
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)
      doc.text(`Generated by ${brandConfig.name} - Professional Business Analytics`, 20, 280)
      doc.text('Page 1 of 3', pageWidth - 30, 280)

      // Page 2: Top Profitable Products
      doc.addPage()
      yPos = 20

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Top Profitable Products', 20, yPos)
      yPos += 15

      const productsData = profitStats.topProfitableProducts.slice(0, 5).map((product, index) => {
        const rank = `#${index + 1}`
        return [
          `${rank} ${product.productName}`,
          product.quantitySold.toString(),
          this.formatCurrency(product.totalRevenue),
          this.formatCurrency(product.totalCost),
          this.formatCurrency(product.totalProfit),
          this.formatPercentage(product.profitMargin)
        ]
      })

      autoTable(doc, {
        startY: yPos,
        head: [['Product', 'Qty', 'Revenue', 'Cost', 'Profit', 'Margin']],
        body: productsData,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineWidth: 1,
          lineColor: [0, 0, 0]
        },
        bodyStyles: {
          lineWidth: 1,
          lineColor: [0, 0, 0]
        },
        styles: {
          fontSize: 10,
          cellPadding: 4,
          textColor: [0, 0, 0]
        }
      })

      yPos += 80

      // Business Insights & Recommendations
      yPos = this.addInsights(doc, profitStats, yPos)

      // Footer for page 2
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)
      doc.text(`Generated by ${brandConfig.name} - Professional Business Analytics`, 20, 280)
      doc.text('Page 2 of 3', pageWidth - 30, 280)

      // Page 3: Performance Highlights
      doc.addPage()
      yPos = 20

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Performance Highlights', 20, yPos)
      yPos += 15

      // Star Performer section
      if (profitStats.summary.highestProfitProduct) {
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('STAR PERFORMER', 20, yPos)
        yPos += 8

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`${profitStats.summary.highestProfitProduct.productName}`, 20, yPos)
        yPos += 6
        doc.text(`Profit: ${this.formatCurrency(profitStats.summary.highestProfitProduct.totalProfit)} | Margin: ${this.formatPercentage(profitStats.summary.highestProfitProduct.profitMargin)}`, 20, yPos)
        yPos += 10

        // Second best if available
        if (profitStats.topProfitableProducts[1]) {
          const secondBest = profitStats.topProfitableProducts[1]
          doc.text(`${secondBest.productName}`, 20, yPos)
          yPos += 6
          doc.text(`Profit: ${this.formatCurrency(secondBest.totalProfit)} | Margin: ${this.formatPercentage(secondBest.profitMargin)}`, 20, yPos)
          yPos += 15
        }
      }

      // Needs Attention section
      const needsAttentionProducts = profitStats.topProfitableProducts
        .filter(p => p.profitMargin < 45 || p.quantitySold < 3)
        .slice(0, 2)

      if (needsAttentionProducts.length > 0) {
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('NEEDS ATTENTION', 20, yPos)
        yPos += 8

        needsAttentionProducts.forEach(product => {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.text(`${product.productName}`, 20, yPos)
          yPos += 6
          const reason = product.quantitySold < 3 ? '(Low quantity sold)' : ''
          doc.text(`Profit: ${this.formatCurrency(product.totalProfit)} | Margin: ${this.formatPercentage(product.profitMargin)} ${reason}`, 20, yPos)
          yPos += 10
        })
      }

      // Footer for page 3
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)
      doc.text(`Generated by ${brandConfig.name} - Professional Business Analytics`, 20, 280)
      doc.text('Page 3 of 3', pageWidth - 30, 280)

      // Generate filename with timestamp
      const date = new Date().toISOString().split('T')[0]
      const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-')
      const filename = `profit-analysis-${profitStats.period}-${date}-${time}.pdf`

      // Save the PDF
      doc.save(filename)

      return Promise.resolve()
    } catch (error) {
      console.error('Error generating PDF:', error)
      throw new Error('Failed to generate PDF report')
    }
  }
}

// Export singleton instance
export const pdfExportService = new PDFExportService()
