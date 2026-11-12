import React, { useEffect, useMemo, useState } from "react";
import { downloadChartImage } from "@common/downloadChartImage";
import * as XLSX from "xlsx";
import IoTBarChart from "./IoTBarChart";
import ForecastBarChart from "./ForecastBarChart";
import ForecastDataTable from "./ForecastDataTable";
import SalinityRiskLegend from "./SalinityRiskLegend";
import {
    fetchIoTData,
    fetchIoTStations,
    normalizeIoTDataRows,
    fetchForecastLatest,
} from "@components/map/mapDataServices";
import { getRiskBadgeMeta, getSingleStationClassification } from "@common/salinityClassification";
import { IOT_STATION_FORECAST_MAP } from "@components/map/IoTMarkers";
import LocalizedDateInput from "@components/common/LocalizedDateInput";
import { toVNDateKey, formatVNDate, formatVNTickDateTime } from "@common/vnDateTime";
import "@styles/components/_hydrometChart.scss";

const EMPTY_DATA = [];

const parseNumber = (value) => {
    if (value === null || value === undefined || value === "" || value === "NULL") {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    const raw = String(value).trim();
    if (!raw) return null;

    // Keep backend dot-decimal values intact; only normalize optional comma input.
    const normalized = raw.includes(".") ? raw.replace(/,/g, "") : raw.replace(",", ".");

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const formatNumberVi = (value, fractionDigits = 2) => {
    const parsed = parseNumber(value);
    if (parsed === null) return "-";

    return parsed.toLocaleString("vi-VN", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });
};

const getIoTRowTime = (row) => row?.Date || row?.date_time || null;

const toInputDateValue = (rawValue) => {
    if (!rawValue) return "";

    const raw = String(rawValue).trim();
    if (!raw) return "";

    // Support Vietnamese dates like 17/12/2025 or 17/12/2025 08:30.
    const vnDateMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (vnDateMatch) {
        const [, dd, mm, yyyy] = vnDateMatch;
        const day = Number(dd);
        const month = Number(mm);
        const year = Number(yyyy);
        const parsedVn = new Date(year, month - 1, day);

        if (
            !Number.isNaN(parsedVn.getTime()) &&
            parsedVn.getDate() === day &&
            parsedVn.getMonth() + 1 === month &&
            parsedVn.getFullYear() === year
        ) {
            return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        }
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        return raw.slice(0, 10);
    }

    return toVNDateKey(raw);
};

const toDisplayDateTime = (rawValue, groupBy = "none") => {
    if (!rawValue) return "-";
    if (Number.isNaN(new Date(rawValue).getTime())) {
        return String(rawValue);
    }

    return groupBy === "date" ? formatVNDate(rawValue) : formatVNTickDateTime(rawValue);
};

const getRangeFromRows = (rows) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (safeRows.length === 0) {
        return { startDate: "", endDate: "" };
    }

    const firstDate = toInputDateValue(getIoTRowTime(safeRows[0]));
    const lastDate = toInputDateValue(getIoTRowTime(safeRows[safeRows.length - 1]));

    return {
        startDate: firstDate,
        endDate: lastDate,
    };
};

// Giai đoạn chọn sẵn cho Quan trắc IoT - mặc định 7 ngày (gần mốc dữ liệu mới nhất, không phải
// "hôm nay", vì trạm có thể đã ngừng gửi dữ liệu trước đó - xem dateBounds bên dưới).
const IOT_RANGE_PRESETS = [
    { key: "7d", label: "7 ngày", days: 7 },
    { key: "30d", label: "30 ngày", days: 30 },
    { key: "90d", label: "90 ngày", days: 90 },
    { key: "all", label: "Toàn bộ", days: null },
];

const addDaysToIsoDate = (isoDate, days) => {
    const [y, m, d] = isoDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// bounds = { startDate, endDate } (ISO, từ dateBounds) - "neo" theo endDate thật của chuỗi số
// liệu, không phải ngày hệ thống hôm nay.
const getPresetRange = (preset, bounds) => {
    if (!preset || !bounds?.endDate) return null;
    if (preset.days === null) {
        return { startDate: bounds.startDate || "", endDate: bounds.endDate };
    }

    const computedStart = addDaysToIsoDate(bounds.endDate, -(preset.days - 1));
    const startDate = bounds.startDate && computedStart < bounds.startDate ? bounds.startDate : computedStart;
    return { startDate, endDate: bounds.endDate };
};

const filterRowsByDateRange = (rows, startDate, endDate) => {
    if (!startDate && !endDate) return rows;
    return rows.filter((row) => {
        const key = toInputDateValue(getIoTRowTime(row));
        if (!key) return false;
        if (startDate && key < startDate) return false;
        if (endDate && key > endDate) return false;
        return true;
    });
};

const getTodayIso = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// IoT stationCode có hậu tố "_IoT" (vd "CKC_IoT") - cần bỏ đi để khớp đúng ngưỡng phân cấp rủi ro
// theo mã trạm độ mặn gốc (vd ngưỡng riêng của MNB) trong getRiskBadgeMeta/getSingleStationClassification.
const getIoTSalinityRiskMeta = (value, stationCode = "") => {
    const baseCode = String(stationCode || "")
        .replace(/_IoT$/i, "")
        .replace(/_iot$/i, "");
    return getRiskBadgeMeta(value, baseCode);
};

const IoTQueryControls = ({ queryOptions, onChange, onPresetSelect, minDate, maxDate, compact = false }) => {
    const bounds = { startDate: minDate, endDate: maxDate };

    return (
        <div
            className={`d-flex flex-wrap align-items-center gap-2 ${compact ? "mb-0" : "mb-2"}`}
            style={{ flexShrink: 0, rowGap: 6 }}
        >
            {/* Tần số - đưa lên trước */}
            <div className="d-flex align-items-center gap-2">
                <label className="form-label fw-semibold small mb-0 text-nowrap">Tần suất:</label>

                <select
                    className="form-select form-select-sm"
                    name="groupBy"
                    value={queryOptions.groupBy}
                    onChange={onChange}
                    style={{ minWidth: 112 }}
                >
                    <option value="none">5 phút</option>
                    <option value="date">Ngày</option>
                    <option value="hour">Giờ</option>
                </select>
            </div>

            {/* Giai đoạn */}
            <div className="d-flex align-items-center gap-2 flex-wrap">
                <label className="form-label fw-semibold small mb-0 text-nowrap">Giai đoạn:</label>

                <div className="btn-group btn-group-sm" role="group">
                    {IOT_RANGE_PRESETS.map((preset) => {
                        const presetRange = getPresetRange(preset, bounds);
                        const isActive =
                            presetRange &&
                            presetRange.startDate === queryOptions.startDate &&
                            presetRange.endDate === queryOptions.endDate;

                        return (
                            <button
                                key={preset.key}
                                type="button"
                                className={`btn ${isActive ? "btn-primary" : "btn-outline-primary"}`}
                                onClick={() => onPresetSelect(preset.key)}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </div>

                <LocalizedDateInput
                    className="form-control form-control-sm"
                    name="startDate"
                    value={queryOptions.startDate}
                    onChange={onChange}
                    min={minDate || undefined}
                    max={maxDate || undefined}
                    style={{ minWidth: 148 }}
                />

                <span className="text-muted">-</span>

                <LocalizedDateInput
                    className="form-control form-control-sm"
                    name="endDate"
                    value={queryOptions.endDate}
                    onChange={onChange}
                    min={queryOptions.startDate || minDate || undefined}
                    max={maxDate || undefined}
                    style={{ minWidth: 148 }}
                />
            </div>
        </div>
    );
};

// Component bảng số liệu IoT với 4 cột cảm biến
const IoTExportPreviewTable = ({ data, groupBy = "none", stationCode = "" }) => {
    const safeData = Array.isArray(data) ? data : [];
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    const getValueBySortKey = (row, key) => {
        if (key === "time") return getIoTRowTime(row);
        return row?.[key];
    };

    const rows = useMemo(() => {
        const effectiveSort = sortConfig.key ? sortConfig : { key: "time", direction: "desc" };

        return [...safeData]
            .filter((item) => item?.Date || item?.date_time)
            .sort((a, b) => {
                const aValueRaw = getValueBySortKey(a, effectiveSort.key);
                const bValueRaw = getValueBySortKey(b, effectiveSort.key);

                if (effectiveSort.key === "time") {
                    const aTime = new Date(aValueRaw || 0).getTime();
                    const bTime = new Date(bValueRaw || 0).getTime();
                    if (aTime < bTime) return effectiveSort.direction === "asc" ? -1 : 1;
                    if (aTime > bTime) return effectiveSort.direction === "asc" ? 1 : -1;
                    return 0;
                }

                const aValue = Number(aValueRaw ?? Number.NEGATIVE_INFINITY);
                const bValue = Number(bValueRaw ?? Number.NEGATIVE_INFINITY);

                if (aValue < bValue) return effectiveSort.direction === "asc" ? -1 : 1;
                if (aValue > bValue) return effectiveSort.direction === "asc" ? 1 : -1;
                return 0;
            });
    }, [safeData, sortConfig]);

    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <i className="fa-solid fa-sort text-muted ms-1" style={{ fontSize: "0.75rem" }}></i>;
        }
        return sortConfig.direction === "asc" ? (
            <i className="fa-solid fa-sort-up text-primary ms-1" style={{ fontSize: "0.75rem" }}></i>
        ) : (
            <i className="fa-solid fa-sort-down text-primary ms-1" style={{ fontSize: "0.75rem" }}></i>
        );
    };

    return (
        <div className="table-responsive map-data-table-wrap">
            <table className="table table-bordered table-sm table-striped align-middle map-data-table">
                <thead className="table-light">
                    <tr>
                        <th style={{ width: 60 }}>#</th>
                        <th
                            style={{ cursor: "pointer", userSelect: "none" }}
                            onClick={() => handleSort("time")}
                        >
                            <div className="d-flex align-items-center justify-content-between">
                                <span>Thời gian</span>
                                {getSortIcon("time")}
                            </div>
                        </th>
                        <th
                            style={{ cursor: "pointer", userSelect: "none" }}
                            onClick={() => handleSort("salt_value")}
                        >
                            <div className="d-flex align-items-center justify-content-between">
                                <span>Độ mặn (‰)</span>
                                {getSortIcon("salt_value")}
                            </div>
                        </th>
                        <th
                            style={{ cursor: "pointer", userSelect: "none" }}
                            onClick={() => handleSort("distance_value")}
                        >
                            <div className="d-flex align-items-center justify-content-between">
                                <span>Mực nước (cm)</span>
                                {getSortIcon("distance_value")}
                            </div>
                        </th>
                        <th
                            style={{ cursor: "pointer", userSelect: "none" }}
                            onClick={() => handleSort("daily_rainfall_value")}
                        >
                            <div className="d-flex align-items-center justify-content-between">
                                <span>Lượng mưa (mm)</span>
                                {getSortIcon("daily_rainfall_value")}
                            </div>
                        </th>
                        <th
                            style={{ cursor: "pointer", userSelect: "none" }}
                            onClick={() => handleSort("temp_value")}
                        >
                            <div className="d-flex align-items-center justify-content-between">
                                <span>Nhiệt độ (°C)</span>
                                {getSortIcon("temp_value")}
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => {
                        const hasSaltValue = row.salt_value !== undefined && row.salt_value !== null;
                        const saltRisk = getIoTSalinityRiskMeta(row.salt_value, stationCode);

                        return (
                            <tr key={`${row.Date || row.date_time}-${idx}`}>
                                <td>{idx + 1}</td>
                                <td>{toDisplayDateTime(row.Date || row.date_time, groupBy)}</td>
                                <td
                                    className="text-end"
                                    style={
                                        hasSaltValue
                                            ? {
                                                  backgroundColor: saltRisk.backgroundColor,
                                                  color: saltRisk.textColor,
                                              }
                                            : undefined
                                    }
                                >
                                    {hasSaltValue ? (
                                        <div className="d-flex justify-content-end align-items-center gap-2">
                                            <span className="fw-semibold">
                                                {formatNumberVi(row.salt_value, 2)}
                                            </span>
                                            <span
                                                className="badge rounded-pill"
                                                title={saltRisk.description}
                                                style={{
                                                    backgroundColor: saltRisk.textColor,
                                                    color: "#fff",
                                                    minWidth: 38,
                                                }}
                                            >
                                                {saltRisk.label}
                                            </span>
                                        </div>
                                    ) : (
                                        "-"
                                    )}
                                </td>
                                <td className="text-end">
                                    {row.distance_value !== undefined && row.distance_value !== null
                                        ? formatNumberVi(row.distance_value, 2)
                                        : "-"}
                                </td>
                                <td className="text-end">
                                    {row.daily_rainfall_value !== undefined &&
                                    row.daily_rainfall_value !== null
                                        ? formatNumberVi(row.daily_rainfall_value, 2)
                                        : "-"}
                                </td>
                                <td className="text-end">
                                    {row.temp_value !== undefined && row.temp_value !== null
                                        ? formatNumberVi(row.temp_value, 2)
                                        : "-"}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const IoTChartFull = ({ show, iotData, onClose }) => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("access_token");

    const [queryOptions, setQueryOptions] = useState({
        startDate: "",
        endDate: "",
        groupBy: "hour",
    });
    const [displayData, setDisplayData] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [activeTab, setActiveTab] = useState("chart");
    const [hasUserAdjustedQuery, setHasUserAdjustedQuery] = useState(false);
    const [stationStartDateFromApi, setStationStartDateFromApi] = useState("");

    // "Dự báo" (giống điểm đo mặn) / "Quan trắc" (chính là nội dung IoT hiện có)
    const [mainTab, setMainTab] = useState("forecast");
    const [forecastState, setForecastState] = useState({
        loading: false,
        error: null,
        loaded: false,
        points: [],
        issuedAt: null,
        isSynthetic: false,
    });
    const [forecastRange, setForecastRange] = useState({ startDate: "", endDate: "" });
    const [forecastFrequency, setForecastFrequency] = useState("2gio");

    const stationName = iotData?.stationName || iotData?.stationInfo?.station_name || "Trạm IoT";
    const serialNumber = iotData?.serialNumber || iotData?.stationInfo?.serial_number || "N/A";
    const stationCode = iotData?.stationCode || iotData?.stationInfo?.station_code || "";
    const forecastManualCode = IOT_STATION_FORECAST_MAP[stationCode];
    const hasForecast = Boolean(forecastManualCode);

    const stationStartDate = useMemo(() => {
        const rawStart =
            iotData?.start_time ||
            iotData?.startTime ||
            iotData?.first_data_time ||
            iotData?.stationInfo?.start_time ||
            iotData?.stationInfo?.startTime ||
            iotData?.stationInfo?.first_data_time ||
            iotData?.stationInfo?.firstDataTime ||
            "";

        return toInputDateValue(rawStart);
    }, [iotData]);

    const dataPoints = useMemo(() => {
        const rawDataPoints = iotData?.dataPoints?.length ? iotData.dataPoints : iotData?.data;
        return normalizeIoTDataRows(Array.isArray(rawDataPoints) ? rawDataPoints : EMPTY_DATA);
    }, [iotData?.dataPoints, iotData?.data]);

    // Reset khi mở modal lại / đổi trạm - tránh lẫn dữ liệu dự báo của trạm trước
    useEffect(() => {
        if (show) {
            setMainTab(hasForecast ? "forecast" : "actual");
            setActiveTab("chart");
            setForecastState({
                loading: false,
                error: null,
                loaded: false,
                points: [],
                issuedAt: null,
                isSynthetic: false,
            });
            setForecastRange({ startDate: "", endDate: "" });
            setForecastFrequency("2gio");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, serialNumber]);

    // Chỉ fetch dữ liệu dự báo khi tab "Dự báo" đang mở và trạm có mã tương ứng (dùng chung API
    // dự báo của điểm đo mặn - xem IOT_STATION_FORECAST_MAP)
    useEffect(() => {
        if (
            !show ||
            mainTab !== "forecast" ||
            !hasForecast ||
            forecastState.loaded ||
            forecastState.loading
        ) {
            return;
        }

        setForecastState((prev) => ({ ...prev, loading: true, error: null }));

        fetchForecastLatest()
            .then((res) => {
                if (!res) throw new Error("no data");
                const { timeGrid, stations, issuedAt, isSynthetic, intervalHours, horizonDays } = res;
                const station = stations.find((s) => s.manualCode === forecastManualCode);
                const points = timeGrid.map((time, index) => ({
                    time,
                    salinity: station ? station.values[index] : null,
                    dailySalinity: station ? station.dailyValues?.[index] : null,
                }));

                setForecastState({
                    loading: false,
                    error: null,
                    loaded: true,
                    points,
                    issuedAt,
                    isSynthetic,
                    intervalHours,
                    horizonDays,
                });
            })
            .catch((error) => {
                console.error("❌ Lấy dữ liệu dự báo IoT lỗi:", error);
                setForecastState((prev) => ({
                    ...prev,
                    loading: false,
                    error: "Không thể tải dữ liệu dự báo",
                    loaded: true,
                }));
            });
    }, [show, mainTab, hasForecast, forecastManualCode, forecastState.loaded, forecastState.loading]);

    // Mặc định Giai đoạn dự báo = toàn bộ chuỗi vừa tải về
    useEffect(() => {
        if (forecastState.points.length > 0) {
            setForecastRange({
                startDate: toVNDateKey(forecastState.points[0].time),
                endDate: toVNDateKey(forecastState.points[forecastState.points.length - 1].time),
            });
        }
    }, [forecastState.points]);

    const forecastBounds = useMemo(() => {
        if (!forecastState.points || forecastState.points.length === 0) {
            return { min: undefined, max: undefined };
        }
        return {
            min: toVNDateKey(forecastState.points[0].time),
            max: toVNDateKey(forecastState.points[forecastState.points.length - 1].time),
        };
    }, [forecastState.points]);

    const handleForecastRangeChange = (e) => {
        const { name, value } = e.target;
        setForecastRange((prev) => ({ ...prev, [name]: value }));
    };

    // dayKey PHẢI quy đổi tường minh về giờ VN (toVNDateKey) - KHÔNG cắt chuỗi thô: mốc dự báo
    // thật từ server trả về dạng "...+00:00" (UTC) chứ không phải "+07:00" như data mẫu test ở
    // local, nên cắt chuỗi thô từng ra sai lệch 1 ngày (xem SaltChartFull.jsx).
    const filteredForecastPoints = useMemo(() => {
        if (!forecastRange.startDate || !forecastRange.endDate) return forecastState.points;
        return forecastState.points.filter((p) => {
            const dayKey = toVNDateKey(p.time);
            return dayKey >= forecastRange.startDate && dayKey <= forecastRange.endDate;
        });
    }, [forecastState.points, forecastRange]);

    const dailyAggregatedPoints = useMemo(() => {
        const seenDays = new Set();
        const result = [];
        for (const p of filteredForecastPoints) {
            const dayKey = toVNDateKey(p.time);
            if (seenDays.has(dayKey)) continue;
            seenDays.add(dayKey);
            if (p.dailySalinity === null || p.dailySalinity === undefined) continue;
            result.push({ x: dayKey, salinity: Number(p.dailySalinity) });
        }
        return result;
    }, [filteredForecastPoints]);

    const biHourlyBarPoints = useMemo(() => {
        return filteredForecastPoints
            .filter((p) => Number.isFinite(Number(p.salinity)))
            .map((p) => ({ x: p.time, salinity: Number(p.salinity) }));
    }, [filteredForecastPoints]);

    const forecastDisplayCount =
        forecastFrequency === "ngay" ? dailyAggregatedPoints.length : biHourlyBarPoints.length;

    const forecastStartDateLabel =
        forecastState.points.length > 0 ? formatVNDate(forecastState.points[0].time) : null;
    const forecastEndDateLabel =
        forecastState.points.length > 0
            ? formatVNDate(forecastState.points[forecastState.points.length - 1].time)
            : null;

    useEffect(() => {
        if (!show || !serialNumber || serialNumber === "N/A") {
            setStationStartDateFromApi("");
            return;
        }

        let cancelled = false;

        const loadStationStartDate = async () => {
            try {
                const stationsResponse = await fetchIoTStations();
                const stations = Array.isArray(stationsResponse?.data) ? stationsResponse.data : [];
                const station =
                    stations.find((item) => item?.serial_number === serialNumber) ||
                    stations.find((item) => item?.serial === serialNumber) ||
                    null;

                const rawStart =
                    station?.start_time ||
                    station?.startTime ||
                    station?.first_data_time ||
                    station?.firstDataTime ||
                    "";
                const parsedStart = toInputDateValue(rawStart);

                if (!cancelled) {
                    setStationStartDateFromApi(parsedStart);
                    console.debug("[IoTChartFull] station start_time from stations API:", {
                        serialNumber,
                        rawStart,
                        parsedStart,
                    });
                }
            } catch (error) {
                if (!cancelled) {
                    console.warn("[IoTChartFull] failed to load station start_time from stations API", error);
                    setStationStartDateFromApi("");
                }
            }
        };

        loadStationStartDate();

        return () => {
            cancelled = true;
        };
    }, [show, serialNumber]);

    const dateBounds = useMemo(() => {
        const dataRange = getRangeFromRows(dataPoints);
        const effectiveStartDate = stationStartDateFromApi || stationStartDate || dataRange.startDate;
        // Khống chế theo đúng ngày của chuỗi số liệu của trạm (payload ban đầu lấy 14 ngày gần
        // nhất tính từ mốc dữ liệu mới nhất - xem getRecent14DaysRange trong IoTMarkers.jsx) thay
        // vì luôn lấy "hôm nay", vì trạm có thể đã ngừng gửi dữ liệu trước đó.
        return {
            startDate: effectiveStartDate,
            endDate: dataRange.endDate || getTodayIso(),
        };
    }, [dataPoints, stationStartDate, stationStartDateFromApi]);

    useEffect(() => {
        if (!show) return;
        console.debug("[IoTChartFull] date bounds resolved", {
            serialNumber,
            stationStartDateFromPopup: stationStartDate,
            stationStartDateFromApi,
            dateBounds,
        });
    }, [show, serialNumber, stationStartDate, stationStartDateFromApi, dateBounds]);

    useEffect(() => {
        if (!show) {
            return;
        }

        const nextRange = getRangeFromRows(dataPoints);
        const clampedStartDate = (() => {
            const baseStart = nextRange.startDate || dateBounds.startDate;
            if (!baseStart) return "";
            if (dateBounds.startDate && baseStart < dateBounds.startDate) return dateBounds.startDate;
            if (dateBounds.endDate && baseStart > dateBounds.endDate) return dateBounds.startDate;
            return baseStart;
        })();

        const clampedEndDate = (() => {
            const baseEnd = nextRange.endDate || dateBounds.endDate;
            if (!baseEnd) return "";
            if (dateBounds.endDate && baseEnd > dateBounds.endDate) return dateBounds.endDate;
            if (clampedStartDate && baseEnd < clampedStartDate) return clampedStartDate;
            return baseEnd;
        })();

        // Mặc định mở lên chỉ hiện 7 ngày gần nhất (preset đầu tiên) thay vì toàn bộ payload ban
        // đầu - lọc ngay trên dataPoints đã có sẵn trong bộ nhớ nên không cần gọi API thêm; các
        // preset rộng hơn (30/90 ngày, Toàn bộ) mới cần fetch nếu vượt quá payload ban đầu.
        const defaultRange =
            getPresetRange(IOT_RANGE_PRESETS[0], { startDate: clampedStartDate, endDate: clampedEndDate }) || {
                startDate: clampedStartDate,
                endDate: clampedEndDate,
            };

        setActiveTab("chart");
        setDisplayData(filterRowsByDateRange(dataPoints, defaultRange.startDate, defaultRange.endDate));
        setLoadError("");
        setHasUserAdjustedQuery(false);
        setQueryOptions((prev) => ({
            startDate: defaultRange.startDate,
            endDate: defaultRange.endDate,
            groupBy: prev.groupBy || "hour",
        }));
    }, [show, dataPoints, dateBounds.startDate, dateBounds.endDate]);

    useEffect(() => {
        if (!show || !serialNumber || serialNumber === "N/A") {
            return;
        }

        if (!queryOptions.startDate || !queryOptions.endDate) {
            return;
        }

        // Use payload data for initial render; only fetch after user changes filters.
        if (!hasUserAdjustedQuery) {
            return;
        }

        let isCancelled = false;

        const loadIoTData = async () => {
            setIsLoadingData(true);
            setLoadError("");

            try {
                const response = await fetchIoTData(serialNumber, {
                    startDate: queryOptions.startDate,
                    endDate: queryOptions.endDate,
                    groupBy: queryOptions.groupBy || "none",
                    limit: 200000,
                });

                if (isCancelled) return;

                if (!response?.success) {
                    // Keep current data instead of blanking the chart on API errors.
                    setLoadError(response?.message || "Không tải được dữ liệu IoT.");
                    return;
                }

                const normalizedRows = normalizeIoTDataRows(response.data);
                console.debug("[IoTChartFull] loadIoTData response", {
                    serialNumber,
                    queryOptions,
                    responseCount: Array.isArray(response?.data) ? response.data.length : 0,
                    normalizedCount: normalizedRows.length,
                });
                if (normalizedRows.length > 0) {
                    setDisplayData(normalizedRows);
                }
                if (normalizedRows.length === 0 && displayData.length === 0) {
                    setLoadError(response?.message || "Không có dữ liệu trong khoảng thời gian đã chọn.");
                }
            } catch (error) {
                if (!isCancelled) {
                    console.error("Error loading IoT chart data:", error);
                    // Keep current data to avoid empty chart when a refresh request fails.
                    setLoadError("Có lỗi khi tải dữ liệu IoT.");
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingData(false);
                }
            }
        };

        loadIoTData();

        return () => {
            isCancelled = true;
        };
    }, [
        show,
        serialNumber,
        queryOptions.startDate,
        queryOptions.endDate,
        queryOptions.groupBy,
        hasUserAdjustedQuery,
        displayData.length,
    ]);

    const handleQueryOptionChange = (e) => {
        const { name, value } = e.target;
        setHasUserAdjustedQuery(true);
        setQueryOptions((prev) => {
            const nextOptions = {
                ...prev,
                [name]: value,
            };

            if (nextOptions.startDate && nextOptions.endDate && nextOptions.startDate > nextOptions.endDate) {
                if (name === "startDate") {
                    nextOptions.endDate = value;
                }
                if (name === "endDate") {
                    nextOptions.startDate = value;
                }
            }

            return nextOptions;
        });
    };

    const applyPreset = (presetKey) => {
        const preset = IOT_RANGE_PRESETS.find((item) => item.key === presetKey);
        const range = getPresetRange(preset, dateBounds);
        if (!range) return;

        setHasUserAdjustedQuery(true);
        setQueryOptions((prev) => ({ ...prev, startDate: range.startDate, endDate: range.endDate }));
    };

    const downloadChart = async () => {
        if (!isLoggedIn) {
            alert("Bạn cần đăng nhập để tải xuống biểu đồ");
            return;
        }

        try {
            await downloadChartImage({
                title: `Dữ liệu IoT - ${stationName}`,
                subtitleHtml:
                    startDate && endDate
                        ? `Quan trắc từ <strong>${startDate}</strong> đến <strong>${endDate}</strong>`
                        : "",
                chartElementId: "iot-chart",
                filename: `bieu_do_iot_${serialNumber}_${new Date().getTime()}.png`,
            });
        } catch (error) {
            console.error("❌ Tải ảnh biểu đồ lỗi:", error);
            alert("Không thể tải ảnh biểu đồ.");
        }
    };

    const downloadData = () => {
        if (!isLoggedIn) {
            alert("Bạn cần đăng nhập để tải dữ liệu");
            return;
        }

        if (!data.length) {
            alert("Không có dữ liệu để tải");
            return;
        }

        const headers = [
            "STT",
            "Thời gian",
            "Độ mặn (‰)",
            "Mực nước (cm)",
            "Lượng mưa (mm)",
            "Nhiệt độ (°C)",
        ];

        const escapeCsv = (value) => {
            if (value === null || value === undefined) return "";
            const raw = String(value).replace(/\"/g, '""');
            return `"${raw}"`;
        };

        const rows = data.map((row, index) => {
            const timeValue = toDisplayDateTime(row.Date || row.date_time, queryOptions.groupBy);
            const salinityValue =
                row.salt_value !== undefined && row.salt_value !== null
                    ? Number(row.salt_value).toFixed(2)
                    : "";
            const waterLevelValue =
                row.distance_value !== undefined && row.distance_value !== null
                    ? Number(row.distance_value).toFixed(2)
                    : "";
            const rainfallValue =
                row.daily_rainfall_value !== undefined && row.daily_rainfall_value !== null
                    ? Number(row.daily_rainfall_value).toFixed(2)
                    : "";
            const temperatureValue =
                row.temp_value !== undefined && row.temp_value !== null
                    ? Number(row.temp_value).toFixed(2)
                    : "";

            return [index + 1, timeValue, salinityValue, waterLevelValue, rainfallValue, temperatureValue];
        });

        const csvContent = [headers, ...rows].map((line) => line.map(escapeCsv).join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `du_lieu_iot_${serialNumber}_${queryOptions.startDate || "all"}_${queryOptions.endDate || "all"}.csv`;
        link.click();
    };

    // T\u1EA3i \u1EA3nh bi\u1EC3u \u0111\u1ED3 d\u1EF1 b\u00E1o (gi\u1ED1ng downloadChart \u1EDF tr\u00EAn nh\u01B0ng ch\u1EE5p #iot-forecast-chart +
    // kho\u1EA3ng th\u1EDDi gian d\u1EF1 b\u00E1o, kh\u00F4ng ph\u1EA3i kho\u1EA3ng Giai \u0111o\u1EA1n quan tr\u1EAFc)
    const downloadForecastChart = async () => {
        if (!isLoggedIn) {
            alert(
                "B\u1EA1n c\u1EA7n \u0111\u0103ng nh\u1EADp \u0111\u1EC3 t\u1EA3i xu\u1ED1ng bi\u1EC3u \u0111\u1ED3",
            );
            return;
        }

        try {
            await downloadChartImage({
                title: `D\u1EF1 b\u00E1o \u0111\u1ED9 m\u1EB7n IoT - ${stationName}`,
                subtitleHtml:
                    forecastStartDateLabel && forecastEndDateLabel
                        ? `D\u1EF1 b\u00E1o t\u1EEB <strong>${forecastStartDateLabel}</strong> \u0111\u1EBFn <strong>${forecastEndDateLabel}</strong>`
                        : "",
                chartElementId: "iot-forecast-chart",
                filename: `bieu_do_du_bao_iot_${serialNumber}_${new Date().getTime()}.png`,
            });
        } catch (error) {
            console.error(
                "\u274C T\u1EA3i \u1EA3nh bi\u1EC3u \u0111\u1ED3 d\u1EF1 b\u00E1o l\u1ED7i:",
                error,
            );
            alert("Kh\u00F4ng th\u1EC3 t\u1EA3i \u1EA3nh bi\u1EC3u \u0111\u1ED3.");
        }
    };

    // Xu\u1EA5t Excel d\u1EEF li\u1EC7u d\u1EF1 b\u00E1o c\u1EE7a tr\u1EA1m IoT (c\u00F9ng c\u1EA5u tr\u00FAc v\u1EDBi file d\u1EF1 b\u00E1o \u0111i\u1EC3m \u0111o m\u1EB7n)
    const downloadForecastData = () => {
        if (!isLoggedIn) {
            alert(
                "B\u1EA1n c\u1EA7n \u0111\u0103ng nh\u1EADp \u0111\u1EC3 xu\u1EA5t d\u1EEF li\u1EC7u Excel",
            );
            return;
        }

        const points = filteredForecastPoints.filter((p) => parseNumber(p.salinity) !== null);
        if (points.length === 0) {
            alert("Kh\u00F4ng c\u00F3 d\u1EEF li\u1EC7u d\u1EF1 b\u00E1o \u0111\u1EC3 xu\u1EA5t");
            return;
        }

        try {
            const formatted = points.map((item, index) => ({
                STT: index + 1,
                "Th\u1EDDi \u0111i\u1EC3m": new Date(item.time).toLocaleString("vi-VN"),
                "Theo 2h - do_man (\u2030)": parseNumber(item.salinity),
                "Theo ng\u00E0y - DailyForecast (\u2030)": parseNumber(item.dailySalinity),
                "C\u1EA5p \u0111\u1ED9": getSingleStationClassification(item.salinity, forecastManualCode)
                    .shortText,
                "Tr\u1EA1m IoT": stationName || serialNumber || "",
            }));

            const worksheet = XLSX.utils.json_to_sheet(formatted);
            worksheet["!cols"] = [
                { wch: 5 },
                { wch: 20 },
                { wch: 18 },
                { wch: 22 },
                { wch: 25 },
                { wch: 20 },
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "D\u1EEF li\u1EC7u d\u1EF1 b\u00E1o");

            const metaData = [
                ["Th\u00F4ng tin xu\u1EA5t d\u1EEF li\u1EC7u d\u1EF1 b\u00E1o"],
                ["Tr\u1EA1m IoT:", stationName],
                ["M\u00E3 tr\u1EA1m:", stationCode],
                [
                    "Ph\u00E1t h\u00E0nh l\u00FAc:",
                    forecastState.issuedAt ? new Date(forecastState.issuedAt).toLocaleString("vi-VN") : "-",
                ],
                ["T\u1EEB th\u1EDDi \u0111i\u1EC3m:", new Date(points[0].time).toLocaleString("vi-VN")],
                [
                    "\u0110\u1EBFn th\u1EDDi \u0111i\u1EC3m:",
                    new Date(points[points.length - 1].time).toLocaleString("vi-VN"),
                ],
                [
                    "B\u01B0\u1EDBc th\u1EDDi gian:",
                    forecastState.intervalHours ? `${forecastState.intervalHours} gi\u1EDD` : "-",
                ],
                [
                    "T\u1EA7m d\u1EF1 b\u00E1o:",
                    forecastState.horizonDays ? `${forecastState.horizonDays} ng\u00E0y` : "-",
                ],
                [
                    "D\u1EEF li\u1EC7u gi\u1EA3 l\u1EADp:",
                    forecastState.isSynthetic ? "C\u00F3" : "Kh\u00F4ng",
                ],
                ["T\u1ED5ng s\u1ED1 b\u1EA3n ghi:", formatted.length],
                ["Th\u1EDDi gian xu\u1EA5t:", new Date().toLocaleString("vi-VN")],
            ];
            const metaWorksheet = XLSX.utils.aoa_to_sheet(metaData);
            metaWorksheet["!cols"] = [{ wch: 20 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(workbook, metaWorksheet, "Th\u00F4ng tin");

            const fileName = `du_bao_do_man_iot_${serialNumber}_${toVNDateKey(points[0].time)}_${toVNDateKey(points[points.length - 1].time)}.xlsx`;
            XLSX.writeFile(workbook, fileName, { bookType: "xlsx" });
        } catch (error) {
            console.error("\u274C Xu\u1EA5t Excel d\u1EF1 b\u00E1o l\u1ED7i:", error);
            alert("Kh\u00F4ng th\u1EC3 xu\u1EA5t d\u1EEF li\u1EC7u d\u1EF1 b\u00E1o.");
        }
    };

    if (!show) return null;

    const data = displayData;

    // Dòng phụ "Quan trắc từ ... đến ..." phải là khoảng thời gian CỐ ĐỊNH của cả chuỗi số liệu
    // trạm (dateBounds - lấy từ stationStartDateFromApi + dữ liệu payload ban đầu), KHÔNG được đổi
    // theo Giai đoạn đang lọc (data/displayData sẽ bị thu hẹp lại mỗi khi người dùng đổi Giai đoạn).
    const startDate = dateBounds.startDate ? formatVNDate(dateBounds.startDate) : null;
    const endDate = dateBounds.endDate ? formatVNDate(dateBounds.endDate) : null;

    return (
        <div
            className={`modal fade map-data-modal iot-chart-modal ${show ? "show d-block" : ""}`}
            tabIndex="-1"
            style={{
                backgroundColor: show ? "rgba(0,0,0,0.5)" : "transparent",
                overflow: "hidden",
                position: "fixed",
                inset: 0,
            }}
        >
            <div
                className="modal-dialog modal-xl modal-dialog-centered"
                style={{
                    maxWidth: "95%",
                    width: "95%",
                    height: "99vh",
                    maxHeight: "99vh",
                    margin: "0 auto",
                }}
            >
                <div
                    className="modal-content"
                    style={{
                        height: "100%",
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    }}
                >
                    <div className="modal-header border-0 pb-1 pt-2">
                        <div className="w-100 text-center">
                            <h5 className="modal-title mb-1 fw-bold">Dữ liệu IoT - {stationName}</h5>
                            {mainTab === "forecast"
                                ? forecastStartDateLabel &&
                                  forecastEndDateLabel && (
                                      <div className="text-muted small">
                                          Dự báo từ <strong>{forecastStartDateLabel}</strong> đến{" "}
                                          <strong>{forecastEndDateLabel}</strong>
                                      </div>
                                  )
                                : startDate &&
                                  endDate && (
                                      <div className="text-muted small">
                                          Quan trắc từ <strong>{startDate}</strong> đến{" "}
                                          <strong>{endDate}</strong>
                                      </div>
                                  )}
                        </div>
                        <button
                            type="button"
                            className="btn-close position-absolute end-0 top-0 m-3"
                            onClick={onClose}
                        ></button>
                    </div>

                    <div
                        className="modal-body"
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            minHeight: 0,
                            overflow: "hidden",
                            paddingTop: 8,
                            paddingBottom: 12,
                        }}
                    >
                        <div className="chartfull-topbar mb-2">
                            <div className="chartfull-controls-row">
                                {hasForecast && (
                                    <ul
                                        className="nav nav-tabs mb-0"
                                        role="tablist"
                                        style={{ flexShrink: 0 }}
                                    >
                                        <li className="nav-item">
                                            <button
                                                className={`nav-link ${mainTab === "forecast" ? "active" : ""}`}
                                                type="button"
                                                onClick={() => setMainTab("forecast")}
                                            >
                                                Dự báo
                                            </button>
                                        </li>
                                        <li className="nav-item">
                                            <button
                                                className={`nav-link ${mainTab === "actual" ? "active" : ""}`}
                                                type="button"
                                                onClick={() => setMainTab("actual")}
                                            >
                                                Quan trắc
                                            </button>
                                        </li>
                                    </ul>
                                )}

                                <ul
                                    className="nav nav-pills nav-sm mb-0"
                                    role="tablist"
                                    style={{ flexShrink: 0 }}
                                >
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === "chart" ? "active" : ""}`}
                                            type="button"
                                            onClick={() => setActiveTab("chart")}
                                        >
                                            Biểu đồ
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === "data" ? "active" : ""}`}
                                            type="button"
                                            onClick={() => setActiveTab("data")}
                                        >
                                            Dữ liệu
                                        </button>
                                    </li>
                                </ul>

                                {mainTab === "actual" && (
                                    <div className="chartfull-topbar-controls ms-auto">
                                        <IoTQueryControls
                                            queryOptions={queryOptions}
                                            onChange={handleQueryOptionChange}
                                            onPresetSelect={applyPreset}
                                            minDate={dateBounds.startDate}
                                            maxDate={dateBounds.endDate}
                                            compact
                                        />
                                    </div>
                                )}

                                {mainTab === "forecast" && (
                                    <div className="chartfull-topbar-controls ms-auto">
                                        {activeTab === "chart" && (
                                            <>
                                                <span className="small text-muted fw-semibold">
                                                    Tần suất:
                                                </span>
                                                <select
                                                    className="form-select form-select-sm"
                                                    style={{ width: 100, minWidth: 100 }}
                                                    value={forecastFrequency}
                                                    onChange={(e) => setForecastFrequency(e.target.value)}
                                                >
                                                    <option value="2gio">2 giờ</option>
                                                    <option value="ngay">Ngày</option>
                                                </select>
                                            </>
                                        )}
                                        <span className="small text-muted fw-semibold">Giai đoạn:</span>
                                        <LocalizedDateInput
                                            className="form-control form-control-sm"
                                            name="startDate"
                                            value={forecastRange.startDate}
                                            onChange={handleForecastRangeChange}
                                            min={forecastBounds.min}
                                            max={forecastBounds.max}
                                            style={{ width: 145, minWidth: 145 }}
                                        />
                                        <span className="small text-muted">-</span>
                                        <LocalizedDateInput
                                            className="form-control form-control-sm"
                                            name="endDate"
                                            value={forecastRange.endDate}
                                            onChange={handleForecastRangeChange}
                                            min={forecastBounds.min}
                                            max={forecastBounds.max}
                                            style={{ width: 145, minWidth: 145 }}
                                        />
                                    </div>
                                )}
                            </div>

                            <SalinityRiskLegend
                                kiHieu={forecastManualCode}
                                className="risk-legend-row flex-nowrap justify-content-center mt-2 mb-0"
                            />
                        </div>

                        <div className="tab-content" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                            {mainTab === "forecast" && hasForecast && (
                                <div className="h-100">
                                    {forecastState.loading ? (
                                        <p className="text-muted">Đang tải dữ liệu dự báo...</p>
                                    ) : forecastState.error ? (
                                        <p className="text-muted">{forecastState.error}</p>
                                    ) : forecastState.points.length > 0 ? (
                                        <>
                                            {activeTab === "chart" ? (
                                                <div className="map-chart-pane h-100">
                                                    <div id="iot-forecast-chart" className="map-chart-box">
                                                        <ForecastBarChart
                                                            data={
                                                                forecastFrequency === "ngay"
                                                                    ? dailyAggregatedPoints
                                                                    : biHourlyBarPoints
                                                            }
                                                            kiHieu={forecastManualCode}
                                                            height="100%"
                                                            mode={
                                                                forecastFrequency === "ngay"
                                                                    ? "date"
                                                                    : "datetime"
                                                            }
                                                        />
                                                    </div>
                                                    <div className="map-chart-footer mt-1 d-flex justify-content-between align-items-center">
                                                        <div className="text-muted small">
                                                            Hiển thị <strong>{forecastDisplayCount}</strong>{" "}
                                                            bản ghi. Phát hành lúc:{" "}
                                                            {forecastState.issuedAt
                                                                ? new Date(
                                                                      forecastState.issuedAt,
                                                                  ).toLocaleString("vi-VN")
                                                                : "-"}
                                                        </div>
                                                        <button
                                                            className={`btn btn-sm ${isLoggedIn ? "btn-outline-primary" : "btn-outline-secondary"}`}
                                                            onClick={downloadForecastChart}
                                                            disabled={!isLoggedIn}
                                                            title={
                                                                !isLoggedIn
                                                                    ? "Bạn cần đăng nhập để tải xuống biểu đồ"
                                                                    : ""
                                                            }
                                                        >
                                                            Tải biểu đồ
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    className="h-100 d-flex flex-column"
                                                    style={{ minHeight: 0 }}
                                                >
                                                    <div
                                                        className="map-data-scroll"
                                                        style={{ flex: 1, minHeight: 0, overflow: "auto" }}
                                                    >
                                                        <ForecastDataTable
                                                            points={filteredForecastPoints}
                                                            kiHieu={forecastManualCode}
                                                        />
                                                    </div>
                                                    <div className="d-flex gap-2 justify-content-between align-items-center">
                                                        <div className="text-muted small">
                                                            Hiển thị {filteredForecastPoints.length} bản ghi
                                                        </div>
                                                        <button
                                                            className={`btn btn-sm ${isLoggedIn ? "btn-outline-success" : "btn-outline-secondary"}`}
                                                            onClick={downloadForecastData}
                                                            disabled={!isLoggedIn}
                                                            title={
                                                                !isLoggedIn
                                                                    ? "Bạn cần đăng nhập để xuất dữ liệu Excel"
                                                                    : ""
                                                            }
                                                        >
                                                            Tải dữ liệu
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-muted">Chưa có dữ liệu dự báo.</p>
                                    )}
                                </div>
                            )}

                            {mainTab === "actual" && (
                                <>
                                    <div
                                        className={`tab-pane fade ${activeTab === "chart" ? "show active" : ""} h-100`}
                                        id="iot-chart-content"
                                        style={{ overflow: "hidden" }}
                                    >
                                        <div className="h-100 d-flex flex-column" style={{ minHeight: 0 }}>
                                            {isLoadingData ? (
                                                <div className="flex-grow-1 d-flex align-items-center justify-content-center text-muted">
                                                    Đang tải dữ liệu IoT...
                                                </div>
                                            ) : data.length > 0 ? (
                                                <div className="map-chart-pane flex-grow-1">
                                                    <div
                                                        id="iot-chart"
                                                        className="chart-container map-chart-box iot-chart-box"
                                                        style={{ paddingTop: 0, flex: 1, minHeight: 300 }}
                                                    >
                                                        <IoTBarChart
                                                            data={data}
                                                            height="100%"
                                                            groupBy={queryOptions.groupBy}
                                                            stationCode={stationCode}
                                                        />
                                                    </div>
                                                    <div
                                                        className="map-chart-footer d-flex justify-content-between align-items-center"
                                                        style={{
                                                            flexShrink: 0,
                                                            padding: "8px 0",
                                                            borderTop: "1px solid #e9ecef",
                                                        }}
                                                    >
                                                        <div
                                                            className="text-muted"
                                                            style={{ fontSize: "12px" }}
                                                        >
                                                            Hiển thị <strong>{data.length}</strong> điểm dữ
                                                            liệu
                                                        </div>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <button
                                                                className={`btn btn-sm ${isLoggedIn ? "btn-outline-primary" : "btn-outline-secondary"}`}
                                                                onClick={downloadChart}
                                                                disabled={!isLoggedIn}
                                                                title={
                                                                    !isLoggedIn
                                                                        ? "Bạn cần đăng nhập để tải xuống biểu đồ"
                                                                        : ""
                                                                }
                                                                style={{
                                                                    fontSize: "12px",
                                                                    padding: "4px 10px",
                                                                }}
                                                            >
                                                                Tải biểu đồ
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                                                    <p className="text-muted mb-0">
                                                        {loadError ||
                                                            (iotData
                                                                ? "Không có dữ liệu hợp lệ."
                                                                : "Đang tải dữ liệu IoT...")}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div
                                        className={`tab-pane fade ${activeTab === "data" ? "show active" : ""} h-100`}
                                        id="iot-export-content"
                                        style={{ overflow: "hidden" }}
                                    >
                                        <div className="h-100 d-flex flex-column" style={{ minHeight: 0 }}>
                                            {data.length > 0 ? (
                                                <>
                                                    <div
                                                        style={{
                                                            flex: 1,
                                                            minHeight: 0,
                                                            overflow: "auto",
                                                            paddingRight: 4,
                                                        }}
                                                    >
                                                        <IoTExportPreviewTable
                                                            data={data}
                                                            groupBy={queryOptions.groupBy}
                                                            stationCode={stationCode}
                                                        />
                                                    </div>

                                                    <div
                                                        className="d-flex gap-2 justify-content-between align-items-center pt-2"
                                                        style={{ flexShrink: 0 }}
                                                    >
                                                        <div className="text-muted small">
                                                            Hiển thị {data.length} bản ghi
                                                        </div>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <button
                                                                className={`btn btn-sm ${isLoggedIn ? "btn-outline-success" : "btn-outline-secondary"}`}
                                                                onClick={downloadData}
                                                                disabled={!isLoggedIn}
                                                                title={
                                                                    !isLoggedIn
                                                                        ? "Bạn cần đăng nhập để tải dữ liệu"
                                                                        : ""
                                                                }
                                                                style={{
                                                                    fontSize: "12px",
                                                                    padding: "4px 10px",
                                                                }}
                                                            >
                                                                Tải dữ liệu
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                                                    <p className="text-muted mb-0">
                                                        {loadError || "Không có dữ liệu để hiển thị."}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IoTChartFull;
