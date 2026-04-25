import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { ROUTES } from "@common/constants";

function RoleBasedRoute({ requiredRole = 0 }) {
    const { userInfo } = useSelector((state) => state.authStore);

    // Kiểm tra nếu user không có role phù hợp, chuyển hướng về trang chủ
    // role 0 = Admin (cao nhất), role 1 = Kĩ thuật viên, role 2 = Khách (thấp nhất)
    if (!userInfo || userInfo.role > requiredRole) {
        return <Navigate to={ROUTES.home} replace />;
    }

    return <Outlet />;
}

export default RoleBasedRoute;
