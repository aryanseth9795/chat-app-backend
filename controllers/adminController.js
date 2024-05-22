
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
})