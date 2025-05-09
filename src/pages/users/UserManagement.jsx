import { useSelector, useDispatch } from 'react-redux';
import { useState, useEffect } from 'react';
import Loading from '../../components/Loading';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import ListUser from './ListUser';
import { getListUser } from '../../stores/actions/userActions';
import { Helmet } from 'react-helmet-async';
import Header from '../themes/headers/Header';

function User() {
  const { userInfo } = useSelector((state) => state.authStore); // Lấy thông tin người dùng từ Redux
  const { isLoading } = useSelector((state) => state.appStore); // Kiểm tra trạng thái loading từ Redux
  const dispatch = useDispatch(); // Khởi tạo dispatch để gọi action

  const [userEdit, setUserEdit] = useState({
    name: '',
    email: '',
    password: '',
    birthday: '',
    phone: '',
  });

  // Lấy danh sách người dùng khi component được mount
  useEffect(() => {
    dispatch(getListUser());
  }, [dispatch]);

  return (
    <>
      <Helmet>
        <title>Quản lý người dùng | Xâm nhập mặn Tp. Hồ Chí Minh</title>
      </Helmet>
      <Header />
      <div className="container">
        {Number(userInfo?.role) === 1 && (
          <>
            <div className="row shadow-sm containerListUser">
              <ListUser setUserEdit={setUserEdit} />
            </div>

            <EditUserModal userEdit={userEdit} />
            <CreateUserModal />
          </>
        )}

        {isLoading && <Loading />}
      </div>
    </>
  );
}

export default User;
