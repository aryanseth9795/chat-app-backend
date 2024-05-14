import mongoose from "mongoose";
const dbConnect = (uri) => {
  mongoose
    .connect(uri)
    .then((data) =>
      console.log(`Database Connected to Port ${data.connection.host}`)
    )
    .catch((error) => console.log(error));
};

export default dbConnect;