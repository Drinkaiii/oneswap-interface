import React, { createContext, useContext, useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';

// create WebSocket Context
const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

const host = "https://d1edophfzx4z61.cloudfront.net";

export const WebSocketProvider = ({ children }) => {

  // WebSocket
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  // data
  const [estimateResponse, setEstimateResponse] = useState(null);
  const [gasPrice, setGasPrice] = useState(null);

  useEffect(() => {
    // initialize STOMP client
    const socket = new SockJS(`${host}/ws`);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
    });

    // connection succeed process
    stompClient.onConnect = () => {
      
      // succcess record
      console.log('Connected');
      setConnected(true);
      
      // get sessionId
      const url = socket._transport.url;
      const sessionId = url.split("/")[5].split("?")[0];
      
      // subscribe estimate channel
      stompClient.subscribe(`/queue/estimate/${sessionId}`, (message) => {
        const body = JSON.parse(message.body);
        setEstimateResponse(body);
      });

      // subscribe gas channel
      stompClient.subscribe('/queue/gas/Sepolia', (message) => {
        const body = JSON.parse(message.body);
        setGasPrice(body.data);
        console.log('Current gas price:', body.data.toString());
      });

      // update sessionId and client
      setSessionId(sessionId);
      setClient(stompClient);
    };

    // connection failed process
    stompClient.onDisconnect = () => {
      console.log('Disconnected');
      setConnected(false);
      setSessionId(null);
    };

    // activate WebSocket connection
    stompClient.activate();

    // close WebSocket connection
    return () => {
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ client, connected, sessionId, estimateResponse, gasPrice }}>
      {children}
    </WebSocketContext.Provider>
  );
};
