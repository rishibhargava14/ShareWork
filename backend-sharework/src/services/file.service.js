import { HTTP_STATUS } from '../constants/httpStatus.js';
import Conversation from '../models/Conversation.js';
import Project from '../models/Project.js';
import StoredFile from '../models/StoredFile.js';
import { AppError } from '../utils/AppError.js';
import { downloadFileBuffer, uploadFiles } from './storage.service.js';

export const toPublicFileRef = (item) => {
  if (!item || typeof item === 'string') {
    return null;
  }

  const fileId = item.fileId ?? item._id ?? item.id;
  if (!fileId) {
    return null;
  }

  return {
    id: String(fileId),
    originalName: item.originalName ?? 'file',
    mimeType: item.mimeType ?? 'application/octet-stream',
    size: Number(item.size || 0),
    url: `/api/files/${fileId}`,
  };
};

export const persistUploads = async ({
  files = [],
  ownerId,
  kind,
  projectId,
  conversationId,
  gigId,
}) => {
  if (!files.length) {
    return [];
  }

  const uploaded = await uploadFiles(files, { prefix: kind, ownerId });
  const docs = await StoredFile.create(
    uploaded.map((item) => ({
      ownerId,
      kind,
      projectId,
      conversationId,
      gigId,
      originalName: item.originalName,
      storageKey: item.storageKey,
      mimeType: item.mimeType,
      size: item.size,
    })),
  );

  return docs.map((doc) => ({
    fileId: doc._id,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    size: doc.size,
  }));
};

const isParticipant = (ids, userId) =>
  (ids || []).some((id) => String(id?._id ?? id) === String(userId));

export const authorizeStoredFile = async (file, user) => {
  if (!file) {
    throw new AppError('File not found', HTTP_STATUS.NOT_FOUND);
  }

  if (file.kind === 'portfolio') {
    return file;
  }

  if (!user?.id) {
    throw new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED);
  }

  if (String(file.ownerId) === String(user.id)) {
    return file;
  }

  if (file.kind === 'deliverable') {
    const project = await Project.findById(file.projectId).select('customerId providerId');
    if (
      project &&
      (String(project.customerId) === String(user.id) || String(project.providerId) === String(user.id))
    ) {
      return file;
    }
  }

  if (file.kind === 'attachment') {
    const conversation = await Conversation.findById(file.conversationId).select('participants');
    if (conversation && isParticipant(conversation.participants, user.id)) {
      return file;
    }
  }

  throw new AppError('Forbidden', HTTP_STATUS.FORBIDDEN);
};

export const loadAuthorizedFile = async (fileId, user) => {
  const file = await StoredFile.findById(fileId);
  if (!file) {
    throw new AppError('File not found', HTTP_STATUS.NOT_FOUND);
  }

  await authorizeStoredFile(file, user);
  const buffer = await downloadFileBuffer(file.storageKey);
  return { file, buffer };
};
