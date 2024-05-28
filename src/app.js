import 'dotenv/config'
import express from 'express';
import resumesRouter from './routers/resumes.router.js'; // 이력서 라우터 임포트
import { errorHandler } from './middlewares/error-handler.middleware.js'
import cookieParser from 'cookie-parser';
import usersRouter from './routers/users.router.js';
import accestoken from './routers/auth.router.js';


const app = express();
const PORT = 3018;

app.use(express.json());
app.use(cookieParser());

app.use('/api', [usersRouter,accestoken,resumesRouter]);
app.use(errorHandler);


app.listen(PORT, () => {
    console.log(PORT, '포트로 서버가 열렸어요!');
  });