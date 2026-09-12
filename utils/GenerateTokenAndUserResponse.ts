// // import { JWT_SECRET } from "../config/config.js"
// import { Request, Response } from "express";
// import jwt from "jsonwebtoken";

// const GenerateTokenAndUser = (User: any, req: Request, res: Response, message: string) => {
//       const token = jwt.sign({id:User._id , role: User.role }, process.env.JWT_SECRET as string,{expiresIn:"1d"})
//       const refreshtoken = jwt.sign({id:User._id},process.env.JWT_SECRET as string,{expiresIn:"7d"})

//       return res.json({
//         User,
//         token,
//         refreshtoken,
//         success:message
//       })
// }

// export default GenerateTokenAndUser;

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const GenerateTokenAndUser = (User: any, req: Request, res: Response, message: string) => {
  // 1. Access Token banaya (15 minutes life)
  const token = jwt.sign({ id: User._id, role: User.role }, process.env.JWT_SECRET as string, {
    expiresIn: '15m',
  });

  // 2. Refresh Token banaya (7 days life)
  const refreshtoken = jwt.sign({ id: User._id }, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
  });

  // 3. Access Token ko cookie mein dala
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Sirf production par true hoga
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Localhost ke liye 'lax'
    maxAge: 15 * 60 * 1000,
  });

  // 4. Refresh Token ko cookie mein dala
  res.cookie('refreshtoken', refreshtoken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Sirf production par true hoga
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // 5. Response mein se ab tokens gayab! Sirf user info aur success message jayega
  return res.json({
    User: {
      _id: User._id,
      first_name: User.first_name,
      last_name: User.last_name,
      email: User.email,
      role: User.role,
      isblocked: User.isblocked,
    },
    success: message,
  });
};

export default GenerateTokenAndUser;
