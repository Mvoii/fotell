import { apiRequest } from './client';
import type { 
  Comment, 
  CommentsListResponse, 
  CreateCommentRequest, 
  VoteRequest 
} from './types/api';

export const commentsService = {
  /** List top-level comments for a market */
  listByMarket: (marketId: string, params?: { limit?: number; offset?: number }) =>
    apiRequest<CommentsListResponse>(`/markets/${marketId}/comments`, {
      method: 'GET',
      params,
    }),

  /** Create a top-level comment on a market */
  create: (marketId: string, data: CreateCommentRequest) =>
    apiRequest<Comment>(`/markets/${marketId}/comments`, {
      method: 'POST',
      body: data,
    }),

  /** List replies to a specific comment */
  listReplies: (commentId: string, params?: { limit?: number; offset?: number }) =>
    apiRequest<CommentsListResponse>(`/comments/${commentId}/replies`, {
      method: 'GET',
      params,
    }),

  /** Reply to a comment */
  createReply: (commentId: string, data: CreateCommentRequest) =>
    apiRequest<Comment>(`/comments/${commentId}/replies`, {
      method: 'POST',
      body: data,
    }),

  /** Update an existing comment */
  update: (commentId: string, data: CreateCommentRequest) =>
    apiRequest<Comment>(`/comments/${commentId}`, {
      method: 'PATCH',
      body: data,
    }),

  /** Delete a comment (soft delete) */
  delete: (commentId: string) =>
    apiRequest<{ message: string }>(`/comments/${commentId}`, {
      method: 'DELETE',
    }),

  /** Vote on a comment */
  vote: (commentId: string, data: VoteRequest) =>
    apiRequest<{ message: string; vote_count: number }>(`/comments/${commentId}/vote`, {
      method: 'POST',
      body: data,
    }),
};
