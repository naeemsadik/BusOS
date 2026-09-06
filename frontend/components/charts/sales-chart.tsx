import React, { useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SalesData {
  period: string;
  sales: number;
  orders: number;
  change?: string;
}

interface SalesChartProps {
  data: SalesData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const salesData = payload.find((item: any) => item.dataKey === 'sales');
    const ordersData = payload.find((item: any) => item.dataKey === 'orders');
    
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{label}</p>
        {salesData && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Sales: <span className="font-bold text-blue-600 dark:text-blue-400">৳{salesData.value.toLocaleString()}</span>
            </span>
          </div>
        )}
        {ordersData && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Orders: <span className="font-bold text-green-600 dark:text-green-400">{ordersData.value}</span>
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const CustomLegend = () => (
  <div className="flex justify-center gap-6 mt-4">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-purple-600"></div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sales Revenue</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded bg-gradient-to-r from-green-500 to-emerald-600"></div>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Orders</span>
    </div>
  </div>
);

export function SalesChart({ data }: SalesChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');
  
  // Calculate trend
  const totalSales = data.reduce((sum, item) => sum + item.sales, 0);
  const totalOrders = data.reduce((sum, item) => sum + item.orders, 0);
  const avgSales = totalSales / data.length;
  const isUpward = data.length > 1 && data[data.length - 1].sales > data[0].sales;

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No sales data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Chart Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isUpward ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isUpward ? 'Growing' : 'Declining'} Trend
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={chartType === 'bar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('bar')}
            className="h-8"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant={chartType === 'area' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('area')}
            className="h-8"
          >
            <LineChart className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <ResponsiveContainer width="100%" height={300}>
          {chartType === 'bar' ? (
            <ComposedChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#E5E7EB" 
                strokeOpacity={0.5}
                className="dark:stroke-gray-700"
              />
              <XAxis
                dataKey="period"
                fontSize={12}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#D1D5DB', strokeWidth: 1 }}
                tickLine={{ stroke: '#D1D5DB' }}
                className="dark:tick-gray-400"
                interval={0}
                angle={-45}
                textAnchor="end"
                height={70}
              />
              <YAxis
                fontSize={12}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#D1D5DB', strokeWidth: 1 }}
                tickLine={{ stroke: '#D1D5DB' }}
                className="dark:tick-gray-400"
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={avgSales} 
                stroke="#F59E0B" 
                strokeDasharray="5 5" 
                strokeOpacity={0.7}
                label={{ value: "Avg", position: "insideTopRight", fill: "#F59E0B" }}
              />
              <Bar
                dataKey="sales"
                fill="url(#salesGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
              />
              <Bar
                dataKey="orders"
                fill="url(#ordersGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={60}
              />
            </ComposedChart>
          ) : (
            <AreaChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <defs>
                <linearGradient id="salesAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="ordersAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#E5E7EB" 
                strokeOpacity={0.5}
                className="dark:stroke-gray-700"
              />
              <XAxis
                dataKey="period"
                fontSize={12}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#D1D5DB', strokeWidth: 1 }}
                tickLine={{ stroke: '#D1D5DB' }}
                className="dark:tick-gray-400"
                interval={0}
                angle={-45}
                textAnchor="end"
                height={70}
              />
              <YAxis
                fontSize={12}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#D1D5DB', strokeWidth: 1 }}
                tickLine={{ stroke: '#D1D5DB' }}
                className="dark:tick-gray-400"
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#3B82F6"
                strokeWidth={3}
                fill="url(#salesAreaGradient)"
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="#10B981"
                strokeWidth={3}
                fill="url(#ordersAreaGradient)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
        
        <CustomLegend />
      </div>
    </div>
  );
}
