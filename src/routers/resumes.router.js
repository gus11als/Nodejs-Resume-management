import express from 'express';
import { authenticateToken } from '../middlewares/require-access-token.middleware.js';
import { requireRoles } from '../middlewares/require-roles.middleware.js';
import { prisma, RESUME_ROUTES, REQUIRED_FIELDS, MIN_INTRODUCTION_LENGTH, VALID_STATUSES, SORT_OPTIONS } from '../constants/resume.constants.js';

const router = express.Router();

// 이력서 생성 API
router.post(RESUME_ROUTES.CREATE, authenticateToken, async (req, res, next) => {
  try {
    const { title, introduction } = req.body;
    const { userId } = req.user;

    // 유효성 검증
    const missingFields = REQUIRED_FIELDS.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({ message: `${missingFields.join(", ")} 를 입력해주세요` });
    }

    if (introduction.length < MIN_INTRODUCTION_LENGTH) {
      return res.status(400).json({ message: `자기소개는 ${MIN_INTRODUCTION_LENGTH}자 이상 작성해야 합니다.` });
    }

    // 현재 사용자의 최대 userResumeId 값을 찾음
    const maxUserResume = await prisma.resume.findFirst({
      where: { userId },
      orderBy: { userResumeId: 'desc' },
      select: { userResumeId: true }
    });

    const newUserResumeId = maxUserResume ? maxUserResume.userResumeId + 1 : 1;

    // 이력서 생성
    const newResume = await prisma.resume.create({
      data: {
        userId,
        userResumeId: newUserResumeId,
        title,
        introduction,
      },
    });

    res.status(201).json({
      userResumeId: newResume.userResumeId,
      userId: newResume.userId,
      title: newResume.title,
      introduction: newResume.introduction,
      status: newResume.status,
      createdAt: newResume.createdAt,
      updatedAt: newResume.updatedAt,
    });
  } catch (err) {
    next(err); // 에러 핸들러로 에러 전달
  }
});

// 이력서 목록 조회 API
router.get(RESUME_ROUTES.LIST, authenticateToken, async (req, res, next) => {
  try {
    const { userId, role } = req.user;
    const sort = req.query.sort ? req.query.sort.toUpperCase() : 'DESC';
    const status = req.query.status ? req.query.status.toUpperCase() : undefined;

    if (!SORT_OPTIONS.includes(sort)) {
      return res.status(400).json({ message: '정렬 조건이 올바르지 않습니다. ASC 또는 DESC를 사용하세요.' });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: '지원 상태 조건이 올바르지 않습니다.' });
    }

    // 필터 조건 설정
    const filterCondition = {
      ...(role !== 'RECRUITER' ? { userId } : {}),
      ...(status ? { status } : {}),
    };

    const resumes = await prisma.resume.findMany({
      where: filterCondition,
      orderBy: { createdAt: sort.toLowerCase() },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    const response = resumes.map(resume => ({
      userResumeId: resume.userResumeId,
      name: resume.user.name,
      title: resume.title,
      introduction: resume.introduction,
      status: resume.status,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    }));

    res.status(200).json(response);
  } catch (err) {
    next(err); // 에러 핸들러로 에러 전달
  }
});

// 이력서 상세조회 API
router.get(RESUME_ROUTES.DETAILS, authenticateToken, async (req, res, next) => {
  try {
    const { userId, role } = req.user;
    const { userResumeId } = req.params;

    // 역할에 따라 where 조건 설정
    let whereCondition;
    if (role === 'RECRUITER') {
      whereCondition = { resumeId: Number(userResumeId) }; // RECRUITER는 resumeId로 조회
    } else {
      whereCondition = { userResumeId: Number(userResumeId), userId }; // 일반 사용자는 userResumeId와 userId로 조회
    }

    const resume = await prisma.resume.findFirst({
      where: whereCondition,
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!resume) {
      return res.status(404).json({ message: '이력서가 존재하지 않습니다.' });
    }

    res.status(200).json({
      resumeId: resume.resumeId,
      userResumeId: resume.userResumeId,
      name: resume.user.name,
      title: resume.title,
      introduction: resume.introduction,
      status: resume.status,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    });
  } catch (err) {
    next(err); // 에러 핸들러로 에러 전달
  }
});

// 이력서 수정 API
router.patch(RESUME_ROUTES.UPDATE, authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { userResumeId } = req.params;
    const { title, introduction } = req.body;

    // 유효성 검증: title이나 introduction 중 하나라도 존재해야 함
    if (!title && !introduction) {
      return res.status(400).json({ message: '수정 할 정보를 입력해 주세요.' });
    }
    if (introduction.length < MIN_INTRODUCTION_LENGTH) {
      return res.status(400).json({ message: `자기소개는 ${MIN_INTRODUCTION_LENGTH}자 이상 작성해야 합니다.` });
    }

    // userResumeId를 통해 resumeId 조회
    const resume = await prisma.resume.findFirst({
      where: {
        userResumeId: Number(userResumeId),
        userId,
      },
    });

    if (!resume) {
      return res.status(404).json({ message: '이력서가 존재하지 않습니다.' });
    }

    // 업데이트할 데이터 구성
    const dataToUpdate = {};
    if (title) dataToUpdate.title = title;
    if (introduction) dataToUpdate.introduction = introduction;

    // 이력서 수정
    const updatedResume = await prisma.resume.update({
      where: {
        resumeId: resume.resumeId, // 조회된 resumeId 사용
      },
      data: dataToUpdate,
    });

    res.status(200).json({
      userResumeId: updatedResume.userResumeId,
      userId: updatedResume.userId,
      title: updatedResume.title,
      introduction: updatedResume.introduction,
      status: updatedResume.status,
      createdAt: updatedResume.createdAt,
      updatedAt: updatedResume.updatedAt,
    });
  } catch (err) {
    next(err); // 에러 핸들러로 에러 전달
  }
});

// 이력서 삭제 API
router.delete(RESUME_ROUTES.DELETE, authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { userResumeId } = req.params;

    // 이력서 존재 확인
    const resume = await prisma.resume.findFirst({
      where: {
        userResumeId: Number(userResumeId),
        userId,
      },
    });

    if (!resume) {
      return res.status(404).json({ message: '이력서가 존재하지 않습니다.' });
    }

    // 이력서 삭제
    await prisma.resume.delete({
      where: {
        resumeId: resume.resumeId, // 고유 식별자인 resumeId 사용
      },
    });

    res.status(200).json({
      message: '이력서가 삭제되었습니다.',
      userResumeId: resume.userResumeId,
    });
  } catch (err) {
    next(err); // 에러 핸들러로 에러 전달
  }
});

// 이력서 지원상태 변경 API
router.patch(RESUME_ROUTES.UPDATE_STATUS, authenticateToken, requireRoles(['RECRUITER']), async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { resumeId } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({ message: '변경하고자 하는 지원 상태를 입력해 주세요.' });
    }

    if (!reason) {
      return res.status(400).json({ message: '지원 상태 변경 사유를 입력해 주세요.' });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: '유효하지 않은 지원 상태입니다.' });
    }

    const resume = await prisma.resume.findUnique({
      where: { resumeId: Number(resumeId) },
    });

    if (!resume) {
      return res.status(404).json({ message: '이력서가 존재하지 않습니다.' });
    }

    const previousStatus = resume.status;

    const [updatedResume, resumeLog] = await prisma.$transaction([
      prisma.resume.update({
        where: { resumeId: Number(resumeId) },
        data: { status },
      }),
      prisma.resumeLog.create({
        data: {
          resumeId: Number(resumeId),
          recruiterId: userId,
          previousStatus,
          newStatus: status,
          reason,
        },
      }),
    ]);

    res.status(200).json({
      resumeLogId: resumeLog.resumeLogId,
      recruiterId: resumeLog.recruiterId,
      resumeId: resumeLog.resumeId,
      previousStatus: resumeLog.previousStatus,
      newStatus: resumeLog.newStatus,
      reason: resumeLog.reason,
      createdAt: resumeLog.createdAt,
    });
  } catch (err) {
    next(err); // 에러 핸들러로 에러 전달
  }
});

// 이력서 로그 목록 조회 API
router.get(RESUME_ROUTES.LOGS, authenticateToken, requireRoles(['RECRUITER']), async (req, res, next) => {
  try {
    const { resumeId } = req.params;

    const logs = await prisma.resumeLog.findMany({
      where: { resumeId: Number(resumeId) },
      orderBy: { createdAt: 'desc' },
      include: {
        recruiter: {
          select: {
            name: true,
          },
        },
      },
    });

    const response = logs.map(log => ({
      resumeLogId: log.resumeLogId,
      recruiterName: log.recruiter.name,
      resumeId: log.resumeId,
      previousStatus: log.previousStatus,
      newStatus: log.newStatus,
      reason: log.reason,
      createdAt: log.createdAt,
    }));

    res.status(200).json(response);
  } catch (err) {
    next(err); // 에러 핸들러로 에러 전달
  }
});

export default router;
