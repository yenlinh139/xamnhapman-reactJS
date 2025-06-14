/**
 * Salinity risk classification utility
 * New classification system based on disaster risk levels due to saltwater intrusion
 */

/**
 * Get salinity risk level based on new classification system
 * @param {Object} data - Salinity data for all stations
 * @param {string} stationCode - Optional station code for specific station classification
 * @returns {Object} - Classification result with level, class, and description
 */

/**
 * Get classification for a single station value
 * @param {number|string} value - Salinity value
 * @param {string} stationCode - Station code
 * @returns {Object} - Classification result
 */
export const getSingleStationClassification = (value, stationCode = null) => {
    // Handle missing data
    if (
        value === "NULL" ||
        value === null ||
        value === undefined ||
        value === "" ||
        isNaN(parseFloat(value))
    ) {
        return {
            level: "no-data",
            class: "no-data",
            description: "Khuyết số liệu",
            shortText: "Khuyết số liệu",
        };
    }

    const numericValue = parseFloat(value);

    // Basic single station classification
    if (numericValue < 1) {
        return {
            level: "normal",
            class: "normal",
            description: "Bình thường (độ mặn < 1‰)",
            shortText: "Bình thường",
        };
    } else if (numericValue <= 4) {
        // For Nhà Bè station (MNB), values 1-4‰ are Risk Level 1
        if (stationCode === "MNB") {
            return {
                level: "warning",
                class: "warning",
                description: "Rủi ro cấp 1 (độ mặn tại Nhà Bè 1-4‰)",
                shortText: "Rủi ro cấp 1",
            };
        } else {
            // Other stations with 1-4‰ are Risk Level 2 (orange)
            return {
                level: "high-warning",
                class: "high-warning",
                description: "Rủi ro cấp 2 (độ mặn 1-4‰)",
                shortText: "Rủi ro cấp 2",
            };
        }
    } else {
        // For values > 4‰
        if (stationCode === "MNB") {
            // Nhà Bè with >4‰ - for single station display, we show it as Risk Level 2 (orange)
            // The actual system-wide classification will be determined by getSystemWideClassification
            return {
                level: "high-warning",
                class: "high-warning",
                description: "Rủi ro cấp 2 (độ mặn tại Nhà Bè > 4‰)",
                shortText: "Rủi ro cấp 2",
            };
        } else {
            // Other stations with >4‰ are always Risk Level 3 (red)
            return {
                level: "critical",
                class: "critical",
                description: "Rủi ro cấp 3 (độ mặn > 4‰)",
                shortText: "Rủi ro cấp 3",
            };
        }
    }
};

/**
 * Get system-wide classification based on all station data
 * @param {Object} data - Object containing salinity data for all stations
 * @returns {Object} - Classification result
 */
export const getSystemWideClassification = (data) => {
    if (!data || typeof data !== "object") {
        return {
            level: "no-data",
            class: "no-data",
            description: "Khuyết số liệu",
            shortText: "Khuyết số liệu",
        };
    }

    // Station codes mapping
    const stations = {
        CRT: "Cầu Rạch Tra",
        CTT: "Cầu Thủ Thiêm",
        COT: "Cầu Ông Thìn",
        CKC: "Cống Kênh C",
        KXAH: "Kênh Xáng - An Hạ",
        MNB: "Mũi Nhà Bè", // This is the key station for classification (NB_TV - Thủy văn)
        PCL: "Phà Cát Lái",
    };

    // Get valid numeric values for each station
    const stationValues = {};
    let hasData = false;

    Object.keys(stations).forEach((code) => {
        const value = data[code];
        if (
            value !== "NULL" &&
            value !== null &&
            value !== undefined &&
            value !== "" &&
            !isNaN(parseFloat(value))
        ) {
            stationValues[code] = parseFloat(value);
            hasData = true;
        } else {
            stationValues[code] = null;
        }
    });

    // If no data available
    if (!hasData) {
        return {
            level: "no-data",
            class: "no-data",
            description: "Khuyết số liệu",
            shortText: "Khuyết số liệu",
        };
    }

    // Classification logic based on new requirements:
    // 1. Bình thường (độ mặn tại các điểm <1‰)
    // 2. Rủi ro cấp 1 (độ mặn tại Nhà Bè 1-4‰)
    // 3. Rủi ro cấp 2 (độ mặn tại Nhà Bè >4‰, các điểm khác 1-4‰)
    // 4. Rủi ro cấp 3 (độ mặn tại các điểm >4‰)

    const nhaBe = stationValues.MNB; // Mũi Nhà Bè
    const otherStations = Object.keys(stationValues)
        .filter((code) => code !== "MNB")
        .map((code) => stationValues[code])
        .filter((val) => val !== null);

    // Check if all stations < 1‰
    const allStationsUnder1 = Object.values(stationValues).every((val) => val === null || val < 1);

    // Check if any OTHER station (not Nhà Bè) has salinity > 4‰
    const anyOtherStationOver4 = otherStations.some((val) => val > 4);

    // Rủi ro cấp 3: độ mặn tại các điểm >4‰ (bao gồm cả trạm khác ngoài Nhà Bè)
    if (anyOtherStationOver4) {
        return {
            level: "risk-3",
            class: "critical",
            description: "Rủi ro cấp 3 (độ mặn tại các điểm >4‰)",
            shortText: "Rủi ro cấp 3",
        };
    }

    // Rủi ro cấp 2: độ mặn tại Nhà Bè >4‰, các điểm khác 1-4‰
    if (nhaBe !== null && nhaBe > 4) {
        // Check that NO other station has salinity > 4‰ (if any other station > 4‰, it would be Risk Level 3)
        const noOtherStationOver4 = !anyOtherStationOver4;
        if (noOtherStationOver4) {
            return {
                level: "risk-2",
                class: "high-warning",
                description: "Rủi ro cấp 2 (độ mặn tại Nhà Bè >4‰, các điểm khác ≤4‰)",
                shortText: "Rủi ro cấp 2",
            };
        }
    }

    // Rủi ro cấp 1: độ mặn tại Nhà Bè 1-4‰
    if (nhaBe !== null && nhaBe >= 1 && nhaBe <= 4) {
        return {
            level: "risk-1",
            class: "warning",
            description: "Rủi ro cấp 1 (độ mặn tại Nhà Bè 1-4‰)",
            shortText: "Rủi ro cấp 1",
        };
    }

    // Bình thường: độ mặn tại các điểm <1‰
    if (allStationsUnder1) {
        return {
            level: "normal",
            class: "normal",
            description: "Bình thường (độ mặn tại các điểm <1‰)",
            shortText: "Bình thường",
        };
    }

    // Default case - mixed conditions
    return {
        level: "mixed",
        class: "warning",
        description: "Tình trạng hỗn hợp - cần đánh giá chi tiết",
        shortText: "Hỗn hợp",
    };
};

/**
 * Get CSS class name for salinity level (backward compatibility)
 * @param {number|string} value - Salinity value
 * @param {string} stationCode - Optional station code
 * @returns {string} - CSS class name
 */
export const getSalinityClass = (value, stationCode = null) => {
    const classification = getSingleStationClassification(value, stationCode);
    return classification.class;
};

/**
 * Get risk level description for display
 * @param {Object} data - Salinity data
 * @param {boolean} short - Whether to return short text
 * @returns {string} - Risk level description
 */
export const getRiskLevelText = (data, short = false) => {
    const classification = getSystemWideClassification(data);
    return short ? classification.shortText : classification.description;
};
