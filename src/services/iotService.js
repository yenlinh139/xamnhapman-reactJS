// Use proxy in development, direct API in production
const IOT_API_BASE_URL = import.meta.env.DEV 
    ? "/api/iot" 
    : "https://thegreenlab.xyz/Datums/DataByDateJson";

const IOT_CREDENTIALS = {
    username: "nguyenduyliem@hcmuaf.edu.vn",
    password: "DHNL@2345",
};

export class IoTService {
    static async fetchStationData(serialNumber, startDate, endDate) {
        try {
            const url = `${IOT_API_BASE_URL}?DeviceSerialNumber=${serialNumber}&StartDate=${startDate}&EndDate=${endDate}`;
            
            console.log('Making request to:', url);
            
            // In development, proxy handles auth. In production, we need to add auth header
            const headers = {
                'Content-Type': 'application/json',
            };
            
            if (!import.meta.env.DEV) {
                // Only add auth header in production (proxy handles it in dev)
                const credentials = btoa(`${IOT_CREDENTIALS.username}:${IOT_CREDENTIALS.password}`);
                headers['Authorization'] = `Basic ${credentials}`;
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers,
                mode: 'cors',
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                return {
                    success: false,
                    message: `Lỗi server: ${response.status}`,
                    data: []
                };
            }

            const data = await response.json();
            
            // Kiểm tra có dữ liệu hay không
            if (!data || !Array.isArray(data) || data.length === 0) {
                return {
                    success: false,
                    message: "Không có dữ liệu trong khoảng thời gian đã chọn",
                    data: []
                };
            }

            return {
                success: true,
                message: `Tìm thấy ${data.length} bản ghi`,
                data: data
            };

        } catch (error) {
            console.error('Error fetching IoT station data:', error);
            
            // Check if it's a CORS error
            if (error.message.includes('CORS') || error.message.includes('fetch') || error.name === 'TypeError') {
                return {
                    success: false,
                    message: 'Lỗi kết nối API. Có thể do vấn đề CORS hoặc mạng.',
                    data: []
                };
            }
            
            return {
                success: false,
                message: error.message || 'Có lỗi xảy ra khi lấy dữ liệu',
                data: []
            };
        }
    }

    static formatDataForDisplay(data, stationInfo) {
        if (!data || !Array.isArray(data)) {
            return {
                stationName: stationInfo.name,
                serialNumber: stationInfo.serial,
                dataPoints: [],
                summary: {
                    totalRecords: 0,
                    dateRange: 'N/A'
                }
            };
        }

        // Xử lý và format dữ liệu
        const formattedPoints = data.map(item => {
            const salinityValue = parseFloat(item.value) || 0;
            return {
                ...item,
                value: salinityValue,
                riskLevel: this.calculateRiskLevel(salinityValue),
                riskColor: this.getRiskColor(salinityValue),
                formattedValue: `${salinityValue.toFixed(2)}‰`
            };
        });

        return {
            stationName: stationInfo.name,
            serialNumber: stationInfo.serial,
            dataPoints: formattedPoints,
            summary: {
                totalRecords: data.length,
                dateRange: data.length > 0 ? 
                    `${new Date(data[0].Date || data[0].date).toLocaleDateString("vi-VN")} - ${new Date(data[data.length - 1].Date || data[data.length - 1].date).toLocaleDateString("vi-VN")}` : 
                    'N/A'
            }
        };
    }

    static calculateRiskLevel(salinityValue) {
        if (salinityValue < 1) return 1;      // Bình thường (< 1‰)
        if (salinityValue < 4) return 2;      // Rủi ro cấp 1 (1-4‰)
        if (salinityValue < 10) return 3;     // Rủi ro cấp 2 (4-10‰)
        return 4;                             // Rủi ro cấp 3 (> 10‰)
    }

    static getRiskColor(salinityValue) {
        const riskLevel = this.calculateRiskLevel(salinityValue);
        const colors = {
            1: '#22c55e', // Xanh lá
            2: '#fbbf24', // Vàng
            3: '#f97316', // Cam
            4: '#ef4444'  // Đỏ
        };
        return colors[riskLevel] || '#6b7280';
    }
}

export default IoTService;