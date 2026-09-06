'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface MonthlyExpenseData {
  month: number;
  monthName: string;
  amount: number;
  count: number;
}

interface MonthlyExpenseChartProps {
  data: MonthlyExpenseData[];
}

export function MonthlyExpenseChart({ data }: MonthlyExpenseChartProps) {
  // Format large numbers for better display
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  // Format tooltip values
  const formatTooltip = (value: number) => {
    return new Intl.NumberFormat('en-BD', { 
      style: 'currency',
      currency: 'BDT',
    }).format(value);
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300} className="min-h-[250px] sm:min-h-[300px]">
        <BarChart
          data={data}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="monthName" 
            fontSize={12}
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            yAxisId="left" 
            orientation="left" 
            stroke="#8884d8" 
            tickFormatter={formatYAxis} 
            fontSize={12}
            tick={{ fontSize: 12 }}
            width={50}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="#82ca9d" 
            fontSize={12}
            tick={{ fontSize: 12 }}
            width={50}
          />
          <Tooltip 
            formatter={(value: number, name: string) => {
              if (name === "amount") {
                return [formatTooltip(value), "Amount"];
              }
              return [value, "Transactions"];
            }}
            contentStyle={{ 
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid hsl(var(--border))',
              backgroundColor: 'hsl(var(--background))'
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
          />
          <Bar yAxisId="left" dataKey="amount" name="Amount" fill="#8884d8" radius={[2, 2, 0, 0]} />
          <Bar yAxisId="right" dataKey="count" name="Transactions" fill="#82ca9d" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
