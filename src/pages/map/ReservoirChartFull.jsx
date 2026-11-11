import React, { useMemo, useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import "@styles/components/_hydrometChart.scss";
import LocalizedDateInput from "@components/common/LocalizedDateInput";

const formatNumberVi = (value, fractionDigits = 2) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return "-";

    return parsed.toLocaleString("vi-VN", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });
};

const toNumber = (value) => {
    const normalized = String(value ?? "")
        .replace(",", ".")
        .trim();
    const numeric = Number.parseFloat(normalized);
    return Number.isFinite(numeric) ? numeric : null;
};

const toDisplayDate = (value) => {
    if (!value) return "--/--/----";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "--/--/----";

    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
};

const toDisplayDateFromIso = (isoDate) => {
    if (!isoDate) return "";
    const parsed = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return "";
    return toDisplayDate(parsed);
};

const toIsoDateOnly = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const normalizeReservoirRows = (rows = []) => {
    const safeRows = Array.isArray(rows) ? rows : [];

    return safeRows
        .map((row) => {
            const dateValue = row?.Ngày || row?.Ngay || row?.date || row?.Date || null;
            const value = toNumber(row?.TongLuongXa);
            return {
                rawDate: dateValue,
                rawTime: new Date(dateValue).getTime(),
                dateLabel: toDisplayDate(dateValue),
                TongLuongXa: value,
                NguonDuLieu: row?.NguonDuLieu || row?.source || "--",
            };
        })
        .filter((row) => Boolean(row.rawDate))
        .sort((a, b) => a.rawTime - b.rawTime);
};

const ReservoirTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    const row = payload[0].payload;

    return (
        <div className="bg-white border p-2 rounded shadow-sm">
            <p className="mb-1">Ngày: {row.dateLabel}</p>
            <p className="mb-0">
                Tổng lượng xả (m³/s): {row.TongLuongXa !== null ? formatNumberVi(row.TongLuongXa, 2) : "-"}
            </p>
        </div>
    );
};

const ReservoirChartFull = ({
    show,
    reservoirCode,
    reservoirName,
    overview,
    reservoirData,
    initialTab = "chart",
    onApplyRange,
    onClose,
}) => {
    const isLoggedIn = Boolean(localStorage.getItem("access_token"));
    const [activeTab, setActiveTab] = useState("chart");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isApplyingRange, setIsApplyingRange] = useState(false);
    const [stationRange, setStationRange] = useState({ start: "", end: "" });

    useEffect(() => {
        if (show) {
            setActiveTab(initialTab === "data" ? "data" : "chart");
        }
    }, [show, initialTab]);

    const normalizedRows = useMemo(() => normalizeReservoirRows(reservoirData), [reservoirData]);

    // Chụp lại phạm vi ngày cũ nhất - mới nhất của trạm NGAY khi mở modal, trước khi bị thu hẹp bởi
    // bộ lọc Giai đoạn (sau mỗi lần lọc, overview/reservoirData do server trả về đã bị giới hạn theo
    // khoảng đã chọn nên không còn phản ánh toàn bộ chuỗi số liệu nữa).
    useEffect(() => {
        if (!show) return;

        const rows = normalizeReservoirRows(reservoirData);
        const start = toIsoDateOnly(overview?.start_time) || toIsoDateOnly(rows[0]?.rawDate) || "";
        const end = toIsoDateOnly(overview?.end_time) || toIsoDateOnly(rows[rows.length - 1]?.rawDate) || "";

        setStationRange({ start, end });
        setStartDate(start);
        setEndDate(end);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, reservoirCode]);

    const filteredRows = useMemo(() => {
        const hasStart = Boolean(startDate);
        const hasEnd = Boolean(endDate);
        if (!hasStart && !hasEnd) return normalizedRows;

        const startTime = hasStart ? new Date(`${startDate}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
        const endTime = hasEnd ? new Date(`${endDate}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;

        return normalizedRows.filter(
            (row) => Number.isFinite(row.rawTime) && row.rawTime >= startTime && row.rawTime <= endTime,
        );
    }, [normalizedRows, startDate, endDate]);

    const chartId = "reservoir-chart";

    // Lọc tự động ngay khi người dùng đổi ngày (không cần nút Áp dụng) - im lặng bỏ qua khi ngày
    // chưa đủ hoặc khoảng không hợp lệ, vì input ngày đã bị khống chế min/max theo stationRange rồi.
    const applyRange = async (nextStart, nextEnd) => {
        if (!reservoirCode || typeof onApplyRange !== "function") return;
        if (!nextStart || !nextEnd) return;
        if (new Date(nextStart).getTime() > new Date(nextEnd).getTime()) return;

        try {
            setIsApplyingRange(true);
            await onApplyRange({
                code: reservoirCode,
                startDate: nextStart,
                endDate: nextEnd,
            });
        } finally {
            setIsApplyingRange(false);
        }
    };

    const handleStartDateChange = (e) => {
        const value = e.target.value;
        setStartDate(value);
        applyRange(value, endDate);
    };

    const handleEndDateChange = (e) => {
        const value = e.target.value;
        setEndDate(value);
        applyRange(startDate, value);
    };

    const downloadChart = async () => {
        if (!isLoggedIn) {
            alert("Bạn cần đăng nhập để tải biểu đồ");
            return;
        }

        try {
            const chartElement = document.getElementById(chartId);
            if (!chartElement) {
                alert("Không tìm thấy biểu đồ để tải");
                return;
            }

            const exportWrap = document.createElement("div");
            exportWrap.style.background = "#fff";
            exportWrap.style.padding = "20px";
            exportWrap.style.width = "980px";

            const title = document.createElement("div");
            title.style.textAlign = "center";
            title.style.marginBottom = "12px";
            title.innerHTML = `
                <h5 style="font-weight:700;margin:0 0 6px 0;">Diễn biến tổng lượng xả - ${reservoirName || reservoirCode || "Không xác định"}</h5>
                <div style="color:#6c757d;font-size:13px;">Từ <strong>${toDisplayDateFromIso(startDate) || "--/--/----"}</strong> đến <strong>${toDisplayDateFromIso(endDate) || "--/--/----"}</strong></div>
            `;

            exportWrap.appendChild(title);
            exportWrap.appendChild(chartElement.cloneNode(true));
            document.body.appendChild(exportWrap);

            const canvas = await html2canvas(exportWrap, {
                backgroundColor: "#ffffff",
                scale: 2,
            });

            document.body.removeChild(exportWrap);

            const link = document.createElement("a");
            link.href = canvas.toDataURL("image/png");
            link.download = `bieu_do_ho_chua_${reservoirCode || "station"}_${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Lỗi tải biểu đồ hồ chứa:", error);
            alert("Không thể tải biểu đồ.");
        }
    };

    const downloadData = () => {
        if (!isLoggedIn) {
            alert("Bạn cần đăng nhập để tải dữ liệu");
            return;
        }

        try {
            const exportRows = filteredRows.map((row, index) => ({
                STT: index + 1,
                Ngay: row.dateLabel,
                TongLuongXa_m3: row.TongLuongXa !== null ? Number(row.TongLuongXa.toFixed(3)) : null,
            }));

            const worksheet = XLSX.utils.json_to_sheet(exportRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "DuLieuHoChua");

            const fileName = `du_lieu_ho_chua_${reservoirCode || "station"}_${startDate || "all"}_${endDate || "all"}.xlsx`;
            XLSX.writeFile(workbook, fileName, { bookType: "xlsx" });
        } catch (error) {
            console.error("Lỗi tải dữ liệu hồ chứa:", error);
            alert("Không thể tải dữ liệu.");
        }
    };

    if (!show) return null;

    const rangeStartLabel = toDisplayDateFromIso(stationRange.start) || "--/--/----";
    const rangeEndLabel = toDisplayDateFromIso(stationRange.end) || "--/--/----";

    return (
        <div
            className={`modal fade map-data-modal hydromet-chart-modal ${show ? "show d-block" : ""}`}
            tabIndex="-1"
            style={{ backgroundColor: show ? "rgba(0,0,0,0.5)" : "transparent" }}
        >
            <div
                className="modal-dialog modal-xl modal-dialog-centered"
                style={{ maxWidth: "95%", width: "95%", height: "90vh" }}
            >
                <div className="modal-content" style={{ height: "100%", width: "100%" }}>
                    <div className="modal-header border-0 pb-0">
                        <div className="w-100 text-center">
                            <h5 className="modal-title mb-1 fw-bold">
                                Diễn biến tổng lượng xả - {reservoirName || reservoirCode || "Không xác định"}
                            </h5>
                            <div className="text-muted small">
                                Từ <strong>{rangeStartLabel}</strong> đến <strong>{rangeEndLabel}</strong>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="btn-close position-absolute end-0 top-0 m-3"
                            onClick={onClose}
                        ></button>
                    </div>

                    <div className="modal-body pt-3 d-flex flex-column" style={{ minHeight: 0 }}>
                        <div className="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
                            <div className="btn-group btn-group-sm" role="group">
                                <button
                                    className={`btn ${activeTab === "chart" ? "btn-primary" : "btn-outline-primary"}`}
                                    onClick={() => setActiveTab("chart")}
                                >
                                    Biểu đồ
                                </button>
                                <button
                                    className={`btn ${activeTab === "data" ? "btn-primary" : "btn-outline-primary"}`}
                                    onClick={() => setActiveTab("data")}
                                >
                                    Dữ liệu
                                </button>
                            </div>

                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <span className="small text-muted fw-semibold">Giai đoạn:</span>
                                <LocalizedDateInput
                                    className="form-control form-control-sm"
                                    style={{ width: 145 }}
                                    value={startDate}
                                    onChange={handleStartDateChange}
                                    min={stationRange.start}
                                    max={stationRange.end}
                                />
                                <span className="small text-muted">-</span>
                                <LocalizedDateInput
                                    className="form-control form-control-sm"
                                    style={{ width: 145 }}
                                    value={endDate}
                                    onChange={handleEndDateChange}
                                    min={stationRange.start}
                                    max={stationRange.end}
                                />
                                {isApplyingRange && <span className="small text-muted">Đang lọc...</span>}
                            </div>
                        </div>

                        {activeTab === "chart" ? (
                            <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                                {filteredRows.length > 0 ? (
                                    <>
                                        <div
                                            id={chartId}
                                            className="map-chart-box"
                                            style={{ flex: 1, minHeight: 0 }}
                                        >
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart
                                                    data={filteredRows}
                                                    margin={{ top: 12, right: 18, left: 8, bottom: 12 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis
                                                        dataKey="dateLabel"
                                                        tick={{ fontSize: 11 }}
                                                        minTickGap={30}
                                                    />
                                                    <YAxis
                                                        tick={{ fontSize: 11 }}
                                                        tickFormatter={(value) => `${value} m³/s`}
                                                    />
                                                    <Tooltip content={<ReservoirTooltip />} />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="TongLuongXa"
                                                        name="Tổng lượng xả (m³/s)"
                                                        stroke="#1d4ed8"
                                                        strokeWidth={2.2}
                                                        dot={{ r: 2 }}
                                                        activeDot={{ r: 5 }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="map-chart-footer export-actions mt-1 d-flex justify-content-between align-items-center">
                                            <div className="text-muted small">
                                                Hiển thị <strong>{filteredRows.length}</strong> bản ghi
                                            </div>
                                            <button
                                                type="button"
                                                className={`btn btn-sm ${isLoggedIn ? "btn-outline-primary" : "btn-outline-secondary"}`}
                                                onClick={downloadChart}
                                                disabled={!isLoggedIn}
                                                title={!isLoggedIn ? "Bạn cần đăng nhập để tải biểu đồ" : ""}
                                            >
                                                Tải biểu đồ
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="d-flex justify-content-center align-items-center h-100 text-muted">
                                        Chưa có dữ liệu biểu đồ
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-grow-1 d-flex flex-column" style={{ minHeight: 0 }}>
                                <div
                                    className="table-responsive map-data-table-wrap"
                                    style={{ flex: 1, minHeight: 0 }}
                                >
                                    <table className="table table-bordered table-sm table-striped map-data-table">
                                        <thead className="table-light sticky-top">
                                            <tr>
                                                <th style={{ width: 60 }}>#</th>
                                                <th>Ngày</th>
                                                <th>Tổng lượng xả (m³/s)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredRows.map((row, idx) => (
                                                <tr key={`${row.rawDate}-${idx}`}>
                                                    <td>{idx + 1}</td>
                                                    <td>{row.dateLabel}</td>
                                                    <td className="text-end fw-semibold">
                                                        {row.TongLuongXa !== null
                                                            ? formatNumberVi(row.TongLuongXa, 2)
                                                            : "--"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="d-flex justify-content-between align-items-center mt-1">
                                    <div className="text-muted small">
                                        Hiển thị <strong>{filteredRows.length}</strong> bản ghi
                                    </div>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${isLoggedIn ? "btn-outline-success" : "btn-outline-secondary"}`}
                                        onClick={downloadData}
                                        disabled={!isLoggedIn}
                                        title={!isLoggedIn ? "Bạn cần đăng nhập để tải dữ liệu" : ""}
                                    >
                                        Tải dữ liệu
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReservoirChartFull;
