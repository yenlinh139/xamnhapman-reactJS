import { useEffect, useState } from "react";
import LocationPickerMap from "@components/common/LocationPickerMap";

const DEFAULT_FORM = { code: "", name: "", lat: "", lng: "" };

const parseCoordinate = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const normalized = Number(String(value).trim().replace(",", "."));
    return Number.isFinite(normalized) ? normalized : NaN;
};

// Modal dùng chung cho mọi tab "Quản trị dữ liệu" để thêm 1 điểm/trạm/hồ MỚI (chỉ thông tin vị trí:
// mã, tên, toạ độ) - KHÔNG phải thêm số liệu. Toạ độ nhập là độ thập phân (gõ tay hoặc bấm chọn
// trên bản đồ); nơi gọi modal quy đổi sang định dạng lưu DB (DMS) khi gửi lên server.
const AddLocationModal = ({
    show,
    onClose,
    onSubmit,
    saving,
    title = "Thêm vị trí mới",
    codeLabel = "Mã/Ký hiệu",
    nameLabel = "Tên",
    note,
}) => {
    const [form, setForm] = useState(DEFAULT_FORM);
    const [errors, setErrors] = useState({});
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        if (show) {
            setForm(DEFAULT_FORM);
            setErrors({});
            setShowPicker(false);
        }
    }, [show]);

    if (!show) return null;

    const setField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: "" }));
    };

    const handlePick = (pickedLat, pickedLng) => {
        setForm((prev) => ({ ...prev, lat: pickedLat.toFixed(6), lng: pickedLng.toFixed(6) }));
        setErrors((prev) => ({ ...prev, lat: "", lng: "" }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (saving) return;

        const nextErrors = {};
        const code = form.code.trim();
        const name = form.name.trim();
        if (!code) nextErrors.code = `${codeLabel} là bắt buộc`;
        if (!name) nextErrors.name = `${nameLabel} là bắt buộc`;

        const lat = parseCoordinate(form.lat);
        const lng = parseCoordinate(form.lng);
        if (form.lat === "" || Number.isNaN(lat)) nextErrors.lat = "Vĩ độ phải là số";
        else if (lat < -90 || lat > 90) nextErrors.lat = "Vĩ độ phải trong khoảng -90 đến 90";
        if (form.lng === "" || Number.isNaN(lng)) nextErrors.lng = "Kinh độ phải là số";
        else if (lng < -180 || lng > 180) nextErrors.lng = "Kinh độ phải trong khoảng -180 đến 180";

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            return;
        }

        await onSubmit({ code, name, lat, lng }, setErrors);
    };

    const pickedLat = parseCoordinate(form.lat);
    const pickedLng = parseCoordinate(form.lng);

    return (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content">
                    <form onSubmit={handleSubmit}>
                        <div className="modal-header">
                            <h5 className="modal-title">{title}</h5>
                            <button type="button" className="btn-close" onClick={onClose}></button>
                        </div>
                        <div className="modal-body">
                            {note && <div className="alert alert-warning small">{note}</div>}
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label required">{codeLabel}</label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.code ? "is-invalid" : ""}`}
                                        value={form.code}
                                        onChange={(e) => setField("code", e.target.value)}
                                    />
                                    {errors.code && <div className="error-text">{errors.code}</div>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label required">{nameLabel}</label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors.name ? "is-invalid" : ""}`}
                                        value={form.name}
                                        onChange={(e) => setField("name", e.target.value)}
                                    />
                                    {errors.name && <div className="error-text">{errors.name}</div>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label required">Vĩ độ (độ thập phân)</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className={`form-control ${errors.lat ? "is-invalid" : ""}`}
                                        placeholder="vd 10.823099"
                                        value={form.lat}
                                        onChange={(e) => setField("lat", e.target.value)}
                                    />
                                    {errors.lat && <div className="error-text">{errors.lat}</div>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label required">Kinh độ (độ thập phân)</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        className={`form-control ${errors.lng ? "is-invalid" : ""}`}
                                        placeholder="vd 106.629663"
                                        value={form.lng}
                                        onChange={(e) => setField("lng", e.target.value)}
                                    />
                                    {errors.lng && <div className="error-text">{errors.lng}</div>}
                                </div>
                                <div className="col-12">
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary btn-sm"
                                        onClick={() => setShowPicker((prev) => !prev)}
                                    >
                                        <i className="fas fa-map-marker-alt me-1"></i>
                                        {showPicker ? "Ẩn bản đồ" : "Chọn trên bản đồ"}
                                    </button>
                                    {showPicker && (
                                        <div className="mt-2">
                                            <LocationPickerMap
                                                lat={Number.isNaN(pickedLat) ? null : pickedLat}
                                                lng={Number.isNaN(pickedLng) ? null : pickedLng}
                                                onPick={handlePick}
                                            />
                                            <div className="form-text">Bấm vào bản đồ để chọn toạ độ.</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Hủy
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? "Đang lưu..." : "Thêm vị trí"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddLocationModal;
