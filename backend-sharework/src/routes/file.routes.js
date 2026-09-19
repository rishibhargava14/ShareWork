import { Router } from 'express';
import { downloadFile } from '../controllers/file.controller.js';
import { optionalAuthenticate } from '../middlewares/auth.js';
import { validateParams } from '../middlewares/validate.js';
import { idParamSchema } from '../validations/user.validation.js';

const router = Router();

router.get('/:id', optionalAuthenticate, validateParams(idParamSchema), downloadFile);

export default router;
