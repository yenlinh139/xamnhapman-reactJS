import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { validateEmail } from "../../common/validate";
import {
  INVALID_EMAIL,
  PASSWORD_NOT_MATCH,
  REQUIRE_EMAIL,
  REQUIRE_NAME,
  REQUIRE_PASSWORD,
} from "../../common/messageError";
import { createUser } from "../../stores/actions/userActions";

const initErrorMessages = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function CreateUserModal() {
  const email = useRef(null);
  const name = useRef(null);
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
        password: password.current.value,
        confirmPassword: confirmPassword.current.value,
        role: 0,
      })
    );

    setErrorMessages(initErrorMessages);
  };

  return (
    <div className="modal fade" id="modalCreateUser">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Create User</h4>
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
                <label className="form-label">Name</label>
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
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className={`form-control ${
                    errorMessages.password?.length > 0 && "is-invalid"
                  }`}
                  ref={password}
                />
                <span className="invalid-feedback">
                  {errorMessages.password}
                </span>
              </div>
              <div className="mb-3">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  className={`form-control ${
                    errorMessages.confirmPassword?.length > 0 && "is-invalid"
                  }`}
                  ref={confirmPassword}
                />
                <span className="invalid-feedback">
                  {errorMessages.confirmPassword}
                </span>
              </div>
            </form>
          </div>

          <div className="modal-footer">
            <button className="btn btn-primary" onClick={handleOnSubmit}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateUserModal;
