import { useEffect, useRef, useState, useCallback } from 'react';

interface PriceUpdate {
  type: 'price_update';
  data: {
    asset: string;
    price: number;
  };
}

interface PositionUpdate {
  type: 'position_update';
  data: {
    id: string;
    asset: string;
    direction: string;
    leverage: number;
    stake: number;
    status: string;
    entry_price?: number;
    current_price?: number;
    pnl_percent: number;
    pnl_dollars: number;
    time_remaining?: number;
    [key: string]: any;
  };
}

type WebSocketMessage = PriceUpdate | PositionUpdate;

interface UseMoonshotWebSocketReturn {
  prices: Record<string, number>;
  positions: Map<string, any>;
  connected: boolean;
  error: string | null;
}

export function useMoonshotWebSocket(url: string = 'ws://localhost:8000/ws'): UseMoonshotWebSocketReturn {
  const ws = useRef<WebSocket | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [positions, setPositions] = useState(() => new Map<string, any>());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeout = useRef<number | undefined>(undefined);
  const shouldReconnect = useRef(true);

  const connect = useCallback(() => {
    try {
      const websocket = new WebSocket(url);

      websocket.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        setError(null);
      };

      websocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'price_update') {
            setPrices((prev) => ({
              ...prev,
              [message.data.asset]: message.data.price,
            }));
          } else if (message.type === 'position_update') {
            setPositions((prev) => {
              const newMap = new Map(prev);
              newMap.set(message.data.id, message.data);
              return newMap;
            });
          }
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };

      websocket.onerror = (err) => {
        if (shouldReconnect.current) {
          console.error('WebSocket error:', err);
        }
        setError('Connection error');
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);

        if (!shouldReconnect.current) {
          return;
        }

        reconnectTimeout.current = setTimeout(() => {
          if (!shouldReconnect.current) return;
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };

      ws.current = websocket;
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to connect');
      
      reconnectTimeout.current = setTimeout(() => {
        connect();
      }, 3000);
    }
  }, [url]);

  useEffect(() => {
    shouldReconnect.current = true;
    connect();

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return { prices, positions, connected, error };
}
