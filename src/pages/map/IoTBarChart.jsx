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
    Distance: { key: "Distance", name: "Mực nước (cm)", color: "#FFD600", unit: "cm" }, // vàng
    Salt: { key: "Salt", name: "Độ mặn (g/L)", color: "#43A047", unit: "g/L" }, // xanh lá
    Temp: { key: "Temp", name: "Nhiệt độ không khí (°C)", color: "#1976D2", unit: "°C" }, // xanh dương
    DailyRainfall: { key: "DailyRainfall", name: "Lượng mưa hàng ngày (mm)", color: "#FF0000", unit: "mm" }, // đỏ
};

// Chuẩn hóa dữ liệu cho 3 loại cảm biến
function normalizeChartData(data) {
    // Gom nhóm theo thời gian (Date), mỗi điểm là 1 timestamp, mỗi trường là 1 loại sensor
    const grouped = {};
    data.forEach((item) => {
        const time = new Date(item.Date).toLocaleString("vi-VN", { hour12: false });
        if (!grouped[time]) grouped[time] = { time };
        if (item.SensorType === "Distance") grouped[time].Distance = parseFloat(item.Value);
        if (item.SensorType === "Salt") grouped[time].Salt = parseFloat(item.Value);
        if (item.SensorType === "Temp") grouped[time].Temp = parseFloat(item.Value);
        if (item.SensorType === "Daily Rainfall") grouped[time].DailyRainfall = parseFloat(item.Value);
    });
    // Trả về mảng đã sort theo thời gian
    return Object.values(grouped).sort((a, b) => new Date(a.time) - new Date(b.time));
}

const IoTBarChart = ({ data, height = 300, isCompact = false }) => {
    if (!data || data.length === 0) {
        return (
            <div 
                className="d-flex align-items-center justify-content-center text-muted"
                style={{ height: height }}
            >
                Không có dữ liệu IoT
            </div>
        );
    }

    const chartData = normalizeChartData(data);

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
        <div style={{ width: "100%", height: height + 30 }}>
            <ResponsiveContainer>
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
                        label={{ value: "Độ mặn (g/L), Lượng mưa ngày (mm)", angle: -90, position: "insideLeft", style: { textAnchor: 'middle' } }}
                        fontSize={12}
                        width={yAxisWidth}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{ value: "Nhiệt độ (°C), Mực nước (cm)", angle: 90, position: "insideRight", style: { textAnchor: 'middle' } }}
                        fontSize={12}
                        width={yAxisWidth}
                    />
                    <Tooltip formatter={(value, name) => {
                        if (name === SENSOR_MAP.Distance.name) return [`${value} cm`, SENSOR_MAP.Distance.name];
                        if (name === SENSOR_MAP.DailyRainfall.name) return [`${value} mm`, SENSOR_MAP.DailyRainfall.name];
                        if (name === SENSOR_MAP.Salt.name) return [`${value} g/L`, SENSOR_MAP.Salt.name];
                        if (name === SENSOR_MAP.Temp.name) return [`${value} °C`, SENSOR_MAP.Temp.name];
                        return [value, name];
                    }} />
                    <Legend verticalAlign="bottom" height={36} iconType="line" wrapperStyle={{ paddingTop: '10px' }}/>
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="Salt"
                        name={SENSOR_MAP.Salt.name}
                        stroke={SENSOR_MAP.Salt.color}
                        dot={false}
                        strokeWidth={2}
                    />
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="DailyRainfall"
                        name={SENSOR_MAP.DailyRainfall.name}
                        stroke={SENSOR_MAP.DailyRainfall.color}
                        dot={false}
                        strokeWidth={2}
                    />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="Temp"
                        name={SENSOR_MAP.Temp.name}
                        stroke={SENSOR_MAP.Temp.color}
                        dot={false}
                        strokeWidth={2}
                    />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="Distance"
                        name={SENSOR_MAP.Distance.name}
                        stroke={SENSOR_MAP.Distance.color}
                        dot={false}
                        strokeWidth={2}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default IoTBarChart;