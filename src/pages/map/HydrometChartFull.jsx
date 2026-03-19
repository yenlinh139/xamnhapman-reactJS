import React, { useEffect, useState } from "react";
import axiosInstance from "@config/axios-config";
import HydrometBarChart from "@pages/map/HydrometBarChart";
import html2canvas from "html2canvas";
import { getDisplayStationName, getFilenameSafeStationName } from "@common/stationMapping";
import { useHydroSummary, useRainfallStats, useWaterLevelStats, useWeatherAlerts } from "@services/hydrometeorologyStatsService";
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
    const [statsDateRange, setStatsDateRange] = useState({
        startDate: '2022-09-01', // Tháng 9/2022 có dữ liệu
        endDate: '2022-09-30'    // End của data có sẵn
    });

    // Statistics hooks
    const { data: summaryStats, loading: summaryLoading } = useHydroSummary(statsDateRange.startDate, statsDateRange.endDate);
    const { data: rainfallStats, loading: rainfallLoading } = useRainfallStats({
        startDate: statsDateRange.startDate,
        endDate: statsDateRange.endDate,
        orderBy: 'total_desc'
    });
    const { data: waterStats, loading: waterLoading } = useWaterLevelStats({
        startDate: statsDateRange.startDate,
        endDate: statsDateRange.endDate,
        orderBy: 'avg_desc'
    });
    const { alerts: weatherAlerts, loading: alertsLoading } = useWeatherAlerts('all', 7);

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
                const lastDate = sortedData[sortedData.length - 1].date || sortedData[sortedData.length - 1].Ngày;

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

        const startDateStr = new Date(chartDateRange.startDate).toLocaleDateString("vi-VN").replace(/\//g, "-");
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
                const tempContainer = document.createElement('div');
                tempContainer.style.padding = '20px';
                tempContainer.style.backgroundColor = '#ffffff';
                tempContainer.style.fontFamily = 'Arial, sans-serif';
                
                // Clone the title
                const titleClone = titleElement ? titleElement.cloneNode(true) : null;
                if (titleClone) {
                    titleClone.style.textAlign = 'center';
                    titleClone.style.marginBottom = '20px';
                    titleClone.style.color = '#000';
                    tempContainer.appendChild(titleClone);
                }
                
                // Clone the chart
                const chartClone = chartElement.cloneNode(true);
                tempContainer.appendChild(chartClone);
                
                // Temporarily add to body (hidden)
                tempContainer.style.position = 'absolute';
                tempContainer.style.left = '-9999px';
                document.body.appendChild(tempContainer);

                const canvas = await html2canvas(tempContainer, {
                    backgroundColor: "#ffffff",
                    scale: 2,
                    logging: false,
                    width: tempContainer.scrollWidth,
                    height: tempContainer.scrollHeight
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

    const startDate = filteredChartData?.length > 0 ? formatDateForDisplay(filteredChartData[0].date || filteredChartData[0].Ngày) : null;
    const endDate =
        filteredChartData?.length > 0
            ? formatDateForDisplay(filteredChartData[filteredChartData.length - 1].date || filteredChartData[filteredChartData.length - 1].Ngày)
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
                        <div className="w-100 text-center" id="hydromet-chart-title">
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
                            </div>
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
                                    className={`nav-link ${activeTab === "stats" ? "active" : ""}`}
                                    id="nav-stats-tab"
                                    type="button"
                                    role="tab"
                                    aria-controls="stats"
                                    aria-selected={activeTab === "stats"}
                                    onClick={() => setActiveTab("stats")}
                                >
                                    📈 Thống kê
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

                        <div className="tab-content mt-3">
                            <div
                                className={`tab-pane fade ${activeTab === "chart" ? "show active" : ""}`}
                                id="chart"
                            >
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
                                            <button 
                                                className={`btn ${isLoggedIn ? 'btn-info' : 'btn-secondary'}`} 
                                                onClick={downloadChart}
                                                disabled={!isLoggedIn}
                                                title={!isLoggedIn ? "Bạn cần đăng nhập để tải xuống biểu đồ" : ""}
                                            >
                                                📸 {isLoggedIn ? "Tải ảnh biểu đồ" : "Đăng nhập để tải"}
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

                            {/* Statistics Tab */}
                            <div
                                className={`tab-pane fade ${activeTab === "stats" ? "show active" : ""}`}
                                id="stats"
                            >
                                {/* Date Range Filter for Stats */}
                                <div className="stats-filters mb-4 p-3 bg-light rounded">
                                    <h6 className="mb-3 text-primary">
                                        <i className="bi bi-calendar-range me-2"></i>
                                        Khoảng thời gian thống kê
                                    </h6>
                                    <div className="row g-2 align-items-center">
                                        <div className="col-auto">
                                            <label className="form-label small fw-bold mb-0">Từ ngày:</label>
                                        </div>
                                        <div className="col-auto">
                                            <input
                                                type="date"
                                                className="form-control form-control-sm"
                                                value={statsDateRange.startDate}
                                                onChange={(e) => setStatsDateRange(prev => ({...prev, startDate: e.target.value}))}
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
                                                value={statsDateRange.endDate}
                                                onChange={(e) => setStatsDateRange(prev => ({...prev, endDate: e.target.value}))}
                                                style={{ minWidth: "130px" }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Statistics Content */}
                                <div className="stats-content">
                                    {/* Summary Statistics */}
                                    {summaryLoading ? (
                                        <div className="text-center p-4">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Đang tải...</span>
                                            </div>
                                            <p className="mt-2 text-muted">Đang tải thống kê tổng quan...</p>
                                        </div>
                                    ) : summaryStats ? (
                                        <div className="summary-stats mb-4">
                                            <h6 className="text-primary mb-3">📊 Thống kê tổng quan</h6>
                                            <div className="row g-3">
                                                {summaryStats.summary && (
                                                    <div className="col-md-4">
                                                        <div className="card h-100">
                                                            <div className="card-body">
                                                                <h6 className="card-title">🏢 Hệ thống</h6>
                                                                <p className="card-text small mb-1">
                                                                    Tổng trạm: <strong>{summaryStats.summary.total_stations || 0}</strong>
                                                                </p>
                                                                <p className="card-text small mb-1">
                                                                    Dữ liệu KT: <strong>{summaryStats.summary.total_weather_records || 0}</strong>
                                                                </p>
                                                                <p className="card-text small mb-0">
                                                                    Dữ liệu TV: <strong>{summaryStats.summary.total_hydro_records || 0}</strong>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {summaryStats.weather && (
                                                    <div className="col-md-4">
                                                        <div className="card h-100">
                                                            <div className="card-body">
                                                                <h6 className="card-title">🌧️ Khí tượng</h6>
                                                                {summaryStats.weather.rainfall && (
                                                                    <>
                                                                        <p className="card-text small mb-1">
                                                                            Mưa TB: <strong>{summaryStats.weather.rainfall.average_total || 0}mm</strong>
                                                                        </p>
                                                                        <p className="card-text small mb-1">
                                                                            Mưa max: <strong>{summaryStats.weather.rainfall.maximum_total || 0}mm</strong>
                                                                        </p>
                                                                    </>
                                                                )}
                                                                {summaryStats.weather.temperature && (
                                                                    <p className="card-text small mb-0">
                                                                        Nhiệt độ TB: <strong>{summaryStats.weather.temperature.average || 0}°C</strong>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {summaryStats.hydrology && (
                                                    <div className="col-md-4">
                                                        <div className="card h-100">
                                                            <div className="card-body">
                                                                <h6 className="card-title">🌊 Thủy văn</h6>
                                                                {summaryStats.hydrology.water_level_nb && (
                                                                    <>
                                                                        <p className="card-text small mb-1">
                                                                            Nhà Bè TB: <strong>{summaryStats.hydrology.water_level_nb.average || 0}cm</strong>
                                                                        </p>
                                                                        <p className="card-text small mb-1">
                                                                            Nhà Bè Max: <strong>{summaryStats.hydrology.water_level_nb.maximum || 0}cm</strong>
                                                                        </p>
                                                                    </>
                                                                )}
                                                                {summaryStats.hydrology.water_level_pa && (
                                                                    <p className="card-text small mb-0">
                                                                        Phú An TB: <strong>{summaryStats.hydrology.water_level_pa.average || 0}cm</strong>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* Rainfall Statistics */}
                                    {rainfallLoading ? (
                                        <div className="text-center p-3">
                                            <div className="spinner-border text-info" role="status" style={{width: "1.5rem", height: "1.5rem"}}>
                                                <span className="visually-hidden">Đang tải...</span>
                                            </div>
                                            <p className="mt-2 text-muted small">Đang tải thống kê mưa...</p>
                                        </div>
                                    ) : rainfallStats && rainfallStats.length > 0 ? (
                                        <div className="rainfall-stats mb-4">
                                            <h6 className="text-primary mb-3">🌧️ Thống kê lượng mưa theo trạm</h6>
                                            <div className="table-responsive">
                                                <table className="table table-sm table-bordered">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th>Trạm</th>
                                                            <th>Tổng mưa (mm)</th>
                                                            <th>TB/ngày (mm)</th>
                                                            <th>Ngày mưa</th>
                                                            <th>Tỷ lệ (%)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rainfallStats.slice(0, 10).map((station, idx) => (
                                                            <tr key={idx}>
                                                                <td className="fw-bold">{station.station_name || station.tenTram}</td>
                                                                <td className="text-end">{parseFloat(station.total_rainfall || station.tongMua || 0).toFixed(1)}</td>
                                                                <td className="text-end">{parseFloat(station.avg_rainfall || station.muaTrungBinh || 0).toFixed(2)}</td>
                                                                <td className="text-end">{station.rainy_days || station.ngayMua || 0}</td>
                                                                <td className="text-end">{parseFloat(station.rainy_days_percentage || station.phanTramNgayMua || 0).toFixed(1)}%</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* Water Level Statistics */}
                                    {waterLoading ? (
                                        <div className="text-center p-3">
                                            <div className="spinner-border text-success" role="status" style={{width: "1.5rem", height: "1.5rem"}}>
                                                <span className="visually-hidden">Đang tải...</span>
                                            </div>
                                            <p className="mt-2 text-muted small">Đang tải thống kê mực nước...</p>
                                        </div>
                                    ) : waterStats && waterStats.length > 0 ? (
                                        <div className="water-stats mb-4">
                                            <h6 className="text-primary mb-3">🌊 Thống kê mực nước theo trạm</h6>
                                            <div className="table-responsive">
                                                <table className="table table-sm table-bordered">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th>Trạm</th>
                                                            <th>TB (cm)</th>
                                                            <th>Max (cm)</th>
                                                            <th>Min (cm)</th>
                                                            <th>Biên độ (cm)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {waterStats.slice(0, 10).map((station, idx) => {
                                                            const avg = parseFloat(station.avg_water_level || station.mucNuocTB || 0);
                                                            const max = parseFloat(station.max_water_level || station.mucNuocMax || 0);
                                                            const min = parseFloat(station.min_water_level || station.mucNuocMin || 0);
                                                            const range = max - min;
                                                            
                                                            return (
                                                                <tr key={idx}>
                                                                    <td className="fw-bold">{station.station_name || station.tenTram}</td>
                                                                    <td className="text-end">{avg.toFixed(1)}</td>
                                                                    <td className="text-end">{max.toFixed(1)}</td>
                                                                    <td className="text-end">{min.toFixed(1)}</td>
                                                                    <td className="text-end">{range.toFixed(1)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* Weather Alerts */}
                                    {alertsLoading ? (
                                        <div className="text-center p-3">
                                            <div className="spinner-border text-warning" role="status" style={{width: "1.5rem", height: "1.5rem"}}>
                                                <span className="visually-hidden">Đang tải...</span>
                                            </div>
                                            <p className="mt-2 text-muted small">Đang tải cảnh báo...</p>
                                        </div>
                                    ) : weatherAlerts && weatherAlerts.length > 0 ? (
                                        <div className="weather-alerts">
                                            <h6 className="text-primary mb-3">⚠️ Cảnh báo gần đây (7 ngày)</h6>
                                            <div className="alerts-list">
                                                {weatherAlerts.slice(0, 5).map((alert, idx) => (
                                                    <div key={idx} className="alert alert-warning alert-dismissible fade show" role="alert">
                                                        <div className="d-flex justify-content-between">
                                                            <div>
                                                                <strong>{alert.alert_description || alert.description}</strong>
                                                                <p className="mb-1 small">
                                                                    {alert.value} {alert.unit} - {alert.category}
                                                                    {alert.station_name && ` tại ${alert.station_name}`}
                                                                </p>
                                                                <p className="mb-0 small text-muted">
                                                                    {alert.alert_date ? new Date(alert.alert_date).toLocaleDateString('vi-VN') : 'N/A'}
                                                                </p>
                                                            </div>
                                                            <span className={`badge ${
                                                                alert.severity === 'critical' ? 'bg-danger' :
                                                                alert.severity === 'high' ? 'bg-warning' : 'bg-info'
                                                            }`}>
                                                                {alert.severity === 'critical' ? 'Nghiêm trọng' :
                                                                alert.severity === 'high' ? 'Cao' : 'Trung bình'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {weatherAlerts.length === 0 && (
                                                    <div className="alert alert-success" role="alert">
                                                        ✅ Không có cảnh báo nào trong 7 ngày qua
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="no-alerts text-center p-4">
                                            <div className="text-success mb-2">
                                                <i className="bi bi-check-circle" style={{fontSize: "2rem"}}></i>
                                            </div>
                                            <h6 className="text-success">✅ Không có cảnh báo</h6>
                                            <p className="text-muted small">Hệ thống hoạt động bình thường trong 7 ngày qua</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div
                                className={`tab-pane fade ${activeTab === "export" ? "show active" : ""}`}
                                id="export"
                            >
                                {data.length > 0 ? (
                                    <>
                                        <div className="mb-3">
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
                                                className={`btn ${isLoggedIn ? 'btn-success' : 'btn-secondary'}`}
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
