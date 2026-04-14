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

const RISK_LEGEND_ITEMS = [
    { color: "#28a745", label: "Bình thường" },
    { color: "#ffc107", label: "Cấp 1" },
    { color: "#fd7e14", label: "Cấp 2" },
    { color: "#dc3545", label: "Cấp 3" },
];

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

const formatChartDateTime = (rawTime, groupBy = "none") => {
    const timestamp = new Date(rawTime).getTime();
    if (Number.isNaN(timestamp)) {
        return String(rawTime || "");
    }

    const parsed = new Date(timestamp);
    if (groupBy === "date") {
        return parsed.toLocaleDateString("vi-VN");
    }

    const hours = String(parsed.getHours()).padStart(2, "0");
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    const dateLabel = parsed.toLocaleDateString("vi-VN");
    return `${hours}:${minutes} ${dateLabel}`;
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

const IoTBarChart = ({ data, height = 300, isCompact = false, groupBy = "none", stationCode = "" }) => {
    const chartHeight = normalizeHeight(height);
    const safeData = Array.isArray(data) ? data : [];
    const [visibleSeries, setVisibleSeries] = useState({
        salt: true,
        rainfall: true,
        temp: true,
        distance: true,
    });

    const normalizedStationCode = String(stationCode || "")
        .replace(/_IoT$/i, "")
        .replace(/_iot$/i, "");

    const chartData = useMemo(() => {
        const normalizedData = normalizeChartData(safeData, groupBy);

        return normalizedData.map((item) => {
            const classification = getSingleStationClassification(item.salt, normalizedStationCode);
            const riskKey = classification.class || "no-data";

            return {
                ...item,
                saltColor: SALINITY_RISK_COLORS[riskKey] || SALINITY_RISK_COLORS["no-data"],
                saltRiskLabel: classification.shortText || classification.description || "Khuyết số liệu",
            };
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
                        <Tooltip
                            formatter={(value, name, payload) => {
                                if (value === null || value === undefined) {
                                    return ["-", name];
                                }

                                if (name === SENSOR_MAP.distance.name)
                                    return [`${value} cm`, SENSOR_MAP.distance.name];
                                if (name === SENSOR_MAP.rainfall.name)
                                    return [`${value} mm`, SENSOR_MAP.rainfall.name];
                                if (name === SENSOR_MAP.salt.name) {
                                    const riskLabel = payload?.payload?.saltRiskLabel
                                        ? ` (${payload.payload.saltRiskLabel})`
                                        : "";
                                    return [`${value} ‰${riskLabel}`, SENSOR_MAP.salt.name];
                                }
                                if (name === SENSOR_MAP.temp.name)
                                    return [`${value} °C`, SENSOR_MAP.temp.name];
                                return [value, name];
                            }}
                        />

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

            <div
                className="d-flex flex-wrap justify-content-center gap-2 mt-2 small"
                style={{ flexShrink: 0 }}
            >
                {RISK_LEGEND_ITEMS.map((item) => (
                    <div
                        key={item.label}
                        className="d-inline-flex align-items-center gap-2 px-2 py-1 rounded-pill border bg-white shadow-sm"
                        style={{ lineHeight: 1.2 }}
                    >
                        <span
                            style={{
                                width: 10,
                                height: 10,
                                backgroundColor: item.color,
                                borderRadius: 2,
                                display: "inline-block",
                            }}
                        ></span>
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default IoTBarChart;
