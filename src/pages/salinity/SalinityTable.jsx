import React, { useMemo, useCallback } from "react";

const SalinityTable = ({
    data,
    onEdit,
    onDelete,
    selectedRecords,
    onRecordSelection,
    onSelectAll,
    canEdit,
    canDelete,
    loading,
}) => {
    // Station names for display
    const stations = {
        CRT: "Cầu Rạch Trà",
        CTT: "Cầu Thủ Thiêm",
        COT: "Cầu Ông Thìn",
        CKC: "Cống Kênh C",
        KXAH: "Kênh Xáng - An Hạ",
        MNB: "Mũi Nhà Bè",
        PCL: "Phà Cát Lái",
    };

    // Check if record is selected
    const isRecordSelected = useCallback(
        (record) => {
            return selectedRecords.some((r) => r.Ngày === record.Ngày);
        },
        [selectedRecords],
    );

    // Check if all records are selected
    const areAllSelected = useMemo(() => {
        return data.length > 0 && selectedRecords.length === data.length;
    }, [data.length, selectedRecords.length]);

    // Handle record selection
    const handleRecordChange = useCallback(
        (record, isSelected) => {
            onRecordSelection(record, isSelected);
        },
        [onRecordSelection],
    );

    // Handle select all
    const handleSelectAllChange = useCallback(
        (e) => {
            onSelectAll(e.target.checked);
        },
        [onSelectAll],
    );

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("vi-VN");
    };

    // Format salinity value (only for display, data remains unchanged)
    const formatSalinity = (value) => {
        if (value === "NULL" || value === null || value === undefined || value === "") {
            return <span className="no-data">--</span>;
        }
        // Only round for display, keep original data intact
        const numericValue = parseFloat(value);
        if (isNaN(numericValue)) {
            return <span className="no-data">--</span>;
        }
        const roundedValue = numericValue.toFixed(2);
        return <span className="salinity-value">{roundedValue}‰</span>;
    };

    // Get salinity level class (use original data for classification)
    const getSalinityClass = (value) => {
        if (value === "NULL" || value === null || value === undefined || value === "") return "no-data";
        const numericValue = parseFloat(value);
        if (isNaN(numericValue)) return "no-data";
        if (numericValue < 1) return "low"; // Bình thường: < 1‰
        if (numericValue <= 4) return "medium"; // Rủi ro cấp 2: 1‰ - 4‰
        return "high"; // Rủi ro cấp 4: > 4‰
    };

    return (
        <div className="salinity-table-wrapper">
            <table className="salinity-table">
                <thead>
                    <tr>
                        {(canEdit || canDelete) && (
                            <th className="checkbox-column">
                                <input
                                    type="checkbox"
                                    checked={areAllSelected}
                                    onChange={handleSelectAllChange}
                                    disabled={data.length === 0}
                                />
                            </th>
                        )}
                        <th className="date-column">
                            Ngày
                            <i className="fas fa-calendar-alt"></i>
                        </th>
                        {Object.entries(stations).map(([key, name]) => (
                            <th key={key} className="station-column">
                                <div className="station-header">
                                    <span className="station-name">{name}</span>
                                    <span className="station-code">({key})</span>
                                </div>
                            </th>
                        ))}
                        {(canEdit || canDelete) && <th className="actions-column">Thao tác</th>}
                    </tr>
                </thead>
                <tbody>
                    {loading && data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={2 + Object.keys(stations).length + (canEdit || canDelete ? 2 : 0)}
                                className="loading-row"
                            >
                                <div className="loading-content">
                                    <i className="fas fa-spinner fa-spin"></i>
                                    <span>Đang tải dữ liệu...</span>
                                </div>
                            </td>
                        </tr>
                    ) : data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={2 + Object.keys(stations).length + (canEdit || canDelete ? 2 : 0)}
                                className="no-data-row"
                            >
                                <div className="no-data-content">
                                    <i className="fas fa-water"></i>
                                    <span>Không có dữ liệu độ mặn</span>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        data.map((record) => (
                            <tr key={record.Ngày} className={isRecordSelected(record) ? "selected" : ""}>
                                {(canEdit || canDelete) && (
                                    <td className="checkbox-column">
                                        <input
                                            type="checkbox"
                                            checked={isRecordSelected(record)}
                                            onChange={(e) => handleRecordChange(record, e.target.checked)}
                                        />
                                    </td>
                                )}
                                <td className="date-column">
                                    <div className="date-content">
                                        <i className="fas fa-calendar-day"></i>
                                        <span>{formatDate(record.Ngày)}</span>
                                    </div>
                                </td>
                                {Object.keys(stations).map((station) => (
                                    <td
                                        key={station}
                                        className={`station-data ${getSalinityClass(record[station])}`}
                                    >
                                        {formatSalinity(record[station])}
                                    </td>
                                ))}
                                {(canEdit || canDelete) && (
                                    <td className="actions-column">
                                        <div className="action-buttons">
                                            {canEdit && (
                                                <button
                                                    className="btn-action btn-edit"
                                                    onClick={() => onEdit(record)}
                                                    title="Chỉnh sửa"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    className="btn-action btn-delete"
                                                    onClick={() => onDelete(record)}
                                                    title="Xóa"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Table Legend */}
            <div className="table-legend">
                <div className="legend-title">Mức độ mặn:</div>
                <div className="legend-items">
                    <div className="legend-item">
                        <span className="legend-color low"></span>
                        <span>Bình thường (&lt; 1‰)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color medium"></span>
                        <span>Rủi ro cấp 2 (1‰ - 4‰)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color high"></span>
                        <span>Rủi ro cấp 4 (&gt; 4‰)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color no-data"></span>
                        <span>Không có dữ liệu</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(SalinityTable);
