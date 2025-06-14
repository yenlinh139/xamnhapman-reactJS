import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { validateEmail } from "@common/validate";
import {
    INVALID_EMAIL,
    PASSWORD_NOT_MATCH,
    REQUIRE_EMAIL,
    REQUIRE_NAME,
    REQUIRE_PASSWORD,
} from "@common/messageError";
import { createUser } from "@stores/actions/userActions";

const initErrorMessages = {
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
};

function CreateUserModal() {
    const email = useRef(null);
    const name = useRef(null);
    const phone = useRef(null);
    const role = useRef(null);
    const password = useRef(null);
    const confirmPassword = useRef(null);

    const [errorMessages, setErrorMessages] = useState(initErrorMessages);

    const dispatch = useDispatch();

    const handleOnSubmit = () => {
        if (!name.current.value || name.current.value.length === 0) {
            setErrorMessages({ name: REQUIRE_NAME });
            return;
        }

        if (!email.current.value || email.current.value.length === 0) {
            setErrorMessages({ email: REQUIRE_EMAIL });
            return;
        }

        if (!validateEmail(email.current.value)) {
            setErrorMessages({ email: INVALID_EMAIL });
            return;
        }

        if (!password.current.value || password.current.value.length === 0) {
            setErrorMessages({ password: REQUIRE_PASSWORD });
            return;
        }

        if (confirmPassword.current.value !== password.current.value) {
            setErrorMessages({ confirmPassword: PASSWORD_NOT_MATCH });
            return;
        }

        dispatch(
            createUser({
                name: name.current.value,
                email: email.current.value,
                phone: phone.current.value,
                password: password.current.value,
                confirmPassword: confirmPassword.current.value,
                role: parseInt(role.current.value) || 0,
            }),
        );

        setErrorMessages(initErrorMessages);
    };

    return (
        <div className="modal fade" id="modalCreateUser">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Tạo người dùng</h4>
                        <button
                            id="close-create-user-btn"
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                        ></button>
                    </div>

                    <div className="modal-body">
                        <form>
                            <div className="mb-3">
                                <label className="form-label">Họ và tên</label>
                                <input
                                    type="text"
                                    className={`form-control ${
                                        errorMessages.name?.length > 0 && "is-invalid"
                                    }`}
                                    ref={name}
                                />
                                <div className="invalid-feedback">{errorMessages.name}</div>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Email</label>
                                <input
                                    type="text"
                                    className={`form-control ${
                                        errorMessages.email?.length > 0 && "is-invalid"
                                    }`}
                                    ref={email}
                                />
                                <span className="invalid-feedback">{errorMessages.email}</span>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Số điện thoại</label>
                                <input
                                    type="tel"
                                    className={`form-control ${
                                        errorMessages.phone?.length > 0 && "is-invalid"
                                    }`}
                                    ref={phone}
                                    placeholder="Nhập số điện thoại"
                                />
                                <span className="invalid-feedback">{errorMessages.phone}</span>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Vai trò</label>
                                <select className="form-select" ref={role} defaultValue="0">
                                    <option value="0">Người dùng</option>
                                    <option value="1">Quản trị viên</option>
                                </select>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Mật khẩu</label>
                                <input
                                    type="password"
                                    className={`form-control ${
                                        errorMessages.password?.length > 0 && "is-invalid"
                                    }`}
                                    ref={password}
                                />
                                <span className="invalid-feedback">{errorMessages.password}</span>
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Xác nhận mật khẩu</label>
                                <input
                                    type="password"
                                    className={`form-control ${
                                        errorMessages.confirmPassword?.length > 0 && "is-invalid"
                                    }`}
                                    ref={confirmPassword}
                                />
                                <span className="invalid-feedback">{errorMessages.confirmPassword}</span>
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
    );
}

export default CreateUserModal;
