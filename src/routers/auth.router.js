import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middlewares/require-access-token.middleware.js';
import { authenticateRefreshToken } from '../middlewares/require-refresh-token.middleware.js';

const router = express.Router();
const prisma = new PrismaClient();


// 내 정보 조회 API
router.get('/users', authenticateToken, (req, res) => {
  const { userId, email, name, role, createdAt, updatedAt } = req.user;
  res.status(200).json({
    userId,
    email,
    name,
    role,
    createdAt,
    updatedAt,
  });
});


router.get('/users/refresh', authenticateRefreshToken, (req, res) => {
  const { userId, email, name, role, createdAt, updatedAt } = req.user;
  res.status(200).json({
    userId,
    email,
    name,
    role,
    createdAt,
    updatedAt,
  });
});


export default router;