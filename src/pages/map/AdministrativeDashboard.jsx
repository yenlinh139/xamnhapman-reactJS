import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchAdministrativeSummary } from "@components/map/administrativeSummary";
import { IOT_STATION_FORECAST_MAP } from "@components/map/IoTMarkers";
import {
    fetchSalinityData,
    fetchForecastLatest,
    fetchHydrometData,
    fetchIoTData,
    normalizeIoTDataRows,
} from "@components/map/mapDataServices";
import { getSingleStationClassification, getRiskBadgeMeta } from "@common/salinityClassification";
import { RISK_COLOR_MAP } from "@pages/map/SalinityRiskLegend";
import { toVNDateKey, formatVNDate, formatVNDateTime, formatVNTickDateTime } from "@common/vnDateTime";
import {
    DATE_RANGE_PRESETS,
    addDaysToIsoDate,
    getPresetRangeByKey,
    findActivePresetKey,
} from "@common/dateRangePresets";
import { downloadChartImage } from "@common/downloadChartImage";
import LocalizedDateInput from "@components/common/LocalizedDateInput";
import "@styles/components/_hydrometChart.scss";

const SERIES_COLORS = [
    "#1f77b4",
    "#d62728",
    "#2ca02c",
    "#9467bd",
    "#ff7f0e",
    "#8c564b",
    "#17becf",
    "#e377c2",
];
const SERIES_SHAPES = ["circle", "square", "cross", "triangle", "diamond", "star"];
const MAX_POINTS_WITH_MARKERS = 150;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_5M_RANGE_DAYS = 7;

const TABS = [
    { key: "salinity", label: "Độ mặn" },
    { key: "water", label: "Mực nước" },
    { key: "rain", label: "Lượng mưa" },
];

const IOT_FREQUENCIES = [
    { key: "5m", label: "5 phút", groupBy: "none" },
    { key: "hour", label: "Giờ", groupBy: "hour" },
    { key: "day", label: "Ngày", groupBy: "day" },
];

const FORECAST_FREQUENCIES = [
    { key: "2gio", label: "2 giờ" },
    { key: "ngay", label: "Ngày" },
];

const toNumber = (value) => {
    if (value === null || value === undefined || value === "" || value === "NULL") return null;
    const numeric = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
    return Number.isFinite(numeric) ? numeric : null;
};

const formatNumber = (value, digits = 2) =>
    Number(value).toLocaleString("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const vnDayToMs = (dateKey) => new Date(`${dateKey}T00:00:00+07:00`).getTime();

// Mốc giờ IoT là giờ VN không kèm offset ("2026-11-12 23:00:00")
const parseVnTimestamp = (raw) => {
    if (!raw) return null;
    const text = String(raw).trim().replace(" ", "T");
    const hasOffset = /([+-]\d{2}(:?\d{2})?|Z)$/.test(text);
    const ms = new Date(hasOffset || text.length <= 10 ? text : `${text}+07:00`).getTime();
    return Number.isNaN(ms) ? null : ms;
};

// Cột "Ngày" của bảng khí tượng/thủy văn là text M/D/YYYY (đôi khi ISO)
const parseHydrometDateKey = (raw) => {
    if (!raw) return null;
    const text = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.length > 10 ? toVNDateKey(text) : text;

    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return null;
    let month = Number(match[1]);
    let day = Number(match[2]);
    if (month > 12) [month, day] = [day, month];
    return `${match[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const buildSeries = (stations) =>
    stations.map((station, index) => ({
        key: `s${index}`,
        code: station.code,
        name: station.name || station.code,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
        shape: SERIES_SHAPES[index % SERIES_SHAPES.length],
    }));

// pointsBySeries: [[{ t, value, max?, min? }], ...] cùng thứ tự với series -> rows gộp theo mốc thời gian,
// kèm xu thế so với mốc có số liệu liền trước của chính trạm đó
const mergeSeriesPoints = (series, pointsBySeries) => {
    const rowsByTime = new Map();
    series.forEach((item, index) => {
        (pointsBySeries[index] || []).forEach((point) => {
            if (point.t === null || point.value === null) return;
            if (!rowsByTime.has(point.t)) rowsByTime.set(point.t, { t: point.t });
            const row = rowsByTime.get(point.t);
            row[item.key] = point.value;
            if (point.max !== undefined) row[`${item.key}__max`] = point.max;
            if (point.min !== undefined) row[`${item.key}__min`] = point.min;
        });
    });

    const rows = [...rowsByTime.values()].sort((left, right) => left.t - right.t);
    const previous = {};
    rows.forEach((row) => {
        series.forEach(({ key }) => {
            if (row[key] === undefined) return;
            if (previous[key] !== undefined) row[`${key}__trend`] = row[key] - previous[key];
            previous[key] = row[key];
        });
    });
    return rows;
};

const loadManualSalinity = async (stations) => {
    const series = buildSeries(stations);
    const results = await Promise.all(stations.map((station) => fetchSalinityData(station.code)));
    const points = results.map((rows) =>
        rows.map((row) => ({ t: vnDayToMs(toVNDateKey(row.date)), value: toNumber(row.salinity) })),
    );
    return { default: { series, rows: mergeSeriesPoints(series, points) } };
};

const loadForecastSalinity = (group) => async (stations) => {
    const forecast = await fetchForecastLatest(group);
    const timeGrid = forecast?.timeGrid || [];
    const forecastByCode = new Map((forecast?.stations || []).map((item) => [item.manualCode, item]));
    // Trạm IoT tra theo forecastCode (station_code), điểm đo mặn tra theo chính mã của nó
    const forecastStations = stations.filter((station) =>
        forecastByCode.has(station.forecastCode || station.code),
    );
    const series = buildSeries(forecastStations);
    const forecastOf = (index) =>
        forecastByCode.get(forecastStations[index].forecastCode || forecastStations[index].code);

    const biHourly = series.map((_, seriesIndex) =>
        timeGrid.map((time, index) => ({
            t: new Date(time).getTime(),
            value: toNumber(forecastOf(seriesIndex).values?.[index]),
        })),
    );

    const daily = series.map((_, seriesIndex) => {
        const valueByDay = new Map();
        timeGrid.forEach((time, index) => {
            const dayKey = toVNDateKey(time);
            const value = toNumber(forecastOf(seriesIndex).dailyValues?.[index]);
            if (value !== null && !valueByDay.has(dayKey)) valueByDay.set(dayKey, value);
        });
        return [...valueByDay.entries()].map(([dayKey, value]) => ({ t: vnDayToMs(dayKey), value }));
    });

    return {
        "2gio": { series, rows: mergeSeriesPoints(series, biHourly) },
        ngay: { series, rows: mergeSeriesPoints(series, daily) },
        note: forecast?.issuedAt ? `Phát hành lúc: ${formatVNDateTime(forecast.issuedAt)}` : "",
    };
};

const loadHydromet = (kind) => async (stations) => {
    const series = buildSeries(stations);
    const results = await Promise.all(
        stations.map((station) => fetchHydrometData(station.code, { limit: 20000, orderBy: "ASC" })),
    );

    const points = results.map((result) =>
        (result?.data || []).map((row) => {
            const dayKey = parseHydrometDateKey(row["Ngày"]);
            const keys = Object.keys(row);
            const pick = (prefix) => {
                const column = keys.find((key) => key.startsWith(prefix));
                return column ? toNumber(row[column]) : null;
            };
            const t = dayKey ? vnDayToMs(dayKey) : null;
            return kind === "rain"
                ? { t, value: pick("R_") }
                : { t, value: pick("Htb_"), max: pick("Hx_"), min: pick("Hm_") };
        }),
    );
    return { default: { series, rows: mergeSeriesPoints(series, points) } };
};

const ShapeIcon = ({ shape, cx, cy, color, size = 4.5 }) => {
    const common = { fill: color, stroke: "#fff", strokeWidth: 1 };
    switch (shape) {
        case "square":
            return <rect x={cx - size} y={cy - size} width={size * 2} height={size * 2} {...common} />;
        case "triangle":
            return (
                <polygon
                    points={`${cx},${cy - size * 1.2} ${cx + size * 1.15},${cy + size} ${cx - size * 1.15},${cy + size}`}
                    {...common}
                />
            );
        case "diamond":
            return (
                <polygon
                    points={`${cx},${cy - size * 1.3} ${cx + size * 1.3},${cy} ${cx},${cy + size * 1.3} ${cx - size * 1.3},${cy}`}
                    {...common}
                />
            );
        case "cross":
            return (
                <g stroke={color} strokeWidth={2.2} strokeLinecap="round">
                    <line x1={cx - size} y1={cy - size} x2={cx + size} y2={cy + size} />
                    <line x1={cx - size} y1={cy + size} x2={cx + size} y2={cy - size} />
                </g>
            );
        case "star": {
            const points = Array.from({ length: 10 }, (_, index) => {
                const radius = index % 2 === 0 ? size * 1.5 : size * 0.65;
                const angle = (Math.PI / 5) * index - Math.PI / 2;
                return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
            }).join(" ");
            return <polygon points={points} {...common} />;
        }
        default:
            return <circle cx={cx} cy={cy} r={size} {...common} />;
    }
};

const LegendMarker = ({ series }) => (
    <svg width="26" height="14" aria-hidden="true">
        <line x1="0" y1="7" x2="26" y2="7" stroke={series.color} strokeWidth="2" />
        <ShapeIcon shape={series.shape} cx={13} cy={7} color={series.color} size={4} />
    </svg>
);

const describeTrend = (delta, unit) => {
    if (delta === undefined || delta === null) return null;
    const rounded = Math.round(delta * 100) / 100;
    if (rounded === 0) return { text: "■ không đổi", direction: "flat" };
    return {
        text: `${rounded > 0 ? "▲ tăng" : "▼ giảm"} ${formatNumber(Math.abs(rounded))} ${unit}`.trim(),
        direction: rounded > 0 ? "up" : "down",
    };
};

const TREND_COLORS = { up: "#dc3545", down: "#198754", flat: "#6c757d" };

const formatTime = (t, mode) => (mode === "date" ? formatVNDate(t) : formatVNDateTime(t));

const ChartTooltip = ({ active, payload, series, unit, mode, showRisk }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;

    return (
        <div className="bg-white border p-2 rounded shadow-sm small" style={{ maxWidth: 380 }}>
            <div className="fw-semibold mb-1">
                {mode === "date" ? "Ngày" : "Giờ"}: {formatTime(row.t, mode)}
            </div>
            {series.map((item) => {
                const value = row[item.key];
                if (value === undefined) return null;
                const trend = describeTrend(row[`${item.key}__trend`], unit);
                const max = row[`${item.key}__max`];
                const min = row[`${item.key}__min`];
                const risk = showRisk ? getRiskBadgeMeta(value, item.code) : null;

                return (
                    <div key={item.key} className="d-flex align-items-start gap-1 mb-1">
                        <span className="flex-shrink-0">
                            <LegendMarker series={item} />
                        </span>
                        <span>
                            {item.name}:{" "}
                            <strong>
                                {formatNumber(value)} {unit}
                            </strong>
                            {max !== undefined && max !== null && min !== undefined && min !== null && (
                                <span className="text-muted">
                                    {" "}
                                    (max {formatNumber(max)}, min {formatNumber(min)})
                                </span>
                            )}
                            {trend && (
                                <span style={{ color: showRisk ? TREND_COLORS[trend.direction] : "#495057" }}>
                                    {" "}
                                    · {trend.text}
                                </span>
                            )}
                            {risk && (
                                <span
                                    className="ms-1 px-1 rounded"
                                    style={{ color: risk.textColor, backgroundColor: risk.backgroundColor }}
                                >
                                    {risk.description}
                                </span>
                            )}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

const RiskLegend = () => (
    <div className="risk-legend-row d-flex flex-wrap justify-content-center align-items-center gap-3 small mb-1">
        {[
            { color: RISK_COLOR_MAP.normal, label: "Bình thường (độ mặn < 1‰)" },
            { color: RISK_COLOR_MAP.warning, label: "Rủi ro cấp 1 (độ mặn tại Nhà Bè từ 1–4‰)" },
            {
                color: RISK_COLOR_MAP["high-warning"],
                label: "Rủi ro cấp 2 (độ mặn tại Nhà Bè > 4‰, các trạm khác từ 1–4‰)",
            },
            { color: RISK_COLOR_MAP.critical, label: "Rủi ro cấp 3 (các trạm khác > 4‰)" },
        ].map((item) => (
            <span key={item.label} className="d-inline-flex align-items-center gap-1">
                <span
                    style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        backgroundColor: item.color,
                        display: "inline-block",
                    }}
                />
                <span className="text-muted">{item.label}</span>
            </span>
        ))}
    </div>
);

const downloadCsv = ({ series, rows, unit, mode, showRisk, filename }) => {
    const header = ["Thời gian"];
    series.forEach((item) => {
        header.push(`${item.name} (${unit})`, `Xu thế ${item.name} (${unit})`);
        if (showRisk) header.push(`Cấp rủi ro ${item.name}`);
    });

    const lines = rows.map((row) => {
        const cells = [formatTime(row.t, mode)];
        series.forEach((item) => {
            const value = row[item.key];
            const trend = row[`${item.key}__trend`];
            cells.push(
                value === undefined ? "" : value,
                trend === undefined ? "" : Math.round(trend * 1000) / 1000,
            );
            if (showRisk) {
                cells.push(
                    value === undefined ? "" : getSingleStationClassification(value, item.code).shortText,
                );
            }
        });
        return cells;
    });

    const csv = [header, ...lines]
        .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\r\n");
    const url = URL.createObjectURL(
        new Blob([String.fromCharCode(0xfeff) + csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const SeriesChartPanel = ({
    chartId,
    title,
    unitName,
    series,
    rows,
    unit,
    mode,
    showRisk,
    controls,
    loading,
    error,
    emptyText,
    note,
    fileBase,
    range,
}) => {
    const isLoggedIn = Boolean(localStorage.getItem("access_token"));
    const showMarkers = rows.length <= MAX_POINTS_WITH_MARKERS;
    const hasData = rows.length > 0 && series.length > 0;
    const loginTitle = isLoggedIn ? "" : "Bạn cần đăng nhập để tải xuống";

    const handleDownloadImage = async () => {
        try {
            await downloadChartImage({
                title: `${title} - ${unitName}`,
                subtitleHtml:
                    range?.startDate && range?.endDate
                        ? `Từ <strong>${formatVNDate(vnDayToMs(range.startDate))}</strong> đến <strong>${formatVNDate(vnDayToMs(range.endDate))}</strong>`
                        : "",
                chartElementId: chartId,
                filename: `${fileBase}_${Date.now()}.png`,
            });
        } catch (downloadError) {
            console.error("Tải ảnh biểu đồ lỗi:", downloadError);
            alert("Không thể tải ảnh biểu đồ.");
        }
    };

    return (
        <div className="border rounded p-2 mb-3 bg-white">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <h6 className="mb-0 fw-bold me-auto">{title}</h6>
                {controls}
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                    </div>
                </div>
            ) : error ? (
                <p className="text-muted py-4 text-center mb-0">{error}</p>
            ) : !hasData ? (
                <p className="text-muted py-4 text-center mb-0">{emptyText}</p>
            ) : (
                <>
                    <div id={chartId} style={{ background: "#fff" }}>
                        <div className="d-flex flex-wrap justify-content-center gap-3 small mb-1">
                            {series.map((item) => (
                                <span key={item.key} className="d-inline-flex align-items-center gap-1">
                                    <LegendMarker series={item} />
                                    {item.name}
                                </span>
                            ))}
                        </div>
                        <div style={{ width: "100%", height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={rows} margin={{ top: 8, right: 24, left: 0, bottom: 4 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                                    <XAxis
                                        dataKey="t"
                                        type="number"
                                        scale="time"
                                        domain={["dataMin", "dataMax"]}
                                        tickFormatter={(t) =>
                                            mode === "date" ? formatVNDate(t) : formatVNTickDateTime(t)
                                        }
                                        tick={{ fontSize: 11 }}
                                        minTickGap={40}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11 }}
                                        width={62}
                                        tickFormatter={(value) => Number(value).toLocaleString("vi-VN")}
                                        label={{
                                            value: unit,
                                            angle: -90,
                                            position: "insideLeft",
                                            style: { fontSize: 11, fill: "#6c757d" },
                                        }}
                                    />
                                    <Tooltip
                                        content={
                                            <ChartTooltip
                                                series={series}
                                                unit={unit}
                                                mode={mode}
                                                showRisk={showRisk}
                                            />
                                        }
                                    />
                                    {series.map((item) => (
                                        <Line
                                            key={item.key}
                                            dataKey={item.key}
                                            name={item.name}
                                            stroke={item.color}
                                            strokeWidth={1.8}
                                            connectNulls
                                            isAnimationActive={false}
                                            dot={
                                                showMarkers
                                                    ? ({ cx, cy, value, index }) =>
                                                          value === undefined ||
                                                          value === null ||
                                                          cx == null ? (
                                                              <g key={`${item.key}-${index}`} />
                                                          ) : (
                                                              <ShapeIcon
                                                                  key={`${item.key}-${index}`}
                                                                  shape={item.shape}
                                                                  cx={cx}
                                                                  cy={cy}
                                                                  color={item.color}
                                                              />
                                                          )
                                                    : false
                                            }
                                            activeDot={({ cx, cy, index }) => (
                                                <ShapeIcon
                                                    key={`${item.key}-active-${index}`}
                                                    shape={item.shape}
                                                    cx={cx}
                                                    cy={cy}
                                                    color={item.color}
                                                    size={6}
                                                />
                                            )}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-1">
                        <div className="text-muted small">
                            Hiển thị <strong>{rows.length}</strong> bản ghi{note ? `. ${note}` : ""}
                        </div>
                        <div className="d-flex gap-2">
                            <button
                                className={`btn btn-sm ${isLoggedIn ? "btn-outline-primary" : "btn-outline-secondary"}`}
                                onClick={handleDownloadImage}
                                disabled={!isLoggedIn}
                                title={loginTitle}
                            >
                                Tải ảnh
                            </button>
                            <button
                                className={`btn btn-sm ${isLoggedIn ? "btn-outline-success" : "btn-outline-secondary"}`}
                                onClick={() =>
                                    downloadCsv({
                                        series,
                                        rows,
                                        unit,
                                        mode,
                                        showRisk,
                                        filename: `${fileBase}_${Date.now()}.csv`,
                                    })
                                }
                                disabled={!isLoggedIn}
                                title={loginTitle}
                            >
                                Tải CSV
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const FrequencySelect = ({ options, value, onChange }) => (
    <>
        <span className="small text-muted fw-semibold">Tần suất:</span>
        <select
            className="form-select form-select-sm"
            style={{ width: 100, minWidth: 100 }}
            value={value}
            onChange={(event) => onChange(event.target.value)}
        >
            {options.map((option) => (
                <option key={option.key} value={option.key}>
                    {option.label}
                </option>
            ))}
        </select>
    </>
);

const RangeControls = ({ range, bounds, presets, onChange }) => (
    <>
        <span className="small text-muted fw-semibold">Giai đoạn:</span>
        <LocalizedDateInput
            className="form-control form-control-sm"
            name="startDate"
            value={range.startDate}
            onChange={(event) => onChange({ ...range, startDate: event.target.value })}
            min={bounds.startDate}
            max={range.endDate || bounds.endDate}
            style={{ width: 130, minWidth: 130 }}
        />
        <span className="small text-muted">-</span>
        <LocalizedDateInput
            className="form-control form-control-sm"
            name="endDate"
            value={range.endDate}
            onChange={(event) => onChange({ ...range, endDate: event.target.value })}
            min={range.startDate || bounds.startDate}
            max={bounds.endDate}
            style={{ width: 130, minWidth: 130 }}
        />
        <select
            className="form-select form-select-sm"
            style={{ width: 110, minWidth: 110 }}
            value={findActivePresetKey(range.startDate, range.endDate, bounds)}
            onChange={(event) => {
                const next = getPresetRangeByKey(event.target.value, bounds);
                if (next) onChange(next);
            }}
        >
            <option value="" disabled>
                Chọn nhanh...
            </option>
            {presets.map((preset) => (
                <option key={preset.key} value={preset.key}>
                    {preset.label}
                </option>
            ))}
        </select>
    </>
);

// Chuỗi số liệu tải 1 lần (điểm đo thủ công, trạm KTTV, dự báo) rồi lọc giai đoạn ở client
const StationSeriesPanel = ({
    chartId,
    title,
    unitName,
    stations,
    load,
    frequencyOptions,
    defaultPresetKey,
    unit,
    showRisk,
    fileBase,
}) => {
    const [state, setState] = useState({ loading: true, error: "", dataset: null });
    const [frequency, setFrequency] = useState(frequencyOptions?.[0]?.key || "default");
    const [range, setRange] = useState({ startDate: "", endDate: "" });

    useEffect(() => {
        let cancelled = false;
        setState({ loading: true, error: "", dataset: null });
        load(stations)
            .then((dataset) => {
                if (!cancelled) setState({ loading: false, error: "", dataset });
            })
            .catch((error) => {
                console.error(`Lỗi tải dữ liệu "${title}":`, error);
                if (!cancelled) setState({ loading: false, error: "Không tải được dữ liệu.", dataset: null });
            });
        return () => {
            cancelled = true;
        };
    }, [stations, load, title]);

    const selected = useMemo(
        () => state.dataset?.[frequency] || { series: [], rows: [] },
        [state.dataset, frequency],
    );
    const bounds = useMemo(() => {
        const { rows } = selected;
        if (rows.length === 0) return { startDate: "", endDate: "" };
        return { startDate: toVNDateKey(rows[0].t), endDate: toVNDateKey(rows[rows.length - 1].t) };
    }, [selected]);

    useEffect(() => {
        if (bounds.endDate) setRange(getPresetRangeByKey(defaultPresetKey, bounds));
    }, [bounds, defaultPresetKey]);

    const visibleRows = useMemo(() => {
        if (!range.startDate || !range.endDate) return selected.rows;
        const from = vnDayToMs(range.startDate);
        const to = vnDayToMs(range.endDate) + DAY_MS;
        return selected.rows.filter((row) => row.t >= from && row.t < to);
    }, [selected, range]);

    const isDaily = frequency !== "2gio";

    return (
        <SeriesChartPanel
            chartId={chartId}
            title={title}
            unitName={unitName}
            series={selected.series}
            rows={visibleRows}
            unit={unit}
            mode={isDaily ? "date" : "datetime"}
            showRisk={showRisk}
            loading={state.loading}
            error={state.error}
            emptyText={
                selected.rows.length > 0 ? "Không có số liệu trong giai đoạn đã chọn." : "Chưa có số liệu."
            }
            note={state.dataset?.note}
            fileBase={fileBase}
            range={range}
            controls={
                selected.rows.length > 0 && (
                    <>
                        {frequencyOptions && (
                            <FrequencySelect
                                options={frequencyOptions}
                                value={frequency}
                                onChange={setFrequency}
                            />
                        )}
                        <RangeControls
                            range={range}
                            bounds={bounds}
                            presets={DATE_RANGE_PRESETS}
                            onChange={setRange}
                        />
                    </>
                )
            }
        />
    );
};

const IOT_PRESETS = DATE_RANGE_PRESETS.filter((preset) => preset.days !== null);

const clampIotRange = (range, frequency) => {
    if (frequency !== "5m" || !range.startDate || !range.endDate) return range;
    const earliest = addDaysToIsoDate(range.endDate, -(MAX_5M_RANGE_DAYS - 1));
    return range.startDate < earliest ? { ...range, startDate: earliest } : range;
};

// Trạm IoT: tải lại từ máy chủ theo tần suất + giai đoạn đang chọn
const IotSeriesPanel = ({
    chartId,
    title,
    unitName,
    stations,
    field,
    unitField,
    unit,
    showRisk,
    fileBase,
}) => {
    const today = toVNDateKey(new Date());
    const bounds = useMemo(() => ({ startDate: "", endDate: today }), [today]);
    const [frequency, setFrequency] = useState("hour");
    const [range, setRange] = useState({ startDate: addDaysToIsoDate(today, -6), endDate: today });
    const [state, setState] = useState({ loading: true, error: "", series: [], rows: [], unit });

    useEffect(() => {
        if (!range.startDate || !range.endDate) return undefined;
        let cancelled = false;
        const series = buildSeries(
            stations.map((station) => ({ ...station, code: null, serial: station.code })),
        );
        const groupBy = IOT_FREQUENCIES.find((item) => item.key === frequency).groupBy;

        setState((previous) => ({ ...previous, loading: true, error: "" }));
        Promise.all(
            stations.map((station) =>
                fetchIoTData(station.code, { startDate: range.startDate, endDate: range.endDate, groupBy }),
            ),
        )
            .then((responses) => {
                if (cancelled) return;
                let detectedUnit = null;
                const points = responses.map((response) =>
                    normalizeIoTDataRows(response?.data).map((row) => {
                        if (unitField && !detectedUnit && row[unitField]) detectedUnit = row[unitField];
                        return {
                            t:
                                frequency === "day"
                                    ? vnDayToMs(toVNDateKey(row.Date))
                                    : parseVnTimestamp(row.Date),
                            value: toNumber(row[field]),
                        };
                    }),
                );
                setState({
                    loading: false,
                    error: "",
                    series,
                    rows: mergeSeriesPoints(series, points),
                    unit: detectedUnit || unit,
                });
            })
            .catch((error) => {
                console.error(`Lỗi tải dữ liệu IoT "${title}":`, error);
                if (!cancelled) {
                    setState({
                        loading: false,
                        error: "Không tải được dữ liệu IoT.",
                        series: [],
                        rows: [],
                        unit,
                    });
                }
            });

        return () => {
            cancelled = true;
        };
    }, [stations, field, unitField, unit, frequency, range, title]);

    return (
        <SeriesChartPanel
            chartId={chartId}
            title={title}
            unitName={unitName}
            series={state.series}
            rows={state.rows}
            unit={state.unit}
            mode={frequency === "day" ? "date" : "datetime"}
            showRisk={showRisk}
            loading={state.loading}
            error={state.error}
            emptyText="Không có số liệu trong giai đoạn đã chọn."
            note={frequency === "5m" ? `Tần suất 5 phút xem tối đa ${MAX_5M_RANGE_DAYS} ngày` : ""}
            fileBase={fileBase}
            range={range}
            controls={
                <>
                    <FrequencySelect
                        options={IOT_FREQUENCIES}
                        value={frequency}
                        onChange={(next) => {
                            setFrequency(next);
                            setRange((current) => clampIotRange(current, next));
                        }}
                    />
                    <RangeControls
                        range={range}
                        bounds={bounds}
                        presets={IOT_PRESETS}
                        onChange={(next) => setRange(clampIotRange(next, frequency))}
                    />
                </>
            }
        />
    );
};

const EmptyTab = ({ text }) => <p className="text-muted text-center py-5 mb-0">{text}</p>;

const loadPointForecast = loadForecastSalinity();
const loadIotForecast = loadForecastSalinity("iot");
const loadRainSeries = loadHydromet("rain");
const loadWaterSeries = loadHydromet("water");

const AdministrativeDashboard = ({ show, level, code, onClose }) => {
    const [summaryState, setSummaryState] = useState({ loading: true, error: "", summary: null });
    const [activeTab, setActiveTab] = useState("salinity");
    const [salinityMode, setSalinityMode] = useState("observed");

    useEffect(() => {
        if (!show || !level || !code) return undefined;
        let cancelled = false;
        setSummaryState({ loading: true, error: "", summary: null });
        fetchAdministrativeSummary(level, code)
            .then((summary) => {
                if (!cancelled) setSummaryState({ loading: false, error: "", summary });
            })
            .catch((error) => {
                console.error("Lỗi tải thông tin đơn vị hành chính:", error);
                if (!cancelled) {
                    setSummaryState({ loading: false, error: "Không tải được dữ liệu.", summary: null });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [show, level, code]);

    const { summary } = summaryState;
    const stations = summary?.stations;
    const rainStations = useMemo(
        () => (stations ? [...stations.rain, ...stations.meteorology] : []),
        [stations],
    );

    // Dự báo IoT là chuỗi riêng của từng trạm, cùng mapping với trang chi tiết trạm IoT
    const iotForecastStations = useMemo(
        () =>
            (stations?.iot || [])
                .filter((station) => IOT_STATION_FORECAST_MAP[station.stationCode])
                .map((station) => ({
                    ...station,
                    forecastCode: IOT_STATION_FORECAST_MAP[station.stationCode],
                })),
        [stations],
    );

    if (!show) return null;

    const unitName = summary?.unit?.name || "";
    const fileKey = `${level}_${code}`;
    const panelProps = { unitName };

    const renderSalinityTab = () => {
        const hasPoints = stations.salinity.length > 0;
        const hasIot = stations.iot.length > 0;
        if (!hasPoints && !hasIot) return <EmptyTab text="Không có điểm đo mặn, trạm IoT trong địa bàn." />;

        return (
            <>
                <div className="d-flex flex-wrap align-items-center gap-3 mb-2">
                    <ul className="nav nav-pills nav-sm mb-0">
                        {[
                            { key: "observed", label: "Quan trắc" },
                            { key: "forecast", label: "Dự báo" },
                        ].map((item) => (
                            <li className="nav-item" key={item.key}>
                                <button
                                    type="button"
                                    className={`nav-link ${salinityMode === item.key ? "active" : ""}`}
                                    onClick={() => setSalinityMode(item.key)}
                                >
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="ms-auto">
                        <RiskLegend />
                    </div>
                </div>

                {salinityMode === "observed" ? (
                    <>
                        {hasPoints && (
                            <StationSeriesPanel
                                {...panelProps}
                                key="salinity-observed-points"
                                chartId="admin-salinity-observed-points"
                                title="Độ mặn quan trắc - các điểm đo mặn"
                                stations={stations.salinity}
                                load={loadManualSalinity}
                                defaultPresetKey="90d"
                                unit="‰"
                                showRisk
                                fileBase={`do_man_quan_trac_diem_do_${fileKey}`}
                            />
                        )}
                        {hasIot && (
                            <IotSeriesPanel
                                {...panelProps}
                                key="salinity-observed-iot"
                                chartId="admin-salinity-observed-iot"
                                title="Độ mặn quan trắc - các trạm IoT"
                                stations={stations.iot}
                                field="salt_value"
                                unit="‰"
                                showRisk
                                fileBase={`do_man_quan_trac_iot_${fileKey}`}
                            />
                        )}
                    </>
                ) : (
                    <>
                        {hasPoints && (
                            <StationSeriesPanel
                                {...panelProps}
                                key="salinity-forecast-points"
                                chartId="admin-salinity-forecast-points"
                                title="Độ mặn dự báo - các điểm đo mặn"
                                stations={stations.salinity}
                                load={loadPointForecast}
                                frequencyOptions={FORECAST_FREQUENCIES}
                                defaultPresetKey="all"
                                unit="‰"
                                showRisk
                                fileBase={`do_man_du_bao_diem_do_${fileKey}`}
                            />
                        )}
                        {iotForecastStations.length > 0 && (
                            <StationSeriesPanel
                                {...panelProps}
                                key="salinity-forecast-iot"
                                chartId="admin-salinity-forecast-iot"
                                title="Độ mặn dự báo - các trạm IoT"
                                stations={iotForecastStations}
                                load={loadIotForecast}
                                frequencyOptions={FORECAST_FREQUENCIES}
                                defaultPresetKey="all"
                                unit="‰"
                                showRisk
                                fileBase={`do_man_du_bao_iot_${fileKey}`}
                            />
                        )}
                        {hasIot && iotForecastStations.length < stations.iot.length && (
                            <p className="text-muted small">
                                Chưa có dự báo cho trạm IoT:{" "}
                                {stations.iot
                                    .filter((station) => !IOT_STATION_FORECAST_MAP[station.stationCode])
                                    .map((station) => station.name)
                                    .join(", ")}
                                .
                            </p>
                        )}
                    </>
                )}
            </>
        );
    };

    const renderWaterTab = () => {
        if (stations.hydrology.length === 0 && stations.iot.length === 0) {
            return <EmptyTab text="Không có trạm thủy văn, trạm IoT trong địa bàn." />;
        }
        return (
            <>
                {stations.hydrology.length > 0 && (
                    <StationSeriesPanel
                        {...panelProps}
                        chartId="admin-water-stations"
                        title="Mực nước - các trạm thủy văn"
                        stations={stations.hydrology}
                        load={loadWaterSeries}
                        defaultPresetKey="30d"
                        unit="cm"
                        fileBase={`muc_nuoc_tram_thuy_van_${fileKey}`}
                    />
                )}
                {stations.iot.length > 0 && (
                    <IotSeriesPanel
                        {...panelProps}
                        chartId="admin-water-iot"
                        title="Mực nước - các trạm IoT"
                        stations={stations.iot}
                        field="distance_value"
                        unitField="distance_unit"
                        unit="m"
                        fileBase={`muc_nuoc_iot_${fileKey}`}
                    />
                )}
            </>
        );
    };

    const renderRainTab = () => {
        if (rainStations.length === 0 && stations.iot.length === 0) {
            return <EmptyTab text="Không có điểm đo mưa, trạm khí tượng, trạm IoT trong địa bàn." />;
        }
        return (
            <>
                {rainStations.length > 0 && (
                    <StationSeriesPanel
                        {...panelProps}
                        chartId="admin-rain-stations"
                        title="Lượng mưa - các điểm đo mưa, trạm khí tượng"
                        stations={rainStations}
                        load={loadRainSeries}
                        defaultPresetKey="30d"
                        unit="mm"
                        fileBase={`luong_mua_diem_do_${fileKey}`}
                    />
                )}
                {stations.iot.length > 0 && (
                    <IotSeriesPanel
                        {...panelProps}
                        chartId="admin-rain-iot"
                        title="Lượng mưa - các trạm IoT"
                        stations={stations.iot}
                        field="daily_rainfall_value"
                        unit="mm"
                        fileBase={`luong_mua_iot_${fileKey}`}
                    />
                )}
            </>
        );
    };

    return (
        <div
            className="modal fade map-data-modal show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
            <div
                className="modal-dialog modal-xl modal-dialog-centered"
                style={{ maxWidth: "95%", width: "95%", height: "90vh" }}
            >
                <div className="modal-content" style={{ height: "100%", width: "100%" }}>
                    <div className="modal-header border-0 pb-0">
                        <div className="w-100 text-center">
                            <h5 className="modal-title mb-1 fw-bold">
                                Dữ liệu chi tiết{unitName ? ` - ${unitName}` : ""}
                            </h5>
                            {stations && (
                                <div className="text-muted small">
                                    {stations.total} trạm đo trong địa bàn: {stations.salinity.length} điểm đo
                                    mặn, {stations.rain.length} điểm đo mưa, {stations.meteorology.length}{" "}
                                    trạm khí tượng, {stations.hydrology.length} trạm thủy văn,{" "}
                                    {stations.iot.length} trạm IoT
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="btn-close position-absolute end-0 top-0 m-3"
                            onClick={onClose}
                        ></button>
                    </div>

                    <div className="modal-body d-flex flex-column" style={{ minHeight: 0 }}>
                        <ul className="nav nav-tabs mb-2" role="tablist">
                            {TABS.map((tab) => (
                                <li className="nav-item" key={tab.key}>
                                    <button
                                        type="button"
                                        className={`nav-link ${activeTab === tab.key ? "active" : ""}`}
                                        onClick={() => setActiveTab(tab.key)}
                                    >
                                        {tab.label}
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                            {summaryState.loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Đang tải...</span>
                                    </div>
                                </div>
                            ) : summaryState.error ? (
                                <EmptyTab text={summaryState.error} />
                            ) : activeTab === "salinity" ? (
                                renderSalinityTab()
                            ) : activeTab === "water" ? (
                                renderWaterTab()
                            ) : (
                                renderRainTab()
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdministrativeDashboard;
