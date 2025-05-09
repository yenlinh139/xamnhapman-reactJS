import { debounce } from "lodash";
import React, { useCallback, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import ElementUser from "./ElementUser";
import PaginationUser from "./PaginationUser";
import { useNavigate } from "react-router-dom";
import ModalConfirm from "../../components/ModalConfirm";
import { changeRole, deleteUser } from "../../stores/actions/userActions";

function ListUser({ setUserEdit }) {
  const { listUser } = useSelector((state) => state.userStore);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [role, setRole] = useState("default");
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [actionType, setActionType] = useState(null);
  const [actionPayload, setActionPayload] = useState(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const itemsPerPage = 5;

  const filteredData = useMemo(() => {
    let result = listUser;
    if (searchTerm.length > 0) {
      result = result.filter(
        (user) =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (role !== "default") {
      result = result.filter((user) => user.role === Number(role));
    }
    return result;
  }, [searchTerm, role, listUser]);

  const totalPage = Math.ceil(filteredData?.length / itemsPerPage);
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData?.slice(
    indexOfFirstItem,
    indexOfFirstItem + itemsPerPage
  );

  const handleChangePage = (page) => {
    setCurrentPage(page);
  };

  const handleSearch = useCallback(
    debounce(
      (keyWord) => {
        setSearchTerm(keyWord);
        setCurrentPage(1);
      },
      [1000]
    ),
    []
  );

  const handleFilterRole = (value) => {
    setRole(value);
    setCurrentPage(1);
  };

  const handleEditUser = useCallback((user) => {
    setUserEdit({
      ...user,
      password: "",
    });
  }, []);

  const handleShowModal = (message, type, payload) => {
    setModalMessage(message);
    setActionType(type);
    setActionPayload(payload);
    setShowModal(true);
  };

  const handleConfirm = () => {
    if (actionType === "changeRole") {
      dispatch(changeRole(actionPayload, () => navigate("/login")));
    } else if (actionType === "deleteUser") {
      dispatch(deleteUser(actionPayload));
    }
    setShowModal(false);
  };

  return (
    <>
      <div className="d-flex justify-content-between m-2 ">
        <div>
          <button
            className="btn btn-success"
            data-bs-toggle="modal"
            data-bs-target="#modalCreateUser"
            title="Create User"
          >
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>

        <div className="d-flex align-items-center">
          <input
            type="search"
            className="form-control me-2"
            placeholder="Search..."
            onChange={(e) => handleSearch(e.target.value)}
          />{" "}
          &nbsp;
          <select
            style={{ width: "40%" }}
            className="form-control form-select"
            onChange={(e) => handleFilterRole(e.target.value)}
            value={role}
          >
            <option value="default">All</option>
            <option value="1">Admin</option>
            <option value="0">User</option>
          </select>
        </div>
      </div>
      <div className="col-md-12 " style={{ minHeight: "330px" }}>
        <table
          className="table table-responsive"
          style={{ tableLayout: "fixed" }}
        >
          <thead>
            <tr>
              <th style={{ width: "25%" }}>Name</th>
              <th style={{ width: "35%" }}>Email</th>
              <th style={{ width: "15%" }}>Role</th>
              <th style={{ width: "15%" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentItems &&
              currentItems.map((user) => (
                <ElementUser
                  key={user.id}
                  user={user}
                  handleEditUser={handleEditUser}
                  handleShowModal={handleShowModal}
                />
              ))}
          </tbody>
        </table>
      </div>
      <PaginationUser
        totalPage={totalPage}
        currentPage={currentPage}
        handleChangePage={(p) => handleChangePage(p)}
      />
      {/* Render the confirmation modal */}
      {showModal && (
        <ModalConfirm
          message={modalMessage}
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export default ListUser;
