import jwt from "jsonwebtoken";

const sendToken = async (res, user, code, message) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY,
  });

  res.status(code).cookie("token", token).json({
    success: true,
    message,
  });
};

export default sendToken;