// Helper function to format date to yyyy-mm-dd
const formatDateToYYYYMMDD = (date) => {
    if (!date) return date;

    // If it's already a string, check if it's already in yyyy-mm-dd format
    if (typeof date === "string") {
        // Check if it's already in yyyy-mm-dd format
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
        }
        // If it's a different string format, try to parse it
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
            // Use local date to avoid timezone issues
            const year = parsedDate.getFullYear();
            const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
            const day = String(parsedDate.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        }
        return date; // Return original if can't parse
    }

    // If it's a Date object
    if (date instanceof Date) {
        // Use local date to avoid timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    // Try to create Date from other formats
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
        // Use local date to avoid timezone issues
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
        const day = String(parsedDate.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    return date; // Return original if can't format
};

// Helper function to format record dates
const formatRecordDate = (record) => {
    if (!record || typeof record !== "object") return record;

    return {
        ...record,
        Ngày: formatDateToYYYYMMDD(record.Ngày),
    };
};

// Helper function to format array of records
const formatRecordsArray = (records) => {
    if (!Array.isArray(records)) return records;
    return records.map(formatRecordDate);
};

const initialState = {
    data: [],
    loading: false,
    error: null,
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    },
    selectedDate: null,
    filters: {
        startDate: "",
        endDate: "",
    },
};

const salinityReducer = (state = initialState, action) => {
    switch (action.type) {
        case "SALINITY_SET_LOADING":
            return {
                ...state,
                loading: action.payload,
                error: action.payload ? null : state.error,
            };

        case "SALINITY_SET_DATA":
            return {
                ...state,
                data: formatRecordsArray(action.payload),
                error: null,
            };

        case "SALINITY_SET_PAGINATION":
            return {
                ...state,
                pagination: {
                    ...state.pagination,
                    ...action.payload,
                },
            };

        case "SALINITY_SET_ERROR":
            return {
                ...state,
                error: action.payload,
                loading: false,
            };

        case "SALINITY_CLEAR_ERROR":
            return {
                ...state,
                error: null,
            };

        case "SALINITY_CLEAR_DATA":
            return {
                ...state,
                data: [],
                pagination: {
                    ...initialState.pagination,
                },
                error: null,
            };

        case "SALINITY_SET_SELECTED_DATE":
            return {
                ...state,
                selectedDate: action.payload,
            };

        case "SALINITY_SET_FILTERS":
            return {
                ...state,
                filters: {
                    ...state.filters,
                    ...action.payload,
                },
            };

        case "SALINITY_CLEAR_FILTERS":
            return {
                ...state,
                filters: {
                    startDate: "",
                    endDate: "",
                },
            };

        case "SALINITY_ADD_RECORD":
            const formattedNewRecord = formatRecordDate(action.payload);
            return {
                ...state,
                data: [formattedNewRecord, ...state.data],
                pagination: {
                    ...state.pagination,
                    total: state.pagination.total + 1,
                },
            };

        case "SALINITY_UPDATE_RECORD":
            const formattedUpdateRecord = formatRecordDate(action.payload);
            return {
                ...state,
                data: state.data.map((record) =>
                    record.Ngày === formattedUpdateRecord.Ngày
                        ? { ...record, ...formattedUpdateRecord }
                        : record,
                ),
            };

        case "SALINITY_REMOVE_RECORD":
            return {
                ...state,
                data: state.data.filter((record) => record.Ngày !== action.payload),
                pagination: {
                    ...state.pagination,
                    total: Math.max(0, state.pagination.total - 1),
                },
            };

        case "SALINITY_REMOVE_RECORDS":
            const datesToRemove = action.payload;
            return {
                ...state,
                data: state.data.filter((record) => !datesToRemove.includes(record.Ngày)),
                pagination: {
                    ...state.pagination,
                    total: Math.max(0, state.pagination.total - datesToRemove.length),
                },
            };

        default:
            return state;
    }
};

export default salinityReducer;
