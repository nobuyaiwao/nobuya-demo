const express = require("express");
const cors = require("cors");
const path = require("path");

const paymentRoutes = require("./routes/payments");
const configRoutes = require("./routes/config"); // ✅ Add config route

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, "../src"), { extensions: ["html", "js", "css"] }));

// API routes
app.use("/api", paymentRoutes);
app.use("/api/config", configRoutes); // ✅ Register the /api/config route

// Root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../src/index.html"));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

