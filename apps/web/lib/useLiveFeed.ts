"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useLiveFeed() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001/ws/live");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Live feed connected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "spans.created") {
        // New spans landed — invalidate cached queries so they refetch fresh data
        queryClient.invalidateQueries({ queryKey: ["spans"] });
        queryClient.invalidateQueries({ queryKey: ["services"] });
      }
    };

    ws.onerror = (err) => {
      console.error("Live feed error:", err);
    };

    ws.onclose = () => {
      console.log("Live feed disconnected");
    };

    // Cleanup: close the socket when the component unmounts
    return () => {
      ws.close();
    };
  }, [queryClient]);
}