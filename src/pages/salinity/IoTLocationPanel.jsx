import { useCallback, useEffect, useState } from "react";
import axiosInstance from "@config/axios-config";
import ModalConfirm from "../../components/ModalConfirm";
import { ToastCommon } from "@/components/ToastCommon";
import { TOAST } from "@/common/constants";
import AddLocationModal from "@components/common/AddLocationModal";
import { fetchIoTStations } from "@components/map/mapDataServices";
import SortableHeader from "@components/common/SortableHeader";
import { useSortableRows } from "@common/useSortableRows";
import { toDecimalCoordinate } from "@common/dataExport";

const EXTRA_FIELDS = [{ key: "station_code", label: "Mã trạm" }];

const formatCoordinate = (value) => (Number.isFinite(value) ? value.toFixed(6) : "-");

// Sub-tab "Vị trí" của Trạm IoT - CÙNG 1 kiểu bảng/hành vi (thêm/sửa/xoá) với các loại điểm/trạm
// khác (xem LocationManagementPanel.jsx), nhưng nói chuyện với API /iot/stations riêng vì IoT dùng
// bảng/cấu trúc khác (iot_system.iot_stations, toạ độ lưu thẳng ĐỘ THẬP PHÂN - không quy đổi DMS
// như DiemDoMan/TramKTTV/HoChua) - tái dùng đúng cột toạ độ có sẵn, không tạo thêm bảng/cột mới.
const IoTLocationPanel = ({ userInfo }) => {
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
            const result = await fetchIoTStations(null, { forceRefresh: true, basic: true });
            const list = Array.isArray(result?.data) ? result.data : [];
            setRows(
                list.map((item) => ({
                    code: item.serial_number,
                    name: item.station_name,
                    // Toa do cu co the dang luu DMS (vd 106°29'56"E) - quy doi ve do thap phan de
                    // hien thi/sua thong nhat voi cac loai diem/tram khac (dung chung toDecimalCoordinate).
                    lat: toDecimalCoordinate(item.latitude),
                    lng: toDecimalCoordinate(item.longitude),
                    extra: { station_code: item.station_code || "" },
                })),
            );
        } catch (loadError) {
            console.error("Error loading IoT stations:", loadError);
            setError("Không tải được danh sách vị trí.");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

    const handleCreate = async ({ code, name, lat, lng, station_code }, setFormErrors) => {
        try {
            setSaving(true);
            await axiosInstance.post("/iot/stations", {
                serial_number: code,
                station_name: name,
                station_code: station_code || null,
                latitude: lat,
                longitude: lng,
            });
            ToastCommon(TOAST.SUCCESS, "Thêm vị trí thành công");
            setShowCreateModal(false);
            await loadRows();
        } catch (createError) {
            console.error("Error creating IoT station:", createError);
            const message =
                createError?.response?.data?.message || createError?.message || "Không thể thêm vị trí";
            if (createError?.response?.status === 409) setFormErrors({ code: message });
            ToastCommon(TOAST.ERROR, message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async ({ name, lat, lng, station_code }, setFormErrors) => {
        try {
            setSaving(true);
            await axiosInstance.put(`/iot/stations/${editingRow.code}`, {
                station_name: name,
                station_code: station_code || null,
                latitude: lat,
                longitude: lng,
            });
            ToastCommon(TOAST.SUCCESS, "Cập nhật vị trí thành công");
            setEditingRow(null);
            await loadRows();
        } catch (updateError) {
            console.error("Error updating IoT station:", updateError);
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
            await axiosInstance.delete(`/iot/stations/${deleteTarget.code}`);
            ToastCommon(TOAST.SUCCESS, "Xoá vị trí thành công");
            setDeleteTarget(null);
            await loadRows();
        } catch (deleteError) {
            console.error("Error deleting IoT station:", deleteError);
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
                                        label="Serial number"
                                        sortKey="code"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                    />
                                    <SortableHeader
                                        label="Mã trạm"
                                        sortKey="extra.station_code"
                                        sortConfig={sortConfig}
                                        onSort={handleSort}
                                    />
                                    <SortableHeader
                                        label="Tên trạm"
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
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRows.map((row) => (
                                    <tr key={row.code}>
                                        <td>{row.code}</td>
                                        <td>{row.extra.station_code || "-"}</td>
                                        <td>{row.name}</td>
                                        <td>{formatCoordinate(row.lat)}</td>
                                        <td>{formatCoordinate(row.lng)}</td>
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
                title="Thêm trạm IoT mới"
                codeLabel="Serial number"
                nameLabel="Tên trạm"
                extraFields={EXTRA_FIELDS}
            />

            <AddLocationModal
                show={Boolean(editingRow)}
                onClose={() => setEditingRow(null)}
                onSubmit={handleUpdate}
                saving={saving}
                title="Sửa trạm IoT"
                codeLabel="Serial number"
                nameLabel="Tên trạm"
                initialValues={editingRow}
                extraFields={EXTRA_FIELDS}
            />

            {deleteTarget && (
                <ModalConfirm
                    title="Xác nhận xoá vị trí"
                    message={`Bạn có chắc chắn muốn xoá trạm "${deleteTarget.name}" (${deleteTarget.code})? Trạm sẽ bị ẩn khỏi mọi danh sách/bản đồ, số liệu liên quan vẫn được giữ lại.`}
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

export default IoTLocationPanel;
