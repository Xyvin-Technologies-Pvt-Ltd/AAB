import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { calendarApi } from "@/api/calendar";
import { Card } from "@/ui/card";
import { Button } from "@/ui/button";
import { Calendar, Copy, RefreshCw } from "lucide-react";

export const CalendarSubscription = () => {
  const [feedUrl, setFeedUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: () => calendarApi.generateToken(),
    onSuccess: (res) => {
      const url = res?.data?.feedUrl ?? res?.feedUrl;
      if (url) setFeedUrl(url);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => calendarApi.revokeToken(),
    onSuccess: () => {
      setFeedUrl(null);
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    },
  });

  const handleGetUrl = () => {
    generateMutation.mutate();
  };

  const handleCopy = async () => {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      // ignore
    }
  };

  const handleRegenerate = () => {
    revokeMutation.mutate(undefined, {
      onSettled: () => generateMutation.mutate(),
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="h-5 w-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Subscribe to calendar</h3>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Add this calendar to your phone or Outlook so tasks and compliance
        events appear in your calendar.
      </p>

      {!feedUrl ? (
        <Button
          onClick={handleGetUrl}
          disabled={generateMutation.isPending}
          className="w-full sm:w-auto"
        >
          {generateMutation.isPending ? "Generating…" : "Get calendar feed URL"}
        </Button>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <code className="flex-1 min-w-0 text-xs bg-gray-100 rounded px-2 py-1.5 truncate">
              {feedUrl}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0"
            >
              <Copy className="h-4 w-4 mr-1" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="text-xs text-gray-500 space-y-2 mb-4">
            <p className="font-medium">How to add:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                <strong>iPhone:</strong> Settings → Calendar → Accounts → Add
                Account → Other → Add Subscribed Calendar → paste URL
              </li>
              <li>
                <strong>Android (Google Calendar):</strong> Settings → Add
                calendar → From URL → paste URL
              </li>
              <li>
                <strong>Outlook (web):</strong> Calendar → Add calendar →
                Subscribe from web → paste URL
              </li>
              <li>
                <strong>Outlook (desktop):</strong> Calendar view → Add
                calendar → Subscribe from web → paste URL
              </li>
            </ul>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={generateMutation.isPending || revokeMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Regenerate URL
          </Button>
        </>
      )}

      {(generateMutation.isError || revokeMutation.isError) && (
        <p className="mt-2 text-sm text-red-600">
          {generateMutation.error?.response?.data?.message ||
            revokeMutation.error?.response?.data?.message ||
            "Something went wrong. Try again."}
        </p>
      )}
    </Card>
  );
};
