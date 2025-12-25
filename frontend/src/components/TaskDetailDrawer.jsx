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
  Tag,
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
  const [newLabel, setNewLabel] = useState({ name: '', color: '#3B82F6' });
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{taskData.name}</DialogTitle>
          <DialogDescription>
            {taskData.clientId?.name} • {taskData.packageId?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Task Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    statusColors[taskData.status] || statusColors.TODO
                  }`}
                >
                  {taskData.status?.replace('_', ' ') || 'TODO'}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Priority</label>
              <div className="mt-1">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    priorityColors[taskData.priority] || priorityColors.MEDIUM
                  }`}
                >
                  {taskData.priority || 'MEDIUM'}
                </span>
              </div>
            </div>
            {taskData.assignedTo && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-500">Assigned To</label>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {Array.isArray(taskData.assignedTo) ? (
                    taskData.assignedTo.length > 0 ? (
                      taskData.assignedTo.map((emp, idx) => (
                        <div key={emp._id || emp || idx} className="flex items-center gap-1">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{emp.name || emp.email || emp}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )
                  ) : (
                    <>
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">{taskData.assignedTo.name || taskData.assignedTo.email}</span>
                    </>
                  )}
                </div>
              </div>
            )}
            {taskData.dueDate && (
              <div>
                <label className="text-sm font-medium text-gray-500">Due Date</label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{format(new Date(taskData.dueDate), 'MMM dd, yyyy')}</span>
                </div>
              </div>
            )}
            {taskData.estimatedMinutes && (
              <div>
                <label className="text-sm font-medium text-gray-500">Estimated Time</label>
                <div className="mt-1 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    {estimatedHours}h {estimatedMins}m
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {taskData.description && (
            <div>
              <label className="text-sm font-medium text-gray-500">Description</label>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{taskData.description}</p>
            </div>
          )}

          {/* Labels */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-2 block">Labels</label>
            <div className="flex flex-wrap gap-2">
              {taskData.labels?.map((label, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full text-white"
                  style={{ backgroundColor: label.color }}
                >
                  <Tag className="h-3 w-3" />
                  {label.name}
                </span>
              ))}
              {(!taskData.labels || taskData.labels.length === 0) && (
                <span className="text-sm text-gray-400">No labels</span>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-500">Attachments</label>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={addAttachmentMutation.isPending}
                />
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Paperclip className="h-4 w-4 mr-1" />
                    Upload
                  </span>
                </Button>
              </label>
            </div>
            <div className="space-y-2">
              {taskData.attachments?.map((attachment) => (
                <div
                  key={attachment._id || attachment.key}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Paperclip className="h-4 w-4 text-gray-400" />
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex-1"
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
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {(!taskData.attachments || taskData.attachments.length === 0) && (
                <p className="text-sm text-gray-400">No attachments</p>
              )}
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="text-sm font-medium text-gray-500 mb-2 block">Comments</label>
            <div className="space-y-4">
              {/* Add Comment */}
              <div className="flex gap-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  rows={3}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || addCommentMutation.isPending}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-3">
                {taskData.comments?.map((comment) => (
                  <div key={comment._id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {comment.author?.email || 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {format(new Date(comment.createdAt), 'MMM dd, yyyy HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                      </div>
                      {(user?.role === 'ADMIN' ||
                        comment.author?._id === user?._id ||
                        comment.author === user?._id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {(!taskData.comments || taskData.comments.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

