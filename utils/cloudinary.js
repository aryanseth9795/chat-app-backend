

import cloudinary from "cloudinary";
import ErrorHandler from "./ErrorHandler";

const getBase64 = (file) =>
  `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

const UploadToCludinary = async (files = []) => {
  const UploadPromises = files.map((file) => {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        getBase64(file),
        {
          resource_type: "auto",
          public_id: uuid(),
        },
        (err, result) => {
          if (err) return reject(err);
          return resolve(result);
        }
      );
    });
  });

  try {

    const uploadResult=await Promise.all(result);
    const formattedResult=uploadResult.map((res)=>({
        public_id:res.public_id,
        url: result.secure_url,
    }))
    return formattedResult;
  } catch (error) {
    throw new ErrorHandler("Error In uploading Files",err)
  }
};
export default UploadToCludinary;
