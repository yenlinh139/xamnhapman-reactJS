import React, { useState } from "react";
import { InfoCircle, X } from "react-bootstrap-icons";
import SalinityBarChart from "@pages/map/SalinityBarChart";
import HydrometBarChart from "@pages/map/HydrometBarChart";

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
    onOpenFullChart,
    onOpenHydrometChart,
    onClose,
}) => {
    if (!selectedPoint) return null;
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

    return (
        <div
            className="map-details-container rounded-3 shadow-lg bg-white p-4 animate__animated animate__fadeInRight"
            style={{
                maxHeight: "100vh",
                overflowY: "auto",
            }}
        >
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h5 className="fw-bold mb-1">{selectedPoint.tenDiem}</h5>
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
                <p className="text-center mt-2 text-primary small">Click để xem chi tiết và xuất dữ liệu</p>
            </div>

            {/* Hydromet Data Section */}
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
                            Click để xem chi tiết và xuất dữ liệu
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
        </div>
    );
};

export default MapDetails;
