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

const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const formattedDate = new Date(payload[0].payload.date).toLocaleDateString(
      'vi-VN'
    );
    return (
      <div className="bg-white border p-2 rounded shadow-sm">
        <p className="mb-1">Ngày: {formattedDate}</p>
        <p className="mb-0">
          Độ mặn: {Number(payload[0].payload.salinity).toFixed(4)} ‰
        </p>
      </div>
    );
  }
  return null;
};

const SalinityBarChart = ({ data, height = 350 }) => {
  // Ensure salinity values are numbers
  const formattedData = data.map((item) => ({
    ...item,
    salinity: Number(item.salinity),
  }));

  const isLoading = !formattedData || formattedData.length === 0;

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
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
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
