// import GenerateTokenAndUser from "../utils/GenerateTokenAndUserResponse.js"
import { AWS_SES, CLIENT_URL } from '../config/aws';
import evalidator from 'email-validator';
import Schema from 'password-validator';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
// import { nanoid } from 'nanoid'
import user from '../models/user.model';
import { catchErr, error, success, warning } from '../utils/messages';
import EmailTemplate from '../helpers/EmailTemplate';
import GenerateTokenAndUser from '../utils/GenerateTokenAndUserResponse';
import { nanoid } from 'nanoid';
import { z } from 'zod'; // 🌟 Zod import kiya
import { Types } from 'mongoose'  // ← ye import karo
import sanitizeHtml from 'sanitize-html'; // 🛡️ Stored XSS Protection ke liye package import kiya

const pvalidator = new Schema();
pvalidator
  .is()
  .min(8) // Minimum length 8
  .is()
  .max(30) // Maximum length 100
  .has()
  .uppercase(1) // Must have uppercase letters
  .has()
  .lowercase(1) // Must have lowercase letters
  .has()
  .digits(2) // Must have at least 2 digits
  .has()
  .not()
  .spaces() // Should not have spaces
  .is()
  .not()
  .oneOf(['Passw0rd', 'Password123']); // Blacklist these values

// 🌟 ZOD SCHEMAS: Yeh ensure karenge ke koi objects/operators inject na ho sakein
const preSignupSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  password: z.string(),
  confirm_password: z.string()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const forgetPasswordSchema = z.object({
  email: z.string().email()
});

const otpSchema = z.object({
  otp: z.string()
});

const resetPasswordSchema = z.object({
  password: z.string(),
  confirm_password: z.string()
});

const updateProfileSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  phone: z.string()
});

// 1) sent verification link to emailadress /api/v1/pre-sign-up
interface preSignup {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirm_password: string;
}
const preSignup = async (req: Request, res: Response) => {
  try {
    // 🛡️ [COMMENT]: Zod Check (Point 1)
    const validation = preSignupSchema.safeParse(req.body);
    if (!validation.success) {
      return warning('Invalid input formats received', res);
    }

    const { first_name, last_name, email, password, confirm_password } = req.body as preSignup;
    const existemail = await user.findOne({ email });

    // 1) enter all fields
    if (!first_name || !last_name || !email || !password || !confirm_password) {
      return warning('Please Enter All field', res);
    }
    // 2) email sahi likhan
    if (!evalidator.validate(email)) {
      return warning('Email is not valid may be you forget @ or domain .com', res);
    }
    // 3) ya email pahla exist to nahi karti
    if (existemail) {
      return error(`This email ${email} is already registered,try with different email`, res);
    }
    // 4) passord and confirm password must be same
    if (password != confirm_password) {
      return error('Password And Confirm password must be same', res);
    }
    // 5) password ki validation
    if (!pvalidator.validate(password)) {
      return warning(
        'password must be 8 to 30 digits,should have 1 uppercase letter,1lowercase letter,and should have 2 digits',
        res
      );
    }

    // 🛡️ [COMMENT]: Stored XSS Fix (Point 6)
    // database ke liye token mein save karne se pehle text input ko bilkul clean kar rahe hain
    const cleanFirstName = sanitizeHtml(first_name, { allowedTags: [], allowedAttributes: {} });
    const cleanLastName = sanitizeHtml(last_name, { allowedTags: [], allowedAttributes: {} });

    // ab ham in sab ka token create karan ga (Using clean inputs)
    const token = jwt.sign(
      { first_name: cleanFirstName, last_name: cleanLastName, email, password },
      process.env.JWT_SECRET as string,
      { expiresIn: '4h' }
    );
    console.log(token);
    // yahan ham na jo token banaya ha wo jis user na apni information type ki han unhan send kar raha han wo token us ki email par usa mila ga jis par click karna par wo login ka page par poonch jaya ga
    AWS_SES.sendEmail(
      EmailTemplate(
        email,
        ' Signup verification Link ',
        `<p > <a href="${process.env.CLIENT_URL as string}/${token}" style="font-size:12px; color:yellow; hover:text-blue; focus:text-orange letter-spacing:8px" > ${token} </a> </p>`
      ),
      (err, data) => {
        if (err) {
          console.log(err.message);
        }
        if (data) {
          success(' we have sent you a verification link please check your email address ', res);
        }
      }
    );
  } catch (err: any) {
    catchErr(err, res);
  }
};

// 2) create new account after decode the token /api/v1/signup
interface signup {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}
const signup = async (req: Request, res: Response) => {
  try {
    const token = req.body.token as string;
    
    // 🛡️ [COMMENT]: Stored XSS Fix (Point 6 Mapping Check)
    // Token se decoded data uthayein ge kyunke token banate waqt keys 'first_name' aur 'last_name' hi rakhi thi clean inputs ke liye
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as any;

    const first_name = decoded.first_name;
    const last_name = decoded.last_name;
    const email = decoded.email;
    const password = decoded.password;

    // encrypt the password before saving into database
    const salt = await bcryptjs.genSalt(12);
    const hashpassword = await bcryptjs.hash(password, salt);
    const emailfound = await user.findOne({ email });
    if (emailfound) {
      return error(`This email ${email} is already registered,may be you click on link again`, res);
    }
    // now finally create the account
    await new user({
      first_name,
      last_name,
      email,
      password: hashpassword,
    }).save();

    success(`${first_name} ${last_name},your account have been created`, res);
  } catch (err: any) {
    catchErr(err, res);
  }
};

// 3) logged in with your credientials /login
interface loginbody {
  email: string;
  password: string;
}
const login = async (req: Request, res: Response) => {
  try {
    // 🛡️ [COMMENT]: NoSQL Injection Protection (Point 1)
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return warning('Invalid email or password format', res);
    }

    const { email, password } = req.body as loginbody;
    const User = await user.findOne({ email }).lean();
    if (!email || !password) {
      return warning('both fields are required', res);
    }
    if (!evalidator.validate(email)) {
      return warning('email is not valid', res);
    }
    if (!User) {
      return error('This email is not registered', res);
    }
    if (User?.isblocked) {
      return warning('This email is blocked', res);
    }
    const isMatchedpassword = await bcryptjs.compare(password, User.password);
    if (!isMatchedpassword) {
      return error('Wrong password', res);
    }

    GenerateTokenAndUser(User, req, res, 'you are successsfuly logged In');
  } catch (err: any) {
    catchErr(err, res);
  }
};

// 4) we will send you otp for password recovery /api/v1/pre-sign-up
const forgetPassword = async (req: Request, res: Response) => {
  try {
    // 🛡️ [COMMENT]: Zod Validation (Point 1)
    const validation = forgetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return warning('Invalid email format', res);
    }

    const email = req.body.email as string;
    const User = await user.findOne({ email });
    if (!email) {
      return error('please enter your email', res);
    }
    if (!evalidator.validate(email)) {
      return warning('This email is not valid', res);
    }
    if (!User) {
      return error(`This email ${email} is not registered`, res);
    }
    const otp = nanoid(5).toUpperCase();
    User.otp = otp;
    await User.save();

    AWS_SES.sendEmail(
      EmailTemplate(
        email,
        ' forget password OTP ',
        `<p> Below is your otp </p>
              <span style="font-size:45px; color:orange; letter-spacing:8px"> ${otp} </span>
             `
      ),
      (err: any, data: any) => {
        if (err) {
          console.log(err.message);
        }
        if (data) {
          success(' We have sent you otp please check your email address ', res);
        }
      }
    );
  } catch (err: any) {
    catchErr(err, res);
  }
};

// 5) user ko otp send kar di ha
const otp = async (req: Request, res: Response) => {
  try {
    // 🛡️ [COMMENT]: Zod Validation
    const validation = otpSchema.safeParse(req.body);
    if (!validation.success) {
      return warning('Invalid OTP format', res);
    }
    
    const otp = req.body.otp as string;

    // 1) otp wali field khali nahi honi chaiya
    if (!otp) {
      return error('Please Enter OTP', res);
    }
    // 2) jo ham na otp likhi aur jo database ma ha wo same honi chaiya
    const existotp = await user.findOne({ otp });
    if (!existotp) {
      return warning('Wrong OTP', res);
    }
    const token = nanoid(32);
    existotp.resetToken = token;
    existotp.otp = '';
    await existotp.save();
    success({ message: 'Reset Your Password', token }, res);
  } catch (err: any) {
    catchErr(err, res);
  }
};

interface resetPasswordBody {
  password: string;
  confirm_password: string;
}
const resetPassword = async (req: Request, res: Response) => {
  try {
    // 🛡️ [COMMENT]: Zod Validation
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return warning('Invalid password inputs', res);
    }

    const { password, confirm_password } = req.body as resetPasswordBody;

    if (!password || !confirm_password) {
      return error('Both fields are required', res);
    }
    if (!pvalidator.validate(password)) {
      return warning(
        'Password must be 8 to 30 digits,should have 1 uppercase letter,1lowercase letter,and should have 2 digits',
        res
      );
    }
    if (password != confirm_password) {
      return warning('Password and confirm password must be matched', res);
    }

    const salt: string = await bcryptjs.genSalt(12);
    const hashpassword: string = await bcryptjs.hash(password, salt);
    await user.findOneAndUpdate(
      { resetToken: req.params.token },
      { password: hashpassword },
      { new: true }
    );

    success('Your password has been changed', res);
  } catch (err: any) {
    catchErr(err, res);
  }
};

const showallusers = async (req: Request, res: Response) => {
  const users = await user.find();
  const length = users.length;

  try {
    if (length == 0) {
      return res.json({
        display: 'No User',
      });
    }
    {
      res.json({
        display: `we have ${length} users `,
        users: users,
      });
    }
  } catch (err: any) {
    catchErr(err, res);
  }
};

const deleteuser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await user.findByIdAndDelete(id);
    res.json({
      Message: 'User deleted successfully',
    });
  } catch (err: any) {
    return res.json({
      error: err.message,
    });
  }
};

const userblocked = async (req: Request, res: Response) => {
  try {
    const uid = req.params.id;

    // Pehle current status fetch karo
    const existingUser = await user.findById({ _id: uid });
    console.log(existingUser);
    if (!existingUser) {
      return res.json({ error: 'User not found' });
    }

    // Ab toggle karo
    await user.findByIdAndUpdate(
      { _id: uid },
      { isblocked: !existingUser.isblocked },
      { new: true }
    );

    res.json({ success: 'Status Updated Successfully' });
  } catch (err: any) {
    return res.json({ error: err.message });
  }
};

const getprofile = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string

    const loggedInId = (req as any).user?.id?.toString();
    if (loggedInId !== id) return error('Unauthorized', res);

    const foundUser = await user.findById(id).select('-password -otp -resetToken');
    if (!foundUser) return error('User not found', res);

    return res.status(200).json({ user: foundUser });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

interface updateprofile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string
}

const updateprofile = async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, email, phone, address } = req.body as updateprofile;
    const files = req.files as Express.Multer.File[];
    const id = req.params.id as string;

    if (!id) return error('User ID is required', res);
    if (!first_name || !last_name || !email || !phone || !address) return error('All fields are required', res);
    if (!evalidator.validate(email)) return warning('Email is not valid', res);

    const loggedInId = (req as any).user?.id?.toString();
    const paramsId = id?.toString();
    if (loggedInId !== paramsId) return error('Unauthorized action', res);

    const cleanFirstName = sanitizeHtml(first_name, { allowedTags: [], allowedAttributes: {} });
    const cleanLastName = sanitizeHtml(last_name, { allowedTags: [], allowedAttributes: {} });
    const cleanaddress = sanitizeHtml(address, { allowedTags: [], allowedAttributes: {} });

    const updateData: any = {
      first_name: cleanFirstName,
      last_name: cleanLastName,
      email,
      phonenumber: phone,
      address: cleanaddress,
    };

    // ✅ Fix 1: BASE_URL .env se lo
    if (files && files.length > 0) {
      const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
      updateData.profilepicture = `${BASE_URL}/uploads/${files[0].filename}`;
    }

    // ✅ Fix 2: $set use karo — sirf yahi fields update hongi, baaki safe rahengi
    const updatedUser = await user.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }  // ✅ Fix 3: returnDocument ki jagah new:true — Mongoose ka sahi syntax
    );

    if (!updatedUser) return error('User not found', res);

    return res.status(200).json({
      success: 'Your profile has been updated',
      user: updatedUser
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export {
  preSignup,
  signup,
  login,
  forgetPassword,
  otp,
  resetPassword,
  showallusers,
  userblocked,
  getprofile,
  deleteuser,
  updateprofile
};