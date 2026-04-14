/**
 * React Hooks và Components cho Hydrometeorology Statistics API
 * Sử dụng với axios và React
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import axiosInstance from "@config/axios-config";

// Tạm thời disable API calls do backend lỗi 500
const DISABLE_HYDRO_STATS_API = true;

// ================================
// CUSTOM HOOKS
// ================================

/**
 * Hook để lấy thống kê tổng quan
 */
export const useHydroSummary = (startDate, endDate) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchSummary = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Tạm thời disable API call do backend lỗi 500
            console.warn("HydroStats - API disabled due to 500 errors, using mock data");

            // Mock data
            const mockData = {
                period: {
                    start_date: startDate,
                    end_date: endDate,
                    total_days: 30,
                    description: `Dữ liệu thí nghiệm từ ${startDate} đến ${endDate}`,
                },
                weather_summary: {
                    rainfall: {
                        total: 145.2,
                        daily_average: 4.8,
                        rainy_days: 18,
                        rainy_percentage: "60%",
                    },
                    temperature: {
                        average: 28.5,
                    },
                },
                hydro_summary: {
                    nha_be: {
                        avg_level: 125.3,
                        max_level: 145.7,
                        min_level: 98.2,
                    },
                    phu_an: {
                        avg_level: 98.7,
                        max_level: 112.4,
                        min_level: 76.8,
                    },
                },
                alerts: {
                    count: 2,
                    description: "2 cảnh báo",
                },
                data_coverage: {
                    weather: {
                        total_records: 720,
                        last_update: "2022-09-30T23:59:59Z",
                    },
                    hydro: {
                        total_records: 1440,
                    },
                },
            };

            setData(mockData);

            // Original API call - commented out
            /*
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      console.log('HydroStats - Fetching summary with:', { startDate, endDate });
      const response = await axiosInstance.get(`/hydrometeorology-stats/summary?${params.toString()}`);
      setData(response.data.data);
      */
        } catch (err) {
            console.error("Error fetching hydrometeorology summary:", err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    return { data, loading, error, refetch: fetchSummary };
};

/**
 * Hook để lấy thống kê mưa theo trạm
 */
export const useRainfallStats = (options = {}) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { startDate, endDate, orderBy = "total_desc" } = options;

    const fetchRainfallStats = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (DISABLE_HYDRO_STATS_API) {
                // Mock data để tránh lỗi 500
                console.warn("RainfallStats - API disabled, using mock data");
                const mockData = [
                    {
                        station_name: "Trạm Nhà Bè",
                        station_code: "NB001",
                        total_rainfall: 156.7,
                        avg_rainfall: 5.2,
                        rainy_days: 19,
                        rainy_days_percentage: 63.3,
                    },
                    {
                        station_name: "Trạm Phú An",
                        station_code: "PA001",
                        total_rainfall: 142.3,
                        avg_rainfall: 4.7,
                        rainy_days: 17,
                        rainy_days_percentage: 56.7,
                    },
                    {
                        station_name: "Trạm Thủ Đức",
                        station_code: "TD001",
                        total_rainfall: 134.8,
                        avg_rainfall: 4.5,
                        rainy_days: 16,
                        rainy_days_percentage: 53.3,
                    },
                ];
                setData(mockData);
                return;
            }

            const params = new URLSearchParams({ orderBy });
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);

            const response = await axiosInstance.get(
                `/hydrometeorology-stats/rainfall-by-station?${params.toString()}`,
            );
            setData(response.data.data || response.data);
        } catch (err) {
            console.error("Error fetching rainfall stats:", err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, orderBy]);

    useEffect(() => {
        fetchRainfallStats();
    }, [fetchRainfallStats]);

    return { data, loading, error, refetch: fetchRainfallStats };
};

/**
 * Hook để lấy thống kê mực nước theo trạm
 */
export const useWaterLevelStats = (options = {}) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { startDate, endDate, orderBy = "avg_desc" } = options;

    const fetchWaterLevelStats = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (DISABLE_HYDRO_STATS_API) {
                // Mock data để tránh lỗi 500
                console.warn("WaterLevelStats - API disabled, using mock data");
                const mockData = [
                    {
                        station_name: "Trạm Nhà Bè",
                        station_code: "NB001",
                        avg_water_level: 125.3,
                        max_water_level: 145.7,
                        min_water_level: 98.2,
                    },
                    {
                        station_name: "Trạm Phú An",
                        station_code: "PA001",
                        avg_water_level: 98.7,
                        max_water_level: 112.4,
                        min_water_level: 76.8,
                    },
                    {
                        station_name: "Trạm Cần Giờ",
                        station_code: "CG001",
                        avg_water_level: 87.5,
                        max_water_level: 95.3,
                        min_water_level: 72.1,
                    },
                ];
                setData(mockData);
                return;
            }

            const params = new URLSearchParams({ orderBy });
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);

            const response = await axiosInstance.get(
                `/hydrometeorology-stats/water-level-by-station?${params.toString()}`,
            );
            setData(response.data.data || response.data);
        } catch (err) {
            console.error("Error fetching water level stats:", err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, orderBy]);

    useEffect(() => {
        fetchWaterLevelStats();
    }, [fetchWaterLevelStats]);

    return { data, loading, error, refetch: fetchWaterLevelStats };
};

/**
 * Hook để lấy dashboard data
 */
export const useHydroDashboard = (period = "7days") => {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (DISABLE_HYDRO_STATS_API) {
                // Mock data để tránh lỗi 500
                console.warn("HydroDashboard - API disabled, using mock data");
                const mockDashboard = {
                    summary: {
                        total_stations: 24,
                        active_stations: 22,
                        total_measurements: 1456,
                        last_updated: "2022-09-30T16:00:00Z",
                    },
                    recent_data: [
                        {
                            station: "Nhà Bè",
                            rainfall: 12.5,
                            water_level: 125.3,
                            timestamp: "2022-09-30T15:00:00Z",
                        },
                        {
                            station: "Phú An",
                            rainfall: 8.2,
                            water_level: 98.7,
                            timestamp: "2022-09-30T15:00:00Z",
                        },
                        {
                            station: "Thủ Đức",
                            rainfall: 15.1,
                            water_level: 87.5,
                            timestamp: "2022-09-30T15:00:00Z",
                        },
                    ],
                };
                setDashboard(mockDashboard);
                return;
            }

            const response = await axiosInstance.get(`/hydrometeorology-stats/dashboard?period=${period}`);
            setDashboard(response.data.dashboard || response.data);
        } catch (err) {
            console.error("Error fetching hydrometeorology dashboard:", err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    return { dashboard, loading, error, refetch: fetchDashboard };
};

/**
 * Hook để lấy cảnh báo
 */
export const useWeatherAlerts = (alertType = "all", days = 7) => {
    const [alerts, setAlerts] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (DISABLE_HYDRO_STATS_API) {
                // Mock data để tránh lỗi 500
                console.warn("WeatherAlerts - API disabled, using mock data");
                const mockAlerts = [
                    {
                        id: 1,
                        type: "rain",
                        level: "medium",
                        title: "Cảnh báo mưa to",
                        message: "Mưa to đến rất to trong 2-3 giờ tới",
                        area: "Quận 1, 3, 5, 7",
                        timestamp: "2022-09-30T14:30:00Z",
                    },
                    {
                        id: 2,
                        type: "flood",
                        level: "low",
                        title: "Nguy cơ ngập úng",
                        message: "Nguy cơ ngập úng cục bộ tại các điểm thấp",
                        area: "Quận 4, 8, Nhà Bè",
                        timestamp: "2022-09-30T15:15:00Z",
                    },
                ];
                const mockSummary = {
                    total: 2,
                    byType: { rain: 1, flood: 1 },
                    byLevel: { medium: 1, low: 1 },
                };
                setAlerts(mockAlerts);
                setSummary(mockSummary);
                return;
            }

            // Sử dụng date range có dữ liệu thực tế (tháng 9/2022)
            const endDate = "2022-09-30";
            const startDate = days <= 7 ? "2022-09-24" : days <= 30 ? "2022-09-01" : "2022-08-01";

            const params = new URLSearchParams({
                alertType,
                startDate,
                endDate,
            });

            const response = await axiosInstance.get(`/hydrometeorology-stats/alerts?${params.toString()}`);
            setAlerts(response.data.data || response.data.alerts || []);
            setSummary(response.data.summary || {});
        } catch (err) {
            console.error("Error fetching weather alerts:", err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    }, [alertType, days]);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    return { alerts, summary, loading, error, refetch: fetchAlerts };
};

/**
 * Hook để lấy thống kê theo tháng/năm
 */
export const useMonthlyStats = (period = "monthly", year, stationType = "all") => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (DISABLE_HYDRO_STATS_API) {
                // Mock data để tránh lỗi 500
                console.warn("MonthlyStats - API disabled, using mock data");
                const mockData = [
                    {
                        period: "2022-09",
                        rainfall: 245.6,
                        avg_temperature: 28.5,
                        avg_humidity: 82.3,
                        total_stations: 24,
                    },
                    {
                        period: "2022-08",
                        rainfall: 198.2,
                        avg_temperature: 29.1,
                        avg_humidity: 79.8,
                        total_stations: 24,
                    },
                    {
                        period: "2022-07",
                        rainfall: 156.4,
                        avg_temperature: 29.8,
                        avg_humidity: 77.2,
                        total_stations: 23,
                    },
                ];
                setData(mockData);
                return;
            }

            const params = new URLSearchParams({ period, stationType });
            if (year) params.append("year", year);

            const response = await axiosInstance.get(
                `/hydrometeorology-stats/monthly-yearly?${params.toString()}`,
            );
            setData(response.data.data || response.data);
        } catch (err) {
            console.error("Error fetching monthly stats:", err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    }, [period, year, stationType]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { data, loading, error, refetch: fetchStats };
};

/**
 * Hook để lấy danh sách trạm khí tượng thủy văn
 */
export const useHydrometStations = () => {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStations = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (DISABLE_HYDRO_STATS_API) {
                // Mock data để tránh lỗi 500
                console.warn("HydrometStations - API disabled, using mock data");
                const mockStations = [
                    {
                        id: "NB001",
                        name: "Trạm Nhà Bè",
                        code: "NB001",
                        latitude: 10.6967,
                        longitude: 106.7589,
                        type: "hydromet",
                        status: "active",
                    },
                    {
                        id: "PA001",
                        name: "Trạm Phú An",
                        code: "PA001",
                        latitude: 10.8142,
                        longitude: 106.6438,
                        type: "hydromet",
                        status: "active",
                    },
                    {
                        id: "TD001",
                        name: "Trạm Thủ Đức",
                        code: "TD001",
                        latitude: 10.8508,
                        longitude: 106.7717,
                        type: "hydromet",
                        status: "active",
                    },
                    {
                        id: "CG001",
                        name: "Trạm Cần Giờ",
                        code: "CG001",
                        latitude: 10.4103,
                        longitude: 106.9533,
                        type: "hydromet",
                        status: "active",
                    },
                ];
                setStations(mockStations);
                return;
            }

            const response = await axiosInstance.get("/hydrometeorology-stations");
            setStations(response.data || []);
        } catch (err) {
            console.error("Error fetching hydromet stations:", err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStations();
    }, [fetchStations]);

    return { stations, loading, error, refetch: fetchStations };
};

/**
 * Hook để lấy dữ liệu mới nhất
 */
export const useLatestHydroData = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchLatestData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            if (DISABLE_HYDRO_STATS_API) {
                // Mock data để tránh lỗi 500
                console.warn("LatestHydroData - API disabled, using mock data");
                const mockData = [
                    {
                        station_id: "NB001",
                        station_name: "Trạm Nhà Bè",
                        rainfall: 12.5,
                        water_level: 125.3,
                        temperature: 28.2,
                        humidity: 82.5,
                        timestamp: "2022-09-30T16:00:00Z",
                    },
                    {
                        station_id: "PA001",
                        station_name: "Trạm Phú An",
                        rainfall: 8.2,
                        water_level: 98.7,
                        temperature: 29.1,
                        humidity: 80.3,
                        timestamp: "2022-09-30T16:00:00Z",
                    },
                    {
                        station_id: "TD001",
                        station_name: "Trạm Thủ Đức",
                        rainfall: 15.1,
                        water_level: 87.5,
                        temperature: 27.8,
                        humidity: 84.1,
                        timestamp: "2022-09-30T16:00:00Z",
                    },
                ];
                setData(mockData);
                return;
            }

            const response = await axiosInstance.get("/hydrometeorology-latest");
            setData(response.data || []);
        } catch (err) {
            console.error("Error fetching latest hydro data:", err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLatestData();
    }, [fetchLatestData]);

    return { data, loading, error, refetch: fetchLatestData };
};

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Format date for API calls
 */
export const formatDate = (date) => {
    return new Date(date).toISOString().split("T")[0];
};

/**
 * Get date range presets (Updated for available data in 2022)
 */
export const getDateRangePresets = () => {
    // Sử dụng data range có sẵn (tháng 9/2022)
    return {
        "7days": {
            startDate: "2022-09-24",
            endDate: "2022-09-30",
            label: "7 ngày cuối tháng 9/2022",
        },
        "30days": {
            startDate: "2022-09-01",
            endDate: "2022-09-30",
            label: "Tháng 9/2022",
        },
        "90days": {
            startDate: "2022-07-01",
            endDate: "2022-09-30",
            label: "Quý 3/2022",
        },
        thisMonth: {
            startDate: "2022-09-01",
            endDate: "2022-09-30",
            label: "Tháng 9/2022",
        },
        lastMonth: {
            startDate: "2022-08-01",
            endDate: "2022-08-31",
            label: "Tháng 8/2022",
        },
    };
};

/**
 * Hàm lấy dữ liệu theo trạm cụ thể
 */
export const fetchHydrometDataByStation = async (kiHieu, options = {}) => {
    try {
        const { startDate, endDate, limit, offset, orderBy } = options;
        const params = new URLSearchParams();

        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (limit) params.append("limit", limit);
        if (offset) params.append("offset", offset);
        if (orderBy) params.append("orderBy", orderBy);

        const queryString = params.toString();
        const url = `/hydrometeorology-data/${kiHieu}${queryString ? `?${queryString}` : ""}`;

        const response = await axiosInstance.get(url);
        return {
            success: true,
            data: response.data.data || response.data,
            pagination: response.data.pagination || {},
        };
    } catch (error) {
        console.error("Error fetching hydromet data by station:", error);
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            data: [],
            pagination: {},
        };
    }
};

/**
 * Export all hooks and utilities
 */
export default {
    // Hooks
    useHydroSummary,
    useRainfallStats,
    useWaterLevelStats,
    useHydroDashboard,
    useWeatherAlerts,
    useMonthlyStats,
    useHydrometStations,
    useLatestHydroData,

    // Utils
    formatDate,
    getDateRangePresets,
    fetchHydrometDataByStation,
};
