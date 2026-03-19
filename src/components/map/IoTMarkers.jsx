import React from "react";
import L from "leaflet";
import { convertDMSToDecimal } from "@components/convertDMSToDecimal";
import { fetchIoTStations, fetchIoTData } from "@components/map/mapDataServices";

const normalizeIoTRow = (row) => {
    const dateValue = row?.Date || row?.date_time || row?.timestamp || row?.created_at || null;
    return {
        ...row,
        Date: dateValue,
    };
};

const getIoTRowsFromResponse = (response) => {
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.dataPoints)) return response.dataPoints;
    if (Array.isArray(response?.rows)) return response.rows;
    if (Array.isArray(response?.result?.data)) return response.result.data;
    return [];
};

const buildIoTChartPayload = (station, iotResponse) => {
    const rawRows = getIoTRowsFromResponse(iotResponse);
    const normalizedRows = rawRows
        .map(normalizeIoTRow)
        .filter((row) => Boolean(row.Date));

    const stationInfo = iotResponse?.station || station;
    const stationName =
        stationInfo?.station_name ||
        station?.station_name ||
        station?.stationName ||
        "Trạm IoT";
    const serialNumber =
        stationInfo?.serial_number ||
        stationInfo?.serial ||
        station?.serial_number ||
        station?.serial ||
        "";

    return {
        stationInfo,
        stationName,
        serialNumber,
        dataPoints: normalizedRows,
        data: normalizedRows,
        summary: {
            totalRecords: iotResponse?.count || normalizedRows.length,
            firstRecord: normalizedRows[normalizedRows.length - 1]?.Date || null,
            lastRecord: normalizedRows[0]?.Date || null,
        },
    };
};

// Create custom IoT icon
export const getIoTIcon = (status, totalRecords) => {
    const isActive = status === 'active' && parseInt(totalRecords) > 0;
    console.log("totalRecords", totalRecords)
    return L.divIcon({
        className: 'custom-iot-marker',
        html: `
            <div class="iot-marker-container">
                <div class="iot-marker ${isActive ? 'active' : 'inactive'}">
                    <div class="iot-icon">
                        <i class="fa-solid fa-tower-broadcast"></i>
                    </div>
                    ${isActive ? `
                        <div class="iot-signal">
                            <div class="signal-ring ring-1"></div>
                            <div class="signal-ring ring-2"></div>
                            <div class="signal-ring ring-3"></div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
};

// Create IoT station popup - Lấy dữ liệu từ API thực tế
export const createIoTPopup = (station) => {
    console.log('Creating popup for station:', station);
    
    // Sử dụng dữ liệu thật từ API response
    const isActive = station.status === 'active' && parseInt(station.total_records || 0) > 0;
    const hasSerial = station.serial_number && station.serial_number.trim() !== '';
    
    // Format thời gian dữ liệu cuối cùng
    const lastDataTime = station.last_data_time ? 
        new Date(station.last_data_time).toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Chưa có dữ liệu';
    
    // Xác định trạng thái
    let statusClass = 'status-inactive';  
    let statusText = 'Không hoạt động';
    let statusColor = '#6c757d';
    
    if (isActive) {
        statusClass = 'status-active';
        statusText = 'Đang hoạt động'; 
        statusColor = '#198754';
    } else if (station.status === 'active' && !hasSerial) {
        statusClass = 'status-pending';
        statusText = 'Chưa lắp đặt';
        statusColor = '#ffc107';
    }

    // Lấy dữ liệu thật từ station object
    const totalRecords = parseInt(station.total_records || 0);
    const stationCode = station.station_code || 'N/A';
    const serialNumber = station.serial_number || 'Chưa có';
    const frequency = station.frequency || 'N/A';
    const timePeriod = station.time_period || 'Chưa xác định';
    const stationName = station.station_name || 'Trạm IoT';

    return `
        <div class="modern-popup iot-popup">
            <div class="popup-header">
                <div class="popup-icon">📡</div>
                <div class="popup-title">
                    <h4 class="popup-name">${stationName}</h4>
                    <span class="popup-type">Trạm IoT</span>
                </div>
                <div class="popup-status ${statusClass}">
                    ${statusText}
                </div>
            </div>
            
            <div class="popup-content">
                <div class="popup-main-value">
                    <span class="value-label">Tổng số bản ghi</span>
                    <span class="value-number" style="color: ${statusColor}">
                        ${totalRecords.toLocaleString()} records
                    </span>
                    <span class="value-date">${lastDataTime}</span>
                </div>
                
                <div class="popup-details">
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-content py-2">
                                <strong class="detail-label"><i class="detail-icon">🏷️</i> Mã trạm: </strong>
                                <span class="detail-value">${stationCode}</span>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-content py-2">
                                <strong class="detail-label"><i class="detail-icon">📟</i> Serial: </strong>
                                <span class="detail-value">${serialNumber}</span>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-content py-2">
                                <strong class="detail-label"><i class="detail-icon">⏱️</i> Tần suất: </strong>
                                <span class="detail-value">${frequency}</span>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-content py-2">
                                <strong class="detail-label"><i class="detail-icon">📅</i> Thời gian: </strong>
                                <span class="detail-value">${timePeriod}</span>
                            </div>
                        </div>
                        
                        ${station.note ? `
                            <div class="detail-item">
                                <div class="detail-content py-2">
                                    <strong class="detail-label"><i class="detail-icon">📝</i> Ghi chú: </strong>
                                    <span class="detail-value">${station.note}</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${hasSerial && totalRecords > 0 ? `
                    <div class="popup-actions">
                        <button class="btn-view-data" data-serial="${station.serial_number}" data-name="${stationName}">
                            <i class="fa-solid fa-chart-line"></i>
                            Xem dữ liệu chi tiết
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
};

// Get IoT tooltip class
export const getIoTTooltipClass = (status, totalRecords) => {
    const isActive = status === 'active' && parseInt(totalRecords) > 0;
    
    if (isActive) {
        return "custom-tooltip tooltip-iot-active";
    } else if (status === 'active') {
        return "custom-tooltip tooltip-iot-pending";
    } else {
        return "custom-tooltip tooltip-iot-inactive";
    }
};

// Main function to render IoT stations on map
export const renderIoTStations = async (mapInstance, setIotData) => {
    try {
        const stationsResponse = await fetchIoTStations('active');

        if (!stationsResponse.success || !stationsResponse.data) {
            console.warn('⚠️ No IoT stations data received', stationsResponse);
            return;
        }

        const stations = stationsResponse.data;
        const latLngs = [];

        for (const station of stations) {
            // Convert DMS coordinates to decimal
            const lat = convertDMSToDecimal(station.latitude);
            const lng = convertDMSToDecimal(station.longitude);

            if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
                console.warn(`⚠️ Không thể chuyển tọa độ tại trạm ${station.station_name}`, {
                    latitude: station.latitude,
                    longitude: station.longitude,
                    convertedLat: lat,
                    convertedLng: lng
                });
                continue;
            }

            const icon = getIoTIcon(station.status, station.total_records);
            const tooltipClass = getIoTTooltipClass(station.status, station.total_records);

            const marker = L.marker([lat, lng], {
                icon,
                isIoTStation: true,
                stationData: station
            });

            // Add to map first
            marker.addTo(mapInstance);
            
            // Set custom properties after adding to map
            marker.isIoTStation = true;
            marker.stationData = station;

            latLngs.push([lat, lng]);

            // Add permanent tooltip
            marker.bindTooltip(station.station_name, {
                permanent: true,
                direction: "top",
                offset: [0, -10],
                className: tooltipClass,
            });

            // Add click handler
            marker.on("click", async () => {
                try {
                    const zoomLevel = 13;
                    const clickLatLng = L.latLng(lat, lng);
                    const map = mapInstance;
                    const originalPoint = map.latLngToContainerPoint(clickLatLng);
                    const offsetPixels = L.point(0, 70);
                    const newPoint = originalPoint.subtract(offsetPixels);
                    const newLatLng = map.containerPointToLatLng(newPoint);
                    
                    map.setView(newLatLng, zoomLevel, {
                        animate: true,
                    });

                    const popupHTML = createIoTPopup(station);
                    marker.bindPopup(popupHTML, {
                        maxWidth: 350,
                        className: "custom-popup iot-custom-popup",
                    });
                    marker.openPopup();

                    // Add event listener for view data button
                    setTimeout(() => {
                        const btnViewData = document.querySelector('.btn-view-data');
                        if (btnViewData && station.serial_number) {
                            btnViewData.addEventListener('click', async () => {
                                try {
                                    const iotResponse = await fetchIoTData(station.serial_number, {
                                        groupBy: "none",
                                    });
                                    const chartPayload = buildIoTChartPayload(station, iotResponse);

                                    if (typeof setIotData === "function") {
                                        setIotData(chartPayload);
                                    }

                                    // Gọi trực tiếp modal IoT chart (window.onOpenIoTChart hoặc props)
                                    if (typeof window.onOpenIoTChart === 'function') {
                                        window.onOpenIoTChart(chartPayload);
                                    } else {
                                        alert('Không tìm thấy hàm mở biểu đồ IoT.');
                                    }
                                    marker.closePopup();
                                } catch (error) {
                                    console.error('❌ Error khi mở modal IoT:', error);
                                    alert('Có lỗi khi mở biểu đồ IoT');
                                }
                            });
                        }
                    }, 100);

                    // Auto close popup and return to overview
                    marker.once("popupclose", () => {
                        mapInstance.flyTo([10.769236178832742, 106.42333733153667], 10);
                    });
                    
                } catch (error) {
                    console.error("❌ Error in IoT marker click handler:", error);
                }
            });
        }

        // Fit map to show all IoT stations
        if (latLngs.length > 0) {
            const bounds = L.latLngBounds(latLngs);
            mapInstance.fitBounds(bounds, {
                padding: [50, 50],
                animate: true,
            });
        } else {
            console.warn('⚠️ No valid coordinates found, cannot fit bounds');
        }
        // Count current markers
        let markerCount = 0;
        let allLayersCount = 0;
        if (mapInstance.eachLayer) {
            mapInstance.eachLayer((layer) => {
                allLayersCount++;
                // Check both options and direct property
                if (layer.isIoTStation === true || (layer.options && layer.options.isIoTStation === true)) {
                    markerCount++;
                }
            });
        }
    } catch (error) {
        console.error("❌ Error rendering IoT stations:", error);
        console.error('❌ Error stack:', error.stack);
    }
};

// Function to remove existing IoT markers from map
export const removeIoTStations = (mapInstance) => {
    if (!mapInstance.eachLayer) {
        console.warn('⚠️ Map instance does not have eachLayer method');
        return;
    }
    
    let removedCount = 0;
    const layersToRemove = [];
    
    mapInstance.eachLayer((layer) => {
        if (layer.isIoTStation || (layer.options && layer.options.isIoTStation)) {
            layersToRemove.push(layer);
        }
    });
    layersToRemove.forEach((layer) => {
        mapInstance.removeLayer(layer);
        removedCount++;
    });
};