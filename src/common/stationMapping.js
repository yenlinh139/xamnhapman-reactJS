/**
 * Station code mapping utilities
 * Maps station codes to full Vietnamese station names
 */

export const STATION_CODE_MAPPING = {
    AP: "An Phú",
    BC: "Bình Chánh",
    CG: "Cần Giờ",
    CL: "Cát Lái",
    CC: "Củ Chi",
    HM: "Hóc Môn",
    LMX: "Lê Minh Xuân",
    LS: "Long Sơn",
    MDC: "Mạc Đĩnh Chi",
    NB: "Nhà Bè",
    PVC: "Phan Văn Cội",
    TTH: "Tam Thôn Hiệp",
    TSH: "Tân Sơn Hòa",
    TD: "Thủ Đức",
};

/**
 * Convert station code to full station name
 * @param {string} stationCode - Station code (e.g., 'AP', 'BC')
 * @returns {string} Full station name or original code if not found
 */
export const getStationFullName = (stationCode) => {
    if (!stationCode) return "";

    // Handle both uppercase and lowercase codes
    const normalizedCode = stationCode.toString().toUpperCase();
    return STATION_CODE_MAPPING[normalizedCode] || stationCode;
};

/**
 * Get display name for station, prioritizing custom name over mapped name
 * @param {string} customName - Custom station name (e.g., TenTam)
 * @param {string} stationCode - Station code (e.g., kiHieu)
 * @returns {string} Best available station name
 */
export const getDisplayStationName = (customName, stationCode) => {
    // Prioritize custom name if available
    if (customName && customName.trim()) {
        return customName.trim();
    }

    // Fall back to mapped name or original code
    return getStationFullName(stationCode) || stationCode || "Trạm không xác định";
};

/**
 * Convert station name to filename-safe format
 * @param {string} stationName - Station name
 * @returns {string} Filename-safe station name
 */
export const getFilenameSafeStationName = (stationName) => {
    if (!stationName) return "unknown_station";

    return stationName
        .replace(/\s+/g, "_") // Replace spaces with underscores
        .replace(/[^\w\-_.]/g, "") // Remove special characters except - _ .
        .toLowerCase(); // Convert to lowercase
};

/**
 * Get all available station codes
 * @returns {string[]} Array of station codes
 */
export const getAllStationCodes = () => {
    return Object.keys(STATION_CODE_MAPPING);
};

/**
 * Get all available station names
 * @returns {string[]} Array of station names
 */
export const getAllStationNames = () => {
    return Object.values(STATION_CODE_MAPPING);
};

/**
 * Search stations by name or code
 * @param {string} query - Search query
 * @returns {Object[]} Array of matching stations with code and name
 */
export const searchStations = (query) => {
    if (!query || query.trim().length === 0) {
        return [];
    }

    const searchTerm = query.toLowerCase().trim();
    const results = [];

    Object.entries(STATION_CODE_MAPPING).forEach(([code, name]) => {
        if (code.toLowerCase().includes(searchTerm) || name.toLowerCase().includes(searchTerm)) {
            results.push({ code, name });
        }
    });

    return results;
};

/**
 * Validate if a station code exists
 * @param {string} stationCode - Station code to validate
 * @returns {boolean} True if station code exists
 */
export const isValidStationCode = (stationCode) => {
    if (!stationCode) return false;
    const normalizedCode = stationCode.toString().toUpperCase();
    return normalizedCode in STATION_CODE_MAPPING;
};

// Export default object with all functions for convenience
export default {
    STATION_CODE_MAPPING,
    getStationFullName,
    getDisplayStationName,
    getFilenameSafeStationName,
    getAllStationCodes,
    getAllStationNames,
    searchStations,
    isValidStationCode,
};
