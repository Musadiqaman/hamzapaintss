import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { isLoggedIn } from "../middleware/isLoggedIn.js";
import { isAlreadyLoggedIn } from "../middleware/isAlreadyLoggedIn.js";
import { allowRoles } from "../middleware/allowRoles.js";
import { checkIPBlocked } from "../middleware/checkIPBlocked.js";
import { ensure2FA } from "../middleware/ensure2FA.js";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import Admin from "../models/Admin.js";
import BlockedIP from "../models/BlockedIP.js";


const router = express.Router();



// LOGIN PAGE
router.get("/login",isAlreadyLoggedIn, (req, res) => {
  res.render("login");
});



// ==========================================
// CREATE ADMIN (ONLY ONCE) auth/create-admin
// ===========================================


// router.get("/create-admin", async (req, res) => {
//   try {
//     // check if admin already exists
//     const alreadyAdmin = await Admin.findOne({ role: "admin" });
//     if (alreadyAdmin) {
//       return res.status(400).json({
//         success: false,
//         message: "Admin already exists!"
//       });
//     }

//     const username = process.env.ADMIN_USERNAME;
//     const password = process.env.ADMIN_PASSWORD;

//     if (!username || !password) {
//       return res.status(500).json({
//         success: false,
//         message: "ENV credentials missing!"
//       });
//     }

//     // check if username already exists (IMPORTANT)
//     const usernameTaken = await Admin.findOne({ username });
//     if (usernameTaken) {
//       return res.status(400).json({
//         success: false,
//         message: "This username is already used! Choose another."
//       });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashed = await bcrypt.hash(password, salt);

//     const admin = await Admin.create({
//       username,
//       role: "admin",
//       password: hashed,
//       syncedToAtlas: false // ✅ yeh add karo
//     });

//     return res.json({
//       success: true,
//       message: "Admin created successfully!",
//       admin: {
//         username: admin.username,
//         createdAt: admin.createdAt
//       }
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error creating admin!"
//     });
//   }
// });


// ============================================
// CREATE WORKER (ONLY ONCE) auth/create-worker
// ============================================

// router.get("/create-worker", async (req, res) => {
//   try {
//     // check if worker already exists
//     const alreadyWorker = await Admin.findOne({ role: "worker" });
//     if (alreadyWorker) {
//       return res.status(400).json({
//         success: false,
//         message: "Worker already exists!"
//       });
//     }

//     const username = process.env.WORKER_USERNAME;
//     const password = process.env.WORKER_PASSWORD;

//     if (!username || !password) {
//       return res.status(500).json({
//         success: false,
//         message: "ENV credentials missing!"
//       });
//     }

//     // check if username already exists (IMPORTANT)
//     const usernameTaken = await Admin.findOne({ username });
//     if (usernameTaken) {
//       return res.status(400).json({
//         success: false,
//         message: "This username is already used! Choose another."
//       });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashed = await bcrypt.hash(password, salt);

//     const worker = await Admin.create({
//       username,
//       role: "worker",
//       password: hashed, 
//       syncedToAtlas: false // ✅ yeh add karo
//     });

//     return res.json({
//       success: true,
//       message: "Worker created successfully!",
//       worker: {
//         username: worker.username,
//         createdAt: worker.createdAt
//       }
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error creating worker!"
//     });
//   }
// });




const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minute
  max: 10,
  handler: async (req, res) => {
    const ip = req.ip;

    // Localhost IPs ko kabhi block nahi karna
    const localhostIPs = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];
    
    if (localhostIPs.includes(ip)) {
      return res.status(429).json({
        success: false,
        message: "Too many attempts! Please wait 2 minutes before trying again."
      });
    }

    console.log("⚠️ Blocking IP permanently:", ip);

    await BlockedIP.create({ ip });

    return res.status(429).json({
      success: false,
      message: `Too many attempts! Your IP ${ip} is permanently blocked.`
    });
  }
});




router.post("/login", checkIPBlocked, loginLimiter, isAlreadyLoggedIn, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "All fields are required!" });
    }

    const user = await Admin.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: "Username or password is wrong!" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Username or password is wrong!" });
    }

    // ===== GENERATE OTP =====
    const otp = Math.floor(100000 + Math.random() * 900000);
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 mins
    user.syncedToAtlas = false; // ✅ yeh add karo
    await user.save();

    // ✅ TEMPORARY SESSION FOR 2FA ACCESS
    req.session.otpUserId = user._id;

    // ===== SELECT EMAIL ACCOUNT BASED ON ROLE =====
    let emailUser, emailPass, sendTo;

    if (user.role === "admin") {
      emailUser = process.env.ADMIN_EMAIL_USER;
      emailPass = process.env.ADMIN_EMAIL_PASS;
      sendTo = process.env.ADMIN_RECEIVE_EMAIL;
    } else {
      emailUser = process.env.WORKER_EMAIL_USER;
      emailPass = process.env.WORKER_EMAIL_PASS;
      sendTo = process.env.WORKER_RECEIVE_EMAIL;
    }

    // ===== CREATE TRANSPORTER =====
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    // ===== SEND OTP =====
    await transporter.sendMail({
      from: `"Secure Login" <${emailUser}>`,
      to: sendTo,
      subject: "Your OTP Code",
      text: `Hello ${user.username},\nYour OTP is: ${otp}\nIt expires in 5 minutes.`
    });

    return res.json({
      success: true,
      message: "OTP sent successfully! Redirecting...",
      redirect2FA: true
    });

  } catch (err) {
    console.error("Login API Error:", err);

    // ✅ Internet / DNS error — smtp.gmail.com reach nahi hua
    if (
      err.code === "EDNS" ||
      err.code === "ENOTFOUND" ||
      err.code === "ECONNREFUSED" ||
      err.syscall === "getaddrinfo"
    ) {
      console.error("❌ No internet connection — cannot reach smtp.gmail.com");
      return res.status(503).json({
        success: false,
        message: "No internet connection. Please check your network and try again."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error! Please try again."
    });
  }
});




router.get('/2FA',ensure2FA,(req,res)=>{
res.render("2FA");
});



// VERIFY OTP
router.post("/verify-otp", ensure2FA, async (req, res) => {

  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: "OTP is required!" });
    }

    const otpNumber = Number(otp);
    if (isNaN(otpNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP format! Please enter numbers only."
      });
    }

    const user = await Admin.findOne({
      otp: otpNumber,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP!" });
    }

    user.otp = null;
    user.otpExpires = null;
    user.syncedToAtlas = false; // ✅ yeh add karo
    await user.save();

    req.session.destroy(err => {
      if (err) console.error("Session destroy error:", err);
    });

    res.clearCookie("connect.sid");

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "365d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 365 * 24 * 60 * 60 * 1000
    });

    return res.json({ success: true, message: "OTP verified successfully!" });

  } catch (err) {
    console.error("Verification API Error:", err);

    // ✅ Agar kabhi verify-otp mein bhi network error aaye
    if (
      err.code === "EDNS" ||
      err.code === "ENOTFOUND" ||
      err.code === "ECONNREFUSED" ||
      err.syscall === "getaddrinfo"
    ) {
      console.error("❌ No internet connection detected in verify-otp");
      return res.status(503).json({
        success: false,
        message: "No internet connection. Please check your network and try again."
      });
    }

    return res.status(500).json({ success: false, message: "Server error. Try again!" });
  }
});



// LOGOUT FROM 2FA PAGE
router.post("/logout-2fa",ensure2FA,(req, res) => {
  // Destroy session
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: "Could not log out!" });
    }
    // Clear connect.sid cookie
    res.clearCookie("connect.sid");
    return res.json({ success: true, message: "Logged out successfully!" });
  });
});



// LOGOUT
router.get("/logout",isLoggedIn,allowRoles("admin", "worker"), (req, res) => {
  res.clearCookie("token");
  res.redirect("/auth/login");
});





export default router;
