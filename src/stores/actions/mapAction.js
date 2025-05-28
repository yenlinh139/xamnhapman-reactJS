import { SET_LAYER, SET_MAP } from "@stores/constants";

// src/redux/actions/mapActions.js
export const setMap = (map) => ({
    type: SET_MAP,
    payload: map,
});

export const setLayer = (layer) => ({
    type: SET_LAYER,
    payload: layer,
});
