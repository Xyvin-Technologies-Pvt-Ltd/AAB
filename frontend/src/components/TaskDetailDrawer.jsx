import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/ui/dialog';
import { Button } from '@/ui/button';
import { tasksApi } from '@/api/tasks';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/store/authStore';
import {
  X,
  MessageSquare,
  Paperclip,
  User,
  Calendar,
  Clock,
  Trash2,
  Send,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';

export const TaskDetailDrawer = ({ task, open, onOpenChange }) => {
  const [commentText, setCommentText] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const taskData = task || {};

  const addCommentMutation = useMutation({
    mutationFn: ({ taskId, content }) => tasksApi.addComment(taskId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskData._id] });
      setCommentText('');
      toast({ title: 'Success', description: 'Comment added successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add comment',
        type: 'destructive',
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: ({ taskId, commentId }) => tasksApi.deleteComment(taskId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskData._id] });
      toast({ title: 'Success', description: 'Comment deleted successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete comment',
        type: 'destructive',
      });
    },
  });

  const addAttachmentMutation = useMutation({
    mutationFn: ({ taskId, file }) => tasksApi.addAttachment(taskId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskData._id] });
      toast({ title: 'Success', description: 'Attachment uploaded successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to upload attachment',
        type: 'destructive',
      });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: ({ taskId, attachmentId }) => tasksApi.deleteAttachment(taskId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskData._id] });
      toast({ title: 'Success', description: 'Attachment deleted successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete attachment',
        type: 'destructive',
      });
    },
  });

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate({ taskId: taskData._id, content: commentText });
  };

  const handleDeleteComment = (commentId) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate({ taskId: taskData._id, commentId });
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      addAttachmentMutation.mutate({ taskId: taskData._id, file });
    }
  };

  const handleDeleteAttachment = (attachmentId) => {
    if (confirm('Are you sure you want to delete this attachment?')) {
      deleteAttachmentMutation.mutate({ taskId: taskData._id, attachmentId });
    }
  };

  const priorityColors = {
    URGENT: 'bg-red-100 text-red-800',
    HIGH: 'bg-orange-100 text-orange-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-gray-100 text-gray-800',
  };

  const statusColors = {
    TODO: 'bg-gray-100 text-gray-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    DONE: 'bg-green-100 text-green-800',
  };

  // Calculate actual time from time entries (would need to fetch separately)
  const estimatedHours = taskData.estimatedMinutes
    ? Math.floor(taskData.estimatedMinutes / 60)
    : null;
  const estimatedMins = taskData.estimatedMinutes ? taskData.estimatedMinutes % 60 : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg leading-tight">{taskData.name}</DialogTitle>
          <DialogDescription className="text-xs text-gray-500 mt-0.5">
            {taskData.clientId?.name} • {taskData.packageId?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Compact Task Info - 3 Column Grid */}
          <div className="grid grid-cols-3 gap-2 pb-2 border-b border-gray-100">
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Status</label>
              <div className="mt-0.5">
                <span
                  className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                    statusColors[taskData.status] || statusColors.TODO
                  }`}
                >
                  {taskData.status?.replace('_', ' ') || 'TODO'}
                </span>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Priority</label>
              <div className="mt-0.5">
                <span
                  className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                    priorityColors[taskData.priority] || priorityColors.MEDIUM
                  }`}
                >
                  {taskData.priority || 'MEDIUM'}
                </span>
              </div>
            </div>
            {taskData.dueDate && (
              <div>
                <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Due Date</label>
                <div className="mt-0.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-700">
                    {format(new Date(taskData.dueDate), 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Assignees - Compact */}
          {taskData.assignedTo && (
            <div className="pb-2 border-b border-gray-100">
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide block mb-1">Assigned To</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {Array.isArray(taskData.assignedTo) ? (
                  taskData.assignedTo.length > 0 ? (
                    taskData.assignedTo.map((emp, idx) => (
                      <div key={emp._id || emp || idx} className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 rounded">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-700">{emp.name || emp.email || emp}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">Unassigned</span>
                  )
                ) : (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-50 rounded">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-700">{taskData.assignedTo.name || taskData.assignedTo.email}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {taskData.description && (
            <div className="pb-2 border-b border-gray-100">
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide block mb-1">Description</label>
              <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{taskData.description}</p>
            </div>
          )}

          {/* Services & Activities - Compact */}
          {(taskData.services?.length > 0 || taskData.activities?.length > 0) && (
            <div className="grid grid-cols-2 gap-3 pb-2 border-b border-gray-100">
              {taskData.services?.length > 0 && (
                <div>
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide block mb-1">Services</label>
                  <div className="flex flex-wrap gap-1">
                    {taskData.services.map((service, idx) => (
                      <span
                        key={service._id || service || idx}
                        className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-800"
                      >
                        {service.name || service}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {taskData.activities?.length > 0 && (
                <div>
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide block mb-1">Activities</label>
                  <div className="flex flex-wrap gap-1">
                    {taskData.activities.map((activity, idx) => (
                      <span
                        key={activity._id || activity || idx}
                        className="inline-flex items-center px-1.5 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-800"
                      >
                        {activity.name || activity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attachments - Compact */}
          <div className="pb-2 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Attachments</label>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={addAttachmentMutation.isPending}
                />
                <Button variant="outline" size="sm" asChild className="h-6 px-2 text-xs">
                  <span>
                    <Paperclip className="h-3 w-3 mr-1" />
                    Upload
                  </span>
                </Button>
              </label>
            </div>
            <div className="space-y-1">
              {taskData.attachments?.map((attachment) => (
                <div
                  key={attachment._id || attachment.key}
                  className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-xs"
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline truncate flex-1"
                    >
                      {attachment.name}
                    </a>
                    {(user?.role === 'ADMIN' ||
                      attachment.uploadedBy?._id === user?._id ||
                      attachment.uploadedBy === user?._id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAttachment(attachment._id || attachment.key)}
                        className="h-5 w-5 p-0 text-red-600 hover:text-red-700 flex-shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {(!taskData.attachments || taskData.attachments.length === 0) && (
                <p className="text-xs text-gray-400 py-1">No attachments</p>
              )}
            </div>
          </div>

          {/* Comments - Compact */}
          <div>
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Comments</label>
            <div className="space-y-2">
              {/* Add Comment */}
              <div className="flex gap-1.5">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 text-xs"
                  rows={2}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-1.5">
                {taskData.comments?.map((comment) => (
                  <div key={comment._id} className="p-2 bg-gray-50 rounded text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-medium text-gray-700">
                            {comment.author?.email || 'Unknown'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {format(new Date(comment.createdAt), 'MMM dd, HH:mm')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                      </div>
                      {(user?.role === 'ADMIN' ||
                        comment.author?._id === user?._id ||
                        comment.author === user?._id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment._id)}
                          className="h-5 w-5 p-0 text-red-600 hover:text-red-700 flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {(!taskData.comments || taskData.comments.length === 0) && (
                  <p className="text-xs text-gray-400 text-center py-2">No comments yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

