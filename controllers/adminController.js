import TryCatch from "../middlewares/tryCatch.js";
import ErrorHandler from "../utils/ErrorHandler";
import { cookieOptions } from "../lib/feature.js";
import { Chat } from "../models/chatModel.js";
import { User } from "../models/userModels.js";
import { Message } from "../models/messageModel.js";
import { Request } from "../models/requestModel.js";
export const adminLogin = TryCatch(async (req, res, next) => {
  const { secretKey } = req.body;
  const isMatched = secretKey == process.env.ADMIN_SECRET_KEY;
  if (!isMatched) {
    return next(new ErrorHandler("Wrong Admin Password", 401));
  }

  const token = jwt.sign(secretKey, process.env.JWT_SECRET);

  return res
    .status(200)
    .cookie("admin-token", token, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 15,
    })
    .json({
      success: true,
      message: "Authenticated Successfully, Welcome ADMIN",
    });
});

const adminLogout = TryCatch(async (req, res, next) => {
  return res
    .status(200)
    .cookie("admin-token", "", {
      ...cookieOptions,
      maxAge: 0,
    })
    .json({
      success: true,
      message: "Logged Out Successfully",
    });
});

export const getAdminData = TryCatch(async (req, res, next) => {
  return res.status(200).json({
    admin: true,
  });
});

export const allUsers = TryCatch(async (req, res) => {
  const users = await User.find({});

  const transformedUsers = await Promise.all(
    users.map(async ({ name, username, avatar, _id }) => {
      const [groups, friends] = await Promise.all([
        Chat.countDocuments({ groupChat: true, members: _id }),
        Chat.countDocuments({ groupChat: false, members: _id }),
      ]);

      return {
        name,
        username,
        avatar: avatar.url,
        _id,
        groups,
        friends,
      };
    })
  );

  return res.status(200).json({
    status: "success",
    users: transformedUsers,
  });
});

export const getDashboardStats = TryCatch(async (req, res) => {
  const [
    groupsCount,
    usersCount,
    messagesCount,
    totalChatsCount,
    RequestCount,
  ] = await Promise.all([
    Chat.countDocuments({ groupChat: true }),
    User.countDocuments(),
    Message.countDocuments(),
    Chat.countDocuments(),
    Request.countDocuments(),
  ]);

  const today = new Date();
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const last7DaysMessages = await Message.find({
    createdAt: {
      $gte: last7Days,
      $lte: today,
    },
  }).select("createdAt");

  const messages = new Array(7).fill(0);
  const dayInMiliseconds = 1000 * 60 * 60 * 24;

  last7DaysMessages.forEach((message) => {
    const indexApprox =
      (today.getTime() - message.createdAt.getTime()) / dayInMiliseconds;
    const index = Math.floor(indexApprox);

    messages[6 - index]++;
  });

  const stats = {
    groupsCount,
    usersCount,
    messagesCount,
    totalChatsCount,
    RequestCount,
    messagesChart: messages,
  };

  return res.status(200).json({
    success: true,
    stats,
  });
});
