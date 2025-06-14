import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const calculateTrend = (current, previous) => {
    if (!previous || previous === null || current === null) return null;
    const diff = current - previous;
    return {
        difference: diff.toFixed(2),
        direction: diff > 0 ? "increase" : diff < 0 ? "decrease" : "stable",
        percentage: previous !== 0 ? ((Math.abs(diff) / Math.abs(previous)) * 100).toFixed(1) : "0",
    };
};

const getParameterInfo = (data) => {
    // Priority: Temperature > Rainfall > Water level
    const dataKeys = Object.keys(data).filter((key) => key !== "date" && key !== "Ngày");

    // Temperature parameters (highest priority) - Handle new format
    // Ttb = Nhiệt độ không khí trung bình, Tx = cao nhất, Tm = thấp nhất
    const tempKeys = ["Ttb", "Tx", "Tm"];
    for (const tempKey of tempKeys) {
        if (
            dataKeys.includes(tempKey) &&
            data[tempKey] !== null &&
            data[tempKey] !== undefined &&
            data[tempKey] !== "NULL"
        ) {
            const value = parseFloat(data[tempKey]);
            if (!isNaN(value)) {
                let type, label;
                switch (tempKey) {
                    case "Ttb":
                        type = "avg";
                        label = "Nhiệt độ TB";
                        break;
                    case "Tx":
                        type = "max";
                        label = "Nhiệt độ cao nhất";
                        break;
                    case "Tm":
                        type = "min";
                        label = "Nhiệt độ thấp nhất";
                        break;
                }

                return {
                    key: tempKey,
                    value: value,
                    unit: "°C",
                    category: "temperature",
                    type: type,
                    label: label,
                    color: "#dc3545",
                };
            }
        }
    }

    // Rainfall parameters (second priority) - Handle new format
    // R = Lượng mưa, combined with station codes
    const rainfallKeys = dataKeys.filter((key) => key.startsWith("R") && key !== "R");
    const directRainfall = dataKeys.find((key) => key === "R");

    if (
        directRainfall &&
        data[directRainfall] !== null &&
        data[directRainfall] !== undefined &&
        data[directRainfall] !== "NULL"
    ) {
        const value = parseFloat(data[directRainfall]);
        if (!isNaN(value) && value > 0) {
            return {
                key: directRainfall,
                value: value,
                unit: "mm",
                category: "rainfall",
                type: "total",
                label: "Lượng mưa",
                color: "#0d6efd",
            };
        }
    }

    // Check for rainfall with station codes (R_AP, R_BC, etc.)
    if (rainfallKeys.length > 0) {
        const totalRainfall = rainfallKeys.reduce((sum, key) => {
            const val = parseFloat(data[key]);
            return sum + (isNaN(val) || data[key] === "NULL" ? 0 : val);
        }, 0);

        if (totalRainfall > 0) {
            return {
                key: "total_rainfall",
                value: totalRainfall,
                unit: "mm",
                category: "rainfall",
                type: "total",
                label: "Tổng lượng mưa",
                color: "#0d6efd",
            };
        }
    }

    // Water level parameters (lowest priority) - Handle new format
    // Htb = Mực nước trung bình, Hx = cao nhất, Hm = thấp nhất
    const waterKeys = ["Htb", "Hx", "Hm"];
    for (const waterKey of waterKeys) {
        if (
            dataKeys.includes(waterKey) &&
            data[waterKey] !== null &&
            data[waterKey] !== undefined &&
            data[waterKey] !== "NULL"
        ) {
            const value = parseFloat(data[waterKey]);
            if (!isNaN(value)) {
                let type, label;
                switch (waterKey) {
                    case "Htb":
                        type = "avg";
                        label = "Mực nước TB";
                        break;
                    case "Hx":
                        type = "max";
                        label = "Mực nước cao nhất";
                        break;
                    case "Hm":
                        type = "min";
                        label = "Mực nước thấp nhất";
                        break;
                }

                return {
                    key: waterKey,
                    value: value,
                    unit: "cm",
                    category: "water_level",
                    type: type,
                    label: label,
                    color: "#20c997",
                };
            }
        }
    }

    return null;
};

const getParameterColor = (category, value) => {
    switch (category) {
        case "temperature":
            if (value < 20) return "#007bff"; // Blue for cold
            if (value < 25) return "#28a745"; // Green for cool
            if (value < 30) return "#ffc107"; // Yellow for warm
            if (value < 35) return "#fd7e14"; // Orange for hot
            return "#dc3545"; // Red for very hot
        case "rainfall":
            if (value === 0) return "#6c757d"; // Gray for no rain
            if (value < 10) return "#28a745"; // Green for light rain
            if (value < 50) return "#ffc107"; // Yellow for moderate rain
            if (value < 100) return "#fd7e14"; // Orange for heavy rain
            return "#dc3545"; // Red for very heavy rain
        case "water_level":
            if (value < -50) return "#dc3545"; // Red for very low
            if (value < 0) return "#fd7e14"; // Orange for low
            if (value < 50) return "#ffc107"; // Yellow for normal
            if (value < 100) return "#28a745"; // Green for high
            return "#007bff"; // Blue for very high
        default:
            return "#6c757d";
    }
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
        const currentValue = payload[0].payload;
        // Handle both "date" and "Ngày" fields
        const dateValue = currentValue.date || currentValue.Ngày;
        const formattedDate = dateValue; // Keep original Vietnamese format
        const trend = currentValue.trend;
        const paramInfo = currentValue.paramInfo;

        const getIcon = (category) => {
            switch (category) {
                case "temperature":
                    return "🌡️";
                case "rainfall":
                    return "🌧️";
                case "water_level":
                    return "💧";
                default:
                    return "📊";
            }
        };

        return (
            <div className="bg-white border p-3 rounded shadow-sm" style={{ minWidth: 220, maxWidth: 300 }}>
                <div className="fw-bold mb-2 d-flex align-items-center gap-2 text-primary">
                    <span>{getIcon(paramInfo.category)}</span>
                    <span>{paramInfo.label}</span>
                </div>

                <div className="mb-2">
                    <div className="small text-muted mb-1">📅 Thời gian</div>
                    <div className="fw-semibold">{formattedDate}</div>
                </div>

                <div className="mb-2">
                    <div className="small text-muted mb-1">📊 Giá trị đo được</div>
                    <div className="fs-5 fw-bold" style={{ color: paramInfo.color }}>
                        {paramInfo.value.toFixed(2)} <span className="fs-6">{paramInfo.unit}</span>
                    </div>
                </div>

                {trend && (
                    <div className="border-top pt-2">
                        <div className="small text-muted mb-1">📈 So với lần đo trước</div>
                        <div className="d-flex align-items-center gap-2">
                            <span className="fs-4">
                                {trend.direction === "increase"
                                    ? "📈"
                                    : trend.direction === "decrease"
                                      ? "📉"
                                      : "➡️"}
                            </span>
                            <div>
                                <div
                                    className="fw-semibold"
                                    style={{
                                        color:
                                            trend.direction === "increase"
                                                ? "#dc3545"
                                                : trend.direction === "decrease"
                                                  ? "#198754"
                                                  : "#6c757d",
                                    }}
                                >
                                    {trend.direction === "increase"
                                        ? "Tăng"
                                        : trend.direction === "decrease"
                                          ? "Giảm"
                                          : "Không đổi"}
                                </div>
                                <div className="small">
                                    {Math.abs(trend.difference)} {paramInfo.unit} ({trend.percentage}%)
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Category specific context */}
                <div className="border-top pt-2 mt-2">
                    <div className="small text-muted">
                        {paramInfo.category === "temperature" &&
                            (paramInfo.value < 20
                                ? "🥶 Nhiệt độ thấp"
                                : paramInfo.value < 25
                                  ? "😊 Nhiệt độ mát mẻ"
                                  : paramInfo.value < 30
                                    ? "☀️ Nhiệt độ ấm áp"
                                    : paramInfo.value < 35
                                      ? "🌡️ Nhiệt độ cao"
                                      : "🔥 Nhiệt độ rất cao")}
                        {paramInfo.category === "rainfall" &&
                            (paramInfo.value === 0
                                ? "☀️ Không mưa"
                                : paramInfo.value < 10
                                  ? "🌦️ Mưa nhỏ"
                                  : paramInfo.value < 50
                                    ? "🌧️ Mưa vừa"
                                    : paramInfo.value < 100
                                      ? "⛈️ Mưa to"
                                      : "🌊 Mưa rất to")}
                        {paramInfo.category === "water_level" &&
                            (paramInfo.value < -50
                                ? "⬇️ Mực nước rất thấp"
                                : paramInfo.value < 0
                                  ? "📉 Mực nước thấp"
                                  : paramInfo.value < 50
                                    ? "📊 Mực nước bình thường"
                                    : paramInfo.value < 100
                                      ? "📈 Mực nước cao"
                                      : "⬆️ Mực nước rất cao")}
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const HydrometBarChart = ({ data, height = 200 }) => {
    // Process data to get primary values and trends
    const formattedData = data.map((item, index) => {
        const paramInfo = getParameterInfo(item);

        if (!paramInfo) {
            return {
                ...item,
                primaryValue: 0,
                paramInfo: {
                    key: "no_data",
                    value: 0,
                    unit: "",
                    category: "no_data",
                    label: "Không có dữ liệu",
                    color: "#6c757d",
                },
                trend: null,
            };
        }

        const previousItem = index > 0 ? data[index - 1] : null;
        let previousValue = null;

        if (previousItem) {
            const prevParamInfo = getParameterInfo(previousItem);
            if (prevParamInfo && prevParamInfo.category === paramInfo.category) {
                previousValue = prevParamInfo.value;
            }
        }

        return {
            ...item,
            primaryValue: paramInfo.value,
            paramInfo,
            trend: calculateTrend(paramInfo.value, previousValue),
        };
    });

    const isLoading = !formattedData || formattedData.length === 0;

    // Handle both "date" and "Ngày" fields for year extraction
    const getDateValue = (item) => {
        const dateValue = item.date || item.Ngày;
        // Handle Vietnamese date format (dd/MM/yyyy)
        if (typeof dateValue === "string" && dateValue.includes("/")) {
            const [day, month, year] = dateValue.split("/");
            return new Date(year, month - 1, day);
        }
        return new Date(dateValue);
    };

    const uniqueYears = [...new Set(formattedData.map((d) => getDateValue(d).getFullYear()))];
    const ticksByYear = uniqueYears
        .map((year) => {
            const item = formattedData.find((d) => getDateValue(d).getFullYear() === year);
            return item ? item.date || item.Ngày : null;
        })
        .filter(Boolean);

    // Determine Y-axis domain based on data category
    const getYAxisDomain = () => {
        if (formattedData.length === 0) return [0, 100];

        const categories = formattedData.map((d) => d.paramInfo.category);
        const uniqueCategories = [...new Set(categories)];

        if (uniqueCategories.includes("temperature")) {
            return [0, 50]; // Temperature range 0-50°C
        } else if (uniqueCategories.includes("rainfall")) {
            const maxRain = Math.max(...formattedData.map((d) => d.primaryValue));
            return [0, Math.max(100, Math.ceil(maxRain * 1.1))]; // Rainfall dynamic range
        } else if (uniqueCategories.includes("water_level")) {
            return [-100, 200]; // Water level range -100 to 200cm
        }

        return [0, (dataMax) => Math.ceil(dataMax * 1.1)];
    };

    return (
        <>
            {/* Chart Title */}
            <div className="text-center mb-3">
                <h5 className="mb-1 text-primary">📊 Biểu đồ Khí tượng Thủy văn</h5>
                <div className="small text-muted">
                    {(() => {
                        if (formattedData.length === 0) return "Không có dữ liệu";

                        const categories = formattedData.map((d) => d.paramInfo.category);
                        const primaryCategory = categories.find((cat) => cat !== "no_data");

                        switch (primaryCategory) {
                            case "temperature":
                                return "🌡️ Dữ liệu nhiệt độ theo thời gian";
                            case "rainfall":
                                return "🌧️ Dữ liệu lượng mưa theo thời gian";
                            case "water_level":
                                return "💧 Dữ liệu mực nước theo thời gian";
                            default:
                                return "📈 Dữ liệu khí tượng thủy văn theo thời gian";
                        }
                    })()}
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                    </div>
                    <p className="mt-2">Đang tải dữ liệu khí tượng thủy văn...</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%" minHeight={height}>
                    <BarChart data={formattedData} barCategoryGap={8}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />

                        <XAxis
                            dataKey={formattedData[0]?.date ? "date" : "Ngày"}
                            tickFormatter={(d) => {
                                // Handle Vietnamese date format (dd/MM/yyyy)
                                if (typeof d === "string" && d.includes("/")) {
                                    const [day, month, year] = d.split("/");
                                    return year;
                                }
                                return new Date(d).getFullYear();
                            }}
                            ticks={ticksByYear}
                            tick={{ fontSize: 10 }}
                        />

                        <YAxis
                            tick={{ fontSize: 12 }}
                            domain={getYAxisDomain()}
                            allowDataOverflow={false}
                            tickFormatter={(value) => {
                                // Get the primary parameter category from the data
                                const categories = formattedData.map((d) => d.paramInfo.category);
                                const primaryCategory =
                                    categories.find((cat) => cat !== "no_data") || "no_data";

                                // Format based on category
                                switch (primaryCategory) {
                                    case "temperature":
                                        return `${value}°C`;
                                    case "rainfall":
                                        return `${value}mm`;
                                    case "water_level":
                                        return `${value}cm`;
                                    default:
                                        return value;
                                }
                            }}
                            label={{
                                value: (() => {
                                    const categories = formattedData.map((d) => d.paramInfo.category);
                                    const primaryCategory =
                                        categories.find((cat) => cat !== "no_data") || "no_data";

                                    switch (primaryCategory) {
                                        case "temperature":
                                            return "🌡️ Nhiệt độ (°C)";
                                        case "rainfall":
                                            return "🌧️ Lượng mưa (mm)";
                                        case "water_level":
                                            return "💧 Mực nước (cm)";
                                        default:
                                            return "Giá trị";
                                    }
                                })(),
                                angle: -90,
                                position: "insideLeft",
                                style: { textAnchor: "middle", fontSize: "12px", fontWeight: "bold" },
                            }}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        <Bar dataKey="primaryValue" barSize={10}>
                            {formattedData.map((entry, index) => {
                                const color = getParameterColor(entry.paramInfo.category, entry.primaryValue);
                                return <Cell key={`cell-${index}`} fill={color} />;
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}

            {/* Enhanced Legend with Rainfall Details */}
            <div className="mt-3 p-3 bg-light rounded">
                <div className="text-center mb-3">
                    <strong className="text-primary">📊 Chú thích thông số đo</strong>
                </div>

                {/* Rainfall Color Scale */}
                <div className="mb-3">
                    <div className="text-center mb-2">
                        <small className="text-muted fw-bold">🌧️ Thang màu cường độ mưa</small>
                    </div>
                    <div className="d-flex justify-content-center flex-wrap gap-2 small">
                        <div className="d-flex align-items-center gap-2 px-2 py-1 bg-white rounded border">
                            <div
                                style={{ width: 12, height: 12, backgroundColor: "#6c757d", borderRadius: 2 }}
                            ></div>
                            <span>
                                ☀️ <strong>0mm</strong> - Không mưa
                            </span>
                        </div>
                        <div className="d-flex align-items-center gap-2 px-2 py-1 bg-white rounded border">
                            <div
                                style={{ width: 12, height: 12, backgroundColor: "#28a745", borderRadius: 2 }}
                            ></div>
                            <span>
                                🌦️ <strong>0.1-10mm</strong> - Mưa nhỏ
                            </span>
                        </div>
                        <div className="d-flex align-items-center gap-2 px-2 py-1 bg-white rounded border">
                            <div
                                style={{ width: 12, height: 12, backgroundColor: "#ffc107", borderRadius: 2 }}
                            ></div>
                            <span>
                                🌧️ <strong>10-50mm</strong> - Mưa vừa
                            </span>
                        </div>
                        <div className="d-flex align-items-center gap-2 px-2 py-1 bg-white rounded border">
                            <div
                                style={{ width: 12, height: 12, backgroundColor: "#fd7e14", borderRadius: 2 }}
                            ></div>
                            <span>
                                ⛈️ <strong>50-100mm</strong> - Mưa to
                            </span>
                        </div>
                        <div className="d-flex align-items-center gap-2 px-2 py-1 bg-white rounded border">
                            <div
                                style={{ width: 12, height: 12, backgroundColor: "#dc3545", borderRadius: 2 }}
                            ></div>
                            <span>
                                🌊 <strong>&gt;100mm</strong> - Mưa rất to
                            </span>
                        </div>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="text-center">
                    <small className="text-muted">
                        <i className="bi bi-info-circle me-1"></i>
                        Màu cột thể hiện cường độ mưa theo thang đo khí tượng
                    </small>
                </div>
            </div>
        </>
    );
};

export default HydrometBarChart;
