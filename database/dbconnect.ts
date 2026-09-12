import mongoose from 'mongoose'

const dbconnect = () => {

   mongoose.connect(process.env.MONGODB_CLOUD_UI as string, {
     maxPoolSize: 100
   })
   .then(_ => console.log(`mongodb connected with express `))
   .catch(err => console.log(`Db connection failed ... ${err.message}`))

}

export default dbconnect;