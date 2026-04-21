import React, { useState } from "react";
import axiosInstance from "@config/axios-config";
import { ToastCommon } from "@components/ToastCommon.jsx";
import { TOAST } from "@common/constants.js";
import { convertDMSToDecimal, dmsToDecimal } from "@components/convertDMSToDecimal";

const getApiArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.communes)) return payload.communes;
    return [];
};

const getBoundsFromCoordinates = (coordinates) => {
    const lats = [];
    const lngs = [];

    const extractCoords = (coords) => {
        coords.forEach((value) => {
            if (typeof value[0] === "number" && typeof value[1] === "number") {
                lngs.push(value[0]);
                lats.push(value[1]);
            } else {
                extractCoords(value);
            }
        });
    };

    extractCoords(coordinates);

    const southWest = [Math.min(...lats), Math.min(...lngs)];
    const northEast = [Math.max(...lats), Math.max(...lngs)];

    return [southWest, northEast];
};

const normalizeCoordinate = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return value;

    const raw = String(value).trim();
    if (!raw) return null;

    const numeric = parseFloat(raw);
    if (!Number.isNaN(numeric) && /^-?\d+(\.\d+)?$/.test(raw)) {
        return numeric;
    }

    return convertDMSToDecimal(raw) ?? dmsToDecimal(raw);
};

const parseGeoJsonValue = (rawValue) => {
    if (!rawValue) return null;

    let parsedValue = rawValue;
    if (typeof parsedValue === "string") {
        try {
            parsedValue = JSON.parse(parsedValue);
        } catch {
            return null;
        }
    }

    if (parsedValue?.type === "Feature") {
        return parsedValue;
    }

    if (parsedValue?.type && parsedValue?.coordinates) {
        return {
            type: "Feature",
            geometry: parsedValue,
            properties: parsedValue?.properties || {},
        };
    }

    if (parsedValue?.geometry?.type) {
        return {
            type: "Feature",
            geometry: parsedValue.geometry,
            properties: parsedValue?.properties || {},
        };
    }

    return null;
};

const normalizeAdministrativeItem = (item, type) => {
    const code = String(
        item?.maHuyen ??
            item?.mahuyen ??
            item?.MaHuyen ??
            item?.maXa ??
            item?.maxa ??
            item?.MaXa ??
            item?.id ??
            "",
    );

    const name =
        item?.tenHuyen ||
        item?.tenhuyen ||
        item?.TenHuyen ||
        item?.tenXa ||
        item?.tenxa ||
        item?.TenXa ||
        item?.name ||
        code ||
        (type === "district" ? "Huyện" : "Xã");

    return {
        ...item,
        code,
        name,
        type,
        feature: parseGeoJsonValue(item?.geom || item?.geometry || item?.geojson),
    };
};

function AreaInterestSelector({ setSelectedLocation, setHighlightedFeature }) {
    const [districtList, setDistrictList] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState("");
    const [communeList, setCommuneList] = useState([]);
    const [selectedCommune, setSelectedCommune] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [districtLoading, setDistrictLoading] = useState(false);
    const [communeLoading, setCommuneLoading] = useState(false);

    const focusAdministrativeArea = (item, fallbackZoom = 13) => {
        if (!item) return;

        const feature = item.feature || parseGeoJsonValue(item?.geom || item?.geometry || item?.geojson);
        const geometry = feature?.geometry;
        const areaId = item?.code || item?.id || item?.maHuyen || item?.mahuyen || item?.maXa || item?.maxa;
        const areaName =
            item?.name ||
            item?.tenHuyen ||
            item?.tenhuyen ||
            item?.TenHuyen ||
            item?.tenXa ||
            item?.tenxa ||
            item?.TenXa ||
            "Khu vực";

        if (geometry?.type === "Polygon" || geometry?.type === "MultiPolygon") {
            try {
                const bounds = getBoundsFromCoordinates(geometry.coordinates);
                setSelectedLocation({ bounds });
                setHighlightedFeature({
                    type: "Feature",
                    geometry,
                    properties: { ...(feature?.properties || {}), name: areaName },
                    id: areaId,
                    name: areaName,
                });
                return;
            } catch (error) {
                console.error("Lỗi khi focus khu vực hành chính:", error);
            }
        }

        const lat = normalizeCoordinate(item?.centerLat ?? item?.lat ?? item?.latitude ?? item?.ViDo);
        const lng = normalizeCoordinate(item?.centerLng ?? item?.lng ?? item?.longitude ?? item?.KinhDo);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            setSelectedLocation({ lat, lng, zoom: fallbackZoom });
            setHighlightedFeature({
                id: areaId,
                icon: "marker",
                name: areaName,
                geometry: {
                    type: "Point",
                    coordinates: [lng, lat],
                },
            });
        }
    };

    const loadAdministrativeDistricts = async () => {
        if (districtLoading) return;

        setDistrictLoading(true);
        try {
            const response = await axiosInstance.get("/administrative/districts");
            const districts = getApiArray(response?.data).map((item) =>
                normalizeAdministrativeItem(item, "district"),
            );
            setDistrictList(districts);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách huyện:", error);
            ToastCommon(TOAST.ERROR, "Không thể tải danh sách huyện.");
        } finally {
            setDistrictLoading(false);
        }
    };

    const toggleAreaInterest = async () => {
        const nextOpen = !isOpen;
        setIsOpen(nextOpen);

        if (nextOpen && districtList.length === 0) {
            await loadAdministrativeDistricts();
        }
    };

    const handleDistrictChange = async (districtCode) => {
        setSelectedDistrict(districtCode);
        setSelectedCommune("");
        setCommuneList([]);

        if (!districtCode) {
            setHighlightedFeature(null);
            return;
        }

        const selectedDistrictItem = districtList.find((item) => item.code === districtCode);

        setCommuneLoading(true);
        try {
            const response = await axiosInstance.get(
                `/administrative/communes/${encodeURIComponent(districtCode)}`,
            );
            const responsePayload = response?.data?.data || response?.data || {};

            const districtDetail = normalizeAdministrativeItem(
                {
                    ...selectedDistrictItem,
                    ...responsePayload,
                    maHuyen:
                        responsePayload?.maHuyen ||
                        responsePayload?.mahuyen ||
                        selectedDistrictItem?.code ||
                        districtCode,
                },
                "district",
            );

            focusAdministrativeArea(districtDetail, 12);
            setDistrictList((prevState) =>
                prevState.map((item) => (item.code === districtCode ? { ...item, ...districtDetail } : item)),
            );

            const communes = getApiArray(responsePayload).map((item) =>
                normalizeAdministrativeItem(item, "commune"),
            );
            setCommuneList(communes);
        } catch (error) {
            console.error("Lỗi khi lấy danh sách xã:", error);
            if (selectedDistrictItem) {
                focusAdministrativeArea(selectedDistrictItem, 12);
            }
            ToastCommon(TOAST.ERROR, "Không thể tải danh sách xã của huyện này.");
        } finally {
            setCommuneLoading(false);
        }
    };

    const handleCommuneChange = async (communeCode) => {
        setSelectedCommune(communeCode);

        if (!communeCode) {
            const district = districtList.find((item) => item.code === selectedDistrict);
            if (district) {
                focusAdministrativeArea(district, 12);
            }
            return;
        }

        try {
            const response = await axiosInstance.get(
                `/administrative/commune/${encodeURIComponent(communeCode)}`,
            );
            const rawCommune = Array.isArray(response?.data)
                ? response.data[0]
                : response?.data?.data || response?.data;
            const commune = normalizeAdministrativeItem(rawCommune, "commune");
            focusAdministrativeArea(commune, 14);
        } catch (error) {
            console.error("Lỗi khi lấy chi tiết xã:", error);
            const commune = communeList.find((item) => item.code === communeCode);
            if (commune) {
                focusAdministrativeArea(commune, 14);
            } else {
                ToastCommon(TOAST.ERROR, "Không thể hiển thị khu vực xã đã chọn.");
            }
        }
    };

    const handleMoveToSelectedArea = () => {
        const commune = communeList.find((item) => item.code === selectedCommune);
        if (commune) {
            focusAdministrativeArea(commune, 14);
            return;
        }

        const district = districtList.find((item) => item.code === selectedDistrict);
        if (district) {
            focusAdministrativeArea(district, 12);
        }
    };

    return (
        <div className="area-interest-header">
            <button
                type="button"
                className={`area-interest-toggle ${isOpen ? "open" : ""}`}
                onClick={toggleAreaInterest}
            >
                <span className="area-interest-title">
                    CHỌN VÙNG QUAN TÂM  
                </span>
                <i
                    className={`fa-solid fa-chevron-right area-interest-chevron ${isOpen ? "rotated" : ""}`}
                ></i>
            </button>

            {isOpen && (
                <div className="area-interest-panel">
                    <div className="area-field">
                        <label className="area-label">Cấp Huyện</label>
                        <select
                            className="district-select"
                            value={selectedDistrict}
                            onFocus={() => {
                                if (districtList.length === 0) {
                                    loadAdministrativeDistricts();
                                }
                            }}
                            onChange={(e) => handleDistrictChange(e.target.value)}
                            disabled={districtLoading}
                        >
                            <option value="">
                                {districtLoading
                                    ? "-- Đang tải huyện --"
                                    : "-- Chọn quận/ huyện/ thành phố --"}
                            </option>
                            {districtList.map((district) => (
                                <option key={district.code} value={district.code}>
                                    {district.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="area-field">
                        <label className="area-label">Cấp Xã</label>
                        <select
                            className="district-select"
                            value={selectedCommune}
                            onChange={(e) => handleCommuneChange(e.target.value)}
                            disabled={!selectedDistrict || communeLoading}
                        >
                            <option value="">
                                {communeLoading ? "-- Đang tải xã --" : "-- Chọn phường/ xã --"}
                            </option>
                            {communeList.map((commune) => (
                                <option key={commune.code} value={commune.code}>
                                    {commune.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AreaInterestSelector;
