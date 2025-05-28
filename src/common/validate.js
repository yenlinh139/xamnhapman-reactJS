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
        throw new Error("Email is required");
    }

    if (!validateEmpty(password)) {
        throw new Error("Password is required");
    }
};

export const validateFormSignUp = (params) => {
    const { email, password, confirmPassword, name } = params;

    if (!validateEmpty(name)) {
        throw new Error("Name is required");
    }

    if (!validateEmpty(email)) {
        throw new Error("Email is required");
    }

    if (!validateEmail(email)) {
        throw new Error("Invalid email");
    }

    if (!validateEmpty(password)) {
        throw new Error("Invalid email");
    }

    if (confirmPassword !== password) {
        throw new Error("Confirm Password not match");
    }
};

export const validateEmpty = (value) => value && value.trim().length > 0;
