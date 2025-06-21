import L from "leaflet";
import { getDistrictLabels, getCommuneLabels, createLabelMarker } from "./labelService";

// Đối tượng lưu trữ các label markers
const labelMarkers = {
    districts: [],
    communes: [],
};

// Hàm hiển thị label huyện
export const showDistrictLabels = async (mapInstance) => {
    try {
        // Xóa các label huyện cũ nếu có
        clearDistrictLabels(mapInstance);

        const districts = await getDistrictLabels();

        districts.forEach((district) => {
            if (district.centroid) {
                const marker = L.marker(district.centroid, {
                    icon: createLabelMarker(district.name, "district"),
                    interactive: false, // Không thể click vào label
                    isDistrictLabel: true,
                }).addTo(mapInstance);

                labelMarkers.districts.push(marker);
            }
        });
    } catch (error) {
        console.error("Error showing district labels:", error);
    }
};

// Hàm hiển thị label xã
export const showCommuneLabels = async (mapInstance) => {
    try {
        // Xóa các label xã cũ nếu có
        clearCommuneLabels(mapInstance);

        const communes = await getCommuneLabels();

        // Chỉ hiển thị label xã khi zoom >= 12 để tránh quá tải
        const currentZoom = mapInstance.getZoom();
        if (currentZoom < 12) {
            console.log("Zoom level quá thấp để hiển thị label xã");
            return;
        }

        communes.forEach((commune) => {
            if (commune.centroid) {
                const marker = L.marker(commune.centroid, {
                    icon: createLabelMarker(commune.name, "commune"),
                    interactive: false, // Không thể click vào label
                    isCommuneLabel: true,
                }).addTo(mapInstance);

                labelMarkers.communes.push(marker);
            }
        });
    } catch (error) {
        console.error("Error showing commune labels:", error);
    }
};

// Hàm xóa label huyện
export const clearDistrictLabels = (mapInstance) => {
    labelMarkers.districts.forEach((marker) => {
        if (mapInstance.hasLayer(marker)) {
            mapInstance.removeLayer(marker);
        }
    });
    labelMarkers.districts = [];
};

// Hàm xóa label xã
export const clearCommuneLabels = (mapInstance) => {
    labelMarkers.communes.forEach((marker) => {
        if (mapInstance.hasLayer(marker)) {
            mapInstance.removeLayer(marker);
        }
    });
    labelMarkers.communes = [];
};

// Hàm xóa tất cả label
export const clearAllLabels = (mapInstance) => {
    clearDistrictLabels(mapInstance);
    clearCommuneLabels(mapInstance);
};

// Hàm xử lý việc hiển thị label theo zoom level
export const handleZoomChange = (mapInstance, enabledLayers) => {
    const currentZoom = mapInstance.getZoom();

    // Hiển thị/ẩn label xã dựa trên zoom level
    if (enabledLayers.includes("DiaPhanXa")) {
        if (currentZoom >= 12) {
            if (labelMarkers.communes.length === 0) {
                showCommuneLabels(mapInstance);
            }
        } else {
            clearCommuneLabels(mapInstance);
        }
    }
};

// Hàm xử lý việc hiển thị/ẩn label khi layer được toggle
export const handleLayerLabelToggle = async (mapInstance, layerName, isEnabled) => {
    switch (layerName) {
        case "DiaPhanHuyen":
            if (isEnabled) {
                await showDistrictLabels(mapInstance);
            } else {
                clearDistrictLabels(mapInstance);
            }
            break;

        case "DiaPhanXa":
            if (isEnabled) {
                await showCommuneLabels(mapInstance);
                const currentZoom = mapInstance.getZoom();
                if (currentZoom >= 9) {
                    await showCommuneLabels(mapInstance);
                }
            } else {
                clearCommuneLabels(mapInstance);
            }
            break;

        default:
            break;
    }
};
