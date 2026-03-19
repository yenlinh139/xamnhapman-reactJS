import React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";


const SENSOR_MAP = {
    distance: { key: "distance", name: "Mực nước (m)", color: "#FFD600", unit: "m" }, // vàng
    salt: { key: "salt", name: "Độ mặn (ppt)", color: "#43A047", unit: "ppt" }, // xanh lá
    temp: { key: "temp", name: "Nhiệt độ (°C)", color: "#1976D2", unit: "°C" }, // xanh dương
    rainfall: { key: "rainfall", name: "Lượng mưa hàng ngày (mm)", color: "#FF0000", unit: "mm" }, // đỏ
};

const toNumberOrNull = (value) => {
    if (value === null || value === undefined || value === "" || value === "NULL") {
        return null;
    }

    const numeric = parseFloat(value);
    return Number.isNaN(numeric) ? null : numeric;
};

const normalizeHeight = (height) => {
    if (typeof height === "number") {
        return `${height}px`;
    }

    return height || "300px";
};

// Chuẩn hóa dữ liệu cho 4 loại cảm biến - hỗ trợ cả data structure cũ và mới
function normalizeChartData(data) { 
    const safeData = Array.isArray(data) ? data : [];

    // Kiểm tra xem data có structure mới (có salt_value, temp_value) hay cũ (có SensorType)
    const hasNewStructure =
        safeData.length > 0 &&
        safeData.some(
            (item) =>
                item.salt_value !== undefined ||
                item.temp_value !== undefined ||
                item.distance_value !== undefined ||
                item.daily_rainfall_value !== undefined,
        );
    
    if (hasNewStructure) {
        // Data structure mới - mỗi item đã có tất cả sensors
        const normalized = safeData.map((item) => {
            const time = new Date(item.Date || item.date_time).toLocaleString("vi-VN", { hour12: false });
            return {
                time,
                distance: toNumberOrNull(item.distance_value),
                salt: toNumberOrNull(item.salt_value),
                temp: toNumberOrNull(item.temp_value),
                rainfall: toNumberOrNull(item.daily_rainfall_value),
            };
        });
        const result = normalized.sort((a, b) => new Date(a.time) - new Date(b.time));
        return result;
    } else {
        // Data structure cũ - gom nhóm theo SensorType
        const grouped = {};
        safeData.forEach((item) => {
            const time = new Date(item.Date || item.date_time).toLocaleString("vi-VN", { hour12: false });
            if (!grouped[time]) grouped[time] = { time };
            if (item.SensorType === "Distance") grouped[time].distance = parseFloat(item.Value);
            if (item.SensorType === "Salt") grouped[time].salt = parseFloat(item.Value);
            if (item.SensorType === "Temp") grouped[time].temp = parseFloat(item.Value);
            if (item.SensorType === "Daily Rainfall") grouped[time].rainfall = parseFloat(item.Value);
        });
        const result = Object.values(grouped).sort((a, b) => new Date(a.time) - new Date(b.time));
        return result;
    }
}

const IoTBarChart = ({ data, height = 300, isCompact = false }) => {
    const chartHeight = normalizeHeight(height);
    const safeData = Array.isArray(data) ? data : [];

    if (safeData.length === 0) {
        return (
            <div 
                className="d-flex align-items-center justify-content-center text-muted"
                style={{ height: chartHeight }}
            >
                Không có dữ liệu IoT
            </div>
        );
    }

    const chartData = normalizeChartData(safeData);

    if (!Array.isArray(chartData) || chartData.length === 0) {
        return (
            <div
                className="d-flex align-items-center justify-content-center text-muted"
                style={{ height: chartHeight }}
            >
                Không có dữ liệu IoT
            </div>
        );
    }

    // Hiển thị nhãn trục X:
    // - isCompact=true (MapDetails): chia 10 để hiển thị ít nhãn
    // - isCompact=false hoặc không có (IoTChartFull): hiển thị full tất cả nhãn
    const xInterval = isCompact ? Math.floor(chartData.length / 10) : Math.floor(chartData.length / 50);

    // Điều chỉnh margin và width dựa trên isCompact
    const margins = isCompact 
        ? { top: 20, right: 15, left: 25, bottom: 80 } // MapDetails: margin nhỏ hơn để biểu đồ rộng hơn
        : { top: 20, right: 30, left: 40, bottom: 80 }; // IoTChartFull: margin tiêu chuẩn

    const yAxisWidth = isCompact ? 50 : 70;

    return (
        <div style={{ width: "100%", height: chartHeight, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={chartData}
                    margin={margins}
                >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                        dataKey="time"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={11}
                        interval={xInterval}
                    />
                    <YAxis
                        yAxisId="left"
                        orientation="left"
                        label={{ value: "Độ mặn (ppt), Lượng mưa (mm)", angle: -90, position: "insideLeft", style: { textAnchor: 'middle' } }}
                        fontSize={12}
                        width={yAxisWidth}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{ value: "Nhiệt độ (°C), Mực nước (m)", angle: 90, position: "insideRight", style: { textAnchor: 'middle' } }}
                        fontSize={12}
                        width={yAxisWidth}
                    />
                    <Tooltip formatter={(value, name) => {
                        if (name === SENSOR_MAP.distance.name) return [`${value} m`, SENSOR_MAP.distance.name];
                        if (name === SENSOR_MAP.rainfall.name) return [`${value} mm`, SENSOR_MAP.rainfall.name];
                        if (name === SENSOR_MAP.salt.name) return [`${value} ppt`, SENSOR_MAP.salt.name];
                        if (name === SENSOR_MAP.temp.name) return [`${value} °C`, SENSOR_MAP.temp.name];
                        return [value, name];
                    }} />
                    <Legend verticalAlign="bottom" height={36} iconType="line" wrapperStyle={{ paddingTop: '10px' }}/>
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="salt"
                        name={SENSOR_MAP.salt.name}
                        stroke={SENSOR_MAP.salt.color}
                        dot={false}
                        strokeWidth={2}
                    />
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="rainfall"
                        name={SENSOR_MAP.rainfall.name}
                        stroke={SENSOR_MAP.rainfall.color}
                        dot={false}
                        strokeWidth={2}
                    />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="temp"
                        name={SENSOR_MAP.temp.name}
                        stroke={SENSOR_MAP.temp.color}
                        dot={false}
                        strokeWidth={2}
                    />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="distance"
                        name={SENSOR_MAP.distance.name}
                        stroke={SENSOR_MAP.distance.color}
                        dot={false}
                        strokeWidth={2}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default IoTBarChart;