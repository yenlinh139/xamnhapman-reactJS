import React, { useEffect, useState } from "react";
import html2canvas from "html2canvas";
import IoTBarChart from "./IoTBarChart";

// Component bảng số liệu IoT với 4 cột cảm biến
const IoTExportPreviewTable = ({ data }) => {
    // Gom nhóm data theo Date, mỗi dòng là 1 thời điểm
    const grouped = {};
    data.forEach((item) => {
        const time = item.Date;
        if (!grouped[time]) grouped[time] = { Date: time };
        if (item.SensorType === "Salt") grouped[time].Salt = item.Value;
        if (item.SensorType === "Distance") grouped[time].Distance = item.Value;
        if (item.SensorType === "Daily Rainfall") grouped[time].DailyRainfall = item.Value;
        if (item.SensorType === "Temp") grouped[time].Temp = item.Value;
    });
    // Sắp xếp theo thời gian tăng dần
    const rows = Object.values(grouped).sort((a, b) => new Date(a.Date) - new Date(b.Date));

    return (
        <div className="table-responsive mb-3" style={{ maxHeight: 400 }}>
            <table className="table table-bordered table-sm table-striped align-middle">
                <thead className="table-light">
                    <tr>
                        <th style={{ width: 60 }}>#</th>
                        <th>Thời gian</th>
                        <th>Độ mặn (g/L)</th>
                        <th>Mực nước (cm)</th>
                        <th>Lượng mưa hàng ngày (mm)</th>
                        <th>Nhiệt độ không khí (°C)</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => (
                        <tr key={row.Date}>
                            <td>{idx + 1}</td>
                            <td>{new Date(row.Date).toLocaleString("vi-VN")}</td>
                            <td className="text-end">{row.Salt !== undefined ? Number(row.Salt).toFixed(2) : ""}</td>
                            <td className="text-end">{row.Distance !== undefined ? Number(row.Distance).toFixed(2) : ""}</td>
                            <td className="text-end">{row.DailyRainfall !== undefined ? Number(row.DailyRainfall).toFixed(2) : ""}</td>
                            <td className="text-end">{row.Temp !== undefined ? Number(row.Temp).toFixed(2) : ""}</td>
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

    useEffect(() => {
        if (show && iotData?.dataPoints) {
            const validData = iotData.dataPoints.filter(
                (item) => item.Value !== null && item.Value !== "NULL" && !isNaN(item.Value)
            );

            if (validData.length > 0) {
                setExportRange({
                    startDate: validData[0].Date.split(" ")[0],
                    endDate: validData[validData.length - 1].Date.split(" ")[0],
                });
            }
        } else {
            setExportRange({ startDate: "", endDate: "" });
        }
    }, [show, iotData]);

    const handleDateRangeChange = (e) => {
        const { name, value } = e.target;
        setExportRange((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Filter data based on date range
        const startDate = new Date(name === "startDate" ? value : exportRange.startDate);
        const endDate = new Date(name === "endDate" ? value : exportRange.endDate);

        if (startDate && endDate && startDate <= endDate && iotData?.dataPoints) {
            const filtered = iotData.dataPoints.filter((item) => {
                const itemDate = new Date(item.Date);
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

    if (!iotData) return null;

    const data = iotData.dataPoints || [];
    const startDate = data?.length > 0 ? new Date(data[0].Date).toLocaleDateString("vi-VN") : null;
    const endDate = data?.length > 0 ? new Date(data[data.length - 1].Date).toLocaleDateString("vi-VN") : null;

    return (
        <div
            className={`modal fade ${show ? "show d-block" : ""}`}
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
                                📡 Dữ liệu IoT - {iotData.stationName}
                            </h5>
                            <div className="text-muted small">
                                Serial: <strong>{iotData.serialNumber}</strong>
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

                    <div className="modal-body">
                        <ul className="nav nav-tabs mb-3" role="tablist">
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

                        <div className="tab-content">
                            <div className="tab-pane fade show active" id="iot-chart-content">
                                {data.length > 0 ? (
                                    <>
                                        <div id="iot-chart" className="chart-container">
                                            <IoTBarChart data={data} height={500} />
                                            <div className="text-center text-muted small mt-2">
                                                Tổng cộng: {data.length} điểm dữ liệu
                                            </div>
                                        </div>
                                        <div className="mt-3 d-flex justify-content-between align-items-center">
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
                                    </>
                                ) : (
                                    <p className="text-muted">Không có dữ liệu hợp lệ.</p>
                                )}
                            </div>

                            <div className="tab-pane fade" id="iot-export-content">
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
                                                    <span className="text-muted">{"(< 1‰)"}</span>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <span
                                                        className="badge rounded-pill me-2"
                                                        style={{ backgroundColor: "#ffc107", color: "black" }}
                                                    >
                                                        Rủi ro cấp 1
                                                    </span>
                                                    <span className="text-muted">(1-2‰)</span>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <span
                                                        className="badge rounded-pill me-2"
                                                        style={{ backgroundColor: "#ff8c00", color: "white" }}
                                                    >
                                                        Rủi ro cấp 2
                                                    </span>
                                                    <span className="text-muted">(2-4‰)</span>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <span
                                                        className="badge rounded-pill me-2"
                                                        style={{ backgroundColor: "#dc3545", color: "white" }}
                                                    >
                                                        Rủi ro cấp 3
                                                    </span>
                                                    <span className="text-muted">({"> 4‰"})</span>
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