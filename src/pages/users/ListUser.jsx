import React, { useCallback, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ElementUser from './ElementUser';
import PaginationUser from './PaginationUser';
import ModalConfirm from '../../components/ModalConfirm';
import { changeRole, deleteUser } from '../../stores/actions/userActions';
import Loading from '../../components/Loading';

const ListUser = ({ setUserEdit }) => {
  // Redux hooks
  const dispatch = useDispatch();
  const { listUser, loading } = useSelector((state) => state.userStore);
  const navigate = useNavigate();

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [role, setRole] = useState('default');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [actionType, setActionType] = useState(null);
  const [actionPayload, setActionPayload] = useState(null);

  const itemsPerPage = 5;

  // Memoized filtered data
  const filteredData = useMemo(() => {
    let result = listUser;

    if (searchTerm.length > 0) {
      result = result.filter(
        (user) =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (role !== 'default') {
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

  const handleEditUser = useCallback(
    (user) => {
      setUserEdit({
        ...user,
        password: '',
      });
    },
    [setUserEdit]
  );

  const handleShowModal = useCallback((message, type, payload) => {
    setModalMessage(message);
    setActionType(type);
    setActionPayload(payload);
    setShowModal(true);
  }, []);

  const handleConfirm = useCallback(() => {
    try {
      if (actionType === 'changeRole') {
        dispatch(
          changeRole(actionPayload, () => {
            toast.success('Role changed successfully');
            navigate('/login');
          })
        );
      } else if (actionType === 'deleteUser') {
        dispatch(
          deleteUser(actionPayload, () => {
            toast.success('User deleted successfully');
          })
        );
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setShowModal(false);
    }
  }, [actionType, actionPayload, dispatch, navigate]);

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
            title="Create User"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Create User</span>
          </button>

          <div className="search-filter-group">
            <div className="search-input">
              <i className="fa-solid fa-search"></i>
              <input
                type="search"
                placeholder="Search users..."
                onChange={handleSearch}
              />
            </div>
            <div className="role-filter">
              <select
                className="form-select"
                onChange={handleFilterRole}
                value={role}
              >
                <option value="default">All Roles</option>
                <option value="1">Admin</option>
                <option value="0">User</option>
              </select>
            </div>
          </div>
        </div>

        <div className="user-table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Name</th>
                <th style={{ width: '35%' }}>Email</th>
                <th style={{ width: '15%' }}>Role</th>
                <th style={{ width: '15%' }}>Actions</th>
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
                  <td colSpan="4" className="text-center">
                    No users found
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
