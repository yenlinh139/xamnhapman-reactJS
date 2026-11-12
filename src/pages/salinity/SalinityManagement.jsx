import React, { useState } from "react";
import { useSelector } from "react-redux";
import Header from "@pages/themes/headers/Header";
import Footer from "@pages/themes/footer/Footer";
import SalinityDetailManagementTab from "./SalinityDetailManagementTab";
import IoTManagementTab from "./IoTManagementTab";
import ForecastManagementTab from "./ForecastManagementTab";
import "../../styles/components/_salinityManagement.scss";

const SalinityManagement = () => {
    const { userInfo } = useSelector((state) => state.authStore);
    const [activeTab, setActiveTab] = useState("salinity");

    return (
        <div className="salinity-management">
            <Header />
            <main className="main-content">
                <div className="salinity-container">
                    <ul className="nav nav-tabs mb-3" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === "salinity" ? "active" : ""}`}
                                type="button"
                                onClick={() => setActiveTab("salinity")}
                            >
                                Điểm đo mặn
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === "iot" ? "active" : ""}`}
                                type="button"
                                onClick={() => setActiveTab("iot")}
                            >
                                Trạm IoT
                            </button>
                        </li>
                        <li className="nav-item" role="presentation">
                            <button
                                className={`nav-link ${activeTab === "forecast" ? "active" : ""}`}
                                type="button"
                                onClick={() => setActiveTab("forecast")}
                            >
                                Dự báo
                            </button>
                        </li>
                    </ul>

                    {activeTab === "salinity" && <SalinityDetailManagementTab userInfo={userInfo} />}
                    {activeTab === "iot" && <IoTManagementTab userInfo={userInfo} />}
                    {activeTab === "forecast" && <ForecastManagementTab userInfo={userInfo} />}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default SalinityManagement;
