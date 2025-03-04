import jwt from "jsonwebtoken";

const cookieOptions = {
  maxAge:
    process.env.COOKIE_EXPIRY * 24 * 60 * 60 * 1000 || 3 * 24 * 60 * 60 * 1000,
  sameSite: "none",
  httpOnly: true,
  secure: true,
};

const sendToken = async (res, user, code, message) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY,
  });

  res.status(code).cookie("token", token, cookieOptions).json({
    success: true,
    message,
  });
};

export default sendToken;
