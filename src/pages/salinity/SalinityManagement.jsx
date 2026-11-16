import React, { useState } from "react";
import { useSelector } from "react-redux";
import Header from "@pages/themes/headers/Header";
import Footer from "@pages/themes/footer/Footer";
import SalinityDetailManagementTab from "./SalinityDetailManagementTab";
import IoTManagementTab from "./IoTManagementTab";
import ForecastManagementTab from "./ForecastManagementTab";
import StationDataManagementTab from "./StationDataManagementTab";
import "../../styles/components/_salinityManagement.scss";

// Cấp 1: nguồn dữ liệu (loại trạm); cấp 2: loại dữ liệu của nguồn đó
// `hasForecast`: nguồn có dữ liệu dự báo (cấp 2 "Dự báo"); `layer`: lớp số liệu ngày dùng tab chung
// StationDataManagementTab (API /station-data/:layer).
const SOURCES = [
    { key: "salinity", label: "Điểm đo mặn", hasForecast: true },
    { key: "iot", label: "Trạm IoT", hasForecast: true },
    { key: "rain", label: "Điểm đo mưa", layer: "rain" },
    { key: "meteo", label: "Trạm khí tượng", layer: "meteo" },
    { key: "hydro", label: "Trạm thủy văn", layer: "hydro" },
    { key: "reservoir", label: "Hồ chứa thượng lưu", layer: "reservoir" },
];

const DATA_KINDS = [
    { key: "observed", label: "Quan trắc" },
    { key: "forecast", label: "Dự báo" },
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
    // Nguồn không có dự báo thì chỉ có "Quan trắc" (kể cả khi vừa chuyển sang từ tab đang ở "Dự báo").
    const availableKinds = activeSource.hasForecast
        ? DATA_KINDS
        : DATA_KINDS.filter((item) => item.key === "observed");
    const effectiveKind = activeSource.hasForecast ? dataKind : "observed";
    const activeKind = DATA_KINDS.find((item) => item.key === effectiveKind);

    const renderContent = () => {
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

                    {/* Nguồn chỉ có quan trắc: bỏ hàng tab cấp 2, chỉ giữ đường kẻ chân hàng tab cấp 1 */}
                    {!activeSource.hasForecast && (
                        <div className="mb-3" style={{ borderTop: `2px solid ${PRIMARY}` }}></div>
                    )}

                    <div
                        className={`flex-wrap align-items-center gap-3 mb-3 ${activeSource.hasForecast ? "d-flex" : "d-none"}`}
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
