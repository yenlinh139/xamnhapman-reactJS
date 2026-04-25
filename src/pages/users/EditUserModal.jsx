import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { REQUIRE_NAME } from "@common/messageError";
import ModalConfirm from "@components/ModalConfirm";
import { UPDATE } from "@common/messageConfirm";
import { updateUser } from "@stores/actions/userActions";
import { formatDateToInput } from "@common/validate";

const initErrorMessages = {
    name: "",
    email: "",
    phone: "",
    role: "",
    password: "",
};

function EditUserModal({ userEdit }) {
    const dispatch = useDispatch();
    const [userDetail, setUserDetail] = useState(userEdit);
    const [errorMessages, setErrorMessages] = useState(initErrorMessages);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const handleOnSubmit = () => {
        if (userDetail.name.length === 0) {
            setErrorMessages({ name: REQUIRE_NAME });
            return;
        }
        setShowConfirmModal(true);

        // Close the modal if there are no errors:
        const modalElement = document.getElementById("modalEditUser");
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
            modalInstance.hide();
        }
    };

    const confirmUpdate = () => {
        dispatch(updateUser(userDetail));
        setShowConfirmModal(false);
    };

    const handleSetName = (value) => {
        setUserDetail({
            ...userDetail,
            name: value,
        });
    };

    const handleSetPhone = (value) => {
        setUserDetail({
            ...userDetail,
            phone: value,
        });
    };

    const handleSetRole = (value) => {
        setUserDetail({
            ...userDetail,
            role: parseInt(value),
        });
    };

    useEffect(() => {
        setUserDetail(userEdit);
        setErrorMessages(initErrorMessages);
    }, [userEdit]);

    return (
        <>
            <div className="modal fade" id="modalEditUser">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Chỉnh sửa người dùng</h4>
                            <button
                                id="close-edit-user-btn"
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                            ></button>
                        </div>

                        <div className="modal-body">
                            <form>
                                <div className="mb-3">
                                    <label className="form-label required">Email</label>
                                    <input
                                        disabled
                                        type="text"
                                        placeholder="Nhập email"
                                        className="form-control"
                                        value={userDetail.email}
                                    />
                                    <div className="mt-2">
                                        <span
                                            className={`badge ${userDetail.email_verified ? "bg-success" : "bg-warning"}`}
                                        >
                                            {userDetail.email_verified
                                                ? "Email đã xác thực"
                                                : "Email chưa xác thực"}
                                        </span>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label required">Họ và tên</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập họ và tên"
                                        className={`form-control ${
                                            errorMessages.name?.length > 0 && "is-invalid"
                                        }`}
                                        value={userDetail.name}
                                        onChange={(e) => handleSetName(e.target.value)}
                                    />
                                    <span className="invalid-feedback">{errorMessages.name}</span>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Số điện thoại</label>
                                    <input
                                        type="tel"
                                        placeholder="Nhập số điện thoại"
                                        className={`form-control ${
                                            errorMessages.phone?.length > 0 && "is-invalid"
                                        }`}
                                        value={userDetail.phone || ""}
                                        onChange={(e) => handleSetPhone(e.target.value)}
                                    />
                                    <span className="invalid-feedback">{errorMessages.phone}</span>
                                </div>
                            </form>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={handleOnSubmit}>
                                Lưu thay đổi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {showConfirmModal && (
                <ModalConfirm
                    message={UPDATE.user}
                    onConfirm={confirmUpdate}
                    onCancel={() => setShowConfirmModal(false)}
                />
            )}
        </>
    );
}

export default EditUserModal;
