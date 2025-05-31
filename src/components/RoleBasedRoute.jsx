import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { ROUTES } from "@common/constants";

function RoleBasedRoute({ requiredRole = 1 }) {
    const { userInfo } = useSelector((state) => state.authStore);

    // Kiểm tra nếu user không có role phù hợp, chuyển hướng về trang chủ
    if (!userInfo || userInfo.role < requiredRole) {
        return <Navigate to={ROUTES.home} replace />;
    }

    return <Outlet />;
}

export default RoleBasedRoute;
