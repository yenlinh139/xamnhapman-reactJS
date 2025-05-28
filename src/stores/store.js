import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";
import persistReducer from "redux-persist/es/persistReducer";
import persistStore from "redux-persist/es/persistStore";
import appReducer from "@stores/reducers/appReducer";
import authReducer from "@stores/reducers/authReducer";
import userReducer from "@stores/reducers/userReducer";
import mapReducer from "@stores/reducers/mapReducer";
import customStorage from "@stores/customStorage";

const customizedMiddleware = {
    serializableCheck: false,
};

const allReducer = combineReducers({
    authStore: authReducer,
    appStore: appReducer,
    userStore: userReducer,
    mapStore: mapReducer,
});

const persistConfig = {
    key: "root",
    storage: customStorage,
};

const persistedReducer = persistReducer(persistConfig, allReducer);

const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware(customizedMiddleware),
});

let persistor = persistStore(store);

export { persistor, store };
