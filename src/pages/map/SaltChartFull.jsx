import React, { useEffect, useState } from "react";
import axiosInstance from "@config/axios-config";
import SalinityBarChart from "@pages/map/SalinityBarChart";
import html2canvas from "html2canvas";
import { getDisplayStationName, getFilenameSafeStationName } from "@common/stationMapping";
import { getSingleStationClassification } from "@common/salinityClassification";

const ExportPreviewTable = ({ data }) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    const sortedData = React.useMemo(() => {
        if (!sortConfig.key) return data;

        const sorted = [...data].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            if (sortConfig.key === "date") {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            } else if (sortConfig.key === "salinity") {
                aValue = Number(aValue);
                bValue = Number(bValue);
            }

            if (aValue < bValue) {
                return sortConfig.direction === "asc" ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === "asc" ? 1 : -1;
            }
            return 0;
        });

        return sorted;
    }, [data, sortConfig]);

    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
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

    return (
        <div className="table-responsive mb-3" style={{ maxHeight: 300 }}>
            <table className="table table-bordered table-sm table-striped">
                <thead className="table-light">
                    <tr>
                        <th style={{ width: "60px" }}>#</th>
                        <th
                            style={{ cursor: "pointer", userSelect: "none" }}
                            onClick={() => handleSort("date")}
                        >
                            <div className="d-flex align-items-center justify-content-between">
                                <span>Ngày</span>
                                {getSortIcon("date")}
                            </div>
                        </th>
                        <th
                            style={{ cursor: "pointer", userSelect: "none" }}
                            onClick={() => handleSort("salinity")}
                        >
                            <div className="d-flex align-items-center justify-content-between">
                                <span>Độ mặn (‰)</span>
                                {getSortIcon("salinity")}
                            </div>
                        </th>
                        <th style={{ minWidth: "120px" }}>
                            <div className="d-flex align-items-center">
                                <span>⚠️ Cấp độ rủi ro</span>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((item, idx) => {
                        const riskClassification = getSingleStationClassification(item.salinity, kiHieu);
                        const riskColorMap = {
                            normal: "#28a745", // Green - Bình thường
                            warning: "#ffc107", // Yellow - Rủi ro cấp 1
                            "high-warning": "#ff8c00", // Orange - Rủi ro cấp 2
                            critical: "#dc3545", // Red - Rủi ro cấp 3
                            "no-data": "#6c757d", // Gray - Khuyết số liệu
                        };

                        return (
                            <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td>{new Date(item.date).toLocaleDateString("vi-VN")}</td>
                                <td className="text-end fw-bold">{Number(item.salinity).toFixed(4)}</td>
                                <td>
                                    <span
                                        className="badge rounded-pill px-2 py-1"
                                        style={{
                                            backgroundColor:
                                                riskColorMap[riskClassification.class] || "#6c757d",
                                            color: "white",
                                            fontSize: "0.75rem",
                                        }}
                                    >
                                        {riskClassification.shortText}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const SaltChartFull = ({ show, kiHieu, tenDiem, salinityData, onClose }) => {
    // Get display name for the station using utility function
    const displayStationName = getDisplayStationName(tenDiem, kiHieu);
    const filenameSafeName = getFilenameSafeStationName(displayStationName);

    const [data, setData] = useState([]);
    const [exportRange, setExportRange] = useState({
        startDate: "",
        endDate: "",
    });
    const [filteredData, setFilteredData] = useState([]);

    useEffect(() => {
        if (show && salinityData) {
            // Lọc bỏ các ngày có giá trị NULL
            const validSalinityData = salinityData.filter(
                (item) => item.salinity !== null && item.salinity !== "NULL" && !isNaN(item.salinity),
            );

            setData(validSalinityData);
            if (validSalinityData.length > 0) {
                setExportRange({
                    startDate: validSalinityData[0].date.split("T")[0],
                    endDate: validSalinityData[validSalinityData.length - 1].date.split("T")[0],
                });
            }
        } else {
            setData([]);
            setExportRange({ startDate: "", endDate: "" });
        }
    }, [show, salinityData]);

    useEffect(() => {
        if (!show) setData([]);
    }, [show]);

    const handleDateRangeChange = (e) => {
        const { name, value } = e.target;
        setExportRange((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Filter data based on date range
        const startDate = new Date(name === "startDate" ? value : exportRange.startDate);
        const endDate = new Date(name === "endDate" ? value : exportRange.endDate);

        if (startDate && endDate && startDate <= endDate) {
            const filtered = data.filter((item) => {
                const itemDate = new Date(item.date);
                return itemDate >= startDate && itemDate <= endDate;
            });
            setFilteredData(filtered);
        }
    };

    const handleExportExcel = async () => {
        try {
            if (!exportRange.startDate || !exportRange.endDate) {
                alert("Vui lòng chọn khoảng thời gian để xuất dữ liệu");
                return;
            }

            const dataToExport = filteredData.length > 0 ? filteredData : data;
            const exportData = {
                kiHieu,
                tenDiem,
                startDate: exportRange.startDate,
                endDate: exportRange.endDate,
                data: dataToExport,
            };

            const res = await axiosInstance.post("/salinity-export", exportData, {
                responseType: "blob",
            });

            const blob = new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const fileName = `do_man_${filenameSafeName}_${exportRange.startDate}_${exportRange.endDate}.xlsx`;
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("❌ Xuất Excel lỗi:", error);
            alert("Không thể xuất dữ liệu từ máy chủ.");
        }
    };

    const downloadChart = async () => {
        try {
            const chartContainer = document.createElement("div");
            chartContainer.style.backgroundColor = "white";
            chartContainer.style.padding = "20px";

            // Set width cho container
            chartContainer.style.width = "800px"; // Đặt chiều rộng cố định
            chartContainer.style.margin = "0 auto";

            // Tạo và thêm phần tiêu đề
            const titleDiv = document.createElement("div");
            titleDiv.style.width = "100%";
            titleDiv.style.textAlign = "center";
            titleDiv.style.marginBottom = "20px";
            titleDiv.innerHTML = `
                <h5 style="font-weight: bold; margin-bottom: 8px; font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    🧂 Diễn biến độ mặn - ${displayStationName}
                </h5>
                ${
                    startDate && endDate
                        ? `
                    <div style="color: #6c757d; font-size: 14px">
                        📅 Từ <strong>${startDate}</strong> đến <strong>${endDate}</strong>
                    </div>
                `
                        : ""
                }
            `;
            chartContainer.appendChild(titleDiv);

            // Sao chép phần biểu đồ
            const chartElement = document.getElementById("salinity-chart");
            if (!chartElement) {
                alert("Không thể tìm thấy biểu đồ để tải xuống");
                return;
            }
            const chartClone = chartElement.cloneNode(true);
            chartContainer.appendChild(chartClone);

            // Thêm container tạm thời vào document
            document.body.appendChild(chartContainer);

            // Chuyển thành canvas và tải xuống
            const canvas = await html2canvas(chartContainer, {
                backgroundColor: "#ffffff",
                scale: 2, // Tăng độ phân giải
            });

            // Xóa container tạm
            document.body.removeChild(chartContainer);

            const url = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = url;
            link.download = `bieu_do_do_man_${filenameSafeName}_${new Date().getTime()}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("❌ Tải ảnh biểu đồ lỗi:", error);
            alert("Không thể tải ảnh biểu đồ.");
        }
    };

    // Dữ liệu đã được lọc bỏ các giá trị NULL từ useEffect
    const startDate = data?.length > 0 ? new Date(data[0].date).toLocaleDateString("vi-VN") : null;
    const endDate =
        data?.length > 0 ? new Date(data[data.length - 1].date).toLocaleDateString("vi-VN") : null;

    return (
        <div
            className={`modal fade ${show ? "show d-block" : ""}`}
            tabIndex="-1"
            style={{ backgroundColor: show ? "rgba(0,0,0,0.5)" : "transparent" }}
        >
            <div
                className="modal-dialog modal-xl modal-dialog-centered"
                style={{ maxWidth: "95%", height: "90vh" }}
            >
                <div className="modal-content" style={{ height: "100%" }}>
                    <div className="modal-header border-0 pb-0">
                        <div className="w-100 text-center">
                            <h5 className="modal-title mb-1 fw-bold">
                                🧂 Diễn biến độ mặn - {displayStationName}
                            </h5>
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
                                    id="chart-tab"
                                    data-bs-toggle="tab"
                                    data-bs-target="#chart"
                                    type="button"
                                >
                                    Biểu đồ
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className="nav-link"
                                    id="export-tab"
                                    data-bs-toggle="tab"
                                    data-bs-target="#export"
                                    type="button"
                                >
                                    Số liệu
                                </button>
                            </li>
                        </ul>

                        <div className="tab-content">
                            <div className="tab-pane fade show active" id="chart">
                                {data.length > 0 ? (
                                    <>
                                        <div id="salinity-chart">
                                            <SalinityBarChart data={data} height={450} />
                                        </div>
                                        <div className="mt-3 d-flex justify-content-between align-items-center">
                                            <div className="text-muted small">
                                                Hiển thị: <strong>{data.length}</strong> ngày có dữ liệu hợp
                                                lệ
                                            </div>
                                            <button className="btn btn-primary" onClick={downloadChart}>
                                                📸 Tải ảnh biểu đồ
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-muted">Không có dữ liệu hợp lệ.</p>
                                )}
                            </div>

                            <div className="tab-pane fade" id="export">
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
                                                        className="badge rounded-pill"
                                                        style={{ backgroundColor: "#28a745", color: "white" }}
                                                    >
                                                        Bình thường
                                                    </span>
                                                    <div className="text-muted">{"< 1‰"}</div>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <span
                                                        className="badge rounded-pill"
                                                        style={{ backgroundColor: "#ffc107", color: "black" }}
                                                    >
                                                        Rủi ro cấp 1
                                                    </span>
                                                    <div className="text-muted">Nhà Bè: 1-4‰</div>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <span
                                                        className="badge rounded-pill"
                                                        style={{ backgroundColor: "#ff8c00", color: "white" }}
                                                    >
                                                        Rủi ro cấp 2
                                                    </span>
                                                    <div className="text-muted">
                                                        Nhà Bè {"> 4‰"}, khác 1-4‰
                                                    </div>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <span
                                                        className="badge rounded-pill"
                                                        style={{ backgroundColor: "#dc3545", color: "white" }}
                                                    >
                                                        Rủi ro cấp 3
                                                    </span>
                                                    <div className="text-muted">Các điểm {"> 4‰"}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <h6 className="mb-3">Chọn khoảng thời gian xuất dữ liệu:</h6>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label">Từ ngày:</label>
                                                    <input
                                                        type="date"
                                                        className="form-control"
                                                        name="startDate"
                                                        value={exportRange.startDate}
                                                        onChange={handleDateRangeChange}
                                                    />
                                                </div>
                                                <div className="col-md-6">
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

                                        <ExportPreviewTable
                                            data={filteredData.length > 0 ? filteredData : data}
                                        />

                                        <div className="d-flex gap-2 justify-content-between align-items-center">
                                            <div className="text-muted small">
                                                {filteredData.length > 0
                                                    ? `Hiển thị ${filteredData.length} bản ghi`
                                                    : `Tổng số ${data.length} bản ghi`}
                                            </div>
                                            <button
                                                className="btn btn-success"
                                                onClick={handleExportExcel}
                                                disabled={!exportRange.startDate || !exportRange.endDate}
                                            >
                                                📥 Tải Excel
                                            </button>
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

export default SaltChartFull;
