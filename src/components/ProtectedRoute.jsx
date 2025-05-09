import { Navigate, Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { jwtDecode } from "jwt-decode";
import { SET_USER_INFO } from "../stores/constants";
import { ROUTES } from "../common/constants";

function ProtectedRoute() {
  const accessToken = localStorage.getItem("access_token");
  const { userInfo } = useSelector((state) => state.authStore);

  const dispatch = useDispatch();

  if (accessToken) {
    if (!userInfo) {
      dispatch({
        type: SET_USER_INFO,
        payload: jwtDecode(accessToken),
      });
    }

    return <Outlet />;
  } else {
    return <Navigate to={ROUTES.login} />;
  }
}

export default ProtectedRoute;
