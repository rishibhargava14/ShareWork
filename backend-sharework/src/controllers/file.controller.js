import { HTTP_STATUS } from '../constants/httpStatus.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loadAuthorizedFile } from '../services/file.service.js';

const contentDisposition = (file) => {
  const safe = String(file.originalName || 'file').replace(/[\r\n"]/g, '_');
  const inline = String(file.mimeType || '').startsWith('image/');
  return `${inline ? 'inline' : 'attachment'}; filename="${safe}"`;
};

export const downloadFile = asyncHandler(async (req, res) => {
  const { file, buffer } = await loadAuthorizedFile(req.params.id, req.user);

  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Content-Disposition', contentDisposition(file));
  res.status(HTTP_STATUS.OK).send(buffer);
});
