import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getSingleStationClassification } from "../../common/salinityClassification";
import { RISK_COLOR_MAP } from "@pages/map/SalinityRiskLegend";
import { formatVNDate } from "@common/vnDateTime";

const formatNumberVi = (value, fractionDigits = 2) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "-";

    return parsed.toLocaleString("vi-VN", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });
};

const calculateTrend = (current, previous) => {
    if (!previous) return null;
    const diff = current - previous;
    return {
        difference: diff,
        direction: diff > 0 ? "increase" : diff < 0 ? "decrease" : "stable",
        percentage: (Math.abs(diff) / previous) * 100,
    };
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
        const currentValue = payload[0].payload;
        const formattedDate = formatVNDate(currentValue.date);
        const trend = currentValue.trend;

        return (
            <div className="bg-white border p-2 rounded shadow-sm">
                <p className="mb-1">Ngày: {formattedDate}</p>
                <p className="mb-1">Độ mặn: {formatNumberVi(currentValue.salinity, 2)} ‰</p>
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
                        {formatNumberVi(Math.abs(trend.difference), 2)} ‰ (
                        {formatNumberVi(trend.percentage, 2)}%)
                    </p>
                )}
            </div>
        );
    }
    return null;
};

const SalinityBarChart = ({ data, height, kiHieu }) => {
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
                                // Get color based on new classification system (Nhà Bè có ngưỡng khác các trạm còn lại)
                                const classification = getSingleStationClassification(entry.salinity, kiHieu);
                                const fillColor = RISK_COLOR_MAP[classification.class] || "#6c757d";

                                return <Cell key={`cell-${index}`} fill={fillColor} />;
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </>
    );
};

export default SalinityBarChart;
