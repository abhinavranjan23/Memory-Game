const jwt = require("jsonwebtoken");
const { User } = require("../models/User.js");
const {
  verifyAccessToken,
  extractTokenFromHeader,
} = require("../utils/auth.js");

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

    if (!decoded.userId) {
      return res.status(401).json({ message: "Invalid token structure." });
    }

    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({ message: "Token has expired." });
    }

    if (decoded.isGuest) {
      req.user = {
        id: decoded.userId,
        isGuest: true,
        username: `Guest${decoded.userId.split("_")[1]}`,
      };
      return next();
    }

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

    user.lastActive = new Date();
    await user.save();

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Invalid token." });
  }
};

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

    user.lastActive = new Date();
    await user.save();

    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
};

module.exports = auth;
module.exports.authenticateSocket = authenticateSocket;
