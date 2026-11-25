import { useEffect, useRef } from "react";
import L from "leaflet";

const DEFAULT_CENTER = [10.8231, 106.6297];
const DEFAULT_ZOOM = 10;

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
            markerRef.current = L.marker([lat, lng]).addTo(map);
        } else {
            markerRef.current.setLatLng([lat, lng]);
        }
        map.setView([lat, lng], Math.max(map.getZoom(), 14), { animate: true });
    }, [lat, lng]);

    return <div ref={containerRef} style={{ height: 280, borderRadius: 8 }} />;
};

export default LocationPickerMap;
