
import TryCatch from '../middlewares/tryCatch.js'
import ErrorHandler from '../utils/ErrorHandler';
import { cookieOptions } from '../lib/feature.js';
export const adminLogin=TryCatch(async(req,res,next)=>{



    const { secretKey}=req.body;


    const isMatched=(secretKey==process.env.ADMIN_SECRET_KEY);

    if(!isMatched){
        return next(new ErrorHandler("Wrong Admin Password",401));
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
      .cookie("chattu-admin-token", "", {
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