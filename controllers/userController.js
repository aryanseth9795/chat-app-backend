import TryCatch from "../middlewares/tryCatch.js";
import sendToken from "../utils/SendToken.js";
import { User } from "../models/userModels.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { compare } from "bcrypt";

// Creating  a new user and save it to the database and save token in cookie
export const SignUp = TryCatch(async (req, res, next) => {
  const { name, username, password, bio } = req.body;

  const file = req.file;

  if (!file) return next(new ErrorHandler("Please Upload Avatar"));

  // const cloudinaryResult = await uploadFilesToCloudinary([file]);

  const avatar = {
    public_id: cloudinaryResult[0].public_id,
    url: cloudinaryResult[0].url,
  };

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

  const user = await User.findOne(username).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid Username or Password", 401));
  }

  const isMatched = compare(password, user.password);

  if (!isMatched) {
    return next(new ErrorHandler("Incorrect Password", 401));
  }

  sendToken(res, user, 201, "Login Successfully");
});

export const myProfile = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user?._id);
res.status(200).json({
 success:true,
 user
})
});
