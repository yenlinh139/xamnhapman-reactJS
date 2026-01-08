import axiosInstance from "@config/axios-config";
import { useState, useEffect } from 'react';

const parseDDMMYYYY = (str) => {
    if (!str) return null;
    const [day, month, year] = str.split("/").map((s) => parseInt(s, 10));
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
};

export const fetchSalinityPoints = async () => {
    try {
        const response = await axiosInstance.get("/salinity-points");
        return response.data;
    } catch (error) {
        console.error("Error fetching salinity points:", error);
        return [];
    }
};

export const fetchSalinityData = async (kiHieu) => {
    try {
        const response = await axiosInstance.get(`/salinity-data/${kiHieu}`);
        const formatted = response.data.map((item) => ({
            date: new Date(item.Ngày).toISOString(),
            salinity: item.DoMan,
        }));
        formatted.sort((a, b) => new Date(a.date) - new Date(b.date));
        return formatted;
    } catch (error) {
        console.error("Error fetching salinity data:", error);
        return [];
    }
};

export const fetchHydrometStations = async () => {
    try {
        const response = await axiosInstance.get("/hydrometeorology-stations"); // Đổi từ station sang stations
        return response.data;
    } catch (error) {
        console.error("Error fetching hydrometeorology stations:", error);
        return [];
    }
};

export const fetchHydrometData = async (maTram, options = {}) => {
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
        const url = `/hydrometeorology-data/${maTram}${queryString ? `?${queryString}` : ''}`;
        
        const response = await axiosInstance.get(url);
        return response.data; // Bây giờ return object {data: [], pagination: {}}
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
export const useHydrometData = (maTram, page = 1, limit = 100, filters = {}) => {
    const [data, setData] = useState({ data: [], pagination: {} });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const options = buildHydrometDataQuery(page, limit, filters);
                const result = await fetchHydrometData(maTram, options);
                setData(result);
            } catch (err) {
                setError(err);
                setData({ data: [], pagination: {} });
            } finally {
                setLoading(false);
            }
        };

        if (maTram) {
            fetchData();
        }
    }, [maTram, page, limit, JSON.stringify(filters)]);

    return { data, loading, error, refetch: () => fetchData() };
};

// API lấy danh sách trạm IoT
export const fetchIoTStations = async () => {
    try {
        const response = await axiosInstance.get("/iot/stations");
        return response.data;
    } catch (error) {
        console.error("Error fetching IoT stations:", error);
        return { success: false, data: [], count: 0 };
    }
};

// API lấy dữ liệu IoT theo serial_number và thời gian
export const fetchIoTData = async (serialNumber, options = {}) => {
    try {
        const {
            startDate,
            endDate,
            page = 1,
            limit = 100
        } = options;

        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (page) params.append('page', page.toString());
        if (limit) params.append('limit', limit.toString());

        const queryString = params.toString();
        const url = `/iot/data/${serialNumber}${queryString ? `?${queryString}` : ''}`;
        
        const response = await axiosInstance.get(url);
        return response.data;
    } catch (error) {
        console.error("Error fetching IoT data:", error);
        return { success: false, station: {}, data: [], pagination: {} };
    }
};

// Utility function để format dữ liệu IoT cho hiển thị
export const formatIoTDataForDisplay = (iotResponse, selectedStation) => {
    if (!iotResponse.success || !iotResponse.data || iotResponse.data.length === 0) {
        return null;
    }

    return {
        stationInfo: {
            ...selectedStation,
            serial: selectedStation.serial_number
        },
        stationName: selectedStation.station_name,
        data: iotResponse.data,
        summary: {
            totalRecords: iotResponse.data.length,
            firstRecord: iotResponse.data[iotResponse.data.length - 1]?.date_time,
            lastRecord: iotResponse.data[0]?.date_time
        }
    };
};
