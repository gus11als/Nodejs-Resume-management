import express from "express";
import { prisma } from "../utils/prisma.util.js";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { REQUIRED_FIELDS_SIGNUP, REQUIRED_FIELDS_SIGNIN, EMAIL_REGEX, PASSWORD_MIN_LENGTH } from '../constants/users.constants.js';
import { authenticateRefreshToken } from '../middlewares/require-refresh-token.middleware.js';

dotenv.config();

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET;
const jwtRefresh = process.env.JWT_REFRESH;
const saltRounds = parseInt(process.env.SALT_ROUNDS, 10);

// 회원가입 API
router.post("/sign-up", async (req, res, next) => {
  try {
    const { email, password, confirmPassword, name } = req.body;

    // 유효성 검증
    const missingFields = REQUIRED_FIELDS_SIGNUP.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({ message: `${missingFields.join(", ")} 를 입력해주세요` });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "이메일 형식이 옳바르지 않습니다." });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ message: `비밀번호는 ${PASSWORD_MIN_LENGTH}자리 이상이어야 합니다.` });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "입력한 두 비밀번호가 일치하지 않습니다." });
    }

    // 이메일 중복 확인
    const existingUser = await prisma.users.findFirst({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "이미 가입된 사용자입니다." });
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 사용자 생성
    const newUser = await prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    res.status(201).json({
      status: 201,
      message: "회원가입에 성공했습니다.",
      data: {
        id: newUser.userId,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      },
    });
  } catch (err) {
    next(err); // 에러 핸들러로 에러 전달
  }
});

// 로그인 API
router.post('/sign-in', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 유효성 검증
    const missingFields = REQUIRED_FIELDS_SIGNIN.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({ message: `${missingFields.join(', ')} 를 입력해주세요` });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: '이메일 형식이 올바르지 않습니다.' });
    }

    // 사용자 조회
    const user = await prisma.users.findFirst({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: '존재하지 않는 이메일입니다.' });
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    }

    // 액세스 토큰 생성
    const accessToken = jwt.sign({ userId: user.userId }, jwtSecret, { expiresIn: '12h' });
    const refreshToken = jwt.sign({ userId: user.userId }, jwtRefresh, { expiresIn: '7d' });

    // 리프레시 토큰 해싱 및 저장
    const hashedRefreshToken = await bcrypt.hash(refreshToken, saltRounds);

    const existingToken = await prisma.refreshToken.findFirst({
      where: { userId: user.userId },
    });

    if (existingToken) {
      await prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { token: hashedRefreshToken },
      });
    } else {
      await prisma.refreshToken.create({
        data: {
          userId: user.userId,
          token: hashedRefreshToken,
        },
      });
    }

    res.status(200).json({
      status: 200,
      message: '로그인에 성공했습니다.',
      data: {
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err); // 에러 핸들러로 에러 전달
  }
});

// 토큰 재발급 API
router.post('/token', authenticateRefreshToken, async (req, res, next) => {
  try {
    const user = req.user;

    // 새로운 AccessToken 생성
    const newAccessToken = jwt.sign({ userId: user.userId }, jwtSecret, { expiresIn: '12h' });
    // 새로운 RefreshToken 생성
    const newRefreshToken = jwt.sign({ userId: user.userId }, jwtRefresh, { expiresIn: '7d' });

    // 새로운 RefreshToken 해싱
    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, saltRounds);

    // 기존 RefreshToken 찾기
    const existingToken = await prisma.refreshToken.findFirst({
      where: { userId: user.userId },
    });

    if (existingToken) {
      await prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { token: hashedNewRefreshToken },
      });
    } else {
      await prisma.refreshToken.create({
        data: {
          userId: user.userId,
          token: hashedNewRefreshToken,
        },
      });
    }

    res.status(200).json({
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (err) {
    next(err); // 에러 핸들러로 에러 전달
  }
});

// 로그아웃 API
router.post('/logout', authenticateRefreshToken, async (req, res, next) => {
  try {
    const user = req.user;

    // DB에서 RefreshToken 삭제
    await prisma.refreshToken.deleteMany({
      where: { userId: user.userId },
    });

    res.status(200).json({
      message: '성공적으로 로그아웃되었습니다.',
      data: {
        userId: user.userId,
      },
    });
  } catch (err) {
    next(err); // 에러 핸들러로 에러 전달
  }
});

export default router;
