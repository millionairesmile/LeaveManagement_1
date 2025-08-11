// Authentication middleware
export function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
}

// Admin authorization middleware
export function requireAdmin(req, res, next) {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Admin access required" });
}

// Employee authorization middleware (can access own resources)
export function requireEmployee(req, res, next) {
  if (req.user && req.user.role === "employee") {
    return next();
  }
  res.status(403).json({ message: "Employee access required" });
}

// Check if user can access resource (admin or owner)
export function canAccessResource(userId) {
  return (req, res, next) => {
    if (req.user && (req.user.role === "admin" || req.user.id === userId)) {
      return next();
    }
    res.status(403).json({ message: "Access denied" });
  };
}
