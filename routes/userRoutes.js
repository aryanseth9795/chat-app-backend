import express from "express";
import {SignUp, login, myProfile } from '../controllers/userController.js'

const router=express.Router();



router.route("SignUp").post(SignUp);
router.route("login").post(login);
router.route("me").post(isAutheticated,myProfile);





export default router;