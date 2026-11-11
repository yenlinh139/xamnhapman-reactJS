import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getSingleStationClassification } from "@common/salinityClassification";
import { RISK_COLOR_MAP } from "@pages/map/SalinityRiskLegend";

const formatNumberVi = (value, fractionDigits = 2) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "-";

    return parsed.toLocaleString("vi-VN", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });
};

const formatDateVi = (isoString) => {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("vi-VN");
};

const formatDateTimeVi = (isoString) => {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatDateTimeFullVi = (isoString) => {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const calculateTrend = (current, previous) => {
    if (previous === null || previous === undefined || !Number.isFinite(Number(previous))) return null;
    const diff = Number(current) - Number(previous);
    return {
        difference: diff,
        direction: diff > 0 ? "increase" : diff < 0 ? "decrease" : "stable",
        percentage: previous !== 0 ? (Math.abs(diff) / Math.abs(previous)) * 100 : null,
    };
};

const CustomTooltip = ({ active, payload, xLabel, trendUnit, formatX }) => {
    if (active && payload?.length) {
        const point = payload[0].payload;
        const trend = point.trend;

        return (
            <div className="bg-white border p-2 rounded shadow-sm">
                <p className="mb-1">
                    {xLabel}: {formatX(point.x)}
                </p>
                <p className="mb-1">Độ mặn: {formatNumberVi(point.salinity, 2)} ‰</p>
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
                            ? " Tăng"
                            : trend.direction === "decrease"
                              ? " Giảm"
                              : " Không đổi"}{" "}
                        {formatNumberVi(Math.abs(trend.difference), 2)} ‰ so với {trendUnit}
                        {Number.isFinite(trend.percentage)
                            ? ` (${formatNumberVi(trend.percentage, 1)}%)`
                            : ""}
                    </p>
                )}
            </div>
        );
    }
    return null;
};

// data: [{ x: "2024-09-20" | "2024-09-20T02:00:00+07:00", salinity: 0.24 }, ...], sắp xếp tăng dần theo x.
// kiHieu: mã trạm - dùng để phân cấp rủi ro đúng ngưỡng theo từng trạm (vd MNB khác các trạm còn lại)
// mode: "date" (1 bản ghi/ngày, trục X theo ngày) | "datetime" (mỗi mốc 2h, trục X theo giờ)
const ForecastBarChart = ({ data, kiHieu, height = "100%", mode = "date" }) => {
    const isDateTime = mode === "datetime";
    const xLabel = isDateTime ? "Thời điểm" : "Ngày";
    const trendUnit = isDateTime ? "giờ liền trước" : "ngày liền trước";
    const formatTick = isDateTime ? formatDateTimeVi : formatDateVi;
    const formatTooltipX = isDateTime ? formatDateTimeFullVi : formatDateVi;

    const formattedData = data.map((item, index) => {
        const previous = index > 0 ? data[index - 1] : null;
        return {
            ...item,
            trend: previous ? calculateTrend(item.salinity, previous.salinity) : null,
        };
    });

    const isEmpty = !formattedData || formattedData.length === 0;

    return isEmpty ? (
        <div className="text-center py-5 text-muted">Không có dữ liệu để hiển thị.</div>
    ) : (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={formattedData} barCategoryGap={isDateTime ? 1 : 12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />

                <XAxis
                    dataKey="x"
                    tickFormatter={formatTick}
                    tick={{ fontSize: 11 }}
                    minTickGap={isDateTime ? 40 : 20}
                />

                <YAxis
                    unit=" ‰"
                    tick={{ fontSize: 12 }}
                    domain={[0, (dataMax) => Math.ceil(dataMax) || 1]}
                    allowDataOverflow
                />

                <Tooltip
                    content={<CustomTooltip xLabel={xLabel} trendUnit={trendUnit} formatX={formatTooltipX} />}
                />

                <Bar dataKey="salinity" barSize={isDateTime ? 4 : 18}>
                    {formattedData.map((entry, index) => {
                        const classification = getSingleStationClassification(entry.salinity, kiHieu);
                        const fillColor = RISK_COLOR_MAP[classification.class] || "#6c757d";
                        return <Cell key={`cell-${index}`} fill={fillColor} />;
                    })}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default ForecastBarChart;
