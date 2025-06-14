export const validateEmail = (email) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        );
};

export const validatePassword = (password) => {
    /**
    /^
      (?=.*\d)                            // should contain at least one digit
      (?=.*[a-z])                         // should contain at least one lower case
      (?=.*[A-Z])                         // should contain at least one upper case
      (?=.*[!@#$%^&*().?:{}|<>])        // should contain at least one special character
      [A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}  // should contain at least 8 from the mentioned characters
    $/
  */
    const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*().?:{}|<>]{8,}$/;
    return passwordRegex.test(password);
};

export const validateFormLogin = (params) => {
    const { email, password } = params;

    if (!validateEmpty(email)) {
        throw new Error("Email là bắt buộc");
    }

    if (!validateEmpty(password)) {
        throw new Error("Mật khẩu là bắt buộc");
    }
};

export const validateFormSignUp = (params) => {
    const { email, password, confirmPassword, name } = params;

    if (!validateEmpty(name)) {
        throw new Error("Họ và tên là bắt buộc");
    }

    if (!validateEmpty(email)) {
        throw new Error("Email là bắt buộc");
    }

    if (!validateEmail(email)) {
        throw new Error("Email không hợp lệ");
    }

    if (!validateEmpty(password)) {
        throw new Error("Mật khẩu là bắt buộc");
    }

    if (confirmPassword !== password) {
        throw new Error("Xác nhận mật khẩu không khớp");
    }
};

export const validateEmpty = (value) => value && value.trim().length > 0;

// Date formatting utilities
export const formatDateToDisplay = (dateString) => {
    if (!dateString) return "";

    // Handle YYYY-MM-DD format directly to avoid timezone issues
    if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split("-");
        return `${day}/${month}/${year}`;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};

export const formatDateToInput = (dateString) => {
    if (!dateString) return "";

    // If already in YYYY-MM-DD format, return as is
    if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
    }

    // Handle DD/MM/YYYY format
    if (typeof dateString === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        const [day, month, year] = dateString.split("/");
        return `${year}-${month}-${day}`;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    // Use local date to avoid timezone offset issues
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    return `${year}-${month}-${day}`;
};

export const formatDateFromInput = (inputDate) => {
    if (!inputDate) return "";
    return inputDate; // HTML date input already returns YYYY-MM-DD format
};
