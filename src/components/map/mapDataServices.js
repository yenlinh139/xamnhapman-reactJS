import axiosInstance from "@config/axios-config";
import { useState, useEffect } from 'react';

const asArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
};

const toIsoDate = (rawDate) => {
    if (!rawDate) return null;

    const raw = String(rawDate).trim();
    if (!raw) return null;

    const slashParsed = parseDDMMYYYY(raw);
    if (slashParsed && !Number.isNaN(slashParsed.getTime())) {
        return slashParsed.toISOString();
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
    }

    return null;
};

const toNullableNumber = (rawValue) => {
    if (
        rawValue === null ||
        rawValue === undefined ||
        rawValue === "" ||
        rawValue === "NULL"
    ) {
        return null;
    }

    const normalized = String(rawValue).replace(",", ".");
    const numeric = parseFloat(normalized);
    return Number.isNaN(numeric) ? null : numeric;
};

const parseDDMMYYYY = (str) => {
    if (!str) return null;
    
    // Handle both DD/MM/YYYY and MM/DD/YYYY formats
    const parts = str.split("/").map((s) => parseInt(s, 10));
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    
    const [first, second, year] = parts;
    
    // Check if it's MM/DD/YYYY format (common from API)
    if (first <= 12 && second <= 31) {
        // Likely MM/DD/YYYY format
        return new Date(year, first - 1, second);
    } else {
        // Likely DD/MM/YYYY format
        return new Date(year, second - 1, first);
    }
};

export const fetchSalinityPoints = async () => {
    try {
        const response = await axiosInstance.get("/salinity-points");
        return asArray(response.data);
    } catch (error) {
        console.error("Error fetching salinity points:", error);
        return [];
    }
};

export const fetchSalinityData = async (kiHieu) => {
    try {
        const response = await axiosInstance.get(`/salinity-data/${kiHieu}`);

        const rawRows = asArray(response.data);
        const formatted = rawRows
            .map((item) => {
                const rawDate =
                    item?.Ngày ??
                    item?.Ngay ??
                    item?.date ??
                    item?.Date ??
                    item?.timestamp ??
                    item?.ThoiGian;

                const rawSalinity =
                    item?.DoMan ??
                    item?.do_man ??
                    item?.salinity ??
                    item?.Salinity ??
                    item?.value ??
                    item?.GiaTri;

                return {
                    date: toIsoDate(rawDate),
                    salinity: toNullableNumber(rawSalinity),
                };
            })
            .filter((item) => item.date);

        formatted.sort((a, b) => new Date(a.date) - new Date(b.date));
        return formatted;
    } catch (error) {
        console.error("Error fetching salinity data:", error);
        return [];
    }
};

export const fetchHydrometStations = async () => {
    try {
        const response = await axiosInstance.get("/hydrometeorology-stations");
        const payload = response.data;

        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.results)) return payload.results;

        if (payload?.data && typeof payload.data === "object" && payload.data.KiHieu) {
            return [payload.data];
        }
        if (payload?.result && typeof payload.result === "object" && payload.result.KiHieu) {
            return [payload.result];
        }

        // Some environments can return a single station object.
        if (payload && typeof payload === "object" && payload.KiHieu) {
            return [payload];
        }

        return [];
    } catch (error) {
        console.error("Error fetching hydrometeorology stations:", error);
        return [];
    }
};

export const fetchHydrometData = async (kiHieu, options = {}) => {
    try {
        const {
            startDate,
            endDate,
            limit = 100,
            offset = 0,
            orderBy = 'DESC'
        } = options;

        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (limit) params.append('limit', limit.toString());
        if (offset) params.append('offset', offset.toString());
        if (orderBy) params.append('orderBy', orderBy);

        const queryString = params.toString();
        const url = `/hydrometeorology-data/${kiHieu}${queryString ? `?${queryString}` : ''}`;
        
        const response = await axiosInstance.get(url);
        
        // Process data to ensure consistent format
        if (response.data && response.data.data) {
            const processedData = response.data.data.map(item => {
                const processedItem = { ...item };
                
                // Ensure numeric values for all measurement parameters
                Object.keys(processedItem).forEach(key => {
                    if (key.startsWith('R_') || key.startsWith('T') || key.startsWith('H')) {
                        const value = processedItem[key];
                        if (value !== null && value !== undefined && value !== "NULL" && value !== "") {
                            const numericValue = parseFloat(value);
                            processedItem[key] = isNaN(numericValue) ? null : numericValue;
                        } else {
                            processedItem[key] = null;
                        }
                    }
                });
                
                return processedItem;
            });
            
            return {
                ...response.data,
                data: processedData
            };
        }
        
        return response.data;
    } catch (error) {
        console.error("Error fetching hydromet data:", error);
        return { data: [], pagination: {} };
    }
};

// API mới để lấy dữ liệu mới nhất (tối ưu cho hiển thị map)
export const fetchLatestHydrometData = async () => {
    try {
        const response = await axiosInstance.get("/hydrometeorology-latest");
        return response.data;
    } catch (error) {
        console.error("Error fetching latest hydromet data:", error);
        return [];
    }
};

export const fetchSalinityStationPositions = async (salinityData) => {
    const promises = [];
    const dataItem = salinityData[0];
    const date = dataItem?.Ngày;

    const kiHieuList = Object.keys(dataItem).filter(
        (key) =>
            key !== "Ngày" &&
            key !== "id" &&
            dataItem[key] !== "NULL" &&
            dataItem[key] !== null &&
            dataItem[key] !== undefined,
    );

    for (const kiHieu of kiHieuList) {
        const value = dataItem[kiHieu];
        promises.push(
            axiosInstance.get(`/station-position-salinity/${kiHieu}`).then((res) => ({
                kiHieu,
                value,
                position: res.data,
                date,
            })),
        );
    }

    return Promise.all(promises);
};

// Cập nhật hàm fetchHydrometeorologyStationPositions để sử dụng API mới
export const fetchHydrometeorologyStationPositions = async () => {
    try {
        // Lấy dữ liệu mới nhất thay vì lấy tất cả dữ liệu
        const latestData = await fetchLatestHydrometData();
        
        if (!latestData || latestData.length === 0) {
            return [];
        }

        const dataItem = latestData[0];
        const date = dataItem?.Ngày;

        // Lọc ra các ký hiệu có dữ liệu
        const kiHieuList = Object.keys(dataItem).filter(
            (key) => key !== "Ngày" && key !== "id" && 
                    dataItem[key] !== "NULL" && 
                    dataItem[key] !== null && 
                    dataItem[key] !== undefined
        );

        const promises = [];
        for (const kiHieu of kiHieuList) {
            const value = dataItem[kiHieu];
            promises.push(
                axiosInstance.get(`/station-position-hydrometeorology/${kiHieu}`)
                    .then((res) => ({
                        kiHieu,
                        value,
                        position: res.data,
                        date,
                    }))
                    .catch((error) => {
                        console.warn(`Error fetching position for ${kiHieu}:`, error);
                        return null; // Return null for failed requests
                    })
            );
        }

        const results = await Promise.all(promises);
        return results.filter(result => result !== null); // Lọc bỏ kết quả null
    } catch (error) {
        console.error("Error fetching hydrometeorology station positions:", error);
        return [];
    }
};

// Utility function để xây dựng query cho pagination
export const buildHydrometDataQuery = (page = 1, limit = 100, filters = {}) => {
    const offset = (page - 1) * limit;
    return {
        limit,
        offset,
        ...filters // startDate, endDate, orderBy
    };
};

// Hook React để sử dụng với pagination
export const useHydrometData = (kiHieu, page = 1, limit = 100, filters = {}) => {
    const [data, setData] = useState({ data: [], pagination: {} });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        if (!kiHieu) {
            setData({ data: [], pagination: {} });
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            const options = buildHydrometDataQuery(page, limit, filters);
            const result = await fetchHydrometData(kiHieu, options);
            
            // Validate and clean the data
            if (result && result.data) {
                const cleanedData = result.data.filter(item => {
                    // Ensure item has valid date
                    const dateKey = item.date || item.Ngày;
                    return dateKey && dateKey !== null && dateKey !== "";
                });
                
                setData({
                    ...result,
                    data: cleanedData
                });
            } else {
                setData({ data: [], pagination: {} });
            }
        } catch (err) {
            console.error('Error in useHydrometData:', err);
            setError(err);
            setData({ data: [], pagination: {} });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [kiHieu, page, limit, JSON.stringify(filters)]);

    return { data, loading, error, refetch: fetchData };
};

// API lấy danh sách trạm IoT
export const fetchIoTStations = async (status = null) => {
    try {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        
        const response = await axiosInstance.get(
            `/iot/stations${params.toString() ? `?${params.toString()}` : ''}`
        );
            return response.data;
    } catch (error) {
        console.error("Error fetching IoT stations:", error);
        return { success: false, data: [], count: 0 };
    }
};

// API lấy tất cả data IoT với pagination
export const fetchAllIoTData = async (options = {}) => {
    try {
        const {
            page = 1,
            limit = 100,
            serialNumber,
            startDate,
            endDate,
            sortBy = 'date_time',
            sortOrder = 'desc'
        } = options;

        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        if (serialNumber) params.append('serialNumber', serialNumber);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('sortBy', sortBy);
        params.append('sortOrder', sortOrder);

        const response = await axiosInstance.get(`/iot/data?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching all IoT data:", error);
        return { success: false, data: [], pagination: {} };
    }
};

// API lấy dữ liệu IoT theo serial_number và thời gian
export const fetchIoTData = async (serialNumber, options = {}) => {
    try {
        const { startDate, endDate, groupBy = 'none' } = options;
        
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('groupBy', groupBy);

        const response = await axiosInstance.get(
            `/iot/data/${serialNumber}?${params.toString()}`
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching IoT data:", error);
        return { success: false, station: {}, data: [], pagination: {} };
    }
};

// API lấy thống kê IoT
export const fetchIoTStats = async () => {
    try {
        const response = await axiosInstance.get('/iot/stats');
        return response.data;
    } catch (error) {
        console.error("Error fetching IoT stats:", error);
        return { success: false, overall: {}, byStation: [], recentSync: [] };
    }
};

// API trigger manual sync
export const triggerManualSync = async (serialNumber, dateRange = {}) => {
    try {
        const response = await axiosInstance.post(`/iot/sync/${serialNumber}`, dateRange);
        return response.data;
    } catch (error) {
        console.error("Error triggering manual sync:", error);
        return { success: false, message: error.message };
    }
};

// Sync all stations
export const syncAllStations = async (dateRange = {}) => {
    return await triggerManualSync('all', dateRange);
};

// API kiểm tra health
export const checkIoTHealth = async () => {
    try {
        const response = await axiosInstance.get('/iot/health');
        return response.data;
    } catch (error) {
        console.error("Error checking IoT health:", error);
        return { success: false, status: "unhealthy" };
    }
};

// API lấy sync logs
export const fetchSyncLogs = async (options = {}) => {
    try {
        const params = new URLSearchParams();
        Object.keys(options).forEach(key => {
            if (options[key]) params.append(key, options[key]);
        });

        const response = await axiosInstance.get(`/iot/sync/logs?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching sync logs:", error);
        return { success: false, data: [], pagination: {} };
    }
};

// Utility function để format dữ liệu IoT cho hiển thị
export const formatIoTDataForDisplay = (iotResponse, selectedStation) => {    
    if (!iotResponse.success || !iotResponse.data || iotResponse.data.length === 0) {
        console.warn('⚠️ Invalid iotResponse or no data');
        return null;
    }

    const formattedData = {
        stationInfo: {
            ...selectedStation,
            serial: selectedStation.serial_number
        },
        stationName: selectedStation.station_name,
        data: iotResponse.data,
        summary: {
            totalRecords: iotResponse.count || iotResponse.data.length,
            firstRecord: iotResponse.data[iotResponse.data.length - 1]?.date_time,
            lastRecord: iotResponse.data[0]?.date_time
        }
    };
    return formattedData;
};

// React Hook cho IoT stations
export const useIoTStations = (status = null) => {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadStations = async () => {
            setLoading(true);
            try {
                const result = await fetchIoTStations(status);
                setStations(result.data || []);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        loadStations();
    }, [status]);

    return { stations, loading, error };
};

// React Hook cho IoT data với pagination
export const useIoTData = (options = {}) => {
    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchAllIoTData(options);
            if (result.success) {
                setData(result.data);
                setPagination(result.pagination);
            }
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [JSON.stringify(options)]);

    return { data, pagination, loading, error, refetch: fetchData };
};

// React Hook cho station data cụ thể
export const useStationData = (serialNumber, options = {}) => {
    const [stationData, setStationData] = useState([]);
    const [station, setStation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!serialNumber) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await fetchIoTData(serialNumber, options);
                if (result.success) {
                    setStationData(result.data);
                    setStation(result.station);
                }
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [serialNumber, JSON.stringify(options)]);

    return { stationData, station, loading, error };
};
