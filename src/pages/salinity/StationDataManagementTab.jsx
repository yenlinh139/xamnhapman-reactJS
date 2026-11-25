import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Loading from "../../components/Loading";
import ModalConfirm from "../../components/ModalConfirm";
import PaginationSalinity from "./PaginationSalinity";
import axiosInstance from "@config/axios-config";
import { ToastCommon } from "@/components/ToastCommon";
import { TOAST } from "@/common/constants";
import { toVNDateKey } from "@common/vnDateTime";
import { useSortableRows } from "@common/useSortableRows";
import {
    buildExportFileName,
    exportToExcel,
    exportToGeoJSON,
    fetchAllRows,
    toPointGeometry,
} from "@common/dataExport";
import SortableHeader from "@components/common/SortableHeader";
import LocalizedDateInput from "@components/common/LocalizedDateInput";

// Tab quản trị dùng chung cho các lớp SỐ LIỆU NGÀY theo trạm (API /station-data/:layer):
// Điểm đo mưa, Trạm khí tượng, Trạm thủy văn, Hồ chứa thượng lưu. Mỗi bản ghi = 1 trạm + 1 ngày
// (cặp này là duy nhất - server trả 409 nếu thêm trùng).
//   fields[].key       : tên trường trong API
//   fields[].exportKey : tên thuộc tính (không dấu) khi xuất GeoJSON
const STATION_DATA_LAYERS = {
    rain: {
        key: "rain",
        stationLabel: "Điểm đo mưa",
        allLabel: "Tất cả điểm đo mưa",
        dataName: "lượng mưa",
        filePrefix: "luong_mua",
        sheetName: "LuongMua",
        geoName: "DiemDoMua",
        // Bảng: mỗi NGÀY 1 dòng, mỗi điểm đo 1 cột; nhiều cột nên tiêu đề cột chỉ ghi tên điểm đo.
        pivot: { field: "R", stationHeader: true },
        fields: [{ key: "R", label: "Lượng mưa (mm)", exportKey: "LuongMua_mm", digits: 1, min: 0 }],
    },
    meteo: {
        key: "meteo",
        stationLabel: "Trạm khí tượng",
        allLabel: "Tất cả trạm khí tượng",
        dataName: "khí tượng",
        filePrefix: "khi_tuong",
        sheetName: "KhiTuong",
        geoName: "TramKhiTuong",
        fields: [
            { key: "R", label: "Lượng mưa (mm)", exportKey: "LuongMua_mm", digits: 1, min: 0 },
            { key: "Ttb", label: "Nhiệt độ trung bình (°C)", exportKey: "NhietDoTB_C", digits: 1 },
            { key: "Tx", label: "Nhiệt độ cao nhất (°C)", exportKey: "NhietDoMax_C", digits: 1 },
            { key: "Tm", label: "Nhiệt độ thấp nhất (°C)", exportKey: "NhietDoMin_C", digits: 1 },
        ],
    },
    hydro: {
        key: "hydro",
        stationLabel: "Trạm thủy văn",
        allLabel: "Tất cả trạm thủy văn",
        dataName: "thủy văn",
        filePrefix: "thuy_van",
        sheetName: "ThuyVan",
        geoName: "TramThuyVan",
        fields: [
            { key: "Htb", label: "Mực nước trung bình (cm)", exportKey: "MucNuocTB_cm", digits: 1 },
            { key: "Hx", label: "Mực nước cao nhất (cm)", exportKey: "MucNuocMax_cm", digits: 1 },
            { key: "Hm", label: "Mực nước thấp nhất (cm)", exportKey: "MucNuocMin_cm", digits: 1 },
        ],
    },
    reservoir: {
        key: "reservoir",
        stationLabel: "Hồ chứa",
        allLabel: "Tất cả hồ chứa",
        dataName: "hồ chứa",
        filePrefix: "ho_chua",
        sheetName: "HoChua",
        geoName: "HoChuaThuongLuu",
        // Bảng hiển thị mỗi NGÀY 1 dòng, mỗi hồ 1 cột giá trị của trường này (không hiện cột nguồn
        // dữ liệu). Xuất Excel/GeoJSON vẫn theo từng bản ghi hồ + ngày, đủ mọi thuộc tính.
        pivot: { field: "TongLuongXa" },
        fields: [
            {
                key: "TongLuongXa",
                label: "Tổng lượng xả (m³/s)",
                exportKey: "TongLuongXa_m3s",
                digits: 3,
                min: 0,
            },
            { key: "NguonDuLieu", label: "Nguồn dữ liệu", exportKey: "NguonDuLieu", type: "text" },
        ],
    },
};

const PAGE_SIZE = 20;

const isTextField = (field) => field.type === "text";

const isBlank = (value) => value === "" || value === null || value === undefined;

// Chấp nhận cả dấu phẩy thập phân kiểu VN ("12,5"). Trả NaN nếu nhập không phải số.
const parseNumberInput = (value) => {
    if (isBlank(value)) return null;
    const raw = String(value).trim().replace(",", ".");
    if (!raw) return null;
    return Number(raw);
};

const formatNumber = (value, digits = 2) =>
    isBlank(value) || Number.isNaN(Number(value))
        ? "-"
        : Number(value).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: digits });

const formatIsoDate = (iso) => (iso ? String(iso).split("-").reverse().join("/") : "");

const rowKey = (row) => `${row.KiHieu || "all"}_${row.Ngay}`;

// Dòng API pivot { Ngay, values: { [KiHieu]: { truong: gia tri } } } -> { Ngay, [KiHieu]: giá trị }.
const flattenPivotRow = (item, fieldKey) => {
    const row = { Ngay: item.Ngay };
    Object.keys(item.values || {}).forEach((code) => {
        row[code] = item.values[code]?.[fieldKey] ?? null;
    });
    return row;
};

const StationDataManagementTab = ({ userInfo, layer }) => {
    const config = STATION_DATA_LAYERS[layer];
    const apiPath = `/station-data/${config.key}`;
    const stationLabelLower = config.stationLabel.toLowerCase();
    const pivot = config.pivot || null;
    const pivotField = pivot ? config.fields.find((field) => field.key === pivot.field) : null;

    const [stations, setStations] = useState([]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });

    const [filterStation, setFilterStation] = useState("");
    const [filterStart, setFilterStart] = useState("");
    const [filterEnd, setFilterEnd] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [form, setForm] = useState({ KiHieu: "", Ngay: "" });
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [exporting, setExporting] = useState("");

    const requestIdRef = useRef(0);
    const todayIso = toVNDateKey(new Date());

    const stationByCode = useMemo(() => {
        const map = {};
        stations.forEach((station) => {
            map[station.KiHieu] = station;
        });
        return map;
    }, [stations]);

    const loadStations = useCallback(async () => {
        try {
            const res = await axiosInstance.get(`${apiPath}/stations`);
            setStations(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch (stationError) {
            console.error("Error loading stations:", stationError);
            setStations([]);
        }
    }, [apiPath]);

    useEffect(() => {
        loadStations();
    }, [loadStations]);

    // Khoảng ngày có số liệu: của đúng trạm đang lọc, hoặc khoảng chung của mọi trạm.
    const getRange = useCallback(
        (code) => {
            if (code) {
                const station = stationByCode[code];
                return { minDate: station?.minDate || "", maxDate: station?.maxDate || "" };
            }
            let minDate = "";
            let maxDate = "";
            stations.forEach((station) => {
                if (station.minDate && (!minDate || station.minDate < minDate)) minDate = station.minDate;
                if (station.maxDate && (!maxDate || station.maxDate > maxDate)) maxDate = station.maxDate;
            });
            return { minDate, maxDate };
        },
        [stationByCode, stations],
    );

    const { minDate: rangeMin, maxDate: rangeMax } = getRange(filterStation);

    // Mặc định "Từ ngày"/"Đến ngày" = đúng khoảng số liệu hiện có, mỗi khi đổi trạm lọc hoặc khoảng
    // này thay đổi (vd vừa thêm bản ghi mới nhất).
    useEffect(() => {
        setCurrentPage(1);
        setFilterStart(rangeMin);
        setFilterEnd(rangeMax);
    }, [rangeMin, rangeMax]);

    const buildParams = useCallback(
        (page, limit) => {
            const params = { page, limit };
            if (filterStation) params.kihieu = filterStation;
            if (filterStart) params.startDate = filterStart;
            if (filterEnd) params.endDate = filterEnd;
            return params;
        },
        [filterStation, filterStart, filterEnd],
    );

    const loadRows = useCallback(async () => {
        const requestId = ++requestIdRef.current;
        try {
            setLoading(true);
            setError("");
            const params = buildParams(currentPage, PAGE_SIZE);
            if (pivot) params.pivot = 1;
            const res = await axiosInstance.get(apiPath, { params });
            if (requestId !== requestIdRef.current) return;

            const rawData = Array.isArray(res.data?.data) ? res.data.data : [];
            const data = pivot ? rawData.map((item) => flattenPivotRow(item, pivot.field)) : rawData;
            setRows(data);
            setPagination({
                page: res.data?.pagination?.page || currentPage,
                totalPages: res.data?.pagination?.totalPages || 1,
                total: res.data?.pagination?.total ?? data.length,
                limit: res.data?.pagination?.limit || PAGE_SIZE,
            });
        } catch (loadError) {
            if (requestId !== requestIdRef.current) return;
            console.error("Error loading station data:", loadError);
            setRows([]);
            setPagination({ page: 1, totalPages: 1, total: 0, limit: PAGE_SIZE });
            setError(loadError?.response?.data?.message || loadError?.message || "Không tải được dữ liệu.");
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }, [apiPath, buildParams, currentPage, pivot]);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

    const clearFilters = () => {
        const overall = getRange("");
        setCurrentPage(1);
        setFilterStation("");
        setFilterStart(overall.minDate);
        setFilterEnd(overall.maxDate);
    };

    // Các trường mà trạm đang chọn trong form có đo (vd trạm chỉ đo mưa thì không có nhiệt độ).
    const formFields = useMemo(() => {
        const supported = stationByCode[form.KiHieu]?.fields;
        return supported ? config.fields.filter((field) => supported.includes(field.key)) : config.fields;
    }, [config.fields, form.KiHieu, stationByCode]);

    const openCreateModal = () => {
        setModalMode("create");
        setForm({ KiHieu: filterStation || "", Ngay: "" });
        setFormErrors({});
        setShowModal(true);
    };

    // Các cột trạm của bảng pivot: mọi trạm, hoặc chỉ trạm đang lọc.
    const pivotStations = useMemo(
        () => (pivot ? stations.filter((station) => !filterStation || station.KiHieu === filterStation) : []),
        [pivot, stations, filterStation],
    );
    const isPivotEdit = Boolean(pivot) && modalMode === "edit";

    const openEditModal = (row) => {
        if (pivot) {
            // Sửa cả dòng ngày: mỗi trạm 1 ô; `original` giữ giá trị cũ để biết ô nào đổi.
            const pivotForm = { Ngay: row.Ngay, original: row };
            pivotStations.forEach((station) => {
                pivotForm[station.KiHieu] = isBlank(row[station.KiHieu]) ? "" : String(row[station.KiHieu]);
            });
            setModalMode("edit");
            setForm(pivotForm);
            setFormErrors({});
            setShowModal(true);
            return;
        }
        const nextForm = { KiHieu: row.KiHieu, Ngay: row.Ngay };
        config.fields.forEach((field) => {
            nextForm[field.key] = isBlank(row[field.key]) ? "" : String(row[field.key]);
        });
        setModalMode("edit");
        setForm(nextForm);
        setFormErrors({});
        setShowModal(true);
    };

    // Lưu dòng pivot: so từng ô với giá trị cũ -> thêm (ô vốn trống), sửa, hoặc gỡ (ô bị xoá trắng).
    const handlePivotSave = async () => {
        const nextErrors = {};
        const operations = [];
        let remaining = 0;

        pivotStations.forEach((station) => {
            const code = station.KiHieu;
            const value = parseNumberInput(form[code]);
            const original = isBlank(form.original?.[code]) ? null : Number(form.original[code]);
            if (Number.isNaN(value)) {
                nextErrors[code] = "Giá trị phải là số";
                return;
            }
            if (value !== null && pivotField.min !== undefined && value < pivotField.min) {
                nextErrors[code] = `Giá trị không được nhỏ hơn ${pivotField.min}`;
                return;
            }
            if (value !== null) remaining += 1;
            if (value === original) return;

            const body = { KiHieu: code, Ngay: form.Ngay, [pivot.field]: value };
            if (original === null) operations.push(() => axiosInstance.post(apiPath, body));
            else if (value === null)
                operations.push(() =>
                    axiosInstance.delete(apiPath, { params: { kihieu: code, date: form.Ngay } }),
                );
            else operations.push(() => axiosInstance.put(apiPath, body));
        });

        if (Object.keys(nextErrors).length === 0 && remaining === 0 && pivotStations.length > 0) {
            nextErrors[pivotStations[0].KiHieu] = 'Cần giữ ít nhất một giá trị - dùng "Xóa" để gỡ cả ngày';
        }
        if (Object.keys(nextErrors).length > 0) {
            setFormErrors(nextErrors);
            return;
        }
        setFormErrors({});

        try {
            setSaving(true);
            for (const run of operations) await run();
            ToastCommon(TOAST.SUCCESS, "Cập nhật bản ghi thành công");
            setShowModal(false);
        } catch (saveError) {
            console.error("Error saving station data:", saveError);
            ToastCommon(
                TOAST.ERROR,
                saveError?.response?.data?.message || saveError?.message || "Không thể lưu bản ghi",
            );
        } finally {
            setSaving(false);
            await Promise.all([loadRows(), loadStations()]);
        }
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (saving) return;
        if (isPivotEdit) {
            await handlePivotSave();
            return;
        }

        const nextErrors = {};
        if (!form.KiHieu) nextErrors.KiHieu = `Vui lòng chọn ${stationLabelLower}`;
        if (!form.Ngay) nextErrors.Ngay = "Ngày là bắt buộc";
        else if (form.Ngay > todayIso) nextErrors.Ngay = "Không được nhập ngày trong tương lai";

        const payload = { KiHieu: form.KiHieu, Ngay: form.Ngay };
        let hasNumber = false;
        formFields.forEach((field) => {
            if (isTextField(field)) {
                payload[field.key] = isBlank(form[field.key]) ? null : String(form[field.key]).trim();
                return;
            }
            const value = parseNumberInput(form[field.key]);
            if (Number.isNaN(value)) {
                nextErrors[field.key] = "Giá trị phải là số";
            } else if (value !== null && field.min !== undefined && value < field.min) {
                nextErrors[field.key] = `Giá trị không được nhỏ hơn ${field.min}`;
            }
            if (value !== null && !Number.isNaN(value)) hasNumber = true;
            payload[field.key] = value;
        });
        if (!hasNumber && Object.keys(nextErrors).length === 0) {
            const firstNumberField = formFields.find((field) => !isTextField(field));
            nextErrors[firstNumberField.key] = "Cần nhập ít nhất một giá trị đo";
        }

        if (Object.keys(nextErrors).length > 0) {
            setFormErrors(nextErrors);
            return;
        }
        setFormErrors({});

        try {
            setSaving(true);
            if (modalMode === "create") {
                await axiosInstance.post(apiPath, payload);
                ToastCommon(TOAST.SUCCESS, "Thêm bản ghi thành công");
            } else {
                await axiosInstance.put(apiPath, payload);
                ToastCommon(TOAST.SUCCESS, "Cập nhật bản ghi thành công");
            }
            setShowModal(false);
            await Promise.all([loadRows(), loadStations()]);
        } catch (saveError) {
            console.error("Error saving station data:", saveError);
            const message =
                saveError?.response?.data?.message || saveError?.message || "Không thể lưu bản ghi";
            // 409 = đã có bản ghi của đúng trạm + ngày này (ràng buộc duy nhất).
            if (saveError?.response?.status === 409) setFormErrors({ Ngay: message });
            ToastCommon(TOAST.ERROR, message);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            // Bảng pivot: xoá số liệu ngày đó của mọi trạm đang hiển thị trên dòng.
            const codes = pivot
                ? pivotStations
                      .map((station) => station.KiHieu)
                      .filter((code) => !isBlank(deleteTarget[code]))
                : [deleteTarget.KiHieu];
            for (const code of codes) {
                await axiosInstance.delete(apiPath, { params: { kihieu: code, date: deleteTarget.Ngay } });
            }
            ToastCommon(TOAST.SUCCESS, "Xóa bản ghi thành công");
            setDeleteTarget(null);
            await Promise.all([loadRows(), loadStations()]);
        } catch (deleteError) {
            console.error("Error deleting station data:", deleteError);
            ToastCommon(
                TOAST.ERROR,
                deleteError?.response?.data?.message || deleteError?.message || "Không thể xóa bản ghi",
            );
        }
    };

    // Xuất TOÀN BỘ bản ghi theo bộ lọc hiện tại: Excel = thuộc tính; GeoJSON = thuộc tính + toạ độ trạm.
    const handleExport = async (type) => {
        if (exporting) return;
        try {
            setExporting(type);
            const allRows = await fetchAllRows(async (page, pageSize) => {
                const res = await axiosInstance.get(apiPath, { params: buildParams(page, pageSize) });
                return { rows: res.data?.data || [], total: res.data?.pagination?.total };
            });
            if (allRows.length === 0) {
                ToastCommon(TOAST.ERROR, "Không có dữ liệu để xuất theo bộ lọc hiện tại");
                return;
            }

            const fileName = buildExportFileName(
                config.filePrefix,
                { station: filterStation, startDate: filterStart, endDate: filterEnd },
                type,
            );

            if (type === "xlsx") {
                const records = allRows.map((row, index) => {
                    const record = {
                        STT: index + 1,
                        Ngày: formatIsoDate(row.Ngay),
                        "Ký hiệu": row.KiHieu,
                        [config.stationLabel]: row.Ten,
                    };
                    config.fields.forEach((field) => {
                        record[field.label] = isBlank(row[field.key]) ? "" : row[field.key];
                    });
                    return record;
                });
                exportToExcel(records, { sheetName: config.sheetName, fileName });
            } else {
                const geometryByCode = {};
                const stationByCodeForExport = {};
                stations.forEach((station) => {
                    geometryByCode[station.KiHieu] = toPointGeometry(station.KinhDo, station.ViDo);
                    stationByCodeForExport[station.KiHieu] = station;
                });
                const items = allRows.map((row) => {
                    const station = stationByCodeForExport[row.KiHieu];
                    const geometry = geometryByCode[row.KiHieu] || null;
                    const properties = {
                        KiHieu: row.KiHieu,
                        Ten: row.Ten,
                        Ngay: row.Ngay,
                        // Kinh độ/vĩ độ của điểm/trạm, để thấy ngay trong bảng thuộc tính của file GeoJSON
                        // (không chỉ nằm ẩn trong geometry).
                        KinhDo: station?.KinhDo ?? null,
                        ViDo: station?.ViDo ?? null,
                        Longitude: geometry?.coordinates?.[0] ?? null,
                        Latitude: geometry?.coordinates?.[1] ?? null,
                    };
                    config.fields.forEach((field) => {
                        properties[field.exportKey] = isBlank(row[field.key]) ? null : row[field.key];
                    });
                    return { properties, geometry };
                });
                exportToGeoJSON(items, { name: config.geoName, fileName });
            }
            ToastCommon(
                TOAST.SUCCESS,
                `Đã xuất ${allRows.length.toLocaleString("vi-VN")} bản ghi ra file ${type === "xlsx" ? "Excel" : "GeoJSON"}`,
            );
        } catch (exportError) {
            console.error("Error exporting station data:", exportError);
            ToastCommon(
                TOAST.ERROR,
                exportError?.name === "ExportTooLargeError"
                    ? exportError.message
                    : exportError?.response?.data?.message || "Không thể xuất dữ liệu",
            );
        } finally {
            setExporting("");
        }
    };

    const getSortValue = useCallback(
        (row, key) => {
            if (key === "Ngay") return row.Ngay;
            if (pivot) return isBlank(row[key]) ? null : Number(row[key]);
            if (key === "KiHieu") return row.Ten || row.KiHieu || "";
            const field = config.fields.find((item) => item.key === key);
            if (field && isTextField(field)) return row[key] || "";
            return isBlank(row[key]) ? null : Number(row[key]);
        },
        [config.fields, pivot],
    );
    const { sortedRows, sortConfig, handleSort } = useSortableRows(rows, {
        defaultKey: "Ngay",
        defaultDirection: "desc",
        getSortValue,
    });

    const idPrefix = `stationData-${config.key}`;
    const deleteStationName = !deleteTarget
        ? ""
        : pivot
          ? pivotStations
                .filter((station) => !isBlank(deleteTarget[station.KiHieu]))
                .map((station) => station.Ten)
                .join(", ")
          : deleteTarget.Ten || deleteTarget.KiHieu;

    return (
        <div className="salinity-detail-management-tab station-data-management-tab">
            {loading && !rows.length && <Loading />}

            <div className="filter-section">
                <div className="filter-row">
                    <div className="filter-left">
                        <div className="filter-group">
                            <label htmlFor={`${idPrefix}-station`}>{config.stationLabel}:</label>
                            <select
                                id={`${idPrefix}-station`}
                                className="filter-input"
                                value={filterStation}
                                onChange={(e) => {
                                    const nextRange = getRange(e.target.value);
                                    setCurrentPage(1);
                                    setFilterStation(e.target.value);
                                    setFilterStart(nextRange.minDate);
                                    setFilterEnd(nextRange.maxDate);
                                }}
                            >
                                <option value="">{config.allLabel}</option>
                                {stations.map((station) => (
                                    <option key={station.KiHieu} value={station.KiHieu}>
                                        {station.Ten} ({station.KiHieu})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group filter-group-date">
                            <label htmlFor={`${idPrefix}-start`}>Từ ngày:</label>
                            <LocalizedDateInput
                                id={`${idPrefix}-start`}
                                className="filter-input"
                                value={filterStart}
                                min={rangeMin || undefined}
                                max={filterEnd || rangeMax || undefined}
                                onChange={(e) => {
                                    setCurrentPage(1);
                                    setFilterStart(e.target.value);
                                }}
                            />
                        </div>

                        <div className="filter-group filter-group-date">
                            <label htmlFor={`${idPrefix}-end`}>Đến ngày:</label>
                            <LocalizedDateInput
                                id={`${idPrefix}-end`}
                                className="filter-input"
                                value={filterEnd}
                                min={filterStart || rangeMin || undefined}
                                max={rangeMax || undefined}
                                onChange={(e) => {
                                    setCurrentPage(1);
                                    setFilterEnd(e.target.value);
                                }}
                            />
                        </div>

                        <div className="filter-actions d-flex gap-2 flex-nowrap align-items-end">
                            <button className="btn btn-secondary" onClick={clearFilters}>
                                Xóa bộ lọc
                            </button>
                            <button
                                className="btn btn-success"
                                onClick={() => handleExport("xlsx")}
                                disabled={loading || Boolean(exporting)}
                            >
                                <i className="fas fa-file-excel me-1"></i>
                                {exporting === "xlsx" ? "Đang xuất..." : "Xuất Excel"}
                            </button>
                            <button
                                className="btn btn-geojson"
                                onClick={() => handleExport("geojson")}
                                disabled={loading || Boolean(exporting)}
                            >
                                <i className="fas fa-map-marker-alt me-1"></i>
                                {exporting === "geojson" ? "Đang xuất..." : "Xuất GeoJSON"}
                            </button>
                        </div>
                    </div>

                    <div className="filter-right d-flex gap-2">
                        {userInfo && (
                            <button className="btn btn-primary" onClick={openCreateModal}>
                                <i className="fas fa-plus me-1"></i>
                                Thêm số liệu
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

            {rows.length === 0 ? (
                <div className="no-data">
                    <i className="fas fa-water"></i>
                    <h3>Không có dữ liệu</h3>
                    <p>Chưa có dữ liệu {config.dataName} nào theo bộ lọc hiện tại.</p>
                </div>
            ) : (
                <div className="table-container">
                    {pivot?.stationHeader && (
                        <div className="small text-muted mb-2">
                            Giá trị trong bảng: <strong>{pivotField.label}</strong> theo từng{" "}
                            {stationLabelLower}.
                        </div>
                    )}
                    <div className="table-responsive rounded-3 border border-primary-subtle shadow-sm bg-white">
                        <table className="table table-striped table-hover align-middle mb-0">
                            <thead className="table-primary">
                                <tr>
                                    <th>#</th>
                                    <SortableHeader
                                        label="Ngày"
                                        sortKey="Ngay"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                    />
                                    {pivot ? (
                                        pivotStations.map((station) => (
                                            <SortableHeader
                                                key={station.KiHieu}
                                                label={
                                                    pivot.stationHeader
                                                        ? station.Ten
                                                        : `${station.Ten} - ${pivotField.label}`
                                                }
                                                style={{ whiteSpace: "nowrap" }}
                                                sortKey={station.KiHieu}
                                                sortConfig={sortConfig}
                                                onSort={handleSort}
                                            />
                                        ))
                                    ) : (
                                        <>
                                            <SortableHeader
                                                label={config.stationLabel}
                                                sortKey="KiHieu"
                                                sortConfig={sortConfig}
                                                onSort={handleSort}
                                            />
                                            {config.fields.map((field) => (
                                                <SortableHeader
                                                    key={field.key}
                                                    label={field.label}
                                                    sortKey={field.key}
                                                    sortConfig={sortConfig}
                                                    onSort={handleSort}
                                                />
                                            ))}
                                        </>
                                    )}
                                    {userInfo && <th style={{ width: 160 }}>Thao tác</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRows.map((row, index) => (
                                    <tr key={rowKey(row)}>
                                        <td>{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                                        <td style={{ whiteSpace: "nowrap" }}>{formatIsoDate(row.Ngay)}</td>
                                        {pivot &&
                                            pivotStations.map((station) => (
                                                <td key={station.KiHieu}>
                                                    {formatNumber(row[station.KiHieu], pivotField.digits)}
                                                </td>
                                            ))}
                                        {!pivot && (
                                            <td>
                                                {row.Ten} ({row.KiHieu})
                                            </td>
                                        )}
                                        {(pivot ? [] : config.fields).map((field) =>
                                            isTextField(field) ? (
                                                <td key={field.key}>
                                                    <span
                                                        className="d-inline-block text-truncate"
                                                        style={{ maxWidth: 320, verticalAlign: "bottom" }}
                                                        title={row[field.key] || ""}
                                                    >
                                                        {row[field.key] || "-"}
                                                    </span>
                                                </td>
                                            ) : (
                                                <td key={field.key}>
                                                    {formatNumber(row[field.key], field.digits)}
                                                </td>
                                            ),
                                        )}
                                        {userInfo && (
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => openEditModal(row)}
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => setDeleteTarget(row)}
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
                                recordsPerPage={pagination.limit || PAGE_SIZE}
                            />
                        </div>
                    )}
                </div>
            )}

            {showModal && (
                <div
                    className="modal fade show d-block"
                    tabIndex="-1"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content">
                            <form onSubmit={handleSave}>
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        {modalMode === "create"
                                            ? `Thêm dữ liệu ${config.dataName}`
                                            : `Cập nhật dữ liệu ${config.dataName}`}
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowModal(false)}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    {isPivotEdit ? (
                                        <div className="row g-3">
                                            <div className="col-12">
                                                <label className="form-label">Ngày</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={formatIsoDate(form.Ngay)}
                                                    disabled
                                                />
                                                <div className="form-text">
                                                    Để trống ô của một {stationLabelLower} để gỡ số liệu ngày
                                                    này của {stationLabelLower} đó.
                                                </div>
                                            </div>
                                            {pivotStations.map((station) => (
                                                <div
                                                    key={station.KiHieu}
                                                    className={
                                                        pivotStations.length > 4 ? "col-md-4" : "col-md-6"
                                                    }
                                                >
                                                    <label className="form-label">
                                                        {station.Ten} - {pivotField.label}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className={`form-control ${formErrors[station.KiHieu] ? "is-invalid" : ""}`}
                                                        value={form[station.KiHieu] ?? ""}
                                                        inputMode="decimal"
                                                        onChange={(e) => {
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                [station.KiHieu]: e.target.value,
                                                            }));
                                                            setFormErrors((prev) => ({
                                                                ...prev,
                                                                [station.KiHieu]: "",
                                                            }));
                                                        }}
                                                    />
                                                    {formErrors[station.KiHieu] && (
                                                        <div className="error-text">
                                                            {formErrors[station.KiHieu]}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label required">
                                                    {config.stationLabel}
                                                </label>
                                                <select
                                                    className={`form-control ${formErrors.KiHieu ? "is-invalid" : ""}`}
                                                    value={form.KiHieu}
                                                    disabled={modalMode === "edit"}
                                                    onChange={(e) => {
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            KiHieu: e.target.value,
                                                        }));
                                                        setFormErrors((prev) => ({
                                                            ...prev,
                                                            KiHieu: "",
                                                            Ngay: "",
                                                        }));
                                                    }}
                                                >
                                                    <option value="" disabled>
                                                        Chọn {stationLabelLower}
                                                    </option>
                                                    {stations.map((station) => (
                                                        <option key={station.KiHieu} value={station.KiHieu}>
                                                            {station.Ten} ({station.KiHieu})
                                                        </option>
                                                    ))}
                                                </select>
                                                {formErrors.KiHieu && (
                                                    <div className="error-text">{formErrors.KiHieu}</div>
                                                )}
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label required">Ngày</label>
                                                <LocalizedDateInput
                                                    id={`${idPrefix}-form-date`}
                                                    className={`form-control ${formErrors.Ngay ? "is-invalid" : ""}`}
                                                    value={form.Ngay}
                                                    max={todayIso}
                                                    disabled={modalMode === "edit"}
                                                    onChange={(e) => {
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            Ngay: e.target.value,
                                                        }));
                                                        setFormErrors((prev) => ({ ...prev, Ngay: "" }));
                                                    }}
                                                />
                                                <div className="form-text">
                                                    {modalMode === "create"
                                                        ? `Mỗi ${stationLabelLower} chỉ có một bản ghi cho mỗi ngày (không được trùng).`
                                                        : `Không đổi được ${stationLabelLower} và ngày của bản ghi đã có.`}
                                                </div>
                                                {formErrors.Ngay && (
                                                    <div className="error-text">{formErrors.Ngay}</div>
                                                )}
                                            </div>
                                            {formFields.map((field) => (
                                                <div
                                                    key={field.key}
                                                    className={isTextField(field) ? "col-12" : "col-md-6"}
                                                >
                                                    <label className="form-label">{field.label}</label>
                                                    <input
                                                        type="text"
                                                        className={`form-control ${formErrors[field.key] ? "is-invalid" : ""}`}
                                                        value={form[field.key] ?? ""}
                                                        inputMode={isTextField(field) ? undefined : "decimal"}
                                                        onChange={(e) => {
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                [field.key]: e.target.value,
                                                            }));
                                                            setFormErrors((prev) => ({
                                                                ...prev,
                                                                [field.key]: "",
                                                            }));
                                                        }}
                                                    />
                                                    {formErrors[field.key] && (
                                                        <div className="error-text">
                                                            {formErrors[field.key]}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowModal(false)}
                                    >
                                        Hủy
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {modalMode === "create" ? "Thêm mới" : "Lưu thay đổi"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <ModalConfirm
                    title="Xác nhận xóa dữ liệu"
                    message={`Bạn có chắc chắn muốn xóa bản ghi ngày ${formatIsoDate(deleteTarget.Ngay)} của ${deleteStationName}?`}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                    confirmText="Xóa"
                    cancelText="Hủy"
                    type="danger"
                />
            )}
        </div>
    );
};

export default StationDataManagementTab;
