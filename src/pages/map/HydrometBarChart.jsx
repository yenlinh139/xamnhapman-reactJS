import React from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";

const getParameterInfo = (data) => {
    // Extract all available parameters from the data
    const dataKeys = Object.keys(data).filter((key) => key !== "date" && key !== "Ngày");
    const result = {};

    // Extract station code from data keys (e.g., TSH from R_TSH, Ttb_TSH)
    let stationCode = "";
    for (const key of dataKeys) {
        if (key.includes("_")) {
            stationCode = key.split("_")[1];
            break;
        }
    }

    // Rainfall data (R parameter)
    const rainfallKey = dataKeys.find(key => key.startsWith("R") && (key === "R" || key.includes("_")));
    if (rainfallKey && data[rainfallKey] !== null && data[rainfallKey] !== undefined && data[rainfallKey] !== "NULL") {
        const value = parseFloat(data[rainfallKey]);
        if (!isNaN(value)) {
            result.rainfall = {
                key: rainfallKey,
                value: value,
                unit: "mm",
                category: "rainfall",
                label: "Lượng mưa",
                color: "#0d6efd",
            };
        }
    }

    // Temperature data (Ttb, Tx, Tm parameters)
    const tempParams = ["Ttb", "Tx", "Tm"];
    tempParams.forEach(param => {
        const tempKey = dataKeys.find(key => key.startsWith(param) && (key === param || key.includes("_")));
        if (tempKey && data[tempKey] !== null && data[tempKey] !== undefined && data[tempKey] !== "NULL") {
            const value = parseFloat(data[tempKey]);
            if (!isNaN(value)) {
                let type, label, color;
                switch (param) {
                    case "Ttb":
                        type = "avg";
                        label = "Nhiệt độ trung bình";
                        color = "#28a745";
                        break;
                    case "Tx":
                        type = "max";
                        label = "Nhiệt độ cao nhất";
                        color = "#dc3545";
                        break;
                    case "Tm":
                        type = "min";
                        label = "Nhiệt độ thấp nhất";
                        color = "#007bff";
                        break;
                }

                result[param.toLowerCase()] = {
                    key: tempKey,
                    value: value,
                    unit: "°C",
                    category: "temperature",
                    type: type,
                    label: label,
                    color: color,
                };
            }
        }
    });

    return Object.keys(result).length > 0 ? result : null;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        const data = payload[0].payload;
        const dateValue = data.date || data.Ngày;

        return (
            <div className="bg-white border p-3 rounded shadow-sm" style={{ minWidth: 250, maxWidth: 350 }}>
                <div className="fw-bold mb-2 d-flex align-items-center gap-2 text-primary">
                    <span>🌡️🌧️</span>
                    <span>Dữ liệu khí tượng</span>
                </div>

                <div className="mb-2">
                    <div className="small text-muted mb-1">📅 Thời gian</div>
                    <div className="fw-semibold">{dateValue}</div>
                </div>

                {/* Rainfall data */}
                {data.rainfall !== undefined && data.rainfall !== null && (
                    <div className="mb-2 p-2 bg-primary bg-opacity-10 rounded">
                        <div className="small text-muted mb-1">🌧️ Lượng mưa</div>
                        <div className="fs-6 fw-bold text-primary">{data.rainfall.toFixed(1)} mm</div>
                        <div className="small">
                            {data.rainfall === 0
                                ? "☀️ Không mưa"
                                : data.rainfall < 10
                                  ? "🌦️ Mưa nhỏ"
                                  : data.rainfall < 50
                                    ? "🌧️ Mưa vừa"
                                    : data.rainfall < 100
                                      ? "⛈️ Mưa to"
                                      : "🌊 Mưa rất to"}
                        </div>
                    </div>
                )}

                {/* Temperature data */}
                <div className="mb-2">
                    <div className="small text-muted mb-1">🌡️ Nhiệt độ</div>
                    <div className="row g-1">
                        {data.ttb !== undefined && data.ttb !== null && (
                            <div className="col-4">
                                <div className="p-1 bg-success bg-opacity-10 rounded text-center">
                                    <div className="small text-muted">trung bình</div>
                                    <div className="fw-bold text-success small">{data.ttb.toFixed(1)}°C</div>
                                </div>
                            </div>
                        )}
                        {data.tx !== undefined && data.tx !== null && (
                            <div className="col-4">
                                <div className="p-1 bg-danger bg-opacity-10 rounded text-center">
                                    <div className="small text-muted">tối cao</div>
                                    <div className="fw-bold text-danger small">{data.tx.toFixed(1)}°C</div>
                                </div>
                            </div>
                        )}
                        {data.tm !== undefined && data.tm !== null && (
                            <div className="col-4">
                                <div className="p-1 bg-info bg-opacity-10 rounded text-center">
                                    <div className="small text-muted">tối thấp</div>
                                    <div className="fw-bold text-info small">{data.tm.toFixed(1)}°C</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const HydrometBarChart = ({ data, height = 600 }) => {    
    // Process data to extract both rainfall and temperature parameters
    const formattedData = data.map((item) => {
        const paramInfo = getParameterInfo(item);
        
        const result = {
            ...item,
            // Handle both "date" and "Ngày" fields
            dateValue: item.date || item.Ngày,
        };

        if (paramInfo) {
            // Add rainfall data
            if (paramInfo.rainfall) {
                result.rainfall = paramInfo.rainfall.value;
            }
            
            // Add temperature data
            if (paramInfo.ttb) result.ttb = paramInfo.ttb.value;
            if (paramInfo.tx) result.tx = paramInfo.tx.value;
            if (paramInfo.tm) result.tm = paramInfo.tm.value;
        }

        return result;
    });

    const isLoading = !formattedData || formattedData.length === 0;

    // Get unique years for X-axis
    const getDateValue = (item) => {
        const dateValue = item.dateValue;
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
            return item ? item.dateValue : null;
        })
        .filter(Boolean);

    // Calculate Y-axis domains
    const rainfallValues = formattedData.map(d => d.rainfall || 0).filter(v => v > 0);
    const tempValues = formattedData.flatMap(d => [d.ttb, d.tx, d.tm].filter(v => v !== undefined && v !== null));
    
    const maxRainfall = rainfallValues.length > 0 ? Math.max(...rainfallValues) : 100;
    const minTemp = tempValues.length > 0 ? Math.min(...tempValues) : 15;
    const maxTemp = tempValues.length > 0 ? Math.max(...tempValues) : 40;

    return (
        <>
            {isLoading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                    </div>
                    <p className="mt-2">Đang tải dữ liệu khí tượng thủy văn...</p>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={height}>
                    <ComposedChart data={formattedData} margin={{ top: 20, right: 50, bottom: 20, left: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />

                        {/* X Axis */}
                        <XAxis
                            dataKey="dateValue"
                            tickFormatter={(d) => {
                                if (typeof d === "string" && d.includes("/")) {
                                    const [day, month, year] = d.split("/");
                                    return year;
                                }
                                return new Date(d).getFullYear();
                            }}
                            ticks={ticksByYear}
                            tick={{ fontSize: 16 }}
                            height={60}
                        />

                        {/* Left Y Axis - Rainfall */}
                        <YAxis
                            yAxisId="rainfall"
                            orientation="left"
                            domain={[0, Math.ceil(maxRainfall * 1.2)]}
                            tickFormatter={(value) => `${value}mm`}
                            tick={{ fontSize: 16, fill: "#0d6efd" }}
                            width={90}
                            tickMargin={15}
                            label={{
                                value: "🌧️ Lượng mưa (mm)",
                                angle: -90,
                                position: "insideLeft",
                                style: {
                                    textAnchor: "middle",
                                    fontSize: "16px",
                                    fontWeight: "bold",
                                    fill: "#0d6efd",
                                },
                            }}
                        />

                        {/* Right Y Axis - Temperature */}
                        <YAxis
                            yAxisId="temperature"
                            orientation="right"
                            domain={[Math.floor(minTemp - 2), Math.ceil(maxTemp + 2)]}
                            tickFormatter={(value) => `${value}°C`}
                            tick={{ fontSize: 16, fill: "#dc3545" }}
                            width={90}
                            tickMargin={15}
                            label={{
                                value: "🌡️ Nhiệt độ (°C)",
                                angle: 90,
                                position: "insideRight",
                                style: {
                                    textAnchor: "middle",
                                    fontSize: "16px",
                                    fontWeight: "bold",
                                    fill: "#dc3545",
                                },
                            }}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        {/* Legend */}
                        <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="line" />

                        {/* Rainfall Bar */}
                        <Bar
                            yAxisId="rainfall"
                            dataKey="rainfall"
                            name="Lượng mưa (mm)"
                            fill="#0d6efd"
                            fillOpacity={0.8}
                            barSize={15}
                        />

                        {/* Temperature Lines */}
                        <Line
                            yAxisId="temperature"
                            type="monotone"
                            dataKey="ttb"
                            name="Nhiệt độ trung bình (°C)"
                            stroke="#28a745"
                            strokeWidth={3}
                            dot={{ fill: "#28a745", strokeWidth: 1, r: 2, shape: "circle" }}
                            activeDot={{ r: 4, stroke: "#28a745", strokeWidth: 2, fill: "#fff" }}
                            connectNulls={false}
                        />

                        <Line
                            yAxisId="temperature"
                            type="monotone"
                            dataKey="tx"
                            name="Nhiệt độ tối cao (°C)"
                            stroke="#dc3545"
                            strokeWidth={3}
                            dot={{ fill: "#dc3545", strokeWidth: 1, r: 2, shape: "square" }}
                            activeDot={{ r: 4, stroke: "#dc3545", strokeWidth: 2, fill: "#fff" }}
                            connectNulls={false}
                        />

                        <Line
                            yAxisId="temperature"
                            type="monotone"
                            dataKey="tm"
                            name="Nhiệt độ tối thấp (°C)"
                            stroke="#007bff"
                            strokeWidth={3}
                            dot={{ fill: "#007bff", strokeWidth: 1, r: 2, shape: "triangle" }}
                            activeDot={{ r: 4, stroke: "#007bff", strokeWidth: 2, fill: "#fff" }}
                            connectNulls={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            )}
        </>
    );
};

export default HydrometBarChart;
