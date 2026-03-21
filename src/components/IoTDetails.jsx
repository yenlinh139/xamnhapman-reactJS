import React, { useState } from "react";
import { InfoCircle, X, BarChart } from "react-bootstrap-icons";
import IoTBarChart from "@pages/map/IoTBarChart";

const IoTDetails = ({ iotData, onClose, onOpenFullChart }) => {
    const [selectedDate, setSelectedDate] = useState("");
    if (!iotData) {
        console.log('❌ No iotData provided');
        return null;
    }

    // Check for dataPoints first, then fallback to data
    const dataPoints = iotData.dataPoints && iotData.dataPoints.length > 0 
        ? iotData.dataPoints 
        : iotData.data || [];
    const hasData = dataPoints.length > 0;
    
    if (!hasData) {
        return null;
    }

    const { stationName, serialNumber, summary } = iotData;

    const selectedDataPoint = dataPoints.find((item) => {
        // Sử dụng Date hoặc date_time tùy vào data structure
        const itemDateField = item.Date || item.date_time;
        if (!itemDateField) return false;
        
        const itemDate = new Date(itemDateField).toLocaleDateString("vi-VN");
        const selectedDateFormatted = selectedDate ? new Date(selectedDate).toLocaleDateString("vi-VN") : "";
        return itemDate === selectedDateFormatted;
    });

    const startDate = dataPoints.length > 0 
        ? new Date(dataPoints[0].Date || dataPoints[0].date_time).toLocaleDateString("vi-VN") 
        : null;
    const endDate = dataPoints.length > 0 
        ? new Date(dataPoints[dataPoints.length - 1].Date || dataPoints[dataPoints.length - 1].date_time).toLocaleDateString("vi-VN") 
        : null;

    // Function to get risk level based on value
    const getRiskLevel = (value) => {
        if (value === null || value === undefined || isNaN(value)) {
            return { level: "Khuyết số liệu", color: "#6c757d", bgColor: "#f8f9fa" };
        }
        
        const numValue = parseFloat(value);
        
        if (numValue < 1) {
            return { level: "Bình thường", color: "#155724", bgColor: "#d4edda" };
        } else if (numValue <= 4) {
            return { level: "Rủi ro cấp 1", color: "#856404", bgColor: "#fff3cd" };
        } else if (numValue <= 8) {
            return { level: "Rủi ro cấp 2", color: "#bd4502", bgColor: "#fed7aa" };
        } else {
            return { level: "Rủi ro cấp 3", color: "#721c24", bgColor: "#f8d7da" };
        }
    };

    return (
        <div
            className="map-details-container rounded-3 shadow-lg bg-white p-4 animate__animated animate__fadeInRight"
            style={{
                maxHeight: "100vh",
                overflowY: "auto",
                width: "400px",
            }}
        >
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h5 className="fw-bold mb-1">
                        <BarChart className="me-2" />
                        {stationName}
                    </h5>
                    <div className="text-muted small mb-2">
                        Serial: <strong>{serialNumber}</strong>
                    </div>
                    {startDate && endDate && (
                        <div className="text-muted small">
                            Từ <strong>{startDate}</strong> đến <strong>{endDate}</strong>
                        </div>
                    )}
                </div>

                <div className="d-flex align-items-center gap-2">
                    <InfoCircle size={20} className="text-secondary" title="Thông tin trạm IoT" />
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={onClose}
                        title="Đóng thông tin"
                        style={{ lineHeight: 1 }}
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Summary Info */}
            <div className="row g-2 mb-3">
                <div className="col-6">
                    <div className="card card-body p-2 text-center">
                        <div className="fw-bold text-primary">{summary?.totalRecordsInRange || summary?.totalRecords || dataPoints.length}</div>
                        <small className="text-muted">Bản ghi {summary?.rangeLabel || "đang hiển thị"}</small>
                    </div>
                </div>
                <div className="col-6">
                    <div className="card card-body p-2 text-center">
                        <div className="fw-bold text-success">{summary?.totalRecordsAll || 0}</div>
                        <small className="text-muted">Tổng bản ghi trong DB</small>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div onClick={onOpenFullChart} style={{ cursor: "pointer" }} className="hover-shadow rounded">
                <div className="chart-wrapper rounded shadow-sm border p-2 bg-light">
                    <IoTBarChart data={dataPoints} height={250} />
                </div>
                <p className="text-center mt-2 text-primary small">
                    Click để xem chi tiết (có thể xuất dữ liệu)
                </p>
            </div>

            {/* Date Selection */}
            <div className="mt-4">
                <label htmlFor="iot-date-select" className="form-label mb-1 fw-semibold">
                    Chọn ngày để xem giá trị chi tiết
                </label>
                <select
                    id="iot-date-select"
                    className="form-select form-select-sm"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    aria-label="Chọn ngày đo IoT"
                >
                    <option value="" disabled>
                        -- Chọn ngày --
                    </option>
                    {dataPoints.map((item, index) => {
                        const dateValue = item.Date || item.date_time;
                        const displayDate = new Date(dateValue).toLocaleString("vi-VN");

                        return (
                            <option key={index} value={dateValue}>
                                {displayDate}
                            </option>
                        );
                    })}
                </select>

                {selectedDataPoint && (
                    <div className="mt-3">
                        <div className="card">
                            <div className="card-header py-2">
                                <h6 className="mb-0 fw-bold">
                                    Chi tiết ngày{" "}
                                    {new Date(
                                        selectedDataPoint.Date || selectedDataPoint.date_time,
                                    ).toLocaleString("vi-VN")}
                                </h6>
                            </div>
                            <div className="card-body p-3">
                                {/* Value with Risk Level */}
                                <div className="row g-2 mb-3">
                                    <div className="col-12">
                                        {(() => {
                                            // Lấy giá trị chính để hiển thị (ưu tiên salt_value, fallback về Value)
                                            const mainValue =
                                                selectedDataPoint.salt_value || selectedDataPoint.Value;
                                            const mainUnit =
                                                selectedDataPoint.salt_unit ||
                                                selectedDataPoint.Unit ||
                                                "ppt";

                                            return (
                                                <div
                                                    className="p-3 rounded border"
                                                    style={{
                                                        backgroundColor: getRiskLevel(mainValue).bgColor,
                                                        borderColor: getRiskLevel(mainValue).color,
                                                    }}
                                                >
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <div className="fw-bold fs-4">
                                                                {mainValue} {mainUnit}
                                                            </div>
                                                            <div
                                                                className="small fw-semibold"
                                                                style={{
                                                                    color: getRiskLevel(mainValue).color,
                                                                }}
                                                            >
                                                                {getRiskLevel(mainValue).level}
                                                            </div>
                                                        </div>
                                                        <div
                                                            className="rounded-circle d-flex align-items-center justify-content-center"
                                                            style={{
                                                                width: "40px",
                                                                height: "40px",
                                                                backgroundColor:
                                                                    getRiskLevel(mainValue).color,
                                                            }}
                                                        >
                                                            <BarChart className="text-white" size={20} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Technical Details */}
                                <div className="row g-2">
                                    <div className="col-6">
                                        <div className="p-2 rounded border bg-light">
                                            <small className="text-muted d-block">Trạm</small>
                                            <div className="fw-semibold">
                                                {selectedDataPoint.DeviceSerialNumber ||
                                                    iotData.serialNumber ||
                                                    "N/A"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="p-2 rounded border bg-light">
                                            <small className="text-muted d-block">Loại cảm biến</small>
                                            <div className="fw-semibold">
                                                {selectedDataPoint.SensorType || "Multi-sensor IoT"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="p-2 rounded border bg-light">
                                            <small className="text-muted d-block">Đơn vị</small>
                                            <div className="fw-semibold">
                                                {selectedDataPoint.Unit ||
                                                    selectedDataPoint.salt_unit ||
                                                    "ppt"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="p-2 rounded border bg-light">
                                            <small className="text-muted d-block">Trạng thái</small>
                                            <div
                                                className={`fw-semibold ${
                                                    selectedDataPoint.Status === "Good" ||
                                                    selectedDataPoint.salt_status === "Good"
                                                        ? "text-success"
                                                        : "text-warning"
                                                }`}
                                            >
                                                {selectedDataPoint.Status ||
                                                    selectedDataPoint.salt_status ||
                                                    "Good"}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Sensor Readings */}
                                {(selectedDataPoint.salt_value ||
                                    selectedDataPoint.temp_value ||
                                    selectedDataPoint.distance_value ||
                                    selectedDataPoint.daily_rainfall_value) && (
                                    <div className="mt-3">
                                        <h6 className="fw-bold mb-2">Chi tiết các cảm biến</h6>
                                        <div className="row g-2">
                                            {selectedDataPoint.salt_value && (
                                                <div className="col-6">
                                                    <div
                                                        className="p-2 rounded border"
                                                        style={{
                                                            backgroundColor: "#e7f3ff",
                                                            borderColor: "#007bff",
                                                        }}
                                                    >
                                                        <small className="text-muted d-block">
                                                            🧂 Độ mặn
                                                        </small>
                                                        <div className="fw-semibold text-primary">
                                                            {selectedDataPoint.salt_value}{" "}
                                                            {selectedDataPoint.salt_unit}
                                                        </div>
                                                        <small
                                                            className={`text-${selectedDataPoint.salt_status === "Good" ? "success" : "warning"}`}
                                                        >
                                                            {selectedDataPoint.salt_status}
                                                        </small>
                                                    </div>
                                                </div>
                                            )}
                                            {selectedDataPoint.temp_value && (
                                                <div className="col-6">
                                                    <div
                                                        className="p-2 rounded border"
                                                        style={{
                                                            backgroundColor: "#fff3e0",
                                                            borderColor: "#ff9800",
                                                        }}
                                                    >
                                                        <small className="text-muted d-block">
                                                            🌡️ Nhiệt độ
                                                        </small>
                                                        <div className="fw-semibold text-warning">
                                                            {selectedDataPoint.temp_value}{" "}
                                                            {selectedDataPoint.temp_unit}
                                                        </div>
                                                        <small
                                                            className={`text-${selectedDataPoint.temp_status === "Good" ? "success" : "warning"}`}
                                                        >
                                                            {selectedDataPoint.temp_status}
                                                        </small>
                                                    </div>
                                                </div>
                                            )}
                                            {selectedDataPoint.distance_value && (
                                                <div className="col-6">
                                                    <div
                                                        className="p-2 rounded border"
                                                        style={{
                                                            backgroundColor: "#f3e5f5",
                                                            borderColor: "#9c27b0",
                                                        }}
                                                    >
                                                        <small className="text-muted d-block">
                                                            🌊 Mực nước
                                                        </small>
                                                        <div
                                                            className="fw-semibold"
                                                            style={{ color: "#9c27b0" }}
                                                        >
                                                            {selectedDataPoint.distance_value}{" "}
                                                            {selectedDataPoint.distance_unit}
                                                        </div>
                                                        <small
                                                            className={`text-${selectedDataPoint.distance_status === "Good" ? "success" : "warning"}`}
                                                        >
                                                            {selectedDataPoint.distance_status}
                                                        </small>
                                                    </div>
                                                </div>
                                            )}
                                            {selectedDataPoint.daily_rainfall_value && (
                                                <div className="col-6">
                                                    <div
                                                        className="p-2 rounded border"
                                                        style={{
                                                            backgroundColor: "#e8f5e8",
                                                            borderColor: "#4caf50",
                                                        }}
                                                    >
                                                        <small className="text-muted d-block">
                                                            🌧️ Lượng mưa hàng ngày
                                                        </small>
                                                        <div className="fw-semibold text-success">
                                                            {selectedDataPoint.daily_rainfall_value}{" "}
                                                            {selectedDataPoint.daily_rainfall_unit}
                                                        </div>
                                                        <small
                                                            className={`text-${selectedDataPoint.daily_rainfall_status === "Good" ? "success" : "warning"}`}
                                                        >
                                                            {selectedDataPoint.daily_rainfall_status}
                                                        </small>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="mt-4">
                <h6 className="fw-bold mb-2">Phân loại mức rủi ro (Độ mặn)</h6>
                <div className="row g-2">
                    <div className="col-6">
                        <div className="d-flex align-items-center">
                            <div
                                className="me-2"
                                style={{
                                    width: "16px",
                                    height: "16px",
                                    backgroundColor: "#28a745",
                                    borderRadius: "2px",
                                }}
                            ></div>
                            <small>Bình thường (&lt;1 ppt)</small>
                        </div>
                    </div>
                    <div className="col-6">
                        <div className="d-flex align-items-center">
                            <div
                                className="me-2"
                                style={{
                                    width: "16px",
                                    height: "16px",
                                    backgroundColor: "#ffc107",
                                    borderRadius: "2px",
                                }}
                            ></div>
                            <small>Rủi ro cấp 1 (1-4 ppt)</small>
                        </div>
                    </div>
                    <div className="col-6">
                        <div className="d-flex align-items-center">
                            <div
                                className="me-2"
                                style={{
                                    width: "16px",
                                    height: "16px",
                                    backgroundColor: "#fd7e14",
                                    borderRadius: "2px",
                                }}
                            ></div>
                            <small>Rủi ro cấp 2 (4-8 ppt)</small>
                        </div>
                    </div>
                    <div className="col-6">
                        <div className="d-flex align-items-center">
                            <div
                                className="me-2"
                                style={{
                                    width: "16px",
                                    height: "16px",
                                    backgroundColor: "#dc3545",
                                    borderRadius: "2px",
                                }}
                            ></div>
                            <small>Rủi ro cấp 3 (&gt;8 ppt)</small>
                        </div>
                    </div>
                </div>

                {/* Sensor Legend */}
                <div className="mt-3">
                    <h6 className="fw-bold mb-2">Ký hiệu cảm biến</h6>
                    <div className="row g-2">
                        <div className="col-6">
                            <div className="d-flex align-items-center">
                                <span className="me-2">🧂</span>
                                <small>Độ mặn (ppt)</small>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="d-flex align-items-center">
                                <span className="me-2">🌡️</span>
                                <small>Nhiệt độ (°C)</small>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="d-flex align-items-center">
                                <span className="me-2">📏</span>
                                <small>Mực nước (m)</small>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="d-flex align-items-center">
                                <span className="me-2">🌧️</span>
                                <small>Lượng mưa (mm)</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IoTDetails;