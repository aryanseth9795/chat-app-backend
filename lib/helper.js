import { userSocketIDs } from "../app.js";
export const getOtherMember = (members, userId) => {
  const res = members.find(
    (member) => member._id.toString() !== userId.toString()
  );
  return res;
};

// socket ids map
export const getSockets = (users = []) => {
  const sockets = users.map((user) => userSocketIDs.get(user.toString()));

  return sockets;
};
