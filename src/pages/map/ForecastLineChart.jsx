import React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceArea,
    ReferenceLine,
} from "recharts";
import { getSingleStationClassification } from "@common/salinityClassification";
import { RISK_COLOR_MAP, RISK_THRESHOLD_LOW, RISK_THRESHOLD_HIGH } from "@pages/map/SalinityRiskLegend";

const formatNumberVi = (value, fractionDigits = 2) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "-";

    return parsed.toLocaleString("vi-VN", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });
};

const formatAxisTick = (isoString) => {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const CustomTooltip = ({ active, payload, kiHieu }) => {
    if (active && payload?.length) {
        const point = payload[0].payload;
        const riskClassification = getSingleStationClassification(point.salinity, kiHieu);
        return (
            <div className="bg-white border p-2 rounded shadow-sm">
                <p className="mb-1">Thời điểm: {formatAxisTick(point.time)}</p>
                <p className="mb-1">Độ mặn dự báo (2h): {formatNumberVi(point.salinity, 2)} ‰</p>
                {point.dailySalinity != null && (
                    <p className="mb-1" style={{ color: "#8e44ad" }}>
                        Dự báo theo ngày: {formatNumberVi(point.dailySalinity, 2)} ‰
                    </p>
                )}
                <p className="mb-0" style={{ color: RISK_COLOR_MAP[riskClassification.class] }}>
                    {riskClassification.shortText}
                </p>
            </div>
        );
    }
    return null;
};

const buildRiskDotRenderer = (kiHieu) => (props) => {
    const { cx, cy, payload } = props;
    const riskClassification = getSingleStationClassification(payload.salinity, kiHieu);
    const color = RISK_COLOR_MAP[riskClassification.class] || "#6c757d";
    return <circle key={payload.time} cx={cx} cy={cy} r={3} fill={color} stroke="#fff" strokeWidth={1} />;
};

// data: [{ time: "2024-08-01T02:00:00+07:00", salinity: 1.5, dailySalinity: 1.2 }, ...]
// kiHieu: mã trạm - dùng để phân cấp rủi ro đúng ngưỡng theo từng trạm (vd MNB khác các trạm còn lại)
// showBiHourly/showDaily: bật/tắt hiển thị từng đường để dễ so sánh biến thiên theo 2h và theo ngày
const ForecastLineChart = ({ data, kiHieu, height = "100%", showBiHourly = true, showDaily = true }) => {
    const maxSalinity = Math.max(
        RISK_THRESHOLD_HIGH,
        ...data.map((p) => Math.max(Number(p.salinity) || 0, Number(p.dailySalinity) || 0)),
    );
    const chartTop = maxSalinity + 1;

    // Màu 3 vùng rủi ro tính theo đúng ngưỡng phân loại của trạm hiện tại
    const bandLowColor = RISK_COLOR_MAP[getSingleStationClassification(0.5, kiHieu).class];
    const bandMidColor = RISK_COLOR_MAP[getSingleStationClassification(2, kiHieu).class];
    const bandHighColor =
        RISK_COLOR_MAP[getSingleStationClassification(RISK_THRESHOLD_HIGH + 1, kiHieu).class];

    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tickFormatter={formatAxisTick} minTickGap={30} />
                <YAxis unit=" ‰" domain={[0, chartTop]} />
                <Tooltip content={<CustomTooltip kiHieu={kiHieu} />} />

                <ReferenceArea y1={0} y2={RISK_THRESHOLD_LOW} fill={bandLowColor} fillOpacity={0.15} />
                <ReferenceArea
                    y1={RISK_THRESHOLD_LOW}
                    y2={RISK_THRESHOLD_HIGH}
                    fill={bandMidColor}
                    fillOpacity={0.15}
                />
                <ReferenceArea
                    y1={RISK_THRESHOLD_HIGH}
                    y2={chartTop}
                    fill={bandHighColor}
                    fillOpacity={0.15}
                />

                <ReferenceLine
                    y={RISK_THRESHOLD_LOW}
                    stroke={bandMidColor}
                    strokeDasharray="4 4"
                    label={{ value: `${RISK_THRESHOLD_LOW}‰`, position: "right", fontSize: 10 }}
                />
                <ReferenceLine
                    y={RISK_THRESHOLD_HIGH}
                    stroke={bandHighColor}
                    strokeDasharray="4 4"
                    label={{ value: `${RISK_THRESHOLD_HIGH}‰`, position: "right", fontSize: 10 }}
                />

                {showDaily && (
                    <Line
                        type="stepAfter"
                        dataKey="dailySalinity"
                        name="Dự báo theo ngày"
                        stroke="#8e44ad"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={false}
                        activeDot={{ r: 4 }}
                        connectNulls
                        isAnimationActive={false}
                    />
                )}
                {showBiHourly && (
                    <Line
                        type="monotone"
                        dataKey="salinity"
                        name="Dự báo theo 2h"
                        stroke="#0d6efd"
                        strokeWidth={2}
                        dot={buildRiskDotRenderer(kiHieu)}
                        activeDot={{ r: 5 }}
                        isAnimationActive={false}
                    />
                )}
            </LineChart>
        </ResponsiveContainer>
    );
};

export default ForecastLineChart;
