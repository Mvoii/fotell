import React, { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { useComments, useCommentReplies, useCreateComment, useReplyComment, useVoteComment, useDeleteComment } from '@/hooks/useComments';
import type { Comment } from '@/lib/api/types/api';
import { Button } from '@/components/ui/button';
import { formatDistanceToNowStrict } from 'date-fns';
import { Smile, MoreHorizontal, MessageCircle, ArrowUp, ArrowDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';


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

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">Loading comments...</div>;
  if (isError) return <div className="p-4 text-center text-error">Failed to load comments</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-heading-md text-primary font-semibold border-b border-subtle pb-2">Comments</h3>

      {/* Post Comment Box */}
      <div className="mb-6">
        {!isAuthenticated ? (
          <div className="text-center py-4 border border-subtle rounded-lg">
            <p className="text-muted-foreground mb-4">Log in to participate in the discussion</p>
            <Button variant="outline" onClick={() => window.location.href = '/auth/login'}>Log In</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-base border border-subtle rounded-full p-1 pl-4 transition-colors focus-within:border-accent-blue/50 focus-within:ring-1 focus-within:ring-accent-blue/50">
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePostComment();
                }
              }}
              className="flex-1 bg-transparent text-primary placeholder:text-muted-foreground outline-none border-none py-2 text-sm"
            />
            <button className="p-2 text-muted-foreground hover:text-primary transition-colors" title="Emoji">
              <Smile size={20} />
            </button>
            <Button
              variant="default"
              className="rounded-full px-5 py-2 h-auto text-sm font-medium"
              onClick={handlePostComment}
              disabled={!newComment.trim() || createComment.isPending}
            >
              Post
            </Button>
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
          <p className="text-center text-muted-foreground py-6">No comments yet. Be the first to share your thoughts!</p>
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
  // Only fetch replies when the user expands them
  const { data: repliesData, isLoading: repliesLoading } = useCommentReplies(
    comment.id,
    undefined,
    undefined,
    showReplies
  );

  const isOwnComment = currentUserId === comment.user_id;

  const handleVote = (voteType: 'UPVOTE' | 'DOWNVOTE') => {
    // If clicking the same vote type, untoggle by sending NONE (assumed API behavior)
    const newVote = comment.current_user_vote === voteType ? 'NONE' : voteType;
    // We send UPVOTE or DOWNVOTE based on the API spec. If it only accepts UPVOTE/DOWNVOTE, we might not be able to untoggle.
    // Assuming we can send the voteType directly for now.
    voteComment.mutate({ commentId: comment.id, data: { vote_type: voteType } });
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
        <p className="text-muted-foreground italic text-sm">[Comment deleted by user]</p>
      </div>
    );
  }

  return (
    <div className="py-3 px-1 border-b border-subtle/40 last:border-0 bg-transparent">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-primary text-sm">{comment.username}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNowStrict(new Date(comment.created_at))} ago
          </span>
        </div>
        {isOwnComment && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="text-muted-foreground hover:text-primary p-1 rounded-full hover:bg-surface transition-colors outline-none">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="min-w-[120px] bg-surface rounded-md shadow-lg border border-subtle p-1 z-50 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95">
                <DropdownMenu.Item
                  className="text-sm text-error px-2 py-1.5 outline-none cursor-pointer hover:bg-base rounded font-medium flex items-center"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this comment?')) {
                      deleteComment.mutate(comment.id);
                    }
                  }}
                >
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>

      <p className="text-primary text-sm whitespace-pre-wrap mb-2">{comment.content}</p>

      <div className="flex items-center gap-4 text-sm mt-2">
        {/* Voting */}
        <div className="flex flex-col items-center bg-surface/30 rounded-md p-1 min-w-[2rem]">
          <button
            onClick={() => handleVote('UPVOTE')}
            className={`p-1 rounded hover:bg-surface transition-colors ${comment.current_user_vote === 'UPVOTE' ? 'text-accent-blue' : 'text-muted-foreground'}`}
            disabled={voteComment.isPending}
            title="Upvote"
          >
            <ArrowUp size={16} />
          </button>
          <span className="text-primary text-xs font-mono py-0.5 w-full text-center">{comment.vote_count}</span>
          <button
            onClick={() => handleVote('DOWNVOTE')}
            className={`p-1 rounded hover:bg-surface transition-colors ${comment.current_user_vote === 'DOWNVOTE' ? 'text-error' : 'text-muted-foreground'}`}
            disabled={voteComment.isPending}
            title="Downvote"
          >
            <ArrowDown size={16} />
          </button>
        </div>

        {/* Reply Toggle */}
        <button
          onClick={() => setIsReplying(!isReplying)}
          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors text-xs font-medium"
        >
          <MessageCircle size={14} />
          Reply
        </button>

        {/* View Replies Toggle */}
        <button
          onClick={() => setShowReplies(!showReplies)}
          className="flex items-center gap-1 text-muted-foreground hover:text-primary text-xs ml-auto font-medium"
        >
          <MessageCircle size={12} />
          {showReplies
            ? repliesLoading
              ? 'Loading...'
              : `Hide Replies (${repliesData?.total ?? 0})`
            : 'Show Replies'}
        </button>
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
      {showReplies && repliesData?.comments && repliesData.comments.length > 0 && (
        <div className="mt-2 pl-6 ml-2 border-l border-subtle space-y-0">
          {repliesData.comments.map((reply) => (
            <CommentItem key={reply.id} comment={reply} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
