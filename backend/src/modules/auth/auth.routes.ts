import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { loginLimiter } from '../../middleware/rateLimit.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { loginHandler, logoutHandler } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', loginLimiter, asyncHandler(loginHandler));
authRouter.post('/logout', verifyToken, asyncHandler(logoutHandler));
