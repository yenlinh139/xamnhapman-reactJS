import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ROUTES } from "@common/constants";
import ProtectedRoute from "@components/ProtectedRoute";
import RoleBasedRoute from "@components/RoleBasedRoute";
import Home from "@pages/home/Home";
import WrapperLogin from "@pages/login/WrapperLogin";
import "@styles/main.scss";
import "@styles/components/AreaStationsPanel.scss";
import VerifyEmail from "@components/VerifyEmail";
import { HelmetProvider } from "react-helmet-async";
import Map from "@pages/map/Map";
import UserManagement from "@pages/users/UserManagement";
import SalinityManagement from "@pages/salinity/SalinityManagement";
import SalinityReport from "@pages/salinity/SalinityReport";
import Feedback from "@pages/feedback/Feedback";
import ForgotPassword from "@pages/login/ForgotPassword";
import ResetPassword from "@pages/login/ResetPassword";

const App = () => {
    return (
        <HelmetProvider>
            <BrowserRouter>
                <Routes>
                    <Route path={ROUTES.home} element={<Home />} />
                    <Route path={ROUTES.verify_email} element={<VerifyEmail />} />
                    <Route path={ROUTES.login} element={<WrapperLogin />} />
                    <Route path={ROUTES.forgotPassword} element={<ForgotPassword />} />
                    <Route path={ROUTES.resetPassword} element={<ResetPassword />} />
                    <Route path={ROUTES.map} element={<Map />} />
                    <Route path={ROUTES.salinityReport} element={<SalinityReport />} />
                    <Route element={<ProtectedRoute />}>
                        <Route path={ROUTES.feedback} element={<Feedback />} />
                        <Route element={<RoleBasedRoute requiredRole={1} />}>
                            <Route path={ROUTES.users} element={<UserManagement />} />
                            <Route path={ROUTES.salinity} element={<SalinityManagement />} />
                        </Route>
                    </Route>
                </Routes>
            </BrowserRouter>
        </HelmetProvider>
    );
};

export default App;
