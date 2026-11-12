import React, { useState } from "react";
import { getRiskBadgeMeta } from "@common/salinityClassification";
import { toVNDateKey } from "@common/vnDateTime";

const parseNumber = (value) => {
    if (value === null || value === undefined || value === "" || value === "NULL") {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    const raw = String(value).trim();
    if (!raw) return null;

    const normalized = raw.includes(".") ? raw.replace(/,/g, "") : raw.replace(",", ".");

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const formatNumberVi = (value, fractionDigits = 2) => {
    const parsed = parseNumber(value);
    if (parsed === null) return "-";

    return parsed.toLocaleString("vi-VN", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });
};

// Ô giá trị dạng "value + tag cấp rủi ro" (giống bảng dữ liệu IoT), thay vì tô nguyên ô theo màu đậm.
// dateLabel: chỉ truyền khi ô đang bị gộp (rowSpan) nhiều dòng - hiện kèm ngày ngay trong ô để
// không cần dò theo cột "Thời điểm" mới biết giá trị đang gộp thuộc ngày nào.
const RiskValueCell = ({ value, kiHieu, rowSpan, dateLabel }) => {
    const hasValue = value !== null && value !== undefined && Number.isFinite(Number(value));
    const risk = getRiskBadgeMeta(value, kiHieu);

    return (
        <td
            className="text-end"
            rowSpan={rowSpan}
            style={hasValue ? { backgroundColor: risk.backgroundColor, color: risk.textColor } : undefined}
        >
            {hasValue ? (
                <div className="d-flex flex-column align-items-end gap-1">
                    {dateLabel && <div className="text-muted small fw-normal">{dateLabel}</div>}
                    <div className="d-flex justify-content-end align-items-center gap-2">
                        <span className="fw-semibold">{formatNumberVi(value, 2)}</span>
                        <span
                            className="badge rounded-pill"
                            title={risk.description}
                            style={{ backgroundColor: risk.textColor, color: "#fff", minWidth: 38 }}
                        >
                            {risk.label}
                        </span>
                    </div>
                </div>
            ) : (
                "-"
            )}
        </td>
    );
};

// Bảng dữ liệu dự báo dùng chung cho điểm đo mặn và trạm IoT (dùng chung quy tắc dự báo).
// points: [{ time, salinity, dailySalinity }]
const ForecastDataTable = ({ points, kiHieu }) => {
    const [sortConfig, setSortConfig] = useState({ key: "time", direction: "desc" });

    const sortedPoints = React.useMemo(() => {
        const sorted = [...points].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            if (sortConfig.key === "time") {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            } else {
                aValue = Number(aValue);
                bValue = Number(bValue);
                if (Number.isNaN(aValue)) aValue = -Infinity;
                if (Number.isNaN(bValue)) bValue = -Infinity;
            }

            if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
        return sorted;
    }, [points, sortConfig]);

    // Gộp ô (rowSpan) cho cột "Độ mặn (‰) - ngày" giống merge cell Excel: DailyForecast lặp lại
    // nguyên 1 ngày nên chỉ cần hiện 1 lần, trải dài hết các dòng cùng ngày đó. Chỉ gộp được khi
    // đang sắp xếp theo Thời điểm (lúc đó các dòng cùng ngày mới nằm liền kề nhau) - sắp xếp theo
    // cột khác thì tắt gộp (trả về null) vì các dòng cùng ngày không còn liền kề.
    const dailyRowSpans = React.useMemo(() => {
        if (sortConfig.key !== "time") return null;

        const spans = new Array(sortedPoints.length).fill(0);
        let i = 0;
        while (i < sortedPoints.length) {
            const dayKey = toVNDateKey(sortedPoints[i].time);
            let j = i + 1;
            while (j < sortedPoints.length && toVNDateKey(sortedPoints[j].time) === dayKey) {
                j++;
            }
            spans[i] = j - i;
            i = j;
        }
        return spans;
    }, [sortedPoints, sortConfig]);

    const handleSort = (key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
        }));
    };

    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <i className="fa-solid fa-sort text-muted ms-1" style={{ fontSize: "0.75rem" }}></i>;
        }
        return sortConfig.direction === "asc" ? (
            <i className="fa-solid fa-sort-up text-primary ms-1" style={{ fontSize: "0.75rem" }}></i>
        ) : (
            <i className="fa-solid fa-sort-down text-primary ms-1" style={{ fontSize: "0.75rem" }}></i>
        );
    };

    const sortableHeader = (key, label) => (
        <th style={{ cursor: "pointer", userSelect: "none" }} onClick={() => handleSort(key)}>
            <div className="d-flex align-items-center justify-content-between">
                <span>{label}</span>
                {getSortIcon(key)}
            </div>
        </th>
    );

    return (
        <div className="table-responsive mb-3 map-data-table-wrap">
            <table className="table table-bordered table-sm table-striped map-data-table">
                <thead className="table-light">
                    <tr>
                        <th style={{ width: "60px" }}>#</th>
                        {sortableHeader("time", "Thời điểm")}
                        {sortableHeader("salinity", "Độ mặn (‰) - 2 giờ")}
                        {sortableHeader("dailySalinity", "Độ mặn (‰) - ngày")}
                    </tr>
                </thead>
                <tbody>
                    {sortedPoints.map((item, idx) => {
                        // null = không gộp (đang sort cột khác); 0 = dòng bị gộp vào dòng trước đó (ẩn ô)
                        const isDayGroupStart = !dailyRowSpans || dailyRowSpans[idx] > 0;
                        const showDailyCell = isDayGroupStart;

                        return (
                            <tr
                                key={idx}
                                // Viền trên đậm hơn ở dòng đầu mỗi ngày để thấy rõ ranh giới các khối
                                // ngày đã gộp, không chỉ dựa vào màu nền nhạt
                                className={dailyRowSpans && isDayGroupStart ? "day-group-start" : undefined}
                            >
                                <td>{idx + 1}</td>
                                <td>{new Date(item.time).toLocaleString("vi-VN")}</td>
                                <RiskValueCell value={item.salinity} kiHieu={kiHieu} />
                                {showDailyCell && (
                                    <RiskValueCell
                                        value={item.dailySalinity}
                                        kiHieu={kiHieu}
                                        rowSpan={dailyRowSpans ? dailyRowSpans[idx] : undefined}
                                        dateLabel={
                                            dailyRowSpans
                                                ? new Date(item.time).toLocaleDateString("vi-VN")
                                                : undefined
                                        }
                                    />
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default ForecastDataTable;
