import axiosInstance from "@config/axios-config";

// Action creators for reducer
export const salinityActions = {
    setLoading: (loading) => ({
        type: "SALINITY_SET_LOADING",
        payload: loading,
    }),
    setSalinityData: (data) => ({
        type: "SALINITY_SET_DATA",
        payload: data,
    }),
    setPagination: (pagination) => ({
        type: "SALINITY_SET_PAGINATION",
        payload: pagination,
    }),
    setError: (error) => ({
        type: "SALINITY_SET_ERROR",
        payload: error,
    }),
    clearError: () => ({
        type: "SALINITY_CLEAR_ERROR",
    }),
    clearData: () => ({
        type: "SALINITY_CLEAR_DATA",
    }),
};

// Get all salinity data with filters and pagination
export const fetchSalinityData =
    (params = {}) =>
    async (dispatch) => {
        dispatch(salinityActions.setLoading(true));

        try {
            const queryParams = new URLSearchParams();

            // Add pagination
            if (params.page) queryParams.append("page", params.page);
            if (params.limit) queryParams.append("limit", params.limit);

            // Add date filters
            if (params.startDate) queryParams.append("startDate", params.startDate);
            if (params.endDate) queryParams.append("endDate", params.endDate);

            const response = await axiosInstance.get(`/salinity-data?${queryParams}`);

            if (response.data.code === 200) {
                dispatch(salinityActions.setSalinityData(response.data.data));
                dispatch(salinityActions.setPagination(response.data.pagination));
            } else {
                throw new Error(response.data.message || "Có lỗi xảy ra khi tải dữ liệu");
            }
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || error.message || "Có lỗi xảy ra khi tải dữ liệu";
            dispatch(salinityActions.setError(errorMessage));
            throw error;
        } finally {
            dispatch(salinityActions.setLoading(false));
        }
    };

// Create new salinity data
export const createSalinityData = (data) => async (dispatch) => {
    try {
        const response = await axiosInstance.post("/salinity-data", data);

        if (response.data.code === 201) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || "Có lỗi xảy ra khi tạo dữ liệu");
        }
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || "Có lỗi xảy ra khi tạo dữ liệu";
        throw new Error(errorMessage);
    }
};

// Update salinity data
export const updateSalinityData =
    ({ date, data }) =>
    async (dispatch) => {
        try {
            const response = await axiosInstance.put(`/salinity-data/${date}`, data);

            if (response.data.code === 200) {
                return response.data.data;
            } else {
                throw new Error(response.data.message || "Có lỗi xảy ra khi cập nhật dữ liệu");
            }
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || error.message || "Có lỗi xảy ra khi cập nhật dữ liệu";
            throw new Error(errorMessage);
        }
    };

// Delete salinity data by date
export const deleteSalinityData = (date) => async (dispatch) => {
    try {
        const response = await axiosInstance.delete(`/salinity-data/${date}`);

        if (response.data.code === 200) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || "Có lỗi xảy ra khi xóa dữ liệu");
        }
    } catch (error) {
        const errorMessage =
            error.response?.data?.message || error.message || "Có lỗi xảy ra khi xóa dữ liệu";
        throw new Error(errorMessage);
    }
};

// Delete salinity data range
export const deleteSalinityDataRange =
    ({ startDate, endDate }) =>
    async (dispatch) => {
        try {
            const response = await axiosInstance.delete("/salinity-data-range", {
                data: { startDate, endDate },
            });

            if (response.data.code === 200) {
                return response.data;
            } else {
                throw new Error(response.data.message || "Có lỗi xảy ra khi xóa dữ liệu");
            }
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || error.message || "Có lỗi xảy ra khi xóa dữ liệu";
            throw new Error(errorMessage);
        }
    };
