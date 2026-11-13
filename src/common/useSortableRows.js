import { useMemo, useState } from "react";

// Sort client-side (chỉ trang dữ liệu hiện đang tải, không gọi lại server) cho các bảng quản trị
// dùng chung 1 cách: bấm vào tiêu đề cột để sort tăng/giảm, bấm lại để đổi chiều.
// `getSortValue(row, key)` trả về giá trị đã chuẩn hoá để so sánh (number/Date.getTime()/string).
export const useSortableRows = (
    rows,
    { defaultKey = null, defaultDirection = "desc", getSortValue } = {},
) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
    const effective = sortConfig.key ? sortConfig : { key: defaultKey, direction: defaultDirection };

    const sortedRows = useMemo(() => {
        if (!effective.key) return rows;
        const resolve = getSortValue || ((row, key) => row?.[key]);

        return [...rows].sort((a, b) => {
            const aValue = resolve(a, effective.key);
            const bValue = resolve(b, effective.key);
            const aEmpty = aValue === null || aValue === undefined || Number.isNaN(aValue) || aValue === "";
            const bEmpty = bValue === null || bValue === undefined || Number.isNaN(bValue) || bValue === "";

            if (aEmpty && bEmpty) return 0;
            if (aEmpty) return 1;
            if (bEmpty) return -1;
            if (aValue < bValue) return effective.direction === "asc" ? -1 : 1;
            if (aValue > bValue) return effective.direction === "asc" ? 1 : -1;
            return 0;
        });
    }, [rows, effective.key, effective.direction, getSortValue]);

    const handleSort = (key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
        }));
    };

    return { sortedRows, sortConfig: effective, handleSort };
};
