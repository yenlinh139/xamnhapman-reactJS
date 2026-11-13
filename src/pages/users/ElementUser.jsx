import { useNavigate } from "react-router-dom";
import { CHANGEROLE, DELETE, VERIFY_EMAIL } from "@common/messageConfirm";
import { memo } from "react";

// Vai ban ghi cu bi luu nham chuoi van ban "null"/"undefined" (thay vi SQL NULL that) - coi cac
// gia tri nay la rong luon, khong hien thi nguyen van ra bang.
const displayPhone = (phone) => {
    const normalized = String(phone ?? "").trim();
    if (!normalized || normalized.toLowerCase() === "null" || normalized.toLowerCase() === "undefined") {
        return "";
    }
    return normalized;
};

function ElementUser({ user, handleEditUser, handleShowModal }) {
    const navigate = useNavigate();

    const handleChangeRole = (email, role) => {
        handleShowModal(CHANGEROLE, "changeRole", { email, role });
    };

    const handleDeleteUser = (id) => {
        handleShowModal(DELETE.user, "deleteUser", { id });
    };

    const handleVerifyEmail = (id) => {
        handleShowModal(VERIFY_EMAIL, "verifyEmail", { id });
    };

    return (
        <>
            <tr>
                <td>
                    <div className="user-name-cell">
                        <span className="my-truncate text-truncate">{user.name}</span>
                        {user.feedback_name && (
                            <small className="text-muted d-block">Feedback: {user.feedback_name}</small>
                        )}
                    </div>
                </td>
                <td>
                    <span className="my-truncate text-truncate">{user.email}</span>
                </td>
                <td>
                    <div className="d-flex align-items-center gap-2">
                        <span className={`badge ${user.email_verified ? "bg-success" : "bg-warning"}`}>
                            {user.email_verified ? "Đã xác thực" : "Chưa xác thực"}
                        </span>
                        {!user.email_verified && (
                            <button
                                className="btn btn-outline-success btn-sm"
                                onClick={() => handleVerifyEmail(user.id)}
                                title="Admin kích hoạt tài khoản này (bỏ qua bước xác thực qua email)"
                            >
                                Kích hoạt
                            </button>
                        )}
                    </div>
                </td>
                <td>
                    <span className="my-truncate text-truncate">{displayPhone(user.phone)}</span>
                </td>
                <td>
                    <select
                        className="form-control"
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.email, e.target.value)}
                    >
                        <option value={0}>Quản trị viên</option>
                        <option value={1}>Kĩ thuật viên</option>
                        <option value={2}>Khách</option>
                    </select>
                </td>
                <td>
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleEditUser(user)}
                        data-bs-toggle="modal"
                        data-bs-target="#modalEditUser"
                        title="Chỉnh sửa người dùng này"
                    >
                        <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    &nbsp;
                    <button
                        disabled={user.role === 0}
                        className="btn btn-danger btn-sm mt-1"
                        onClick={() => handleDeleteUser(user.id)}
                        title="Xóa người dùng này"
                    >
                        <i className="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        </>
    );
}

export default memo(ElementUser);
