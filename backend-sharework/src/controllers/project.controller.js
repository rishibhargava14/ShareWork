import { HTTP_STATUS } from '../constants/httpStatus.js';
import * as projectService from '../services/project.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listProjects = asyncHandler(async (req, res) => {
  const result = await projectService.listProjects(req.user.id, req.query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const getProject = asyncHandler(async (req, res) => {
  const result = await projectService.getProject(req.user.id, req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const fundProject = asyncHandler(async (req, res) => {
  const result = await projectService.fundProject(req.user.id, req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const submitDeliverable = asyncHandler(async (req, res) => {
  const result = await projectService.submitDeliverable(
    req.user.id,
    req.params.id,
    req.body,
    req.files,
  );

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const approveDeliverable = asyncHandler(async (req, res) => {
  const result = await projectService.approveDeliverable(req.user.id, req.params.id);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const requestRevision = asyncHandler(async (req, res) => {
  const result = await projectService.requestRevision(req.user.id, req.params.id, req.body);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    ...result,
  });
});

export const createDispute = asyncHandler(async (req, res) => {
  const result = await projectService.createDispute(req.user.id, req.params.id, req.body);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    ...result,
  });
});

export const createReview = asyncHandler(async (req, res) => {
  const result = await projectService.createReview(req.user.id, req.params.id, req.body);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    ...result,
  });
});
