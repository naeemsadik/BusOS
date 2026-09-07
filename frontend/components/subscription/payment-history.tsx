'use client';

import { useState } from 'react';
import { Download, CreditCard, Calendar, FileText, Loader2, Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { subscriptionService } from '@/lib/subscription-service';
import { formatEnUsDate } from '@/lib/date-utils';
import { toast } from 'sonner';

interface Payment {
  id: string;
  paymentId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionId: string;
  cardType?: string;
  paymentDate: string;
  createdAt: string;
}

interface PaymentHistoryProps {
  payments: Payment[];
  loading?: boolean;
}

export default function PaymentHistory({ payments, loading }: PaymentHistoryProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const formatAmount = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-800' },
      VALID: { label: 'Completed', className: 'bg-green-100 text-green-800' },
      PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      FAILED: { label: 'Failed', className: 'bg-red-100 text-red-800' },
      CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
    };

    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
      <Badge className={statusInfo.className}>
        {statusInfo.label}
      </Badge>
    );
  };

  const handleDownloadInvoice = async (payment: Payment) => {
    setDownloadingId(payment.id);
    try {
      // Fetch invoice data
      const invoiceData = await subscriptionService.getInvoice(payment.id);

      // Generate HTML invoice
      const features = invoiceData.subscription.features?.join('; ') || '';
      const htmlContent = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice - ${invoiceData.invoiceNumber}</title>
  <style>
    :root{
      --bg:#f7fafc;
      --card:#ffffff;
      --primary:#0b7285; /* teal */
      --accent:#ff7a00;  /* orange */
      --muted:#6b7280;
      --border:#e6eef2;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    }
    html,body{height:100%;margin:0;background:var(--bg);}
    .container{max-width:900px;margin:32px auto;padding:24px}
    .card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:24px;box-shadow:0 6px 18px rgba(11,114,133,0.06)}
    header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
    .brand{display:flex;gap:12px;align-items:center}
    .logo{width:64px;height:64px;border-radius:8px;background:var(--primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:20px}
    h1{font-size:20px;margin:0}
    .meta{ text-align:right }
    .meta small{display:block;color:var(--muted)}

    .section{margin-top:20px;display:flex;gap:20px}
    .bill-to{flex:1;padding:16px;border-radius:8px;border:1px dashed var(--border);background:#fbfeff}
    .details{flex:1;padding:16px;border-radius:8px;border:1px dashed var(--border);background:#fffdf8}

    table{width:100%;border-collapse:collapse;margin-top:18px}
    th,td{padding:12px 10px;text-align:left;border-bottom:1px solid #f0f4f6}
    th{background:transparent;color:var(--muted);font-weight:600}
    .total-row td{border-top:2px solid var(--border);font-weight:700}

    .chip{display:inline-block;padding:6px 10px;border-radius:999px;background:var(--primary);color:#fff;font-weight:600}

    footer{margin-top:18px;display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:13px}

    /* print */
    @media print{
      body{background:white}
      .container{margin:0;padding:0}
      .card{box-shadow:none;border:none}
      header .meta{text-align:left}
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <header>
        <div class="brand">
          <div class="logo">INV</div>
          <div>
            <h1>Invoice</h1>
            <div style="color:var(--muted);font-size:13px;margin-top:6px">Invoice #: <strong>${invoiceData.invoiceNumber}</strong></div>
          </div>
        </div>
        <div class="meta">
          <div style="font-size:14px;color:var(--muted)">Date</div>
          <div style="font-size:16px;font-weight:700">${formatEnUsDate(invoiceData.paymentDate)}</div>
          <div style="margin-top:8px;color:var(--muted);font-size:13px">Payment ID</div>
          <div style="font-weight:600">${invoiceData.paymentId}</div>
        </div>
      </header>

      <div class="section">
        <div class="bill-to">
          <strong>Billed To</strong>
          <div style="margin-top:10px;font-weight:600">${invoiceData.organization.name}</div>
          ${invoiceData.organization.phone ? `<div style="color:var(--muted);margin-top:6px">Phone: ${invoiceData.organization.phone}</div>` : ''}
          ${invoiceData.organization.address || invoiceData.organization.city ? `<div style="color:var(--muted);margin-top:6px;line-height:1.3">${[invoiceData.organization.address, invoiceData.organization.city, invoiceData.organization.country].filter(Boolean).join('<br>')}</div>` : ''}
        </div>

        <div class="details">
          <strong>Payment Details</strong>
          <div style="margin-top:10px;color:var(--muted)">Method</div>
          <div style="font-weight:600">${invoiceData.paymentMethod}</div>

          ${invoiceData.cardType ? `
          <div style="margin-top:8px;color:var(--muted)">Card Type</div>
          <div style="font-weight:600">${invoiceData.cardType}</div>
          ` : ''}

          <div style="margin-top:8px;color:var(--muted)">Status</div>
          <div class="chip" style="background:var(--accent);">${invoiceData.status}</div>

          ${invoiceData.transactionId ? `
          <div style="margin-top:12px;color:var(--muted)">Transaction ID</div>
          <div style="font-weight:600">${invoiceData.transactionId}</div>
          ` : ''}

          <div style="margin-top:12px;color:var(--muted)">Plan</div>
          <div style="font-weight:600">${invoiceData.subscription.planName}</div>
        </div>
      </div>

      <div style="margin-top:22px">
        <table>
          <thead>
            <tr>
              <th style="width:70%">Description</th>
              <th style="width:15%">Qty</th>
              <th style="width:15%">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${invoiceData.subscription.planName} — subscription${features ? ` (features: ${features})` : ''}</td>
              <td>1</td>
              <td>${formatAmount(invoiceData.amount, invoiceData.currency)}</td>
            </tr>

            <tr class="total-row">
              <td></td>
              <td style="text-align:right">Total</td>
              <td>${formatAmount(invoiceData.amount, invoiceData.currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer>
        <div>
          <div style="font-weight:600">Notes</div>
          <div style="color:var(--muted);margin-top:6px">Thank you for your payment. If you have questions about this invoice, contact support.</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:600">Paid via ${invoiceData.paymentMethod}</div>
          <div style="color:var(--muted);margin-top:6px">Document ID: ${invoiceData.invoiceNumber}</div>
        </div>
      </footer>
    </div>
  </div>
</body>
</html>`;

      // Create a Blob and download as HTML
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      
      // Open in new window and trigger print dialog
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          // Wait a bit for styles to load, then print
          setTimeout(() => {
            printWindow.print();
            // Clean up after print dialog is closed
            setTimeout(() => {
              printWindow.close();
              window.URL.revokeObjectURL(url);
            }, 100);
          }, 250);
        };
      } else {
        // Fallback: download as HTML if popup blocked
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${invoiceData.invoiceNumber}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.info('Please allow popups to print directly, or use the downloaded HTML file.');
      }
      
      toast.success('Invoice ready to print!');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to download invoice';
      toast.error(message);
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-gray-100">
            <FileText className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>View your past subscription payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-gray-100">
            <FileText className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>View your past subscription payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No payment history found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Your subscription payments will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-gray-100">
          <FileText className="h-5 w-5" />
          Payment History
        </CardTitle>
        <CardDescription>View and download invoices for your past payments</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatEnUsDate(payment.paymentDate)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{payment.paymentMethod}</span>
                      {payment.cardType && (
                        <span className="text-xs text-gray-500">{payment.cardType}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {payment.transactionId ? (
                      <div className="flex items-center gap-2">
                        <span>
                          {payment.transactionId.length > 7
                            ? `${payment.transactionId.slice(0, 3)}...${payment.transactionId.slice(-4)}`
                            : payment.transactionId}
                        </span>
                        <Copy
                          className="h-4 w-4 cursor-pointer text-gray-400 hover:text-gray-600"
                          onClick={() => {
                            navigator.clipboard.writeText(payment.transactionId);
                            toast.success('Transaction ID copied!');
                          }}
                        />
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatAmount(payment.amount, payment.currency)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(payment.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadInvoice(payment)}
                      disabled={downloadingId === payment.id}
                    >
                      {downloadingId === payment.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Invoice
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
