import express from "express";
import isAuthenticated from "../middlewares/auth.js";
import { myChats, newgroup } from "../controllers/chatController.js";

const router=express.Router();


router.use(isAuthenticated);
router.route("/newgroup").post(newgroup);
router.route("/mychats").post(myChats);






export default router;