import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { createSalinityData } from "../../stores/actions/salinityActions";
import { ToastCommon } from "@/components/ToastCommon";
import { TOAST } from "@/common/constants";

const CreateSalinityModal = ({ onClose, onSuccess }) => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        Ngày: "",
        CRT: "",
        CTT: "",
        COT: "",
        CKC: "",
        KXAH: "",
        MNB: "",
        PCL: "",
    });

    const [errors, setErrors] = useState({});

    // Station names for display
    const stations = {
        CRT: "Cầu Rạch Tra",
        CTT: "Cầu Thủ Thiêm",
        COT: "Cầu Ông Thìn",
        CKC: "Cống Kênh C",
        KXAH: "Kênh Xáng - An Hạ",
        MNB: "Mũi Nhà Bè",
        PCL: "Phà Cát Lái",
    };

    // Handle input change
    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: "",
            }));
        }
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        // Validate date
        if (!formData.Ngày) {
            newErrors.Ngày = "Ngày là bắt buộc";
        }

        // Validate salinity values (if provided)
        Object.keys(stations).forEach((station) => {
            const value = formData[station];
            if (value && (isNaN(value) || parseFloat(value) < 0)) {
                newErrors[station] = "Giá trị độ mặn phải là số dương";
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // Prepare data for API
            const submitData = {
                Ngày: formData.Ngày,
            };

            // Add non-empty salinity values
            Object.keys(stations).forEach((station) => {
                const value = formData[station];
                if (value !== "") {
                    submitData[station] = value ? parseFloat(value) : "NULL";
                } else {
                    submitData[station] = "NULL";
                }
            });

            await dispatch(createSalinityData(submitData));
            ToastCommon(TOAST.SUCCESS, "Tạo dữ liệu độ mặn thành công");
            onSuccess();
        } catch (error) {
            ToastCommon(TOAST.ERROR, error.message || "Có lỗi xảy ra khi tạo dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    // Handle modal overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-content salinity-modal">
                <div className="modal-header">
                    <h2>Thêm dữ liệu độ mặn mới</h2>
                    <button className="modal-close" onClick={onClose} type="button">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body pt-4">
                    {/* Date Input */}
                    <div className="form-group date-group">
                        <div className="date-row">
                            <label htmlFor="date" className="required">
                                Ngày <span className="required-star">*</span>
                            </label>
                            <input
                                type="date"
                                id="date"
                                name="Ngày"
                                value={formData.Ngày}
                                onChange={handleChange}
                                className={`form-input ${errors.Ngày ? "error" : ""}`}
                                required
                            />
                            {errors.Ngày && <span className="error-text">{errors.Ngày}</span>}
                        </div>
                    </div>

                    {/* Salinity Measurements */}
                    <div className="salinity-measurements">
                        <h3>Giá trị độ mặn (‰)</h3>
                        <div className="measurements-grid">
                            {Object.entries(stations).map(([key, name]) => (
                                <div key={key} className="form-group">
                                    <label htmlFor={key}>
                                        {name} ({key})
                                    </label>
                                    <input
                                        type="number"
                                        id={key}
                                        name={key}
                                        value={formData[key]}
                                        onChange={handleChange}
                                        className={`form-input ${errors[key] ? "error" : ""}`}
                                        placeholder="Nhập giá trị độ mặn"
                                        step="0.1"
                                        min="0"
                                    />
                                    {errors[key] && <span className="error-text">{errors[key]}</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="form-note">
                        <i className="fas fa-info-circle"></i>
                        <span>
                            Bạn có thể để trống các trạm chưa có dữ liệu. Giá trị độ mặn được tính bằng đơn vị
                            ‰ (phần nghìn).
                        </span>
                    </div>
                </form>

                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                        Hủy
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i>
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-plus"></i>
                                Tạo dữ liệu
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateSalinityModal;
