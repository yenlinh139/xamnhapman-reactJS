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
    selectedPoint,
    selectedStation,
    onOpenFullChart,
    onOpenHydrometChart,
    onClose,
    isHydrometTabActive = true,
}) => {
    // Hiển thị MapDetails nếu có selectedPoint HOẶC selectedStation với hydrometData
    const shouldShow = selectedPoint || (selectedStation && hydrometData && hydrometData.length > 0);

    if (!shouldShow) {
        return null;
    }

    // Sử dụng thông tin từ selectedPoint hoặc selectedStation
    const displayPoint = selectedPoint || {
        tenDiem: selectedStation?.thongTin?.TenTam || "Trạm khí tượng thủy văn",
        kiHieu: selectedStation?.maTram || "Unknown",
    };

    const validData = (Array.isArray(salinityData) ? salinityData : [])
        .map((item) => {
            const normalizedSalinity =
                item?.salinity === null ||
                item?.salinity === undefined ||
                item?.salinity === "" ||
                item?.salinity === "NULL"
                    ? null
                    : Number(String(item.salinity).replace(",", "."));

            return {
                ...item,
                salinity: Number.isFinite(normalizedSalinity) ? normalizedSalinity : null,
            };
        })
        .filter((item) => item?.date && item?.salinity !== null);
    const [selectedDate, setSelectedDate] = useState("");
    const selectedSalinity = validData?.find(
        (item) => String(item.date).split("T")[0] === selectedDate,
    )?.salinity;

    const startDate = validData?.length > 0 ? new Date(validData[0].date).toLocaleDateString("vi-VN") : null;
    const endDate =
        validData?.length > 0
            ? new Date(validData[validData.length - 1].date).toLocaleDateString("vi-VN")
            : null;
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
                        <p className="text-center mt-2 text-primary small">
                            Click để xem chi tiết (cần đăng nhập để xuất dữ liệu)
                        </p>
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

            {/* Hydromet Data Section - hiển thị nếu có dữ liệu hydromet và tab khí tượng đang mở */}
            {isHydrometTabActive && (
                <div className="mt-4">
                    {hydrometData && hydrometData.length > 0 ? (
                        <>
                            <h6 className="fw-bold mb-2">
                                Yếu tố khí tượng thủy văn
                                <span className="badge bg-secondary ms-2">{hydrometData.length} điểm</span>
                            </h6>
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
                                                            typeof value === "number"
                                                                ? value.toFixed(2)
                                                                : value;

                                                        return (
                                                            <div key={key} className="col-md-6">
                                                                <div
                                                                    className="p-2 rounded text-white small"
                                                                    style={{
                                                                        backgroundColor: paramInfo.color,
                                                                    }}
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
                    ) : (
                        <div className="text-center text-muted py-3">
                            <i className="bi bi-graph-down" style={{ fontSize: "1.5rem" }}></i>
                            <p className="small mb-0 mt-2">Không có dữ liệu khí tượng thủy văn</p>
                        </div>
                    )}
                </div>
            )}

            {/* Đã loại bỏ phần hiển thị dữ liệu IoT chi tiết trong MapDetails. Khi bấm nút sẽ mở modal ngoài. */}

            {/* Hiển thị thông báo khi chỉ có IoT data hoặc hydromet data mà không có salinity data */}
            {!validData?.length && (selectedPoint || selectedStation) && (
                <div className="empty-state text-center py-4">
                    <div className="mb-3">
                        <i className="fas fa-chart-line fa-3x text-muted"></i>
                    </div>
                    <h6 className="text-muted">Không có dữ liệu để hiển thị</h6>
                    <p className="text-muted small mb-0">
                        {selectedPoint ? `Điểm: ${selectedPoint.tenDiem}` : ""}
                        {selectedStation ? `Trạm: ${selectedStation.tenTram || selectedStation.maTram}` : ""}
                    </p>
                    <button className="btn btn-sm btn-outline-secondary mt-2" onClick={onClose}>
                        Đóng
                    </button>
                </div>
            )}
        </div>
    );
};

export default MapDetails;
