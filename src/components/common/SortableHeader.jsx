import React from "react";

// <th> bấm được để sort (dùng chung với useSortableRows) - mũi tên xám khi chưa sort theo cột
// này, xanh + chỉ đúng chiều khi đang sort theo cột này.
const SortableHeader = ({ label, sortKey, sortConfig, onSort, style }) => {
    const isActive = sortConfig.key === sortKey;

    return (
        <th style={{ cursor: "pointer", userSelect: "none", ...style }} onClick={() => onSort(sortKey)}>
            <div className="d-flex align-items-center justify-content-between">
                <span>{label}</span>
                {!isActive ? (
                    <i className="fa-solid fa-sort text-muted ms-1" style={{ fontSize: "0.75rem" }}></i>
                ) : sortConfig.direction === "asc" ? (
                    <i className="fa-solid fa-sort-up text-primary ms-1" style={{ fontSize: "0.75rem" }}></i>
                ) : (
                    <i className="fa-solid fa-sort-down text-primary ms-1" style={{ fontSize: "0.75rem" }}></i>
                )}
            </div>
        </th>
    );
};

export default SortableHeader;
