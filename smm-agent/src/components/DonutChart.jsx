import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <span>{d.icon}</span>
          <span className="font-semibold text-white text-sm">{d.name}</span>
        </div>
        <div className="text-2xl font-bold" style={{ color: d.color }}>{d.value}%</div>
      </div>
    );
  }
  return null;
};

export default function DonutChart({ data }) {
  const chartData = data.map(ct => ({
    name: ct.name,
    value: ct.percent,
    color: ct.color,
    icon: ct.icon,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
