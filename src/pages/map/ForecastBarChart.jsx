import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getSingleStationClassification } from "@common/salinityClassification";
import { RISK_COLOR_MAP } from "@pages/map/SalinityRiskLegend";
import { formatVNDate, formatVNDateTime, formatVNTickDateTime } from "@common/vnDateTime";

const formatNumberVi = (value, fractionDigits = 2) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "-";

    return parsed.toLocaleString("vi-VN", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });
};

// Dùng chung bộ định dạng giờ VN (Asia/Ho_Chi_Minh) - không phụ thuộc múi giờ máy đang xem, và
// luôn có đủ năm (fix lỗi thiếu "yyyy" trên trục X khi chuỗi số liệu dài nhiều năm).
const formatDateVi = formatVNDate;
const formatDateTimeVi = formatVNTickDateTime;
const formatDateTimeFullVi = formatVNDateTime;

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
                        {trend.direction !== "stable" && (
                            <> {formatNumberVi(Math.abs(trend.difference), 2)}‰</>
                        )}
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
