const initialState = {
    // Loading states
    loading: false,
    submitting: false,

    // Data
    overview: {
        total: 0,
        averageRating: 0,
        satisfactionRate: 0,
        thisMonth: 0,
        ratingDistribution: {},
        sentimentAnalysis: {},
    },
    timeStats: {
        period: "month",
        chartData: [],
    },
    recentFeedback: [],
    ratingStats: {
        distribution: [],
    },

    // UI states for feedback display
    showAllFeedback: false,
    feedbackDisplayLimit: 3,

    // Error handling
    error: null,

    // UI states
    lastUpdated: null,
};

const feedbackReducer = (state = initialState, action) => {
    switch (action.type) {
        case "FEEDBACK_SET_LOADING":
            return {
                ...state,
                loading: action.payload,
                error: action.payload ? null : state.error, // Clear error when starting to load
            };

        case "FEEDBACK_SET_SUBMITTING":
            return {
                ...state,
                submitting: action.payload,
                error: action.payload ? null : state.error, // Clear error when starting to submit
            };

        case "FEEDBACK_SET_OVERVIEW_STATS":
            return {
                ...state,
                overview: {
                    ...state.overview,
                    ...action.payload,
                },
                error: null,
                lastUpdated: new Date().toISOString(),
            };

        case "FEEDBACK_SET_TIME_STATS":
            return {
                ...state,
                timeStats: {
                    ...state.timeStats,
                    ...action.payload,
                },
                error: null,
                lastUpdated: new Date().toISOString(),
            };

        case "FEEDBACK_SET_RECENT":
            return {
                ...state,
                recentFeedback: action.payload,
                error: null,
                lastUpdated: new Date().toISOString(),
            };

        case "FEEDBACK_APPEND_RECENT":
            return {
                ...state,
                recentFeedback: [...state.recentFeedback, ...action.payload],
                error: null,
                lastUpdated: new Date().toISOString(),
            };

        case "FEEDBACK_SET_SHOW_ALL":
            return {
                ...state,
                showAllFeedback: action.payload,
            };

        case "FEEDBACK_SET_RATING_STATS":
            return {
                ...state,
                ratingStats: {
                    ...state.ratingStats,
                    ...action.payload,
                },
                error: null,
                lastUpdated: new Date().toISOString(),
            };

        case "FEEDBACK_SET_ERROR":
            return {
                ...state,
                loading: false,
                submitting: false,
                error: action.payload,
            };

        case "FEEDBACK_CLEAR_ERROR":
            return {
                ...state,
                error: null,
            };

        case "FEEDBACK_RESET_STATE":
            return {
                ...initialState,
            };

        default:
            return state;
    }
};

export default feedbackReducer;
