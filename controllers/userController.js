import TryCatch from '../middlewares/tryCatch.js'
import sendToken from '../utils/SendToken.js'
import {User} from '../models/userModels.js'
import ErrorHandler from '../utils/ErrorHandler.js'
// Create a new user and save it to the database and save token in cookie
const newUser = TryCatch(async (req, res, next) => {
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