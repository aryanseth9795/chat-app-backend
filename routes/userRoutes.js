import express from "express";
import {SignUp, login, myProfile } from '../controllers/userController.js'
import isAuthenticated from "../middlewares/auth.js";
import { singleAvatar } from "../middlewares/multer.js";

const router=express.Router();

//tested routes

router.route("/signup").post(singleAvatar,SignUp);
router.route("/login").post(login);
router.route("/me").get(isAuthenticated,myProfile);





export default router;