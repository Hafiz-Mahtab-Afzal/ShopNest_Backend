
import { model, Schema,Document } from 'mongoose';

interface UserType extends Document {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  signUpWithGoogle: boolean;
  username: string;
  isadmin: boolean;
  isblocked: boolean;
  isbuyer: string;
  profilepicture: string;
  role: string;
  otp: string;
  resetToken: string;
  address: string;
  city: string;
  state: string;
  countrypostalcode: string;
}

const userSchema = new Schema({
  first_name: {
    type: String,
    required: true,
  },
  last_name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  signUpWithGoogle:{
    type: Boolean,
    default: false
  },
  username: {
    type: String,
    default: '',
  },
  isadmin: {
    type: Boolean,
    default: false,
  },
  isblocked: {
    type: Boolean,
    default: false,
  },
  isbuyer: {
    type: String,
    default: '',
  },
  profilepicture: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    default: 'buyer',
  },
  otp: {},
  resetToken: {
    type: String,
  },
  // user details
  address: {
    type: String,
    default: 'dummy.....',
  },
  city: {
    type: String,
    default: 'dummy....',
  },
  countrypostalcode: {
    type: String,
    default: 'dummy.....',
  },
  gender: {
    type: String,
    default: 'dummy.....',
  },
  dob: {
    type: String,
    default: 'dummy.....',
  },
  phonenumber: {
    type: Number,
    default: '',
  },
},{ timestamps: true });

const user = model<UserType>('users', userSchema);
export default user;
