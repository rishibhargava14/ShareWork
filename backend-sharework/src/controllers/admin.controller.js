import { HTTP_STATUS } from '../constants/httpStatus.js';
import * as adminService from '../services/admin.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getStats = asyncHandler(async (_req, res) => {
  const result = await adminService.getStats();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const result = await adminService.listUsers(req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const getUser = asyncHandler(async (req, res) => {
  const result = await adminService.getUser(req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const listProjects = asyncHandler(async (req, res) => {
  const result = await adminService.listProjects(req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const getProject = asyncHandler(async (req, res) => {
  const result = await adminService.getProject(req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const listEscrows = asyncHandler(async (_req, res) => {
  const result = await adminService.listEscrows();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const listTransactions = asyncHandler(async (req, res) => {
  const result = await adminService.listTransactions(req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const listWithdrawals = asyncHandler(async (req, res) => {
  const result = await adminService.listWithdrawals(req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const listLeakageLogs = asyncHandler(async (_req, res) => {
  const result = await adminService.listLeakageLogs();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const listDisputes = asyncHandler(async (req, res) => {
  const result = await adminService.listDisputes(req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const listCategories = asyncHandler(async (_req, res) => {
  const result = await adminService.listCategories();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const result = await adminService.createCategory(req.body, req.user);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    ...result,
  });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const result = await adminService.updateCategory(req.params.id, req.body, req.user);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const result = await adminService.deleteCategory(req.params.id, req.user);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const getSettings = asyncHandler(async (_req, res) => {
  const result = await adminService.getSettings();

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const result = await adminService.updateSettings(req.body, req.user);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const resolveDispute = asyncHandler(async (req, res) => {
  const result = await adminService.resolveDispute(req.params.id, req.body, req.user);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const forceReleaseProject = asyncHandler(async (req, res) => {
  const result = await adminService.forceReleaseProject(req.params.id, req.user);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const setUserBanStatus = asyncHandler(async (req, res) => {
  const result = await adminService.setUserBanStatus(req.params.id, req.body, req.user);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const result = await adminService.listAdminAuditLogs(req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});
