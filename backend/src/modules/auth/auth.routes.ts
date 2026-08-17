import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { loginHandler, logoutHandler } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/login', asyncHandler(loginHandler));
authRouter.post('/logout', verifyToken, asyncHandler(logoutHandler));
