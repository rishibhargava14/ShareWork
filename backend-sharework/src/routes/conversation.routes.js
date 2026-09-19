import { Router } from 'express';
import {
  approveAgreement,
  createAgreement,
  createConversation,
  listConversations,
  listMessages,
  rejectAgreement,
  sendMessage,
} from '../controllers/conversation.controller.js';
import { antiLeakage } from '../middlewares/antiLeakage.js';
import { authenticate } from '../middlewares/auth.js';
import { role } from '../middlewares/role.js';
import { agreementRateLimiter, messageRateLimiter } from '../middlewares/trafficRateLimit.js';
import { uploadChatAttachment } from '../middlewares/upload.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js';
import {
  agreementParamsSchema,
  conversationIdParamSchema,
  createAgreementSchema,
  createConversationSchema,
  listMessagesQuerySchema,
  rejectAgreementSchema,
  sendMessageSchema,
} from '../validations/conversation.validation.js';

const router = Router();

router.use(authenticate);

router.get('/', listConversations);
router.post('/', validateBody(createConversationSchema), createConversation);

router.get(
  '/:id/messages',
  validateParams(conversationIdParamSchema),
  validateQuery(listMessagesQuerySchema),
  listMessages,
);
router.post(
  '/:id/messages',
  validateParams(conversationIdParamSchema),
  messageRateLimiter,
  uploadChatAttachment,
  validateBody(sendMessageSchema),
  antiLeakage,
  sendMessage,
);

router.post(
  '/:id/agreement',
  validateParams(conversationIdParamSchema),
  role('provider'),
  agreementRateLimiter,
  validateBody(createAgreementSchema),
  createAgreement,
);
router.post(
  '/:id/agreement/:agreementId/approve',
  validateParams(agreementParamsSchema),
  role('customer'),
  approveAgreement,
);
router.post(
  '/:id/agreement/:agreementId/reject',
  validateParams(agreementParamsSchema),
  role('customer'),
  validateBody(rejectAgreementSchema),
  rejectAgreement,
);

export default router;
