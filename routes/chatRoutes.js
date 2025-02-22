import express from "express";
import isAuthenticated from "../middlewares/auth.js";
import { addMembers, deleteChat, getChatDetails, getMessages, getMyGroups, getUserForaddinUser, getUserForGroup, groupDetails, leaveGroup, myChats, newgroup, removeMember, renameGroup, sendAttachments } from "../controllers/chatController.js";
import { attachmentsMulter } from "../middlewares/multer.js";

const router=express.Router();


router.use(isAuthenticated);
router.route("/newgroup").post(newgroup);
router.route("/mychats").get(myChats);
router.route("/mygroups").get(getMyGroups);
router.route("/grpdetail/:id").get(groupDetails);
router.route("/addmembers").put(addMembers);
router.route("/removeMember").put(removeMember);
router.route("/leave/:id").delete(leaveGroup);
router.route("/message/attachment").post(attachmentsMulter,sendAttachments);
router.route("/membersforgroups").get(getUserForGroup);
router.route("/message/:id").get(getMessages)
// .put(renameGroup).delete(deleteChat);
router.route("/:id").get(getChatDetails);

export default router;