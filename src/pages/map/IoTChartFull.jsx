import React, { useEffect, useState } from "react";
import html2canvas from "html2canvas";
import IoTBarChart from "./IoTBarChart";

// Component bảng số liệu IoT với 4 cột cảm biến
const IoTExportPreviewTable = ({ data }) => {
    const safeData = Array.isArray(data) ? data : [];

    // Data đã có đầy đủ thông tin sensor trong mỗi item, chỉ cần sắp xếp theo thời gian
    const rows = safeData
        .filter((item) => item?.Date || item?.date_time) // Lọc bỏ item không có thời gian
        .sort((a, b) => new Date(a.Date || a.date_time) - new Date(b.Date || b.date_time));

    return (
        <div className="table-responsive mb-3" style={{ maxHeight: 400 }}>
            <table className="table table-bordered table-sm table-striped align-middle">
                <thead className="table-light">
                    <tr>
                        <th style={{ width: 60 }}>#</th>
                        <th>Thời gian</th>
                        <th>Độ mặn (ppt)</th>
                        <th>Mực nước (m)</th>
                        <th>Lượng mưa hàng ngày (mm)</th>
                        <th>Nhiệt độ (°C)</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => (
                        <tr key={`${row.Date || row.date_time}-${idx}`}>
                            <td>{idx + 1}</td>
                            <td>{new Date(row.Date || row.date_time).toLocaleString("vi-VN")}</td>
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
    
    const [exportRange, setExportRange] = useState({
        startDate: "",
        endDate: "",
    });
    const [filteredData, setFilteredData] = useState([]);

    const rawDataPoints = iotData?.dataPoints?.length ? iotData.dataPoints : iotData?.data || [];
    const dataPoints = Array.isArray(rawDataPoints) ? rawDataPoints : [];

    useEffect(() => {
        if (show && dataPoints.length > 0) {
            const validData = dataPoints.filter((item) => {
                const hasLegacyValue =
                    item.Value !== undefined && item.Value !== null && item.Value !== "NULL";
                const hasNewValue =
                    item.salt_value !== undefined ||
                    item.temp_value !== undefined ||
                    item.distance_value !== undefined ||
                    item.daily_rainfall_value !== undefined;

                return hasLegacyValue || hasNewValue;
            });

            if (validData.length > 0) {
                const firstDateRaw = validData[validData.length - 1].Date || validData[validData.length - 1].date_time;
                const lastDateRaw = validData[0].Date || validData[0].date_time;

                const firstDate = firstDateRaw ? String(firstDateRaw).split(" ")[0] : "";
                const lastDate = lastDateRaw ? String(lastDateRaw).split(" ")[0] : "";
               
                setExportRange({
                    startDate: firstDate,
                    endDate: lastDate,
                });
            }
        } else {
            setExportRange({ startDate: "", endDate: "" });
        }
    }, [show, iotData, dataPoints]);

    const handleDateRangeChange = (e) => {
        const { name, value } = e.target;
        setExportRange((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Filter data based on date range
        const startDate = new Date(name === "startDate" ? value : exportRange.startDate);
        const endDate = new Date(name === "endDate" ? value : exportRange.endDate);

        if (startDate && endDate && startDate <= endDate && dataPoints.length > 0) {
            const filtered = dataPoints.filter((item) => {
                const itemDate = new Date(item.Date || item.date_time);
                return itemDate >= startDate && itemDate <= endDate;
            });
            setFilteredData(filtered);
        }
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
                    📅 Từ <strong>${exportRange.startDate}</strong> đến <strong>${exportRange.endDate}</strong>
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

    const data = dataPoints;
    const stationName = iotData?.stationName || iotData?.stationInfo?.station_name || "Trạm IoT";
    const serialNumber = iotData?.serialNumber || iotData?.stationInfo?.serial_number || "N/A";

    const startDate = data?.length > 0
        ? new Date(data[0].Date || data[0].date_time).toLocaleDateString("vi-VN")
        : null;
    const endDate = data?.length > 0
        ? new Date(data[data.length - 1].Date || data[data.length - 1].date_time).toLocaleDateString("vi-VN")
        : null;

    return (
        <div
            className={`modal fade ${show ? "show d-block" : ""}`}
            tabIndex="-1"
            style={{ backgroundColor: show ? "rgba(0,0,0,0.5)" : "transparent" }}
        >
            <div
                className="modal-dialog modal-xl modal-dialog-centered"
                style={{ maxWidth: "95%", width: "95%", height: "90vh", maxHeight: "90vh" }}
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
                    <div className="modal-header border-0 pb-0">
                        <div className="w-100 text-center">
                            <h5 className="modal-title mb-1 fw-bold">
                                📡 Dữ liệu IoT - {stationName}
                            </h5>
                            <div className="text-muted small">
                                Serial: <strong>{serialNumber}</strong>
                            </div>
                            {startDate && endDate && (
                                <div className="text-muted small">
                                    Từ <strong>{startDate}</strong> đến <strong>{endDate}</strong>
                                </div>
                            )}
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
                        }}
                    >
                        <ul className="nav nav-tabs mb-3" role="tablist" style={{ flexShrink: 0 }}>
                            <li className="nav-item">
                                <button
                                    className="nav-link active"
                                    id="iot-chart-tab"
                                    data-bs-toggle="tab"
                                    data-bs-target="#iot-chart-content"
                                    type="button"
                                >
                                    Biểu đồ
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className="nav-link"
                                    id="iot-export-tab"
                                    data-bs-toggle="tab"
                                    data-bs-target="#iot-export-content"
                                    type="button"
                                >
                                    Số liệu
                                </button>
                            </li>
                        </ul>

                        <div className="tab-content" style={{ flex: 1, minHeight: 0 }}>
                            <div
                                className="tab-pane fade show active h-100"
                                id="iot-chart-content"
                                style={{ overflow: "hidden" }}
                            >
                                {data.length > 0 ? (
                                    <div
                                        className="h-100"
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            minHeight: 0,
                                            overflow: "hidden",
                                        }}
                                    >
                                        <div id="iot-chart" className="chart-container" style={{ flex: 1, minHeight: 0 }}>
                                            <IoTBarChart data={data} height="100%" />
                                            <div className="text-center text-muted small mt-2">
                                                Tổng cộng: {data.length} điểm dữ liệu
                                            </div>
                                        </div>
                                        <div
                                            className="mt-2 d-flex justify-content-between align-items-center"
                                            style={{ flexShrink: 0 }}
                                        >
                                            <div className="text-muted small">
                                                Hiển thị: <strong>{data.length}</strong> điểm dữ liệu
                                            </div>
                                            <button 
                                                className={`btn ${isLoggedIn ? 'btn-primary' : 'btn-secondary'}`} 
                                                onClick={downloadChart}
                                                disabled={!isLoggedIn}
                                                title={!isLoggedIn ? "Bạn cần đăng nhập để tải xuống biểu đồ" : ""}
                                            >
                                                📸 {isLoggedIn ? "Tải ảnh biểu đồ" : "Đăng nhập để tải"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-100 d-flex align-items-center justify-content-center">
                                        <p className="text-muted mb-0">
                                            {iotData ? "Không có dữ liệu hợp lệ." : "Đang tải dữ liệu IoT..."}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="tab-pane fade h-100" id="iot-export-content" style={{ overflow: "auto" }}>
                                {data.length > 0 ? (
                                    <>
                                        {/* Risk Level Legend */}
                                        <div className="alert alert-info mb-3">
                                            <h6 className="mb-2">
                                                📊 Cấp độ rủi ro thiên tai do xâm nhập mặn:
                                            </h6>
                                            <div className="row g-2 small">
                                                <div className="col-6 col-md-3">
                                                    <span
                                                        className="badge rounded-pill me-2"
                                                        style={{ backgroundColor: "#28a745", color: "white" }}
                                                    >
                                                        Bình thường
                                                    </span>
                                                    <span className="text-muted">{"(< 1 ppt)"}</span>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <span
                                                        className="badge rounded-pill me-2"
                                                        style={{ backgroundColor: "#ffc107", color: "black" }}
                                                    >
                                                        Rủi ro cấp 1
                                                    </span>
                                                    <span className="text-muted">(1-4 ppt)</span>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <span
                                                        className="badge rounded-pill me-2"
                                                        style={{ backgroundColor: "#ff8c00", color: "white" }}
                                                    >
                                                        Rủi ro cấp 2
                                                    </span>
                                                    <span className="text-muted">(4-8 ppt)</span>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <span
                                                        className="badge rounded-pill me-2"
                                                        style={{ backgroundColor: "#dc3545", color: "white" }}
                                                    >
                                                        Rủi ro cấp 3
                                                    </span>
                                                    <span className="text-muted">({"> 8 ppt"})</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <div className="row g-3 align-items-end">
                                                <div className="col-12 col-md-3">
                                                    <h6 className="mb-2 mb-md-0">Chọn khoảng thời gian xuất dữ liệu:</h6>
                                                </div>
                                                <div className="col-6 col-md-4">
                                                    <label className="form-label">Từ ngày:</label>
                                                    <input
                                                        type="date"
                                                        className="form-control"
                                                        name="startDate"
                                                        value={exportRange.startDate}
                                                        onChange={handleDateRangeChange}
                                                    />
                                                </div>
                                                <div className="col-6 col-md-4">
                                                    <label className="form-label">Đến ngày:</label>
                                                    <input
                                                        type="date"
                                                        className="form-control"
                                                        name="endDate"
                                                        value={exportRange.endDate}
                                                        onChange={handleDateRangeChange}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <IoTExportPreviewTable
                                            data={filteredData.length > 0 ? filteredData : data}
                                        />

                                        <div className="d-flex gap-2 justify-content-between align-items-center">
                                            <div className="text-muted small">
                                                {filteredData.length > 0
                                                    ? `Hiển thị ${filteredData.length} bản ghi`
                                                    : `Tổng số ${data.length} bản ghi`}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-muted">Không có dữ liệu để hiển thị.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IoTChartFull;