import React, { useEffect, useState } from "react";
import axiosInstance from "@config/axios-config";
import HydrometBarChart from "@pages/map/HydrometBarChart";
import html2canvas from "html2canvas";
import { getDisplayStationName, getFilenameSafeStationName } from "@common/stationMapping";
import "@styles/components/_hydrometChart.scss";

const ExportPreviewTable = ({ data }) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    const sortedData = React.useMemo(() => {
        const dateKey = data[0]?.date ? "date" : "Ngày";
        const effectiveSort = sortConfig.key ? sortConfig : { key: dateKey, direction: "desc" };

        const sorted = [...data].sort((a, b) => {
            let aValue = a[effectiveSort.key];
            let bValue = b[effectiveSort.key];

            if (effectiveSort.key === "date" || effectiveSort.key === "Ngày") {
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
                return effectiveSort.direction === "asc" ? -1 : 1;
            }
            if (aValue > bValue) {
                return effectiveSort.direction === "asc" ? 1 : -1;
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

        const allKeys = new Set();
        data.forEach((row) => {
            Object.keys(row || {}).forEach((key) => {
                if (key === "date" || key === "Ngày") return;
                const value = row[key];
                if (value !== null && value !== undefined && value !== "" && value !== "NULL") {
                    allKeys.add(key);
                }
            });
        });

        return Array.from(allKeys);
    };

    const columns = getDataColumns();

    // Get parameter info for display
    const getParamInfo = (paramKey) => {
        const paramMap = {
            // Rainfall parameters - all stations
            R_AP: { label: "Lượng mưa", unit: "mm" },
            R_BC: { label: "Lượng mưa", unit: "mm" },
            R_CG: { label: "Lượng mưa", unit: "mm" },
            R_CL: { label: "Lượng mưa", unit: "mm" },
            R_CC: { label: "Lượng mưa", unit: "mm" },
            R_HM: { label: "Lượng mưa", unit: "mm" },
            R_LMX: { label: "Lượng mưa", unit: "mm" },
            R_LS: { label: "Lượng mưa", unit: "mm" },
            R_MDC: { label: "Lượng mưa", unit: "mm" },
            R_NB: { label: "Lượng mưa", unit: "mm" },
            R_PVC: { label: "Lượng mưa", unit: "mm" },
            R_TTH: { label: "Lượng mưa", unit: "mm" },
            R_TD: { label: "Lượng mưa", unit: "mm" },
            R_TSH: { label: "Lượng mưa", unit: "mm" },

            // Temperature parameters - Tân Sơn Hòa station
            Ttb_TSH: { label: "Nhiệt độ không khí trung bình", unit: "°C" },
            Tx_TSH: { label: "Nhiệt độ không khí cao nhất", unit: "°C" },
            Tm_TSH: { label: "Nhiệt độ không khí thấp nhất", unit: "°C" },

            // Water level parameters - Nhà Bè station
            Htb_NB: { label: "Mực nước trung bình", unit: "cm" },
            Hx_NB: { label: "Mực nước cao nhất", unit: "cm" },
            Hm_NB: { label: "Mực nước thấp nhất", unit: "cm" },

            // Water level parameters - Phú An station
            Htb_PA: { label: "Mực nước trung bình", unit: "cm" },
            Hx_PA: { label: "Mực nước cao nhất", unit: "cm" },
            Hm_PA: { label: "Mực nước thấp nhất", unit: "cm" },
        };

        return paramMap[paramKey] || { label: paramKey, unit: "" };
    };

    return (
        <div
            className="table-responsive mb-3 map-data-table-wrap"
            style={{ maxHeight: "80vh", overflowY: "auto" }}
        >
            <table className="table table-bordered table-sm table-striped map-data-table">
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
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("access_token");

    // Get display name for the station using utility function
    const displayStationName = getDisplayStationName(TenTam, kiHieu);
    const filenameSafeName = getFilenameSafeStationName(displayStationName);

    const [data, setData] = useState([]);
    const [filteredChartData, setFilteredChartData] = useState([]);

    const [chartDateRange, setChartDateRange] = useState({
        startDate: "",
        endDate: "",
    });
    const [filteredData, setFilteredData] = useState([]);
    const [presetRange, setPresetRange] = useState("all");
    const [activeTab, setActiveTab] = useState("chart");

    // Helper function to convert date format to ISO (handle both DD/MM/YYYY and MM/DD/YYYY)
    const convertVietnameseDateToISO = (dateStr) => {
        if (typeof dateStr === "string" && dateStr.includes("/")) {
            const parts = dateStr.split("/");

            if (parts.length === 3) {
                const [first, second, year] = parts;

                // Detect format based on values (MM/DD/YYYY is common from API)
                let month, day;
                if (parseInt(first) <= 12 && parseInt(second) <= 31) {
                    // Likely MM/DD/YYYY format
                    month = first;
                    day = second;
                } else if (parseInt(second) <= 12 && parseInt(first) <= 31) {
                    // Likely DD/MM/YYYY format
                    day = first;
                    month = second;
                } else {
                    // Default to MM/DD/YYYY if ambiguous
                    month = first;
                    day = second;
                }

                return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            }
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

            // Sort data by date (oldest to newest)
            const sortedData = validHydrometData.sort((a, b) => {
                const dateA = a.date || a.Ngày;
                const dateB = b.date || b.Ngày;

                // Convert dates to comparable format
                const parseDate = (dateStr) => {
                    if (dateStr.includes("/")) {
                        return new Date(convertVietnameseDateToISO(dateStr));
                    }
                    return new Date(dateStr);
                };

                return parseDate(dateA) - parseDate(dateB);
            });

            setData(sortedData);
            setFilteredChartData(sortedData);
            setFilteredData(sortedData);

            if (sortedData.length > 0) {
                // Get actual first (earliest) and last (latest) dates
                const firstDate = sortedData[0].date || sortedData[0].Ngày;
                const lastDate =
                    sortedData[sortedData.length - 1].date || sortedData[sortedData.length - 1].Ngày;

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
            }
        } else {
            setData([]);
            setFilteredChartData([]);
            setFilteredData([]);
            setChartDateRange({ startDate: "", endDate: "" });
        }
    }, [show, hydrometData]);

    useEffect(() => {
        if (!show) {
            setData([]);
            setFilteredChartData([]);
            setFilteredData([]);
        }
    }, [show]);

    // Function to filter chart data based on date range
    const filterChartData = (startDate, endDate) => {
        if (!startDate || !endDate || !data.length) {
            setFilteredChartData(data);
            setFilteredData(data);
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
        setFilteredData(filtered);
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

            // Handle date format (including MM/DD/YYYY from API)
            if (typeof dateValue === "string" && dateValue.includes("/")) {
                const parts = dateValue.split("/");
                const [first, second, year] = parts;

                let month, day;
                if (parseInt(first) <= 12 && parseInt(second) <= 31) {
                    // MM/DD/YYYY format (common from API)
                    month = parseInt(first) - 1; // JS months are 0-based
                    day = parseInt(second);
                } else {
                    // DD/MM/YYYY format
                    day = parseInt(first);
                    month = parseInt(second) - 1;
                }

                return new Date(parseInt(year), month, day);
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
                setFilteredData(data);
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

    const downloadCSV = () => {
        if (!isLoggedIn) {
            alert("Bạn cần đăng nhập để tải xuống dữ liệu CSV");
            return;
        }

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
                // Rainfall parameters - all stations
                R_AP: "Lượng mưa (mm)",
                R_BC: "Lượng mưa (mm)",
                R_CG: "Lượng mưa (mm)",
                R_CL: "Lượng mưa (mm)",
                R_CC: "Lượng mưa (mm)",
                R_HM: "Lượng mưa (mm)",
                R_LMX: "Lượng mưa (mm)",
                R_LS: "Lượng mưa (mm)",
                R_MDC: "Lượng mưa (mm)",
                R_NB: "Lượng mưa (mm)",
                R_PVC: "Lượng mưa (mm)",
                R_TTH: "Lượng mưa (mm)",
                R_TSH: "Lượng mưa (mm)",
                R_TD: "Lượng mưa (mm)",

                // Temperature parameters - Tân Sơn Hòa station
                Ttb_TSH: "Nhiệt độ không khí trung bình (°C)",
                Tx_TSH: "Nhiệt độ không khí cao nhất (°C)",
                Tm_TSH: "Nhiệt độ không khí thấp nhất (°C)",

                // Water level parameters - Nhà Bè station
                Htb_NB: "Mực nước trung bình (cm)",
                Hx_NB: "Mực nước cao nhất (cm)",
                Hm_NB: "Mực nước thấp nhất (cm)",

                // Water level parameters - Phú An station
                Htb_PA: "Mực nước trung bình (cm)",
                Hx_PA: "Mực nước cao nhất (cm)",
                Hm_PA: "Mực nước thấp nhất (cm)",
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

        const startDateStr = new Date(chartDateRange.startDate)
            .toLocaleDateString("vi-VN")
            .replace(/\//g, "-");
        const endDateStr = new Date(chartDateRange.endDate).toLocaleDateString("vi-VN").replace(/\//g, "-");

        link.download = `khituong_thuyvan_${filenameSafeName}_${startDateStr}_${endDateStr}.csv`;
        link.click();
    };

    const downloadChart = async () => {
        if (!isLoggedIn) {
            alert("Bạn cần đăng nhập để tải xuống biểu đồ");
            return;
        }

        const chartElement = document.getElementById("hydromet-chart");
        const titleElement = document.getElementById("hydromet-chart-title");

        if (chartElement) {
            try {
                // Create a temporary container that includes both title and chart
                const tempContainer = document.createElement("div");
                tempContainer.style.padding = "20px";
                tempContainer.style.backgroundColor = "#ffffff";
                tempContainer.style.fontFamily = "Arial, sans-serif";

                // Clone the title
                const titleClone = titleElement ? titleElement.cloneNode(true) : null;
                if (titleClone) {
                    titleClone.style.textAlign = "center";
                    titleClone.style.marginBottom = "20px";
                    titleClone.style.color = "#000";
                    tempContainer.appendChild(titleClone);
                }

                // Clone the chart
                const chartClone = chartElement.cloneNode(true);
                tempContainer.appendChild(chartClone);

                // Temporarily add to body (hidden)
                tempContainer.style.position = "absolute";
                tempContainer.style.left = "-9999px";
                document.body.appendChild(tempContainer);

                const canvas = await html2canvas(tempContainer, {
                    backgroundColor: "#ffffff",
                    scale: 2,
                    logging: false,
                    width: tempContainer.scrollWidth,
                    height: tempContainer.scrollHeight,
                });

                // Remove temporary container
                document.body.removeChild(tempContainer);

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

    const startDate =
        filteredChartData?.length > 0
            ? formatDateForDisplay(filteredChartData[0].date || filteredChartData[0].Ngày)
            : null;
    const endDate =
        filteredChartData?.length > 0
            ? formatDateForDisplay(
                  filteredChartData[filteredChartData.length - 1].date ||
                      filteredChartData[filteredChartData.length - 1].Ngày,
              )
            : null;

    return (
        <div
            className={`modal fade map-data-modal hydromet-chart-modal ${show ? "show d-block" : ""}`}
            tabIndex="-1"
            style={{ backgroundColor: show ? "rgba(0,0,0,0.5)" : "transparent" }}
        >
            <div
                className="modal-dialog modal-xl modal-dialog-centered"
                style={{ maxWidth: "96%", height: "94vh" }}
            >
                <div className="modal-content" style={{ height: "100%" }}>
                    <div className="modal-header border-0 py-2">
                        <div className="w-100 text-center" id="hydromet-chart-title">
                            <h5 className="modal-title mb-1 fw-bold">
                                Diễn biến khí tượng thủy văn - {displayStationName}
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
                        <div className="hydromet-compact-toolbar mb-2">
                            <span className="toolbar-label">Chọn giai đoạn</span>
                            <label className="toolbar-field">
                                <span>Từ</span>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    name="startDate"
                                    value={chartDateRange.startDate}
                                    onChange={handleChartDateRangeChange}
                                />
                            </label>
                            <label className="toolbar-field">
                                <span>Đến</span>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    name="endDate"
                                    value={chartDateRange.endDate}
                                    onChange={handleChartDateRangeChange}
                                />
                            </label>
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => {
                                    setPresetRange("all");
                                    setFilteredChartData(data);
                                    const firstDate = data[0]?.date || data[0]?.Ngày;
                                    const lastDate =
                                        data[data.length - 1]?.date || data[data.length - 1]?.Ngày;
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
                                Reset
                            </button>
                        </div>

                        {/* Tab Navigation */}
                        <nav>
                            <div className="nav nav-tabs" id="nav-tab" role="tablist">
                                <button
                                    className={`nav-link ${activeTab === "chart" ? "active" : ""}`}
                                    id="nav-chart-tab"
                                    type="button"
                                    role="tab"
                                    aria-controls="chart"
                                    aria-selected={activeTab === "chart"}
                                    onClick={() => setActiveTab("chart")}
                                >
                                    📊 Biểu đồ
                                </button>
                                <button
                                    className={`nav-link ${activeTab === "export" ? "active" : ""}`}
                                    id="nav-export-tab"
                                    type="button"
                                    role="tab"
                                    aria-controls="export"
                                    aria-selected={activeTab === "export"}
                                    onClick={() => setActiveTab("export")}
                                >
                                    📋 Số liệu
                                </button>
                            </div>
                        </nav>

                        <div className="tab-content mt-2">
                            <div
                                className={`tab-pane fade ${activeTab === "chart" ? "show active" : ""}`}
                                id="chart"
                            >
                                {filteredChartData.length > 0 ? (
                                    <div className="map-chart-pane hydromet-pane">
                                        <div id="hydromet-chart" className="map-chart-box hydromet-chart-box">
                                            <HydrometBarChart data={filteredChartData} height="100%" />
                                        </div>
                                        <div className="map-chart-footer export-actions mt-3 d-flex justify-content-between align-items-center">
                                            <div className="text-muted small">
                                                📊 Hiển thị: <strong>{filteredChartData.length}</strong> /{" "}
                                                <strong>{data.length}</strong> ngày có dữ liệu
                                            </div>
                                            <button
                                                className={`btn ${isLoggedIn ? "btn-info" : "btn-secondary"}`}
                                                onClick={downloadChart}
                                                disabled={!isLoggedIn}
                                                title={
                                                    !isLoggedIn
                                                        ? "Bạn cần đăng nhập để tải xuống biểu đồ"
                                                        : ""
                                                }
                                            >
                                                {isLoggedIn ? "Tải ảnh biểu đồ" : "Đăng nhập để tải"}
                                            </button>
                                        </div>
                                    </div>
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

                            <div
                                className={`tab-pane fade ${activeTab === "export" ? "show active" : ""}`}
                                id="export"
                            >
                                {data.length > 0 ? (
                                    <>
                                        <div className="map-data-scroll mb-2">
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
                                                className={`btn ${isLoggedIn ? "btn-success" : "btn-secondary"}`}
                                                onClick={downloadCSV}
                                                disabled={data.length === 0 || !isLoggedIn}
                                                title={!isLoggedIn ? "Bạn cần đăng nhập để xuất dữ liệu" : ""}
                                            >
                                                📥 {isLoggedIn ? "Xuất dữ liệu" : "Đăng nhập để xuất"}
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
