const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

let isConnected = false;

// ===================== DATABASE CONNECTION =====================
mongoose.connect("mongodb://127.0.0.1:27017/medical_lab", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log("\n✅ MongoDB Connected Successfully!\n");
    isConnected = true;
    setupAdmin();
  })
  .catch(err => {
    console.error("❌ MongoDB Connection Failed:", err.message);
    isConnected = false;
  });

// ===================== SCHEMAS =====================
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, sparse: true, lowercase: true },
  phone: String,
  password: String,
  role: { type: String, default: "patient" },
  createdAt: { type: Date, default: Date.now }
});

const appointmentSchema = new mongoose.Schema({
  patientId: String,
  patientName: String,
  patientEmail: String,
  collectionType: String,
  tests: [String],
  name: String,
  age: Number,
  phone: String,
  email: String,
  address: String,
  date: String,
  time: String,
  status: { type: String, default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

const reportSchema = new mongoose.Schema({
  patientId: String,
  patientName: String,
  fileName: String,
  fileData: String,
  remarks: String,
  recommendation: String,
  testName: String,
  uploadedAt: { type: Date, default: Date.now }
});

// ===================== MODELS =====================
const User = mongoose.model("User", userSchema);
const Appointment = mongoose.model("Appointment", appointmentSchema);
const Report = mongoose.model("Report", reportSchema);

// ===================== SETUP ADMIN =====================
async function setupAdmin() {
  try {
    // Check if admin exists
    const adminExists = await User.findOne({ email: "admin@medcitylab.com" });
    
    if (adminExists) {
      console.log("✅ Admin account already exists!\n");
      console.log("📧 Email: admin@medcitylab.com");
      console.log("🔐 Password: admin123\n");
      return;
    }

    // Create admin
    const admin = await User.create({
      name: "Medcity Admin",
      email: "admin@medcitylab.com",
      password: "admin123",
      phone: "9876543210",
      role: "admin"
    });

    console.log("✅ ADMIN ACCOUNT CREATED!\n");
    console.log("📧 Email: admin@medcitylab.com");
    console.log("🔐 Password: admin123");
    console.log("👤 Role: admin\n");
  } catch (error) {
    console.error("❌ Error setting up admin:", error.message);
  }
}

// ===================== AUTH ENDPOINTS =====================

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    console.log(`\n🔍 Login Attempt`);
    console.log(`   Email: ${email}`);
    console.log(`   Role: ${role}`);

    // Convert email to lowercase for comparison
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      password: password
    });

    if (!user) {
      console.log(`❌ Login Failed: User not found or invalid password\n`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user role matches (optional - for role-specific login)
    if (role && user.role !== role) {
      console.log(`❌ Login Failed: Role mismatch. Expected: ${role}, Got: ${user.role}\n`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log(`✅ Login Successful!`);
    console.log(`   User: ${user.name}`);
    console.log(`   Role: ${user.role}\n`);

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error("❌ Login Error:", error.message);
    res.status(500).json({ message: "Server error: " + error.message });
  }
});

// SIGNUP
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    console.log(`\n📝 Signup Attempt`);
    console.log(`   Email: ${email}`);

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      console.log(`❌ Signup Failed: Email already exists\n`);
      return res.status(400).json({ message: "Email already exists" });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password,
      role: "patient"
    });

    console.log(`✅ Signup Successful!`);
    console.log(`   User: ${name}\n`);

    res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error("❌ Signup Error:", error.message);
    res.status(500).json({ message: "Signup failed: " + error.message });
  }
});

// ===================== APPOINTMENTS =====================

// CREATE APPOINTMENT
app.post("/api/appointments", async (req, res) => {
  try {
    console.log("\n📋 Creating Appointment...");

    const appointment = await Appointment.create(req.body);

    console.log(`✅ Appointment Created!`);
    console.log(`   ID: ${appointment._id}`);
    console.log(`   Patient: ${appointment.name}\n`);

    res.json(appointment);
  } catch (error) {
    console.error("❌ Appointment Error:", error.message);
    res.status(500).json({ message: "Failed to create appointment" });
  }
});

// GET ALL APPOINTMENTS
app.get("/api/appointments", async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });
    console.log(`📋 Fetched ${appointments.length} appointments`);
    res.json(appointments);
  } catch (error) {
    console.error("❌ Fetch Error:", error.message);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
});

// GET PATIENT APPOINTMENTS
app.get("/api/appointments/patient/:patientId", async (req, res) => {
  try {
    const appointments = await Appointment.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
    console.log(`📋 Fetched ${appointments.length} appointments for patient: ${req.params.patientId}`);
    res.json(appointments);
  } catch (error) {
    console.error("❌ Fetch Error:", error.message);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
});

// ===================== REPORTS =====================

// CREATE REPORT
app.post("/api/reports", async (req, res) => {
  try {
    console.log("\n📄 Creating Report...");

    const report = await Report.create(req.body);

    console.log(`✅ Report Created!`);
    console.log(`   ID: ${report._id}`);
    console.log(`   Patient: ${report.patientName}\n`);

    res.json(report);
  } catch (error) {
    console.error("❌ Report Error:", error.message);
    res.status(500).json({ message: "Failed to create report" });
  }
});

// GET ALL REPORTS
app.get("/api/reports", async (req, res) => {
  try {
    const reports = await Report.find().sort({ uploadedAt: -1 });
    console.log(`📄 Fetched ${reports.length} reports`);
    res.json(reports);
  } catch (error) {
    console.error("❌ Fetch Error:", error.message);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

// GET PATIENT REPORTS
app.get("/api/reports/patient/:patientId", async (req, res) => {
  try {
    const reports = await Report.find({ patientId: req.params.patientId }).sort({ uploadedAt: -1 });
    console.log(`📄 Fetched ${reports.length} reports for patient: ${req.params.patientId}`);
    res.json(reports);
  } catch (error) {
    console.error("❌ Fetch Error:", error.message);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

// ===================== HEALTH CHECK =====================
app.get("/api/health", (req, res) => {
  res.json({
    status: "Server is running",
    database: isConnected ? "Connected ✅" : "Disconnected ❌"
  });
});

app.get("/", (req, res) => {
  res.json({ message: "Medcity Lab Backend API is running" });
});

// ===================== ERROR HANDLING =====================
app.use((err, req, res, next) => {
  console.error("❌ Unhandled Error:", err.message);
  res.status(500).json({ message: "Internal server error" });
});

// ===================== START SERVER =====================
const PORT = 5001;
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 MEDCITY LAB BACKEND SERVER");
  console.log("=".repeat(60));
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`📊 Database: medical_lab (MongoDB)`);
  console.log(`⚙️  Status: Running`);
  console.log("=".repeat(60));
});

module.exports = app;