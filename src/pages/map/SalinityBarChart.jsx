import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getSingleStationClassification } from "../../common/salinityClassification";

const calculateTrend = (current, previous) => {
    if (!previous) return null;
    const diff = current - previous;
    return {
        difference: diff.toFixed(2),
        direction: diff > 0 ? "increase" : diff < 0 ? "decrease" : "stable",
        percentage: ((Math.abs(diff) / previous) * 100).toFixed(1),
    };
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
        const currentValue = payload[0].payload;
        const formattedDate = new Date(currentValue.date).toLocaleDateString("vi-VN");
        const trend = currentValue.trend;

        return (
            <div className="bg-white border p-2 rounded shadow-sm">
                <p className="mb-1">Ngày: {formattedDate}</p>
                <p className="mb-1">Độ mặn: {Number(currentValue.salinity).toFixed(2)} ‰</p>
                {trend && (
                    <p
                        className="mb-0"
                        style={{
                            color:
                                trend.direction === "increase"
                                    ? "#dc3545"
                                    : trend.direction === "decrease"
                                      ? "#198754"
                                      : "#6c757d",
                        }}
                    >
                        {trend.direction === "increase" ? "▲" : trend.direction === "decrease" ? "▼" : "■"}
                        {trend.direction === "increase"
                            ? "Tăng"
                            : trend.direction === "decrease"
                              ? "Giảm"
                              : "Không đổi"}{" "}
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
        const previousSalinity = previousItem ? Number(previousItem.salinity) : null;

        return {
            ...item,
            salinity,
            trend: calculateTrend(salinity, previousSalinity),
        };
    });

    const isLoading = !formattedData || formattedData.length === 0;

    const uniqueYears = [...new Set(formattedData.map((d) => new Date(d.date).getFullYear()))];

    const ticksByYear = uniqueYears.map(
        (year) => formattedData.find((d) => new Date(d.date).getFullYear() === year)?.date,
    );

    const legendItems = [
        { color: "#28a745", label: "Bình thường", title: "Độ mặn < 1‰" },
        { color: "#ffc107", label: "Cấp 1", title: "Nhà Bè 1–4‰" },
        { color: "#fd7e14", label: "Cấp 2", title: "Nhà Bè > 4‰, trạm khác 1–4‰" },
        { color: "#dc3545", label: "Cấp 3", title: "Độ mặn > 4‰" },
    ];

    return (
        <>
            {isLoading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Đang tải...</span>
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
                                // Get color based on new classification system
                                const classification = getSingleStationClassification(entry.salinity);
                                let fillColor = "#6c757d"; // Default gray for no data

                                switch (classification.level) {
                                    case "normal":
                                        fillColor = "#28a745"; // Green - Bình thường
                                        break;
                                    case "warning":
                                        fillColor = "#ffc107"; // Yellow - Rủi ro cấp 1
                                        break;
                                    case "high-warning":
                                        fillColor = "#fd7e14"; // Orange - Rủi ro cấp 2
                                        break;
                                    case "critical":
                                        fillColor = "#dc3545"; // Red - Rủi ro cấp 3
                                        break;
                                    default:
                                        fillColor = "#6c757d"; // Gray - Khuyết số liệu
                                }

                                return <Cell key={`cell-${index}`} fill={fillColor} />;
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
            <div className="d-flex flex-wrap justify-content-center gap-2 mt-3 small">
                {legendItems.map((item) => (
                    <div
                        key={item.label}
                        className="d-inline-flex align-items-center gap-2 px-2 py-1 rounded-pill border bg-white shadow-sm"
                        title={item.title}
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
        </>
    );
};

export default SalinityBarChart;
