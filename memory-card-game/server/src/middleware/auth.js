const jwt = require("jsonwebtoken");
const { User } = require("../models/User.js");
const {
  verifyAccessToken,
  extractTokenFromHeader,
} = require("../utils/auth.js");

// HTTP Authentication Middleware
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({ message: "Invalid token." });
    }

    // Enhanced token validation
    if (!decoded.userId) {
      return res.status(401).json({ message: "Invalid token structure." });
    }

    // Check token expiration (if not already handled by verifyAccessToken)
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({ message: "Token has expired." });
    }

    // For guest users
    if (decoded.isGuest) {
      req.user = {
        id: decoded.userId,
        isGuest: true,
        username: `Guest${decoded.userId.split("_")[1]}`, // Extract from guest ID
      };
      return next();
    }

    // For registered users, get from database
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    req.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      isGuest: false,
      isAdmin: user.isAdmin,
      avatar: user.avatar,
    };

    // Update last active time for registered users
    user.lastActive = new Date();
    await user.save();

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Invalid token." });
  }
};

// Socket Authentication Middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return next(new Error("Invalid token"));
    }

    // For guest users
    if (decoded.isGuest) {
      socket.userId = decoded.userId;
      socket.username = `Guest${decoded.userId.split("_")[1]}`;
      socket.isGuest = true;
      socket.data = {
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${socket.username}`,
        isAdmin: false,
      };
      return next();
    }

    // For registered users
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return next(new Error("Invalid token"));
    }

    socket.userId = user._id.toString();
    socket.username = user.username;
    socket.isGuest = user.isGuest;
    socket.data = {
      avatar: user.avatar,
      isAdmin: user.isAdmin,
    };

    // Update user's last active time
    user.lastActive = new Date();
    await user.save();

    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
};

module.exports = auth;
module.exports.authenticateSocket = authenticateSocket;
