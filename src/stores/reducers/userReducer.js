import { SET_LIST_USER } from "@stores/constants";

const initState = {
    listUser: [],
};

const userReducer = (state = initState, { type, payload }) => {
    switch (type) {
        case SET_LIST_USER:
            return {
                ...state,
                listUser: payload.sort((a, b) => {
                    if (a.email < b.email) return -1;
                    if (a.email > b.email) return 1;
                    return 0;
                }),
            };

        default:
            return state;
    }
};

export default userReducer;
