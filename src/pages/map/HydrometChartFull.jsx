import React, { useEffect, useState } from "react";
import axiosInstance from "@config/axios-config";
import HydrometBarChart from "@pages/map/HydrometBarChart";
import html2canvas from "html2canvas";
import { getDisplayStationName, getFilenameSafeStationName } from "@common/stationMapping";
import "@styles/components/_hydrometChart.scss";

const ExportPreviewTable = ({ data }) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    const sortedData = React.useMemo(() => {
        if (!sortConfig.key) return data;

        const sorted = [...data].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            if (sortConfig.key === "date" || sortConfig.key === "Ngày") {
                // Handle Vietnamese date format for sorting
                const parseDate = (dateStr) => {
                    if (typeof dateStr === "string" && dateStr.includes("/")) {
                        const [day, month, year] = dateStr.split("/");
                        return new Date(year, month - 1, day);
                    }
                    return new Date(dateStr);
                };
                aValue = parseDate(aValue);
                bValue = parseDate(bValue);
            } else {
                aValue = Number(aValue) || 0;
                bValue = Number(bValue) || 0;
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

    // Get all non-date columns for display
    const getDataColumns = () => {
        if (data.length === 0) return [];
        const sampleRow = data[0];
        return Object.keys(sampleRow).filter(
            (key) =>
                key !== "date" &&
                key !== "Ngày" &&
                sampleRow[key] !== null &&
                sampleRow[key] !== undefined &&
                sampleRow[key] !== "",
        );
    };

    const columns = getDataColumns();

    // Get parameter info for display
    const getParamInfo = (paramKey) => {
        const paramMap = {
            // Rainfall parameters
            R_AP: { label: "Mưa An Phú", unit: "mm" },
            R_BC: { label: "Mưa Bình Chánh", unit: "mm" },
            R_CG: { label: "Mưa Cần Giờ", unit: "mm" },
            R_CL: { label: "Mưa Cát Lái", unit: "mm" },
            R_CC: { label: "Mưa Củ Chi", unit: "mm" },
            R_HM: { label: "Mưa Hóc Môn", unit: "mm" },
            R_LMX: { label: "Mưa Lê Minh Xuân", unit: "mm" },
            R_LS: { label: "Mưa Long Sơn", unit: "mm" },
            R_MDC: { label: "Mưa Mạc Đĩnh Chi", unit: "mm" },
            R_NB: { label: "Mưa Nhà Bè", unit: "mm" },
            R_PVC: { label: "Mưa Phạm Văn Cội", unit: "mm" },
            R_TTH: { label: "Mưa Tam Thôn Hiệp", unit: "mm" },
            R_TD: { label: "Mưa Thủ Đức", unit: "mm" },
            R_TSH: { label: "Mưa Tân Sơn Hòa", unit: "mm" },

            // Temperature parameters (Tân Sơn Hòa station - NB_KT)
            Ttb_TSH: { label: "Nhiệt độ TB Tân Sơn Hòa", unit: "°C" },
            Tx_TSH: { label: "Nhiệt độ Max Tân Sơn Hòa", unit: "°C" },
            Tm_TSH: { label: "Nhiệt độ Min Tân Sơn Hòa", unit: "°C" },

            // Water level parameters (Nhà Bè station - NB_TV: Thủy văn, mực nước 24/24)
            Htb_NB: { label: "Mực nước TB Nhà Bè", unit: "cm" },
            Hx_NB: { label: "Mực nước Max Nhà Bè", unit: "cm" },
            Hm_NB: { label: "Mực nước Min Nhà Bè", unit: "cm" },
            Htb_PA: { label: "Mực nước TB Phú An", unit: "cm" },
            Hx_PA: { label: "Mực nước Max Phú An", unit: "cm" },
            Hm_PA: { label: "Mực nước Min Phú An", unit: "cm" },
        };

        return paramMap[paramKey] || { label: paramKey, unit: "" };
    };

    return (
        <div className="table-responsive mb-3" style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <table className="table table-bordered table-sm table-striped">
                <thead className="table-light sticky-top">
                    <tr>
                        <th style={{ width: "60px" }}>#</th>
                        <th
                            style={{ cursor: "pointer", userSelect: "none", minWidth: 120 }}
                            onClick={() => handleSort(data[0]?.date ? "date" : "Ngày")}
                        >
                            <div className="d-flex align-items-center justify-content-between">
                                <span>📅 Ngày</span>
                                {getSortIcon(data[0]?.date ? "date" : "Ngày")}
                            </div>
                        </th>
                        {columns.map((col) => {
                            const paramInfo = getParamInfo(col);
                            return (
                                <th
                                    key={col}
                                    style={{ cursor: "pointer", userSelect: "none", minWidth: 140 }}
                                    onClick={() => handleSort(col)}
                                >
                                    <div className="d-flex align-items-center justify-content-between">
                                        <span title={col}>
                                            {paramInfo.label} ({paramInfo.unit})
                                        </span>
                                        {getSortIcon(col)}
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((item, idx) => (
                        <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td>{item.date || item.Ngày}</td>
                            {columns.map((col) => (
                                <td key={col} className="text-end">
                                    {item[col] !== null && item[col] !== undefined && item[col] !== ""
                                        ? Number(item[col]).toFixed(2)
                                        : "-"}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const HydrometChartFull = ({ show, kiHieu, TenTam, hydrometData, onClose }) => {
    // Get display name for the station using utility function
    const displayStationName = getDisplayStationName(TenTam, kiHieu);
    const filenameSafeName = getFilenameSafeStationName(displayStationName);

    const [data, setData] = useState([]);
    const [filteredChartData, setFilteredChartData] = useState([]);
    const [chartDateRange, setChartDateRange] = useState({
        startDate: "",
        endDate: "",
    });
    const [exportRange, setExportRange] = useState({
        startDate: "",
        endDate: "",
    });
    const [filteredData, setFilteredData] = useState([]);
    const [presetRange, setPresetRange] = useState("all");

    // Helper function to convert Vietnamese date format to ISO
    const convertVietnameseDateToISO = (dateStr) => {
        if (typeof dateStr === "string" && dateStr.includes("/")) {
            const [day, month, year] = dateStr.split("/");
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
        return dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    };

    useEffect(() => {
        if (show && hydrometData) {
            // Filter out invalid data
            const validHydrometData = hydrometData.filter((item) => {
                const dateKey = item.date || item.Ngày;
                return dateKey && dateKey !== null && dateKey !== "";
            });

            setData(validHydrometData);
            setFilteredChartData(validHydrometData);

            if (validHydrometData.length > 0) {
                const firstDate = validHydrometData[0].date || validHydrometData[0].Ngày;
                const lastDate =
                    validHydrometData[validHydrometData.length - 1].date ||
                    validHydrometData[validHydrometData.length - 1].Ngày;

                const startDateISO = firstDate.includes("/")
                    ? convertVietnameseDateToISO(firstDate)
                    : firstDate.split("T")[0];
                const endDateISO = lastDate.includes("/")
                    ? convertVietnameseDateToISO(lastDate)
                    : lastDate.split("T")[0];

                setChartDateRange({
                    startDate: startDateISO,
                    endDate: endDateISO,
                });

                setExportRange({
                    startDate: startDateISO,
                    endDate: endDateISO,
                });
            }
        } else {
            setData([]);
            setFilteredChartData([]);
            setChartDateRange({ startDate: "", endDate: "" });
            setExportRange({ startDate: "", endDate: "" });
        }
    }, [show, hydrometData]);

    useEffect(() => {
        if (!show) {
            setData([]);
            setFilteredChartData([]);
        }
    }, [show]);

    // Function to filter chart data based on date range
    const filterChartData = (startDate, endDate) => {
        if (!startDate || !endDate || !data.length) {
            setFilteredChartData(data);
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        const filtered = data.filter((item) => {
            const dateValue = item.date || item.Ngày;
            let itemDate;

            // Handle Vietnamese date format (dd/MM/yyyy)
            if (typeof dateValue === "string" && dateValue.includes("/")) {
                const [day, month, year] = dateValue.split("/");
                itemDate = new Date(year, month - 1, day);
            } else {
                itemDate = new Date(dateValue);
            }

            return itemDate >= start && itemDate <= end;
        });

        setFilteredChartData(filtered);
    };

    // Handle chart date range change
    const handleChartDateRangeChange = (e) => {
        const { name, value } = e.target;
        const newRange = {
            ...chartDateRange,
            [name]: value,
        };
        setChartDateRange(newRange);
        setPresetRange("custom");

        if (newRange.startDate && newRange.endDate) {
            filterChartData(newRange.startDate, newRange.endDate);
        }
    };

    // Handle preset range selection
    const handlePresetRange = (preset) => {
        setPresetRange(preset);

        if (!data.length) return;

        // Get the last date from actual data instead of today
        const getLastDataDate = () => {
            const lastItem = data[data.length - 1];
            const dateValue = lastItem.date || lastItem.Ngày;

            // Handle Vietnamese date format (dd/MM/yyyy)
            if (typeof dateValue === "string" && dateValue.includes("/")) {
                const [day, month, year] = dateValue.split("/");
                return new Date(year, month - 1, day);
            } else {
                return new Date(dateValue);
            }
        };

        const lastDataDate = getLastDataDate();
        let startDate, endDate;

        switch (preset) {
            case "1year":
                endDate = new Date(lastDataDate);
                startDate = new Date(lastDataDate);
                startDate.setFullYear(lastDataDate.getFullYear() - 1);
                break;
            case "all":
            default:
                setFilteredChartData(data);
                // Reset to full data range
                const firstItem = data[0];
                const firstDateValue = firstItem.date || firstItem.Ngày;
                const lastItem = data[data.length - 1];
                const lastDateValue = lastItem.date || lastItem.Ngày;

                setChartDateRange({
                    startDate: firstDateValue.includes("/")
                        ? convertVietnameseDateToISO(firstDateValue)
                        : firstDateValue.split("T")[0],
                    endDate: lastDateValue.includes("/")
                        ? convertVietnameseDateToISO(lastDateValue)
                        : lastDateValue.split("T")[0],
                });
                return;
        }

        const startDateStr = startDate.toISOString().split("T")[0];
        const endDateStr = endDate.toISOString().split("T")[0];

        setChartDateRange({
            startDate: startDateStr,
            endDate: endDateStr,
        });

        filterChartData(startDateStr, endDateStr);
    };

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
                const dateValue = item.date || item.Ngày;
                let itemDate;

                // Handle Vietnamese date format (dd/MM/yyyy)
                if (typeof dateValue === "string" && dateValue.includes("/")) {
                    const [day, month, year] = dateValue.split("/");
                    itemDate = new Date(year, month - 1, day);
                } else {
                    itemDate = new Date(dateValue);
                }

                return itemDate >= startDate && itemDate <= endDate;
            });
            setFilteredData(filtered);
        } else {
            setFilteredData(data);
        }
    };

    const downloadCSV = () => {
        if (!data.length) return;

        const dataToExport = filteredData.length > 0 ? filteredData : data;

        // Get all parameters for CSV headers
        const sampleRow = dataToExport[0];
        const parameters = Object.keys(sampleRow).filter(
            (key) =>
                key !== "date" &&
                key !== "Ngày" &&
                sampleRow[key] !== null &&
                sampleRow[key] !== undefined &&
                sampleRow[key] !== "",
        );

        // Create CSV headers with Vietnamese labels
        const getParamInfo = (paramKey) => {
            const paramMap = {
                R_AP: "Mưa An Phú (mm)",
                R_BC: "Mưa Bình Chánh (mm)",
                R_CG: "Mưa Cần Giờ (mm)",
                R_CL: "Mưa Cát Lái (mm)",
                R_CC: "Mưa Củ Chi (mm)",
                R_HM: "Mưa Hóc Môn (mm)",
                R_LMX: "Mưa Lê Minh Xuân (mm)",
                R_LS: "Mưa Long Sơn (mm)",
                R_MDC: "Mưa Mạc Đĩnh Chi (mm)",
                R_NB: "Mưa Nhà Bè (mm)",
                R_PVC: "Mưa Phạm Văn Cội (mm)",
                R_TTH: "Mưa Tam Thôn Hiệp (mm)",
                R_TD: "Mưa Thủ Đức (mm)",
                R_TSH: "Mưa Tân Sơn Hòa (mm)",
                Ttb_TSH: "Nhiệt độ TB (°C)",
                Tx_TSH: "Nhiệt độ Max (°C)",
                Tm_TSH: "Nhiệt độ Min (°C)",
                Htb_NB: "Mực nước TB Nhà Bè (cm)",
                Hx_NB: "Mực nước Max Nhà Bè (cm)",
                Hm_NB: "Mực nước Min Nhà Bè (cm)",
                Htb_PA: "Mực nước TB Phú An (cm)",
                Hx_PA: "Mực nước Max Phú An (cm)",
                Hm_PA: "Mực nước Min Phú An (cm)",
            };
            return paramMap[paramKey] || paramKey;
        };

        const headers = ["STT", "Ngày", ...parameters.map((p) => getParamInfo(p))];

        const csvContent = [
            headers.join(","),
            ...dataToExport.map((item, index) =>
                [
                    index + 1,
                    `"${item.date || item.Ngày}"`,
                    ...parameters.map((param) =>
                        item[param] !== null && item[param] !== undefined && item[param] !== ""
                            ? Number(item[param]).toFixed(4)
                            : "",
                    ),
                ].join(","),
            ),
        ].join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);

        const startDateStr = new Date(exportRange.startDate).toLocaleDateString("vi-VN").replace(/\//g, "-");
        const endDateStr = new Date(exportRange.endDate).toLocaleDateString("vi-VN").replace(/\//g, "-");

        link.download = `khituong_thuyvan_${filenameSafeName}_${startDateStr}_${endDateStr}.csv`;
        link.click();
    };

    const downloadChart = async () => {
        const chartElement = document.getElementById("hydromet-chart");
        if (chartElement) {
            try {
                const canvas = await html2canvas(chartElement, {
                    backgroundColor: "#ffffff",
                    scale: 2,
                    logging: false,
                });

                const link = document.createElement("a");
                link.download = `bieu_do_khituong_thuyvan_${filenameSafeName}_${new Date().getTime()}.png`;
                link.href = canvas.toDataURL();
                link.click();
            } catch (error) {
                console.error("Lỗi khi tải ảnh biểu đồ:", error);
            }
        }
    };

    if (!show) return null;

    // Helper function to format date for display
    const formatDateForDisplay = (dateValue) => {
        if (typeof dateValue === "string" && dateValue.includes("/")) {
            return dateValue; // Already in Vietnamese format
        }
        return new Date(dateValue).toLocaleDateString("vi-VN");
    };

    const startDate = data?.length > 0 ? formatDateForDisplay(data[0].date || data[0].Ngày) : null;
    const endDate =
        data?.length > 0
            ? formatDateForDisplay(data[data.length - 1].date || data[data.length - 1].Ngày)
            : null;

    return (
        <div
            className={`modal fade hydromet-chart-modal ${show ? "show d-block" : ""}`}
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
                                🌤️ Diễn biến khí tượng thủy văn - {displayStationName}
                            </h5>
                            {startDate && endDate && (
                                <div className="text-muted small">
                                    📅 Từ <strong>{startDate}</strong> đến <strong>{endDate}</strong>
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
                        {/* Date Range Filter for Chart */}
                        <div className="chart-filters mb-4 p-3 bg-light rounded">
                            <h6 className="mb-3 text-primary">
                                <i className="bi bi-calendar-range me-2"></i>
                                Lọc theo khoảng thời gian
                            </h6>

                            {/* Preset Range Buttons */}
                            <div className="preset-buttons mb-3">
                                <div className="btn-group flex-wrap" role="group">
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${presetRange === "all" ? "btn-primary" : "btn-outline-primary"}`}
                                        onClick={() => handlePresetRange("all")}
                                        title="Hiển thị toàn bộ dữ liệu có sẵn"
                                    >
                                        <i className="bi bi-collection me-1"></i>
                                        Tất cả
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${presetRange === "1year" ? "btn-primary" : "btn-outline-primary"}`}
                                        onClick={() => handlePresetRange("1year")}
                                        title="1 năm gần nhất kể từ ngày cuối cùng có dữ liệu"
                                    >
                                        <i className="bi bi-calendar-year me-1"></i>1 năm cuối
                                    </button>
                                </div>
                                <small className="text-muted d-block mt-2">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Chọn khoảng thời gian hiển thị dữ liệu trên biểu đồ
                                </small>
                            </div>

                            {/* Custom Date Range */}
                            <div className="custom-range">
                                <div className="row g-2 align-items-center">
                                    <div className="col-auto">
                                        <label className="form-label small fw-bold mb-0">Từ ngày:</label>
                                    </div>
                                    <div className="col-auto">
                                        <input
                                            type="date"
                                            className="form-control form-control-sm"
                                            name="startDate"
                                            value={chartDateRange.startDate}
                                            onChange={handleChartDateRangeChange}
                                            style={{ minWidth: "130px" }}
                                        />
                                    </div>
                                    <div className="col-auto">
                                        <label className="form-label small fw-bold mb-0">Đến ngày:</label>
                                    </div>
                                    <div className="col-auto">
                                        <input
                                            type="date"
                                            className="form-control form-control-sm"
                                            name="endDate"
                                            value={chartDateRange.endDate}
                                            onChange={handleChartDateRangeChange}
                                            style={{ minWidth: "130px" }}
                                        />
                                    </div>
                                    <div className="col-auto">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary btn-sm"
                                            onClick={() => {
                                                setPresetRange("all");
                                                setFilteredChartData(data);
                                                const firstDate = data[0]?.date || data[0]?.Ngày;
                                                const lastDate =
                                                    data[data.length - 1]?.date ||
                                                    data[data.length - 1]?.Ngày;
                                                if (firstDate && lastDate) {
                                                    setChartDateRange({
                                                        startDate: firstDate.includes("/")
                                                            ? convertVietnameseDateToISO(firstDate)
                                                            : firstDate.split("T")[0],
                                                        endDate: lastDate.includes("/")
                                                            ? convertVietnameseDateToISO(lastDate)
                                                            : lastDate.split("T")[0],
                                                    });
                                                }
                                            }}
                                        >
                                            <i className="bi bi-arrow-clockwise me-1"></i>
                                            Reset
                                        </button>
                                    </div>
                                </div>
                                <div className="row mt-2">
                                    <div className="col-12">
                                        <small className="text-muted">
                                            <i className="bi bi-info-circle me-1"></i>
                                            Hiển thị {filteredChartData.length} / {data.length} bản ghi
                                            {data.length > 0 && (
                                                <span className="ms-2">
                                                    | Dữ liệu từ{" "}
                                                    {(() => {
                                                        const firstItem = data[0];
                                                        const firstDate = firstItem.date || firstItem.Ngày;
                                                        return firstDate.includes("/")
                                                            ? firstDate
                                                            : new Date(firstDate).toLocaleDateString("vi-VN");
                                                    })()}{" "}
                                                    đến{" "}
                                                    {(() => {
                                                        const lastItem = data[data.length - 1];
                                                        const lastDate = lastItem.date || lastItem.Ngày;
                                                        return lastDate.includes("/")
                                                            ? lastDate
                                                            : new Date(lastDate).toLocaleDateString("vi-VN");
                                                    })()}
                                                </span>
                                            )}
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="tab-content">
                            <div className="tab-pane fade show active" id="chart">
                                {filteredChartData.length > 0 ? (
                                    <>
                                        <div id="hydromet-chart">
                                            <HydrometBarChart data={filteredChartData} height={500} />
                                        </div>
                                        <div className="export-actions mt-3 d-flex justify-content-between align-items-center">
                                            <div className="text-muted small">
                                                📊 Hiển thị: <strong>{filteredChartData.length}</strong> /{" "}
                                                <strong>{data.length}</strong> ngày có dữ liệu
                                            </div>
                                            <button className="btn btn-info" onClick={downloadChart}>
                                                📸 Tải ảnh biểu đồ
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="no-data-state">
                                        <i className="bi bi-bar-chart text-muted"></i>
                                        <h5>Không có dữ liệu trong khoảng thời gian đã chọn</h5>
                                        <p>
                                            Vui lòng chọn khoảng thời gian khác hoặc kiểm tra lại dữ liệu
                                            nguồn.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="tab-pane fade" id="export">
                                {data.length > 0 ? (
                                    <>
                                        <div className="mb-4">
                                            <h6 className="mb-3">📅 Chọn khoảng thời gian xuất dữ liệu:</h6>
                                            <div className="row g-3">
                                                <div className="col-md-6">
                                                    <label className="form-label">Từ ngày:</label>
                                                    <input
                                                        type="date"
                                                        className="form-control"
                                                        name="startDate"
                                                        value={exportRange.startDate}
                                                        onChange={handleDateRangeChange}
                                                        max={exportRange.endDate}
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
                                                        min={exportRange.startDate}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <h6 className="mb-2">📋 Dữ liệu xuất:</h6>
                                            <ExportPreviewTable
                                                data={filteredData.length > 0 ? filteredData : data}
                                            />
                                        </div>

                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className="text-muted small">
                                                📊 Số dòng xuất:{" "}
                                                <strong>
                                                    {(filteredData.length > 0 ? filteredData : data).length}
                                                </strong>
                                            </div>
                                            <button
                                                className="btn btn-success"
                                                onClick={downloadCSV}
                                                disabled={data.length === 0}
                                            >
                                                📥 Tải CSV
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-5">
                                        <div className="text-muted">
                                            <i className="fas fa-file-csv fa-3x mb-3 text-secondary"></i>
                                            <p>Không có dữ liệu để xuất.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HydrometChartFull;
