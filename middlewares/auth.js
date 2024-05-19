
import jwt from 'jsonwebtoken'
const isAuthenticated=(req,res,next)=>{

const token =req.cookies["token"];// now it is solved 
if (!token)
    return next(new ErrorHandler("Please login to access this route", 401));
const user=jwt.verify(token,process.env.JWT_SECRET);
 req.user=user;
 next();
}

export default isAuthenticated;


// admin Routes authentication
 export const adminOnly = (req, res, next) => {
    const token = req.cookies["admin-token"];
  
    if (!token)
      return next(new ErrorHandler("Only Admin can access this route", 401));
  
    const secretKey = jwt.verify(token, process.env.JWT_SECRET);
  
    const isMatched = secretKey === adminSecretKey;
  
    if (!isMatched)
      return next(new ErrorHandler("Only Admin can access this route", 401));
    next();
  };


