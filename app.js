import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import dbConnect from './utils/db.js'
import userRoutes from './routes/userRoutes.js';
import errorMiddleware from './middlewares/error.js';
dotenv.config({path:"./.env"})

const app=express();

dbConnect(process.env.MONGO_URI)



// middlewares
app.use(cors());
app.use(express.json());
app.use(cors);





//Routes
app.use("api/v1/",userRoutes)




app.use(errorMiddleware);

app.listen(process.env.PORT||5000, ()=>{
   console.log(`Server Started at port ${process.env.PORT}`)
})


export default app;