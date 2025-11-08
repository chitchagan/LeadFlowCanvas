import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mic, Square, Play, Pause } from "lucide-react";
import type { Lead, Recording } from "@shared/schema";
import { format } from "date-fns";

interface RecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
}

export function RecordingDialog({ open, onOpenChange, lead }: RecordingDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: recordings } = useQuery<Recording[]>({
    queryKey: ["/api/leads", lead.id, "recordings"],
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !audioBlob) throw new Error("Missing required data");

      // Get upload URL from backend
      const response = await apiRequest("POST", "/api/objects/upload", {}) as { uploadURL: string };
      const { uploadURL } = response;

      // Upload audio to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: audioBlob,
        headers: {
          "Content-Type": "audio/webm",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload audio");
      }

      const audioUrl = new URL(uploadResponse.url).pathname;

      // Save recording metadata
      return await apiRequest("POST", "/api/recordings", {
        leadId: lead.id,
        recordedById: user.id,
        audioUrl,
        transcript,
        duration: `${Math.floor(recordingTime / 60)}:${(recordingTime % 60).toString().padStart(2, "0")}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", lead.id, "recordings"] });
      toast({
        title: "Recording saved",
        description: "Your voice memo has been saved successfully",
      });
      setTranscript("");
      setAudioBlob(null);
      setRecordingTime(0);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save recording",
        variant: "destructive",
      });
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleSave = () => {
    if (!audioBlob) {
      toast({
        title: "Error",
        description: "No recording to save",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Voice Recording - {lead.name}</DialogTitle>
          <DialogDescription>
            Record a voice memo summarizing the call interaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recording Controls */}
          <div className="flex items-center justify-center py-6">
            {!isRecording && !audioBlob && (
              <Button
                size="lg"
                className="w-20 h-20 rounded-full"
                onClick={startRecording}
                data-testid="button-start-recording"
              >
                <Mic className="w-8 h-8" />
              </Button>
            )}
            {isRecording && (
              <div className="text-center">
                <Button
                  size="lg"
                  variant="destructive"
                  className="w-20 h-20 rounded-full animate-pulse"
                  onClick={stopRecording}
                  data-testid="button-stop-recording"
                >
                  <Square className="w-8 h-8" />
                </Button>
                <p className="mt-4 font-mono text-2xl font-bold">
                  {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
                </p>
              </div>
            )}
            {audioBlob && !isRecording && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Recording completed ({Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")})
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => setAudioBlob(null)}>
                    Record Again
                  </Button>
                  <Button onClick={handleSave} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : "Save Recording"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Transcript/Notes */}
          <div className="space-y-2">
            <Label htmlFor="transcript">Notes / Summary</Label>
            <Textarea
              id="transcript"
              placeholder="Add notes about the call..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={4}
              data-testid="input-transcript"
            />
          </div>

          {/* Previous Recordings */}
          {recordings && recordings.length > 0 && (
            <div className="space-y-2">
              <Label>Previous Recordings</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recordings.map((recording) => (
                  <div
                    key={recording.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`recording-${recording.id}`}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {format(new Date(recording.createdAt!), "MMM d, yyyy HH:mm")}
                      </p>
                      {recording.transcript && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {recording.transcript}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {recording.duration}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const audio = new Audio(recording.audioUrl);
                          audio.play();
                        }}
                        data-testid={`button-play-${recording.id}`}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
