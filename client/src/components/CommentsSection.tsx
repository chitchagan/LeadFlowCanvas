import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Comment, User } from "@shared/schema";

interface CommentsSectionProps {
  leadId: string;
}

export function CommentsSection({ leadId }: CommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();

  const { data: comments, isLoading } = useQuery<(Comment & { user: User })[]>({
    queryKey: ["/api/leads", leadId, "comments"],
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", `/api/leads/${leadId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "comments"] });
      // Also invalidate leads search to update comment counts
      queryClient.invalidateQueries({ queryKey: ["/api/leads/search"] });
      setNewComment("");
      toast({
        title: "Comment added",
        description: "Your comment has been saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim());
    }
  };

  const getInitials = (user: User) => {
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="w-4 h-4" />
          Notes & Comments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a note about this lead..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] resize-none"
            data-testid={`textarea-comment-${leadId}`}
          />
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || addCommentMutation.isPending}
            size="icon"
            className="shrink-0"
            data-testid={`button-add-comment-${leadId}`}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Comments List */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading comments...</p>
          ) : comments && comments.length > 0 ? (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="flex gap-3 p-3 rounded-lg bg-muted/50"
                data-testid={`comment-${comment.id}`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(comment.user)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-medium">
                      {comment.user.firstName} {comment.user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No notes yet. Add the first one!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
