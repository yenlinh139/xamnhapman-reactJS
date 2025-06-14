import axiosInstance from "@config/axios-config";
import { toast } from "react-hot-toast";

// Action creators for feedback reducer
export const feedbackActions = {
    setLoading: (loading) => ({
        type: "FEEDBACK_SET_LOADING",
        payload: loading,
    }),
    setOverviewStats: (data) => ({
        type: "FEEDBACK_SET_OVERVIEW_STATS",
        payload: data,
    }),
    setTimeStats: (data) => ({
        type: "FEEDBACK_SET_TIME_STATS",
        payload: data,
    }),
    setRecentFeedback: (data) => ({
        type: "FEEDBACK_SET_RECENT",
        payload: data,
    }),
    // Thêm action để append thêm feedback
    appendRecentFeedback: (data) => ({
        type: "FEEDBACK_APPEND_RECENT",
        payload: data,
    }),
    setRatingStats: (data) => ({
        type: "FEEDBACK_SET_RATING_STATS",
        payload: data,
    }),
    setError: (error) => ({
        type: "FEEDBACK_SET_ERROR",
        payload: error,
    }),
    clearError: () => ({
        type: "FEEDBACK_CLEAR_ERROR",
    }),
    setSubmitting: (submitting) => ({
        type: "FEEDBACK_SET_SUBMITTING",
        payload: submitting,
    }),
    // Action để set trạng thái hiển thị tất cả
    setShowAll: (showAll) => ({
        type: "FEEDBACK_SET_SHOW_ALL",
        payload: showAll,
    }),
};

// Lấy thống kê tổng quan
export const getOverviewStats = () => async (dispatch) => {
    dispatch(feedbackActions.setLoading(true));

    try {
        const response = await axiosInstance.get("/feedback/stats");

        // Transform data theo format API thực tế
        const data = response.data;
        const transformedData = {
            total: data.total_feedbacks || 0,
            averageRating: data.average_rating || 0,
            satisfactionRate: data.sentiment_analysis?.positive?.percentage || 0,
            thisMonth: data.total_feedbacks || 0,
            ratingDistribution: data.rating_distribution || {},
            sentimentAnalysis: data.sentiment_analysis || {},
        };

        dispatch(feedbackActions.setOverviewStats(transformedData));
        return transformedData;
    } catch (error) {
        const errorMessage = error.response?.data?.message || "Không thể tải thống kê tổng quan";
        dispatch(feedbackActions.setError(errorMessage));
        toast.error(errorMessage);
        throw error;
    } finally {
        dispatch(feedbackActions.setLoading(false));
    }
};

// Lấy xu hướng theo thời gian với parameter chuẩn
export const getTimeStats =
    (period = "month", limit = 12, startDate = null, endDate = null) =>
    async (dispatch) => {
        dispatch(feedbackActions.setLoading(true));

        try {
            // Tạo params với thời gian cụ thể
            const params = { period, limit };

            // Thêm startDate và endDate nếu có
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            // Nếu period là day/week/month, tự động tính thời gian
            if (!startDate && !endDate) {
                const now = new Date();
                switch (period) {
                    case "day":
                        params.start_date = new Date(
                            now.getFullYear(),
                            now.getMonth(),
                            now.getDate(),
                        ).toISOString();
                        params.end_date = new Date(
                            now.getFullYear(),
                            now.getMonth(),
                            now.getDate() + 1,
                        ).toISOString();
                        break;
                    case "week":
                        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                        const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
                        params.start_date = weekStart.toISOString();
                        params.end_date = weekEnd.toISOString();
                        break;
                    case "month":
                        params.start_date = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                        params.end_date = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
                        break;
                }
            }

            const response = await axiosInstance.get("/feedback/stats/time", {
                params,
            });

            // Transform data theo format API thực tế
            const data = response.data;
            const transformedData = {
                period: period,
                chartData: Array.isArray(data)
                    ? data.map((item) => ({
                          period: item.period,
                          label: item.period,
                          count: item.total_feedbacks || 0,
                          averageRating: item.average_rating || 0,
                          positive: item.positive_feedbacks || 0,
                          negative: item.negative_feedbacks || 0,
                      }))
                    : [],
            };

            dispatch(feedbackActions.setTimeStats(transformedData));
            return transformedData;
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Không thể tải xu hướng theo thời gian";
            dispatch(feedbackActions.setError(errorMessage));
            toast.error(errorMessage);
            throw error;
        } finally {
            dispatch(feedbackActions.setLoading(false));
        }
    };

// Lấy feedback gần đây
export const getRecentFeedback =
    (limit = 10) =>
    async (dispatch) => {
        dispatch(feedbackActions.setLoading(true));

        try {
            const response = await axiosInstance.get("/feedback/recent", {
                params: { limit },
            });

            // Transform data theo format API thực tế
            const data = response.data;
            const transformedData = Array.isArray(data)
                ? data.map((item) => ({
                      id: item.id,
                      user: {
                          name: item.name || "Người dùng ẩn danh",
                          email: item.email || null,
                      },
                      rating: item.rating || 0,
                      comment: item.message || "",
                      createdAt: item.created_at,
                      category: item.category || null,
                  }))
                : [];

            dispatch(feedbackActions.setRecentFeedback(transformedData));
            return transformedData;
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Không thể tải feedback gần đây";
            dispatch(feedbackActions.setError(errorMessage));
            toast.error(errorMessage);
            throw error;
        } finally {
            dispatch(feedbackActions.setLoading(false));
        }
    };

// Lấy chi tiết theo rating
export const getRatingStats = () => async (dispatch) => {
    dispatch(feedbackActions.setLoading(true));

    try {
        const response = await axiosInstance.get("/feedback/stats/rating");

        // Transform data theo format API thực tế
        const data = response.data;
        const transformedData = {
            distribution: Array.isArray(data)
                ? data.map((item) => ({
                      rating: parseInt(item.rating) || 0,
                      count: parseInt(item.count) || 0,
                      percentage: parseFloat(item.percentage) || 0,
                  }))
                : [],
        };

        dispatch(feedbackActions.setRatingStats(transformedData));
        return transformedData;
    } catch (error) {
        const errorMessage = error.response?.data?.message || "Không thể tải thống kê rating";
        dispatch(feedbackActions.setError(errorMessage));
        toast.error(errorMessage);
        throw error;
    } finally {
        dispatch(feedbackActions.setLoading(false));
    }
};

// Lấy tất cả dữ liệu feedback cho trang chủ
export const getAllFeedbackData = () => async (dispatch) => {
    dispatch(feedbackActions.setLoading(true));

    try {
        // Gọi song song tất cả API
        const [overviewRes, timeRes, recentRes, ratingRes] = await Promise.allSettled([
            axiosInstance.get("/feedback/stats"),
            axiosInstance.get("/feedback/stats/time"),
            axiosInstance.get("/feedback/recent"),
            axiosInstance.get("/feedback/stats/rating"),
        ]);

        // Transform và xử lý từng kết quả theo format thực tế
        if (overviewRes.status === "fulfilled") {
            const data = overviewRes.value.data;
            const transformedData = {
                total: data.total_feedbacks || 0,
                averageRating: data.average_rating || 0,
                satisfactionRate: data.sentiment_analysis?.positive?.percentage || 0,
                thisMonth: data.total_feedbacks || 0,
                ratingDistribution: data.rating_distribution || {},
                sentimentAnalysis: data.sentiment_analysis || {},
            };
            dispatch(feedbackActions.setOverviewStats(transformedData));
        }

        if (timeRes.status === "fulfilled") {
            const data = timeRes.value.data;
            const transformedData = {
                chartData: Array.isArray(data)
                    ? data.map((item) => ({
                          period: item.period,
                          label: item.period,
                          count: item.total_feedbacks || 0,
                          averageRating: item.average_rating || 0,
                          positive: item.positive_feedbacks || 0,
                          negative: item.negative_feedbacks || 0,
                      }))
                    : [],
            };
            dispatch(feedbackActions.setTimeStats(transformedData));
        }

        if (recentRes.status === "fulfilled") {
            const data = recentRes.value.data;
            const transformedData = Array.isArray(data)
                ? data.map((item) => ({
                      id: item.id,
                      user: {
                          name: item.name || "Người dùng ẩn danh",
                          email: item.email || null,
                      },
                      rating: item.rating || 0,
                      comment: item.message || "",
                      createdAt: item.created_at,
                      category: item.category || null,
                  }))
                : [];
            dispatch(feedbackActions.setRecentFeedback(transformedData));
        }

        if (ratingRes.status === "fulfilled") {
            const data = ratingRes.value.data;
            const transformedData = {
                distribution: Array.isArray(data)
                    ? data.map((item) => ({
                          rating: parseInt(item.rating) || 0,
                          count: parseInt(item.count) || 0,
                          percentage: parseFloat(item.percentage) || 0,
                      }))
                    : [],
            };
            dispatch(feedbackActions.setRatingStats(transformedData));
        }
    } catch (error) {
        const errorMessage = "Không thể tải một phần dữ liệu feedback";
        dispatch(feedbackActions.setError(errorMessage));
        toast.error(errorMessage);
        throw error;
    } finally {
        dispatch(feedbackActions.setLoading(false));
    }
};

// Gửi feedback mới
export const submitFeedback = (feedbackData) => async (dispatch) => {
    dispatch(feedbackActions.setSubmitting(true));

    try {
        const response = await axiosInstance.post("/feedback", feedbackData);

        toast.success("Gửi phản hồi thành công!");

        // Reload recent feedback
        dispatch(getRecentFeedback());

        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.message || "Không thể gửi phản hồi";
        dispatch(feedbackActions.setError(errorMessage));
        toast.error(errorMessage);
        throw error;
    } finally {
        dispatch(feedbackActions.setSubmitting(false));
    }
};

// Load thêm feedback (để hiển thị "Xem tất cả")
export const loadMoreFeedback =
    (offset = 0, limit = 10) =>
    async (dispatch) => {
        try {
            const response = await axiosInstance.get("/feedback/recent", {
                params: { offset, limit },
            });

            // Transform data theo format API thực tế
            const data = response.data;
            const transformedData = Array.isArray(data)
                ? data.map((item) => ({
                      id: item.id,
                      user: {
                          name: item.name || "Người dùng ẩn danh",
                          email: item.email || null,
                      },
                      rating: item.rating || 0,
                      comment: item.message || "",
                      createdAt: item.created_at,
                      category: item.category || null,
                  }))
                : [];

            // Nếu offset = 0, replace tất cả, ngược lại append thêm
            if (offset === 0) {
                dispatch(feedbackActions.setRecentFeedback(transformedData));
            } else {
                dispatch(feedbackActions.appendRecentFeedback(transformedData));
            }

            return transformedData;
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Không thể tải thêm feedback";
            dispatch(feedbackActions.setError(errorMessage));
            toast.error(errorMessage);
            throw error;
        }
    };
