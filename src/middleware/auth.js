const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "secret123";

function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function isAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

function isChair(req, res, next) {
  if (req.user.role !== "chair" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Chair access required" });
  }
  next();
}

function isReviewer(req, res, next) {
  if (req.user.role !== "reviewer" && req.user.role !== "chair" && req.user.role !== "admin") {
    return res.status(403).json({ message: "Reviewer access required" });
  }
  next();
}

module.exports = { auth, isAdmin, isChair, isReviewer };
