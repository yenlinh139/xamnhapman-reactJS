/**
 * React Components cho Hydrometeorology Statistics
 */

import React, { useState, useMemo } from "react";
import {
    useHydroDashboard,
    useRainfallStats,
    useWaterLevelStats,
    useWeatherAlerts,
    useHydroSummary,
    useMonthlyStats,
    getDateRangePresets,
    formatDate,
} from "@services/hydrometeorologyStatsService";

// ================================
// REACT COMPONENTS
// ================================

/**
 * Dashboard Component
 */
export const HydroDashboard = ({ period = "7days", className = "" }) => {
    const { dashboard, loading, error } = useHydroDashboard(period);

    if (loading) {
        return (
            <div className={`hydro-loading ${className}`}>
                <div className="loading-spinner">Đang tải dashboard...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`hydro-error ${className}`}>
                <div className="error-message">⚠️ Lỗi: {error}</div>
            </div>
        );
    }

    if (!dashboard) {
        return (
            <div className={`hydro-no-data ${className}`}>
                <div className="no-data-message">📊 Không có dữ liệu dashboard</div>
            </div>
        );
    }

    return (
        <div className={`hydro-dashboard ${className}`}>
            <div className="dashboard-header">
                <h2>📊 Dashboard Khí tượng Thủy văn</h2>
                <p className="dashboard-period">{dashboard.period?.description || `Dữ liệu ${period}`}</p>
            </div>

            <div className="dashboard-grid">
                {/* Weather Summary Card */}
                {dashboard.weather_summary && (
                    <div className="weather-card dashboard-card">
                        <h3>🌧️ Thời tiết</h3>
                        <div className="stats-grid">
                            {dashboard.weather_summary.rainfall && (
                                <>
                                    <div className="stat-item">
                                        <span className="stat-label">Tổng lượng mưa</span>
                                        <span className="stat-value">
                                            {dashboard.weather_summary.rainfall.total || 0}mm
                                        </span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Mưa TB/ngày</span>
                                        <span className="stat-value">
                                            {dashboard.weather_summary.rainfall.daily_average || 0}mm
                                        </span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Ngày mưa</span>
                                        <span className="stat-value">
                                            {dashboard.weather_summary.rainfall.rainy_days || 0} ngày
                                            {dashboard.weather_summary.rainfall.rainy_percentage &&
                                                ` (${dashboard.weather_summary.rainfall.rainy_percentage})`}
                                        </span>
                                    </div>
                                </>
                            )}
                            {dashboard.weather_summary.temperature && (
                                <div className="stat-item">
                                    <span className="stat-label">Nhiệt độ TB</span>
                                    <span className="stat-value">
                                        {dashboard.weather_summary.temperature.average || 0}°C
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Hydro Summary Card */}
                {dashboard.hydro_summary && (
                    <div className="hydro-card dashboard-card">
                        <h3>Thủy văn</h3>
                        <div className="stations-grid">
                            {dashboard.hydro_summary.nha_be && (
                                <div className="station-data">
                                    <h4>Nhà Bè</h4>
                                    <p>TB: {dashboard.hydro_summary.nha_be.avg_level || "N/A"}cm</p>
                                    <p>Max: {dashboard.hydro_summary.nha_be.max_level || "N/A"}cm</p>
                                    <p>Min: {dashboard.hydro_summary.nha_be.min_level || "N/A"}cm</p>
                                </div>
                            )}
                            {dashboard.hydro_summary.phu_an && (
                                <div className="station-data">
                                    <h4>Phú An</h4>
                                    <p>TB: {dashboard.hydro_summary.phu_an.avg_level || "N/A"}cm</p>
                                    <p>Max: {dashboard.hydro_summary.phu_an.max_level || "N/A"}cm</p>
                                    <p>Min: {dashboard.hydro_summary.phu_an.min_level || "N/A"}cm</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Alerts Card */}
                <div className="alerts-card dashboard-card">
                    <h3>⚠️ Cảnh báo</h3>
                    <div className="alert-summary">
                        {dashboard.alerts && dashboard.alerts.count > 0 ? (
                            <span className="has-alerts">
                                ⚠️ {dashboard.alerts.description || `${dashboard.alerts.count} cảnh báo`}
                            </span>
                        ) : (
                            <span className="no-alerts">✅ Không có cảnh báo</span>
                        )}
                    </div>
                </div>

                {/* Data Coverage */}
                {dashboard.data_coverage && (
                    <div className="coverage-card dashboard-card">
                        <h3>📈 Dữ liệu</h3>
                        <div className="coverage-info">
                            {dashboard.data_coverage.weather && (
                                <p>Khí tượng: {dashboard.data_coverage.weather.total_records || 0} bản ghi</p>
                            )}
                            {dashboard.data_coverage.hydro && (
                                <p>Thủy văn: {dashboard.data_coverage.hydro.total_records || 0} bản ghi</p>
                            )}
                            {dashboard.data_coverage.weather?.last_update && (
                                <p>
                                    Cập nhật:{" "}
                                    {new Date(dashboard.data_coverage.weather.last_update).toLocaleDateString(
                                        "vi-VN",
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Rainfall Stats Chart Component
 */
export const RainfallStatsChart = ({ startDate, endDate, className = "" }) => {
    const [orderBy, setOrderBy] = useState("total_desc");
    const { data, loading, error } = useRainfallStats({ startDate, endDate, orderBy });

    const chartData = useMemo(() => {
        if (!Array.isArray(data)) return [];

        return data.map((station) => ({
            name: station.station_name || station.tenTram,
            code: station.station_code || station.maTram,
            total: parseFloat(station.total_rainfall || station.tongMua || 0),
            average: parseFloat(station.avg_rainfall || station.muaTrungBinh || 0),
            rainyDays: station.rainy_days || station.ngayMua || 0,
            percentage: parseFloat(station.rainy_days_percentage || station.phanTramNgayMua || 0),
        }));
    }, [data]);

    if (loading) {
        return <div className={`loading ${className}`}>Đang tải dữ liệu mưa...</div>;
    }

    if (error) {
        return <div className={`error ${className}`}>❌ Lỗi: {error}</div>;
    }

    return (
        <div className={`rainfall-stats-chart ${className}`}>
            <div className="chart-header">
                <h3>📊 Thống kê lượng mưa theo trạm</h3>
                <select value={orderBy} onChange={(e) => setOrderBy(e.target.value)} className="sort-select">
                    <option value="total_desc">Tổng lượng mưa (Giảm dần)</option>
                    <option value="total_asc">Tổng lượng mưa (Tăng dần)</option>
                    <option value="avg_desc">Trung bình (Giảm dần)</option>
                    <option value="avg_asc">Trung bình (Tăng dần)</option>
                </select>
            </div>

            <div className="stations-list">
                {chartData.length === 0 ? (
                    <div className="no-data">📊 Không có dữ liệu lượng mưa</div>
                ) : (
                    chartData.map((station) => (
                        <div key={station.code} className="station-card">
                            <div className="station-header">
                                <h4>{station.name}</h4>
                                <span className="station-code">({station.code})</span>
                            </div>
                            <div className="station-stats">
                                <div className="stat">
                                    <span className="label">Tổng lượng mưa:</span>
                                    <span className="value">{station.total.toFixed(1)}mm</span>
                                </div>
                                <div className="stat">
                                    <span className="label">Trung bình/ngày:</span>
                                    <span className="value">{station.average.toFixed(2)}mm</span>
                                </div>
                                <div className="stat">
                                    <span className="label">Ngày mưa:</span>
                                    <span className="value">
                                        {station.rainyDays} ngày ({station.percentage.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>

                            {/* Progress bar for visualization */}
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{
                                        width: `${Math.min(station.percentage, 100)}%`,
                                        backgroundColor: station.percentage > 50 ? "#4CAF50" : "#FF9800",
                                    }}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

/**
 * Water Level Stats Component
 */
export const WaterLevelStatsChart = ({ startDate, endDate, className = "" }) => {
    const [orderBy, setOrderBy] = useState("avg_desc");
    const { data, loading, error } = useWaterLevelStats({ startDate, endDate, orderBy });

    const chartData = useMemo(() => {
        if (!Array.isArray(data)) return [];

        return data.map((station) => ({
            name: station.station_name || station.tenTram,
            code: station.station_code || station.maTram,
            avgLevel: parseFloat(station.avg_water_level || station.mucNuocTB || 0),
            maxLevel: parseFloat(station.max_water_level || station.mucNuocMax || 0),
            minLevel: parseFloat(station.min_water_level || station.mucNuocMin || 0),
        }));
    }, [data]);

    if (loading) {
        return <div className={`loading ${className}`}>Đang tải dữ liệu mực nước...</div>;
    }

    if (error) {
        return <div className={`error ${className}`}>❌ Lỗi: {error}</div>;
    }

    return (
        <div className={`water-level-stats-chart ${className}`}>
            <div className="chart-header">
                <h3>🌊 Thống kê mực nước theo trạm</h3>
                <select value={orderBy} onChange={(e) => setOrderBy(e.target.value)} className="sort-select">
                    <option value="avg_desc">Mực nước TB (Giảm dần)</option>
                    <option value="avg_asc">Mực nước TB (Tăng dần)</option>
                    <option value="max_desc">Mực nước cao nhất (Giảm dần)</option>
                    <option value="max_asc">Mực nước cao nhất (Tăng dần)</option>
                </select>
            </div>

            <div className="stations-list">
                {chartData.length === 0 ? (
                    <div className="no-data">🌊 Không có dữ liệu mực nước</div>
                ) : (
                    chartData.map((station) => (
                        <div key={station.code} className="station-card">
                            <div className="station-header">
                                <h4>{station.name}</h4>
                                <span className="station-code">({station.code})</span>
                            </div>
                            <div className="station-stats">
                                <div className="stat">
                                    <span className="label">Mực nước TB:</span>
                                    <span className="value">{station.avgLevel.toFixed(1)}cm</span>
                                </div>
                                <div className="stat">
                                    <span className="label">Mực nước cao nhất:</span>
                                    <span className="value">{station.maxLevel.toFixed(1)}cm</span>
                                </div>
                                <div className="stat">
                                    <span className="label">Mực nước thấp nhất:</span>
                                    <span className="value">{station.minLevel.toFixed(1)}cm</span>
                                </div>
                            </div>

                            {/* Visual representation */}
                            <div className="level-indicator">
                                <div className="level-bar">
                                    <div
                                        className="avg-marker"
                                        style={{
                                            left: `${Math.max(0, Math.min(100, (station.avgLevel / station.maxLevel) * 100))}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

/**
 * Weather Alerts Component
 */
export const WeatherAlerts = ({ alertType = "all", days = 7, className = "" }) => {
    const { alerts, summary, loading, error } = useWeatherAlerts(alertType, days);

    const getSeverityColor = (severity) => {
        switch (severity) {
            case "critical":
                return "#FF4444";
            case "high":
                return "#FF8800";
            case "medium":
                return "#FFAA00";
            default:
                return "#888888";
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case "critical":
                return "🚨";
            case "high":
                return "⚠️";
            case "medium":
                return "⚡";
            default:
                return "ℹ️";
        }
    };

    const getSeverityLabel = (severity) => {
        switch (severity) {
            case "critical":
                return "Nghiêm trọng";
            case "high":
                return "Cao";
            case "medium":
                return "Trung bình";
            default:
                return "Thông tin";
        }
    };

    if (loading) {
        return <div className={`loading ${className}`}>Đang tải cảnh báo...</div>;
    }

    if (error) {
        return <div className={`error ${className}`}>❌ Lỗi: {error}</div>;
    }

    return (
        <div className={`weather-alerts ${className}`}>
            <div className="alerts-header">
                <h3>⚠️ Cảnh báo thời tiết & thủy văn ({days} ngày qua)</h3>
                <div className="alerts-summary">
                    <span className="critical">🚨 Nghiêm trọng: {summary.critical || 0}</span>
                    <span className="high">⚠️ Cao: {summary.high || 0}</span>
                    <span className="medium">⚡ Trung bình: {summary.medium || 0}</span>
                </div>
            </div>

            {!Array.isArray(alerts) || alerts.length === 0 ? (
                <div className="no-alerts">
                    <p>✅ Không có cảnh báo nào trong {days} ngày qua</p>
                </div>
            ) : (
                <div className="alerts-list">
                    {alerts.slice(0, 10).map((alert, index) => (
                        <div
                            key={index}
                            className="alert-item"
                            style={{
                                borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                            }}
                        >
                            <div className="alert-header">
                                <span className="alert-icon">{getSeverityIcon(alert.severity)}</span>
                                <span className="alert-date">
                                    {alert.alert_date
                                        ? new Date(alert.alert_date).toLocaleDateString("vi-VN")
                                        : "N/A"}
                                </span>
                                <span className={`alert-severity ${alert.severity}`}>
                                    {getSeverityLabel(alert.severity)}
                                </span>
                            </div>
                            <div className="alert-content">
                                <h5>{alert.alert_description || alert.description}</h5>
                                <p>
                                    {alert.value} {alert.unit} - {alert.category}
                                    {alert.station_name && ` tại ${alert.station_name}`}
                                </p>
                            </div>
                        </div>
                    ))}

                    {alerts.length > 10 && (
                        <div className="more-alerts">
                            <p>... và {alerts.length - 10} cảnh báo khác</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Summary Stats Component
 */
export const HydroSummary = ({ startDate, endDate, className = "" }) => {
    const { data, loading, error } = useHydroSummary(startDate, endDate);

    if (loading) {
        return <div className={`loading ${className}`}>Đang tải thống kê tổng quan...</div>;
    }

    if (error) {
        return <div className={`error ${className}`}>❌ Lỗi: {error}</div>;
    }

    if (!data) {
        return <div className={`no-data ${className}`}>📊 Không có dữ liệu thống kê</div>;
    }

    return (
        <div className={`hydro-summary ${className}`}>
            <div className="summary-header">
                <h3>📋 Thống kê tổng quan khí tượng thủy văn</h3>
                {startDate && endDate && (
                    <p>
                        Từ {new Date(startDate).toLocaleDateString("vi-VN")} đến{" "}
                        {new Date(endDate).toLocaleDateString("vi-VN")}
                    </p>
                )}
            </div>

            <div className="summary-grid">
                {/* System Summary */}
                {data.summary && (
                    <div className="summary-card">
                        <h4>🏢 Hệ thống</h4>
                        <div className="summary-stats">
                            <p>
                                Tổng số trạm: <strong>{data.summary.total_stations || 0}</strong>
                            </p>
                            <p>
                                Bản ghi khí tượng: <strong>{data.summary.total_weather_records || 0}</strong>
                            </p>
                            <p>
                                Bản ghi thủy văn: <strong>{data.summary.total_hydro_records || 0}</strong>
                            </p>
                        </div>
                    </div>
                )}

                {/* Weather Summary */}
                {data.weather && (
                    <div className="summary-card">
                        <h4>🌧️ Thời tiết</h4>
                        <div className="summary-stats">
                            {data.weather.rainfall && (
                                <>
                                    <p>
                                        Mưa TB toàn vùng:{" "}
                                        <strong>{data.weather.rainfall.average_total || 0}mm</strong>
                                    </p>
                                    <p>
                                        Mưa lớn nhất:{" "}
                                        <strong>{data.weather.rainfall.maximum_total || 0}mm</strong>
                                    </p>
                                </>
                            )}
                            {data.weather.temperature && (
                                <>
                                    <p>
                                        Nhiệt độ TB:{" "}
                                        <strong>{data.weather.temperature.average || 0}°C</strong>
                                    </p>
                                    <p>
                                        Nhiệt độ cao nhất:{" "}
                                        <strong>{data.weather.temperature.maximum || 0}°C</strong>
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Hydrology Summary */}
                {data.hydrology && (
                    <div className="summary-card">
                        <h4>Thủy văn</h4>
                        <div className="summary-stats">
                            {data.hydrology.water_level_nb && (
                                <>
                                    <p>
                                        Mực nước TB (Nhà Bè):{" "}
                                        <strong>{data.hydrology.water_level_nb.average || 0}cm</strong>
                                    </p>
                                    <p>
                                        Mực nước cao nhất (Nhà Bè):{" "}
                                        <strong>{data.hydrology.water_level_nb.maximum || 0}cm</strong>
                                    </p>
                                </>
                            )}
                            {data.hydrology.water_level_pa && (
                                <>
                                    <p>
                                        Mực nước TB (Phú An):{" "}
                                        <strong>{data.hydrology.water_level_pa.average || 0}cm</strong>
                                    </p>
                                    <p>
                                        Mực nước cao nhất (Phú An):{" "}
                                        <strong>{data.hydrology.water_level_pa.maximum || 0}cm</strong>
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Date Range Selector Component
 */
export const DateRangeSelector = ({ onDateRangeChange, className = "" }) => {
    const [selectedPreset, setSelectedPreset] = useState("7days");
    const [customRange, setCustomRange] = useState({ startDate: "", endDate: "" });
    const [useCustom, setUseCustom] = useState(false);

    const presets = getDateRangePresets();

    const handlePresetChange = (preset) => {
        setSelectedPreset(preset);
        setUseCustom(false);
        if (onDateRangeChange) {
            onDateRangeChange(presets[preset]);
        }
    };

    const handleCustomRangeChange = (field, value) => {
        const newRange = { ...customRange, [field]: value };
        setCustomRange(newRange);

        if (newRange.startDate && newRange.endDate && onDateRangeChange) {
            onDateRangeChange({
                startDate: newRange.startDate,
                endDate: newRange.endDate,
                label: "Tùy chỉnh",
            });
        }
    };

    const toggleCustom = () => {
        setUseCustom(!useCustom);
        if (!useCustom && onDateRangeChange) {
            // Switching to custom, don't emit change yet
        } else if (useCustom && onDateRangeChange) {
            // Switching back to preset
            handlePresetChange(selectedPreset);
        }
    };

    return (
        <div className={`date-range-selector ${className}`}>
            <div className="preset-options">
                <label>
                    <input type="radio" checked={!useCustom} onChange={toggleCustom} />
                    Chọn khoảng thời gian:
                </label>

                {!useCustom && (
                    <select
                        value={selectedPreset}
                        onChange={(e) => handlePresetChange(e.target.value)}
                        disabled={useCustom}
                    >
                        {Object.entries(presets).map(([key, preset]) => (
                            <option key={key} value={key}>
                                {preset.label}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <div className="custom-range">
                <label>
                    <input type="radio" checked={useCustom} onChange={toggleCustom} />
                    Tùy chỉnh:
                </label>

                {useCustom && (
                    <div className="custom-inputs">
                        <input
                            type="date"
                            value={customRange.startDate}
                            onChange={(e) => handleCustomRangeChange("startDate", e.target.value)}
                            disabled={!useCustom}
                        />
                        <span>đến</span>
                        <input
                            type="date"
                            value={customRange.endDate}
                            onChange={(e) => handleCustomRangeChange("endDate", e.target.value)}
                            disabled={!useCustom}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// Export all components
export {
    HydroDashboard,
    RainfallStatsChart,
    WaterLevelStatsChart,
    WeatherAlerts,
    HydroSummary,
    DateRangeSelector,
};
