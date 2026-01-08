import React, { useState } from "react";
import { InfoCircle, X, BarChart } from "react-bootstrap-icons";
import IoTBarChart from "@pages/map/IoTBarChart";

const IoTDetails = ({ iotData, onClose, onOpenFullChart }) => {
    const [selectedDate, setSelectedDate] = useState("");

    if (!iotData || !iotData.dataPoints || iotData.dataPoints.length === 0) {
        return null;
    }

    const { stationName, serialNumber, dataPoints, summary } = iotData;

    const selectedDataPoint = dataPoints.find((item) => {
        const itemDate = new Date(item.Date).toLocaleDateString("vi-VN");
        const selectedDateFormatted = selectedDate ? new Date(selectedDate).toLocaleDateString("vi-VN") : "";
        return itemDate === selectedDateFormatted;
    });

    const startDate = dataPoints.length > 0 
        ? new Date(dataPoints[0].Date).toLocaleDateString("vi-VN") 
        : null;
    const endDate = dataPoints.length > 0 
        ? new Date(dataPoints[dataPoints.length - 1].Date).toLocaleDateString("vi-VN") 
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
                width: "400px"
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
                        <div className="fw-bold text-primary">{summary.totalRecords}</div>
                        <small className="text-muted">Tổng số bản ghi</small>
                    </div>
                </div>
                <div className="col-6">
                    <div className="card card-body p-2 text-center">
                        <div className="fw-bold text-success">{dataPoints[0]?.SensorType || "N/A"}</div>
                        <small className="text-muted">Loại cảm biến</small>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div 
                onClick={onOpenFullChart} 
                style={{ cursor: "pointer" }} 
                className="hover-shadow rounded"
            >
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
                        const dateValue = item.Date;
                        const displayDate = new Date(item.Date).toLocaleString("vi-VN");
                        
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
                                    Chi tiết ngày {new Date(selectedDataPoint.Date).toLocaleString("vi-VN")}
                                </h6>
                            </div>
                            <div className="card-body p-3">
                                {/* Value with Risk Level */}
                                <div className="row g-2 mb-3">
                                    <div className="col-12">
                                        <div 
                                            className="p-3 rounded border"
                                            style={{ 
                                                backgroundColor: getRiskLevel(selectedDataPoint.Value).bgColor,
                                                borderColor: getRiskLevel(selectedDataPoint.Value).color
                                            }}
                                        >
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <div className="fw-bold fs-4">
                                                        {selectedDataPoint.Value} {selectedDataPoint.Unit}
                                                    </div>
                                                    <div 
                                                        className="small fw-semibold"
                                                        style={{ color: getRiskLevel(selectedDataPoint.Value).color }}
                                                    >
                                                        {getRiskLevel(selectedDataPoint.Value).level}
                                                    </div>
                                                </div>
                                                <div 
                                                    className="rounded-circle d-flex align-items-center justify-content-center"
                                                    style={{ 
                                                        width: "40px", 
                                                        height: "40px",
                                                        backgroundColor: getRiskLevel(selectedDataPoint.Value).color
                                                    }}
                                                >
                                                    <BarChart className="text-white" size={20} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Technical Details */}
                                <div className="row g-2">
                                    <div className="col-6">
                                        <div className="p-2 rounded border bg-light">
                                            <small className="text-muted d-block">Trạm</small>
                                            <div className="fw-semibold">{selectedDataPoint.DeviceSerialNumber}</div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="p-2 rounded border bg-light">
                                            <small className="text-muted d-block">Loại cảm biến</small>
                                            <div className="fw-semibold">{selectedDataPoint.SensorType}</div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="p-2 rounded border bg-light">
                                            <small className="text-muted d-block">Đơn vị</small>
                                            <div className="fw-semibold">{selectedDataPoint.Unit || "N/A"}</div>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="p-2 rounded border bg-light">
                                            <small className="text-muted d-block">Trạng thái</small>
                                            <div className={`fw-semibold ${selectedDataPoint.Status === 'Enable' ? 'text-success' : 'text-warning'}`}>
                                                {selectedDataPoint.Status}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="mt-4">
                <h6 className="fw-bold mb-2">Phân loại mức rủi ro</h6>
                <div className="row g-2">
                    <div className="col-6">
                        <div className="d-flex align-items-center">
                            <div 
                                className="me-2" 
                                style={{ 
                                    width: "16px", 
                                    height: "16px", 
                                    backgroundColor: "#28a745",
                                    borderRadius: "2px"
                                }}
                            ></div>
                            <small>Bình thường (&lt;1)</small>
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
                                    borderRadius: "2px"
                                }}
                            ></div>
                            <small>Rủi ro cấp 1 (1-4)</small>
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
                                    borderRadius: "2px"
                                }}
                            ></div>
                            <small>Rủi ro cấp 2 (4-8)</small>
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
                                    borderRadius: "2px"
                                }}
                            ></div>
                            <small>Rủi ro cấp 3 (&gt;8)</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IoTDetails;