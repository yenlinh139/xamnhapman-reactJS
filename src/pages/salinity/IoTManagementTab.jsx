import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Loading from "../../components/Loading";
import ModalConfirm from "../../components/ModalConfirm";
import PaginationSalinity from "./PaginationSalinity";
import axiosInstance from "@config/axios-config";
import { fetchAllIoTData, fetchIoTStations } from "@components/map/mapDataServices";
import { ToastCommon } from "@/components/ToastCommon";
import { TOAST } from "@/common/constants";

const formatDateDisplay = (dateString) => {
    if (!dateString) return "";
    const raw = String(dateString).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [year, month, day] = raw.split("-");
        return `${day}/${month}/${year}`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;

    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
};

const normalizeDateInputText = (value) => {
    const digits = String(value || "")
        .replace(/\D/g, "")
        .slice(0, 8);

    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const parseDisplayDateToIso = (value) => {
    if (!value) return "";
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null;

    const [day, month, year] = value.split("/");
    const isoDate = `${year}-${month}-${day}`;
    const parsedDate = new Date(isoDate);
    return Number.isNaN(parsedDate.getTime()) ? null : isoDate;
};

const TODAY_ISO = new Date().toISOString().slice(0, 10);

const DEFAULT_IOT_FILTERS = {
    serialNumber: "",
    startDate: "2025-08-25",
    endDate: TODAY_ISO,
};

const DEFAULT_IOT_INPUT_FILTERS = {
    startDate: formatDateDisplay(DEFAULT_IOT_FILTERS.startDate),
    endDate: formatDateDisplay(DEFAULT_IOT_FILTERS.endDate),
};

const DEFAULT_IOT_DATA_FORM = {
    id: "",
    serial_number: "",
    date_time: "",
    salt_value: "",
    distance_value: "",
    daily_rainfall_value: "",
    temp_value: "",
};

const asArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
};

const toInputDateTimeValue = (rawValue) => {
    if (!rawValue) return "";
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return "";

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    const hours = String(parsed.getHours()).padStart(2, "0");
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toDisplayDateTime = (rawValue) => {
    if (!rawValue) return "-";
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return String(rawValue);

    const dateText = parsed.toLocaleDateString("vi-VN");
    const timeText = parsed.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
    });
    return `${timeText} ${dateText}`;
};

const toNullableNumber = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const numericValue = Number(String(value).replace(",", "."));
    return Number.isNaN(numericValue) ? null : numericValue;
};

const formatMetric = (value, digits = 2) => {
    const numericValue = toNullableNumber(value);
    return numericValue === null ? "-" : numericValue.toFixed(digits);
};

const sanitizePayload = (payload) => {
    return Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value !== "" && value !== null && value !== undefined),
    );
};

const buildPaginationState = (payload, fallbackPage, fallbackLimit, fallbackLength) => {
    const pagination = payload?.pagination;

    return {
        page: pagination?.page || fallbackPage,
        totalPages: pagination?.totalPages || pagination?.pages || 1,
        total: pagination?.total || fallbackLength,
        limit: pagination?.limit || fallbackLimit,
    };
};

const getStationTotalRecordsValue = (station) => {
    const total = station?.total_records ?? station?.totalRecords ?? station?.record_count ?? station?.count ?? 0;
    const numericTotal = Number(total);
    return Number.isFinite(numericTotal) ? numericTotal : 0;
};

const IoTManagementTab = ({ userInfo }) => {
    const [iotDataRows, setIotDataRows] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(20);
    const [filters, setFilters] = useState(DEFAULT_IOT_FILTERS);
    const [inputDateFilter, setInputDateFilter] = useState(DEFAULT_IOT_INPUT_FILTERS);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });
    const [isExporting, setIsExporting] = useState(false);
    const [stationOptions, setStationOptions] = useState([]);

    const [showDataModal, setShowDataModal] = useState(false);
    const [dataModalMode, setDataModalMode] = useState("create");
    const [dataForm, setDataForm] = useState(DEFAULT_IOT_DATA_FORM);

    const [deleteConfig, setDeleteConfig] = useState({ type: null, target: null });

    const stationFilterOptions = useMemo(() => {
        const seenStations = new Map();

        stationOptions.forEach((station) => {
            const serial =
                station.serial_number ||
                station.serialNumber ||
                station.DeviceSerialNumber ||
                station.serial ||
                station.code ||
                "";
            const name = station.station_name || station.stationName || station.name || serial || "Trạm IoT";

            if (serial && !seenStations.has(serial)) {
                seenStations.set(serial, { serial, name });
            }
        });

        iotDataRows.forEach((row) => {
            const serial = row.serial_number || row.serialNumber || row.DeviceSerialNumber || "";
            const name = row.station_name || row.stationName || serial || "Trạm IoT";

            if (serial && !seenStations.has(serial)) {
                seenStations.set(serial, { serial, name });
            }
        });

        if (filters.serialNumber && !seenStations.has(filters.serialNumber)) {
            seenStations.set(filters.serialNumber, {
                serial: filters.serialNumber,
                name: filters.serialNumber,
            });
        }

        return Array.from(seenStations.values());
    }, [filters.serialNumber, iotDataRows, stationOptions]);

    const loadStationOptions = useCallback(async () => {
        try {
            const result = await fetchIoTStations();
            setStationOptions(asArray(result));
        } catch (stationError) {
            console.error("Error loading IoT stations:", stationError);
        }
    }, []);

    useEffect(() => {
        loadStationOptions();
    }, [loadStationOptions]);

    const loadIotData = useCallback(async () => {
        try {
            setDataLoading(true);
            setError("");

            const result = await fetchAllIoTData({
                page: currentPage,
                limit,
                serialNumber: filters.serialNumber,
                startDate: filters.startDate,
                endDate: filters.endDate,
                sortBy: "date_time",
                sortOrder: "desc",
            });

            const rows = asArray(result);
            const basePagination = buildPaginationState(result, currentPage, limit, rows.length);
            const explicitTotal = Number(result?.pagination?.total);
            const hasExplicitTotal = Number.isFinite(explicitTotal) && explicitTotal > 0;
            const selectedStationTotal = filters.serialNumber
                ? getStationTotalRecordsValue(
                      stationOptions.find((station) => {
                          const serial =
                              station?.serial_number ||
                              station?.serialNumber ||
                              station?.DeviceSerialNumber ||
                              station?.serial ||
                              station?.code ||
                              "";
                          return serial === filters.serialNumber;
                      }),
                  )
                : stationOptions.reduce((sum, station) => sum + getStationTotalRecordsValue(station), 0);
            const resolvedTotal = hasExplicitTotal ? explicitTotal : selectedStationTotal || basePagination.total || rows.length;
            const resolvedLimit = basePagination.limit || limit;

            setIotDataRows(rows);
            setPagination({
                ...basePagination,
                total: resolvedTotal,
                totalPages: Math.max(1, Math.ceil(resolvedTotal / resolvedLimit)),
            });

            if (result?.success === false && result?.message) {
                setError(result.message);
            }
        } catch (loadError) {
            console.error("Error loading IoT data:", loadError);
            setIotDataRows([]);
            setPagination({ page: currentPage, totalPages: 1, total: 0, limit });
            setError(loadError?.response?.data?.message || loadError?.message || "Không tải được dữ liệu IoT.");
        } finally {
            setDataLoading(false);
        }
    }, [currentPage, filters.endDate, filters.serialNumber, filters.startDate, limit, stationOptions]);

    useEffect(() => {
        loadIotData();
    }, [loadIotData]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const nextStartDate = inputDateFilter.startDate
                ? parseDisplayDateToIso(inputDateFilter.startDate)
                : "";
            const nextEndDate = inputDateFilter.endDate
                ? parseDisplayDateToIso(inputDateFilter.endDate)
                : "";

            const startDateValid = !inputDateFilter.startDate || Boolean(nextStartDate);
            const endDateValid = !inputDateFilter.endDate || Boolean(nextEndDate);

            if (startDateValid && endDateValid) {
                setCurrentPage(1);
                setFilters((prev) => ({
                    ...prev,
                    startDate: nextStartDate,
                    endDate: nextEndDate,
                }));
            }
        }, 400);

        return () => clearTimeout(timeoutId);
    }, [inputDateFilter.endDate, inputDateFilter.startDate]);

    const handleFilterChange = (name, value) => {
        setCurrentPage(1);
        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const clearFilters = () => {
        setCurrentPage(1);
        setFilters(DEFAULT_IOT_FILTERS);
        setInputDateFilter(DEFAULT_IOT_INPUT_FILTERS);
    };

    const openCreateDataModal = () => {
        setDataModalMode("create");
        setDataForm({
            ...DEFAULT_IOT_DATA_FORM,
            serial_number: filters.serialNumber || "",
        });
        setShowDataModal(true);
    };

    const openEditDataModal = (row) => {
        setDataModalMode("edit");
        setDataForm({
            id: row.id || row._id || "",
            serial_number: row.serial_number || row.serialNumber || row.DeviceSerialNumber || "",
            date_time: toInputDateTimeValue(row.date_time || row.Date || row.timestamp),
            salt_value: row.salt_value ?? row.salt_value_avg ?? "",
            distance_value: row.distance_value ?? row.distance_value_avg ?? "",
            daily_rainfall_value: row.daily_rainfall_value ?? row.daily_rainfall_value_sum ?? "",
            temp_value: row.temp_value ?? row.temp_value_avg ?? "",
        });
        setShowDataModal(true);
    };

    const handleSaveData = async (event) => {
        event.preventDefault();

        try {
            const payload = sanitizePayload({
                serial_number: dataForm.serial_number,
                date_time: dataForm.date_time ? new Date(dataForm.date_time).toISOString() : "",
                salt_value: toNullableNumber(dataForm.salt_value),
                distance_value: toNullableNumber(dataForm.distance_value),
                daily_rainfall_value: toNullableNumber(dataForm.daily_rainfall_value),
                temp_value: toNullableNumber(dataForm.temp_value),
            });

            if (!payload.serial_number || !payload.date_time) {
                ToastCommon(TOAST.ERROR, "Vui lòng chọn trạm và thời gian đo");
                return;
            }

            if (dataModalMode === "create") {
                await axiosInstance.post("/iot/data", payload);
                ToastCommon(TOAST.SUCCESS, "Thêm dữ liệu IoT thành công");
            } else {
                await axiosInstance.put(`/iot/data/${dataForm.id}`, payload);
                ToastCommon(TOAST.SUCCESS, "Cập nhật dữ liệu IoT thành công");
            }

            setShowDataModal(false);
            setDataForm(DEFAULT_IOT_DATA_FORM);
            await loadIotData();
        } catch (saveError) {
            console.error("Error saving IoT data:", saveError);
            ToastCommon(
                TOAST.ERROR,
                saveError?.response?.data?.message || saveError?.message || "Không thể lưu dữ liệu IoT",
            );
        }
    };

    const confirmDelete = async () => {
        if (!deleteConfig?.target) return;

        try {
            await axiosInstance.delete(`/iot/data/${deleteConfig.target.id || deleteConfig.target._id}`);
            ToastCommon(TOAST.SUCCESS, "Xóa dữ liệu IoT thành công");

            setDeleteConfig({ type: null, target: null });
            await loadIotData();
        } catch (deleteError) {
            console.error("Error deleting IoT entity:", deleteError);
            ToastCommon(
                TOAST.ERROR,
                deleteError?.response?.data?.message || deleteError?.message || "Không thể xóa dữ liệu IoT",
            );
        }
    };

    const exportIotData = async (fileType) => {
        try {
            setIsExporting(true);
            const exportLimit = pagination.total || iotDataRows.length || 1000;

            const result = await fetchAllIoTData({
                page: 1,
                limit: exportLimit,
                serialNumber: filters.serialNumber,
                startDate: filters.startDate,
                endDate: filters.endDate,
                sortBy: "date_time",
                sortOrder: "desc",
            });

            const rows = asArray(result);
            if (rows.length === 0) {
                ToastCommon(TOAST.ERROR, "Không có dữ liệu IoT để xuất theo bộ lọc hiện tại");
                return;
            }

            const worksheetData = rows.map((row, index) => ({
                STT: index + 1,
                "Tên trạm": row.station_name || row.stationName || "Trạm IoT",
                "Serial Number": row.serial_number || row.serialNumber || row.DeviceSerialNumber || "",
                "Thời gian": toDisplayDateTime(row.date_time || row.Date || row.timestamp),
                "Độ mặn (‰)": formatMetric(row.salt_value ?? row.salt_value_avg, 4),
                "Mực nước (m)": formatMetric(row.distance_value ?? row.distance_value_avg, 4),
                "Lượng mưa ngày (mm)": formatMetric(row.daily_rainfall_value ?? row.daily_rainfall_value_sum, 4),
                "Nhiệt độ (°C)": formatMetric(row.temp_value ?? row.temp_value_avg, 1),
            }));

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "DuLieuIoT");

            const fileName = `du_lieu_iot_${filters.startDate || "tat_ca"}_${filters.endDate || "tat_ca"}.${fileType}`;
            XLSX.writeFile(workbook, fileName, { bookType: fileType === "csv" ? "csv" : "xlsx" });
            ToastCommon(TOAST.SUCCESS, `Xuất file ${fileType.toUpperCase()} thành công`);
        } catch (exportError) {
            console.error(`Error exporting IoT ${fileType}:`, exportError);
            ToastCommon(TOAST.ERROR, `Không thể xuất file ${fileType.toUpperCase()}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="iot-management-tab">
            {dataLoading && !iotDataRows.length && <Loading />}

            <div className="filter-section">
                <div className="filter-row">
                    <div className="filter-left">
                        <div className="filter-group">
                            <label htmlFor="iotStationFilter">Trạm IoT:</label>
                            <select
                                id="iotStationFilter"
                                value={filters.serialNumber}
                                onChange={(e) => handleFilterChange("serialNumber", e.target.value)}
                                className="filter-input"
                            >
                                <option value="">Tất cả trạm</option>
                                {stationFilterOptions.map((station) => (
                                    <option key={station.serial} value={station.serial}>
                                        {station.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group filter-group-date">
                            <label htmlFor="iotStartDate">Từ ngày:</label>
                            <input
                                type="text"
                                id="iotStartDate"
                                value={inputDateFilter.startDate}
                                onChange={(e) =>
                                    setInputDateFilter((prev) => ({
                                        ...prev,
                                        startDate: normalizeDateInputText(e.target.value),
                                    }))
                                }
                                onBlur={() =>
                                    setInputDateFilter((prev) => ({
                                        ...prev,
                                        startDate:
                                            parseDisplayDateToIso(prev.startDate)
                                                ? formatDateDisplay(parseDisplayDateToIso(prev.startDate))
                                                : prev.startDate,
                                    }))
                                }
                                className="filter-input"
                                placeholder="dd/mm/yyyy"
                                inputMode="numeric"
                                maxLength={10}
                            />
                        </div>

                        <div className="filter-group filter-group-date">
                            <label htmlFor="iotEndDate">Đến ngày:</label>
                            <input
                                type="text"
                                id="iotEndDate"
                                value={inputDateFilter.endDate}
                                onChange={(e) =>
                                    setInputDateFilter((prev) => ({
                                        ...prev,
                                        endDate: normalizeDateInputText(e.target.value),
                                    }))
                                }
                                onBlur={() =>
                                    setInputDateFilter((prev) => ({
                                        ...prev,
                                        endDate:
                                            parseDisplayDateToIso(prev.endDate)
                                                ? formatDateDisplay(parseDisplayDateToIso(prev.endDate))
                                                : prev.endDate,
                                    }))
                                }
                                className="filter-input"
                                placeholder="dd/mm/yyyy"
                                inputMode="numeric"
                                maxLength={10}
                            />
                        </div>

                        <div className="filter-actions d-flex gap-2 flex-nowrap align-items-end">
                            <button className="btn btn-secondary" onClick={clearFilters}>
                                Xóa bộ lọc
                            </button>
                            <button
                                className="btn btn-success"
                                onClick={() => exportIotData("xlsx")}
                                disabled={dataLoading || isExporting}
                            >
                                <i className="fas fa-file-excel me-1"></i>
                                {isExporting ? "Đang xuất..." : "Xuất Excel"}
                            </button>
                            <button
                                className="btn btn-outline-primary"
                                onClick={() => exportIotData("csv")}
                                disabled={dataLoading || isExporting}
                            >
                                <i className="fas fa-file-csv me-1"></i>
                                {isExporting ? "Đang xuất..." : "Xuất CSV"}
                            </button>
                        </div>
                    </div>

                    <div className="filter-right d-flex gap-2 flex-nowrap justify-content-end align-items-end">
                        {userInfo && (
                            <button className="btn btn-primary" onClick={openCreateDataModal}>
                                <i className="fas fa-plus me-1"></i>
                                Thêm dữ liệu IoT
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <i className="fas fa-exclamation-triangle"></i>
                    {error}
                </div>
            )}

            {iotDataRows.length === 0 ? (
                <div className="no-data">
                    <i className="fas fa-broadcast-tower"></i>
                    <h3>Không có dữ liệu IoT</h3>
                    <p>Chưa có dữ liệu IoT nào theo bộ lọc hiện tại.</p>
                </div>
            ) : (
                <div className="table-container">
                    <div className="table-responsive rounded-3 border border-primary-subtle shadow-sm bg-white">
                        <table className="table table-striped table-hover align-middle mb-0">
                            <thead className="table-primary">
                                <tr>
                                    <th>#</th>
                                    <th>Thời gian</th>
                                    <th>Tên trạm</th>
                                    <th>Serial</th>
                                    <th>Độ mặn (‰)</th>
                                    <th>Mực nước (m)</th>
                                    <th>Mưa ngày (mm)</th>
                                    <th>Nhiệt độ (°C)</th>
                                    {userInfo && <th style={{ width: 160 }}>Thao tác</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {iotDataRows.map((row, index) => (
                                    <tr key={row.id || row._id || `${row.serial_number}-${row.date_time}-${index}`}>
                                        <td>{(currentPage - 1) * limit + index + 1}</td>
                                        <td>{toDisplayDateTime(row.date_time || row.Date || row.timestamp)}</td>
                                        <td>{row.station_name || row.stationName || "Trạm IoT"}</td>
                                        <td>{row.serial_number || row.serialNumber || row.DeviceSerialNumber || "-"}</td>
                                        <td>{formatMetric(row.salt_value ?? row.salt_value_avg, 4)}</td>
                                        <td>{formatMetric(row.distance_value ?? row.distance_value_avg, 4)}</td>
                                        <td>{formatMetric(row.daily_rainfall_value ?? row.daily_rainfall_value_sum, 4)}</td>
                                        <td>{formatMetric(row.temp_value ?? row.temp_value_avg, 1)}</td>
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
                                                        onClick={() => setDeleteConfig({ type: "data", target: row })}
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
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
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content">
                            <form onSubmit={handleSaveData}>
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        {dataModalMode === "create" ? "Thêm dữ liệu IoT" : "Cập nhật dữ liệu IoT"}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={() => setShowDataModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label">Serial Number</label>
                                            <input
                                                className="form-control"
                                                value={dataForm.serial_number}
                                                onChange={(e) => setDataForm((prev) => ({ ...prev, serial_number: e.target.value }))}
                                                placeholder="Nhập serial number"
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Thời gian đo</label>
                                            <input
                                                type="datetime-local"
                                                className="form-control"
                                                value={dataForm.date_time}
                                                onChange={(e) => setDataForm((prev) => ({ ...prev, date_time: e.target.value }))}
                                                required
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Độ mặn (‰)</label>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                className="form-control"
                                                value={dataForm.salt_value}
                                                onChange={(e) => setDataForm((prev) => ({ ...prev, salt_value: e.target.value }))}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Mực nước (m)</label>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                className="form-control"
                                                value={dataForm.distance_value}
                                                onChange={(e) => setDataForm((prev) => ({ ...prev, distance_value: e.target.value }))}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Lượng mưa ngày (mm)</label>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                className="form-control"
                                                value={dataForm.daily_rainfall_value}
                                                onChange={(e) => setDataForm((prev) => ({ ...prev, daily_rainfall_value: e.target.value }))}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Nhiệt độ (°C)</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                className="form-control"
                                                value={dataForm.temp_value}
                                                onChange={(e) => setDataForm((prev) => ({ ...prev, temp_value: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowDataModal(false)}>
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
                    title={deleteConfig.type === "station" ? "Xác nhận xóa trạm IoT" : "Xác nhận xóa dữ liệu IoT"}
                    message={`Bạn có chắc chắn muốn xóa bản ghi IoT lúc ${toDisplayDateTime(deleteConfig.target.date_time || deleteConfig.target.Date || deleteConfig.target.timestamp)}?`}
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

export default IoTManagementTab;
