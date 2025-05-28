import axiosInstance from "@config/axios-config";

const parseDDMMYYYY = (str) => {
    if (!str) return null;
    const [day, month, year] = str.split("/").map((s) => parseInt(s, 10));
    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
};

export const fetchSalinityPoints = async () => {
    try {
        const response = await axiosInstance.get("/api/salinity-points");
        return response.data;
    } catch (error) {
        console.error("Error fetching salinity points:", error);
        return [];
    }
};

export const fetchSalinityData = async (kiHieu) => {
    try {
        const response = await axiosInstance.get(`/api/salinity-data/${kiHieu}`);
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
        const response = await axiosInstance.get("/api/hydrometeorology-station");
        return response.data;
    } catch (error) {
        console.error("Error fetching hydrometeorology stations:", error);
        return [];
    }
};

export const fetchHydrometData = async (maTram) => {
    try {
        const response = await axiosInstance.get(`/api/hydrometeorology-data/${maTram}`);

        return response.data;
    } catch (error) {
        console.error("Error fetching hydromet data:", error);
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
            axiosInstance.get(`/api/station-position-salinity/${kiHieu}`).then((res) => ({
                kiHieu,
                value,
                position: res.data,
                date,
            })),
        );
    }

    return Promise.all(promises);
};

export const fetchHydrometeorologyStationPositions = async (hydrometeorology) => {
    const promises = [];
    const dataItem = hydrometeorology[0];
    const date = dataItem?.Ngày;

    const kiHieuList = Object.keys(dataItem).filter(
        (key) => key !== "Ngày" && key !== "id" && dataItem[key] !== "NULL" && dataItem[key] !== null,
    );

    for (const kiHieu of kiHieuList) {
        const value = dataItem[kiHieu];
        promises.push(
            axiosInstance.get(`/api/station-position-hydrometeorology/${kiHieu}`).then((res) => ({
                kiHieu,
                value,
                position: res.data,
                date,
            })),
        );
    }

    return Promise.all(promises);
};
