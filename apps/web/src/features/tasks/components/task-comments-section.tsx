'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { commonUiCopy, taskUiCopy } from '@/lib/app-copy';
import { feedbackCopy, feedbackEntity } from '@/lib/feedback-copy';
import { getQueryClient } from '@/lib/query-client';
import { toast } from 'sonner';
import {
  useTaskCommentsQuery,
  useAddCommentMutation,
  useRemoveCommentMutation,
  useUploadAttachmentMutation
} from '../queries/task-queries';

interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  author?: {
    id: string;
    username: string;
    email: string | null;
    fullName?: string;
    departmentName?: string | null;
  } | null;
}

interface TaskCommentsSectionProps {
  taskId: string;
}

interface StagedAttachment {
  url: string;
  name: string;
  isImage: boolean;
}

// Custom parser to render Markdown images and attachment links in comment body
function CommentContent({ content }: { content: string }) {
  if (!content) return null;

  // Split by markdown image or link tokens to parse them sequentially
  const tokenRegex = /(!\[.*?\]\(.*?\)|\[.*?\]\(.*?\))/g;
  const parts = content.split(tokenRegex);

  return (
    <div className="mt-1.5 text-sm text-foreground/90 leading-relaxed break-words whitespace-pre-wrap">
      {parts.map((part, idx) => {
        // 1. Match Markdown Image: ![alt](url)
        const imgMatch = /^!\[(.*?)\]\((.*?)\)$/.exec(part);
        if (imgMatch) {
          const [, alt, url] = imgMatch;
          return (
            <div key={idx} className="my-2 max-w-sm overflow-hidden rounded-lg border bg-muted/20 shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={alt}
                className="max-h-60 w-full object-contain cursor-pointer hover:brightness-95 transition-all"
                onClick={() => window.open(url, '_blank')}
              />
            </div>
          );
        }

        // 2. Match Markdown Link: [text](url)
        const linkMatch = /^\[(.*?)\]\((.*?)\)$/.exec(part);
        if (linkMatch) {
          const [, text, url] = linkMatch;
          return (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline hover:text-primary/80 mr-1"
            >
              📎 {text}
            </a>
          );
        }

        // 3. Regular text segment
        return <span key={idx}>{part}</span>;
      })}
    </div>
  );
}

export function TaskCommentsSection({ taskId }: TaskCommentsSectionProps) {
  const queryClient = getQueryClient();
  const commentsQuery = useTaskCommentsQuery(taskId);
  const addComment = useAddCommentMutation(queryClient);
  const removeComment = useRemoveCommentMutation(queryClient);
  const uploadAttachment = useUploadAttachmentMutation(queryClient);

  const [text, setText] = React.useState('');
  const [stagedAttachments, setStagedAttachments] = React.useState<StagedAttachment[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const comments = (commentsQuery.data ?? []) as TaskComment[];

  function handleSubmit() {
    let content = text.trim();
    
    // Append staged attachments as markdown links at the end of the text content
    if (stagedAttachments.length > 0) {
      const attachmentsMarkdown = stagedAttachments
        .map((file) => file.isImage ? `![${file.name}](${file.url})` : `[${file.name}](${file.url})`)
        .join('\n');
      content = content ? `${content}\n\n${attachmentsMarkdown}` : attachmentsMarkdown;
    }

    if (!content) return;

    addComment.mutate(
      { id: taskId, data: { content } },
      {
        onSuccess: () => {
          setText('');
          setStagedAttachments([]);
          toast.success(feedbackCopy.success.added(feedbackEntity.comment));
        },
        onError: () => toast.error(feedbackCopy.failure.create(feedbackEntity.comment))
      }
    );
  }

  function handleDelete(commentId: string) {
    removeComment.mutate(
      { id: taskId, commentId },
      {
        onSuccess: () => toast.success(feedbackCopy.success.deleted(feedbackEntity.comment)),
        onError: () => toast.error(feedbackCopy.failure.delete(feedbackEntity.comment))
      }
    );
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error(feedbackCopy.warning.fileTooLarge('10MB'));
      return;
    }

    try {
      const res = await uploadAttachment.mutateAsync({ id: taskId, file });
      const uploadedFile = (res as any).data?.data;
      const fileUrl = uploadedFile?.url;

      if (!fileUrl) {
        throw new Error('Upload returned empty URL');
      }

      const isImage = file.type.startsWith('image/');
      setStagedAttachments((prev) => [...prev, { url: fileUrl, name: file.name, isImage }]);
      toast.success(feedbackCopy.success.uploaded(file.name));
    } catch {
      toast.error(feedbackCopy.failure.upload(file.name));
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const isFormValid = text.trim().length > 0 || stagedAttachments.length > 0;

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">
        {taskUiCopy.commentsTitle} {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Modern Card comment editor with Facebook-style attachment flow */}
      <div className="mb-4 rounded-xl border bg-card focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary/60 transition-all overflow-hidden shadow-2xs">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={taskUiCopy.writeComment}
          rows={3}
          className="border-0 shadow-none focus-visible:ring-0 resize-none min-h-[70px] bg-transparent text-sm px-4 pt-3 pb-1"
          disabled={addComment.isPending}
        />

        {/* Staged attachments preview list (displayed below textarea draft) */}
        {stagedAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 py-2 border-t bg-muted/10">
            {stagedAttachments.map((file, idx) => (
              <div
                key={idx}
                className="relative flex items-center gap-1.5 rounded-lg border bg-background pl-2.5 pr-1.5 py-1 text-xs shadow-3xs group transition-all"
              >
                <span className="text-sm">{file.isImage ? '🖼️' : '📄'}</span>
                <span className="max-w-[150px] truncate font-medium text-foreground/80">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => setStagedAttachments((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <Icons.close className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t px-3 py-2 bg-muted/10">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAttachment.isPending || addComment.isPending}
            >
              {uploadAttachment.isPending ? (
                <Icons.spinner className="size-4 animate-spin" />
              ) : (
                <Icons.paperclip className="size-4" />
              )}
            </Button>
            <span className="text-[10px] text-muted-foreground">
              {uploadAttachment.isPending ? 'Đang tải tệp lên...' : ''}
            </span>
          </div>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!isFormValid || addComment.isPending || uploadAttachment.isPending}
            className="h-8 px-3 gap-1.5"
          >
            {addComment.isPending ? (
              <Icons.spinner className="size-3.5 animate-spin" />
            ) : (
              <Icons.send className="size-3.5" />
            )}
            Gửi
          </Button>
        </div>
      </div>

      {commentsQuery.isLoading && (
        <div className="text-muted-foreground text-sm py-2">{commonUiCopy.loading}</div>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-xl border p-4 bg-muted/5 hover:bg-muted/10 transition-all">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground/80">
                {comment.author?.fullName
                  ? `${comment.author.fullName}${comment.author.departmentName ? ` - ${comment.author.departmentName}` : ''}`
                  : (comment.author?.username ?? taskUiCopy.anonymousActor)}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-[10px]">
                  {new Date(comment.createdAt).toLocaleString('vi-VN')}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all"
                  onClick={() => handleDelete(comment.id)}
                  disabled={removeComment.isPending}
                >
                  <Icons.trash className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {/* Rendered content containing structured markdown files/images */}
            <CommentContent content={comment.content} />
          </div>
        ))}
      </div>
    </div>
  );
}
