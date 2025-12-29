import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/currencyFormat';

export const MonthlyTrendChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="month" 
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            style={{ textTransform: 'capitalize' }}
          />
          <YAxis 
            tickFormatter={(value) => formatCurrency(value)}
            stroke="#6b7280"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            width={100}
          />
          <Tooltip 
            formatter={(value) => formatCurrency(value)}
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} name="Revenue" dot={{ fill: '#10b981', r: 4 }} />
          <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={3} name="Cost" dot={{ fill: '#ef4444', r: 4 }} />
          <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} name="Profit" dot={{ fill: '#3b82f6', r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

