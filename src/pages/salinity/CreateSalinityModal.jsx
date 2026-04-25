import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { createSalinityData } from "../../stores/actions/salinityActions";
import { ToastCommon } from "@/components/ToastCommon";
import { TOAST } from "@/common/constants";

const STATION_FIELD_KEYS = ["CRT", "CTT", "COT", "CKC", "KXAH", "KXD2", "MNB", "PCL"];
const ORDERED_FIELDS = ["Ngày", ...STATION_FIELD_KEYS];

const formatDateDisplay = (dateString) => {
    if (!dateString) return "";
    const raw = String(dateString).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const [year, month, day] = raw.split("-");
        return `${day}/${month}/${year}`;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
        return raw;
    }

    return "";
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

const normalizeHeader = (value = "") => String(value).trim().replace(/\s+/g, "").toUpperCase();

const normalizeDateForInput = (rawValue) => {
    if (!rawValue) return "";

    const value = String(rawValue).trim();

    // Already ISO date (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return formatDateDisplay(value);
    }

    // DD/MM/YYYY or MM/DD/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
        const [first, second, year] = value.split("/").map((item) => Number(item));

        // Prefer MM/DD/YYYY (same behavior as existing codebase), fallback when invalid.
        const month = first;
        const day = second;
        const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const parsed = new Date(iso);
        if (!Number.isNaN(parsed.getTime())) return formatDateDisplay(iso);

        const fallbackIso = `${year}-${String(second).padStart(2, "0")}-${String(first).padStart(2, "0")}`;
        const fallbackParsed = new Date(fallbackIso);
        if (!Number.isNaN(fallbackParsed.getTime())) return formatDateDisplay(fallbackIso);
    }

    // Excel serial date
    if (/^\d+(\.\d+)?$/.test(value)) {
        const excelSerial = Number(value);
        if (Number.isFinite(excelSerial) && excelSerial > 59) {
            const epoch = new Date(Date.UTC(1899, 11, 30));
            const result = new Date(epoch.getTime() + Math.floor(excelSerial) * 24 * 60 * 60 * 1000);
            return formatDateDisplay(result.toISOString().split("T")[0]);
        }
    }

    return "";
};

const parseLocalizedNumber = (value) => {
    if (value === "" || value === null || value === undefined) return null;

    const raw = String(value).trim();
    if (!raw) return null;

    const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
    const numeric = Number.parseFloat(normalized);
    return Number.isFinite(numeric) ? numeric : null;
};

const formatLocalizedInputValue = (value, digits = 2) => {
    const numeric = parseLocalizedNumber(value);
    if (numeric === null) return "";

    return numeric.toLocaleString("vi-VN", {
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

const parseNumericCell = (rawValue) => {
    const value = String(rawValue || "").trim();
    if (!value || value.toUpperCase() === "NULL") return "";

    const numeric = Number.parseFloat(value.replace(",", "."));
    return Number.isFinite(numeric) ? formatLocalizedInputValue(numeric, 2) : null;
};

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
        KXD2: "",
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
        KXD2: "Kênh Xáng đứng 2",
        MNB: "Mũi Nhà Bè",
        PCL: "Phà Cát Lái",
    };

    // Handle input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        const nextValue =
            name === "Ngày" ? normalizeDateInputText(value) : normalizeLocalizedInputText(value);

        setFormData((prev) => ({
            ...prev,
            [name]: nextValue,
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: "",
            }));
        }
    };

    const applyParsedRowToForm = (rowObject) => {
        setFormData((prev) => ({
            ...prev,
            ...rowObject,
        }));

        setErrors((prev) => {
            const next = { ...prev };
            if (rowObject.Ngày) delete next.Ngày;
            STATION_FIELD_KEYS.forEach((key) => {
                if (rowObject[key] !== undefined) {
                    delete next[key];
                }
            });
            return next;
        });
    };

    const parseExcelText = (rawText) => {
        const text = String(rawText || "").trim();
        if (!text) return null;

        const rows = text
            .split(/\r?\n/)
            .map((line) => line.split("\t").map((item) => item.trim()))
            .filter((cells) => cells.some((item) => item !== ""));

        if (rows.length === 0) return null;

        const headerRow = rows[0].map(normalizeHeader);
        const knownHeaders = new Set(["NGAY", ...STATION_FIELD_KEYS]);
        const hasHeader = headerRow.some((header) => knownHeaders.has(header));

        const dataRow = hasHeader ? rows[1] : rows[0];
        if (!dataRow) return null;

        const parsed = {};
        const sequentialCells = [];

        if (hasHeader) {
            headerRow.forEach((header, index) => {
                const cell = dataRow[index];
                if (header === "NGAY") {
                    parsed.Ngày = normalizeDateForInput(cell);
                } else if (STATION_FIELD_KEYS.includes(header)) {
                    const parsedNumeric = parseNumericCell(cell);
                    if (parsedNumeric !== null) parsed[header] = parsedNumeric;
                }
            });
        } else {
            dataRow.forEach((cell) => sequentialCells.push(cell));
        }

        return {
            hasHeader,
            data: parsed,
            sequentialCells,
        };
    };

    const buildRowDataFromSequentialCells = (startField, cells = []) => {
        const startIndex = ORDERED_FIELDS.indexOf(startField);
        if (startIndex < 0) return {};

        const parsed = {};
        cells.forEach((cell, offset) => {
            const field = ORDERED_FIELDS[startIndex + offset];
            if (!field) return;

            if (field === "Ngày") {
                const normalizedDate = normalizeDateForInput(cell);
                if (normalizedDate) parsed.Ngày = normalizedDate;
                return;
            }

            const parsedNumeric = parseNumericCell(cell);
            if (parsedNumeric !== null) {
                parsed[field] = parsedNumeric;
            }
        });

        return parsed;
    };

    const handleCellPaste = (field, e) => {
        const pastedText = e.clipboardData?.getData("text") || "";
        if (!pastedText) return;

        e.preventDefault();

        const parsedResult = parseExcelText(pastedText);
        if (!parsedResult) {
            ToastCommon(TOAST.ERROR, "Không có dữ liệu hợp lệ để dán");
            return;
        }

        const { hasHeader, data: headerMappedData, sequentialCells } = parsedResult;
        const nextData = hasHeader
            ? headerMappedData
            : buildRowDataFromSequentialCells(field, sequentialCells);

        if (Object.keys(nextData).length === 0) {
            ToastCommon(TOAST.ERROR, "Không nhận diện được dữ liệu để điền vào bảng");
            return;
        }

        if (field === "Ngày" && !nextData.Ngày) {
            ToastCommon(TOAST.ERROR, "Không đọc được cột Ngày từ dữ liệu dán");
            return;
        }

        applyParsedRowToForm(nextData);
        ToastCommon(TOAST.SUCCESS, "Đã dán dữ liệu vào các ô tương ứng");
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        // Validate date
        if (!formData.Ngày) {
            newErrors.Ngày = "Ngày là bắt buộc";
        } else if (!parseDisplayDateToIso(formData.Ngày)) {
            newErrors.Ngày = "Ngày phải đúng định dạng dd/mm/yyyy";
        }

        // Validate salinity values (if provided)
        Object.keys(stations).forEach((station) => {
            const value = formData[station];
            const numeric = parseLocalizedNumber(value);
            if (value && (numeric === null || numeric < 0)) {
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
                Ngày: parseDisplayDateToIso(formData.Ngày),
            };

            // Add non-empty salinity values
            Object.keys(stations).forEach((station) => {
                const value = formData[station];
                if (value !== "") {
                    const numeric = parseLocalizedNumber(value);
                    submitData[station] = numeric !== null ? Number(numeric.toFixed(2)) : "NULL";
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
                    <div className="salinity-measurements">
                        <h3>Giá trị độ mặn (‰)</h3>
                        <div className="table-responsive">
                            <table className="table table-sm ">
                                <thead className="table-light">
                                    <tr>
                                        <th className="required">Ngày</th>
                                        {Object.entries(stations).map(([key, name]) => (
                                            <th key={key} title={name}>
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody style={{ border: "none" }}>
                                    <tr>
                                        <td style={{ minWidth: 140, border: "none" }}>
                                            <input
                                                type="text"
                                                id="date"
                                                name="Ngày"
                                                value={formData.Ngày}
                                                onChange={handleChange}
                                                onPaste={(e) => handleCellPaste("Ngày", e)}
                                                className={`form-input ${errors.Ngày ? "error" : ""}`}
                                                placeholder="dd/mm/yyyy"
                                                inputMode="numeric"
                                                maxLength={10}
                                                required
                                            />
                                            {errors.Ngày && (
                                                <div
                                                    className="error-text mt-1"
                                                    style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}
                                                >
                                                    {errors.Ngày}
                                                </div>
                                            )}
                                        </td>
                                        {Object.entries(stations).map(([key, name]) => (
                                            <td key={key} style={{ minWidth: 120, border: "none" }}>
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
                                                    onPaste={(e) => handleCellPaste(key, e)}
                                                    className={`form-input ${errors[key] ? "error" : ""}`}
                                                    placeholder={name}
                                                    inputMode="decimal"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        {Object.keys(stations).some((key) => errors[key]) && (
                            <div className="error-text mt-2">
                                Có ô dữ liệu không hợp lệ, vui lòng kiểm tra lại.
                            </div>
                        )}
                    </div>

                    <div className="form-note">
                        <i className="fas fa-info-circle"></i>
                        <span>
                            Nhập theo dạng bảng. Đứng tại ô Ngày rồi paste 1 dòng từ Excel là dữ liệu sẽ tự
                            nhảy qua các ô tương ứng theo thứ tự cột.
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
