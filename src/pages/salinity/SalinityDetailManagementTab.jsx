import React, { useCallback, useEffect, useMemo, useState } from "react";
import Loading from "../../components/Loading";
import ModalConfirm from "../../components/ModalConfirm";
import PaginationSalinity from "./PaginationSalinity";
import axiosInstance from "@config/axios-config";
import { ToastCommon } from "@/components/ToastCommon";
import { TOAST } from "@/common/constants";
import { getRiskBadgeMeta } from "@common/salinityClassification";
import { toVNDateKey, formatVNDateTime } from "@common/vnDateTime";
import { useSortableRows } from "@common/useSortableRows";
import SortableHeader from "@components/common/SortableHeader";
import LocalizedDateInput from "@components/common/LocalizedDateInput";
import LocalizedDateTimeInput from "@components/common/LocalizedDateTimeInput";

const STATION_NAMES = {
    CRT: "Cầu Rạch Tra",
    CTT: "Cầu Thủ Thiêm",
    COT: "Cầu Ông Thìn",
    CKC: "Cống Kênh C",
    KXAH: "Kênh Xáng - An Hạ",
    MNB: "Mũi Nhà Bè",
    PCL: "Phà Cát Lái",
    KXD2: "Kênh Xáng đứng 2",
};
const STATION_CODES = Object.keys(STATION_NAMES);

const DEFAULT_FORM = {
    id: "",
    KiHieu: "",
    ThoiDiem: "",
    DoMan: "",
    pH: "",
    DoDanDien: "",
    DoDuc: "",
};

const asArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const toNullableNumber = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const raw = String(value).trim().replace(",", ".");
    if (!raw) return null;
    const numericValue = Number(raw);
    return Number.isNaN(numericValue) ? null : numericValue;
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

// "YYYY-MM-DDTHH:mm" theo giờ VN - value cho <input type="datetime-local">.
const toDateTimeLocalValue = (value) => {
    if (!value) return "";
    const isoDate = toVNDateKey(value);
    if (!isoDate) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(d);
    const hour = parts.find((p) => p.type === "hour")?.value || "00";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";
    return `${isoDate}T${hour}:${minute}`;
};

// "YYYY-MM-DDTHH:mm" (gio VN, khong co offset) -> ISO string co "+07:00" tuong minh de gui len
// server (tranh bug lech gio server/khach da gap truoc do trong du an nay).
const dateTimeLocalToIso = (value) => {
    if (!value) return null;
    return `${value}:00+07:00`;
};

const SalinityDetailManagementTab = ({ userInfo }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(20);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 20 });

    const [filterKiHieu, setFilterKiHieu] = useState("");
    const [filterRange, setFilterRange] = useState({ minTime: null, maxTime: null, total: 0 });
    const [filterStart, setFilterStart] = useState("");
    const [filterEnd, setFilterEnd] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [form, setForm] = useState(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [formRange, setFormRange] = useState({ minTime: null, maxTime: null });

    const [deleteTarget, setDeleteTarget] = useState(null);

    // Khoảng ngày-giờ hiện có (khóa "Từ ngày"/"Đến ngày" trong khoảng này) - dùng khoảng của
    // đúng trạm đang lọc, hoặc khoảng CHUNG của tất cả trạm khi đang chọn "Tất cả điểm đo". Mặc
    // định điền sẵn luôn "Từ ngày"/"Đến ngày" = đúng min/max của khoảng này (thay vì để trống).
    useEffect(() => {
        axiosInstance
            .get(`/salinity-detail/range/${filterKiHieu || "all"}`)
            .then((res) => {
                setFilterRange(res.data);
                setFilterStart(res.data?.minTime ? toVNDateKey(res.data.minTime) : "");
                setFilterEnd(res.data?.maxTime ? toVNDateKey(res.data.maxTime) : "");
            })
            .catch(() => setFilterRange({ minTime: null, maxTime: null, total: 0 }));
    }, [filterKiHieu]);

    const loadRows = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const params = { page: currentPage, limit };
            if (filterKiHieu) params.kihieu = filterKiHieu;
            if (filterStart) params.startDate = filterStart;
            if (filterEnd) params.endDate = filterEnd;

            const res = await axiosInstance.get("/salinity-detail", { params });
            const data = asArray(res.data);
            setRows(data);
            setPagination({
                page: res.data?.pagination?.page || currentPage,
                totalPages: res.data?.pagination?.totalPages || 1,
                total: res.data?.pagination?.total || data.length,
                limit: res.data?.pagination?.limit || limit,
            });
        } catch (loadError) {
            console.error("Error loading salinity detail:", loadError);
            setRows([]);
            setError(
                loadError?.response?.data?.message ||
                    loadError?.message ||
                    "Không tải được dữ liệu quan trắc.",
            );
        } finally {
            setLoading(false);
        }
    }, [currentPage, limit, filterKiHieu, filterStart, filterEnd]);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

    const clearFilters = () => {
        setCurrentPage(1);
        setFilterKiHieu("");
        setFilterStart("");
        setFilterEnd("");
    };

    // Khoảng ngày-giờ hiện có của trạm đang chọn TRONG FORM thêm/sửa (khóa input Thời điểm).
    useEffect(() => {
        if (!form.KiHieu) {
            setFormRange({ minTime: null, maxTime: null });
            return;
        }
        axiosInstance
            .get(`/salinity-detail/range/${form.KiHieu}`)
            .then((res) => setFormRange(res.data))
            .catch(() => setFormRange({ minTime: null, maxTime: null }));
    }, [form.KiHieu]);

    const openCreateModal = () => {
        setModalMode("create");
        setForm({ ...DEFAULT_FORM, KiHieu: filterKiHieu || "" });
        setFormErrors({});
        setShowModal(true);
    };

    const openEditModal = (row) => {
        setModalMode("edit");
        setForm({
            id: row.id,
            KiHieu: row.KiHieu,
            ThoiDiem: toDateTimeLocalValue(row.ThoiDiem),
            DoMan: row.DoMan ?? "",
            pH: row.pH ?? "",
            DoDanDien: row.DoDanDien ?? "",
            DoDuc: row.DoDuc ?? "",
        });
        setFormErrors({});
        setShowModal(true);
    };

    const handleSave = async (event) => {
        event.preventDefault();

        const nextErrors = {};
        if (!form.KiHieu) nextErrors.KiHieu = "Vui lòng chọn điểm đo";
        if (!form.ThoiDiem) nextErrors.ThoiDiem = "Thời điểm là bắt buộc";

        if (form.ThoiDiem && (formRange.minTime || formRange.maxTime)) {
            const minKey = formRange.minTime ? toDateTimeLocalValue(formRange.minTime) : null;
            const maxKey = formRange.maxTime ? toDateTimeLocalValue(formRange.maxTime) : null;
            // Khi sửa, cho phép giữ nguyên mốc hiện tại của chính dòng đang sửa dù nó là min/max.
            const isOwnBoundary =
                modalMode === "edit" && (form.ThoiDiem === minKey || form.ThoiDiem === maxKey);
            if (!isOwnBoundary) {
                if (minKey && form.ThoiDiem < minKey) {
                    nextErrors.ThoiDiem = `Chỉ được nhập trong khoảng dữ liệu hiện có của trạm (từ ${formatVNDateTime(formRange.minTime)})`;
                } else if (maxKey && form.ThoiDiem > maxKey) {
                    nextErrors.ThoiDiem = `Chỉ được nhập trong khoảng dữ liệu hiện có của trạm (đến ${formatVNDateTime(formRange.maxTime)})`;
                }
            }
        }

        if (Object.keys(nextErrors).length > 0) {
            setFormErrors(nextErrors);
            return;
        }
        setFormErrors({});

        try {
            const payload = {
                KiHieu: form.KiHieu,
                ThoiDiem: dateTimeLocalToIso(form.ThoiDiem),
                DoMan: toNullableNumber(form.DoMan),
                pH: toNullableNumber(form.pH),
                DoDanDien: toNullableNumber(form.DoDanDien),
                DoDuc: toNullableNumber(form.DoDuc),
            };

            if (modalMode === "create") {
                await axiosInstance.post("/salinity-detail", payload);
                ToastCommon(TOAST.SUCCESS, "Thêm bản ghi thành công");
            } else {
                await axiosInstance.put(`/salinity-detail/${form.id}`, payload);
                ToastCommon(TOAST.SUCCESS, "Cập nhật bản ghi thành công");
            }

            setShowModal(false);
            setForm(DEFAULT_FORM);
            await loadRows();
        } catch (saveError) {
            console.error("Error saving salinity detail:", saveError);
            ToastCommon(
                TOAST.ERROR,
                saveError?.response?.data?.message || saveError?.message || "Không thể lưu bản ghi",
            );
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await axiosInstance.delete(`/salinity-detail/${deleteTarget.id}`);
            ToastCommon(TOAST.SUCCESS, "Xóa bản ghi thành công");
            setDeleteTarget(null);
            await loadRows();
        } catch (deleteError) {
            console.error("Error deleting salinity detail:", deleteError);
            ToastCommon(
                TOAST.ERROR,
                deleteError?.response?.data?.message || deleteError?.message || "Không thể xóa bản ghi",
            );
        }
    };

    const filterMinDate = filterRange.minTime ? toVNDateKey(filterRange.minTime) : "";
    const filterMaxDate = filterRange.maxTime ? toVNDateKey(filterRange.maxTime) : "";
    const formMinDateTime = formRange.minTime ? toDateTimeLocalValue(formRange.minTime) : "";
    const formMaxDateTime = formRange.maxTime ? toDateTimeLocalValue(formRange.maxTime) : "";

    const stationSortedOptions = useMemo(
        () => STATION_CODES.map((code) => ({ code, name: STATION_NAMES[code] })),
        [],
    );

    const getSortValue = useCallback((row, key) => {
        if (key === "ThoiDiem") return new Date(row.ThoiDiem).getTime();
        if (key === "KiHieu") return STATION_NAMES[row.KiHieu] || row.KiHieu || "";
        return Number(row[key]);
    }, []);
    const { sortedRows, sortConfig, handleSort } = useSortableRows(rows, {
        defaultKey: "ThoiDiem",
        defaultDirection: "desc",
        getSortValue,
    });

    return (
        <div className="salinity-detail-management-tab">
            {loading && !rows.length && <Loading />}

            <div className="filter-section">
                <div className="filter-row">
                    <div className="filter-left">
                        <div className="filter-group">
                            <label htmlFor="salinityDetailStation">Điểm đo:</label>
                            <select
                                id="salinityDetailStation"
                                className="filter-input"
                                value={filterKiHieu}
                                onChange={(e) => {
                                    setCurrentPage(1);
                                    setFilterKiHieu(e.target.value);
                                    setFilterStart("");
                                    setFilterEnd("");
                                }}
                            >
                                <option value="">Tất cả điểm đo</option>
                                {stationSortedOptions.map((s) => (
                                    <option key={s.code} value={s.code}>
                                        {s.name} ({s.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group filter-group-date">
                            <label htmlFor="salinityDetailStart">Từ ngày:</label>
                            <LocalizedDateInput
                                id="salinityDetailStart"
                                className="filter-input"
                                value={filterStart}
                                min={filterMinDate || undefined}
                                max={filterEnd || filterMaxDate || undefined}
                                onChange={(e) => {
                                    setCurrentPage(1);
                                    setFilterStart(e.target.value);
                                }}
                            />
                        </div>

                        <div className="filter-group filter-group-date">
                            <label htmlFor="salinityDetailEnd">Đến ngày:</label>
                            <LocalizedDateInput
                                id="salinityDetailEnd"
                                className="filter-input"
                                value={filterEnd}
                                min={filterStart || filterMinDate || undefined}
                                max={filterMaxDate || undefined}
                                onChange={(e) => {
                                    setCurrentPage(1);
                                    setFilterEnd(e.target.value);
                                }}
                            />
                        </div>

                        <div className="filter-actions d-flex gap-2 flex-wrap">
                            <button className="btn btn-secondary" onClick={clearFilters}>
                                Xóa bộ lọc
                            </button>
                        </div>
                    </div>

                    <div className="filter-right">
                        {userInfo && (
                            <button className="btn btn-primary" onClick={openCreateModal}>
                                <i className="fas fa-plus me-1"></i>
                                Thêm dữ liệu mới
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
                    <p>Chưa có dữ liệu quan trắc nào theo bộ lọc hiện tại.</p>
                </div>
            ) : (
                <div className="table-container">
                    <div className="table-responsive rounded-3 border border-primary-subtle shadow-sm bg-white">
                        <table className="table table-striped table-hover align-middle mb-0">
                            <thead className="table-primary">
                                <tr>
                                    <th>#</th>
                                    <SortableHeader
                                        label="Thời điểm"
                                        sortKey="ThoiDiem"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                    />
                                    <SortableHeader
                                        label="Điểm đo"
                                        sortKey="KiHieu"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                    />
                                    <SortableHeader
                                        label="Độ mặn (‰)"
                                        sortKey="DoMan"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                    />
                                    <SortableHeader
                                        label="pH"
                                        sortKey="pH"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                    />
                                    <SortableHeader
                                        label="EC (S/m)"
                                        sortKey="DoDanDien"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                    />
                                    <SortableHeader
                                        label="Độ đục (NTU)"
                                        sortKey="DoDuc"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                    />
                                    {userInfo && <th style={{ width: 160 }}>Thao tác</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRows.map((row, index) => {
                                    const risk = getRiskBadgeMeta(row.DoMan, row.KiHieu);
                                    const hasValue =
                                        row.DoMan !== null &&
                                        row.DoMan !== undefined &&
                                        !Number.isNaN(Number(row.DoMan));

                                    return (
                                        <tr key={row.id}>
                                            <td>{(currentPage - 1) * limit + index + 1}</td>
                                            <td>{formatVNDateTime(row.ThoiDiem)}</td>
                                            <td>
                                                {STATION_NAMES[row.KiHieu] || row.KiHieu} ({row.KiHieu})
                                            </td>
                                            <td>
                                                {hasValue ? (
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span
                                                            className="fw-semibold"
                                                            style={{ color: risk.textColor }}
                                                        >
                                                            {formatMetric(row.DoMan, 2)}
                                                        </span>
                                                        <span
                                                            className="badge rounded-pill"
                                                            title={risk.description}
                                                            style={{
                                                                backgroundColor: risk.textColor,
                                                                color: "#fff",
                                                            }}
                                                        >
                                                            {risk.label}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            <td>{formatMetric(row.pH, 2)}</td>
                                            <td>{formatMetric(row.DoDanDien, 3)}</td>
                                            <td>{formatMetric(row.DoDuc, 2)}</td>
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
                                            ? "Thêm dữ liệu quan trắc"
                                            : "Cập nhật dữ liệu quan trắc"}
                                    </h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowModal(false)}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label required">Điểm đo</label>
                                            <select
                                                className={`form-control ${formErrors.KiHieu ? "is-invalid" : ""}`}
                                                value={form.KiHieu}
                                                onChange={(e) => {
                                                    setForm((prev) => ({ ...prev, KiHieu: e.target.value }));
                                                    setFormErrors((prev) => ({ ...prev, KiHieu: "" }));
                                                }}
                                            >
                                                <option value="" disabled>
                                                    Chọn điểm đo
                                                </option>
                                                {stationSortedOptions.map((s) => (
                                                    <option key={s.code} value={s.code}>
                                                        {s.name} ({s.code})
                                                    </option>
                                                ))}
                                            </select>
                                            {formErrors.KiHieu && (
                                                <div className="error-text">{formErrors.KiHieu}</div>
                                            )}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label required">
                                                Thời điểm (ngày + giờ)
                                            </label>
                                            <LocalizedDateTimeInput
                                                id="salinityDetailThoiDiem"
                                                className={`form-control ${formErrors.ThoiDiem ? "is-invalid" : ""}`}
                                                value={form.ThoiDiem}
                                                min={formMinDateTime || undefined}
                                                max={formMaxDateTime || undefined}
                                                disabled={!form.KiHieu}
                                                onChange={(e) => {
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        ThoiDiem: e.target.value,
                                                    }));
                                                    setFormErrors((prev) => ({ ...prev, ThoiDiem: "" }));
                                                }}
                                            />
                                            {form.KiHieu && (formMinDateTime || formMaxDateTime) && (
                                                <div className="form-text">
                                                    Chỉ nhập trong khoảng dữ liệu hiện có của trạm
                                                    {formRange.minTime
                                                        ? ` từ ${formatVNDateTime(formRange.minTime)}`
                                                        : ""}
                                                    {formRange.maxTime
                                                        ? ` đến ${formatVNDateTime(formRange.maxTime)}`
                                                        : ""}
                                                    .
                                                </div>
                                            )}
                                            {formErrors.ThoiDiem && (
                                                <div className="error-text">{formErrors.ThoiDiem}</div>
                                            )}
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Độ mặn (‰)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.DoMan}
                                                inputMode="decimal"
                                                onChange={(e) =>
                                                    setForm((prev) => ({ ...prev, DoMan: e.target.value }))
                                                }
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">pH</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.pH}
                                                inputMode="decimal"
                                                onChange={(e) =>
                                                    setForm((prev) => ({ ...prev, pH: e.target.value }))
                                                }
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">EC (S/m)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.DoDanDien}
                                                inputMode="decimal"
                                                onChange={(e) =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        DoDanDien: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Độ đục (NTU)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={form.DoDuc}
                                                inputMode="decimal"
                                                onChange={(e) =>
                                                    setForm((prev) => ({ ...prev, DoDuc: e.target.value }))
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowModal(false)}
                                    >
                                        Hủy
                                    </button>
                                    <button type="submit" className="btn btn-primary">
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
                    message={`Bạn có chắc chắn muốn xóa bản ghi lúc ${formatVNDateTime(deleteTarget.ThoiDiem)} của ${STATION_NAMES[deleteTarget.KiHieu] || deleteTarget.KiHieu}?`}
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

export default SalinityDetailManagementTab;
