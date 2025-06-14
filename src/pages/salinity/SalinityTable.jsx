import React, { useMemo, useCallback, useState } from "react";
import { getSalinityClass } from "@common/salinityClassification";

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
    // Local state for sorting
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

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

    // Memoized sorted data
    const sortedData = useMemo(() => {
        if (!sortConfig.key || !data) return data;

        const sorted = [...data].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            if (sortConfig.key === "Ngày") {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            } else {
                // For station data, handle NULL values and convert to numbers
                if (aValue === "NULL" || aValue === null || aValue === undefined || aValue === "") {
                    aValue = -1; // Put NULL values at the end
                } else {
                    aValue = Number(aValue);
                }

                if (bValue === "NULL" || bValue === null || bValue === undefined || bValue === "") {
                    bValue = -1; // Put NULL values at the end
                } else {
                    bValue = Number(bValue);
                }
            }

            if (aValue < bValue) {
                return sortConfig.direction === "asc" ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === "asc" ? 1 : -1;
            }
            return 0;
        });

        return sorted;
    }, [data, sortConfig]);

    // Handle sorting
    const handleSort = useCallback(
        (key) => {
            let direction = "asc";
            if (sortConfig.key === key && sortConfig.direction === "asc") {
                direction = "desc";
            }
            setSortConfig({ key, direction });
        },
        [sortConfig],
    );

    // Get sort icon
    const getSortIcon = useCallback(
        (columnKey) => {
            if (sortConfig.key !== columnKey) {
                return (
                    <i
                        className="fa-solid fa-sort text-muted"
                        style={{ fontSize: "0.75rem", marginLeft: "0.5rem" }}
                    ></i>
                );
            }
            return sortConfig.direction === "asc" ? (
                <i
                    className="fa-solid fa-sort-up text-primary"
                    style={{ fontSize: "0.75rem", marginLeft: "0.5rem" }}
                ></i>
            ) : (
                <i
                    className="fa-solid fa-sort-down text-primary"
                    style={{ fontSize: "0.75rem", marginLeft: "0.5rem" }}
                ></i>
            );
        },
        [sortConfig],
    );

    // Check if record is selected
    const isRecordSelected = useCallback(
        (record) => {
            return selectedRecords.some((r) => r.Ngày === record.Ngày);
        },
        [selectedRecords],
    );

    // Check if all records are selected
    const areAllSelected = useMemo(() => {
        return sortedData.length > 0 && selectedRecords.length === sortedData.length;
    }, [sortedData.length, selectedRecords.length]);

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
    const getSalinityClassLocal = (value, stationCode) => {
        return getSalinityClass(value, stationCode);
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
                        <th
                            className="date-column sortable-header"
                            onClick={() => handleSort("Ngày")}
                            style={{ cursor: "pointer", userSelect: "none" }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span>Ngày</span>
                                    <i className="fas fa-calendar-alt"></i>
                                </div>
                                {getSortIcon("Ngày")}
                            </div>
                        </th>
                        {Object.entries(stations).map(([key, name]) => (
                            <th
                                key={key}
                                className="station-column sortable-header"
                                onClick={() => handleSort(key)}
                                style={{ cursor: "pointer", userSelect: "none" }}
                            >
                                <div
                                    style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
                                >
                                    <div className="station-header">
                                        <span className="station-name">{name}</span>
                                        <span className="station-code">({key})</span>
                                    </div>
                                    {getSortIcon(key)}
                                </div>
                            </th>
                        ))}
                        {(canEdit || canDelete) && <th className="actions-column">Thao tác</th>}
                    </tr>
                </thead>
                <tbody>
                    {loading && sortedData.length === 0 ? (
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
                    ) : sortedData.length === 0 ? (
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
                        sortedData.map((record) => (
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
                                        className={`station-data ${getSalinityClassLocal(record[station], station)}`}
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
                <div className="legend-title">Cấp độ rủi ro thiên tai do xâm nhập mặn:</div>
                <div className="legend-items">
                    <div className="legend-item">
                        <span className="legend-color normal"></span>
                        <span>Bình thường (độ mặn tại các điểm &lt;1‰)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color warning"></span>
                        <span>Rủi ro cấp 1 (độ mặn tại Nhà Bè 1-4‰)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color high-warning"></span>
                        <span>Rủi ro cấp 2 (độ mặn tại Nhà Bè &gt;4‰, các điểm khác 1-4‰)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color critical"></span>
                        <span>Rủi ro cấp 3 (độ mặn tại các điểm &gt;4‰)</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-color no-data"></span>
                        <span>Khuyết số liệu</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(SalinityTable);
