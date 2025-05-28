function Loading() {
    const styleContainer = {
        position: "fixed",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "gray",
        opacity: "0.5",
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
    };

    return (
        <div style={styleContainer}>
            <span className="loader"></span>
        </div>
    );
}

export default Loading;
