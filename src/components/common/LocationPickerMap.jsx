import { useEffect, useRef } from "react";
import L from "leaflet";

const DEFAULT_CENTER = [10.8231, 106.6297];
const DEFAULT_ZOOM = 10;

// Icon riêng cho marker chọn toạ độ - KHÔNG dùng icon mặc định của Leaflet (L.marker() không
// truyền icon) vì icon mặc định tham chiếu file ảnh theo đường dẫn tương đối của gói leaflet, bị
// vỡ sau khi build production (bundler không giữ đúng đường dẫn đó), chỉ hiện đúng lúc chạy dev.
// Cùng kiểu icon FontAwesome + divIcon như các marker thật trên bản đồ (SalinityMarkers.jsx,
// ReservoirMarkers.jsx...), thêm viền trắng + đổ bóng để nổi bật trên mọi nền bản đồ (đường phố,
// vệ tinh...).
const pickerIcon = L.divIcon({
    html: `
        <i class="fa-solid fa-map-pin" style="
            color: #dc2626;
            font-size: 32px;
            -webkit-text-stroke: 1.5px #ffffff;
            filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45));
        "></i>
    `,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 30],
});

// Bản đồ nhỏ cho phép bấm chọn toạ độ (độ thập phân) - dùng trong các form "Thêm vị trí" ở trang
// quản trị dữ liệu. `lat`/`lng` là number|null (toạ độ đang chọn), `onPick(lat, lng)` gọi khi bấm
// vào bản đồ.
const LocationPickerMap = ({ lat, lng, onPick }) => {
    const containerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const onPickRef = useRef(onPick);
    onPickRef.current = onPick;

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return undefined;

        const hasInitialPoint = Number.isFinite(lat) && Number.isFinite(lng);
        const map = L.map(containerRef.current, {
            center: hasInitialPoint ? [lat, lng] : DEFAULT_CENTER,
            zoom: hasInitialPoint ? 14 : DEFAULT_ZOOM,
        });
        L.tileLayer("https://mt1.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}", {
            attribution: "Google Maps",
            maxZoom: 20,
        }).addTo(map);

        map.on("click", (event) => {
            onPickRef.current?.(event.latlng.lat, event.latlng.lng);
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            markerRef.current?.remove();
            markerRef.current = null;
            return;
        }

        if (!markerRef.current) {
            markerRef.current = L.marker([lat, lng], { icon: pickerIcon }).addTo(map);
        } else {
            markerRef.current.setLatLng([lat, lng]);
        }
        map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true });
    }, [lat, lng]);

    return <div ref={containerRef} style={{ height: 280, borderRadius: 8 }} />;
};

export default LocationPickerMap;
