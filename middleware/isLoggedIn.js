import jwt from "jsonwebtoken";

// Middleware to check if user (admin or worker) is logged in
export const isLoggedIn = (req, res, next) => {
  const token = req.cookies?.token; // requires cookie-parser

  if (!token) return res.redirect("/auth/login");

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded; // attach username & role
    next();
  } catch (err) {
    console.error("JWT verification error:", err);
    return res.redirect("/auth/login");
  }
};






