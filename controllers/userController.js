import TryCatch from "../middlewares/tryCatch.js";
import sendToken from "../utils/SendToken.js";
import { User } from "../models/userModels.js";
import { Request } from "../models/requestModel.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { compare } from "bcrypt";
import UploadToCloudinary from "../utils/cloudinary.js";

// Creating  a new user and save it to the database and save token in cookie
export const SignUp = TryCatch(async (req, res, next) => {
  const { name, username, password, email, bio } = req.body;
console.log(req.body)
  const file = req.file;
  // const file_name=req.user.body{user,}
  const avatar = {};
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
  console.log(user);
  sendToken(res, user, 201, "User created");
});

export const login = TryCatch(async (req, res, next) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username }).select("+password");
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
  const user = await User.findById(req.user);
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
   message:"Logout Successfully !"
  });
});

export const searchUser = TryCatch(async (req, res) => {
  const { name = "" } = req.query;

  // Finding All my chats
  const myChats = await Chat.find({ groupChat: false, members: req.user });

  //  extracting All Users from my chats means friends or people I have chatted with
  const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);

  // Finding all users except me and my friends
  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUsersFromMyChats },
    name: { $regex: name, $options: "i" },
  });

  // Modifying the response
  const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  return res.status(200).json({
    success: true,
    users,
  });
});

// Send Friend Request
export const sendFriendRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.body;

  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
  });

  if (request) return next(new ErrorHandler("Request already sent", 400));

  await Request.create({
    sender: req.user,
    receiver: userId,
  });

  emitEvent(req, NEW_REQUEST, [userId]);

  return res.status(200).json({
    success: true,
    message: "Friend Request Sent",
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
