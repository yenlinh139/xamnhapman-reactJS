import { useCallback, useEffect, useMemo, useState } from "react";
import axiosInstance from "@config/axios-config";
import ModalConfirm from "../../components/ModalConfirm";
import { ToastCommon } from "@/components/ToastCommon";
import { TOAST } from "@/common/constants";
import AddLocationModal from "@components/common/AddLocationModal";
import { decimalToDMS } from "@components/convertDMSToDecimal";
import { toDecimalCoordinate } from "@common/dataExport";
import SortableHeader from "@components/common/SortableHeader";
import { useSortableRows } from "@common/useSortableRows";

// Nhãn hiển thị cho các thuộc tính ngoài mã/tên/toạ độ - khớp đúng tên cột DB (xem
// backend/src/controllers/salinity/getSalinity.controller.js, stationData.controller.js).
const EXTRA_FIELD_LABELS = {
    PhanLoai: "Phân loại",
    YeuTo: "Yếu tố đo",
    ThoiGian: "Thời gian hoạt động",
    TanSuat: "Tần suất",
    Note: "Ghi chú",
};

const extraFieldsOf = (keys) =>
    keys.map((key) => ({ key, label: EXTRA_FIELD_LABELS[key], multiline: key === "Note" }));

// Cấu hình từng loại điểm/trạm - dùng chung 1 UI (bảng + modal thêm/sửa + xác nhận xoá), chỉ khác
// API/tên trường/thuộc tính.
const LOCATION_TYPE_CONFIG = {
    salinity: {
        label: "Điểm đo mặn",
        nameLabel: "Tên điểm đo",
        nameKey: "TenDiem",
        listUrl: "/salinity-points",
        createUrl: "/salinity-points",
        updateUrl: (code) => `/salinity-points/${code}`,
        deleteUrl: (code) => `/salinity-points/${code}`,
        extraKeys: ["PhanLoai", "ThoiGian", "TanSuat", "Note"],
    },
    rain: {
        label: "Điểm đo mưa",
        nameLabel: "Tên điểm đo",
        nameKey: "Ten",
        listUrl: "/station-data/rain/stations",
        createUrl: "/station-data/rain/stations",
        updateUrl: (code) => `/station-data/rain/stations/${code}`,
        deleteUrl: (code) => `/station-data/rain/stations/${code}`,
        extraKeys: ["PhanLoai", "YeuTo", "ThoiGian", "TanSuat"],
    },
    meteo: {
        label: "Trạm khí tượng",
        nameLabel: "Tên trạm",
        nameKey: "Ten",
        listUrl: "/station-data/meteo/stations",
        createUrl: "/station-data/meteo/stations",
        updateUrl: (code) => `/station-data/meteo/stations/${code}`,
        deleteUrl: (code) => `/station-data/meteo/stations/${code}`,
        extraKeys: ["PhanLoai", "YeuTo", "ThoiGian", "TanSuat"],
    },
    hydro: {
        label: "Trạm thủy văn",
        nameLabel: "Tên trạm",
        nameKey: "Ten",
        listUrl: "/station-data/hydro/stations",
        createUrl: "/station-data/hydro/stations",
        updateUrl: (code) => `/station-data/hydro/stations/${code}`,
        deleteUrl: (code) => `/station-data/hydro/stations/${code}`,
        extraKeys: ["PhanLoai", "YeuTo", "ThoiGian", "TanSuat"],
    },
    reservoir: {
        label: "Hồ chứa thượng lưu",
        nameLabel: "Tên hồ",
        nameKey: "Ten",
        listUrl: "/station-data/reservoir/stations",
        createUrl: "/station-data/reservoir/stations",
        updateUrl: (code) => `/station-data/reservoir/stations/${code}`,
        deleteUrl: (code) => `/station-data/reservoir/stations/${code}`,
        extraKeys: ["YeuTo", "ThoiGian", "TanSuat"],
    },
};

const formatCoordinate = (value) => (Number.isFinite(value) ? value.toFixed(6) : "-");

const asArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

// Sub-tab "Vị trí" dùng chung cho mọi loại điểm/trạm (trừ Trạm IoT - gắn thiết bị phần cứng thật
// nên đăng ký/gỡ trạm cần làm riêng, không có sub-tab này). Bảng vị trí + thuộc tính đầy đủ, kèm
// Thêm/Sửa/Xóa; "Xóa" là xoá mềm (backend set deleted_at) - áp dụng cho MỌI vị trí, không còn khoá
// riêng cho vị trí chính thức.
const LocationManagementPanel = ({ userInfo, type }) => {
    const config = LOCATION_TYPE_CONFIG[type];
    const extraFields = useMemo(() => extraFieldsOf(config.extraKeys), [config]);

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const loadRows = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const res = await axiosInstance.get(config.listUrl);
            const list = asArray(res.data);
            setRows(
                list.map((item) => ({
                    code: item.KiHieu,
                    name: item[config.nameKey],
                    lat: toDecimalCoordinate(item.ViDo),
                    lng: toDecimalCoordinate(item.KinhDo),
                    isCustom: Boolean(item.isCustom),
                    extra: Object.fromEntries(config.extraKeys.map((key) => [key, item[key] || ""])),
                })),
            );
        } catch (loadError) {
            console.error("Error loading locations:", loadError);
            setError("Không tải được danh sách vị trí.");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [config]);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

    const handleCreate = async ({ code, name, lat, lng, ...extra }, setFormErrors) => {
        try {
            setSaving(true);
            await axiosInstance.post(config.createUrl, {
                KiHieu: code,
                [config.nameKey]: name,
                KinhDo: decimalToDMS(lng, false),
                ViDo: decimalToDMS(lat, true),
                ...extra,
            });
            ToastCommon(TOAST.SUCCESS, "Thêm vị trí thành công");
            setShowCreateModal(false);
            await loadRows();
        } catch (createError) {
            console.error("Error creating location:", createError);
            const message =
                createError?.response?.data?.message || createError?.message || "Không thể thêm vị trí";
            if (createError?.response?.status === 409) setFormErrors({ code: message });
            ToastCommon(TOAST.ERROR, message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async ({ name, lat, lng, ...extra }, setFormErrors) => {
        try {
            setSaving(true);
            await axiosInstance.put(config.updateUrl(editingRow.code), {
                [config.nameKey]: name,
                KinhDo: decimalToDMS(lng, false),
                ViDo: decimalToDMS(lat, true),
                ...extra,
            });
            ToastCommon(TOAST.SUCCESS, "Cập nhật vị trí thành công");
            setEditingRow(null);
            await loadRows();
        } catch (updateError) {
            console.error("Error updating location:", updateError);
            const message =
                updateError?.response?.data?.message || updateError?.message || "Không thể cập nhật vị trí";
            setFormErrors({ name: message });
            ToastCommon(TOAST.ERROR, message);
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleting(true);
            await axiosInstance.delete(config.deleteUrl(deleteTarget.code));
            ToastCommon(TOAST.SUCCESS, "Xoá vị trí thành công");
            setDeleteTarget(null);
            await loadRows();
        } catch (deleteError) {
            console.error("Error deleting location:", deleteError);
            ToastCommon(
                TOAST.ERROR,
                deleteError?.response?.data?.message || deleteError?.message || "Không thể xoá vị trí",
            );
        } finally {
            setDeleting(false);
        }
    };

    const openEdit = (row) => {
        setEditingRow({ code: row.code, name: row.name, lat: row.lat, lng: row.lng, ...row.extra });
    };

    const getSortValue = useCallback((row, key) => {
        if (key === "lat" || key === "lng") return row[key];
        if (key.startsWith("extra.")) return row.extra[key.slice(6)] || "";
        return row[key] || "";
    }, []);
    const { sortedRows, sortConfig, handleSort } = useSortableRows(rows, {
        defaultKey: "name",
        defaultDirection: "asc",
        getSortValue,
    });

    return (
        <div className="location-management-panel">
            {userInfo && (
                <div className="d-flex justify-content-end mb-2">
                    <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                        <i className="fas fa-plus me-1"></i>
                        Thêm vị trí
                    </button>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <p className="text-muted">Đang tải...</p>
            ) : rows.length === 0 ? (
                <p className="text-muted">Chưa có vị trí nào.</p>
            ) : (
                <div className="table-container">
                    <div className="table-responsive rounded-3 border border-primary-subtle shadow-sm bg-white">
                        <table className="table table-striped table-hover align-middle mb-0">
                            <thead className="table-primary">
                                <tr>
                                    <SortableHeader
                                        label="Mã"
                                        sortKey="code"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                    />
                                    <SortableHeader
                                        label={config.nameLabel}
                                        sortKey="name"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                    />
                                    <SortableHeader
                                        label="Vĩ độ"
                                        sortKey="lat"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                    />
                                    <SortableHeader
                                        label="Kinh độ"
                                        sortKey="lng"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                    />
                                    {extraFields.map((field) => (
                                        <SortableHeader
                                            key={field.key}
                                            label={field.label}
                                            sortKey={`extra.${field.key}`}
                                            sortConfig={sortConfig}
                                            onSort={handleSort}
                                        />
                                    ))}
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRows.map((row) => (
                                    <tr key={row.code}>
                                        <td>{row.code}</td>
                                        <td>{row.name}</td>
                                        <td>{formatCoordinate(row.lat)}</td>
                                        <td>{formatCoordinate(row.lng)}</td>
                                        {extraFields.map((field) => (
                                            <td key={field.key}>{row.extra[field.key] || "-"}</td>
                                        ))}
                                        <td className="text-nowrap">
                                            {userInfo && (
                                                <button
                                                    type="button"
                                                    className="btn btn-link btn-sm p-0 me-3"
                                                    onClick={() => openEdit(row)}
                                                >
                                                    Sửa
                                                </button>
                                            )}
                                            {userInfo && (
                                                <button
                                                    type="button"
                                                    className="btn btn-link btn-sm p-0 text-danger"
                                                    onClick={() => setDeleteTarget(row)}
                                                >
                                                    Xóa
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <AddLocationModal
                show={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSubmit={handleCreate}
                saving={saving}
                title={`Thêm ${config.label.toLowerCase()} mới`}
                codeLabel="Mã/Ký hiệu"
                nameLabel={config.nameLabel}
                extraFields={extraFields}
            />

            <AddLocationModal
                show={Boolean(editingRow)}
                onClose={() => setEditingRow(null)}
                onSubmit={handleUpdate}
                saving={saving}
                title={`Sửa ${config.label.toLowerCase()}`}
                codeLabel="Mã/Ký hiệu"
                nameLabel={config.nameLabel}
                initialValues={editingRow}
                extraFields={extraFields}
            />

            {deleteTarget && (
                <ModalConfirm
                    title="Xác nhận xoá vị trí"
                    message={`Bạn có chắc chắn muốn xoá vị trí "${deleteTarget.name}" (${deleteTarget.code})? Vị trí sẽ bị ẩn khỏi mọi danh sách/bản đồ, số liệu liên quan vẫn được giữ lại.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                    confirmText={deleting ? "Đang xoá..." : "Xóa"}
                    cancelText="Hủy"
                    type="danger"
                />
            )}
        </div>
    );
};

export default LocationManagementPanel;
