import { setFileDownloader, setFileUploader, resetFileHandlers } from '../../src/services/storage.service.js';

const memory = new Map();

export const installMemoryStorage = () => {
  memory.clear();
  setFileUploader(async (files) =>
    files.map((file) => {
      const originalName = file.originalname || 'file';
      const storageKey = `sharework/test/${Date.now()}-${Math.random().toString(16).slice(2)}-${originalName}`;
      const buffer = file.buffer || Buffer.from([]);
      memory.set(storageKey, buffer);
      return {
        storageKey,
        originalName,
        mimeType: file.mimetype || 'application/octet-stream',
        size: Number(file.size || buffer.length || 0),
      };
    }),
  );
  setFileDownloader(async (storageKey) => {
    if (!memory.has(storageKey)) {
      throw new Error('missing test object');
    }
    return memory.get(storageKey);
  });
};

export const uninstallMemoryStorage = () => {
  memory.clear();
  resetFileHandlers();
};
