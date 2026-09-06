import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ExpenseCategoryData {
  category: string;
  amount: number;
  percentage: number;
  count?: number;
}

interface ExpensePieChartProps {
  data: ExpenseCategoryData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];

export function ExpensePieChart({ data }: ExpensePieChartProps) {
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300} className="min-h-[250px] sm:min-h-[300px]">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius="80%"
            fill="#8884d8"
            dataKey="amount"
            nameKey="category"
            label={({ name, percent }) => {
              // Hide labels on very small screens to avoid clutter
              if (window.innerWidth < 640) {
                return percent > 0.1 ? `${(percent * 100).toFixed(0)}%` : '';
              }
              return `${name} ${(percent * 100).toFixed(0)}%`;
            }}
            fontSize={12}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => {
              return new Intl.NumberFormat('en-BD', { 
                style: 'currency',
                currency: 'BDT',
              }).format(value)
            }}
            contentStyle={{ 
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid hsl(var(--border))',
              backgroundColor: 'hsl(var(--background))'
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            iconSize={12}
            layout="horizontal"
            align="center"
            verticalAlign="bottom"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
