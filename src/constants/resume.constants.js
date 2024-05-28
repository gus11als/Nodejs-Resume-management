import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
export const RESUME_ROUTES = {
  CREATE: '/resume',
  LIST: '/resumes',
  DETAILS: '/resumes/:userResumeId',
  UPDATE: '/resumes/:userResumeId',
  DELETE: '/resumes/:userResumeId',
  UPDATE_STATUS: '/resumes/:resumeId/status',
  LOGS: '/resumes/:resumeId/logs'
};

export const REQUIRED_FIELDS = ['title', 'introduction'];
export const MIN_INTRODUCTION_LENGTH = 150;
export const VALID_STATUSES = ['APPLY', 'DROP', 'PASS', 'INTERVIEW1', 'INTERVIEW2', 'FINAL_PASS'];
export const SORT_OPTIONS = ['ASC', 'DESC'];
