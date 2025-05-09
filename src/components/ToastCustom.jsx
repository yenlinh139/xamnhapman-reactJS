import { Toaster } from "react-hot-toast";

function ToastCustom() {
  return (
    <Toaster
      toastOptions={{
        duration: 2000,
        position: "bottom-start",
        style: {
          background: "linear-gradient(to bottom, #1AFFB3, #0C7C57)",
          color: "#fff",
        },
      }}
    />
  );
}

export default ToastCustom;
