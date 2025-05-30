import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ROUTES } from "@common/constants";
import ProtectedRoute from "@components/ProtectedRoute";
import RoleBasedRoute from "@components/RoleBasedRoute";
import Home from "@pages/home/Home";
import WrapperLogin from "@pages/login/WrapperLogin";
import "@styles/main.scss";
import VerifyEmail from "@components/VerifyEmail";
import { HelmetProvider } from "react-helmet-async";
import Map from "@pages/map/Map";
import SettingUser from "@pages/setting/SettingUser";
import UserManagement from "@pages/users/UserManagement";
import SalinityManagement from "@pages/salinity/SalinityManagement";
import Feedback from "@pages/feedback/Feedback";

const App = () => {
    return (
        <HelmetProvider>
            <BrowserRouter>
                <Routes>
                    <Route path={ROUTES.home} element={<Home />} />
                    <Route path={ROUTES.verify_email} element={<VerifyEmail />} />
                    <Route path={ROUTES.login} element={<WrapperLogin />} />
                    <Route element={<ProtectedRoute />}>
                        <Route path={ROUTES.setting} element={<SettingUser />} />
                        <Route element={<RoleBasedRoute requiredRole={1} />}>
                            <Route path={ROUTES.map} element={<Map />} />
                            <Route path={ROUTES.users} element={<UserManagement />} />
                            <Route path={ROUTES.salinity} element={<SalinityManagement />} />
                            <Route path={ROUTES.feedback} element={<Feedback />} />
                        </Route>
                    </Route>
                </Routes>
            </BrowserRouter>
        </HelmetProvider>
    );
};

export default App;
