import { getSockets } from "../lib/helper.js";


const emitEvent = (req, event, users, data) => {
    const io = req.app.get("io");
    const usersSocket = getSockets(users);
    console.log(usersSocket," at emit event")
    io.to(usersSocket).emit(event, data);
  };
  export default emitEvent;