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

const SalinityReport = () => {
    const { userInfo } = useSelector((state) => state.authStore);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [generatingFrontendPDF, setGeneratingFrontendPDF] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

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

            // Configure PDF options
            const options = {
                margin: [20, 10, 20, 10], // top, left, bottom, right
                filename: `BaoCaoDoMan_TPHCM_${formattedDate}.pdf`,
                image: {
                    type: "jpeg",
                    quality: 1.0,
                },
                html2canvas: {
                    scale: 2, // Higher scale for better quality
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: "#ffffff",
                    letterRendering: true,
                    logging: false,
                    scrollX: 0,
                    scrollY: 0,
                    width: window.innerWidth * 0.9, // Use most of screen width for better resolution
                },
                jsPDF: {
                    unit: "mm",
                    format: "a4",
                    orientation: "landscape", // Change to landscape for better table display
                    compress: true,
                    precision: 16,
                    putOnlyUsedFonts: true,
                    floatPrecision: 16,
                },
            };

            // Prepare PDF before generation - optimize for better rendering
            const preparePdfContent = () => {
                // Add classes for PDF optimization
                document.body.classList.add("pdf-preparing");

                // Find all table cells and optimize them
                const tableCells = document.querySelectorAll(".pdf-content table td, .pdf-content table th");
                tableCells.forEach((cell) => {
                    // Add text selection class to ensure text is selectable
                    cell.classList.add("pdf-text-selectable");
                });

                // Optimize chart for PDF rendering
                const chartContainer = document.querySelector(".chart-container");
                if (chartContainer) {
                    chartContainer.classList.add("pdf-chart-optimize");
                }

                // Return cleanup function
                return () => {
                    document.body.classList.remove("pdf-preparing");
                    tableCells.forEach((cell) => {
                        cell.classList.remove("pdf-text-selectable");
                    });
                    if (chartContainer) {
                        chartContainer.classList.remove("pdf-chart-optimize");
                    }
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
        const date = e.target.value;
        setSelectedDate(date);
        if (date) {
            loadReportData(date);
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
        if (!reportData?.stations || !sortConfig.key) return reportData?.stations || [];

        return [...reportData.stations].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Handle different data types
            if (sortConfig.key === "stationName") {
                aValue = aValue?.toLowerCase() || "";
                bValue = bValue?.toLowerCase() || "";
            } else if (sortConfig.key === "currentSalinity" || sortConfig.key === "previousSalinity") {
                aValue = aValue ? parseFloat(aValue) : -1; // Put null/undefined at end
                bValue = bValue ? parseFloat(bValue) : -1;
            } else if (sortConfig.key === "prevYearMonthlyAvg") {
                // Calculate average for sorting
                aValue = calculateArrayAverage(a.prevYearMonthlyData);
                bValue = calculateArrayAverage(b.prevYearMonthlyData);
                // Convert NULL to -1 for sorting (put NULL values at end)
                aValue = aValue === "NULL" ? -1 : aValue;
                bValue = bValue === "NULL" ? -1 : bValue;
            } else if (sortConfig.key === "allYearsMonthlyAvg") {
                // Calculate average for sorting
                aValue = calculateArrayAverage(a.allYearsMonthlyData);
                bValue = calculateArrayAverage(b.allYearsMonthlyData);
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
    }, [reportData?.stations, sortConfig]);

    // Format salinity value
    const formatSalinity = (value) => {
        if (value === null || value === undefined || value === "" || value === "NULL") {
            return "--";
        }
        return parseFloat(value).toFixed(2);
    };

    // Get salinity level class
    const getSalinityClassLocal = (value, stationCode) => {
        return getSalinityClass(value, stationCode);
    };

    // Calculate average from array data
    const calculateArrayAverage = (dataArray) => {
        if (!dataArray || dataArray.length === 0) return "NULL";

        const validValues = dataArray
            .map((item) => parseFloat(item.value))
            .filter((value) => !isNaN(value) && value > 0);

        if (validValues.length === 0) return "NULL";

        const sum = validValues.reduce((acc, value) => acc + value, 0);
        return Math.round((sum / validValues.length) * 1000) / 1000; // Round to 3 decimal places
    };

    // Prepare chart data
    const getChartData = () => {
        if (!reportData?.stations) return null;

        const labels = reportData.stations.map((station) => station.stationName);

        // Current salinity data
        const currentData = reportData.stations.map((station) =>
            station.currentSalinity ? parseFloat(station.currentSalinity) : 0,
        );

        // Previous salinity data
        const previousData = reportData.stations.map((station) =>
            station.previousSalinity ? parseFloat(station.previousSalinity) : 0,
        );

        // Average of prevYearMonthlyData
        const prevYearAvgData = reportData.stations.map((station) => {
            const avg = calculateArrayAverage(station.prevYearMonthlyData);
            return avg === "NULL" ? 0 : avg; // Convert NULL to 0 for chart display
        });

        // Average of allYearsMonthlyData
        const allYearsAvgData = reportData.stations.map((station) => {
            const avg = calculateArrayAverage(station.allYearsMonthlyData);
            return avg === "NULL" ? 0 : avg; // Convert NULL to 0 for chart display
        });

        return {
            labels,
            datasets: [
                {
                    label: `Độ mặn ngày ${new Date(reportData.reportDate).toLocaleDateString("vi-VN")} (‰)`,
                    data: currentData,
                    backgroundColor: "rgba(54, 162, 235, 0.6)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 1,
                },
                {
                    label: getPreviousObservationDateLabel(),
                    data: previousData,
                    backgroundColor: "rgba(255, 206, 86, 0.6)",
                    borderColor: "rgba(255, 206, 86, 1)",
                    borderWidth: 1,
                },
                {
                    label: `Độ mặn tháng ${getCurrentMonthYear().month}/${getCurrentMonthYear().year - 1} (‰)`,
                    data: prevYearAvgData,
                    backgroundColor: "rgba(255, 99, 132, 0.6)",
                    borderColor: "rgba(255, 99, 132, 1)",
                    borderWidth: 1,
                },
                {
                    label: `Độ mặn tháng ${getCurrentMonthYear().month}/TBNN (‰)`,
                    data: allYearsAvgData,
                    backgroundColor: "rgba(75, 192, 192, 0.6)",
                    borderColor: "rgba(75, 192, 192, 1)",
                    borderWidth: 1,
                },
            ],
        };
    };

    // Chart options function
    const getChartOptions = () => ({
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: 3, // Higher resolution for better PDF quality
        animation: {
            duration: 0, // Disable animation for faster PDF generation
        },
        plugins: {
            legend: {
                position: "top",
                align: "start",
                labels: {
                    padding: 20,
                    boxWidth: 15,
                    usePointStyle: true,
                    font: {
                        size: 12,
                        family: "Arial, sans-serif",
                        weight: "500",
                    },
                    color: "#2d3748",
                },
                title: {
                    display: false,
                },
                maxHeight: 60,
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
            },
        },
        scales: {
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
                // Ensure consistency in formatting
                afterFit: function (scaleInstance) {
                    scaleInstance.width = 50; // more space for the y-axis labels
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
        animation: {
            duration: 0, // Disable animation for PDF export
        },
        layout: {
            padding: {
                left: 20,
                right: 20,
                top: 20,
                bottom: 20,
            },
        },
        // Optimize for PDF rendering
        onResize: null,
        aspectRatio: window.innerWidth < 768 ? 1.2 : 2.5, // Better aspect ratio for different screen sizes
    });

    // Format date to Vietnamese format
    const formatDateVietnamese = (dateString) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "Ngày 06 tháng 06 năm 2024"; // Fallback to the requested date

            const day = date.getDate();
            const month = date.getMonth() + 1;
            const year = date.getFullYear();
            return `Ngày ${day.toString().padStart(2, "0")} tháng ${month.toString().padStart(2, "0")} năm ${year}`;
        } catch (error) {
            console.error("Error formatting date:", error);
            return "Ngày 06 tháng 06 năm 2024"; // Fallback to the requested date
        }
    };

    // Get current month and year from selected date
    const getCurrentMonthYear = () => {
        if (!selectedDate) return { month: new Date().getMonth() + 1, year: new Date().getFullYear() };
        const date = new Date(selectedDate);
        return { month: date.getMonth() + 1, year: date.getFullYear() };
    };

    // Get most common previous observation date
    const getPreviousObservationDateLabel = () => {
        if (!reportData?.stations) return "Độ mặn lần trước (‰)";

        // Find the most common previous observation date
        const dates = reportData.stations
            .map((station) => station.previousObservationDate)
            .filter((date) => date && date !== null);

        if (dates.length === 0) return "Độ mặn lần trước (‰)";

        // Get the first valid date (assuming they are mostly the same)
        const mostCommonDate = dates[0];
        const formattedDate = new Date(mostCommonDate).toLocaleDateString("vi-VN");
        return `Độ mặn ngày ${formattedDate} (‰)`;
    };

    // Load initial data
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
                    <div className="row">
                        <div className="col-12">
                            <div className="page-header">
                                <h1 className="page-title">
                                    BÁO CÁO GIÁM SÁT XÂM NHẬP MẶN TRÊN SÔNG RẠCH TPHCM
                                </h1>
                                <p className="page-description">{formatDateVietnamese(selectedDate)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="row mb-4">
                        <div className="col-md-6">
                            <div className="date-selector">
                                <label htmlFor="reportDate" className="form-label">
                                    Chọn ngày báo cáo:
                                </label>
                                <input
                                    type="date"
                                    id="reportDate"
                                    className="form-control"
                                    value={selectedDate}
                                    onChange={handleDateChange}
                                    max={new Date().toISOString().split("T")[0]}
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
                                    className="btn btn-primary btn-lg"
                                    onClick={loadDataAndGeneratePDF}
                                    disabled={loading || !selectedDate || generatingFrontendPDF}
                                >
                                    {loading || generatingFrontendPDF ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" />
                                            {loading ? "Đang tải dữ liệu..." : "Đang tạo PDF..."}
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-file-earmark-pdf-fill me-2"></i>
                                            Tải & Xuất PDF Báo Cáo
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {loading && <Loading />}

                    {reportData && (
                        <div className="pdf-content" id="pdf-content-wrapper">
                            {/* PDF Header for print */}
                            <div className="pdf-header">
                                <div className="pdf-header-gradient">
                                    <h2 className="text-center mb-2">
                                        BÁO CÁO GIÁM SÁT XÂM NHẬP MẶN TRÊN SÔNG RẠCH TPHCM
                                    </h2>
                                    <h4 className="text-center">{formatDateVietnamese(selectedDate)}</h4>
                                </div>
                                <div className="pdf-header-info mt-3">
                                    <p className="text-center mb-0">
                                        <strong>Đơn vị thực hiện:</strong> Nguyễn Võ Yến Linh
                                    </p>
                                    <p className="text-center">
                                        <strong>Thời gian xuất báo cáo:</strong>{" "}
                                        {new Date().toLocaleString("vi-VN")}
                                    </p>
                                </div>
                            </div>

                            {/* Summary Statistics */}
                            <div className="row mb-4">
                                <div className="col-12">
                                    <div className="card">
                                        <div className="card-header">
                                            <h6 className="card-title mb-0">
                                                <i className="fa-solid fa-chart-bar me-2"></i>
                                                Thống kê tổng quan
                                            </h6>
                                        </div>
                                        <div className="card-body">
                                            <div className="row text-center">
                                                <div className="col-md-3">
                                                    <div className="stat-item">
                                                        <div className="stat-value text-primary">
                                                            {reportData.stations?.length || 0}
                                                        </div>
                                                        <div className="stat-label">Tổng số trạm</div>
                                                    </div>
                                                </div>
                                                <div className="col-md-3">
                                                    <div className="stat-item">
                                                        <div className="stat-value text-info">
                                                            {Math.round(
                                                                (reportData.stations?.reduce(
                                                                    (sum, station) =>
                                                                        sum +
                                                                        (station.currentSalinity
                                                                            ? parseFloat(
                                                                                  station.currentSalinity,
                                                                              )
                                                                            : 0),
                                                                    0,
                                                                ) /
                                                                    (reportData.stations?.length || 1)) *
                                                                    1000,
                                                            ) / 1000}{" "}
                                                            ‰
                                                        </div>
                                                        <div className="stat-label">TB độ mặn hiện tại</div>
                                                    </div>
                                                </div>
                                                <div className="col-md-3">
                                                    <div className="stat-item">
                                                        <div className="stat-value text-warning">
                                                            {(() => {
                                                                const validValues = reportData.stations
                                                                    ?.map((station) => {
                                                                        const avg = calculateArrayAverage(
                                                                            station.prevYearMonthlyData,
                                                                        );
                                                                        return avg === "NULL" ? null : avg;
                                                                    })
                                                                    .filter((val) => val !== null);

                                                                if (
                                                                    !validValues ||
                                                                    validValues.length === 0
                                                                ) {
                                                                    return "NULL";
                                                                }

                                                                return (
                                                                    Math.round(
                                                                        (validValues.reduce(
                                                                            (sum, val) => sum + val,
                                                                            0,
                                                                        ) /
                                                                            validValues.length) *
                                                                            1000,
                                                                    ) /
                                                                        1000 +
                                                                    " ‰"
                                                                );
                                                            })()}
                                                        </div>
                                                        <div className="stat-label">TB năm trước</div>
                                                    </div>
                                                </div>
                                                <div className="col-md-3">
                                                    <div className="stat-item">
                                                        <div className="stat-value text-success">
                                                            {(() => {
                                                                const validValues = reportData.stations
                                                                    ?.map((station) => {
                                                                        const avg = calculateArrayAverage(
                                                                            station.allYearsMonthlyData,
                                                                        );
                                                                        return avg === "NULL" ? null : avg;
                                                                    })
                                                                    .filter((val) => val !== null);

                                                                if (
                                                                    !validValues ||
                                                                    validValues.length === 0
                                                                ) {
                                                                    return "NULL";
                                                                }

                                                                return (
                                                                    Math.round(
                                                                        (validValues.reduce(
                                                                            (sum, val) => sum + val,
                                                                            0,
                                                                        ) /
                                                                            validValues.length) *
                                                                            1000,
                                                                    ) /
                                                                        1000 +
                                                                    " ‰"
                                                                );
                                                            })()}
                                                        </div>
                                                        <div className="stat-label">TB tất cả năm</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Statistics Table */}
                            <div className="row mb-4">
                                <div className="col-12">
                                    <div className="card">
                                        <div className="card-header">
                                            <h5 className="card-title mb-0">
                                                Số liệu quan trắc độ mặn trên sông rạch TPHCM{" "}
                                                {new Date(reportData.reportDate).toLocaleDateString("vi-VN")}
                                            </h5>
                                        </div>
                                        <div className="card-body">
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
                                                                    <span>Tên trạm</span>
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
                                                                    <span>
                                                                        {getPreviousObservationDateLabel()}
                                                                    </span>
                                                                    {getSortIcon("previousSalinity")}
                                                                </div>
                                                            </th>
                                                            <th
                                                                style={{
                                                                    width: "17.5%",
                                                                    cursor: "pointer",
                                                                    userSelect: "none",
                                                                }}
                                                                onClick={() =>
                                                                    handleSort("prevYearMonthlyAvg")
                                                                }
                                                            >
                                                                <div className="d-flex align-items-center justify-content-center">
                                                                    <span>
                                                                        Độ mặn tháng{" "}
                                                                        {getCurrentMonthYear().month}/
                                                                        {getCurrentMonthYear().year - 1} (‰)
                                                                    </span>
                                                                    {getSortIcon("prevYearMonthlyAvg")}
                                                                </div>
                                                            </th>
                                                            <th
                                                                style={{
                                                                    width: "17.5%",
                                                                    cursor: "pointer",
                                                                    userSelect: "none",
                                                                }}
                                                                onClick={() =>
                                                                    handleSort("allYearsMonthlyAvg")
                                                                }
                                                            >
                                                                <div className="d-flex align-items-center justify-content-center">
                                                                    <span>
                                                                        Độ mặn tháng{" "}
                                                                        {getCurrentMonthYear().month}/TBNN (‰)
                                                                    </span>
                                                                    {getSortIcon("allYearsMonthlyAvg")}
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
                                                                        {formatSalinity(
                                                                            station.currentSalinity,
                                                                        )}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span
                                                                        className={`salinity-value ${getSalinityClassLocal(station.previousSalinity, station.stationCode)}`}
                                                                    >
                                                                        {formatSalinity(
                                                                            station.previousSalinity,
                                                                        )}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span
                                                                        className={`salinity-value ${getSalinityClassLocal(
                                                                            calculateArrayAverage(
                                                                                station.prevYearMonthlyData,
                                                                            ),
                                                                            station.stationCode,
                                                                        )}`}
                                                                    >
                                                                        {formatSalinity(
                                                                            calculateArrayAverage(
                                                                                station.prevYearMonthlyData,
                                                                            ),
                                                                        )}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span
                                                                        className={`salinity-value ${getSalinityClassLocal(
                                                                            calculateArrayAverage(
                                                                                station.allYearsMonthlyData,
                                                                            ),
                                                                            station.stationCode,
                                                                        )}`}
                                                                    >
                                                                        {formatSalinity(
                                                                            calculateArrayAverage(
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

                                            <div className="legend mt-3">
                                                <h6>Chú thích cấp độ rủi ro thiên tai do xâm nhập mặn:</h6>
                                                <div className="d-flex gap-3">
                                                    <span className="legend-item">
                                                        <span className="legend-color salinity-normal"></span>
                                                        Bình thường (độ mặn tại các điểm &lt;1‰)
                                                    </span>
                                                    <span className="legend-item">
                                                        <span className="legend-color salinity-warning"></span>
                                                        Rủi ro cấp 1 (độ mặn tại Nhà Bè 1-4‰)
                                                    </span>
                                                    <span className="legend-item">
                                                        <span className="legend-color salinity-high-warning"></span>
                                                        Rủi ro cấp 2 (độ mặn tại Nhà Bè &gt;4‰, các điểm khác
                                                        1-4‰)
                                                    </span>
                                                    <span className="legend-item">
                                                        <span className="legend-color salinity-critical"></span>
                                                        Rủi ro cấp 3 (độ mặn tại các điểm &gt;4‰)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="container">
                                <div className="row">
                                    <div className="col-12">
                                        <div className="card">
                                            <div className="card-header">
                                                <h5 className="card-title mb-0">
                                                    Giá trị độ mặn tại các trạm quan trắc{" "}
                                                    {new Date(reportData.reportDate).toLocaleDateString(
                                                        "vi-VN",
                                                    )}{" "}
                                                    so với độ mặn quan trắc liền trước, trung bình tháng cùng
                                                    kỳ năm trước và trung bình tháng cùng kỳ nhiều năm
                                                </h5>
                                            </div>
                                            <div className="card-body">
                                                {getChartData() && (
                                                    <div className="chart-container">
                                                        <div className="chart-wrapper">
                                                            <Bar
                                                                data={getChartData()}
                                                                options={getChartOptions()}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
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
