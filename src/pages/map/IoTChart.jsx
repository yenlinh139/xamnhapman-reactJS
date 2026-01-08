import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";

// Hàm phân loại dựa theo Value - tương tự điểm đo mặn
const getIoTValueClassification = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
        return {
            level: "no-data",
            color: "#6c757d",
            description: "Khuyết số liệu"
        };
    }

    const numericValue = parseFloat(value);

    if (numericValue < 1) {
        return {
            level: "normal",
            color: "#28a745", // Xanh - Bình thường
            description: "Bình thường"
        };
    } else if (numericValue <= 4) {
        return {
            level: "warning",
            color: "#ffc107", // Vàng - Rủi ro cấp 1
            description: "Rủi ro cấp 1"
        };
    } else if (numericValue <= 8) {
        return {
            level: "high-warning",
            color: "#fd7e14", // Cam - Rủi ro cấp 2
            description: "Rủi ro cấp 2"
        };
    } else {
        return {
            level: "critical",
            color: "#dc3545", // Đỏ - Rủi ro cấp 3
            description: "Rủi ro cấp 3"
        };
    }
};

const IoTChart = ({ data, height = 300 }) => {
    if (!data || data.length === 0) {
        return (
            <div className="d-flex align-items-center justify-content-center" style={{ height }}>
                <div className="text-muted">Không có dữ liệu IoT</div>
            </div>
        );
    }

    // Chuẩn bị dữ liệu cho biểu đồ
    const chartData = data.map((item, index) => {
        const classification = getIoTValueClassification(item.Value);
        return {
            ...item,
            index,
            displayDate: new Date(item.Date).toLocaleDateString("vi-VN"),
            displayTime: new Date(item.Date).toLocaleTimeString("vi-VN", { 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            color: classification.color,
            level: classification.level,
            description: classification.description
        };
    });

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 border rounded shadow-sm">
                    <p className="mb-1 fw-bold">{`${data.displayDate} ${data.displayTime}`}</p>
                    <p className="mb-1">
                        <span className="fw-semibold">Giá trị:</span> {data.Value} {data.Unit}
                    </p>
                    <p className="mb-1">
                        <span className="fw-semibold">Trạng thái:</span> {data.Status}
                    </p>
                    <p className="mb-1">
                        <span className="fw-semibold">Phân loại:</span> 
                        <span style={{ color: data.color, fontWeight: 'bold' }}> {data.description}</span>
                    </p>
                    <p className="mb-0">
                        <span className="fw-semibold">Cảm biến:</span> {data.SensorType}
                    </p>
                </div>
            );
        }
        return null;
    };

    const formatXAxisLabel = (tickItem, index) => {
        const item = chartData[index];
        if (!item) return '';
        return `${item.displayDate}\n${item.displayTime}`;
    };

    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart
                data={chartData}
                margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis 
                    dataKey="index"
                    tickFormatter={formatXAxisLabel}
                    interval={Math.max(Math.floor(chartData.length / 8), 0)}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={11}
                />
                <YAxis 
                    label={{ 
                        value: 'Giá trị', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle' }
                    }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Value" radius={[2, 2, 0, 0]}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default IoTChart;