import React, { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { useComments, useCommentReplies, useCreateComment, useReplyComment, useVoteComment, useDeleteComment } from '@/hooks/useComments';
import type { Comment } from '@/lib/api/types/api';
import { Button } from '@/components/ui/button';


interface CommentsSectionProps {
  marketId: string;
}

export function CommentsSection({ marketId }: CommentsSectionProps) {
  const { data: user } = useUser();
  const isAuthenticated = !!user;
  const { data, isLoading, isError } = useComments(marketId);
  const createComment = useCreateComment();
  const [newComment, setNewComment] = useState('');

  const handlePostComment = () => {
    if (!newComment.trim()) return;
    createComment.mutate(
      { marketId, data: { content: newComment } },
      {
        onSuccess: () => setNewComment(''),
      }
    );
  };

  if (isLoading) return <div className="p-4 text-center text-muted">Loading comments...</div>;
  if (isError) return <div className="p-4 text-center text-error">Failed to load comments</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-heading-md text-primary font-semibold border-b border-subtle pb-2">Comments</h3>

      {/* Post Comment Box */}
      <div className="bg-surface border border-subtle p-4 rounded-lg">
        {!isAuthenticated ? (
          <div className="text-center py-4">
            <p className="text-muted mb-4">Log in to participate in the discussion</p>
            <Button variant="outline" onClick={() => window.location.href = '/auth/login'}>Log In</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              placeholder="What are your thoughts on this market?"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full bg-base border border-subtle rounded-md p-3 text-primary placeholder:text-muted focus:ring-1 focus:ring-accent-blue outline-none resize-y"
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                variant="default"
                onClick={handlePostComment}
                disabled={!newComment.trim() || createComment.isPending}
              >
                {createComment.isPending ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {data?.comments && data.comments.length > 0 ? (
          data.comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} currentUserId={user?.id} />
          ))
        ) : (
          <p className="text-center text-muted py-6">No comments yet. Be the first to share your thoughts!</p>
        )}
      </div>
    </div>
  );
}

// Subcomponent for individual comment
function CommentItem({ comment, currentUserId }: { comment: Comment; currentUserId?: string }) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showReplies, setShowReplies] = useState(false);

  const voteComment = useVoteComment();
  const deleteComment = useDeleteComment();
  const replyMutation = useReplyComment();
  const { data: repliesData } = useCommentReplies(comment.id, undefined, undefined);

  const isOwnComment = currentUserId === comment.user_id;

  const handleVote = (voteType: 'UPVOTE' | 'DOWNVOTE') => {
    // If clicking the same vote type, untoggle by sending NONE (assumed API behavior)
    const newVote = comment.current_user_vote === voteType ? 'NONE' : voteType;
    // We send UPVOTE or DOWNVOTE based on the API spec. If it only accepts UPVOTE/DOWNVOTE, we might not be able to untoggle.
    // Assuming we can send the voteType directly for now.
    voteComment.mutate({ commentId: comment.id, data: { vote: voteType } });
  };

  const handleReplySubmit = () => {
    if (!replyContent.trim()) return;
    replyMutation.mutate(
      { commentId: comment.id, data: { content: replyContent } },
      {
        onSuccess: () => {
          setReplyContent('');
          setIsReplying(false);
          setShowReplies(true); // show replies to see the new one
        },
      }
    );
  };

  if (comment.is_deleted) {
    return (
      <div className="p-4 border border-subtle rounded-lg bg-base opacity-60">
        <p className="text-muted italic text-sm">[Comment deleted by user]</p>
      </div>
    );
  }

  return (
    <div className="p-4 border border-subtle rounded-lg bg-surface">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-primary">{comment.username}</span>
          <span className="text-xs text-muted">
            {new Date(comment.created_at).toLocaleDateString()}
          </span>
        </div>
        {isOwnComment && (
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this comment?')) {
                deleteComment.mutate(comment.id);
              }
            }}
            className="text-xs text-error hover:underline"
          >
            Delete
          </button>
        )}
      </div>

      <p className="text-primary text-sm whitespace-pre-wrap mb-3">{comment.content}</p>

      <div className="flex items-center gap-4 text-sm">
        {/* Voting */}
        <div className="flex items-center gap-1 bg-base border border-subtle rounded-full px-2 py-1">
          <button
            onClick={() => handleVote('UPVOTE')}
            className={`p-1 hover:bg-surface rounded ${comment.current_user_vote === 'UPVOTE' ? 'text-success' : 'text-muted'}`}
            disabled={voteComment.isPending}
          >
            ▲
          </button>
          <span className="text-primary text-xs font-mono w-6 text-center">{comment.vote_count}</span>
          <button
            onClick={() => handleVote('DOWNVOTE')}
            className={`p-1 hover:bg-surface rounded ${comment.current_user_vote === 'DOWNVOTE' ? 'text-error' : 'text-muted'}`}
            disabled={voteComment.isPending}
          >
            ▼
          </button>
        </div>

        {/* Reply Toggle */}
        <button
          onClick={() => setIsReplying(!isReplying)}
          className="text-accent-blue hover:underline text-xs font-medium"
        >
          Reply
        </button>

        {/* View Replies Toggle */}
        {repliesData && repliesData.comments.length > 0 && (
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="text-muted hover:text-primary text-xs ml-auto"
          >
            {showReplies ? 'Hide' : 'Show'} Replies ({repliesData.total})
          </button>
        )}
      </div>

      {/* Reply Input Box */}
      {isReplying && (
        <div className="mt-4 flex gap-2">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 text-sm bg-base border border-subtle rounded-md p-2 min-h-[60px] resize-y outline-none focus:ring-1 focus:ring-accent-blue"
          />
          <div className="flex flex-col gap-2 justify-end">
            <Button size="sm" variant="default" onClick={handleReplySubmit} disabled={!replyContent.trim() || replyMutation.isPending}>
              Reply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsReplying(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Replies Thread */}
      {showReplies && repliesData && repliesData.comments.length > 0 && (
        <div className="mt-4 pl-4 border-l-2 border-subtle space-y-4">
          {repliesData.comments.map((reply) => (
            <CommentItem key={reply.id} comment={reply} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
