import toast from "react-hot-toast";
import { TOAST } from "@common/constants";

export const ToastCommon = (type, message) => {
    toast.dismiss();
    switch (type) {
        case TOAST.SUCCESS:
            toast.success(message, {
                icon: "👏",
            });
            break;
        case TOAST.ERROR:
            toast.error(message, { icon: "💥" });
            break;
        case TOAST.LOADING:
            toast.loading(message);
            break;
        default:
            toast.error("toast type not found");
            break;
    }
};
