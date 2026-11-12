import React, { useMemo, useState } from "react";
import {
    ComposedChart,
    Bar,
    Cell,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { getSingleStationClassification } from "@common/salinityClassification";
import { formatVNDate, formatVNTickDateTime } from "@common/vnDateTime";

const SENSOR_MAP = {
    distance: { key: "distance", name: "Mực nước (cm)", color: "#FFD600", unit: "cm" },
    salt: { key: "salt", name: "Độ mặn (‰)", color: "#43A047", unit: "‰" },
    temp: { key: "temp", name: "Nhiệt độ (°C)", color: "#1976D2", unit: "°C" },
    rainfall: { key: "rainfall", name: "Lượng mưa (mm)", color: "#FF0000", unit: "mm" },
};

const SALINITY_RISK_COLORS = {
    normal: "#28a745",
    warning: "#ffc107",
    "high-warning": "#fd7e14",
    critical: "#dc3545",
    "no-data": "#6c757d",
};

const toNumberOrNull = (value) => {
    if (value === null || value === undefined || value === "" || value === "NULL") {
        return null;
    }

    const numeric = parseFloat(value);
    return Number.isNaN(numeric) ? null : numeric;
};

const formatNumberVi = (value, fractionDigits = 2) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "-";

    return parsed.toLocaleString("vi-VN", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });
};

// Xu thế độ mặn so với mốc liền trước - kèm tốc độ biến đổi theo giờ vì các mốc IoT có thể cách
// nhau không đều (5 phút/giờ/ngày tuỳ Tần suất đang chọn), khác với dữ liệu quan trắc thủ công
// (luôn cách nhau đúng 1 ngày nên chỉ cần hiện chênh lệch tuyệt đối).
const calculateSaltTrend = (current, previous, hoursDelta) => {
    if (current === null || current === undefined || !Number.isFinite(current)) return null;
    if (previous === null || previous === undefined || !Number.isFinite(previous)) return null;

    const diff = current - previous;
    return {
        difference: diff,
        direction: diff > 0 ? "increase" : diff < 0 ? "decrease" : "stable",
        percentage: previous !== 0 ? (Math.abs(diff) / Math.abs(previous)) * 100 : null,
        ratePerHour: hoursDelta > 0 ? diff / hoursDelta : null,
    };
};

const normalizeHeight = (height) => {
    if (typeof height === "number") {
        return `${height}px`;
    }

    return height || "300px";
};

// Dùng formatVN* (giờ VN tường minh, không phụ thuộc múi giờ máy đang xem) thay vì
// toLocaleDateString()/getHours() mặc định, và luôn kèm năm để không bị nhầm giữa các năm.
const formatChartDateTime = (rawTime, groupBy = "none") => {
    if (Number.isNaN(new Date(rawTime).getTime())) {
        return String(rawTime || "");
    }

    return groupBy === "date" ? formatVNDate(rawTime) : formatVNTickDateTime(rawTime);
};

function normalizeChartData(data, groupBy = "none") {
    const safeData = Array.isArray(data) ? data : [];

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
        const normalized = safeData.map((item) => {
            const rawTime =
                item.Date || item.date_time || item.sync_5m_end_time || item.hour_end_time || item.day;
            const timestamp = new Date(rawTime).getTime();
            const time = formatChartDateTime(rawTime, groupBy);
            return {
                time,
                timestamp,
                distance: toNumberOrNull(item.distance_value),
                salt: toNumberOrNull(item.salt_value),
                temp: toNumberOrNull(item.temp_value),
                rainfall: toNumberOrNull(item.daily_rainfall_value),
            };
        });
        return normalized.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }

    const grouped = {};
    safeData.forEach((item) => {
        const rawTime =
            item.Date || item.date_time || item.sync_5m_end_time || item.hour_end_time || item.day;
        const timestamp = new Date(rawTime).getTime();
        const time = formatChartDateTime(rawTime, groupBy);
        if (!grouped[time]) grouped[time] = { time };
        grouped[time].timestamp = Number.isNaN(timestamp) ? 0 : timestamp;
        if (item.SensorType === "Distance") grouped[time].distance = parseFloat(item.Value);
        if (item.SensorType === "Salt") grouped[time].salt = parseFloat(item.Value);
        if (item.SensorType === "Temp") grouped[time].temp = parseFloat(item.Value);
        if (item.SensorType === "Daily Rainfall") grouped[time].rainfall = parseFloat(item.Value);
    });

    return Object.values(grouped).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

const TREND_DIRECTION_META = {
    increase: { icon: "▲", label: "Tăng", color: "#dc3545" },
    decrease: { icon: "▼", label: "Giảm", color: "#198754" },
    stable: { icon: "■", label: "Không đổi", color: "#6c757d" },
};

const SERIES_UNIT_BY_NAME = {
    [SENSOR_MAP.distance.name]: "cm",
    [SENSOR_MAP.rainfall.name]: "mm",
    [SENSOR_MAP.salt.name]: "‰",
    [SENSOR_MAP.temp.name]: "°C",
};

const IoTCustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const point = payload[0]?.payload;
    const trend = point?.saltTrend;
    // Chỉ hiện xu thế khi Độ mặn đang được hiển thị trên biểu đồ (payload chỉ chứa các series
    // đang bật - xem visibleSeries), tránh nói về 1 đại lượng người dùng đã tắt khỏi chart.
    const showTrend = trend && payload.some((entry) => entry.dataKey === "salt");
    const trendMeta = showTrend ? TREND_DIRECTION_META[trend.direction] : null;

    return (
        <div className="bg-white border p-2 rounded shadow-sm" style={{ minWidth: 220 }}>
            <p className="mb-1 fw-semibold">{label}</p>
            {payload.map((entry) => {
                if (entry.value === null || entry.value === undefined) return null;
                const unit = SERIES_UNIT_BY_NAME[entry.name] || "";
                const riskLabel =
                    entry.name === SENSOR_MAP.salt.name && point?.saltRiskLabel
                        ? ` (${point.saltRiskLabel})`
                        : "";

                return (
                    <p className="mb-1" key={entry.dataKey} style={{ color: entry.color }}>
                        {entry.name}: {formatNumberVi(entry.value, 2)} {unit}
                        {riskLabel}
                    </p>
                );
            })}
            {trendMeta && (
                <p className="mb-0" style={{ color: trendMeta.color }}>
                    {trendMeta.icon} Xu thế độ mặn: {trendMeta.label}{" "}
                    {formatNumberVi(Math.abs(trend.difference), 2)}‰ so với mốc trước
                    {Number.isFinite(trend.ratePerHour)
                        ? ` (tốc độ ${trend.ratePerHour >= 0 ? "+" : ""}${formatNumberVi(trend.ratePerHour, 3)}‰/giờ)`
                        : ""}
                </p>
            )}
        </div>
    );
};

const IoTBarChart = ({ data, height = 300, isCompact = false, groupBy = "none", stationCode = "" }) => {
    const chartHeight = normalizeHeight(height);
    const safeData = Array.isArray(data) ? data : [];
    // Mặc định chỉ hiện Độ mặn - 3 biến còn lại (mưa/nhiệt độ/mực nước) tắt sẵn để biểu đồ tải
    // nhanh hơn (toàn bộ vẫn render data, chỉ ẩn series), người dùng tự bật thêm khi cần so sánh.
    const [visibleSeries, setVisibleSeries] = useState({
        salt: true,
        rainfall: false,
        temp: false,
        distance: false,
    });

    const normalizedStationCode = String(stationCode || "")
        .replace(/_IoT$/i, "")
        .replace(/_iot$/i, "");

    const chartData = useMemo(() => {
        const normalizedData = normalizeChartData(safeData, groupBy);

        let previous = null;
        return normalizedData.map((item) => {
            const classification = getSingleStationClassification(item.salt, normalizedStationCode);
            const riskKey = classification.class || "no-data";

            const hoursDelta =
                previous && Number.isFinite(item.timestamp) && Number.isFinite(previous.timestamp)
                    ? (item.timestamp - previous.timestamp) / (1000 * 60 * 60)
                    : null;
            const saltTrend = previous ? calculateSaltTrend(item.salt, previous.salt, hoursDelta) : null;

            const result = {
                ...item,
                saltColor: SALINITY_RISK_COLORS[riskKey] || SALINITY_RISK_COLORS["no-data"],
                saltRiskLabel: classification.shortText || classification.description || "Khuyết số liệu",
                saltTrend,
            };
            previous = item;
            return result;
        });
    }, [groupBy, normalizedStationCode, safeData]);

    if (safeData.length === 0 || !Array.isArray(chartData) || chartData.length === 0) {
        return (
            <div
                className="d-flex align-items-center justify-content-center text-muted"
                style={{ height: chartHeight }}
            >
                Không có dữ liệu IoT
            </div>
        );
    }

    const xInterval = isCompact
        ? Math.max(Math.floor(chartData.length / 10), 0)
        : Math.max(Math.floor(chartData.length / 50), 0);
    const margins = isCompact
        ? { top: 8, right: 12, left: 18, bottom: 56 }
        : { top: 8, right: 18, left: 24, bottom: 56 };
    const yAxisWidth = isCompact ? 44 : 56;

    const toggleSeries = (seriesKey) => {
        setVisibleSeries((prev) => ({
            ...prev,
            [seriesKey]: !prev[seriesKey],
        }));
    };

    const seriesButtons = [SENSOR_MAP.salt, SENSOR_MAP.rainfall, SENSOR_MAP.temp, SENSOR_MAP.distance];

    return (
        <div
            style={{
                width: "100%",
                height: chartHeight,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
            }}
        >
            <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={margins}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                            dataKey="time"
                            angle={-45}
                            textAnchor="end"
                            height={58}
                            fontSize={10}
                            interval={xInterval}
                        />
                        <YAxis
                            yAxisId="left"
                            orientation="left"
                            label={{
                                value: "Độ mặn (‰), Lượng mưa (mm)",
                                angle: -90,
                                position: "insideLeft",
                                style: { textAnchor: "middle" },
                            }}
                            fontSize={12}
                            width={yAxisWidth}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            label={{
                                value: "Nhiệt độ (°C), Mực nước (cm)",
                                angle: 90,
                                position: "insideRight",
                                style: { textAnchor: "middle" },
                            }}
                            fontSize={12}
                            width={yAxisWidth}
                        />
                        <Tooltip content={<IoTCustomTooltip />} />

                        {visibleSeries.salt && (
                            <Bar
                                yAxisId="left"
                                dataKey="salt"
                                name={SENSOR_MAP.salt.name}
                                barSize={10}
                                radius={[2, 2, 0, 0]}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`salt-cell-${index}`} fill={entry.saltColor} />
                                ))}
                            </Bar>
                        )}

                        {visibleSeries.rainfall && (
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="rainfall"
                                name={SENSOR_MAP.rainfall.name}
                                stroke={SENSOR_MAP.rainfall.color}
                                dot={false}
                                strokeWidth={2}
                            />
                        )}

                        {visibleSeries.temp && (
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="temp"
                                name={SENSOR_MAP.temp.name}
                                stroke={SENSOR_MAP.temp.color}
                                dot={false}
                                strokeWidth={2}
                            />
                        )}

                        {visibleSeries.distance && (
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="distance"
                                name={SENSOR_MAP.distance.name}
                                stroke={SENSOR_MAP.distance.color}
                                dot={false}
                                strokeWidth={2}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <div
                className="d-flex flex-wrap justify-content-center gap-2 mt-2 small"
                style={{ flexShrink: 0 }}
            >
                {seriesButtons.map((item) => {
                    const isActive = visibleSeries[item.key];
                    return (
                        <button
                            key={item.key}
                            type="button"
                            className={`btn btn-sm ${isActive ? "btn-outline-primary" : "btn-outline-secondary"}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                toggleSeries(item.key);
                            }}
                            title={`${isActive ? "Ẩn" : "Hiện"} ${item.name}`}
                            style={{ lineHeight: 1.2 }}
                        >
                            <span
                                style={{
                                    width: 10,
                                    height: 10,
                                    backgroundColor: item.color,
                                    borderRadius: 2,
                                    display: "inline-block",
                                    marginRight: 6,
                                    opacity: isActive ? 1 : 0.4,
                                }}
                            ></span>
                            {isActive ? "Tắt" : "Bật"} {item.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default IoTBarChart;
