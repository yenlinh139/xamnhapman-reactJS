import React, { useState } from "react";
import { InfoCircle, X } from "react-bootstrap-icons";
import SalinityBarChart from "@pages/map/SalinityBarChart";
import HydrometBarChart from "@pages/map/HydrometBarChart";

import IoTBarChart from "@pages/map/IoTBarChart";

const SaltMiniChart = ({ salinityData }) => {
    return (
        <div className="chart-wrapper rounded shadow-sm border p-2 bg-light" style={{ transition: "0.2s" }}>
            <SalinityBarChart data={salinityData} height={200} />
        </div>
    );
};
const MapDetails = ({
    salinityData,
    hydrometData,
    iotData,
    selectedPoint,
    selectedStation,
    onOpenFullChart,
    onOpenHydrometChart,
    onOpenIoTChart,
    onClose,
}) => {
    // Hiển thị MapDetails nếu có selectedPoint HOẶC selectedStation với hydrometData
    const shouldShow = selectedPoint || (selectedStation && hydrometData && hydrometData.length > 0);
    
    if (!shouldShow) return null;
    
    // Sử dụng thông tin từ selectedPoint hoặc selectedStation
    const displayPoint = selectedPoint || {
        tenDiem: selectedStation?.thongTin?.TenTam || 'Trạm khí tượng thủy văn',
        kiHieu: selectedStation?.maTram || 'Unknown'
    };
    
    const validData = salinityData?.filter(
        (item) => item.salinity !== null && item.salinity !== "NULL" && !isNaN(item.salinity),
    );
    const [selectedDate, setSelectedDate] = useState("");
    const selectedSalinity = validData?.find((item) => item.date.split("T")[0] === selectedDate)?.salinity;

    const startDate = validData?.length > 0 ? new Date(validData[0].date).toLocaleDateString("vi-VN") : null;
    const endDate =
        validData?.length > 0
            ? new Date(validData[validData.length - 1].date).toLocaleDateString("vi-VN")
            : null;
console.log(`iotData.summary`, iotData?.summary);
    return (
        <div
            className="map-details-container rounded-3 shadow-lg bg-white p-4 animate__animated animate__fadeInRight"
            style={{
                maxHeight: "100vh",
                overflowY: "auto",
            }}
        >
            {/* Header + Mini chart: chỉ hiển thị khi có dữ liệu salinity */}
            {validData && validData.length > 0 ? (
                <>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h5 className="fw-bold mb-1">{displayPoint.tenDiem}</h5>
                            {startDate && endDate && (
                                <div className="text-muted small">
                                    Từ <strong>{startDate}</strong> đến <strong>{endDate}</strong>
                                </div>
                            )}
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <InfoCircle size={20} className="text-secondary" title="Thông tin điểm đo" />
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

                    <div onClick={onOpenFullChart} style={{ cursor: "pointer" }} className="hover-shadow">
                        <SaltMiniChart salinityData={salinityData} />
                        <p className="text-center mt-2 text-primary small">Click để xem chi tiết (cần đăng nhập để xuất dữ liệu)</p>
                    </div>
                </>
            ) : (
                // Nếu không có dữ liệu salinity, vẫn cần nút đóng để user có thể đóng panel
                <div className="d-flex justify-content-end mb-2">
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={onClose}
                        title="Đóng thông tin"
                        style={{ lineHeight: 1 }}
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Hydromet Data Section - hiển thị nếu có dữ liệu hydromet */}
            <div className="mt-4">
                {hydrometData && hydrometData.length > 0 && (
                    <>
                        <h6 className="fw-bold mb-2">Yếu tố khí tượng thủy văn</h6>
                        <div
                            className="chart-wrapper rounded shadow-sm border p-2 bg-light hover-shadow"
                            style={{ transition: "0.2s", cursor: "pointer" }}
                            onClick={onOpenHydrometChart}
                        >
                            <HydrometBarChart data={hydrometData} height={200} />
                        </div>
                        <p className="text-center mt-2 text-primary small">
                            Click để xem chi tiết (cần đăng nhập để xuất dữ liệu)
                        </p>

                        <div className="mt-3">
                            <label htmlFor="hydro-date-select" className="form-label mb-1 fw-semibold">
                                Chọn ngày để xem giá trị
                            </label>
                            <select
                                id="hydro-date-select"
                                className="form-select form-select-sm"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                aria-label="Chọn ngày đo khí tượng"
                            >
                                <option value="" disabled>
                                    -- Chọn ngày --
                                </option>
                                {hydrometData.map((d, index) => {
                                    // Handle both "date" and "Ngày" fields
                                    const dateValue = d.date || d.Ngày;
                                    const displayDate = dateValue;

                                    return (
                                        <option key={index} value={dateValue}>
                                            {displayDate}
                                        </option>
                                    );
                                })}
                            </select>

                            {selectedDate && (
                                <div className="mt-2 p-2 rounded border bg-light">
                                    <h6 className="mb-2 fw-bold">Giá trị ngày {selectedDate}</h6>
                                    {(() => {
                                        const selectedData = hydrometData.find(
                                            (d) => (d.date || d.Ngày) === selectedDate,
                                        );

                                        if (!selectedData) {
                                            return <p className="text-muted">Không có dữ liệu</p>;
                                        }

                                        // Display all non-date parameters
                                        const parameters = Object.entries(selectedData)
                                            .filter(([key]) => key !== "date" && key !== "Ngày")
                                            .filter(
                                                ([key, value]) =>
                                                    value !== null && value !== undefined && value !== "",
                                            );

                                        if (parameters.length === 0) {
                                            return <p className="text-muted">Không có dữ liệu đo</p>;
                                        }

                                        return (
                                            <div className="row g-2">
                                                {parameters.map(([key, value]) => {
                                                    // Get parameter info for display
                                                    const getParamInfo = (paramKey) => {
                                                        const paramMap = {
                                                            // Rainfall parameters
                                                            R_AP: {
                                                                label: "Mưa An Phú",
                                                                unit: "mm",
                                                                color: "#0d6efd",
                                                            },
                                                            R_BC: {
                                                                label: "Mưa Bình Chánh",
                                                                unit: "mm",
                                                                color: "#0d6efd",
                                                            },
                                                            R_CG: {
                                                                label: "Mưa Cần Giờ",
                                                                unit: "mm",
                                                                color: "#0d6efd",
                                                            },
                                                            R_CL: {
                                                                label: "Mưa Cát Lái",
                                                                unit: "mm",
                                                                color: "#0d6efd",
                                                            },
                                                            R_CC: {
                                                                label: "Mưa Củ Chi",
                                                                unit: "mm",
                                                                color: "#0d6efd",
                                                            },
                                                            R_HM: {
                                                                label: "Mưa Hóc Môn",
                                                                unit: "mm",
                                                                color: "#0d6efd",
                                                            },
                                                            R_LMX: {
                                                                label: "Mưa Lê Minh Xuân",
                                                                unit: "mm",
                                                                color: "#0d6efd",
                                                            },
                                                            R_LS: {
                                                                label: "Mưa Long Sơn",
                                                                unit: "mm",
                                                                color: "#0d6efd",
                                                            },
                                                            R_MDC: {
                                                                label: "Mưa Mạc Đĩnh Chi",
                                                                unit: "mm",
                                                                color: "#0d6efd",
                                                            },
                                                            R_NB: {
                                                                label: "Mưa Nhà Bè",
                                                                unit: "mm",
                                                                color: "#0d6efd",
                                                            },
                                                            R_PVC: {
                                                                label: "Mưa Phạm Văn Cội",
                                                                unit: "mm",
                                                                color: "#0d6efd",
                                                            },
                                                            R_TTH: {
                                                                label: "Mưa Tam Thôn Hiệp",
                                                                unit: "mm",
                                                                color: "#0d6efd",
                                                            },
                                                            R_TD: {
                                                                label: "Mưa Thủ Đức",
                                                                unit: "mm",
                                                                color: "#0d6efd",
                                                            },
                                                            R_TSH: {
                                                                label: "Mưa Tân Sơn Hòa",
                                                                unit: "mm",
                                                                color: "#0d6efd",
                                                            },

                                                            // Temperature parameters
                                                            Ttb_TSH: {
                                                                label: "Nhiệt độ TB",
                                                                unit: "°C",
                                                                color: "#dc3545",
                                                            },
                                                            Tx_TSH: {
                                                                label: "Nhiệt độ Max",
                                                                unit: "°C",
                                                                color: "#fd7e14",
                                                            },
                                                            Tm_TSH: {
                                                                label: "Nhiệt độ Min",
                                                                unit: "°C",
                                                                color: "#28a745",
                                                            },

                                                            // Water level parameters
                                                            Htb_NB: {
                                                                label: "Mực nước TB Nhà Bè",
                                                                unit: "cm",
                                                                color: "#20c997",
                                                            },
                                                            Hx_NB: {
                                                                label: "Mực nước Max Nhà Bè",
                                                                unit: "cm",
                                                                color: "#17a2b8",
                                                            },
                                                            Hm_NB: {
                                                                label: "Mực nước Min Nhà Bè",
                                                                unit: "cm",
                                                                color: "#6f42c1",
                                                            },
                                                            Htb_PA: {
                                                                label: "Mực nước TB Phú An",
                                                                unit: "cm",
                                                                color: "#20c997",
                                                            },
                                                            Hx_PA: {
                                                                label: "Mực nước Max Phú An",
                                                                unit: "cm",
                                                                color: "#17a2b8",
                                                            },
                                                            Hm_PA: {
                                                                label: "Mực nước Min Phú An",
                                                                unit: "cm",
                                                                color: "#6f42c1",
                                                            },
                                                        };

                                                        return (
                                                            paramMap[paramKey] || {
                                                                label: paramKey,
                                                                unit: "",
                                                                color: "#6c757d",
                                                            }
                                                        );
                                                    };

                                                    const paramInfo = getParamInfo(key);
                                                    const displayValue =
                                                        typeof value === "number" ? value.toFixed(2) : value;

                                                    return (
                                                        <div key={key} className="col-md-6">
                                                            <div
                                                                className="p-2 rounded text-white small"
                                                                style={{ backgroundColor: paramInfo.color }}
                                                            >
                                                                <div className="fw-bold">
                                                                    {paramInfo.label}
                                                                </div>
                                                                <div>
                                                                    {displayValue} {paramInfo.unit}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* IoT Data Section */}
            {iotData && iotData.dataPoints && iotData.dataPoints.length > 0 && (
                <div className="mt-4">
                    <h6 className="fw-bold mb-2">
                        <i className="fa-solid fa-tower-broadcast me-2"></i>
                        Dữ liệu IoT - {iotData.stationName}
                    </h6>
                    <div className="mb-2 text-muted small">
                        <span className="fw-semibold">Mã trạm:</span> {iotData.serialNumber}
                        {iotData.summary?.totalRecords && (
                            <>
                                {" | "}
                                <span className="fw-semibold">Tổng số bản ghi:</span> {iotData.summary.totalRecords}
                            </>
                        )}
                        {iotData.summary?.dateRange && iotData.summary.dateRange !== 'N/A' && (
                            <>
                                {" | "}
                                <span className="fw-semibold">Khoảng thời gian:</span> {iotData.summary.dateRange}
                            </>
                        )}
                    </div>
                    
                    <div className="chart-wrapper rounded shadow-sm border p-2 bg-light">
                        <IoTBarChart data={iotData.dataPoints} height={400} isCompact={true} />
                    </div>
                    
                    <div className="mt-2 text-center">
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={onOpenIoTChart}
                            title="Xem biểu đồ chi tiết và xuất dữ liệu"
                        >
                            <i className="fa-solid fa-expand me-1"></i>
                            Mở rộng
                        </button>
                    </div>
                    
                    {/* IoT Data Details */}
                    <div className="mt-3">
                        <label htmlFor="iot-date-select" className="form-label mb-1 fw-semibold">
                            Chọn thời điểm để xem giá trị IoT
                        </label>
                        <select
                            id="iot-date-select"
                            className="form-select form-select-sm"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            aria-label="Chọn thời điểm đo IoT"
                        >
                            <option value="" disabled>
                                -- Chọn thời điểm --
                            </option>
                            {/* Lọc danh sách thời điểm duy nhất */}
                            {Array.from(new Set(iotData.dataPoints.map(d => d.Date))).map((date, index) => {
                                const displayDateTime = new Date(date).toLocaleString("vi-VN");
                                return (
                                    <option key={index} value={date}>
                                        {displayDateTime}
                                    </option>
                                );
                            })}
                        </select>

                        {selectedDate && (
                            <div className="mt-2 p-2 rounded border bg-light">
                                {(() => {
                                    // Lấy tất cả dữ liệu của thời điểm đã chọn
                                    const dataAtTime = iotData.dataPoints.filter(
                                        (d) => d.Date === selectedDate,
                                    );

                                    if (dataAtTime.length === 0) {
                                        return <p className="text-muted">Không có dữ liệu</p>;
                                    }

                                    const displayDateTime = new Date(selectedDate).toLocaleString("vi-VN");

                                    // Tạo object chứa dữ liệu của từng loại cảm biến
                                    const sensorData = {};
                                    dataAtTime.forEach(item => {
                                        sensorData[item.SensorType] = {
                                            value: item.Value,
                                            unit: item.Unit,
                                            status: item.Status
                                        };
                                    });

                                    // Map tên và màu cho từng loại cảm biến
                                    const sensorInfo = {
                                        "Salt": { name: "Độ mặn", color: "#43A047", unit: "g/L" },
                                        "Distance": { name: "Mực nước", color: "#FFD600", unit: "cm" },
                                        "Daily Rainfall": { name: "Lượng mưa hàng ngày", color: "#FF0000", unit: "mm" },
                                        "Temp": { name: "Nhiệt độ không khí", color: "#1976D2", unit: "°C" }
                                    };

                                    return (
                                        <div>
                                            <h6 className="mb-2 fw-bold">Thông tin chi tiết - {displayDateTime}</h6>
                                            <div className="row g-2">
                                                {Object.entries(sensorInfo).map(([sensorType, info]) => {
                                                    const data = sensorData[sensorType];
                                                    if (!data) return null;
                                                    
                                                    return (
                                                        <div key={sensorType} className="col-md-6">
                                                            <div
                                                                className="p-2 rounded text-white small"
                                                                style={{ backgroundColor: info.color }}
                                                            >
                                                                <div className="fw-bold">{info.name}</div>
                                                                <div>{Number(data.value).toFixed(2)} {info.unit}</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapDetails;
