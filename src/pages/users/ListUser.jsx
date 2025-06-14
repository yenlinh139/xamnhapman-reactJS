import React, { useCallback, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ElementUser from "@pages/users/ElementUser";
import PaginationUser from "@pages/users/PaginationUser";
import ModalConfirm from "@components/ModalConfirm";
import { changeRole, deleteUser } from "@stores/actions/userActions";
import Loading from "@components/Loading";

const ListUser = ({ setUserEdit }) => {
    // Redux hooks
    const dispatch = useDispatch();
    const { listUser, loading } = useSelector((state) => state.userStore);
    const navigate = useNavigate();

    // Local state
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [role, setRole] = useState("default");
    const [emailVerified, setEmailVerified] = useState("default");
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState("");
    const [actionType, setActionType] = useState(null);
    const [actionPayload, setActionPayload] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

    const itemsPerPage = 5;

    // Memoized filtered and sorted data
    const filteredData = useMemo(() => {
        let result = listUser;

        // Apply filters
        if (searchTerm.length > 0) {
            result = result.filter(
                (user) =>
                    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (user.phone && user.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    (user.feedback_name &&
                        user.feedback_name.toLowerCase().includes(searchTerm.toLowerCase())),
            );
        }

        if (role !== "default") {
            result = result.filter((user) => user.role === Number(role));
        }

        if (emailVerified !== "default") {
            result = result.filter((user) => user.email_verified === (emailVerified === "true"));
        }

        // Apply sorting
        if (sortConfig.key) {
            result.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle different data types
                if (sortConfig.key === "role") {
                    aValue = aValue === 1 ? "Người quản trị" : "Người dùng";
                    bValue = bValue === 1 ? "Người quản trị" : "Người dùng";
                }

                if (sortConfig.key === "email_verified") {
                    aValue = aValue ? "Đã xác thực" : "Chưa xác thực";
                    bValue = bValue ? "Đã xác thực" : "Chưa xác thực";
                }

                if (sortConfig.key === "feedback_rating") {
                    // Handle numeric sorting for rating
                    return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
                }

                if (
                    ["name", "email", "phone", "feedback_name", "feedback_message"].includes(sortConfig.key)
                ) {
                    aValue = (aValue || "").toLowerCase();
                    bValue = (bValue || "").toLowerCase();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === "asc" ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === "asc" ? 1 : -1;
                }
                return 0;
            });
        }

        return result;
    }, [searchTerm, role, emailVerified, listUser, sortConfig]);

    const totalPage = Math.ceil(filteredData?.length / itemsPerPage);
    const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredData?.slice(indexOfFirstItem, indexOfFirstItem + itemsPerPage);

    // Event handlers
    const handleChangePage = useCallback((page) => {
        setCurrentPage(page);
    }, []);

    const handleSearch = useCallback((event) => {
        const keyWord = event.target.value;
        setSearchTerm(keyWord);
        setCurrentPage(1);
    }, []);

    const handleFilterRole = useCallback((event) => {
        const value = event.target.value;
        setRole(value);
        setCurrentPage(1);
    }, []);

    const handleFilterEmailVerified = useCallback((event) => {
        const value = event.target.value;
        setEmailVerified(value);
        setCurrentPage(1);
    }, []);

    const handleEditUser = useCallback(
        (user) => {
            setUserEdit({
                ...user,
                password: "",
            });
        },
        [setUserEdit],
    );

    const handleShowModal = useCallback((message, type, payload) => {
        setModalMessage(message);
        setActionType(type);
        setActionPayload(payload);
        setShowModal(true);
    }, []);

    const handleConfirm = useCallback(() => {
        try {
            if (actionType === "changeRole") {
                dispatch(
                    changeRole(actionPayload, () => {
                        toast.success("Đã thay đổi quyền thành công");
                        navigate("/dang-nhap");
                    }),
                );
            } else if (actionType === "deleteUser") {
                dispatch(
                    deleteUser(actionPayload, () => {
                        toast.success("Đã xóa người dùng thành công");
                    }),
                );
            }
        } catch (error) {
            toast.error("Đã xảy ra lỗi. Vui lòng thử lại.");
        } finally {
            setShowModal(false);
        }
    }, [actionType, actionPayload, dispatch, navigate]);

    const handleSort = useCallback(
        (key) => {
            let direction = "asc";
            if (sortConfig.key === key && sortConfig.direction === "asc") {
                direction = "desc";
            }
            setSortConfig({ key, direction });
            setCurrentPage(1); // Reset to first page when sorting
        },
        [sortConfig],
    );

    const getSortIcon = useCallback(
        (columnKey) => {
            if (sortConfig.key !== columnKey) {
                return <i className="fa-solid fa-sort text-muted"></i>;
            }
            return sortConfig.direction === "asc" ? (
                <i className="fa-solid fa-sort-up text-primary"></i>
            ) : (
                <i className="fa-solid fa-sort-down text-primary"></i>
            );
        },
        [sortConfig],
    );

    if (loading) {
        return <Loading />;
    }

    return (
        <div className="user-list-container">
            <main className="main-content">
                <div className="list-header">
                    <button
                        className="create-user-btn"
                        data-bs-toggle="modal"
                        data-bs-target="#modalCreateUser"
                        title="Tạo người dùng"
                    >
                        <i className="fa-solid fa-plus"></i>
                        <span>Tạo người dùng mới</span>
                    </button>

                    <div className="search-filter-group">
                        <div className="search-input">
                            <i className="fa-solid fa-search"></i>
                            <input type="search" placeholder="Tìm kiếm..." onChange={handleSearch} />
                        </div>
                        <div className="role-filter">
                            <select className="form-select" onChange={handleFilterRole} value={role}>
                                <option value="default">Tất cả vai trò</option>
                                <option value="1">Người quản trị</option>
                                <option value="0">Người dùng</option>
                            </select>
                        </div>
                        <div className="email-verified-filter">
                            <select
                                className="form-select"
                                onChange={handleFilterEmailVerified}
                                value={emailVerified}
                            >
                                <option value="default">Tất cả trạng thái</option>
                                <option value="true">Email đã xác thực</option>
                                <option value="false">Email chưa xác thực</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="user-table-wrapper">
                    <table className="user-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort("name")} className="sortable-header">
                                    <span>Tên người dùng</span>
                                    {getSortIcon("name")}
                                </th>
                                <th onClick={() => handleSort("email")} className="sortable-header">
                                    <span>Email</span>
                                    {getSortIcon("email")}
                                </th>
                                <th onClick={() => handleSort("email_verified")} className="sortable-header">
                                    <span>Trạng thái email</span>
                                    {getSortIcon("email_verified")}
                                </th>
                                <th onClick={() => handleSort("phone")} className="sortable-header">
                                    <span>Số điện thoại</span>
                                    {getSortIcon("phone")}
                                </th>
                                <th onClick={() => handleSort("role")} className="sortable-header">
                                    <span>Phân quyền</span>
                                    {getSortIcon("role")}
                                </th>
                                <th onClick={() => handleSort("feedback_rating")} className="sortable-header">
                                    <span>Đánh giá</span>
                                    {getSortIcon("feedback_rating")}
                                </th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems?.length ? (
                                currentItems.map((user) => (
                                    <ElementUser
                                        key={user.id}
                                        user={user}
                                        handleEditUser={handleEditUser}
                                        handleShowModal={handleShowModal}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center">
                                        Không tìm thấy người dùng nào phù hợp với tiêu chí tìm kiếm
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPage > 1 && (
                    <PaginationUser
                        totalPage={totalPage}
                        currentPage={currentPage}
                        handleChangePage={handleChangePage}
                    />
                )}
            </main>

            {showModal && (
                <ModalConfirm
                    message={modalMessage}
                    onConfirm={handleConfirm}
                    onCancel={() => setShowModal(false)}
                />
            )}
        </div>
    );
};

export default ListUser;
