import React, { useEffect, useRef, useState } from "react";
import axiosInstance from "@config/axios-config";
import SalinityBarChart from "@pages/map/SalinityBarChart";
import ForecastBarChart from "@pages/map/ForecastBarChart";
import ForecastDataTable from "@pages/map/ForecastDataTable";
import SalinityRiskLegend from "@pages/map/SalinityRiskLegend";
import { downloadChartImage } from "@common/downloadChartImage";
import * as XLSX from "xlsx";
import { getDisplayStationName, getFilenameSafeStationName } from "@common/stationMapping";
import { getSingleStationClassification, getRiskBadgeMeta } from "@common/salinityClassification";
import {
    toVNDateKey,
    formatVNDate,
    formatVNDateTime,
    formatVNHourOnly,
    getVNHourNumber,
} from "@common/vnDateTime";
import { fetchSalinityDataDetail } from "@components/map/mapDataServices";
import { DATE_RANGE_PRESETS, getPresetRange, findActivePresetKey } from "@common/dateRangePresets";
import "@styles/components/_hydrometChart.scss";
import LocalizedDateInput from "@components/common/LocalizedDateInput";

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

// Dữ liệu quan trắc (hochiminh."DoMan") là cột DATE thuần (không giờ), nhưng khi driver
// Postgres/JSON hoá lại serialize thành chuỗi UTC (vd ngày 2/10/2026 -> "2026-10-01T17:00:00.000Z",
// vì nửa đêm giờ VN (+07) = 17h hôm trước theo UTC). Lấy trực tiếp 10 ký tự đầu của chuỗi này
// ("2026-10-01") sẽ RA SAI 1 NGÀY. toVNDateKey quy đổi tường minh về giờ Asia/Ho_Chi_Minh (không
// phụ thuộc múi giờ của máy/trình duyệt đang xem) nên luôn ra đúng ngày thật dù mở từ đâu.
const toLocalDateKey = toVNDateKey;

const ExportPreviewTable = ({ data, kiHieu }) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    const sortedData = React.useMemo(() => {
        const effectiveSort = sortConfig.key ? sortConfig : { key: "thoiDiem", direction: "desc" };

        const sorted = [...data].sort((a, b) => {
            let aValue = a[effectiveSort.key];
            let bValue = b[effectiveSort.key];

            if (effectiveSort.key === "thoiDiem" || effectiveSort.key === "ngay") {
                // "ngay" vẫn sort theo đúng mốc thời gian đầy đủ (thoiDiem) - chỉ khác cách hiển
                // thị, không phải 1 field riêng, nên không có chuyện 2 lần đo khác giờ cùng ngày
                // bị coi là bằng nhau.
                aValue = new Date(a.thoiDiem);
                bValue = new Date(b.thoiDiem);
            } else if (effectiveSort.key === "gio") {
                aValue = getVNHourNumber(a.thoiDiem);
                bValue = getVNHourNumber(b.thoiDiem);
            } else if (effectiveSort.key === "salinity") {
                aValue = Number(aValue);
                bValue = Number(bValue);
            }

            if (aValue < bValue) {
                return effectiveSort.direction === "asc" ? -1 : 1;
            }
            if (aValue > bValue) {
                return effectiveSort.direction === "asc" ? 1 : -1;
            }
            return 0;
        });

        return sorted;
    }, [data, sortConfig]);

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
        <div className="table-responsive mb-3 map-data-table-wrap">
            <table className="table table-bordered table-sm table-striped map-data-table">
                <thead className="table-light">
                    <tr>
                        <th style={{ width: "60px" }}>#</th>
                        <th
                            style={{ cursor: "pointer", userSelect: "none" }}
                            onClick={() => handleSort("thoiDiem")}
                        >
                            <div className="d-flex align-items-center justify-content-between">
                                <span>Thời điểm</span>
                                {getSortIcon("thoiDiem")}
                            </div>
                        </th>
                        <th
                            style={{ cursor: "pointer", userSelect: "none" }}
                            onClick={() => handleSort("ngay")}
                        >
                            <div className="d-flex align-items-center justify-content-between">
                                <span>Ngày</span>
                                {getSortIcon("ngay")}
                            </div>
                        </th>
                        <th
                            style={{ width: "70px", cursor: "pointer", userSelect: "none" }}
                            onClick={() => handleSort("gio")}
                        >
                            <div className="d-flex align-items-center justify-content-between">
                                <span>Giờ</span>
                                {getSortIcon("gio")}
                            </div>
                        </th>
                        <th
                            style={{ cursor: "pointer", userSelect: "none" }}
                            onClick={() => handleSort("salinity")}
                        >
                            <div className="d-flex align-items-center justify-content-between">
                                <span>Độ mặn (‰)</span>
                                {getSortIcon("salinity")}
                            </div>
                        </th>
                        <th
                            style={{ cursor: "pointer", userSelect: "none" }}
                            onClick={() => handleSort("ph")}
                        >
                            <div className="d-flex align-items-center justify-content-between">
                                <span>pH</span>
                                {getSortIcon("ph")}
                            </div>
                        </th>
                        <th
                            style={{ cursor: "pointer", userSelect: "none" }}
                            onClick={() => handleSort("doDanDien")}
                        >
                            <div className="d-flex align-items-center justify-content-between">
                                <span>EC (S/m)</span>
                                {getSortIcon("doDanDien")}
                            </div>
                        </th>
                        <th
                            style={{ cursor: "pointer", userSelect: "none" }}
                            onClick={() => handleSort("doDuc")}
                        >
                            <div className="d-flex align-items-center justify-content-between">
                                <span>Độ đục (NTU)</span>
                                {getSortIcon("doDuc")}
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((item, idx) => {
                        const risk = getRiskBadgeMeta(item.salinity, kiHieu);
                        const hasValue = item.salinity !== null && !Number.isNaN(Number(item.salinity));

                        return (
                            <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td>{formatVNDateTime(item.thoiDiem)}</td>
                                <td>{formatVNDate(item.thoiDiem)}</td>
                                <td>{formatVNHourOnly(item.thoiDiem)}</td>
                                <td
                                    className="text-end"
                                    style={
                                        hasValue
                                            ? { backgroundColor: risk.backgroundColor, color: risk.textColor }
                                            : undefined
                                    }
                                >
                                    {hasValue ? (
                                        <div className="d-flex justify-content-end align-items-center gap-2">
                                            <span className="fw-semibold">
                                                {formatNumberVi(item.salinity, 2)}
                                            </span>
                                            <span
                                                className="badge rounded-pill"
                                                title={risk.description}
                                                style={{
                                                    backgroundColor: risk.textColor,
                                                    color: "#fff",
                                                    minWidth: 38,
                                                }}
                                            >
                                                {risk.label}
                                            </span>
                                        </div>
                                    ) : (
                                        "-"
                                    )}
                                </td>
                                <td className="text-end">
                                    {item.ph !== null && item.ph !== undefined
                                        ? formatNumberVi(item.ph, 2)
                                        : "-"}
                                </td>
                                <td className="text-end">
                                    {item.doDanDien !== null && item.doDanDien !== undefined
                                        ? formatNumberVi(item.doDanDien, 2)
                                        : "-"}
                                </td>
                                <td className="text-end">
                                    {item.doDuc !== null && item.doDuc !== undefined
                                        ? formatNumberVi(item.doDuc, 2)
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

const SaltChartFull = ({ show, kiHieu, tenDiem, salinityData, onClose }) => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("access_token");

    // Get display name for the station using utility function
    const displayStationName = getDisplayStationName(tenDiem, kiHieu);
    const filenameSafeName = getFilenameSafeStationName(displayStationName);

    const [data, setData] = useState([]);
    const [exportRange, setExportRange] = useState({
        startDate: "",
        endDate: "",
    });
    const [filteredData, setFilteredData] = useState([]);

    // Từng lần đo thực tế (có thể nhiều dòng/ngày, vd "Kênh C" tới 18 lần/ngày) - chỉ dùng để
    // hiển thị cột "Thời điểm"/"Giờ" thật trong bảng "Dữ liệu", không ảnh hưởng biểu đồ (biểu đồ
    // vẫn dùng giá trị trung bình/ngày như cũ qua `data`/`filteredData`).
    const [detailData, setDetailData] = useState([]);
    const [filteredDetailData, setFilteredDetailData] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const detailLoadedForRef = useRef(null);

    // 2 tab chính: "forecast" (Dự báo, hiện trước) và "actual" (Quan trắc).
    // Mỗi tab chính có chung 2 tab con: "chart" (Biểu đồ) / "data" (Dữ liệu).
    const [mainTab, setMainTabState] = useState("forecast");
    const [subTab, setSubTab] = useState("chart");
    // Đánh dấu người dùng đã tự chọn tab chính, để không tự động ghi đè lựa chọn của họ
    const userPickedMainTabRef = useRef(false);

    const selectMainTab = (tab) => {
        userPickedMainTabRef.current = true;
        setMainTabState(tab);
    };

    // Dữ liệu dự báo (10 ngày tới) - lấy từ /forecast-stations (biết trạm nào có dự báo)
    // và /forecast-latest (dữ liệu thật, chỉ fetch khi tab Dự báo được chọn)
    const [forecastStations, setForecastStations] = useState([]);
    const [forecastState, setForecastState] = useState({
        loading: false,
        error: null,
        loaded: false,
        points: [],
        issuedAt: null,
        isSynthetic: false,
    });

    const hasForecast = forecastStations.find((s) => s.manualCode === kiHieu)?.hasForecast || false;

    // Giai đoạn lọc + tần suất hiển thị cho tab "Dự báo" (mặc định: toàn bộ chuỗi, tần suất 2 giờ)
    const [forecastRange, setForecastRange] = useState({ startDate: "", endDate: "" });
    const [forecastFrequency, setForecastFrequency] = useState("2gio");

    const handleForecastRangeChange = (e) => {
        const { name, value } = e.target;
        setForecastRange((prev) => ({ ...prev, [name]: value }));
    };

    // Khống chế Giai đoạn Quan trắc theo đúng ngày của chuỗi số liệu của trạm (xem toLocalDateKey
    // ở trên - KHÔNG được cắt chuỗi ISO trực tiếp vì dữ liệu quan trắc bị lệch múi giờ khi serialize)
    const actualBounds = React.useMemo(() => {
        if (!data || data.length === 0) return { min: undefined, max: undefined };
        return {
            min: toLocalDateKey(data[0].date),
            max: toLocalDateKey(data[data.length - 1].date),
        };
    }, [data]);

    const forecastBounds = React.useMemo(() => {
        if (!forecastState.points || forecastState.points.length === 0) {
            return { min: undefined, max: undefined };
        }
        return {
            min: toVNDateKey(forecastState.points[0].time),
            max: toVNDateKey(forecastState.points[forecastState.points.length - 1].time),
        };
    }, [forecastState.points]);

    // Dữ liệu dự báo sau khi áp dụng Giai đoạn đã chọn (mặc định = toàn bộ chuỗi). dayKey PHẢI quy
    // đổi tường minh về giờ VN (toVNDateKey) - KHÔNG cắt chuỗi thô (String(p.time).slice(0,10)):
    // mốc dự báo thật từ server trả về dạng "...+00:00" (UTC) chứ không phải "+07:00" như data mẫu
    // test ở local, nên cắt chuỗi thô từng ra sai lệch 1 ngày (vd "2024-09-19" thay vì "2024-09-20").
    const filteredForecastPoints = React.useMemo(() => {
        if (!forecastRange.startDate || !forecastRange.endDate) return forecastState.points;

        return forecastState.points.filter((p) => {
            const dayKey = toVNDateKey(p.time);
            return dayKey >= forecastRange.startDate && dayKey <= forecastRange.endDate;
        });
    }, [forecastState.points, forecastRange]);

    // Gộp về 1 bản ghi/ngày (giá trị DailyForecast) dùng cho biểu đồ cột khi chọn tần suất "Ngày"
    const dailyAggregatedPoints = React.useMemo(() => {
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

    // Giữ nguyên từng mốc 2h (không gộp) dùng cho biểu đồ cột khi chọn tần suất "2 giờ"
    const biHourlyBarPoints = React.useMemo(() => {
        return filteredForecastPoints
            .filter((p) => Number.isFinite(Number(p.salinity)))
            .map((p) => ({ x: p.time, salinity: Number(p.salinity) }));
    }, [filteredForecastPoints]);

    const forecastDisplayCount =
        forecastFrequency === "ngay" ? dailyAggregatedPoints.length : biHourlyBarPoints.length;

    useEffect(() => {
        if (show && salinityData) {
            // Lọc bỏ các ngày có giá trị NULL
            const validSalinityData = salinityData.filter(
                (item) => item.salinity !== null && item.salinity !== "NULL" && !isNaN(item.salinity),
            );

            setData(validSalinityData);
            setFilteredData(validSalinityData);
            if (validSalinityData.length > 0) {
                setExportRange({
                    startDate: toLocalDateKey(validSalinityData[0].date),
                    endDate: toLocalDateKey(validSalinityData[validSalinityData.length - 1].date),
                });
            }
        } else {
            setData([]);
            setFilteredData([]);
            setExportRange({ startDate: "", endDate: "" });
        }
    }, [show, salinityData]);

    // Tải từng lần đo thật (cho cột "Thời điểm"/"Giờ") chỉ khi người dùng thực sự mở tab "Dữ liệu"
    // của "Quan trắc" - tránh gọi API thừa cho những lượt chỉ xem biểu đồ.
    useEffect(() => {
        if (!show || !kiHieu || mainTab !== "actual" || subTab !== "data") return;
        if (detailLoadedForRef.current === kiHieu) return;

        detailLoadedForRef.current = kiHieu;
        setDetailLoading(true);
        fetchSalinityDataDetail(kiHieu)
            .then((rows) => {
                setDetailData(rows);

                const { startDate, endDate } = exportRange;
                if (startDate && endDate) {
                    setFilteredDetailData(
                        rows.filter((item) => {
                            const dayKey = toLocalDateKey(item.thoiDiem);
                            return dayKey >= startDate && dayKey <= endDate;
                        }),
                    );
                } else {
                    setFilteredDetailData(rows);
                }
            })
            .finally(() => setDetailLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, kiHieu, mainTab, subTab]);

    useEffect(() => {
        if (!kiHieu) return;
        detailLoadedForRef.current = null;
        setDetailData([]);
        setFilteredDetailData([]);
    }, [kiHieu]);

    useEffect(() => {
        if (!show) {
            setData([]);
            setFilteredData([]);
        }
    }, [show]);

    useEffect(() => {
        if (show) {
            setMainTabState("forecast");
            setSubTab("chart");
            userPickedMainTabRef.current = false;
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
    }, [show, kiHieu]);

    // Mặc định Giai đoạn dự báo = toàn bộ chuỗi vừa tải về
    useEffect(() => {
        if (forecastState.points.length > 0) {
            setForecastRange({
                startDate: toVNDateKey(forecastState.points[0].time),
                endDate: toVNDateKey(forecastState.points[forecastState.points.length - 1].time),
            });
        }
    }, [forecastState.points]);

    // Danh sách trạm có dữ liệu dự báo (fetch 1 lần khi modal mở) để quyết định có hiện tab "Dự báo" hay không
    useEffect(() => {
        if (!show) return;

        axiosInstance
            .get("/forecast-stations")
            .then((res) => setForecastStations(res.data || []))
            .catch((error) => console.error("❌ Lấy danh sách trạm dự báo lỗi:", error));
    }, [show]);

    // Trạm không có dự báo (vd KXD2) -> tự chuyển về tab "Quan trắc", trừ khi người dùng đã tự bấm chọn tab
    useEffect(() => {
        if (show && forecastStations.length > 0 && !hasForecast && !userPickedMainTabRef.current) {
            setMainTabState("actual");
        }
    }, [show, forecastStations, hasForecast]);

    // Chỉ fetch dữ liệu dự báo thật khi tab "Dự báo" đang mở và trạm có dự báo
    useEffect(() => {
        if (mainTab !== "forecast" || !hasForecast || forecastState.loaded || forecastState.loading) return;

        setForecastState((prev) => ({ ...prev, loading: true, error: null }));

        axiosInstance
            .get("/forecast-latest")
            .then((res) => {
                const { timeGrid, stations, issuedAt, isSynthetic, intervalHours, horizonDays } = res.data;
                const station = stations.find((s) => s.manualCode === kiHieu);
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
                console.error("❌ Lấy dữ liệu dự báo lỗi:", error);
                const message =
                    error.response?.status === 404
                        ? "Chưa có dữ liệu dự báo"
                        : "Không thể tải dữ liệu dự báo từ máy chủ";
                setForecastState((prev) => ({ ...prev, loading: false, error: message, loaded: true }));
            });
    }, [mainTab, hasForecast, kiHieu, forecastState.loaded, forecastState.loading]);

    // Lọc lại data/detailData theo đúng 1 khoảng ngày (dùng chung cho gõ tay lẫn chọn nhanh preset)
    const applyActualDateRange = (nextStartDate, nextEndDate) => {
        setExportRange({ startDate: nextStartDate, endDate: nextEndDate });

        if (!nextStartDate || !nextEndDate || nextStartDate > nextEndDate) return;

        // So sánh bằng chuỗi "YYYY-MM-DD" (dùng toLocalDateKey, KHÔNG cắt chuỗi ISO trực tiếp -
        // xem giải thích ở toLocalDateKey phía trên)
        const filtered = data.filter((item) => {
            const dayKey = toLocalDateKey(item.date);
            return dayKey >= nextStartDate && dayKey <= nextEndDate;
        });
        setFilteredData(filtered);

        const filteredDetail = detailData.filter((item) => {
            const dayKey = toLocalDateKey(item.thoiDiem);
            return dayKey >= nextStartDate && dayKey <= nextEndDate;
        });
        setFilteredDetailData(filteredDetail);
    };

    const handleDateRangeChange = (e) => {
        const { name, value } = e.target;
        const nextStartDate = name === "startDate" ? value : exportRange.startDate;
        const nextEndDate = name === "endDate" ? value : exportRange.endDate;
        applyActualDateRange(nextStartDate, nextEndDate);
    };

    const applyActualPreset = (presetKey) => {
        const preset = DATE_RANGE_PRESETS.find((item) => item.key === presetKey);
        const range = getPresetRange(preset, { startDate: actualBounds.min, endDate: actualBounds.max });
        if (!range) return;
        applyActualDateRange(range.startDate, range.endDate);
    };

    const handleExportExcel = async () => {
        if (!isLoggedIn) {
            alert("Bạn cần đăng nhập để xuất dữ liệu Excel");
            return;
        }

        try {
            if (!exportRange.startDate || !exportRange.endDate) {
                alert("Vui lòng chọn khoảng thời gian để xuất dữ liệu");
                return;
            }

            const dataToExport = filteredData.length > 0 ? filteredData : data;
            const exportData = {
                kiHieu,
                tenDiem,
                startDate: exportRange.startDate,
                endDate: exportRange.endDate,
                data: dataToExport,
            };

            const res = await axiosInstance.post("/salinity-export", exportData, {
                responseType: "blob",
            });

            const blob = new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const fileName = `do_man_${filenameSafeName}_${exportRange.startDate}_${exportRange.endDate}.xlsx`;
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("❌ Xuất Excel lỗi:", error);
            alert("Không thể xuất dữ liệu từ máy chủ.");
        }
    };

    // Xuất Excel dữ liệu dự báo của trạm (tạo trực tiếp ở client, cùng cấu trúc với file quan trắc)
    const handleExportForecastExcel = () => {
        if (!isLoggedIn) {
            alert("Bạn cần đăng nhập để xuất dữ liệu Excel");
            return;
        }

        const points = filteredForecastPoints.filter((p) => parseNumber(p.salinity) !== null);
        if (points.length === 0) {
            alert("Không có dữ liệu dự báo để xuất");
            return;
        }

        try {
            const formatted = points.map((item, index) => ({
                STT: index + 1,
                "Thời điểm": new Date(item.time).toLocaleString("vi-VN"),
                "Theo 2h - do_man (‰)": parseNumber(item.salinity),
                "Theo ngày - DailyForecast (‰)": parseNumber(item.dailySalinity),
                "Cấp độ": getSingleStationClassification(item.salinity, kiHieu).shortText,
                "Điểm đo": displayStationName || kiHieu || "",
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
            XLSX.utils.book_append_sheet(workbook, worksheet, "Dữ liệu dự báo");

            const metaData = [
                ["Thông tin xuất dữ liệu dự báo"],
                ["Điểm đo:", displayStationName || kiHieu],
                ["Ký hiệu:", kiHieu],
                [
                    "Phát hành lúc:",
                    forecastState.issuedAt ? new Date(forecastState.issuedAt).toLocaleString("vi-VN") : "-",
                ],
                ["Từ thời điểm:", new Date(points[0].time).toLocaleString("vi-VN")],
                ["Đến thời điểm:", new Date(points[points.length - 1].time).toLocaleString("vi-VN")],
                ["Bước thời gian:", forecastState.intervalHours ? `${forecastState.intervalHours} giờ` : "-"],
                ["Tầm dự báo:", forecastState.horizonDays ? `${forecastState.horizonDays} ngày` : "-"],
                ["Dữ liệu giả lập:", forecastState.isSynthetic ? "Có" : "Không"],
                ["Tổng số bản ghi:", formatted.length],
                ["Thời gian xuất:", new Date().toLocaleString("vi-VN")],
            ];
            const metaWorksheet = XLSX.utils.aoa_to_sheet(metaData);
            metaWorksheet["!cols"] = [{ wch: 20 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(workbook, metaWorksheet, "Thông tin");

            const toFileDate = (time) => toVNDateKey(time);
            const fileName = `du_bao_do_man_${filenameSafeName}_${toFileDate(points[0].time)}_${toFileDate(points[points.length - 1].time)}.xlsx`;
            XLSX.writeFile(workbook, fileName, { bookType: "xlsx" });
        } catch (error) {
            console.error("❌ Xuất Excel dự báo lỗi:", error);
            alert("Không thể xuất dữ liệu dự báo.");
        }
    };

    const downloadChart = async () => {
        if (!isLoggedIn) {
            alert("Bạn cần đăng nhập để tải xuống biểu đồ");
            return;
        }

        const isForecast = mainTab === "forecast";
        const rangeStart = isForecast ? forecastStartDate : startDate;
        const rangeEnd = isForecast ? forecastEndDate : endDate;
        const chartElementId = isForecast ? "forecast-salinity-chart" : "salinity-chart";
        const filePrefix = isForecast ? "bieu_do_du_bao_do_man" : "bieu_do_do_man";

        try {
            await downloadChartImage({
                title: `Diễn biến độ mặn - ${displayStationName}`,
                subtitleHtml:
                    rangeStart && rangeEnd
                        ? `${isForecast ? "Dự báo" : "Quan trắc"} từ <strong>${rangeStart}</strong> đến <strong>${rangeEnd}</strong>`
                        : "",
                chartElementId,
                filename: `${filePrefix}_${filenameSafeName}_${new Date().getTime()}.png`,
            });
        } catch (error) {
            console.error("❌ Tải ảnh biểu đồ lỗi:", error);
            alert("Không thể tải ảnh biểu đồ.");
        }
    };

    // Dữ liệu đã được lọc bỏ các giá trị NULL từ useEffect. Dùng formatVNDate (không phải
    // .toLocaleDateString() mặc định) để luôn ra đúng ngày giờ VN bất kể múi giờ máy đang xem,
    // và khớp chính xác với giá trị min/max của input Giai đoạn (actualBounds/forecastBounds ở
    // trên cũng dùng chung logic quy đổi giờ VN này) - tránh lệch 1 ngày giữa tiêu đề và Giai đoạn.
    const startDate = data?.length > 0 ? formatVNDate(data[0].date) : null;
    const endDate = data?.length > 0 ? formatVNDate(data[data.length - 1].date) : null;

    const forecastStartDate =
        forecastState.points.length > 0 ? formatVNDate(forecastState.points[0].time) : null;
    const forecastEndDate =
        forecastState.points.length > 0
            ? formatVNDate(forecastState.points[forecastState.points.length - 1].time)
            : null;

    return (
        <div
            className={`modal fade map-data-modal salt-chart-modal ${show ? "show d-block" : ""}`}
            tabIndex="-1"
            style={{ backgroundColor: show ? "rgba(0,0,0,0.5)" : "transparent" }}
        >
            <div
                className="modal-dialog modal-xl modal-dialog-centered"
                style={{ maxWidth: "95%", width: "95%", height: "90vh" }}
            >
                <div className="modal-content" style={{ height: "100%", width: "100%" }}>
                    <div className="modal-header border-0 pb-0">
                        <div className="w-100 text-center">
                            <h5 className="modal-title mb-1 fw-bold">
                                Diễn biến độ mặn - {displayStationName}
                            </h5>
                            {mainTab === "forecast"
                                ? forecastStartDate &&
                                  forecastEndDate && (
                                      <div className="text-muted small">
                                          Dự báo từ <strong>{forecastStartDate}</strong> đến{" "}
                                          <strong>{forecastEndDate}</strong>
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

                    <div className="modal-body d-flex flex-column" style={{ minHeight: 0 }}>
                        <div className="chartfull-topbar mb-2">
                            <div className="chartfull-controls-row">
                                <ul className="nav nav-tabs mb-0" role="tablist">
                                    {hasForecast && (
                                        <li className="nav-item">
                                            <button
                                                className={`nav-link ${mainTab === "forecast" ? "active" : ""}`}
                                                id="main-forecast-tab"
                                                type="button"
                                                onClick={() => selectMainTab("forecast")}
                                            >
                                                Dự báo
                                            </button>
                                        </li>
                                    )}
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${mainTab === "actual" ? "active" : ""}`}
                                            id="main-actual-tab"
                                            type="button"
                                            onClick={() => selectMainTab("actual")}
                                        >
                                            Quan trắc
                                        </button>
                                    </li>
                                </ul>

                                <ul className="nav nav-pills nav-sm mb-0">
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${subTab === "chart" ? "active" : ""}`}
                                            id="chart-tab"
                                            type="button"
                                            onClick={() => setSubTab("chart")}
                                        >
                                            Biểu đồ
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${subTab === "data" ? "active" : ""}`}
                                            id="data-tab"
                                            type="button"
                                            onClick={() => setSubTab("data")}
                                        >
                                            Dữ liệu
                                        </button>
                                    </li>
                                </ul>

                                {mainTab === "actual" && (
                                    <div className="chartfull-topbar-controls ms-auto">
                                        <span className="small text-muted fw-semibold">Giai đoạn:</span>
                                        <LocalizedDateInput
                                            className="form-control form-control-sm"
                                            name="startDate"
                                            value={exportRange.startDate}
                                            onChange={handleDateRangeChange}
                                            min={actualBounds.min}
                                            max={actualBounds.max}
                                            style={{ width: 145, minWidth: 145 }}
                                        />
                                        <span className="small text-muted">-</span>
                                        <LocalizedDateInput
                                            className="form-control form-control-sm"
                                            name="endDate"
                                            value={exportRange.endDate}
                                            onChange={handleDateRangeChange}
                                            min={actualBounds.min}
                                            max={actualBounds.max}
                                            style={{ width: 145, minWidth: 145 }}
                                        />
                                        <select
                                            className="form-select form-select-sm"
                                            style={{ width: 100, minWidth: 100 }}
                                            value={findActivePresetKey(
                                                exportRange.startDate,
                                                exportRange.endDate,
                                                { startDate: actualBounds.min, endDate: actualBounds.max },
                                            )}
                                            onChange={(e) => applyActualPreset(e.target.value)}
                                        >
                                            <option value="" disabled>
                                                Chọn nhanh...
                                            </option>
                                            {DATE_RANGE_PRESETS.map((preset) => (
                                                <option key={preset.key} value={preset.key}>
                                                    {preset.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {mainTab === "forecast" && (
                                    <div className="chartfull-topbar-controls ms-auto">
                                        {subTab === "chart" && (
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
                                kiHieu={kiHieu}
                                className="risk-legend-row flex-nowrap justify-content-center mt-2 mb-0"
                            />
                        </div>

                        <div
                            className="tab-content h-100"
                            style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
                        >
                            {mainTab === "forecast" && hasForecast && (
                                <div className="h-100">
                                    {forecastState.loading ? (
                                        <p className="text-muted">Đang tải dữ liệu dự báo...</p>
                                    ) : forecastState.error ? (
                                        <p className="text-muted">{forecastState.error}</p>
                                    ) : forecastState.points.length > 0 ? (
                                        <>
                                            {subTab === "chart" ? (
                                                <div className="map-chart-pane h-100">
                                                    <div
                                                        id="forecast-salinity-chart"
                                                        className="map-chart-box"
                                                    >
                                                        <ForecastBarChart
                                                            data={
                                                                forecastFrequency === "ngay"
                                                                    ? dailyAggregatedPoints
                                                                    : biHourlyBarPoints
                                                            }
                                                            kiHieu={kiHieu}
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
                                                            onClick={downloadChart}
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
                                                        style={{ flex: 1, minHeight: 0 }}
                                                    >
                                                        <ForecastDataTable
                                                            points={filteredForecastPoints}
                                                            kiHieu={kiHieu}
                                                        />
                                                    </div>
                                                    <div className="d-flex gap-2 justify-content-between align-items-center">
                                                        <div className="text-muted small">
                                                            Hiển thị {filteredForecastPoints.length} bản ghi
                                                        </div>
                                                        <button
                                                            className={`btn btn-sm ${isLoggedIn ? "btn-outline-success" : "btn-outline-secondary"}`}
                                                            onClick={handleExportForecastExcel}
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
                                <div className="h-100">
                                    {subTab === "chart" ? (
                                        filteredData.length > 0 ? (
                                            <div className="map-chart-pane h-100">
                                                <div id="salinity-chart" className="map-chart-box">
                                                    <SalinityBarChart
                                                        data={filteredData}
                                                        height="100%"
                                                        kiHieu={kiHieu}
                                                    />
                                                </div>
                                                <div className="map-chart-footer mt-1 d-flex justify-content-between align-items-center">
                                                    <div className="text-muted small">
                                                        Hiển thị <strong>{filteredData.length}</strong> bản
                                                        ghi
                                                    </div>
                                                    <button
                                                        className={`btn btn-sm ${isLoggedIn ? "btn-outline-primary" : "btn-outline-secondary"}`}
                                                        onClick={downloadChart}
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
                                            <p className="text-muted">Không có dữ liệu hợp lệ.</p>
                                        )
                                    ) : detailLoading ? (
                                        <div className="text-center py-4">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Đang tải...</span>
                                            </div>
                                        </div>
                                    ) : filteredDetailData.length > 0 ? (
                                        <div className="h-100 d-flex flex-column" style={{ minHeight: 0 }}>
                                            <div
                                                className="map-data-scroll"
                                                style={{ flex: 1, minHeight: 0 }}
                                            >
                                                <ExportPreviewTable
                                                    data={filteredDetailData}
                                                    kiHieu={kiHieu}
                                                />
                                            </div>

                                            <div className="d-flex gap-2 justify-content-between align-items-center">
                                                <div className="text-muted small">
                                                    Hiển thị {filteredDetailData.length} bản ghi
                                                </div>
                                                <button
                                                    className={`btn btn-sm ${isLoggedIn ? "btn-outline-success" : "btn-outline-secondary"}`}
                                                    onClick={handleExportExcel}
                                                    disabled={
                                                        !exportRange.startDate ||
                                                        !exportRange.endDate ||
                                                        !isLoggedIn
                                                    }
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
                                    ) : (
                                        <p className="text-muted">Không có dữ liệu để hiển thị.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SaltChartFull;
