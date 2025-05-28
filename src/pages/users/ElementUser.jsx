import { useNavigate } from "react-router-dom";
import { CHANGEROLE, DELETE } from "@common/messageConfirm";
import { memo } from "react";

function ElementUser({ user, handleEditUser, handleShowModal }) {
    const navigate = useNavigate();

    const handleChangeRole = (email, role) => {
        handleShowModal(CHANGEROLE, "changeRole", { email, role });
    };

    const handleDeleteUser = (id) => {
        handleShowModal(DELETE.user, "deleteUser", { id });
    };

    return (
        <>
            <tr>
                <td>
                    <span className="my-truncate text-truncate">{user.name}</span>
                </td>
                <td>
                    <span className="my-truncate text-truncate">{user.email}</span>
                </td>
                <td>
                    <select
                        className="form-control"
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.email, e.target.value)}
                    >
                        <option value={0}>User</option>
                        <option value={1}>Admin</option>
                    </select>
                </td>
                <td>
                    <button
                        className="btn btn-primary"
                        onClick={() => handleEditUser(user)}
                        data-bs-toggle="modal"
                        data-bs-target="#modalEditUser"
                        title="Edit this user"
                    >
                        <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    &nbsp;
                    <button
                        disabled={user.role === 1}
                        className="btn btn-danger"
                        onClick={() => handleDeleteUser(user.id)}
                        title="Delete this user"
                    >
                        <i className="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        </>
    );
}

export default memo(ElementUser);
