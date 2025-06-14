// Test file để kiểm tra logic tính trung bình của SalinityReport
// Run: node test_salinity_average.js

// Simulate the calculateArrayAverage function
const calculateArrayAverage = (dataArray) => {
    if (!dataArray || dataArray.length === 0) return "NULL";

    const validValues = dataArray
        .map((item) => parseFloat(item.value))
        .filter((value) => !isNaN(value) && value > 0);

    if (validValues.length === 0) return "NULL";

    const sum = validValues.reduce((acc, value) => acc + value, 0);
    return Math.round((sum / validValues.length) * 1000) / 1000; // Round to 3 decimal places
};

// Simulate the formatSalinity function
const formatSalinity = (value) => {
    if (value === null || value === undefined || value === "" || value === "NULL") {
        return "NULL";
    }
    return parseFloat(value).toFixed(2);
};

// Test cases
console.log("=== TEST CALCULATEARRAYAVERAGE ===");

// Test case 1: Empty array
const emptyArray = [];
console.log("Empty array:", calculateArrayAverage(emptyArray)); // Should return "NULL"

// Test case 2: Array with null/undefined
const nullArray = null;
console.log("Null array:", calculateArrayAverage(nullArray)); // Should return "NULL"

// Test case 3: Array with valid values
const validArray = [{ value: "2.5" }, { value: "3.0" }, { value: "1.5" }];
console.log("Valid array:", calculateArrayAverage(validArray)); // Should return average

// Test case 4: Array with invalid values (null, 0, negative)
const invalidArray = [{ value: null }, { value: "0" }, { value: "-1" }, { value: "" }];
console.log("Invalid array:", calculateArrayAverage(invalidArray)); // Should return "NULL"

// Test case 5: Mixed array
const mixedArray = [
    { value: "2.5" },
    { value: null },
    { value: "0" },
    { value: "3.0" },
    { value: "-1" },
    { value: "1.5" },
];
console.log("Mixed array:", calculateArrayAverage(mixedArray)); // Should return average of 2.5, 3.0, 1.5

console.log("\n=== TEST FORMATSALINITY ===");

// Test format salinity
console.log("formatSalinity(2.5):", formatSalinity(2.5)); // Should return "2.50"
console.log("formatSalinity(null):", formatSalinity(null)); // Should return "NULL"
console.log("formatSalinity('NULL'):", formatSalinity("NULL")); // Should return "NULL"
console.log("formatSalinity(''):", formatSalinity("")); // Should return "NULL"
console.log("formatSalinity(undefined):", formatSalinity(undefined)); // Should return "NULL"

console.log("\n=== TEST CHART DATA CONVERSION ===");

// Test chart data conversion (NULL to 0)
const testStations = [
    {
        stationName: "Station 1",
        prevYearMonthlyData: [{ value: "2.5" }, { value: "3.0" }],
    },
    {
        stationName: "Station 2",
        prevYearMonthlyData: [{ value: null }, { value: "0" }],
    },
];

testStations.forEach((station) => {
    const avg = calculateArrayAverage(station.prevYearMonthlyData);
    const chartValue = avg === "NULL" ? 0 : avg;
    console.log(`${station.stationName}: Average = ${avg}, Chart value = ${chartValue}`);
});
