import React, { useEffect, useRef, useState } from "react";
import axiosInstance from "@config/axios-config";
import SalinityBarChart from "@pages/map/SalinityBarChart";
import ForecastLineChart from "@pages/map/ForecastLineChart";
import SalinityRiskLegend, { RISK_COLOR_MAP } from "@pages/map/SalinityRiskLegend";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { getDisplayStationName, getFilenameSafeStationName } from "@common/stationMapping";
import { getSingleStationClassification } from "@common/salinityClassification";
import "@styles/components/_hydrometChart.scss";
import LocalizedDateInput from "@components/common/LocalizedDateInput";

const parseNumber = (value) => {
    if (value === null || value === undefined || value === "" || value === "NULL") {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    const raw = String(value).trim();
    if (!raw) return null;

    // Keep backend dot-decimal values intact; only normalize optional comma input.
    const normalized = raw.includes(".") ? raw.replace(/,/g, "") : raw.replace(",", ".");

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

const formatNumberVi = (value, fractionDigits = 2) => {
    const parsed = parseNumber(value);
    if (parsed === null) return "-";

    return parsed.toLocaleString("vi-VN", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });
};

const ExportPreviewTable = ({ data, kiHieu }) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    const sortedData = React.useMemo(() => {
        const effectiveSort = sortConfig.key ? sortConfig : { key: "date", direction: "desc" };

        const sorted = [...data].sort((a, b) => {
            let aValue = a[effectiveSort.key];
            let bValue = b[effectiveSort.key];

            if (effectiveSort.key === "date") {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            } else if (effectiveSort.key === "salinity") {
                aValue = Number(aValue);
                bValue = Number(bValue);
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

    return (
        <div className="table-responsive mb-3 map-data-table-wrap">
            <table className="table table-bordered table-sm table-striped map-data-table">
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
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((item, idx) => {
                        const riskClassification = getSingleStationClassification(item.salinity, kiHieu);

                        return (
                            <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td>{new Date(item.date).toLocaleDateString("vi-VN")}</td>
                                <td
                                    className="text-end fw-bold"
                                    style={{
                                        backgroundColor:
                                            RISK_COLOR_MAP[riskClassification.class] || "#6c757d",
                                        color: "white",
                                    }}
                                >
                                    {formatNumberVi(item.salinity, 2)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const ForecastDataTable = ({ points, kiHieu }) => {
    return (
        <div className="table-responsive mb-3 map-data-table-wrap">
            <table className="table table-bordered table-sm table-striped map-data-table">
                <thead className="table-light">
                    <tr>
                        <th style={{ width: "60px" }}>#</th>
                        <th>Thời điểm</th>
                        <th>Độ mặn dự báo (‰)</th>
                        <th>Cấp độ</th>
                    </tr>
                </thead>
                <tbody>
                    {points.map((item, idx) => {
                        const riskClassification = getSingleStationClassification(item.salinity, kiHieu);

                        return (
                            <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td>{new Date(item.time).toLocaleString("vi-VN")}</td>
                                <td
                                    className="text-end fw-bold"
                                    style={{
                                        backgroundColor:
                                            RISK_COLOR_MAP[riskClassification.class] || "#6c757d",
                                        color: "white",
                                    }}
                                >
                                    {formatNumberVi(item.salinity, 2)}
                                </td>
                                <td>{riskClassification.shortText}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const SaltChartFull = ({ show, kiHieu, tenDiem, salinityData, onClose }) => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("access_token");

    // Get display name for the station using utility function
    const displayStationName = getDisplayStationName(tenDiem, kiHieu);
    const filenameSafeName = getFilenameSafeStationName(displayStationName);

    const [data, setData] = useState([]);
    const [exportRange, setExportRange] = useState({
        startDate: "",
        endDate: "",
    });
    const [filteredData, setFilteredData] = useState([]);

    // 2 tab chính: "forecast" (Dự báo, hiện trước) và "actual" (Quan trắc).
    // Mỗi tab chính có chung 2 tab con: "chart" (Biểu đồ) / "data" (Dữ liệu).
    const [mainTab, setMainTabState] = useState("forecast");
    const [subTab, setSubTab] = useState("chart");
    // Đánh dấu người dùng đã tự chọn tab chính, để không tự động ghi đè lựa chọn của họ
    const userPickedMainTabRef = useRef(false);

    const selectMainTab = (tab) => {
        userPickedMainTabRef.current = true;
        setMainTabState(tab);
    };

    // Dữ liệu dự báo (10 ngày tới) - lấy từ /forecast-stations (biết trạm nào có dự báo)
    // và /forecast-latest (dữ liệu thật, chỉ fetch khi tab Dự báo được chọn)
    const [forecastStations, setForecastStations] = useState([]);
    const [forecastState, setForecastState] = useState({
        loading: false,
        error: null,
        loaded: false,
        points: [],
        issuedAt: null,
        isSynthetic: false,
    });

    const hasForecast = forecastStations.find((s) => s.manualCode === kiHieu)?.hasForecast || false;

    useEffect(() => {
        if (show && salinityData) {
            // Lọc bỏ các ngày có giá trị NULL
            const validSalinityData = salinityData.filter(
                (item) => item.salinity !== null && item.salinity !== "NULL" && !isNaN(item.salinity),
            );

            setData(validSalinityData);
            setFilteredData(validSalinityData);
            if (validSalinityData.length > 0) {
                setExportRange({
                    startDate: validSalinityData[0].date.split("T")[0],
                    endDate: validSalinityData[validSalinityData.length - 1].date.split("T")[0],
                });
            }
        } else {
            setData([]);
            setFilteredData([]);
            setExportRange({ startDate: "", endDate: "" });
        }
    }, [show, salinityData]);

    useEffect(() => {
        if (!show) {
            setData([]);
            setFilteredData([]);
        }
    }, [show]);

    useEffect(() => {
        if (show) {
            setMainTabState("forecast");
            setSubTab("chart");
            userPickedMainTabRef.current = false;
            setForecastState({
                loading: false,
                error: null,
                loaded: false,
                points: [],
                issuedAt: null,
                isSynthetic: false,
            });
        }
    }, [show, kiHieu]);

    // Danh sách trạm có dữ liệu dự báo (fetch 1 lần khi modal mở) để quyết định có hiện tab "Dự báo" hay không
    useEffect(() => {
        if (!show) return;

        axiosInstance
            .get("/forecast-stations")
            .then((res) => setForecastStations(res.data || []))
            .catch((error) => console.error("❌ Lấy danh sách trạm dự báo lỗi:", error));
    }, [show]);

    // Trạm không có dự báo (vd KXD2) -> tự chuyển về tab "Quan trắc", trừ khi người dùng đã tự bấm chọn tab
    useEffect(() => {
        if (show && forecastStations.length > 0 && !hasForecast && !userPickedMainTabRef.current) {
            setMainTabState("actual");
        }
    }, [show, forecastStations, hasForecast]);

    // Chỉ fetch dữ liệu dự báo thật khi tab "Dự báo" đang mở và trạm có dự báo
    useEffect(() => {
        if (mainTab !== "forecast" || !hasForecast || forecastState.loaded || forecastState.loading) return;

        setForecastState((prev) => ({ ...prev, loading: true, error: null }));

        axiosInstance
            .get("/forecast-latest")
            .then((res) => {
                const { timeGrid, stations, issuedAt, isSynthetic, intervalHours, horizonDays } = res.data;
                const station = stations.find((s) => s.manualCode === kiHieu);
                const points = timeGrid.map((time, index) => ({
                    time,
                    salinity: station ? station.values[index] : null,
                    dailySalinity: station ? station.dailyValues?.[index] : null,
                }));

                setForecastState({
                    loading: false,
                    error: null,
                    loaded: true,
                    points,
                    issuedAt,
                    isSynthetic,
                    intervalHours,
                    horizonDays,
                });
            })
            .catch((error) => {
                console.error("❌ Lấy dữ liệu dự báo lỗi:", error);
                const message =
                    error.response?.status === 404
                        ? "Chưa có dữ liệu dự báo"
                        : "Không thể tải dữ liệu dự báo từ máy chủ";
                setForecastState((prev) => ({ ...prev, loading: false, error: message, loaded: true }));
            });
    }, [mainTab, hasForecast, kiHieu, forecastState.loaded, forecastState.loading]);

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
        if (!isLoggedIn) {
            alert("Bạn cần đăng nhập để xuất dữ liệu Excel");
            return;
        }

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

    // Xuất Excel dữ liệu dự báo của trạm (tạo trực tiếp ở client, cùng cấu trúc với file quan trắc)
    const handleExportForecastExcel = () => {
        if (!isLoggedIn) {
            alert("Bạn cần đăng nhập để xuất dữ liệu Excel");
            return;
        }

        const points = forecastState.points.filter((p) => parseNumber(p.salinity) !== null);
        if (points.length === 0) {
            alert("Không có dữ liệu dự báo để xuất");
            return;
        }

        try {
            const formatted = points.map((item, index) => ({
                STT: index + 1,
                "Thời điểm": new Date(item.time).toLocaleString("vi-VN"),
                "Độ mặn dự báo (‰)": parseNumber(item.salinity),
                "Cấp độ": getSingleStationClassification(item.salinity, kiHieu).shortText,
                "Điểm đo": displayStationName || kiHieu || "",
            }));

            const worksheet = XLSX.utils.json_to_sheet(formatted);
            worksheet["!cols"] = [{ wch: 5 }, { wch: 20 }, { wch: 18 }, { wch: 25 }, { wch: 20 }];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Dữ liệu dự báo");

            const metaData = [
                ["Thông tin xuất dữ liệu dự báo"],
                ["Điểm đo:", displayStationName || kiHieu],
                ["Ký hiệu:", kiHieu],
                [
                    "Phát hành lúc:",
                    forecastState.issuedAt ? new Date(forecastState.issuedAt).toLocaleString("vi-VN") : "-",
                ],
                ["Từ thời điểm:", new Date(points[0].time).toLocaleString("vi-VN")],
                ["Đến thời điểm:", new Date(points[points.length - 1].time).toLocaleString("vi-VN")],
                ["Bước thời gian:", forecastState.intervalHours ? `${forecastState.intervalHours} giờ` : "-"],
                ["Tầm dự báo:", forecastState.horizonDays ? `${forecastState.horizonDays} ngày` : "-"],
                ["Dữ liệu giả lập:", forecastState.isSynthetic ? "Có" : "Không"],
                ["Tổng số bản ghi:", formatted.length],
                ["Thời gian xuất:", new Date().toLocaleString("vi-VN")],
            ];
            const metaWorksheet = XLSX.utils.aoa_to_sheet(metaData);
            metaWorksheet["!cols"] = [{ wch: 20 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(workbook, metaWorksheet, "Thông tin");

            const toFileDate = (time) => String(time).slice(0, 10);
            const fileName = `du_bao_do_man_${filenameSafeName}_${toFileDate(points[0].time)}_${toFileDate(points[points.length - 1].time)}.xlsx`;
            XLSX.writeFile(workbook, fileName, { bookType: "xlsx" });
        } catch (error) {
            console.error("❌ Xuất Excel dự báo lỗi:", error);
            alert("Không thể xuất dữ liệu dự báo.");
        }
    };

    const downloadChart = async () => {
        if (!isLoggedIn) {
            alert("Bạn cần đăng nhập để tải xuống biểu đồ");
            return;
        }

        const isForecast = mainTab === "forecast";
        const chartTitle = isForecast ? "Dự báo độ mặn" : "Diễn biến độ mặn";
        const rangeStart = isForecast ? forecastStartDate : startDate;
        const rangeEnd = isForecast ? forecastEndDate : endDate;
        const chartElementId = isForecast ? "forecast-salinity-chart" : "salinity-chart";
        const filePrefix = isForecast ? "bieu_do_du_bao_do_man" : "bieu_do_do_man";

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
                    ${chartTitle} - ${displayStationName}
                </h5>
                ${
                    rangeStart && rangeEnd
                        ? `
                    <div style="color: #6c757d; font-size: 14px">
                        📅 Từ <strong>${rangeStart}</strong> đến <strong>${rangeEnd}</strong>
                    </div>
                `
                        : ""
                }
            `;
            chartContainer.appendChild(titleDiv);

            // Sao chép phần biểu đồ
            const chartElement = document.getElementById(chartElementId);
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
            link.download = `${filePrefix}_${filenameSafeName}_${new Date().getTime()}.png`;
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

    const forecastStartDate =
        forecastState.points.length > 0
            ? new Date(forecastState.points[0].time).toLocaleDateString("vi-VN")
            : null;
    const forecastEndDate =
        forecastState.points.length > 0
            ? new Date(forecastState.points[forecastState.points.length - 1].time).toLocaleDateString("vi-VN")
            : null;

    return (
        <div
            className={`modal fade map-data-modal salt-chart-modal ${show ? "show d-block" : ""}`}
            tabIndex="-1"
            style={{ backgroundColor: show ? "rgba(0,0,0,0.5)" : "transparent" }}
        >
            <div
                className="modal-dialog modal-xl modal-dialog-centered"
                style={{ maxWidth: "95%", width: "95%", height: "90vh" }}
            >
                <div className="modal-content" style={{ height: "100%", width: "100%" }}>
                    <div className="modal-header border-0 pb-0">
                        <div className="w-100 text-center">
                            <h5 className="modal-title mb-1 fw-bold">
                                Diễn biến độ mặn - {displayStationName}
                            </h5>
                            {mainTab === "forecast"
                                ? forecastStartDate &&
                                  forecastEndDate && (
                                      <div className="text-muted small">
                                          Dự báo từ <strong>{forecastStartDate}</strong> đến{" "}
                                          <strong>{forecastEndDate}</strong>
                                      </div>
                                  )
                                : startDate &&
                                  endDate && (
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

                    <div className="modal-body d-flex flex-column" style={{ minHeight: 0 }}>
                        <div className="chartfull-topbar mb-2">
                            <ul className="nav nav-tabs mb-2" role="tablist">
                                {hasForecast && (
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${mainTab === "forecast" ? "active" : ""}`}
                                            id="main-forecast-tab"
                                            type="button"
                                            onClick={() => selectMainTab("forecast")}
                                        >
                                            Dự báo
                                        </button>
                                    </li>
                                )}
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${mainTab === "actual" ? "active" : ""}`}
                                        id="main-actual-tab"
                                        type="button"
                                        onClick={() => selectMainTab("actual")}
                                    >
                                        Quan trắc
                                    </button>
                                </li>
                            </ul>

                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <ul className="nav nav-pills nav-sm mb-0">
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${subTab === "chart" ? "active" : ""}`}
                                            id="chart-tab"
                                            type="button"
                                            onClick={() => setSubTab("chart")}
                                        >
                                            Biểu đồ
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${subTab === "data" ? "active" : ""}`}
                                            id="data-tab"
                                            type="button"
                                            onClick={() => setSubTab("data")}
                                        >
                                            Dữ liệu
                                        </button>
                                    </li>
                                </ul>

                                {mainTab === "actual" && (
                                    <div className="chartfull-topbar-controls">
                                        <span className="small text-muted fw-semibold">Giai đoạn:</span>
                                        <LocalizedDateInput
                                            className="form-control form-control-sm"
                                            name="startDate"
                                            value={exportRange.startDate}
                                            onChange={handleDateRangeChange}
                                            style={{ width: 145, minWidth: 145 }}
                                        />
                                        <span className="small text-muted">-</span>
                                        <LocalizedDateInput
                                            className="form-control form-control-sm"
                                            name="endDate"
                                            value={exportRange.endDate}
                                            onChange={handleDateRangeChange}
                                            style={{ width: 145, minWidth: 145 }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div
                            className="tab-content h-100"
                            style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
                        >
                            {mainTab === "forecast" && hasForecast && (
                                <div className="h-100">
                                    {forecastState.loading ? (
                                        <p className="text-muted">Đang tải dữ liệu dự báo...</p>
                                    ) : forecastState.error ? (
                                        <p className="text-muted">{forecastState.error}</p>
                                    ) : forecastState.points.length > 0 ? (
                                        <>
                                            {subTab === "chart" ? (
                                                <div className="map-chart-pane h-100">
                                                    <SalinityRiskLegend kiHieu={kiHieu} />
                                                    <div className="d-flex gap-3 small mb-1">
                                                        <span>
                                                            <span
                                                                style={{
                                                                    display: "inline-block",
                                                                    width: 14,
                                                                    height: 2,
                                                                    background: "#0d6efd",
                                                                    marginRight: 4,
                                                                }}
                                                            ></span>
                                                            Dự báo theo 2h (do_man)
                                                        </span>
                                                        <span>
                                                            <span
                                                                style={{
                                                                    display: "inline-block",
                                                                    width: 14,
                                                                    height: 2,
                                                                    background:
                                                                        "repeating-linear-gradient(90deg,#6c757d 0 4px,transparent 4px 7px)",
                                                                    marginRight: 4,
                                                                }}
                                                            ></span>
                                                            Dự báo theo ngày (DailyForecast)
                                                        </span>
                                                    </div>
                                                    <div
                                                        id="forecast-salinity-chart"
                                                        className="map-chart-box"
                                                    >
                                                        <ForecastLineChart
                                                            data={forecastState.points}
                                                            kiHieu={kiHieu}
                                                            height="100%"
                                                        />
                                                    </div>
                                                    <div className="map-chart-footer mt-1 d-flex justify-content-between align-items-center">
                                                        <div className="text-muted small">
                                                            Dự báo 10 ngày tới, mỗi 6 giờ. Phát hành lúc:{" "}
                                                            {forecastState.issuedAt
                                                                ? new Date(
                                                                      forecastState.issuedAt,
                                                                  ).toLocaleString("vi-VN")
                                                                : "-"}
                                                        </div>
                                                        <button
                                                            className={`btn btn-sm ${isLoggedIn ? "btn-outline-primary" : "btn-outline-secondary"}`}
                                                            onClick={downloadChart}
                                                            disabled={!isLoggedIn}
                                                            title={
                                                                !isLoggedIn
                                                                    ? "Bạn cần đăng nhập để tải xuống biểu đồ"
                                                                    : ""
                                                            }
                                                        >
                                                            Tải biểu đồ
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    className="h-100 d-flex flex-column"
                                                    style={{ minHeight: 0 }}
                                                >
                                                    <div
                                                        className="map-data-scroll"
                                                        style={{ flex: 1, minHeight: 0 }}
                                                    >
                                                        <ForecastDataTable
                                                            points={forecastState.points}
                                                            kiHieu={kiHieu}
                                                        />
                                                    </div>
                                                    <div className="d-flex gap-2 justify-content-between align-items-center">
                                                        <div className="text-muted small">
                                                            Hiển thị {forecastState.points.length} bản ghi
                                                        </div>
                                                        <button
                                                            className={`btn btn-sm ${isLoggedIn ? "btn-outline-success" : "btn-outline-secondary"}`}
                                                            onClick={handleExportForecastExcel}
                                                            disabled={!isLoggedIn}
                                                            title={
                                                                !isLoggedIn
                                                                    ? "Bạn cần đăng nhập để xuất dữ liệu Excel"
                                                                    : ""
                                                            }
                                                        >
                                                            Tải dữ liệu
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-muted">Chưa có dữ liệu dự báo.</p>
                                    )}
                                </div>
                            )}

                            {mainTab === "actual" && (
                                <div className="h-100">
                                    {subTab === "chart" ? (
                                        filteredData.length > 0 ? (
                                            <div className="map-chart-pane h-100">
                                                <SalinityRiskLegend kiHieu={kiHieu} />
                                                <div id="salinity-chart" className="map-chart-box">
                                                    <SalinityBarChart
                                                        data={filteredData}
                                                        height="100%"
                                                        kiHieu={kiHieu}
                                                    />
                                                </div>
                                                <div className="map-chart-footer mt-1 d-flex justify-content-between align-items-center">
                                                    <div className="text-muted small">
                                                        Hiển thị: <strong>{filteredData.length}</strong> bản
                                                        ghi
                                                    </div>
                                                    <button
                                                        className={`btn btn-sm ${isLoggedIn ? "btn-outline-primary" : "btn-outline-secondary"}`}
                                                        onClick={downloadChart}
                                                        disabled={!isLoggedIn}
                                                        title={
                                                            !isLoggedIn
                                                                ? "Bạn cần đăng nhập để tải xuống biểu đồ"
                                                                : ""
                                                        }
                                                    >
                                                        Tải biểu đồ
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-muted">Không có dữ liệu hợp lệ.</p>
                                        )
                                    ) : filteredData.length > 0 ? (
                                        <div className="h-100 d-flex flex-column" style={{ minHeight: 0 }}>
                                            <div
                                                className="map-data-scroll"
                                                style={{ flex: 1, minHeight: 0 }}
                                            >
                                                <ExportPreviewTable data={filteredData} kiHieu={kiHieu} />
                                            </div>

                                            <div className="d-flex gap-2 justify-content-between align-items-center">
                                                <div className="text-muted small">
                                                    Hiển thị {filteredData.length} bản ghi
                                                </div>
                                                <button
                                                    className={`btn btn-sm ${isLoggedIn ? "btn-outline-success" : "btn-outline-secondary"}`}
                                                    onClick={handleExportExcel}
                                                    disabled={
                                                        !exportRange.startDate ||
                                                        !exportRange.endDate ||
                                                        !isLoggedIn
                                                    }
                                                    title={
                                                        !isLoggedIn
                                                            ? "Bạn cần đăng nhập để xuất dữ liệu Excel"
                                                            : ""
                                                    }
                                                >
                                                    Tải dữ liệu
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-muted">Không có dữ liệu để hiển thị.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SaltChartFull;
