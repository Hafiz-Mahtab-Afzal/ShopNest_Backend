import * as auth from "../controllers/user.controllers"
import express from 'express'
import { checkrole, requriedLoggedIn } from "../middlewares/authMiddle"
import rateLimit from "express-rate-limit";
import upload from "../middlewares/multer"

const users = express.Router()

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5,
	message: {
		success: false,
		message: "Bohot zyada ghalat koshishein! 15 minute baad dobara try karein."
	},
	standardHeaders: true,
	legacyHeaders: false, 
});

// ==================== 1. PUBLIC ROUTES ====================
users.post("/pre-signup", auth.preSignup)
users.post("/signup", auth.signup)
users.post("/login", loginLimiter, auth.login)
users.post("/forget-password", auth.forgetPassword)
users.post("/otp", auth.otp)
users.put("/reset-password/:token", auth.resetPassword)

// ==================== 2. PROTECTED ROUTES (USER LEVEL) ====================
users.put("/updateprofile/:id", requriedLoggedIn, upload.array("images", 5), auth.updateprofile);

// ✅ IMPORTANT: Yeh /verify upar rakha hai /:id se — warna /:id match kar leta tha!
users.get("/verify", requriedLoggedIn, (req, res) => {
  res.status(200).json({ success: true, message: "Token valid hai" });
});

// ==================== 3. ADMIN ONLY ROUTES ====================
users.get("/users", requriedLoggedIn, checkrole, auth.showallusers);
users.get("/getprofile/:id", requriedLoggedIn, auth.getprofile);
users.put("/block/:id", requriedLoggedIn, checkrole, auth.userblocked);
users.delete("/:id", requriedLoggedIn, checkrole, auth.deleteuser); // ← /:id hamesha NEECHE

export default users;