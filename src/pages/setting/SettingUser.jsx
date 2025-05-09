import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { REQUIRE_PASSWORD } from "../../common/messageError";
import { UPDATE } from "../../common/messageConfirm";
import { updateUserByUser } from "../../stores/actions/userActions";
import ModalConfirm from "../../components/ModalConfirm";
import { Helmet } from "react-helmet-async";
import Header from "../themes/headers/Header";

function SettingUser() {
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.authStore);

  const formatDateForDB = (dateString) => {
    if (!dateString) return null; // Tránh gửi undefined
    const parts = dateString.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`; // Chuyển từ DD/MM/YYYY → YYYY-MM-DD
    }
    return dateString; // Nếu đã đúng format thì giữ nguyên
  };

  const [formState, setFormState] = useState({
    name: userInfo?.name || "",
    email: userInfo?.email || "",
    password: "",
    confirmPassword: "",
    birthday: userInfo?.birthday || "",
    phone: userInfo?.phone || "",
  });

  const [toggleUpdatePassword, setToggleUpdatePassword] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorMessages, setErrorMessages] = useState({});
  const [updatedFormState, setUpdatedFormState] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = () => {
    const errors = {};

    if (toggleUpdatePassword) {
      if (!formState.password) {
        errors.password = REQUIRE_PASSWORD;
      } else if (formState.password !== formState.confirmPassword) {
        errors.confirmPassword = "Mật khẩu không khớp";
      }
    }

    // Kiểm tra số điện thoại hợp lệ
    if (formState.phone && !/^\d{10,11}$/.test(formState.phone)) {
      errors.phone = "Số điện thoại không hợp lệ";
    }

    if (Object.keys(errors).length > 0) {
      setErrorMessages(errors);
      return;
    }

    const updatedData = {
      ...formState,
      birthday: formatDateForDB(formState.birthday), // Chuyển đổi ngày sinh
    };

    setUpdatedFormState(updatedData);
    setShowConfirmModal(true);
  };

  const confirmAction = () => {
    dispatch(updateUserByUser(updatedFormState));
    setShowConfirmModal(false);
  };

  return (
    <>
      <Helmet>
        <title>Cài đặt | Xâm nhập mặn Tp. Hồ Chí Minh</title>
      </Helmet>
      <Header />
      <div className="infoUser">
        <div className="containerInfo">
          <h2>Thông Tin Cá Nhân</h2>

          <div className="inputGroup">
            <label>Họ và tên</label>
            <input
              type="text"
              name="name"
              value={formState.name}
              onChange={handleChange}
            />
          </div>

          <div className="inputGroup">
            <label>Email</label>
            <input type="text" name="email" value={formState.email} disabled />
          </div>

          <div className="inputGroup">
            <label>Ngày sinh</label>
            <input
              type="date"
              name="birthday"
              value={formState.birthday}
              onChange={handleChange}
            />
          </div>

          <div className="inputGroup">
            <label>Số điện thoại</label>
            <input
              type="text"
              name="phone"
              value={formState.phone}
              onChange={handleChange}
            />
            {errorMessages.phone && (
              <p className="error">{errorMessages.phone}</p>
            )}
          </div>

          <h2 className="mt-5">
            <input
              type="checkbox"
              checked={toggleUpdatePassword}
              onChange={(e) => setToggleUpdatePassword(e.target.checked)}
            />
            Cập nhật mật khẩu mới
          </h2>

          {toggleUpdatePassword && (
            <>
              <div className="inputGroup">
                <label>Mật khẩu</label>
                <input
                  type="password"
                  name="password"
                  value={formState.password}
                  onChange={handleChange}
                />
                {errorMessages.password && (
                  <p className="error">{errorMessages.password}</p>
                )}
              </div>
              <div className="inputGroup">
                <label>Nhập lại mật khẩu</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formState.confirmPassword}
                  onChange={handleChange}
                />
                {errorMessages.confirmPassword && (
                  <p className="error">{errorMessages.confirmPassword}</p>
                )}
              </div>
            </>
          )}

          <button className="submitBtn" onClick={handleSubmit}>
            Cập nhật
          </button>
        </div>

        {showConfirmModal && (
          <ModalConfirm
            message={UPDATE.user}
            onConfirm={confirmAction}
            onCancel={() => setShowConfirmModal(false)}
          />
        )}
      </div>
    </>
  );
}

export default SettingUser;
