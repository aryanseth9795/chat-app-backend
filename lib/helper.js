
export const getOtherMember = (members, userId) => {
  members.find((member) => member.id.toString() !== userId.tostring());
};

// socket ids map
export const getSockets = (users = []) => {
  const sockets = users.map((user) => userSocketIDs.get(user.toString()));

  return sockets;
};