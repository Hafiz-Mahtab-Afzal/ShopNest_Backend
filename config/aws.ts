import dotenv from "dotenv";
dotenv.config(); // top pe

import SES from 'aws-sdk/clients/ses.js'
import S3 from 'aws-sdk/clients/s3.js'


const awsConfig = {
  accessKeyId:process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY_ID,
  region:process.env.AWS_REGION,
  version:process.env.AWS_VERSION
}

export const AWS_SES = new SES(awsConfig)
export const AWSS3 = new S3(awsConfig)

export const CLIENT_URL = process.env.CLIENT_URL

