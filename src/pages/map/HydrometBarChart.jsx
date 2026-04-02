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

    // Rainfall data (R parameters) - Handle specifically R_TTH and other R_ parameters
    const rainfallKeys = dataKeys.filter(key => key.startsWith("R_") || key === "R");
    
    if (rainfallKeys.length > 0) {
        // Priority: R_TTH > other R_ parameters > R
        const priorityKeys = ["R_TTH", "R_TSH", "R_NB", "R_AP", "R_BC", "R"];
        const rainfallKey = priorityKeys.find(key => rainfallKeys.includes(key)) || rainfallKeys[0];
        
        if (data[rainfallKey] !== null && data[rainfallKey] !== undefined && data[rainfallKey] !== "NULL") {
            const value = parseFloat(data[rainfallKey]);
            if (!isNaN(value)) {
                // Get station name from key
                const stationCode = rainfallKey.includes('_') ? rainfallKey.split('_')[1] : 'Unknown';
                const stationNames = {
                    'TTH': 'Tam Thôn Hiệp',
                    'TSH': 'Tân Sơn Hòa', 
                    'NB': 'Nhà Bè',
                    'AP': 'An Phú',
                    'BC': 'Bình Chánh'
                };
                const stationName = stationNames[stationCode] || stationCode;
                
                result.rainfall = {
                    key: rainfallKey,
                    value: value,
                    unit: "mm",
                    category: "rainfall",
                    label: `Lượng mưa (${stationName})`,
                    color: "#0d6efd",
                };
            }
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

    // Water level data (Htb, Hx, Hm parameters)
    const waterParams = ["Htb", "Hx", "Hm"];
    waterParams.forEach((param) => {
        const waterKey = dataKeys.find((key) => key.startsWith(param) && (key === param || key.includes("_")));
        if (waterKey && data[waterKey] !== null && data[waterKey] !== undefined && data[waterKey] !== "NULL") {
            const value = parseFloat(data[waterKey]);
            if (!isNaN(value)) {
                let type, color;
                switch (param) {
                    case "Htb":
                        type = "avg";
                        color = "#28a745";
                        break;
                    case "Hx":
                        type = "max";
                        color = "#dc3545";
                        break;
                    case "Hm":
                        type = "min";
                        color = "#007bff";
                        break;
                    default:
                        type = "avg";
                        color = "#28a745";
                }

                result[param.toLowerCase()] = {
                    key: waterKey,
                    value,
                    unit: "cm",
                    category: "water",
                    type,
                    label: `Mực nước ${type === "avg" ? "trung bình" : type === "max" ? "cao nhất" : "thấp nhất"}`,
                    color,
                };
            }
        }
    });

    return Object.keys(result).length > 0 ? result : null;
};

const CustomTooltip = ({ active, payload, hasWaterSeries }) => {
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

                {/* Temperature or Water-level data */}
                <div className="mb-2">
                    <div className="small text-muted mb-1">
                        {hasWaterSeries ? "🌊 Mực nước" : "🌡️ Nhiệt độ"}
                    </div>
                    <div className="row g-1">
                        {data.ttb !== undefined && data.ttb !== null && (
                            <div className="col-4">
                                <div className="p-1 bg-success bg-opacity-10 rounded text-center">
                                    <div className="small text-muted">trung bình</div>
                                    <div className="fw-bold text-success small">
                                        {data.ttb.toFixed(1)}{hasWaterSeries ? "cm" : "°C"}
                                    </div>
                                </div>
                            </div>
                        )}
                        {data.tx !== undefined && data.tx !== null && (
                            <div className="col-4">
                                <div className="p-1 bg-danger bg-opacity-10 rounded text-center">
                                    <div className="small text-muted">tối cao</div>
                                    <div className="fw-bold text-danger small">
                                        {data.tx.toFixed(1)}{hasWaterSeries ? "cm" : "°C"}
                                    </div>
                                </div>
                            </div>
                        )}
                        {data.tm !== undefined && data.tm !== null && (
                            <div className="col-4">
                                <div className="p-1 bg-info bg-opacity-10 rounded text-center">
                                    <div className="small text-muted">tối thấp</div>
                                    <div className="fw-bold text-info small">
                                        {data.tm.toFixed(1)}{hasWaterSeries ? "cm" : "°C"}
                                    </div>
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
    console.log('HydrometBarChart received data:', {
        dataLength: data ? data.length : 0,
        height: height,
        hasData: !!data,
        sampleItem: data && data.length > 0 ? Object.keys(data[0]) : 'No sample'
    });
    
    // Check if we have valid data
    if (!data || data.length === 0) {
        return (
            <div className="text-center py-4" style={{ height: height }}>
                <div className="text-muted">
                    <i className="bi bi-bar-chart" style={{ fontSize: '2rem' }}></i>
                    <h6 className="mt-2">Chưa có dữ liệu biểu đồ</h6>
                    <p className="small mb-0">Vui lòng chọn một trạm có dữ liệu</p>
                </div>
            </div>
        );
    }
    
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

    // Better loading and data validation
    const isLoading = !formattedData || formattedData.length === 0;
    const hasValidData = formattedData.some((item) =>
        [item.rainfall, item.ttb, item.tx, item.tm].some(
            (value) => value !== null && value !== undefined && Number.isFinite(Number(value)),
        ),
    );

    const hasWaterSeries = data.some((row) =>
        Object.keys(row || {}).some((key) => {
            if (!key.startsWith("Htb_") && !key.startsWith("Hx_") && !key.startsWith("Hm_")) {
                return false;
            }
            const value = row[key];
            return value !== null && value !== undefined && value !== "" && value !== "NULL";
        }),
    );
    
    console.log('HydrometBarChart processed:', {
        formattedDataLength: formattedData.length,
        isLoading: isLoading,
        hasValidData: hasValidData,
        sampleFormatted: formattedData[0] || 'No formatted data'
    });

    // Get unique years for X-axis
    const getDateValue = (item) => {
        const dateValue = item.dateValue;
        if (typeof dateValue === "string" && dateValue.includes("/")) {
            const parts = dateValue.split("/");
            const [first, second, year] = parts;
            
            // Handle both MM/DD/YYYY and DD/MM/YYYY formats
            let month, day;
            if (parseInt(first) <= 12 && parseInt(second) <= 31) {
                // MM/DD/YYYY format (common from API)
                month = parseInt(first) - 1; // JavaScript months are 0-based
                day = parseInt(second);
            } else {
                // DD/MM/YYYY format
                day = parseInt(first);
                month = parseInt(second) - 1;
            }
            
            return new Date(parseInt(year), month, day);
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
            ) : !hasValidData ? (
                <div className="text-center py-4" style={{ height: height }}>
                    <div className="text-muted">
                        <i className="bi bi-exclamation-circle" style={{ fontSize: '2rem' }}></i>
                        <h6 className="mt-2">Không có dữ liệu hợp lệ</h6>
                        <p className="small mb-0">Dữ liệu tồn tại nhưng không có giá trị đo được</p>
                        <p className="small mb-0">({formattedData.length} bản ghi)</p>
                    </div>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={height}>
                    <ComposedChart 
                        data={formattedData} 
                        margin={height < 300 
                            ? { top: 10, right: 30, bottom: 15, left: 30 }  // Mini chart margins
                            : { top: 20, right: 50, bottom: 20, left: 50 }  // Full chart margins
                        }
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#dee2e6" />

                        {/* X Axis */}
                        <XAxis
                            dataKey="dateValue"
                            tickFormatter={(d) => {
                                if (typeof d === "string" && d.includes("/")) {
                                    const parts = d.split("/");
                                    // Handle MM/DD/YYYY format
                                    const year = parts[2] || parts[0];
                                    return year;
                                }
                                return new Date(d).getFullYear();
                            }}
                            ticks={ticksByYear}
                            tick={{ fontSize: height < 300 ? 12 : 16 }}
                            height={height < 300 ? 40 : 60}
                        />

                        {/* Left Y Axis - Rainfall */}
                        <YAxis
                            yAxisId="rainfall"
                            orientation="left"
                            domain={[0, Math.ceil(maxRainfall * 1.2)]}
                            tickFormatter={(value) => `${value}mm`}
                            tick={{ fontSize: height < 300 ? 10 : 16, fill: "#0d6efd" }}
                            width={height < 300 ? 50 : 90}
                            tickMargin={height < 300 ? 5 : 15}
                            label={{
                                value: "🌧️ Lượng mưa (mm)",
                                angle: -90,
                                position: "insideLeft",
                                style: {
                                    textAnchor: "middle",
                                    fontSize: height < 300 ? "12px" : "16px",
                                    fontWeight: "bold",
                                    fill: "#0d6efd",
                                },
                            }}
                        />

                        {/* Right Y Axis - Temperature / Water level */}
                        <YAxis
                            yAxisId="temperature"
                            orientation="right"
                            domain={[Math.floor(minTemp - 2), Math.ceil(maxTemp + 2)]}
                            tickFormatter={(value) => `${value}${hasWaterSeries ? "cm" : "°C"}`}
                            tick={{ fontSize: height < 300 ? 10 : 16, fill: "#dc3545" }}
                            width={height < 300 ? 50 : 90}
                            tickMargin={height < 300 ? 5 : 15}
                            label={{
                                value: hasWaterSeries ? "🌊 Mực nước (cm)" : "🌡️ Nhiệt độ (°C)",
                                angle: 90,
                                position: "insideRight",
                                style: {
                                    textAnchor: "middle",
                                    fontSize: height < 300 ? "12px" : "16px",
                                    fontWeight: "bold",
                                    fill: "#dc3545",
                                },
                            }}
                        />

                        <Tooltip content={<CustomTooltip hasWaterSeries={hasWaterSeries} />} />

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
                            name={hasWaterSeries ? "Mực nước trung bình (cm)" : "Nhiệt độ trung bình (°C)"}
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
                            name={hasWaterSeries ? "Mực nước cao nhất (cm)" : "Nhiệt độ tối cao (°C)"}
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
                            name={hasWaterSeries ? "Mực nước thấp nhất (cm)" : "Nhiệt độ tối thấp (°C)"}
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
