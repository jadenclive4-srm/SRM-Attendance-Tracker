import { useState, useEffect, useCallback, useRef } from "react";
import { fetchNotifications, fetchUnreadNotifications, markNotificationRead, markAllNotificationsRead, NotificationItem } from "@/lib/api";
import { AppNotification, NotificationType } from "@/lib/notifications";
import { useAuth } from "@/lib/auth";

const POLL_INTERVAL = 30000; // 30 seconds

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toAppNotification = (n: NotificationItem): AppNotification => ({
    ...n,
    type: n.type as NotificationType,
  });

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const all = await fetchNotifications();
      console.log("[notifications] fetched all:", all.length, all);
      setItems(all.map(toAppNotification));
      const unread = await fetchUnreadNotifications();
      console.log("[notifications] unread:", unread.length, unread);
      setUnreadCount(unread.length);
    } catch (err) {
      console.error("[notifications] fetch error:", err);
    }
  }, [user]);

  useEffect(() => {
    load();

    intervalRef.current = setInterval(load, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      setItems(prev => prev.map(i => (i.id === id ? { ...i, read: true } : i)));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead();
      setItems(prev => prev.map(i => ({ ...i, read: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  }, [user]);

  return { items, unreadCount, markRead, markAllRead, refresh: load };
}