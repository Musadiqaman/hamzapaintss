import jwt from "jsonwebtoken";

// middleware to allow specific roles
export const allowRoles = (...roles) => {
  return (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) 
      return res.status(401).json({ success: false, message: "Not logged in" });

    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      req.user = decoded; // attach user info

      if (!roles.includes(decoded.role)) {
        return res.status(403).json({ success: false, message: "Access denied: You do not have permission" });
      }

      next();
    } catch (err) {
      console.error("JWT verification error:", err);
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
  };
};

