import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";

import { updateSalinityData } from "../../stores/actions/salinityActions";
import { ToastCommon } from "@/components/ToastCommon";
import { TOAST } from "@/common/constants";

const parseLocalizedNumber = (value) => {
    if (value === "" || value === null || value === undefined) return null;

    const raw = String(value).trim();
    if (!raw) return null;

    const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
    const numericValue = Number(normalized);
    return Number.isFinite(numericValue) ? numericValue : null;
};

const formatLocalizedInputValue = (value, digits = 2) => {
    const numericValue = parseLocalizedNumber(value);
    if (numericValue === null) return "";

    return numericValue.toLocaleString("vi-VN", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
};

const normalizeLocalizedInputText = (value) => {
    const sanitized = String(value || "")
        .replace(/\s+/g, "")
        .replace(/[^\d,\.]/g, "")
        .replace(/\./g, ",");

    const firstCommaIndex = sanitized.indexOf(",");
    if (firstCommaIndex === -1) return sanitized;

    const integerPart = sanitized.slice(0, firstCommaIndex).replace(/,/g, "");
    const decimalPart = sanitized.slice(firstCommaIndex + 1).replace(/,/g, "");
    return `${integerPart},${decimalPart}`;
};

const EditSalinityModal = ({ record, onClose, onSuccess }) => {
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        Ngày: "",
        CRT: "",
        CTT: "",
        COT: "",
        CKC: "",
        KXAH: "",
        KXD2: "",
        MNB: "",
        PCL: "",
    });

    const [errors, setErrors] = useState({});
    const [originalData, setOriginalData] = useState({});

    // Station names for display
    const stations = {
        CRT: "Cầu Rạch Tra",
        CTT: "Cầu Thủ Thiêm",
        COT: "Cầu Ông Thìn",
        CKC: "Cống Kênh C",
        KXAH: "Kênh Xáng - An Hạ",
        KXD2: "Kênh Xáng đứng 2",
        MNB: "Mũi Nhà Bè",
        PCL: "Phà Cát Lái",
    };

    // Initialize form with record data (keep original precision)
    useEffect(() => {
        if (record) {
            const data = {
                Ngày: record.Ngày || "",
                CRT: record.CRT !== null && record.CRT !== "NULL" ? formatLocalizedInputValue(record.CRT, 2) : "",
                CTT: record.CTT !== null && record.CTT !== "NULL" ? formatLocalizedInputValue(record.CTT, 2) : "",
                COT: record.COT !== null && record.COT !== "NULL" ? formatLocalizedInputValue(record.COT, 2) : "",
                CKC: record.CKC !== null && record.CKC !== "NULL" ? formatLocalizedInputValue(record.CKC, 2) : "",
                KXAH:
                    record.KXAH !== null && record.KXAH !== "NULL"
                        ? formatLocalizedInputValue(record.KXAH, 2)
                        : "",
                KXD2:
                    record.KXD2 !== null && record.KXD2 !== "NULL"
                        ? formatLocalizedInputValue(record.KXD2, 2)
                        : "",
                MNB: record.MNB !== null && record.MNB !== "NULL" ? formatLocalizedInputValue(record.MNB, 2) : "",
                PCL: record.PCL !== null && record.PCL !== "NULL" ? formatLocalizedInputValue(record.PCL, 2) : "",
            };
            setFormData(data);
            setOriginalData(data);
        }
    }, [record]);

    // Handle input change
    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: name === "Ngày" ? value : normalizeLocalizedInputText(value),
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

        // Validate salinity values (if provided)
        Object.keys(stations).forEach((station) => {
            const value = formData[station];
            const numericValue = parseLocalizedNumber(value);
            if (value && (numericValue === null || numericValue < 0)) {
                newErrors[station] = "Giá trị độ mặn phải là số dương";
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Check if form has changes
    const hasChanges = () => {
        return Object.keys(formData).some((key) => formData[key] !== originalData[key]);
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // Prepare data for API (only changed fields)
            const submitData = {};

            Object.keys(stations).forEach((station) => {
                if (formData[station] !== originalData[station]) {
                    const value = formData[station];
                    const numericValue = parseLocalizedNumber(value);
                    submitData[station] = value !== "" && numericValue !== null ? Number(numericValue.toFixed(2)) : "NULL";
                }
            });

            await dispatch(
                updateSalinityData({
                    date: record.Ngày,
                    data: submitData,
                }),
            );
            ToastCommon(TOAST.SUCCESS, "Cập nhật dữ liệu độ mặn thành công");
            onSuccess();
        } catch (error) {
            ToastCommon(TOAST.ERROR, error.message || "Có lỗi xảy ra khi cập nhật dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    // Handle reset form
    const handleReset = () => {
        setFormData(originalData);
        setErrors({});
    };

    // Handle modal overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("vi-VN");
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-content salinity-modal">
                <div className="modal-header">
                    <h2>Chỉnh sửa dữ liệu độ mặn</h2>
                    <button className="modal-close" onClick={onClose} type="button">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body pt-4">
                    {/* Date Display */}
                    <div className="form-group date-group">
                        <div className="date-row">
                            <label>Ngày:</label>
                            <div className="date-display">
                                <i className="fas fa-calendar-alt"></i>
                                <span>{formatDate(formData.Ngày)}</span>
                            </div>
                            <span className="form-note">(Ngày không thể thay đổi)</span>
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
                                        {formData[key] !== originalData[key] && (
                                            <span className="changed-indicator">*</span>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        id={key}
                                        name={key}
                                        value={formData[key]}
                                        onChange={handleChange}
                                        onBlur={(e) => {
                                            const { name, value } = e.target;
                                            if (!value) return;
                                            setFormData((prev) => ({
                                                ...prev,
                                                [name]: formatLocalizedInputValue(value, 2),
                                            }));
                                        }}
                                        className={`form-input ${errors[key] ? "error" : ""} ${
                                            formData[key] !== originalData[key] ? "changed" : ""
                                        }`}
                                        placeholder="Nhập giá trị độ mặn"
                                        inputMode="decimal"
                                    />
                                    {errors[key] && <span className="error-text">{errors[key]}</span>}
                                    {originalData[key] && formData[key] !== originalData[key] && (
                                        <small className="original-value">
                                            Giá trị cũ: {originalData[key]}‰
                                        </small>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="form-note">
                        <i className="fas fa-info-circle"></i>
                        <span>
                            Để trống ô nhập liệu nếu muốn xóa giá trị. Các trường có dấu (*) đã được thay đổi.
                        </span>
                    </div>
                </form>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-outline"
                        onClick={handleReset}
                        disabled={loading}
                    >
                        <i className="fas fa-undo"></i>
                        Hoàn tác
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                        Hủy
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={loading || !hasChanges()}
                    >
                        {loading ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i>
                                Đang lưu...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save"></i>
                                Lưu thay đổi
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditSalinityModal;
