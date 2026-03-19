// Ví dụ cách sử dụng renderIoTStations trong Map component

import { renderIoTStations } from "@components/map/IoTMarkers";

// Trong Map component của bạn:
const handleIoTLayerToggle = async (checked) => {
    if (checked && mapInstance) {
        // Hiển thị IoT stations trên map
        await renderIoTStations(mapInstance, setIotData);
    } else if (mapInstance) {
        // Ẩn IoT stations
        mapInstance.eachLayer((layer) => {
            if (layer.options && layer.options.isIoTStation) {
                mapInstance.removeLayer(layer);
            }
        });
    }
};

// Hoặc trong useEffect khi layer được toggle:
useEffect(() => {
    if (mapInstance && enabledLayers.includes("iotStations")) {
        renderIoTStations(mapInstance, setIotData);
    }
    
    // Cleanup function
    return () => {
        if (mapInstance) {
            mapInstance.eachLayer((layer) => {
                if (layer.options && layer.options.isIoTStation) {
                    mapInstance.removeLayer(layer);
                }
            });
        }
    };
}, [mapInstance, enabledLayers]);

/*
CÁCH SỬ DỤNG:

1. Import renderIoTStations vào Map component
2. Gọi hàm khi layer "iotStations" được enable
3. Truyền mapInstance và setIotData callback
4. IoT markers sẽ hiển thị với:
   - Icon animation cho trạm active
   - Tooltip hiển thị tên trạm
   - Popup với thông tin chi tiết
   - Button "Xem dữ liệu chi tiết" cho trạm có serial
   - Auto zoom và focus khi click

FEATURES:
- ✅ DMS coordinate conversion
- ✅ Active/Inactive status visualization
- ✅ Signal animation cho trạm hoạt động
- ✅ Popup với thông tin đầy đủ
- ✅ Click để xem dữ liệu chi tiết
- ✅ Auto fit bounds để hiển thị tất cả trạm
- ✅ Responsive popup design
- ✅ Error handling cho tọa độ invalid
*/