import 'dotenv/config';
import users from './routes/user.routes';
import reviewRoutes from './routes/review.routes';
import products from './routes/product.routes';
import router from './routes/order.routes';
import express, { Request, Response } from 'express';
import chatRoutes from './routes/chat.routes';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dbconnect from './database/dbconnect';
import path from 'node:path';
import radisconnect from './database/redisconnect';
import './controllers/queues/notificationWorker'; // worker ko import karna zaruri hai taake wo start ho jaye

// initialize express (2)
const app = express();

// it will allow browser from server to request api
app.use(cors({
  origin: ["http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Cookie parser middleware
app.use(cookieParser());

// important middleware allow incoming json data (3)
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, './public/uploads')));

// 🔴 FIX: Yeh line add ki hai taake form-data/urlencoded fields parsing sahi se ho
app.use(express.urlencoded({ extended: true })); 

app.use(morgan('dev'));

// test route (4)
app.get('/', (req: Request, res: Response) => {
  res.json('API is running');
});

// creating middleware (6)
app.use('/api/v1/users', users);
app.use('/api/v1/products', products);
app.use('/api/v1/orders', router);
app.use('/api/chat', chatRoutes);
app.use('/api/v1/reviews', reviewRoutes);


// ✅ DB connection server start hone se pehle execute hona chahiye
dbconnect();

// start express server  (5)
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`server is running on http://localhost:${port}`);
});