import { SET_LOADING, SET_SHOW_SIGNUP } from "@stores/constants";

const initState = {
    isShowSignUp: false,
    isLoading: false,
};

const appReducer = (state = initState, { type, payload }) => {
    switch (type) {
        case SET_SHOW_SIGNUP:
            return {
                ...state,
                isShowSignUp: payload,
            };

        case SET_LOADING:
            return {
                ...state,
                isLoading: payload,
            };

        default:
            return state;
    }
};

export default appReducer;
