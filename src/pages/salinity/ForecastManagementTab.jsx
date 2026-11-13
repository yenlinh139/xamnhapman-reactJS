import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Loading from "../../components/Loading";
import ModalConfirm from "../../components/ModalConfirm";
import PaginationSalinity from "./PaginationSalinity";
import axiosInstance from "@config/axios-config";
import { ToastCommon } from "@/components/ToastCommon";
import { TOAST } from "@/common/constants";
import LocalizedDateInput from "@components/common/LocalizedDateInput";
import { useSortableRows } from "@common/useSortableRows";
import SortableHeader from "@components/common/SortableHeader";

const FORECAST_TIMEZONE = "Asia/Ho_Chi_Minh";
const FORECAST_TZ_OFFSET = "+07:00";
const ALL_RUNS = "__all__";

// Dự phòng khi /forecast-stations lỗi - khớp backend/src/configs/forecastStations.js
const FALLBACK_STATIONS = [
    { manualCode: "MNB", displayName: "Mũi Nhà Bè" },
    { manualCode: "PCL", displayName: "Phà Cát Lái" },
    { manualCode: "CTT", displayName: "Cầu Thủ Thiêm" },
    { manualCode: "COT", displayName: "Cầu Ông Thìn" },
    { manualCode: "CKC", displayName: "Cống Kênh C" },
    { manualCode: "KXAH", displayName: "Kênh Xáng đứng 1" },
    { manualCode: "CRT", displayName: "Cầu Rạch Tra" },
];

const DEFAULT_FILTERS = {
    runId: "",
    startDate: "",
    endDate: "",
};

const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

// Tách ngày/giờ theo giờ VN, bất kể offset server trả về
const toVnParts = (rawValue) => {
    const parsed = new Date(rawValue);
    if (!rawValue || Number.isNaN(parsed.getTime())) return null;

    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-GB", {
            timeZone: FORECAST_TIMEZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
        })
            .formatToParts(parsed)
            .map(({ type, value }) => [type, value]),
    );
    return parts;
};

const toDisplayDateTime = (rawValue) => {
    const parts = toVnParts(rawValue);
    if (!parts) return rawValue ? String(rawValue) : "-";
    return `${parts.hour}:${parts.minute} ${parts.day}/${parts.month}/${parts.year}`;
};

const toInputDateTimeValue = (rawValue) => {
    const parts = toVnParts(rawValue);
    if (!parts) return "";
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

// Chi lay phan ngay (YYYY-MM-DD, gio VN) - dung cho 2 o loc "Tu ngay"/"Den ngay"
const toInputDateValue = (rawValue) => {
    const parts = toVnParts(rawValue);
    if (!parts) return "";
    return `${parts.year}-${parts.month}-${parts.day}`;
};

// "2024-08-01T02:00" (giờ VN) -> "2024-08-01T02:00:00+07:00"
const fromInputDateTimeValue = (value) => (value ? `${value}:00${FORECAST_TZ_OFFSET}` : "");

const toNullableNumber = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const formatMetric = (value, digits = 2) => {
    const numericValue = toNullableNumber(value);
    return numericValue === null
        ? "-"
        : numericValue.toLocaleString("vi-VN", {
              minimumFractionDigits: digits,
              maximumFractionDigits: digits,
          });
};

const getRowKey = (row) => `${row.run_id}|${row.ThoiDiem}`;

const buildEmptyForm = (stations) => ({
    runId: "",
    ThoiDiem: "",
    ...Object.fromEntries(stations.map((s) => [s.manualCode, ""])),
    ...Object.fromEntries(stations.map((s) => [`${s.manualCode}_Daily`, ""])),
});

const ForecastManagementTab = ({ userInfo }) => {
    const [stations, setStations] = useState(FALLBACK_STATIONS);
    const [runs, setRuns] = useState([]);
    const [rows, setRows] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(20);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
    const [isExporting, setIsExporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState([]);

    const [showDataModal, setShowDataModal] = useState(false);
    const [dataModalMode, setDataModalMode] = useState("create");
    const [dataForm, setDataForm] = useState(() => buildEmptyForm(FALLBACK_STATIONS));
    const [dataFormErrors, setDataFormErrors] = useState({});

    // { type: "rows" | "run", target }
    const [deleteConfig, setDeleteConfig] = useState({ type: null, target: null });

    const selectedRunId = filters.runId === ALL_RUNS ? "" : filters.runId;
    const selectedRun = useMemo(
        () => runs.find((run) => run.run_id === selectedRunId),
        [runs, selectedRunId],
    );
    const showRunColumn = filters.runId === ALL_RUNS;

    // Khoảng ngày thực tế hiện có (khóa "Từ ngày"/"Đến ngày" trong khoảng này) - của đúng lượt
    // dự báo đang chọn, hoặc khoảng CHUNG (min current_time/forecast_start_at - max
    // forecast_end_at) của mọi lượt khi đang chọn "Tất cả lượt".
    const forecastDateRange = useMemo(() => {
        if (selectedRun) {
            return {
                minDate: selectedRun.current_time ?? selectedRun.forecast_start_at,
                maxDate: selectedRun.forecast_end_at,
            };
        }
        let minDate = null;
        let maxDate = null;
        runs.forEach((run) => {
            const start = run.current_time ?? run.forecast_start_at;
            if (start && (!minDate || start < minDate)) minDate = start;
            if (run.forecast_end_at && (!maxDate || run.forecast_end_at > maxDate)) maxDate = run.forecast_end_at;
        });
        return { minDate, maxDate };
    }, [selectedRun, runs]);
    const forecastMinDate = forecastDateRange.minDate ? toInputDateValue(forecastDateRange.minDate) : "";
    const forecastMaxDate = forecastDateRange.maxDate ? toInputDateValue(forecastDateRange.maxDate) : "";

    const loadStations = useCallback(async () => {
        try {
            const response = await axiosInstance.get("/forecast-stations");
            const list = Array.isArray(response?.data) ? response.data.filter((s) => s.hasForecast) : [];
            if (list.length > 0) setStations(list);
        } catch (stationError) {
            console.error("Error loading forecast stations:", stationError);
        }
    }, []);

    const loadRuns = useCallback(async () => {
        try {
            const response = await axiosInstance.get("/forecast-runs");
            const list = Array.isArray(response?.data?.data) ? response.data.data : [];
            setRuns(list);
            // Mặc định chọn lượt dự báo mới nhất; nếu lượt đang chọn bị xóa thì quay về mới nhất
            setFilters((prev) => {
                if (prev.runId === ALL_RUNS) return prev;
                if (prev.runId && list.some((run) => run.run_id === prev.runId)) return prev;
                return { ...prev, runId: list[0]?.run_id || ALL_RUNS };
            });
        } catch (runError) {
            console.error("Error loading forecast runs:", runError);
            setFilters((prev) => (prev.runId ? prev : { ...prev, runId: ALL_RUNS }));
        }
    }, []);

    useEffect(() => {
        loadStations();
        loadRuns();
    }, [loadStations, loadRuns]);

    // Mac dinh "Tu ngay"/"Den ngay" la min/max cua chuoi du bao dang chon, de nguoi dung
    // "Tu ngay" mac dinh la moc "hien tai" cua lượt dự báo (current_time - xem backend
    // forecastData.controller.js), khong phai forecast_start_at co dinh: voi du lieu demo co
    // dinh trong qua khu, "hien tai" trung diem dau nen hien dung nhu truoc; khi co du lieu
    // that dang van hanh, "hien tai" se tu roi dung vi tri trong chuoi thay vi luon la ngay
    // bat dau. "Den ngay" luon la moc cuoi (forecast_end_at). Khong ghi de neu nguoi dung da
    // tu nhap (chi dien khi con trong).
    useEffect(() => {
        if (!forecastMinDate && !forecastMaxDate) return;
        setFilters((prev) => {
            if (prev.startDate && prev.endDate) return prev;
            return {
                ...prev,
                startDate: prev.startDate || forecastMinDate,
                endDate: prev.endDate || forecastMaxDate,
            };
        });
    }, [forecastMinDate, forecastMaxDate]);

    const buildQueryParams = useCallback(
        (page, pageLimit) => {
            const params = { page, limit: pageLimit };
            if (selectedRunId) params.runId = selectedRunId;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            return params;
        },
        [filters.endDate, filters.startDate, selectedRunId],
    );

    const loadForecastData = useCallback(async () => {
        // Chờ loadRuns chọn lượt mặc định trước khi tải
        if (!filters.runId) return;

        try {
            setDataLoading(true);
            setError("");

            const response = await axiosInstance.get("/forecast-values", {
                params: buildQueryParams(currentPage, limit),
            });
            const result = response?.data;
            const nextRows = Array.isArray(result?.data) ? result.data : [];

            setRows(nextRows);
            setPagination({
                page: result?.pagination?.page || currentPage,
                totalPages: result?.pagination?.totalPages || 1,
                total: result?.pagination?.total || nextRows.length,
                limit: result?.pagination?.limit || limit,
            });
        } catch (loadError) {
            console.error("Error loading forecast data:", loadError);
            setRows([]);
            setPagination({ page: currentPage, totalPages: 1, total: 0, limit });
            setError(getErrorMessage(loadError, "Không tải được dữ liệu dự báo."));
        } finally {
            setDataLoading(false);
        }
    }, [buildQueryParams, currentPage, filters.runId, limit]);

    useEffect(() => {
        loadForecastData();
    }, [loadForecastData]);

    useEffect(() => {
        setSelectedKeys([]);
    }, [filters, currentPage]);

    const reloadAll = async () => {
        await loadRuns();
        await loadForecastData();
    };

    const handleFilterChange = (name, value) => {
        setCurrentPage(1);
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setCurrentPage(1);
        const targetRunId = runs[0]?.run_id || ALL_RUNS;
        const targetRun = runs.find((run) => run.run_id === targetRunId);
        setFilters({
            runId: targetRunId,
            startDate: targetRun
                ? toInputDateValue(targetRun.current_time ?? targetRun.forecast_start_at)
                : "",
            endDate: targetRun ? toInputDateValue(targetRun.forecast_end_at) : "",
        });
    };

    const toggleRowSelection = (row, isSelected) => {
        const key = getRowKey(row);
        setSelectedKeys((prev) => (isSelected ? [...prev, key] : prev.filter((k) => k !== key)));
    };

    const allSelected = rows.length > 0 && rows.every((row) => selectedKeys.includes(getRowKey(row)));

    const toggleSelectAll = (isSelected) => {
        setSelectedKeys(isSelected ? rows.map(getRowKey) : []);
    };

    const handleSync = async () => {
        try {
            setIsSyncing(true);
            const response = await axiosInstance.post("/forecast-sync");
            ToastCommon(TOAST.SUCCESS, response?.data?.message || "Đồng bộ dữ liệu dự báo thành công");
            await reloadAfterSync(response?.data?.data?.runId);
        } catch (syncError) {
            console.error("Error syncing forecast:", syncError);
            ToastCommon(TOAST.ERROR, getErrorMessage(syncError, "Không thể đồng bộ dữ liệu dự báo"));
        } finally {
            setIsSyncing(false);
        }
    };

    // Sau khi đồng bộ, chuyển sang lượt vừa lấy về để người dùng thấy ngay
    const reloadAfterSync = async (runId) => {
        await loadRuns();
        if (runId) {
            setCurrentPage(1);
            setFilters((prev) => ({ ...prev, runId }));
        } else {
            await loadForecastData();
        }
    };

    const openCreateDataModal = () => {
        setDataModalMode("create");
        setDataForm({ ...buildEmptyForm(stations), runId: selectedRunId || runs[0]?.run_id || "" });
        setDataFormErrors({});
        setShowDataModal(true);
    };

    const openEditDataModal = (row) => {
        setDataModalMode("edit");
        setDataForm({
            runId: row.run_id,
            ThoiDiem: toInputDateTimeValue(row.ThoiDiem),
            originalThoiDiem: row.ThoiDiem,
            ...Object.fromEntries(
                stations.map((s) => [s.manualCode, toNullableNumber(row[s.manualCode]) ?? ""]),
            ),
            ...Object.fromEntries(
                stations.map((s) => [
                    `${s.manualCode}_Daily`,
                    toNullableNumber(row[`${s.manualCode}_Daily`]) ?? "",
                ]),
            ),
        });
        setDataFormErrors({});
        setShowDataModal(true);
    };

    const handleSaveData = async (event) => {
        event.preventDefault();

        const nextErrors = {};
        if (!dataForm.runId) nextErrors.runId = "Vui lòng chọn lượt dự báo";
        if (!dataForm.ThoiDiem) nextErrors.ThoiDiem = "Thời điểm là bắt buộc";
        if (Object.keys(nextErrors).length > 0) {
            setDataFormErrors(nextErrors);
            return;
        }
        setDataFormErrors({});

        const payload = {
            runId: dataForm.runId,
            ThoiDiem:
                dataModalMode === "edit"
                    ? dataForm.originalThoiDiem
                    : fromInputDateTimeValue(dataForm.ThoiDiem),
            ...Object.fromEntries(
                stations.map((s) => [s.manualCode, toNullableNumber(dataForm[s.manualCode])]),
            ),
            ...Object.fromEntries(
                stations.map((s) => [
                    `${s.manualCode}_Daily`,
                    toNullableNumber(dataForm[`${s.manualCode}_Daily`]),
                ]),
            ),
        };

        try {
            if (dataModalMode === "create") {
                await axiosInstance.post("/forecast-values", payload);
                ToastCommon(TOAST.SUCCESS, "Thêm dữ liệu dự báo thành công");
            } else {
                await axiosInstance.put("/forecast-values", payload);
                ToastCommon(TOAST.SUCCESS, "Cập nhật dữ liệu dự báo thành công");
            }

            setShowDataModal(false);
            await reloadAll();
        } catch (saveError) {
            console.error("Error saving forecast data:", saveError);
            ToastCommon(TOAST.ERROR, getErrorMessage(saveError, "Không thể lưu dữ liệu dự báo"));
        }
    };

    const confirmDelete = async () => {
        try {
            if (deleteConfig.type === "run") {
                await axiosInstance.delete(`/forecast-runs/${encodeURIComponent(deleteConfig.target)}`);
                ToastCommon(TOAST.SUCCESS, "Xóa lượt dự báo thành công");
            } else {
                const items = deleteConfig.target.map((key) => {
                    const separatorIndex = key.lastIndexOf("|");
                    return { runId: key.slice(0, separatorIndex), ThoiDiem: key.slice(separatorIndex + 1) };
                });
                const response = await axiosInstance.delete("/forecast-values", { data: { items } });
                ToastCommon(TOAST.SUCCESS, response?.data?.message || "Xóa dữ liệu dự báo thành công");
            }

            setDeleteConfig({ type: null, target: null });
            setSelectedKeys([]);
            await reloadAll();
        } catch (deleteError) {
            console.error("Error deleting forecast data:", deleteError);
            ToastCommon(TOAST.ERROR, getErrorMessage(deleteError, "Không thể xóa dữ liệu dự báo"));
        }
    };

    const exportForecastData = async (fileType) => {
        try {
            setIsExporting(true);
            const exportLimit = pagination.total || rows.length || 1000;

            const response = await axiosInstance.get("/forecast-values", {
                params: buildQueryParams(1, exportLimit),
            });
            const exportRows = Array.isArray(response?.data?.data) ? response.data.data : [];

            if (exportRows.length === 0) {
                ToastCommon(TOAST.ERROR, "Không có dữ liệu dự báo để xuất theo bộ lọc hiện tại");
                return;
            }

            const worksheetData = exportRows.map((row, index) => ({
                STT: index + 1,
                "Lượt dự báo": row.run_id,
                "Thời điểm": toDisplayDateTime(row.ThoiDiem),
                ...Object.fromEntries(
                    stations.map((s) => [
                        `${s.displayName} (${s.manualCode}) - 2h`,
                        toNullableNumber(row[s.manualCode]) ?? "",
                    ]),
                ),
                ...Object.fromEntries(
                    stations.map((s) => [
                        `${s.displayName} (${s.manualCode}) - ngày`,
                        toNullableNumber(row[`${s.manualCode}_Daily`]) ?? "",
                    ]),
                ),
            }));

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "DuLieuDuBao");

            const fileName = `du_lieu_du_bao_${selectedRunId || "tat_ca"}_${filters.startDate || "tat_ca"}_${filters.endDate || "tat_ca"}.${fileType}`;
            XLSX.writeFile(workbook, fileName, { bookType: fileType === "csv" ? "csv" : "xlsx" });
            ToastCommon(TOAST.SUCCESS, `Xuất file ${fileType.toUpperCase()} thành công`);
        } catch (exportError) {
            console.error(`Error exporting forecast ${fileType}:`, exportError);
            ToastCommon(TOAST.ERROR, `Không thể xuất file ${fileType.toUpperCase()}`);
        } finally {
            setIsExporting(false);
        }
    };

    const getSortValue = useCallback((row, key) => {
        if (key === "ThoiDiem") return new Date(row.ThoiDiem).getTime();
        return row[key];
    }, []);
    const { sortedRows, sortConfig, handleSort } = useSortableRows(rows, {
        defaultKey: "ThoiDiem",
        defaultDirection: "desc",
        getSortValue,
    });

    return (
        <div className="forecast-management-tab">
            {dataLoading && !rows.length && <Loading />}

            <div className="filter-section">
                <div className="filter-row">
                    <div className="filter-left">
                        <div className="filter-group filter-group-date">
                            <label htmlFor="forecastStartDate">Từ ngày:</label>
                            <LocalizedDateInput
                                id="forecastStartDate"
                                className="filter-input"
                                value={filters.startDate}
                                min={forecastMinDate || undefined}
                                max={filters.endDate || forecastMaxDate || undefined}
                                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                            />
                        </div>

                        <div className="filter-group filter-group-date">
                            <label htmlFor="forecastEndDate">Đến ngày:</label>
                            <LocalizedDateInput
                                id="forecastEndDate"
                                className="filter-input"
                                value={filters.endDate}
                                min={filters.startDate || forecastMinDate || undefined}
                                max={forecastMaxDate || undefined}
                                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                            />
                        </div>

                        <div className="filter-actions d-flex gap-2 flex-nowrap align-items-end">
                            <button className="btn btn-secondary" onClick={clearFilters}>
                                Xóa bộ lọc
                            </button>
                            <button
                                className="btn btn-success"
                                onClick={() => exportForecastData("xlsx")}
                                disabled={dataLoading || isExporting}
                            >
                                <i className="fas fa-file-excel me-1"></i>
                                {isExporting ? "Đang xuất..." : "Xuất Excel"}
                            </button>
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => exportForecastData("csv")}
                                disabled={dataLoading || isExporting}
                            >
                                <i className="fas fa-file-csv me-1"></i>
                                {isExporting ? "Đang xuất..." : "Xuất CSV"}
                            </button>
                        </div>
                    </div>

                    <div className="filter-right d-flex gap-2 flex-nowrap justify-content-end align-items-end">
                        {userInfo && (
                            <>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={handleSync}
                                    disabled={isSyncing}
                                >
                                    <i className={`fas fa-sync-alt me-1 ${isSyncing ? "fa-spin" : ""}`}></i>
                                    {isSyncing ? "Đang đồng bộ..." : "Đồng bộ dự báo"}
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={openCreateDataModal}
                                    disabled={runs.length === 0}
                                >
                                    <i className="fas fa-plus me-1"></i>
                                    Thêm dữ liệu dự báo
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {selectedRun && (
                <div className="d-flex flex-wrap align-items-center gap-3 mb-3 small text-muted">
                    <span>
                        <strong>Mã lượt:</strong> {selectedRun.run_id}
                    </span>
                    <span>
                        <strong>Phát hành:</strong> {toDisplayDateTime(selectedRun.issued_at)}
                    </span>
                    <span>
                        <strong>Bắt đầu dự báo:</strong> {toDisplayDateTime(selectedRun.forecast_start_at)}
                    </span>
                    <span>
                        <strong>Bước thời gian:</strong> {selectedRun.interval_hours ?? "-"} giờ
                    </span>
                    <span>
                        <strong>Tầm dự báo:</strong> {selectedRun.horizon_days ?? "-"} ngày
                    </span>
                    <span>
                        <strong>Số mốc:</strong> {selectedRun.value_count}
                    </span>
                    {selectedRun.is_synthetic && (
                        <span className="badge bg-warning text-dark">Dữ liệu giả lập</span>
                    )}
                    {userInfo && (
                        <button
                            className="btn btn-sm btn-outline-danger ms-auto"
                            onClick={() => setDeleteConfig({ type: "run", target: selectedRun.run_id })}
                        >
                            <i className="fas fa-trash me-1"></i>
                            Xóa lượt dự báo
                        </button>
                    )}
                </div>
            )}

            {selectedKeys.length > 0 && userInfo && (
                <div className="bulk-actions">
                    <span className="selection-count">Đã chọn {selectedKeys.length} bản ghi</span>
                    <button
                        className="btn btn-danger"
                        onClick={() => setDeleteConfig({ type: "rows", target: selectedKeys })}
                    >
                        <i className="fas fa-trash"></i>
                        Xóa đã chọn
                    </button>
                </div>
            )}

            {error && (
                <div className="error-message">
                    <i className="fas fa-exclamation-triangle"></i>
                    {error}
                </div>
            )}

            {rows.length === 0 ? (
                <div className="no-data">
                    <i className="fas fa-chart-line"></i>
                    <h3>Không có dữ liệu dự báo</h3>
                    <p>Chưa có dữ liệu dự báo nào theo bộ lọc hiện tại.</p>
                </div>
            ) : (
                <div className="table-container">
                    <div className="table-responsive rounded-3 border border-primary-subtle shadow-sm bg-white">
                        <table className="table table-striped table-hover align-middle mb-0">
                            <thead className="table-primary">
                                <tr>
                                    {userInfo && (
                                        <th style={{ width: 40 }}>
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={allSelected}
                                                onChange={(e) => toggleSelectAll(e.target.checked)}
                                            />
                                        </th>
                                    )}
                                    <th>#</th>
                                    <SortableHeader label="Thời điểm" sortKey="ThoiDiem" sortConfig={sortConfig} onSort={handleSort} />
                                    {showRunColumn && <th>Lượt dự báo</th>}
                                    {stations.map((s) => (
                                        <th
                                            key={s.manualCode}
                                            title={`${s.displayName} - trên: theo 2h (do_man), dưới: theo ngày (DailyForecast)`}
                                        >
                                            {s.manualCode} (‰)
                                        </th>
                                    ))}
                                    {userInfo && <th style={{ width: 160 }}>Thao tác</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRows.map((row, index) => {
                                    const rowKey = getRowKey(row);
                                    return (
                                        <tr key={rowKey}>
                                            {userInfo && (
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        checked={selectedKeys.includes(rowKey)}
                                                        onChange={(e) =>
                                                            toggleRowSelection(row, e.target.checked)
                                                        }
                                                    />
                                                </td>
                                            )}
                                            <td>{(currentPage - 1) * limit + index + 1}</td>
                                            <td>{toDisplayDateTime(row.ThoiDiem)}</td>
                                            {showRunColumn && <td className="small">{row.run_id}</td>}
                                            {stations.map((s) => (
                                                <td key={s.manualCode}>
                                                    <div>{formatMetric(row[s.manualCode], 2)}</div>
                                                    <div className="text-muted small">
                                                        {formatMetric(row[`${s.manualCode}_Daily`], 2)}
                                                    </div>
                                                </td>
                                            ))}
                                            {userInfo && (
                                                <td>
                                                    <div className="d-flex gap-2">
                                                        <button
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => openEditDataModal(row)}
                                                        >
                                                            Sửa
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-danger"
                                                            onClick={() =>
                                                                setDeleteConfig({
                                                                    type: "rows",
                                                                    target: [rowKey],
                                                                })
                                                            }
                                                        >
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {pagination.totalPages > 1 && (
                        <div className="pagination-container mt-3">
                            <PaginationSalinity
                                currentPage={currentPage}
                                totalPages={pagination.totalPages}
                                onPageChange={setCurrentPage}
                                totalRecords={pagination.total}
                                recordsPerPage={pagination.limit || limit}
                            />
                        </div>
                    )}
                </div>
            )}

            {showDataModal && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content">
                            <form onSubmit={handleSaveData}>
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        {dataModalMode === "create"
                                            ? "Thêm dữ liệu dự báo"
                                            : "Cập nhật dữ liệu dự báo"}
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowDataModal(false)}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label required">Lượt dự báo</label>
                                            <select
                                                className={`form-control ${dataFormErrors.runId ? "is-invalid" : ""}`}
                                                value={dataForm.runId}
                                                disabled={dataModalMode === "edit"}
                                                onChange={(e) =>
                                                    setDataForm((prev) => ({
                                                        ...prev,
                                                        runId: e.target.value,
                                                    }))
                                                }
                                            >
                                                <option value="" disabled>
                                                    Chọn lượt dự báo
                                                </option>
                                                {runs.map((run) => (
                                                    <option key={run.run_id} value={run.run_id}>
                                                        {toDisplayDateTime(run.forecast_start_at)} -{" "}
                                                        {run.run_id}
                                                    </option>
                                                ))}
                                            </select>
                                            {dataFormErrors.runId && (
                                                <div className="error-text">{dataFormErrors.runId}</div>
                                            )}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label required">Thời điểm (giờ VN)</label>
                                            <input
                                                type="datetime-local"
                                                className={`form-control ${dataFormErrors.ThoiDiem ? "is-invalid" : ""}`}
                                                value={dataForm.ThoiDiem}
                                                disabled={dataModalMode === "edit"}
                                                onChange={(e) =>
                                                    setDataForm((prev) => ({
                                                        ...prev,
                                                        ThoiDiem: e.target.value,
                                                    }))
                                                }
                                            />
                                            {dataFormErrors.ThoiDiem && (
                                                <div className="error-text">{dataFormErrors.ThoiDiem}</div>
                                            )}
                                        </div>
                                        {stations.map((s) => (
                                            <React.Fragment key={s.manualCode}>
                                                <div className="col-md-3">
                                                    <label className="form-label">
                                                        {s.displayName} ({s.manualCode}) - theo 2h
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="form-control"
                                                        value={dataForm[s.manualCode]}
                                                        onChange={(e) =>
                                                            setDataForm((prev) => ({
                                                                ...prev,
                                                                [s.manualCode]: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                                <div className="col-md-3">
                                                    <label className="form-label">
                                                        {s.manualCode} - theo ngày
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="form-control"
                                                        value={dataForm[`${s.manualCode}_Daily`]}
                                                        onChange={(e) =>
                                                            setDataForm((prev) => ({
                                                                ...prev,
                                                                [`${s.manualCode}_Daily`]: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                </div>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowDataModal(false)}
                                    >
                                        Hủy
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        {dataModalMode === "create" ? "Thêm mới" : "Lưu thay đổi"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfig?.type && deleteConfig?.target && (
                <ModalConfirm
                    title={
                        deleteConfig.type === "run"
                            ? "Xác nhận xóa lượt dự báo"
                            : "Xác nhận xóa dữ liệu dự báo"
                    }
                    message={
                        deleteConfig.type === "run"
                            ? `Bạn có chắc chắn muốn xóa lượt dự báo ${deleteConfig.target} cùng toàn bộ dữ liệu của lượt này?`
                            : `Bạn có chắc chắn muốn xóa ${deleteConfig.target.length} bản ghi dự báo đã chọn?`
                    }
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteConfig({ type: null, target: null })}
                    confirmText="Xóa"
                    cancelText="Hủy"
                    type="danger"
                />
            )}
        </div>
    );
};

export default ForecastManagementTab;
