import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Header from "@pages/themes/headers/Header";
import Footer from "@pages/themes/footer/Footer";
import Loading from "@components/Loading";
import axiosInstance from "@config/axios-config";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import { getSalinityClass } from "@common/salinityClassification";
import "@styles/components/_salinityReport.scss";
import { ToastCommon } from "@components/ToastCommon";
import { TOAST } from "@common/constants";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Custom plugin for station labels
const stationLabelsPlugin = {
    id: "stationLabels",
    afterDatasetsDraw: function (chart) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (!meta.hidden) {
                meta.data.forEach((bar, index) => {
                    const stationName = dataset.label;
                    const value = dataset.data[index];

                    // Only draw if bar has value > 0
                    if (value > 0) {
                        const x = bar.x;
                        const y = bar.y - 20; // Position higher above the bar

                        ctx.save();
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillStyle = "#1a202c";
                        ctx.font = "bold 9px Arial, sans-serif";

                        // Measure text for background
                        const textWidth = ctx.measureText(stationName).width;
                        const textHeight = 12;
                        const padding = 3;

                        // Draw white background
                        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
                        ctx.fillRect(
                            x - textWidth / 2 - padding,
                            y - textHeight / 2 - padding / 2,
                            textWidth + padding * 2,
                            textHeight + padding,
                        );

                        // Draw border
                        ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
                        ctx.lineWidth = 1;
                        ctx.strokeRect(
                            x - textWidth / 2 - padding,
                            y - textHeight / 2 - padding / 2,
                            textWidth + padding * 2,
                            textHeight + padding,
                        );

                        // Draw station name text
                        ctx.fillStyle = "#1a202c";
                        ctx.fillText(stationName, x, y);

                        ctx.restore();
                    }
                });
            }
        });
    },
};

// Register the custom plugin
ChartJS.register(stationLabelsPlugin);

// Station locations data for appendix
const STATION_LOCATIONS = [
    {
        id: 1,
        name: "Mũi Nhà Bè",
        location: "Tại mũi Nhà Bè, phà Bình Khánh, trên sông Sài Gòn",
        coordinates: { x: "681344.0", y: "1176921.0" },
    },
    {
        id: 2,
        name: "Phà Cát Lái",
        location: "Tại bến phà Cát Lái, sông Đồng Nai",
        coordinates: { x: "692700.0", y: "1181189.0" },
    },
    {
        id: 3,
        name: "Cầu Thủ Thiêm",
        location: "Tại cầu Thủ Thiêm, sông Sài Gòn",
        coordinates: { x: "676122.0", y: "1184199.0" },
    },
    {
        id: 4,
        name: "Cầu Ông Thìn",
        location: "Tại cầu Ông Thìn, sông Cần Giuộc",
        coordinates: { x: "661978.71", y: "1189011.92" },
    },
    {
        id: 5,
        name: "Cống Kênh C",
        location: "Tại cầu Chợ Đệm, sông Chợ Đệm",
        coordinates: { x: "696146.0", y: "1189993.0" },
    },
    {
        id: 6,
        name: "Kênh Xáng đứng 1",
        location: "Trên kênh Xáng đứng, gần UBND xã Bình Lợi, huyện Bình Chánh",
        coordinates: { x: "687636.0", y: "1195194.0" },
    },
    {
        id: 7,
        name: "Cầu Rạch Tra",
        location: "Tại cầu Rạch Tra, tiếp giáp 02 huyện Củ Chi và Hóc Môn",
        coordinates: { x: "679610.0", y: "1207751.0" },
    },
    {
        id: 8,
        name: "Kênh Xáng đứng 2",
        location: "Trên kênh Xáng đứng, cách cống An Hạ 1,0 km về phía Bình Lợi",
        coordinates: { x: "665207.0", y: "1192749.6" },
    },
];

const DEFAULT_REPORT_DATE = "2025-05-25";

const SalinityReport = () => {
    const { userInfo } = useSelector((state) => state.authStore);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [selectedDate, setSelectedDate] = useState(DEFAULT_REPORT_DATE);
    const [dateInputValue, setDateInputValue] = useState("25/05/2025");
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [generatingFrontendPDF, setGeneratingFrontendPDF] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    const reportStations = React.useMemo(() => {
        const salinityStations = Array.isArray(reportData?.stations) ? reportData.stations : [];
        const iotFallbackStations = Array.isArray(reportData?.iotStations) ? reportData.iotStations : [];
        return salinityStations.length > 0 ? salinityStations : iotFallbackStations;
    }, [reportData?.stations, reportData?.iotStations]);

    const isUsingIoTStations = React.useMemo(() => {
        const salinityStations = Array.isArray(reportData?.stations) ? reportData.stations : [];
        const iotFallbackStations = Array.isArray(reportData?.iotStations) ? reportData.iotStations : [];
        return salinityStations.length === 0 && iotFallbackStations.length > 0;
    }, [reportData?.stations, reportData?.iotStations]);

    const stationCountLabel = isUsingIoTStations ? "Trạm IoT" : "Điểm đo mặn";
    const stationNameLabel = isUsingIoTStations ? "Tên trạm IoT" : "Tên điểm đo mặn";

    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("access_token");

    const formatDateVietnamese = (dateString) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            if (Number.isNaN(date.getTime())) return "";

            const day = String(date.getDate()).padStart(2, "0");
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch (error) {
            console.error("Error formatting date:", error);
            return "";
        }
    };

    const normalizeDateInput = (value) => {
        const digits = String(value || "")
            .replace(/\D/g, "")
            .slice(0, 8);

        if (digits.length <= 2) return digits;
        if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    };

    const parseDisplayDateToIso = (value) => {
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null;

        const [day, month, year] = value.split("/");
        const isoDate = `${year}-${month}-${day}`;
        const parsedDate = new Date(isoDate);

        if (Number.isNaN(parsedDate.getTime())) return null;
        return isoDate;
    };

    // Load report data
    const loadReportData = async (date) => {
        try {
            setLoading(true);
            const response = await axiosInstance.get(`/salinity-report/${date}`);
            setReportData(response.data);
        } catch (error) {
            console.error("Error loading report data:", error);
            ToastCommon(TOAST.ERROR, "Không thể tải dữ liệu báo cáo");
        } finally {
            setLoading(false);
        }
    };

    // Generate PDF from frontend
    const generateFrontendPDF = async () => {
        // Check if user is logged in before generating PDF
        if (!isLoggedIn) {
            ToastCommon(TOAST.ERROR, "Bạn cần đăng nhập để xuất báo cáo PDF");
            return;
        }

        try {
            setGeneratingFrontendPDF(true);

            // Dynamically import html2pdf
            let html2pdf;
            try {
                html2pdf = (await import("html2pdf.js")).default;
            } catch (error) {
                console.error("Error importing html2pdf:", error);
                // Fallback to window.html2pdf if dynamic import fails
                if (window.html2pdf) {
                    html2pdf = window.html2pdf;
                } else {
                    throw new Error("html2pdf library not found");
                }
            }

            // Add print mode class to body
            document.body.classList.add("print-mode");

            // Get the content to convert to PDF
            const element = document.getElementById("pdf-content-wrapper");
            if (!element) {
                ToastCommon(TOAST.ERROR, "Không tìm thấy nội dung để xuất PDF");
                return;
            }

            // Make sure PDF header is visible during generation
            const pdfHeader = document.querySelector(".pdf-header");
            if (pdfHeader) {
                pdfHeader.classList.add("pdf-visible");
            }

            // Format date for filename
            const reportDate = new Date(selectedDate);
            const day = reportDate.getDate().toString().padStart(2, "0");
            const month = (reportDate.getMonth() + 1).toString().padStart(2, "0");
            const year = reportDate.getFullYear();
            const formattedDate = `${day}${month}${year}`;

            // Configure PDF options for optimal A4 portrait layout
            const options = {
                margin: [10, 10, 10, 5], // Reduced margins for better space utilization
                filename: `BaoCaoDoMan_TPHCM_${formattedDate}.pdf`,
                image: {
                    type: "png", // PNG for sharper text
                    quality: 1.0, // Maximum quality
                },
                html2canvas: {
                    scale: 1.5, // Optimized scale for A4 portrait
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: "#ffffff",
                    letterRendering: true,
                    logging: false,
                    scrollX: 0,
                    scrollY: 0,
                    width: 750, // Optimized width for A4 portrait
                    height: null, // Let height adjust automatically
                    foreignObjectRendering: false, // Better compatibility
                    onclone: function (clonedDoc) {
                        // Ensure print styles are applied
                        const body = clonedDoc.body;
                        if (body) {
                            body.classList.add("print-mode");
                        }
                    },
                },
                jsPDF: {
                    unit: "mm",
                    format: "a4",
                    orientation: "portrait", // Portrait orientation for better table fit
                    compress: true,
                    precision: 16,
                    putOnlyUsedFonts: true,
                    floatPrecision: 16,
                    hotfixes: ["px_scaling"], // Fix scaling issues
                },
            };

            // Prepare PDF before generation
            const preparePdfContent = () => {
                // No custom PDF preparation
                return () => {
                    // No cleanup needed
                };
            };

            // Set up PDF optimizations
            const cleanup = preparePdfContent();

            // Add pagebreak settings to options
            options.pagebreak = { mode: ["avoid-all", "css", "legacy"] };

            // Generate and download PDF
            await html2pdf().set(options).from(element).save();

            ToastCommon(TOAST.SUCCESS, "Xuất báo cáo PDF thành công");
        } catch (error) {
            console.error("Error generating frontend PDF:", error);
            ToastCommon(TOAST.ERROR, "Không thể tạo báo cáo PDF từ frontend");
        } finally {
            // Clean up PDF optimizations
            if (typeof cleanup === "function") {
                cleanup();
            }

            // Remove print mode class
            document.body.classList.remove("print-mode");

            // Hide PDF header after generation if it was made visible
            const pdfHeader = document.querySelector(".pdf-header");
            if (pdfHeader) {
                pdfHeader.classList.remove("pdf-visible");
            }

            setGeneratingFrontendPDF(false);
        }
    };

    // Load data and generate PDF
    const loadDataAndGeneratePDF = async () => {
        // Check if user is logged in before generating PDF
        if (!isLoggedIn) {
            ToastCommon(TOAST.ERROR, "Bạn cần đăng nhập để xuất báo cáo PDF");
            return;
        }

        try {
            setGeneratingFrontendPDF(true);
            ToastCommon(TOAST.LOADING, "Đang tải dữ liệu và chuẩn bị xuất PDF...");

            // First load the data
            await loadReportData(selectedDate);

            // Wait for chart and data to render completely before generating PDF
            setTimeout(() => {
                generateFrontendPDF();
            }, 1500); // Increased timeout to ensure charts render properly
        } catch (error) {
            console.error("Error in load and generate PDF:", error);
            ToastCommon(TOAST.ERROR, "Không thể tải dữ liệu và tạo PDF");
            setGeneratingFrontendPDF(false);
        }
    };

    // Handle date change
    const handleDateChange = (e) => {
        const formattedValue = normalizeDateInput(e.target.value);
        setDateInputValue(formattedValue);

        const isoDate = parseDisplayDateToIso(formattedValue);
        if (isoDate) {
            setSelectedDate(isoDate);
            loadReportData(isoDate);
        }
    };

    const handleDateBlur = () => {
        if (!dateInputValue) return;

        const isoDate = parseDisplayDateToIso(dateInputValue);
        if (!isoDate && selectedDate) {
            setDateInputValue(formatDateVietnamese(selectedDate));
        }
    };

    // Handle sorting
    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    // Get sort icon
    const getSortIcon = (columnKey) => {
        if (sortConfig.key !== columnKey) {
            return <i className="fa-solid fa-sort text-muted ms-1" style={{ fontSize: "0.75rem" }}></i>;
        }
        return sortConfig.direction === "asc" ? (
            <i className="fa-solid fa-sort-up text-white ms-1" style={{ fontSize: "0.75rem" }}></i>
        ) : (
            <i className="fa-solid fa-sort-down text-white ms-1" style={{ fontSize: "0.75rem" }}></i>
        );
    };

    // Sort stations data
    const sortedStations = React.useMemo(() => {
        if (!reportStations.length || !sortConfig.key) return reportStations;

        return [...reportStations].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Handle different data types
            if (sortConfig.key === "stationName") {
                aValue = aValue?.toLowerCase() || "";
                bValue = bValue?.toLowerCase() || "";
            } else if (sortConfig.key === "currentSalinity" || sortConfig.key === "previousSalinity") {
                aValue = aValue ? parseFloat(aValue) : -1; // Put null/undefined at end
                bValue = bValue ? parseFloat(bValue) : -1;
            } else if (sortConfig.key === "prevYearMonthlyMax") {
                // Calculate maximum for sorting
                aValue = calculateArrayMaximum(a.prevYearMonthlyData);
                bValue = calculateArrayMaximum(b.prevYearMonthlyData);
                // Convert NULL to -1 for sorting (put NULL values at end)
                aValue = aValue === "NULL" ? -1 : aValue;
                bValue = bValue === "NULL" ? -1 : bValue;
            } else if (sortConfig.key === "allYearsMonthlyMax") {
                // Calculate maximum for sorting
                aValue = calculateArrayMaximum(a.allYearsMonthlyData);
                bValue = calculateArrayMaximum(b.allYearsMonthlyData);
                // Convert NULL to -1 for sorting (put NULL values at end)
                aValue = aValue === "NULL" ? -1 : aValue;
                bValue = bValue === "NULL" ? -1 : bValue;
            } else if (sortConfig.key === "stt") {
                aValue = parseInt(aValue) || 0;
                bValue = parseInt(bValue) || 0;
            }

            if (aValue < bValue) {
                return sortConfig.direction === "asc" ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === "asc" ? 1 : -1;
            }
            return 0;
        });
    }, [reportStations, sortConfig]);

    // Format salinity value
    const formatSalinity = (value) => {
        if (value === null || value === undefined || value === "" || value === "NULL") {
            return "--";
        }
        const numeric = parseFloat(value);
        if (isNaN(numeric)) {
            return "--";
        }

        return numeric.toLocaleString("vi-VN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    // Get salinity level class
    const getSalinityClassLocal = (value, stationCode) => {
        return getSalinityClass(value, stationCode);
    };

    // Calculate maximum from array data
    const calculateArrayMaximum = (dataArray) => {
        if (!dataArray || dataArray.length === 0) return "NULL";

        const validValues = dataArray
            .map((item) => parseFloat(item.value))
            .filter((value) => !isNaN(value) && value > 0);

        if (validValues.length === 0) return "NULL";

        return Math.max(...validValues); // Get maximum value
    };

    // Get salinity color based on risk level
    const getSalinityColor = (value, stationCode) => {
        const riskClass = getSalinityClassLocal(value, stationCode);
        switch (riskClass) {
            case "normal":
            case "salinity-normal":
                return "#28a745";
            case "warning":
            case "salinity-warning":
                return "#ffc107";
            case "high-warning":
            case "salinity-high-warning":
                return "#fd7e14";
            case "critical":
            case "salinity-critical":
                return "#dc3545";
            default:
                return "#6c757d"; // Gray for no data
        }
    };

    // Prepare chart data - transposed structure
    const getChartData = () => {
        if (!reportStations.length) return null;

        // Create labels for the 4 data types
        const currentDateLabel = `Độ mặn ngày ${new Date(reportData.reportDate).toLocaleDateString("vi-VN")} (‰)`;
        const previousDateLabel = getPreviousObservationDateLabel();
        const prevYearLabel = `Độ mặn tháng ${getCurrentMonthYear().month}/${getCurrentMonthYear().year - 1} (‰)`;
        const allYearsLabel = `Độ mặn tháng ${getCurrentMonthYear().month}/TBNN (‰)`;

        const labels = [currentDateLabel, previousDateLabel, prevYearLabel, allYearsLabel];

        // Create datasets for each station
        const datasets = reportStations.map((station, index) => {
            // Calculate values for each data type
            const currentValue = station.currentSalinity ? parseFloat(station.currentSalinity) : 0;
            const previousValue = station.previousSalinity ? parseFloat(station.previousSalinity) : 0;
            const prevYearMax = calculateArrayMaximum(station.prevYearMonthlyData);
            const prevYearValue = prevYearMax === "NULL" ? 0 : prevYearMax;
            const allYearsMax = calculateArrayMaximum(station.allYearsMonthlyData);
            const allYearsValue = allYearsMax === "NULL" ? 0 : allYearsMax;

            const data = [currentValue, previousValue, prevYearValue, allYearsValue];

            // Generate colors for each bar based on salinity level
            const backgroundColor = data.map((value, dataIndex) => {
                if (value === 0) return "#6c757d"; // Gray for no data
                return getSalinityColor(value, station.stationCode);
            });

            const borderColor = backgroundColor.map((color) => color);

            return {
                label: station.stationName,
                data: data,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 1,
                maxBarThickness: 40,
            };
        });

        return {
            labels,
            datasets,
        };
    };

    // Chart options function
    const getChartOptions = () => ({
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: 1.5,
        animation: {
            duration: 0, // Disable animation for faster PDF generation
        },
        plugins: {
            legend: {
                display: false, // Ẩn legend vì sẽ hiển thị tên trạm trên cột
            },
            tooltip: {
                backgroundColor: "rgba(0,0,0,0.9)",
                titleColor: "#fff",
                bodyColor: "#fff",
                titleFont: {
                    size: 12,
                    family: "Arial, sans-serif",
                    weight: "bold",
                },
                bodyFont: {
                    size: 11,
                    family: "Arial, sans-serif",
                },
                padding: 12,
                cornerRadius: 8,
                displayColors: true,
                borderColor: "rgba(255,255,255,0.2)",
                borderWidth: 1,
                callbacks: {
                    title: function (context) {
                        return context[0].label;
                    },
                    label: function (context) {
                        const stationName = context.dataset.label;
                        const value = context.parsed.y;
                        return `${stationName}: ${formatSalinity(value)} ‰`;
                    },
                },
            },
            stationLabels: true, // Enable the registered plugin
        },
        onHover: (event, activeElements) => {
            // Add cursor pointer when hovering over bars
            event.native.target.style.cursor = activeElements.length > 0 ? "pointer" : "default";
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "Loại dữ liệu độ mặn",
                    font: {
                        size: 12,
                        weight: "bold",
                        family: "Arial, sans-serif",
                    },
                    color: "#2d3748",
                    padding: { top: 10, bottom: 10 },
                },
                ticks: {
                    font: {
                        size: 9,
                        family: "Arial, sans-serif",
                        weight: "500",
                    },
                    padding: 8,
                    color: "#4a5568",
                    maxRotation: 45,
                    minRotation: 0,
                },
                grid: {
                    color: "rgba(74, 85, 104, 0.1)",
                    drawBorder: true,
                },
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: "Độ mặn (‰)",
                    font: {
                        size: 14,
                        weight: "bold",
                        family: "Arial, sans-serif",
                    },
                    color: "#2d3748",
                    padding: { top: 10, bottom: 10 },
                },
                ticks: {
                    font: {
                        size: 11,
                        family: "Arial, sans-serif",
                        weight: "500",
                    },
                    padding: 8,
                    color: "#4a5568",
                    maxTicksLimit: 8,
                },
                grid: {
                    color: "rgba(74, 85, 104, 0.1)",
                    drawBorder: true,
                },
                afterFit: function (scaleInstance) {
                    scaleInstance.width = 90;
                },
            },
        },
        elements: {
            bar: {
                borderRadius: {
                    topLeft: 4,
                    topRight: 4,
                },
                borderSkipped: false,
                borderWidth: 1,
            },
        },
        layout: {
            padding: {
                left: 10,
                right: 10,
                top: 45, // Increased padding for station labels with background
                bottom: 20,
            },
        },
        onResize: null,
        aspectRatio: 1.4, // Adjusted for new layout
    });

    // Get current month and year from selected date
    const getCurrentMonthYear = () => {
        if (!selectedDate) return { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
        const date = new Date(selectedDate);
        return { month: date.getMonth() + 1, year: date.getFullYear() };
    };

    // Get most common previous observation date
    const getPreviousObservationDateLabel = () => {
        if (!reportStations.length) return "Độ mặn lần trước (‰)";

        // Find the most common previous observation date
        const dates = reportStations
            .map((station) => station.previousObservationDate)
            .filter((date) => date && date !== null);

        if (dates.length === 0) return "Độ mặn lần trước (‰)";

        // Get the first valid date (assuming they are mostly the same)
        const mostCommonDate = dates[0];
        const formattedDate = new Date(mostCommonDate).toLocaleDateString("vi-VN");
        return `Độ mặn ngày ${formattedDate} (‰)`;
    };

    // Get station location from STATION_LOCATIONS
    const getStationLocation = (stationName) => {
        const stationLocation = STATION_LOCATIONS.find((location) => location.name === stationName);
        return stationLocation ? stationLocation.location : stationName;
    };

    useEffect(() => {
        setDateInputValue(formatDateVietnamese(selectedDate));
    }, [selectedDate]);

    useEffect(() => {
        if (selectedDate) {
            loadReportData(selectedDate);
        }
    }, []);

    return (
        <div className="salinity-report">
            <Header />
            <main className="main-content">
                <div className="container">
                    <div className="row mb-4">
                        <div className="col-md-6">
                            <div className="date-selector">
                                <label htmlFor="reportDate" className="form-label">
                                    Chọn ngày báo cáo:
                                </label>
                                <input
                                    type="text"
                                    id="reportDate"
                                    className="form-control"
                                    placeholder="dd/mm/yyyy"
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={dateInputValue}
                                    onChange={handleDateChange}
                                    onBlur={handleDateBlur}
                                />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="action-buttons">
                                <button
                                    className="btn btn-info ms-2"
                                    onClick={() => loadReportData(selectedDate)}
                                    disabled={loading || !selectedDate}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" />
                                            Đang tải...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-arrow-clockwise me-2"></i>
                                            Tải lại dữ liệu
                                        </>
                                    )}
                                </button>
                                <button
                                    className={`btn ${isLoggedIn ? "btn-primary" : "btn-secondary"} btn-lg`}
                                    onClick={loadDataAndGeneratePDF}
                                    disabled={
                                        loading || !selectedDate || generatingFrontendPDF || !isLoggedIn
                                    }
                                    title={!isLoggedIn ? "Bạn cần đăng nhập để xuất báo cáo PDF" : ""}
                                >
                                    {loading || generatingFrontendPDF ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" />
                                            {loading ? "Đang tải dữ liệu..." : "Đang tạo PDF..."}
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-file-earmark-pdf-fill me-2"></i>
                                            {isLoggedIn ? "Xuất Báo Cáo" : "Đăng nhập để xuất PDF"}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Login notice for non-logged in users */}
                    {!isLoggedIn && (
                        <div className="row mb-4">
                            <div className="col-12">
                                <div className="alert alert-info d-flex align-items-center">
                                    <i className="bi bi-info-circle me-2"></i>
                                    <div>
                                        <strong>Thông báo:</strong> Bạn có thể xem dữ liệu trực tiếp trên web.
                                        Để xuất báo cáo PDF, vui lòng <strong>đăng nhập</strong> vào hệ thống.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {loading && <Loading />}

                    {reportData && (
                        <div className="pdf-content" id="pdf-content-wrapper">
                            {/* PDF Header for print */}
                            <div className="pdf-header">
                                <div className="pdf-header-gradient text-center">
                                    <h2 className="text-center mb-2 fw-bold text-dark">
                                        BÁO CÁO GIÁM SÁT XÂM NHẬP MẶN TRÊN SÔNG RẠCH TPHCM
                                    </h2>
                                    <h4 className="text-center fw-bold text-dark">
                                        {formatDateVietnamese(selectedDate)}
                                    </h4>
                                    <p className="text-center fw-bold text-dark">************</p>
                                </div>
                            </div>
                            {/* Summary Statistics */}
                            <div className="card">
                                <div className="card-header">
                                    <h6 className="card-title mb-0">
                                        <i className="fa-solid fa-chart-bar me-2"></i>
                                        Thống kê tổng quan
                                    </h6>
                                </div>
                                <div className="card-body">
                                    <div className="row text-center">
                                        <div className="col-md-2">
                                            <div className="stat-item">
                                                <div className="stat-value text-primary">
                                                    {reportStations.length || 0}
                                                </div>
                                                <div className="stat-label">{stationCountLabel}</div>
                                            </div>
                                        </div>
                                        <div className="col-md-2">
                                            <div className="stat-item">
                                                <div
                                                    className={`stat-value ${(() => {
                                                        const stationsWithValues = reportStations
                                                            ?.map((station) => ({
                                                                ...station,
                                                                value: parseFloat(station.currentSalinity),
                                                            }))
                                                            .filter(
                                                                (station) =>
                                                                    station.value !== null &&
                                                                    !isNaN(station.value) &&
                                                                    station.currentSalinity !== "" &&
                                                                    station.currentSalinity !== null &&
                                                                    station.currentSalinity !== undefined,
                                                            );

                                                        if (
                                                            !stationsWithValues ||
                                                            stationsWithValues.length === 0
                                                        ) {
                                                            return "text-secondary";
                                                        }

                                                        // Find station with maximum value
                                                        const maxStation = stationsWithValues.reduce(
                                                            (max, station) =>
                                                                station.value > max.value ? station : max,
                                                        );

                                                        return getSalinityClassLocal(
                                                            maxStation.value,
                                                            maxStation.stationCode,
                                                        );
                                                    })()}`}
                                                >
                                                    {(() => {
                                                        const validValues = reportStations
                                                            ?.map((station) => station.currentSalinity)
                                                            .filter(
                                                                (val) =>
                                                                    val !== null &&
                                                                    val !== undefined &&
                                                                    val !== "",
                                                            )
                                                            .map((val) => parseFloat(val));

                                                        if (!validValues || validValues.length === 0) {
                                                            return "--";
                                                        }

                                                        const max = Math.max(...validValues);
                                                        return formatSalinity(max) + " ‰";
                                                    })()}
                                                </div>
                                                <div className="stat-label">
                                                    Max độ mặn ngày{" "}
                                                    {new Date(reportData.reportDate).toLocaleDateString(
                                                        "vi-VN",
                                                    )}{" "}
                                                    (‰)
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-2">
                                            <div className="stat-item">
                                                <div
                                                    className={`stat-value ${(() => {
                                                        const stationsWithValues = reportStations
                                                            ?.map((station) => ({
                                                                ...station,
                                                                value: parseFloat(station.previousSalinity),
                                                            }))
                                                            .filter(
                                                                (station) =>
                                                                    station.value !== null &&
                                                                    !isNaN(station.value) &&
                                                                    station.previousSalinity !== "" &&
                                                                    station.previousSalinity !== null &&
                                                                    station.previousSalinity !== undefined,
                                                            );

                                                        if (
                                                            !stationsWithValues ||
                                                            stationsWithValues.length === 0
                                                        ) {
                                                            return "text-secondary";
                                                        }

                                                        // Find station with maximum value
                                                        const maxStation = stationsWithValues.reduce(
                                                            (max, station) =>
                                                                station.value > max.value ? station : max,
                                                        );

                                                        return getSalinityClassLocal(
                                                            maxStation.value,
                                                            maxStation.stationCode,
                                                        );
                                                    })()}`}
                                                >
                                                    {(() => {
                                                        const validValues = reportStations
                                                            ?.map((station) => station.previousSalinity)
                                                            .filter(
                                                                (val) =>
                                                                    val !== null &&
                                                                    val !== undefined &&
                                                                    val !== "",
                                                            )
                                                            .map((val) => parseFloat(val));

                                                        if (!validValues || validValues.length === 0) {
                                                            return "--";
                                                        }

                                                        const max = Math.max(...validValues);
                                                        return formatSalinity(max) + " ‰";
                                                    })()}
                                                </div>
                                                <div className="stat-label">
                                                    Max {getPreviousObservationDateLabel()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className="stat-item">
                                                <div
                                                    className={`stat-value ${(() => {
                                                        const stationsWithValues = reportStations
                                                            ?.map((station) => {
                                                                const max = calculateArrayMaximum(
                                                                    station.prevYearMonthlyData,
                                                                );
                                                                const value =
                                                                    max === "NULL" ? null : parseFloat(max);
                                                                return {
                                                                    ...station,
                                                                    value: value,
                                                                };
                                                            })
                                                            .filter(
                                                                (station) =>
                                                                    station.value !== null &&
                                                                    !isNaN(station.value),
                                                            );

                                                        if (
                                                            !stationsWithValues ||
                                                            stationsWithValues.length === 0
                                                        ) {
                                                            return "text-secondary";
                                                        }

                                                        // Find station with maximum value
                                                        const maxStation = stationsWithValues.reduce(
                                                            (max, station) =>
                                                                station.value > max.value ? station : max,
                                                        );

                                                        return getSalinityClassLocal(
                                                            maxStation.value,
                                                            maxStation.stationCode,
                                                        );
                                                    })()}`}
                                                >
                                                    {(() => {
                                                        const validValues = reportStations
                                                            ?.map((station) => {
                                                                const max = calculateArrayMaximum(
                                                                    station.prevYearMonthlyData,
                                                                );
                                                                return max === "NULL" ? null : max;
                                                            })
                                                            .filter((val) => val !== null);

                                                        if (!validValues || validValues.length === 0) {
                                                            return "--";
                                                        }

                                                        const max = Math.max(...validValues);
                                                        return formatSalinity(max) + " ‰";
                                                    })()}
                                                </div>
                                                <div className="stat-label">
                                                    Max độ mặn tháng {getCurrentMonthYear().month}/
                                                    {getCurrentMonthYear().year - 1} (‰)
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-3">
                                            <div className="stat-item">
                                                <div
                                                    className={`stat-value ${(() => {
                                                        const stationsWithValues = reportStations
                                                            ?.map((station) => {
                                                                const max = calculateArrayMaximum(
                                                                    station.allYearsMonthlyData,
                                                                );
                                                                const value =
                                                                    max === "NULL" ? null : parseFloat(max);
                                                                return {
                                                                    ...station,
                                                                    value: value,
                                                                };
                                                            })
                                                            .filter(
                                                                (station) =>
                                                                    station.value !== null &&
                                                                    !isNaN(station.value),
                                                            );

                                                        if (
                                                            !stationsWithValues ||
                                                            stationsWithValues.length === 0
                                                        ) {
                                                            return "text-secondary";
                                                        }

                                                        // Find station with maximum value
                                                        const maxStation = stationsWithValues.reduce(
                                                            (max, station) =>
                                                                station.value > max.value ? station : max,
                                                        );

                                                        return getSalinityClassLocal(
                                                            maxStation.value,
                                                            maxStation.stationCode,
                                                        );
                                                    })()}`}
                                                >
                                                    {(() => {
                                                        const validValues = reportStations
                                                            ?.map((station) => {
                                                                const max = calculateArrayMaximum(
                                                                    station.allYearsMonthlyData,
                                                                );
                                                                return max === "NULL" ? null : max;
                                                            })
                                                            .filter((val) => val !== null);

                                                        if (!validValues || validValues.length === 0) {
                                                            return "--";
                                                        }

                                                        const max = Math.max(...validValues);
                                                        return formatSalinity(max) + " ‰";
                                                    })()}
                                                </div>
                                                <div className="stat-label">
                                                    Max độ mặn tháng {getCurrentMonthYear().month}/TBNN (‰)
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Statistics Table */}
                            <div className="container">
                                <div className="pdf-table-section">
                                    <p className="pdf-table-intro pdf-only">
                                        &nbsp;&nbsp;&nbsp;&nbsp;Dữ liệu xâm nhập mặn được đo ngày{" "}
                                        <span className="text-lowercase">
                                            {formatDateVietnamese(selectedDate)}
                                        </span>
                                        tại {reportStations.length} trạm trên sông rạch chính thuộc khu vực
                                        Thành phố Hồ Chí Minh được thống kê như sau:
                                    </p>
                                    <h5 className="pdf-table-title mb-3">
                                        Bảng số liệu quan trắc độ mặn ngày{" "}
                                        {new Date(reportData.reportDate).toLocaleDateString("vi-VN")}
                                    </h5>
                                    <div className="table-responsive">
                                        <table className="table table-striped table-hover">
                                            <thead className="table-dark">
                                                <tr>
                                                    <th
                                                        style={{
                                                            width: "5%",
                                                            cursor: "pointer",
                                                            userSelect: "none",
                                                        }}
                                                        onClick={() => handleSort("stt")}
                                                    >
                                                        <div className="d-flex align-items-center justify-content-center">
                                                            <span>STT</span>
                                                            {getSortIcon("stt")}
                                                        </div>
                                                    </th>
                                                    <th
                                                        style={{
                                                            width: "20%",
                                                            cursor: "pointer",
                                                            userSelect: "none",
                                                        }}
                                                        onClick={() => handleSort("stationName")}
                                                    >
                                                        <div className="d-flex align-items-center justify-content-center">
                                                            <span>{stationNameLabel}</span>
                                                            {getSortIcon("stationName")}
                                                        </div>
                                                    </th>
                                                    <th
                                                        style={{
                                                            width: "20%",
                                                            cursor: "pointer",
                                                            userSelect: "none",
                                                        }}
                                                        onClick={() => handleSort("currentSalinity")}
                                                    >
                                                        <div className="d-flex align-items-center justify-content-center">
                                                            <span>
                                                                Độ mặn ngày{" "}
                                                                {new Date(
                                                                    reportData.reportDate,
                                                                ).toLocaleDateString("vi-VN")}
                                                                (‰)
                                                            </span>
                                                            {getSortIcon("currentSalinity")}
                                                        </div>
                                                    </th>
                                                    <th
                                                        style={{
                                                            width: "20%",
                                                            cursor: "pointer",
                                                            userSelect: "none",
                                                        }}
                                                        onClick={() => handleSort("previousSalinity")}
                                                    >
                                                        <div className="d-flex align-items-center justify-content-center">
                                                            <span>{getPreviousObservationDateLabel()}</span>
                                                            {getSortIcon("previousSalinity")}
                                                        </div>
                                                    </th>
                                                    <th
                                                        style={{
                                                            width: "17.5%",
                                                            cursor: "pointer",
                                                            userSelect: "none",
                                                        }}
                                                        onClick={() => handleSort("prevYearMonthlyMax")}
                                                    >
                                                        <div className="d-flex align-items-center justify-content-center">
                                                            <span>
                                                                Độ mặn tháng {getCurrentMonthYear().month}/
                                                                {getCurrentMonthYear().year - 1} (‰)
                                                            </span>
                                                            {getSortIcon("prevYearMonthlyMax")}
                                                        </div>
                                                    </th>
                                                    <th
                                                        style={{
                                                            width: "17.5%",
                                                            cursor: "pointer",
                                                            userSelect: "none",
                                                        }}
                                                        onClick={() => handleSort("allYearsMonthlyMax")}
                                                    >
                                                        <div className="d-flex align-items-center justify-content-center">
                                                            <span>
                                                                Độ mặn tháng {getCurrentMonthYear().month}
                                                                /TBNN (‰)
                                                            </span>
                                                            {getSortIcon("allYearsMonthlyMax")}
                                                        </div>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedStations.map((station) => (
                                                    <tr key={station.stationCode}>
                                                        <td>{station.stt}</td>
                                                        <td>
                                                            <strong>{station.stationName}</strong>
                                                            <br />
                                                            <small className="text-muted">
                                                                ({station.stationCode})
                                                            </small>
                                                        </td>
                                                        <td>
                                                            <span
                                                                className={`salinity-value ${getSalinityClassLocal(station.currentSalinity, station.stationCode)}`}
                                                            >
                                                                {formatSalinity(station.currentSalinity)}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span
                                                                className={`salinity-value ${getSalinityClassLocal(station.previousSalinity, station.stationCode)}`}
                                                            >
                                                                {formatSalinity(station.previousSalinity)}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span
                                                                className={`salinity-value ${getSalinityClassLocal(
                                                                    calculateArrayMaximum(
                                                                        station.prevYearMonthlyData,
                                                                    ),
                                                                    station.stationCode,
                                                                )}`}
                                                            >
                                                                {formatSalinity(
                                                                    calculateArrayMaximum(
                                                                        station.prevYearMonthlyData,
                                                                    ),
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span
                                                                className={`salinity-value ${getSalinityClassLocal(
                                                                    calculateArrayMaximum(
                                                                        station.allYearsMonthlyData,
                                                                    ),
                                                                    station.stationCode,
                                                                )}`}
                                                            >
                                                                {formatSalinity(
                                                                    calculateArrayMaximum(
                                                                        station.allYearsMonthlyData,
                                                                    ),
                                                                )}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Explicit page break for Analysis */}
                            <div className="pdf-page-break"></div>

                            <div className="pdf-analysis-section pdf-only">
                                <p className="analysis-intro">
                                    Một số nhận định về kết quả dữ liệu xâm nhập mặn trên các tuyến sông, kênh
                                    rạch khu vực Thành phố Hồ Chí Minh{" "}
                                    <span className="text-lowercase">
                                        {formatDateVietnamese(selectedDate)}
                                    </span>{" "}
                                    như sau:
                                </p>
                                <div className="analysis-content">
                                    {reportStations.map((station) => (
                                        <div key={station.stationCode} className="station-analysis">
                                            <strong>• {station.stationName}</strong>{" "}
                                            <span className="fst-italic">
                                                {" "}
                                                (vị trí lấy mẫu: {getStationLocation(station.stationName)})
                                            </span>
                                            :
                                            <div className="analysis-details">
                                                - Giá trị mặn hiện tại ={" "}
                                                {formatSalinity(station.currentSalinity)} ‰
                                                {station.previousSalinity && (
                                                    <>
                                                        {" "}
                                                        {parseFloat(station.currentSalinity || 0) >
                                                        parseFloat(station.previousSalinity || 0)
                                                            ? "tăng"
                                                            : parseFloat(station.currentSalinity || 0) <
                                                                parseFloat(station.previousSalinity || 0)
                                                              ? "giảm"
                                                              : "bằng"}{" "}
                                                        so với lần quan trắc trước (
                                                        {formatSalinity(station.previousSalinity)} ‰)
                                                    </>
                                                )}
                                                {(() => {
                                                    const prevYearMax = calculateArrayMaximum(
                                                        station.prevYearMonthlyData,
                                                    );
                                                    const allYearsMax = calculateArrayMaximum(
                                                        station.allYearsMonthlyData,
                                                    );
                                                    const currentVal = parseFloat(
                                                        station.currentSalinity || 0,
                                                    );

                                                    return (
                                                        <>
                                                            {prevYearMax !== "NULL" && (
                                                                <>
                                                                    ,{" "}
                                                                    {currentVal > prevYearMax
                                                                        ? "cao hơn"
                                                                        : currentVal < prevYearMax
                                                                          ? "thấp hơn"
                                                                          : "bằng"}{" "}
                                                                    so với độ mặn tháng{" "}
                                                                    {getCurrentMonthYear().month}/
                                                                    {getCurrentMonthYear().year - 1} (
                                                                    {formatSalinity(prevYearMax)} ‰)
                                                                </>
                                                            )}
                                                            {allYearsMax !== "NULL" && (
                                                                <>
                                                                    {" và "}
                                                                    {currentVal > allYearsMax
                                                                        ? "cao hơn"
                                                                        : currentVal < allYearsMax
                                                                          ? "thấp hơn"
                                                                          : "bằng"}{" "}
                                                                    so với độ mặn tháng{" "}
                                                                    {getCurrentMonthYear().month}/TBNN (
                                                                    {formatSalinity(allYearsMax)} ‰)
                                                                </>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                                .
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Explicit page break for Chart */}
                            <div className="pdf-page-break"></div>

                            {/* Chart */}
                            <div className="pdf-chart-section">
                                {getChartData() && (
                                    <>
                                        <div className="pdf-only">
                                            <p>
                                                &nbsp; <br />
                                                &nbsp;
                                            </p>
                                        </div>
                                        {/* Custom Legend - Risk Level Colors */}
                                        <div className="chart-legend-custom pdf-only">
                                            <div className="legend-title text-center mb-2">
                                                Chú thích cấp độ rủi ro thiên tai do xâm nhập mặn:
                                            </div>
                                            <div className="legend-items d-flex flex-wrap justify-content-center gap-3">
                                                <div className="legend-item d-flex align-items-center">
                                                    <div
                                                        className="legend-color-box me-2"
                                                        style={{
                                                            width: "20px",
                                                            height: "20px",
                                                            backgroundColor: "#28a745",
                                                            borderRadius: "3px",
                                                            border: "1px solid #ccc",
                                                        }}
                                                    ></div>
                                                    <span style={{ fontSize: "10px", fontWeight: "500" }}>
                                                        Bình thường (&lt;1‰)
                                                    </span>
                                                </div>
                                                <div className="legend-item d-flex align-items-center">
                                                    <div
                                                        className="legend-color-box me-2"
                                                        style={{
                                                            width: "20px",
                                                            height: "20px",
                                                            backgroundColor: "#ffc107",
                                                            borderRadius: "3px",
                                                            border: "1px solid #ccc",
                                                        }}
                                                    ></div>
                                                    <span style={{ fontSize: "14px", fontWeight: "500" }}>
                                                        Rủi ro cấp 1 (Nhà Bè: 1-4‰)
                                                    </span>
                                                </div>
                                                <div className="legend-item d-flex align-items-center">
                                                    <div
                                                        className="legend-color-box me-2"
                                                        style={{
                                                            width: "20px",
                                                            height: "20px",
                                                            backgroundColor: "#ff8c00",
                                                            borderRadius: "3px",
                                                            border: "1px solid #ccc",
                                                        }}
                                                    ></div>
                                                    <span style={{ fontSize: "14px", fontWeight: "500" }}>
                                                        Rủi ro cấp 2 (Nhà Bè &gt;4‰, khác 1-4‰)
                                                    </span>
                                                </div>
                                                <div className="legend-item d-flex align-items-center">
                                                    <div
                                                        className="legend-color-box me-2"
                                                        style={{
                                                            width: "20px",
                                                            height: "20px",
                                                            backgroundColor: "#dc3545",
                                                            borderRadius: "3px",
                                                            border: "1px solid #ccc",
                                                        }}
                                                    ></div>
                                                    <span style={{ fontSize: "14px", fontWeight: "500" }}>
                                                        Rủi ro cấp 3 (Các điểm &gt;4‰)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="chart-container">
                                            <div className="chart-wrapper">
                                                <Bar data={getChartData()} options={getChartOptions()} />
                                            </div>
                                        </div>

                                        <h5 className="pdf-table-title mt-3 text-center">
                                            Biểu đồ quan trắc độ mặn ngày{" "}
                                            {new Date(reportData.reportDate).toLocaleDateString("vi-VN")}
                                        </h5>
                                    </>
                                )}
                            </div>

                            {/* Explicit page break for Appendix */}
                            <div className="pdf-page-break"></div>

                            {/* Appendix Section - Station Locations */}
                            <div className="pdf-appendix-section pdf-only">
                                <p>
                                    &nbsp; <br />
                                    &nbsp;
                                </p>
                                <h4 className="appendix-title">
                                    PHỤ LỤC CÁC VỊ TRÍ LẤY MẪU KHẢO SÁT XÂM NHẬP MẶN
                                </h4>
                                <h5 className="appendix-table-title text-center mb-3">
                                    Bảng vị trí và tọa độ lấy mẫu khảo sát xâm nhập mặn
                                </h5>

                                <div className="table-responsive">
                                    <table className="table table-bordered appendix-table">
                                        <thead className="table-dark">
                                            <tr>
                                                <th style={{ width: "8%", textAlign: "center" }}>TT</th>
                                                <th style={{ width: "20%", textAlign: "center" }}>
                                                    {stationNameLabel}
                                                </th>
                                                <th style={{ width: "52%", textAlign: "center" }}>Vị trí</th>
                                                <th style={{ width: "20%", textAlign: "center" }}>
                                                    Tọa độ
                                                    <br />
                                                    <div className="d-flex">
                                                        <span style={{ width: "50%", textAlign: "center" }}>
                                                            X (m)
                                                        </span>
                                                        <span style={{ width: "50%", textAlign: "center" }}>
                                                            Y (m)
                                                        </span>
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {STATION_LOCATIONS.map((station) => (
                                                <tr key={station.id}>
                                                    <td style={{ textAlign: "center" }}>{station.id}</td>
                                                    <td>{station.name}</td>
                                                    <td>{station.location}</td>
                                                    <td>
                                                        <div className="d-flex">
                                                            <span
                                                                style={{ width: "50%", textAlign: "center" }}
                                                            >
                                                                {station.coordinates.x}
                                                            </span>
                                                            <span
                                                                style={{ width: "50%", textAlign: "center" }}
                                                            >
                                                                {station.coordinates.y}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && !reportData && selectedDate && (
                        <div className="container">
                            <div className="row">
                                <div className="col-12">
                                    <div className="alert alert-info text-center">
                                        <i className="bi bi-info-circle me-2"></i>
                                        Không có dữ liệu cho ngày đã chọn. Vui lòng chọn ngày khác.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default SalinityReport;
