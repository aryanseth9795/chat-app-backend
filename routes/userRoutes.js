import express from "express";
import {SignUp, login, myProfile } from '../controllers/userController.js'
import isAuthenticated from "../middlewares/auth.js";

const router=express.Router();



router.route("SignUp").post(SignUp);
router.route("login").post(login);
router.route("me").post(isAuthenticated,myProfile);





export default router;