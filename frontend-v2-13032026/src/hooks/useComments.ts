import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsService } from '@/lib/api/comments.service';
import type { CreateCommentRequest, VoteRequest } from '@/lib/api/types/api';
import { queryKeys } from '@/lib/queryKeys';

export function useComments(marketId: string, limit?: number, offset?: number) {
  return useQuery({
    queryKey: queryKeys.comments.byMarketList(marketId, { limit, offset }),
    queryFn: async () => {
      const { data } = await commentsService.listByMarket(marketId, { limit, offset });
      return data;
    },
    enabled: !!marketId,
  });
}

export function useCommentReplies(commentId: string, limit?: number, offset?: number) {
  return useQuery({
    queryKey: queryKeys.comments.repliesList(commentId, { limit, offset }),
    queryFn: async () => {
      const { data } = await commentsService.listReplies(commentId, { limit, offset });
      return data;
    },
    enabled: !!commentId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ marketId, data }: { marketId: string; data: CreateCommentRequest }) =>
      commentsService.create(marketId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byMarket(variables.marketId) });
    },
  });
}

export function useReplyComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: CreateCommentRequest }) =>
      commentsService.createReply(commentId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.replies(variables.commentId) });
      // Might also need to invalidate the parent market's comments to update reply counts if added
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: CreateCommentRequest }) =>
      commentsService.update(commentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => commentsService.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });
}

export function useVoteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: VoteRequest }) =>
      commentsService.vote(commentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.all });
    },
  });
}
