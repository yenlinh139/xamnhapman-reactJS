import { SET_DATA_USER, SET_USER_INFO } from "../constants";

const initState = {
  userInfo: null,
  userList: null,
};

const authReducer = (state = initState, { type, payload }) => {
  switch (type) {
    case SET_USER_INFO:
      return {
        ...state,
        userInfo: payload,
      };
    case SET_DATA_USER:
      return {
        ...state,
        userList: payload,
      };

    default:
      return state;
  }
};

export default authReducer;
