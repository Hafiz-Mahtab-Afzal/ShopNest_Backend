import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

// ✅ req.user ka type define karo
interface JwtPayload {
  id: string;
  role: string;
}

// ✅ Express Request extend karo user field ke liye
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const requriedLoggedIn = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 🔒 Pehle cookies se token nikalein, agar na mile to Authorization header dekhein
    let token = req.cookies?.token;

    if (!token) {
      const authHeader = req.headers['authorization'];
      if (authHeader) {
        token = authHeader.split(' ')[1];
      }
    }
  
    if (!token) return res.status(401).json({ message: 'No token provided or invalid token!' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    req.user = decoded;
    console.log(req.user)
    next();
  } catch (err) {
    res.status(403).json({ message: 'Token is not valid!' });
  }
};

export const checkrole = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'You are not authorized' });
    }
  } catch (err) {
    res.status(403).json({ message: 'Token is not valid!' });
  }
};