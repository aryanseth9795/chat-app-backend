import TryCatch from "../middlewares/tryCatch.js";
import sendToken from "../utils/SendToken.js";
import { User } from "../models/userModels.js";
import { Chat } from "../models/chatModel.js";
import { Request } from "../models/requestModel.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { compare } from "bcrypt";
import UploadToCloudinary from "../utils/cloudinary.js";

// Creating  a new user and save it to the database and save token in cookie
export const SignUp = TryCatch(async (req, res, next) => {
  const { name, username, password, email, bio } = req.body;

  const file = req.file;

  let avatar = {
    public_id: "",
    url: "",
  };

  if (file) {
    const cloudinaryResult = await UploadToCloudinary([file]);
    avatar = {
      public_id: cloudinaryResult[0].public_id,
      url: cloudinaryResult[0].url,
    };
  }
  const user = await User.create({
    name,
    bio,
    username,
    password,
    avatar,
  });
  sendToken(res, user, 201, "User created");
});

export const login = TryCatch(async (req, res, next) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).select("password");
  if (!user) {
    return next(new ErrorHandler("Invalid Username or Password", 401));
  }

  const isMatched = await compare(password, user?.password);

  if (!isMatched) {
    return next(new ErrorHandler("Incorrect Password", 401));
  }
  sendToken(res, user, 201, `Login Successfully ${user.name}`);
});

export const myProfile = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next("Error in fetching user details", 401);
  }
  res.status(200).json({
    success: true,
    user,
  });
});

export const logout = TryCatch(async (req, res, next) => {
  res.clearCookie("token").status(200).json({
    success: true,
    message: "Logout Successfully !",
  });
});

export const searchUser = TryCatch(async (req, res, next) => {
  const { name = "" } = req.query;

  // Finding all my chats
  const myChats = await Chat.find({ groupChat: false, members: req.user.id });

  // Extracting all users from my chats (friends or people I've chatted with)
  const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);

  // Finding all users except me and my friends
  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: [allUsersFromMyChats, req.user.id] },
    $or: [
      { name: { $regex: name, $options: "i" } },
      { username: { $regex: name, $options: "i" } },
    ],
  });

  // Fetching users to whom the current user has already sent friend requests
  const sentRequests = await Request.find({ sender: req.user.id }).select(
    "receiver"
  );

  const sentRequestUserIds = sentRequests.map((req) => req.receiver.toString());

  // Modifying the response
  const users = allUsersExceptMeAndFriends.map(
    ({ _id, name, avatar, username }) => ({
      _id,
      name,
      avatar: avatar.url,
      username,
      request: sentRequestUserIds.includes(_id.toString()), // Add request flag if already sent
    })
  );

  return res.status(200).json({
    success: true,
    users,
  });
});

// Send Friend Request
export const sendFriendRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.body;
  console.log(userId, "reciver");
  console.log(userId, "sender");
  const request = await Request.findOne({
    $or: [
      { sender: req.user.id, receiver: userId },
      { sender: userId, receiver: req.user.id },
    ],
  });

  if (request) return next(new ErrorHandler("Request already sent", 400));

  await Request.create({
    sender: req.user.id,
    receiver: userId,
  });

  const user = await User.findById(userId).select("name");

  // emitEvent(req, NEW_REQUEST, [userId]);

  return res.status(200).json({
    success: true,
    message: `Friend Request Sent to ${user.name}`,
  });
});

export const acceptFriendRequest = TryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;

  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request) return next(new ErrorHandler("Request not found", 404));

  if (request.receiver._id.toString() !== req.user.toString())
    return next(
      new ErrorHandler("You are not authorized to accept this request", 401)
    );

  if (!accept) {
    await request.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Friend Request Rejected",
    });
  }

  const members = [request.sender._id, request.receiver._id];

  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name}-${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Friend Request Accepted",
    senderId: request.sender._id,
  });
});

export const getNotification = TryCatch(async (req, res, next) => {
  
  const allRequests = await Request.find({ receiver: req.user.id }).select(
    "sender"
  ).populate("sender", " name username avatar");

  if (!allRequests) {
    next(new ErrorHandler("No Friend Requests", 401));
  }


  res.status(200).json({
    success: true,
   allRequests
  });
});
