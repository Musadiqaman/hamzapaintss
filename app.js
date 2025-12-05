import express from "express";
import path from "path";
import dotenv from "dotenv";
import connectDB from "./config/db.js"; 
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import session from "express-session";


// Routes
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";

// Middlewares
import { isLoggedIn } from "./middleware/isLoggedIn.js";
import { allowRoles } from "./middleware/allowRoles.js";

// Load .env
dotenv.config();
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// =======================================================
// 🛡 SECURITY LAYER 1 → Hide Express
// =======================================================
app.disable("x-powered-by");
// =======================================================
// 🛡 SECURITY LAYER 2 → Helmet
// =======================================================
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          "https://unpkg.com",
          "https://cdn.jsdelivr.net"
        ],
        "style-src": [
          "'self'", 
          "'unsafe-inline'", 
          "https://fonts.googleapis.com"
        ],
        "img-src": ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  })
);


// =======================================================
// 🛡 SECURITY LAYER 3 → CORS+ORIGIN (Local + Vercel ready)
// =======================================================
// Allowed origins
const allowedOrigins = process.env.NODE_ENV === "production"
  ? ["https://hamzapaints.vercel.app"]   // Add your production domain(s) here
  : ["http://localhost:3000"];           // Localhost for dev

// ===== CORS Middleware =====
app.use(cors({
  origin: function(origin, callback) {
    // origin null -> Postman, curl, server-side request
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true); // allowed
    }

    // not allowed
    return callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// ===== Strict Origin Check =====
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Allow requests with no origin (like Postman) or allowed origins
  if (!origin || allowedOrigins.includes(origin)) {
    return next();
  }

  // Forbidden response
  return res.status(403).json({
    success: false,
    message: "❌ Forbidden: Origin not allowed"
  });
});



// =======================================================
// 🛡 SECURITY LAYER 4 → Trust proxy (for Vercel)
// =======================================================
app.set("trust proxy", process.env.NODE_ENV === "production");
// =======================================================
// 🛡 SECURITY LAYER 5 → Parsers
// =======================================================
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cookieParser());

// =======================================================
// 🛡 SECURITY LAYER 6 → STATIC FILES & VIEWS
// =======================================================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// =======================================================
// 🛡 SESSION
// =======================================================
app.use(session({
  secret: process.env.SESSION_SECRET || "defaultsecret",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 5 * 60 * 1000, // 5 minutes
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  }
}));

// =======================================================
// ROUTES
// =======================================================
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/sales", saleRoutes);
app.use("/agents", agentRoutes);

app.get("/", (req, res) => res.redirect("/auth/login"));

app.get("/home", isLoggedIn, (req, res) => {
  const role = req.user.role;
  res.render("home", { role });
});

app.get("/navi-bar", isLoggedIn, allowRoles("admin", "worker"), (req, res) => {
  const role = req.user.role;
  res.render("partials/navbar", { role });
});

// =======================================================
// 🛑 404 Handler
// =======================================================
app.use((req, res) => {
  res.status(404).send("❌ Page not found.");
});

// =======================================================
// 🛑 ERROR HANDLER
// =======================================================
app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err.stack);
  res.status(500).send("Internal Server Error.");
});

// =======================================================
// SERVER
// =======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${process.env.NODE_ENV === "production" ? "Vercel" : "http://localhost:" + PORT}`);
});

