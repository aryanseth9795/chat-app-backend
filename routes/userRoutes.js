import express from "express";
import {
  SignUp,
  acceptFriendRequest,
  login,
  myProfile,
  searchUser,
  sendFriendRequest,
} from "../controllers/userController.js";
import isAuthenticated from "../middlewares/auth.js";
import { singleAvatar } from "../middlewares/multer.js";

const router = express.Router();

//tested routes

router.route("/signup").post(singleAvatar, SignUp);
router.route("/login").post(login);

router.use(isAuthenticated);
router.route("/me").get(myProfile);

router.route("/search").get(searchUser);

router.route("/sendrequest").put(sendFriendRequest);

router.route("/acceptrequest").put(acceptFriendRequest);

export default router;