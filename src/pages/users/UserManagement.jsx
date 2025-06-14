import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react";
import Loading from "@components/Loading";
import CreateUserModal from "@pages/users/CreateUserModal";
import EditUserModal from "@pages/users/EditUserModal";
import ListUser from "@pages/users/ListUser";
import { getListUser } from "@stores/actions/userActions";
import { Helmet } from "react-helmet-async";
import Header from "@pages/themes/headers/Header";
import Footer from "@pages/themes/footer/Footer";

function User() {
    const { userInfo } = useSelector((state) => state.authStore); // Lấy thông tin người dùng từ Redux
    const { isLoading } = useSelector((state) => state.appStore); // Kiểm tra trạng thái loading từ Redux
    const dispatch = useDispatch(); // Khởi tạo dispatch để gọi action

    const [userEdit, setUserEdit] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
    });

    // Lấy danh sách người dùng khi component được mount
    useEffect(() => {
        dispatch(getListUser());
    }, [dispatch]);

    return (
        <>
            <Helmet>
                <title>Quản lý người dùng | Xâm nhập mặn Tp. Hồ Chí Minh</title>
            </Helmet>
            <Header />
            <div className="container">
                {Number(userInfo?.role) === 1 && (
                    <>
                        <div className="row shadow-sm containerListUser">
                            <ListUser setUserEdit={setUserEdit} />
                        </div>

                        <EditUserModal userEdit={userEdit} />
                        <CreateUserModal />
                    </>
                )}

                {isLoading && <Loading />}
            </div>
            <Footer />
        </>
    );
}

export default User;
