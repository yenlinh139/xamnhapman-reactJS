import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const calculateTrend = (current, previous) => {
  if (!previous) return null;
  const diff = current - previous;
  return {
    difference: diff.toFixed(2),
    direction: diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'stable',
    percentage: ((Math.abs(diff) / previous) * 100).toFixed(1),
  };
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const currentValue = payload[0].payload;
    const formattedDate = new Date(currentValue.date).toLocaleDateString(
      'vi-VN'
    );
    const trend = currentValue.trend;

    return (
      <div className="bg-white border p-2 rounded shadow-sm">
        <p className="mb-1">Ngày: {formattedDate}</p>
        <p className="mb-1">
          Độ mặn: {Number(currentValue.salinity).toFixed(2)} ‰
        </p>
        {trend && (
          <p
            className="mb-0"
            style={{
              color:
                trend.direction === 'increase'
                  ? '#dc3545'
                  : trend.direction === 'decrease'
                  ? '#198754'
                  : '#6c757d',
            }}
          >
            {trend.direction === 'increase'
              ? '▲'
              : trend.direction === 'decrease'
              ? '▼'
              : '■'}
            {trend.direction === 'increase'
              ? 'Tăng'
              : trend.direction === 'decrease'
              ? 'Giảm'
              : 'Không đổi'}{' '}
            {Math.abs(trend.difference)} ‰ ({trend.percentage}%)
          </p>
        )}
      </div>
    );
  }
  return null;
};

const SalinityBarChart = ({ data, height }) => {
  // Ensure salinity values are numbers and calculate trends
  const formattedData = data.map((item, index) => {
    const salinity = Number(item.salinity);
    const previousItem = index > 0 ? data[index - 1] : null;
    const previousSalinity = previousItem
      ? Number(previousItem.salinity)
      : null;

    return {
      ...item,
      salinity,
      trend: calculateTrend(salinity, previousSalinity),
    };
  });

  const isLoading = !formattedData || formattedData.length === 0;

  const uniqueYears = [
    ...new Set(formattedData.map((d) => new Date(d.date).getFullYear())),
  ];

  const ticksByYear = uniqueYears.map(
    (year) =>
      formattedData.find((d) => new Date(d.date).getFullYear() === year)?.date
  );

  return (
    <>
      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%" minHeight={height}>
          <BarChart data={formattedData} barCategoryGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />

            <XAxis
              dataKey="date"
              tickFormatter={(d) => new Date(d).getFullYear()}
              ticks={ticksByYear}
              tick={{ fontSize: 10 }}
            />

            <YAxis
              unit="‰"
              tick={{
                fontSize: 12,
              }}
              domain={[0, (dataMax) => Math.ceil(dataMax)]}
              allowDataOverflow={true}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="salinity" barSize={10}>
              {formattedData.map((entry, index) => {
                let fillColor = '#0d6efd';
                if (entry.salinity >= 4) fillColor = '#dc3545';
                else if (entry.salinity >= 1) fillColor = '#fd7e14';
                return <Cell key={`cell-${index}`} fill={fillColor} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
      <div className="d-flex justify-content-center gap-3 mt-2 small">
        <div className="d-flex align-items-center gap-1">
          <div
            style={{
              width: 12,
              height: 12,
              backgroundColor: '#0d6efd',
              borderRadius: 2,
            }}
          ></div>
          <span>Bình thường (độ mặn &lt; 1‰)</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <div
            style={{
              width: 12,
              height: 12,
              backgroundColor: '#fd7e14',
              borderRadius: 2,
            }}
          ></div>
          <span>Rủi ro cấp 2 (độ mặn 1‰ - 4‰)</span>
        </div>
        <div className="d-flex align-items-center gap-1">
          <div
            style={{
              width: 12,
              height: 12,
              backgroundColor: '#dc3545',
              borderRadius: 2,
            }}
          ></div>
          <span>Rủi ro cấp 3 (độ mặn &gt; 4‰)</span>
        </div>
      </div>
    </>
  );
};

export default SalinityBarChart;
