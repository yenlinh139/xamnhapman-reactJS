import React, { useState } from "react";
import { useSelector } from "react-redux";
import Header from "@pages/themes/headers/Header";
import Footer from "@pages/themes/footer/Footer";
import SalinityDetailManagementTab from "./SalinityDetailManagementTab";
import IoTManagementTab from "./IoTManagementTab";
import ForecastManagementTab from "./ForecastManagementTab";
import StationDataManagementTab from "./StationDataManagementTab";
import LocationManagementPanel from "./LocationManagementPanel";
import IoTLocationPanel from "./IoTLocationPanel";
import "../../styles/components/_salinityManagement.scss";

// Cấp 2 (loại dữ liệu) của từng nguồn: Điểm đo mặn/Trạm IoT có Quan trắc+Dự báo+Vị trí; 4 nguồn
// còn lại (dùng chung StationDataManagementTab qua `layer`) có Số liệu+Vị trí.
const SALINITY_KINDS = [
    { key: "observed", label: "Quan trắc" },
    { key: "forecast", label: "Dự báo" },
    { key: "locations", label: "Vị trí" },
];
const IOT_KINDS = [
    { key: "observed", label: "Quan trắc" },
    { key: "forecast", label: "Dự báo" },
    { key: "locations", label: "Vị trí" },
];
const LAYER_KINDS = [
    { key: "data", label: "Số liệu" },
    { key: "locations", label: "Vị trí" },
];

// Cấp 1: nguồn dữ liệu (loại trạm). `layer`: lớp số liệu ngày dùng tab chung StationDataManagementTab
// (API /station-data/:layer) khi cấp 2 đang là "data".
const SOURCES = [
    { key: "salinity", label: "Điểm đo mặn", kinds: SALINITY_KINDS },
    { key: "iot", label: "Trạm IoT", kinds: IOT_KINDS },
    { key: "rain", label: "Điểm đo mưa", layer: "rain", kinds: LAYER_KINDS },
    { key: "meteo", label: "Trạm khí tượng", layer: "meteo", kinds: LAYER_KINDS },
    { key: "hydro", label: "Trạm thủy văn", layer: "hydro", kinds: LAYER_KINDS },
    { key: "reservoir", label: "Hồ chứa thượng lưu", layer: "reservoir", kinds: LAYER_KINDS },
];

const PRIMARY = "#1a56a8";
const BORDER = "#d7e0ee";

const LevelBadge = ({ level }) => (
    <span
        style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            color: PRIMARY,
            background: "#e3ecfa",
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            padding: "2px 8px",
            whiteSpace: "nowrap",
        }}
    >
        CẤP {level}
    </span>
);

const SalinityManagement = () => {
    const { userInfo } = useSelector((state) => state.authStore);
    const [source, setSource] = useState("salinity");
    const [dataKind, setDataKind] = useState("observed");

    const activeSource = SOURCES.find((item) => item.key === source);
    const availableKinds = activeSource.kinds;
    // Đổi nguồn mà cấp 2 đang chọn không tồn tại ở nguồn mới (vd đang "Vị trí" rồi chuyển sang
    // Trạm IoT - không có "Vị trí") thì rơi về cấp 2 đầu tiên của nguồn đó.
    const effectiveKind = availableKinds.some((item) => item.key === dataKind)
        ? dataKind
        : availableKinds[0].key;
    const activeKind = availableKinds.find((item) => item.key === effectiveKind);

    const renderContent = () => {
        if (effectiveKind === "locations") {
            // Trạm IoT dùng bảng/API riêng (iot_system.iot_stations, toạ độ độ thập phân) nên có
            // panel vị trí riêng, không dùng chung LocationManagementPanel (DiemDoMan/TramKTTV/HoChua).
            if (source === "iot") return <IoTLocationPanel userInfo={userInfo} />;
            // key để đổi loại thì tạo lại tab (bộ lọc, trang, form) cho đúng loại mới
            return (
                <LocationManagementPanel
                    key={activeSource.layer || source}
                    userInfo={userInfo}
                    type={activeSource.layer || "salinity"}
                />
            );
        }
        if (activeSource.layer) {
            // key để đổi lớp thì tạo lại tab (bộ lọc, trang, form) cho đúng lớp mới
            return (
                <StationDataManagementTab
                    key={activeSource.layer}
                    userInfo={userInfo}
                    layer={activeSource.layer}
                />
            );
        }
        if (effectiveKind === "forecast") {
            // key để đổi nguồn thì tải lại đúng nhóm dự báo
            return (
                <ForecastManagementTab
                    key={source}
                    userInfo={userInfo}
                    group={source === "iot" ? "iot" : undefined}
                />
            );
        }
        return source === "iot" ? (
            <IoTManagementTab userInfo={userInfo} />
        ) : (
            <SalinityDetailManagementTab userInfo={userInfo} />
        );
    };

    return (
        <div className="salinity-management">
            <Header />
            <main className="main-content">
                <div className="salinity-container">
                    <div className="d-flex flex-wrap gap-2" role="tablist" aria-label="Nguồn dữ liệu">
                        {SOURCES.map((item) => {
                            const isActive = source === item.key;
                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => setSource(item.key)}
                                    className="d-flex align-items-center gap-3 text-start"
                                    style={{
                                        minWidth: 150,
                                        padding: "10px 18px",
                                        border: `1px solid ${isActive ? PRIMARY : BORDER}`,
                                        borderBottom: "none",
                                        borderRadius: "10px 10px 0 0",
                                        background: isActive ? PRIMARY : "#fff",
                                        color: isActive ? "#fff" : "#334155",
                                        boxShadow: "none",
                                    }}
                                >
                                    <i className={item.icon} style={{ fontSize: 18 }} aria-hidden="true"></i>
                                    <span>
                                        <span className="d-block fw-bold" style={{ lineHeight: 1.2 }}>
                                            {item.label}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div
                        className="flex-wrap align-items-center gap-3 mb-3 d-flex"
                        style={{
                            padding: "10px 14px",
                            background: "#f4f7fc",
                            border: `1px solid ${BORDER}`,
                            borderTop: `2px solid ${PRIMARY}`,
                            borderRadius: "0 10px 10px 10px",
                        }}
                    >
                        <div
                            className="d-flex"
                            role="tablist"
                            aria-label="Loại dữ liệu"
                            style={{ padding: 3, background: "#e3e9f3", borderRadius: 8, gap: 2 }}
                        >
                            {availableKinds.map((item) => {
                                const isActive = effectiveKind === item.key;
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        onClick={() => setDataKind(item.key)}
                                        className="d-flex align-items-center gap-2"
                                        style={{
                                            padding: "5px 14px",
                                            border: `1px solid ${isActive ? PRIMARY : "transparent"}`,
                                            borderRadius: 6,
                                            background: isActive ? "#fff" : "transparent",
                                            color: isActive ? PRIMARY : "#475569",
                                            boxShadow: "none",
                                        }}
                                    >
                                        <i
                                            className={item.icon}
                                            style={{ fontSize: 13 }}
                                            aria-hidden="true"
                                        ></i>
                                        <span className="fw-bold">{item.label}</span>
                                        <span style={{ fontSize: 12, opacity: 0.75 }}>· {item.hint}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <span className="small text-muted ms-auto">
                            <strong style={{ color: PRIMARY }}>
                                {activeSource.label} › {activeKind.label}
                            </strong>
                        </span>
                    </div>

                    {renderContent()}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default SalinityManagement;
