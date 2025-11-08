import { useEffect, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Notification } from '@shared/schema';

interface NotificationMessage {
  type: 'notification';
  data: Notification;
}

export function useNotifications() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  useEffect(() => {
    let isSubscribed = true;

    function connect() {
      if (!isSubscribed) return;

      // Determine WebSocket protocol based on current protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/notifications`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected to notification service');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as NotificationMessage;

          if (message.type === 'notification') {
            const notification = message.data;

            // Show toast notification
            toast({
              title: notification.title,
              description: notification.message,
            });

            // Invalidate queries to refresh the notification list and count
            queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
            queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Connection closed');
        wsRef.current = null;

        // Attempt to reconnect after 3 seconds if still subscribed
        if (isSubscribed) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[WebSocket] Attempting to reconnect...');
            connect();
          }, 3000);
        }
      };
    }

    // Initial connection
    connect();

    // Cleanup on unmount
    return () => {
      isSubscribed = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [toast]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
