import React, { useEffect, useMemo, useState } from "react";
import html2canvas from "html2canvas";
import IoTBarChart from "./IoTBarChart";
import { fetchIoTData, normalizeIoTDataRows } from "@components/map/mapDataServices";

const EMPTY_DATA = [];

const getIoTRowTime = (row) => row?.Date || row?.date_time || null;

const formatDateLabel = (rawValue) => {
    if (!rawValue) return "-";
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) {
        return String(rawValue);
    }

    return parsed.toLocaleDateString("vi-VN");
};

const toInputDateValue = (rawValue) => {
    if (!rawValue) return "";

    const raw = String(rawValue).trim();
    if (!raw) return "";

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        return raw.slice(0, 10);
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        return "";
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const toDisplayDateTime = (rawValue, groupBy = "none") => {
    if (!rawValue) return "-";
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) {
        return String(rawValue);
    }

    if (groupBy === "date") {
        return parsed.toLocaleDateString("vi-VN");
    }

    const hours = String(parsed.getHours()).padStart(2, "0");
    const minutes = String(parsed.getMinutes()).padStart(2, "0");
    const dateLabel = parsed.toLocaleDateString("vi-VN");
    return `${hours}:${minutes} ${dateLabel}`;
};

const getRangeFromRows = (rows) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    if (safeRows.length === 0) {
        return { startDate: "", endDate: "" };
    }

    const firstDate = toInputDateValue(getIoTRowTime(safeRows[0]));
    const lastDate = toInputDateValue(getIoTRowTime(safeRows[safeRows.length - 1]));

    return {
        startDate: firstDate,
        endDate: lastDate,
    };
};

const getDateOptionsFromRows = (rows) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const seen = new Set();

    return safeRows
        .map((row) => toInputDateValue(getIoTRowTime(row)))
        .filter((value) => {
            if (!value || seen.has(value)) return false;
            seen.add(value);
            return true;
        })
        .map((value) => ({
            value,
            label: formatDateLabel(value),
        }));
};

const IoTQueryControls = ({ queryOptions, onChange, dateOptions }) => {
    return (
        <div
            className="d-flex flex-wrap justify-content-center align-items-end gap-2 mb-2"
            style={{ flexShrink: 0, rowGap: 6 }}
        >
            <div>
                <label className="form-label fw-semibold small mb-1">Từ ngày</label>
                <select
                    className="form-select form-select-sm"
                    name="startDate"
                    value={queryOptions.startDate}
                    onChange={onChange}
                    style={{ minWidth: 128 }}
                >
                    {dateOptions.map((option) => (
                        <option key={`start-${option.value}`} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="form-label fw-semibold small mb-1">Đến ngày</label>
                <select
                    className="form-select form-select-sm"
                    name="endDate"
                    value={queryOptions.endDate}
                    onChange={onChange}
                    style={{ minWidth: 128 }}
                >
                    {dateOptions.map((option) => (
                        <option key={`end-${option.value}`} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="form-label fw-semibold small mb-1">Tần suất</label>
                <select
                    className="form-select form-select-sm"
                    name="groupBy"
                    value={queryOptions.groupBy}
                    onChange={onChange}
                    style={{ minWidth: 112 }}
                >
                    <option value="none">Mặc định</option>
                    <option value="date">Theo ngày</option>
                    <option value="hour">Theo giờ</option>
                </select>
            </div>
        </div>
    );
};

// Component bảng số liệu IoT với 4 cột cảm biến
const IoTExportPreviewTable = ({ data, groupBy = "none" }) => {
    const safeData = Array.isArray(data) ? data : [];

    // Data đã có đầy đủ thông tin sensor trong mỗi item, chỉ cần sắp xếp theo thời gian
    const rows = safeData
        .filter((item) => item?.Date || item?.date_time) // Lọc bỏ item không có thời gian
        .sort((a, b) => new Date(a.Date || a.date_time) - new Date(b.Date || b.date_time));

    return (
        <div className="table-responsive">
            <table className="table table-bordered table-sm table-striped align-middle">
                <thead className="table-light">
                    <tr>
                        <th style={{ width: 60 }}>#</th>
                        <th>Thời gian</th>
                        <th>Độ mặn (‰)</th>
                        <th>Mực nước (m)</th>
                        <th>Lượng mưa hàng ngày (mm)</th>
                        <th>Nhiệt độ (°C)</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => (
                        <tr key={`${row.Date || row.date_time}-${idx}`}>
                            <td>{idx + 1}</td>
                            <td>{toDisplayDateTime(row.Date || row.date_time, groupBy)}</td>
                            <td className="text-end">
                                {row.salt_value !== undefined && row.salt_value !== null
                                    ? `${Number(row.salt_value).toFixed(4)}`
                                    : "-"}
                            </td>
                            <td className="text-end">
                                {row.distance_value !== undefined && row.distance_value !== null
                                    ? `${Number(row.distance_value).toFixed(4)}`
                                    : "-"}
                            </td>
                            <td className="text-end">
                                {row.daily_rainfall_value !== undefined && row.daily_rainfall_value !== null
                                    ? `${Number(row.daily_rainfall_value).toFixed(4)}`
                                    : "-"}
                            </td>
                            <td className="text-end">
                                {row.temp_value !== undefined && row.temp_value !== null
                                    ? `${Number(row.temp_value).toFixed(1)}`
                                    : "-"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const IoTChartFull = ({ show, iotData, onClose }) => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("access_token");
    
    const [queryOptions, setQueryOptions] = useState({
        startDate: "",
        endDate: "",
        groupBy: "none",
    });
    const [displayData, setDisplayData] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [activeTab, setActiveTab] = useState("chart");

    const stationName = iotData?.stationName || iotData?.stationInfo?.station_name || "Trạm IoT";
    const serialNumber = iotData?.serialNumber || iotData?.stationInfo?.serial_number || "N/A";

    const dataPoints = useMemo(() => {
        const rawDataPoints = iotData?.dataPoints?.length ? iotData.dataPoints : iotData?.data;
        return normalizeIoTDataRows(Array.isArray(rawDataPoints) ? rawDataPoints : EMPTY_DATA);
    }, [iotData?.dataPoints, iotData?.data]);

    const dateOptions = useMemo(() => getDateOptionsFromRows(dataPoints), [dataPoints]);

    useEffect(() => {
        if (!show) {
            return;
        }

        const nextRange = getRangeFromRows(dataPoints);
        setActiveTab("chart");
        setDisplayData(dataPoints);
        setLoadError("");
        setQueryOptions((prev) => ({
            startDate: nextRange.startDate,
            endDate: nextRange.endDate,
            groupBy: prev.groupBy || "none",
        }));
    }, [show, dataPoints]);

    useEffect(() => {
        if (!show || !serialNumber || serialNumber === "N/A") {
            return;
        }

        if (!queryOptions.startDate || !queryOptions.endDate) {
            return;
        }

        let isCancelled = false;

        const loadIoTData = async () => {
            setIsLoadingData(true);
            setLoadError("");

            try {
                const response = await fetchIoTData(serialNumber, {
                    startDate: queryOptions.startDate,
                    endDate: queryOptions.endDate,
                    groupBy: queryOptions.groupBy || "none",
                });

                if (isCancelled) return;

                if (!response?.success) {
                    setDisplayData([]);
                    setLoadError(response?.message || "Không tải được dữ liệu IoT.");
                    return;
                }

                const normalizedRows = normalizeIoTDataRows(response.data);
                setDisplayData(normalizedRows);
                if (normalizedRows.length === 0) {
                    setLoadError(response?.message || "Không có dữ liệu trong khoảng thời gian đã chọn.");
                }
            } catch (error) {
                if (!isCancelled) {
                    console.error("Error loading IoT chart data:", error);
                    setDisplayData([]);
                    setLoadError("Có lỗi khi tải dữ liệu IoT.");
                }
            } finally {
                if (!isCancelled) {
                    setIsLoadingData(false);
                }
            }
        };

        loadIoTData();

        return () => {
            isCancelled = true;
        };
    }, [show, serialNumber, queryOptions.startDate, queryOptions.endDate, queryOptions.groupBy]);

    const handleQueryOptionChange = (e) => {
        const { name, value } = e.target;
        setQueryOptions((prev) => {
            const nextOptions = {
                ...prev,
                [name]: value,
            };

            if (
                nextOptions.startDate &&
                nextOptions.endDate &&
                nextOptions.startDate > nextOptions.endDate
            ) {
                if (name === "startDate") {
                    nextOptions.endDate = value;
                }
                if (name === "endDate") {
                    nextOptions.startDate = value;
                }
            }

            return nextOptions;
        });
    };

    const downloadChart = async () => {
        if (!isLoggedIn) {
            alert("Bạn cần đăng nhập để tải xuống biểu đồ");
            return;
        }
        
        try {
            const chartContainer = document.createElement("div");
            chartContainer.style.backgroundColor = "white";
            chartContainer.style.padding = "20px";
            chartContainer.style.width = "800px";
            chartContainer.style.margin = "0 auto";

            // Tạo tiêu đề
            const titleDiv = document.createElement("div");
            titleDiv.style.width = "100%";
            titleDiv.style.textAlign = "center";
            titleDiv.style.marginBottom = "20px";
            titleDiv.innerHTML = `
                <h5 style="font-weight: bold; margin-bottom: 8px; font-size: 18px;">
                    📡 Dữ liệu IoT - ${iotData?.stationName}
                </h5>
                <div style="color: #6c757d; font-size: 14px">
                    📅 Từ <strong>${queryOptions.startDate}</strong> đến <strong>${queryOptions.endDate}</strong>
                </div>
            `;
            chartContainer.appendChild(titleDiv);

            // Sao chép phần biểu đồ
            const chartElement = document.getElementById("iot-chart");
            if (!chartElement) {
                alert("Không thể tìm thấy biểu đồ để tải xuống");
                return;
            }
            const chartClone = chartElement.cloneNode(true);
            chartContainer.appendChild(chartClone);

            document.body.appendChild(chartContainer);

            const canvas = await html2canvas(chartContainer, {
                backgroundColor: "#ffffff",
                scale: 2,
            });

            document.body.removeChild(chartContainer);

            const url = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = url;
            link.download = `bieu_do_iot_${iotData?.serialNumber}_${new Date().getTime()}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("❌ Tải ảnh biểu đồ lỗi:", error);
            alert("Không thể tải ảnh biểu đồ.");
        }
    };

    if (!show) return null;

    const data = displayData;

    const startDate = data?.length > 0
        ? formatDateLabel(getIoTRowTime(data[0]))
        : null;
    const endDate = data?.length > 0
        ? formatDateLabel(getIoTRowTime(data[data.length - 1]))
        : null;

    return (
        <div
            className={`modal fade ${show ? "show d-block" : ""}`}
            tabIndex="-1"
            style={{
                backgroundColor: show ? "rgba(0,0,0,0.5)" : "transparent",
                overflow: "hidden",
                position: "fixed",
                inset: 0,
            }}
        >
            <div
                className="modal-dialog modal-xl modal-dialog-centered"
                style={{
                    maxWidth: "95%",
                    width: "95%",
                    height: "99vh",
                    maxHeight: "99vh",
                    margin: "0 auto",
                }}
            >
                <div
                    className="modal-content"
                    style={{
                        height: "100%",
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                    }}
                >
                    <div className="modal-header border-0 pb-1 pt-2">
                        <div className="w-100 text-center">
                            <h5 className="modal-title mb-1 fw-bold">Dữ liệu IoT - {stationName}</h5>
                        </div>
                        <button
                            type="button"
                            className="btn-close position-absolute end-0 top-0 m-3"
                            onClick={onClose}
                        ></button>
                    </div>

                    <div
                        className="modal-body"
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            minHeight: 0,
                            overflow: "hidden",
                            paddingTop: 8,
                            paddingBottom: 12,
                        }}
                    >
                        <ul className="nav nav-tabs mb-2" role="tablist" style={{ flexShrink: 0 }}>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === "chart" ? "active" : ""}`}
                                    type="button"
                                    onClick={() => setActiveTab("chart")}
                                >
                                    Biểu đồ
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === "data" ? "active" : ""}`}
                                    type="button"
                                    onClick={() => setActiveTab("data")}
                                >
                                    Data
                                </button>
                            </li>
                        </ul>

                        <div className="tab-content" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                            <div
                                className={`tab-pane fade ${activeTab === "chart" ? "show active" : ""} h-100`}
                                id="iot-chart-content"
                                style={{ overflow: "hidden" }}
                            >
                                <div className="h-100 d-flex flex-column" style={{ minHeight: 0 }}>
                                    <IoTQueryControls
                                        queryOptions={queryOptions}
                                        onChange={handleQueryOptionChange}
                                        dateOptions={dateOptions}
                                    />

                                    {isLoadingData ? (
                                        <div className="flex-grow-1 d-flex align-items-center justify-content-center text-muted">
                                            Đang tải dữ liệu IoT...
                                        </div>
                                    ) : data.length > 0 ? (
                                        <div
                                            className="flex-grow-1"
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                minHeight: 0,
                                                overflow: "hidden",
                                            }}
                                        >
                                            <div
                                                id="iot-chart"
                                                className="chart-container"
                                                style={{ flex: 1, minHeight: 0, paddingTop: 0 }}
                                            >
                                                <IoTBarChart
                                                    data={data}
                                                    height="100%"
                                                    groupBy={queryOptions.groupBy}
                                                />
                                            </div>
                                            <div
                                                className="d-flex justify-content-between align-items-center"
                                                style={{ flexShrink: 0, padding: "8px 0", borderTop: "1px solid #e9ecef" }}
                                            >
                                                <div className="text-muted" style={{ fontSize: "12px" }}>
                                                    Thời gian: <strong>{startDate || "-"}</strong> đến <strong>{endDate || "-"}</strong>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="text-muted" style={{ fontSize: "12px" }}>
                                                        Hiển thị: <strong>{data.length}</strong> điểm dữ liệu
                                                    </div>
                                                    <button
                                                        className={`btn btn-sm ${isLoggedIn ? "btn-primary" : "btn-secondary"}`}
                                                        onClick={downloadChart}
                                                        disabled={!isLoggedIn}
                                                        title={
                                                            !isLoggedIn
                                                                ? "Bạn cần đăng nhập để tải xuống biểu đồ"
                                                                : ""
                                                        }
                                                        style={{ fontSize: "12px", padding: "4px 10px" }}
                                                    >
                                                        {isLoggedIn ? "Tải ảnh biểu đồ" : "Đăng nhập để tải"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                                            <p className="text-muted mb-0">
                                                {loadError ||
                                                    (iotData
                                                        ? "Không có dữ liệu hợp lệ."
                                                        : "Đang tải dữ liệu IoT...")}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div
                                className={`tab-pane fade ${activeTab === "data" ? "show active" : ""} h-100`}
                                id="iot-export-content"
                                style={{ overflow: "hidden" }}
                            >
                                <div className="h-100 d-flex flex-column" style={{ minHeight: 0 }}>
                                    <IoTQueryControls
                                        queryOptions={queryOptions}
                                        onChange={handleQueryOptionChange}
                                        dateOptions={dateOptions}
                                    />

                                    {data.length > 0 ? (
                                        <>
                                            <div style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 4 }}>
                                        <div className="alert alert-info mb-3">
                                            <h6 className="mb-2">Cấp độ rủi ro thiên tai do xâm nhập mặn:</h6>
                                            <div className="row g-2 small">
                                                <div className="col-6 col-md-3">
                                                    <span
                                                        className="badge rounded-pill me-2"
                                                        style={{
                                                            backgroundColor: "#28a745",
                                                            color: "white",
                                                        }}
                                                    >
                                                        Bình thường
                                                    </span>
                                                    <span className="text-muted">{"(< 1 ‰)"}</span>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <span
                                                        className="badge rounded-pill me-2"
                                                        style={{
                                                            backgroundColor: "#ffc107",
                                                            color: "black",
                                                        }}
                                                    >
                                                        Rủi ro cấp 1
                                                    </span>
                                                    <span className="text-muted">(1-4 ‰)</span>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <span
                                                        className="badge rounded-pill me-2"
                                                        style={{
                                                            backgroundColor: "#ff8c00",
                                                            color: "white",
                                                        }}
                                                    >
                                                        Rủi ro cấp 2
                                                    </span>
                                                    <span className="text-muted">(4-8 ‰)</span>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <span
                                                        className="badge rounded-pill me-2"
                                                        style={{
                                                            backgroundColor: "#dc3545",
                                                            color: "white",
                                                        }}
                                                    >
                                                        Rủi ro cấp 3
                                                    </span>
                                                    <span className="text-muted">({"> 8 ‰"})</span>
                                                </div>
                                            </div>
                                        </div>

                                        <IoTExportPreviewTable data={data} groupBy={queryOptions.groupBy} />
                                            </div>

                                        <div
                                            className="d-flex gap-2 justify-content-between align-items-center pt-2"
                                            style={{ flexShrink: 0 }}
                                        >
                                            <div className="text-muted small">
                                                Thời gian: <strong>{startDate || "-"}</strong> đến <strong>{endDate || "-"}</strong>
                                            </div>
                                            <div className="text-muted small">Hiển thị {data.length} bản ghi</div>
                                        </div>
                                        </>
                                    ) : (
                                        <div className="flex-grow-1 d-flex align-items-center justify-content-center">
                                            <p className="text-muted mb-0">
                                                {loadError || "Không có dữ liệu để hiển thị."}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IoTChartFull;