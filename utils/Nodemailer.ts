import nodemailer from 'nodemailer';

// ✅ Sirf transporter banani hai aur export karni hai — email yahan se nahi bhejni
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SENDER_EMAIL as string,
    pass: process.env.SENDER_PASSWORD as string,
  },
});