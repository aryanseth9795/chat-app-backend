import {v2 as cloudinary} from "cloudinary";
import ErrorHandler from "./ErrorHandler.js";
import { v4 as uuid } from 'uuid';

const getBase64 = (file) =>
  `data:${file?.mimetype};base64,${file.buffer.toString("base64")}`;

const UploadToCloudinary = async (files = []) => {
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
    const uploadResult = await Promise.all(UploadPromises);
    console.log(uploadResult)
    const formattedResult = uploadResult.map((res) => ({
      public_id: res.public_id,
      url: res.secure_url,
    }));
    console.log(formattedResult)
    return formattedResult;
  } catch (error) {
    throw new ErrorHandler("Error In uploading Files",error);
  }
};
export default UploadToCloudinary;
