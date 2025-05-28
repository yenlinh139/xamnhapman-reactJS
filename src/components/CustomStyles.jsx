const CustomStyles = [
    {
        id: "gl-draw-polygon-fill-inactive",
        type: "fill",
        paint: {
            "fill-color": "#3bb2d0",
            "fill-opacity": 0.1,
        },
    },
    {
        id: "gl-draw-polygon-stroke-inactive",
        type: "line",
        paint: {
            "line-color": "#3bb2d0",
            "line-width": 2,
        },
    },
    {
        id: "gl-draw-polygon-fill-active",
        type: "fill",
        paint: {
            "fill-color": "#fbb03b",
            "fill-opacity": 0.1,
        },
    },
    {
        id: "gl-draw-polygon-stroke-active",
        type: "line",
        paint: {
            "line-color": "#fbb03b",
            "line-dasharray": [1, 2], // Thêm dash array để sửa lỗi line-dasharray
            "line-width": 2,
        },
    },
    {
        id: "gl-draw-line-inactive",
        type: "line",
        paint: {
            "line-color": "#3bb2d0",
            "line-width": 2,
        },
    },
    {
        id: "gl-draw-line-active",
        type: "line",
        paint: {
            "line-color": "#fbb03b",
            "line-dasharray": [0.3, 2],
            "line-width": 2,
        },
    },
];

export default CustomStyles;
