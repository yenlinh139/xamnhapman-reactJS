import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react";
import Loading from "@components/Loading";
import CreateUserModal from "@pages/users/CreateUserModal";
import EditUserModal from "@pages/users/EditUserModal";
import ListUser from "@pages/users/ListUser";
import AdminFeedbackTab from "@pages/users/AdminFeedbackTab";
import { getListUser } from "@stores/actions/userActions";
import { Helmet } from "react-helmet-async";
import Header from "@pages/themes/headers/Header";
import Footer from "@pages/themes/footer/Footer";

function User() {
    const { userInfo } = useSelector((state) => state.authStore);
    const { isLoading } = useSelector((state) => state.appStore);
    const dispatch = useDispatch();

    const [activeTab, setActiveTab] = useState("info");
    const [userEdit, setUserEdit] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
    });

    useEffect(() => {
        dispatch(getListUser());
    }, [dispatch]);

    return (
        <>
            <Helmet>
                <title>Quản lý tài khoản | Xâm nhập mặn Tp. Hồ Chí Minh</title>
            </Helmet>
            <Header />
            <div className="main-content">
                <div className="userContainer">
                    {Number(userInfo?.role) === 0 && (
                        <>
                            <div className="row shadow-sm containerListUser">
                                <div className="admin-account-tabs">
                                    <div
                                        className="admin-account-tabs__header"
                                        role="tablist"
                                        aria-label="Quản trị tài khoản"
                                    >
                                        <button
                                            type="button"
                                            className={`admin-account-tabs__tab ${
                                                activeTab === "info" ? "is-active" : ""
                                            }`}
                                            onClick={() => setActiveTab("info")}
                                        >
                                            Thông tin
                                        </button>
                                        <button
                                            type="button"
                                            className={`admin-account-tabs__tab ${
                                                activeTab === "feedback" ? "is-active" : ""
                                            }`}
                                            onClick={() => setActiveTab("feedback")}
                                        >
                                            Ý kiến
                                        </button>
                                    </div>

                                    <div className="admin-account-tabs__content">
                                        {activeTab === "info" ? (
                                            <ListUser setUserEdit={setUserEdit} />
                                        ) : (
                                            <AdminFeedbackTab />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <EditUserModal userEdit={userEdit} />
                            <CreateUserModal />
                        </>
                    )}

                    {isLoading && <Loading />}
                </div>
            </div>
            <Footer />
        </>
    );
}

export default User;
