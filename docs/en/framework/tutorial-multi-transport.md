# Multi-Protocol Listening Tutorial

This tutorial shows how to run three protocols — HTTP, gRPC, and WebSocket — simultaneously in a single GoWind service.

## Scenario

An online chat service needs:
- HTTP: REST APIs (user registration, login, fetching message history)
- gRPC: internal service-to-service calls (user service, notification service)
- WebSocket: real-time message push (client long connections)

## Step 1: The Configuration File

```yaml
name: chat-service
version: "1.0.0"

server:
  http:
    addr: ":8080"
    middleware:
      - recovery
      - cors
      - logger
      - jwt_auth

  grpc:
    addr: ":9090"
    middleware:
      - recovery

  websocket:
    addr: ":8081"
    path: "/ws"

log:
  zap:
    level: debug
    format: console

database:
  default:
    driver: postgres
    dsn: "${DB_DSN}"

cache:
  redis:
    addr: "${REDIS_ADDR}"
    db: 0

broker:
  redis:                    # Use Redis Pub/Sub for message distribution
    addr: "${REDIS_ADDR}"
    channels:
      - chat.messages

registry:
  consul:
    addr: "localhost:8500"

middleware:
  jwt_auth:
    key: "${JWT_SECRET}"
    skip_paths:
      - /api/login
      - /api/register
      - /health
```

## Step 2: Define the Protobuf

```protobuf
// api/v1/chat.proto
syntax = "proto3";
package api.v1;

service ChatService {
    rpc SendMessage(SendMessageRequest) returns (SendMessageResponse);
    rpc GetHistory(GetHistoryRequest) returns (GetHistoryResponse);
    rpc StreamMessages(StreamMessagesRequest) returns (stream Message);
}

message Message {
    string id = 1;
    string user_id = 2;
    string room_id = 3;
    string content = 4;
    int64 timestamp = 5;
}

message SendMessageRequest {
    string room_id = 1;
    string content = 2;
}

message SendMessageResponse {
    Message message = 1;
}

message GetHistoryRequest {
    string room_id = 1;
    int32 limit = 2;
    int32 offset = 3;
}

message GetHistoryResponse {
    repeated Message messages = 1;
    int32 total = 2;
}

message StreamMessagesRequest {
    string room_id = 1;
}
```

## Step 3: The WebSocket Hub

```go
// internal/ws/hub.go
package ws

import (
    "sync"
    "github.com/gorilla/websocket"
)

type Hub struct {
    mu      sync.RWMutex
    clients map[string]map[*websocket.Conn]bool  // room_id → connections
}

func NewHub() *Hub {
    return &Hub{
        clients: make(map[string]map[*websocket.Conn]bool),
    }
}

func (h *Hub) Register(roomID string, conn *websocket.Conn) {
    h.mu.Lock()
    defer h.mu.Unlock()
    if h.clients[roomID] == nil {
        h.clients[roomID] = make(map[*websocket.Conn]bool)
    }
    h.clients[roomID][conn] = true
}

func (h *Hub) Unregister(roomID string, conn *websocket.Conn) {
    h.mu.Lock()
    defer h.mu.Unlock()
    if clients, ok := h.clients[roomID]; ok {
        delete(clients, conn)
        if len(clients) == 0 {
            delete(h.clients, roomID)
        }
    }
}

func (h *Hub) Broadcast(roomID string, message []byte) {
    h.mu.RLock()
    defer h.mu.RUnlock()
    for conn := range h.clients[roomID] {
        conn.WriteMessage(websocket.TextMessage, message)
    }
}
```

## Step 4: Message Handling

```go
// internal/service/chat_service.go
package service

type ChatService struct {
    db    *ent.Client
    hub   *ws.Hub
    broker broker.Broker
}

func (s *ChatService) SendMessage(ctx context.Context, roomID, userID, content string) (*Message, error) {
    msg := &Message{
        ID:        uuid.New().String(),
        RoomID:    roomID,
        UserID:    userID,
        Content:   content,
        Timestamp: time.Now().UnixMilli(),
    }

    // Persist to the database
    s.db.Message.Create().
        SetID(msg.ID).
        SetRoomID(roomID).
        SetUserID(userID).
        SetContent(content).
        Save(ctx)

    // Push to online users in the current room via WebSocket
    data, _ := json.Marshal(msg)
    s.hub.Broadcast(roomID, data)

    // Also publish to the broker (cross-instance push)
    s.broker.Publish(ctx, "chat.messages", &broker.Message{Body: data})

    return msg, nil
}
```

## Step 5: The HTTP Handler

```go
// internal/handler/http_handler.go
package handler

func (h *ChatHandler) Routes() map[string]http.HandlerFunc {
    return map[string]http.HandlerFunc{
        "POST /api/rooms/{room_id}/messages": h.sendMessage,
        "GET  /api/rooms/{room_id}/messages": h.getHistory,
        "POST /api/rooms":                    h.createRoom,
        "GET  /api/health":                   h.health,
    }
}
```

## Step 6: The gRPC Handler

```go
// internal/handler/grpc_handler.go
package handler

type GRPCChatHandler struct {
    pb.UnimplementedChatServiceServer
    svc *service.ChatService
}

func (h *GRPCChatHandler) SendMessage(ctx context.Context, req *pb.SendMessageRequest) (*pb.SendMessageResponse, error) {
    userID := wind.UserID(ctx)
    msg, err := h.svc.SendMessage(ctx, req.RoomId, userID, req.Content)
    if err != nil {
        return nil, err
    }
    return &pb.SendMessageResponse{
        Message: toProtoMessage(msg),
    }, nil
}

func (h *GRPCChatHandler) StreamMessages(req *pb.StreamMessagesRequest, stream pb.ChatService_StreamMessagesServer) error {
    // Server-side streaming push
    ctx := stream.Context()
    sub, _ := h.svc.broker.Subscribe(ctx, "chat.messages", func(ctx context.Context, msg *broker.Message) error {
        var m Message
        json.Unmarshal(msg.Body, &m)
        if m.RoomID == req.RoomId {
            stream.Send(toProtoMessage(&m))
        }
        return nil
    })
    defer sub.Unsubscribe()

    <-ctx.Done()
    return nil
}
```

## Step 7: Assembly

```go
// internal/app.go
package internal

func init() {
    bootstrap.OnReady(func(app *bootstrap.App) {
        hub := ws.NewHub()
        chatSvc := service.NewChatService(app.DB(), hub, app.Broker())

        // HTTP routes
        mux := http.NewServeMux()
        httpHandler := handler.NewHTTPHandler(chatSvc)
        for pattern, h := range httpHandler.Routes() {
            mux.HandleFunc(pattern, h)
        }
        app.SetHTTPHandler(mux)

        // gRPC service registration
        grpcHandler := handler.NewGRPCChatHandler(chatSvc)
        app.RegisterGRPC(func(s *grpc.Server) {
            pb.RegisterChatServiceServer(s, grpcHandler)
        })

        // WebSocket handler
        app.SetWebSocketHandler(func(conn *websocket.Conn) {
            roomID := conn.URL.Query().Get("room")
            hub.Register(roomID, conn)
            defer hub.Unregister(roomID, conn)

            for {
                _, msg, err := conn.ReadMessage()
                if err != nil { break }
                chatSvc.SendMessage(context.Background(), roomID, "ws-user", string(msg))
            }
        })
    })
}
```

## Step 8: The Entry Point

```go
// cmd/server/main.go
package main

import (
    _ "github.com/tx7do/go-wind-plugins/transport/http"
    _ "github.com/tx7do/go-wind-plugins/transport/grpc"
    _ "github.com/tx7do/go-wind-plugins/transport/websocket"
    _ "github.com/tx7do/go-wind-plugins/log/zap"
    _ "github.com/tx7do/go-wind-plugins/database/postgres"
    _ "github.com/tx7do/go-wind-plugins/cache/redis"
    _ "github.com/tx7do/go-wind-plugins/broker/redis"
    _ "github.com/tx7do/go-wind-plugins/registry/consul"

    "github.com/tx7do/go-wind-bootstrap"
    _ "chat-service/internal"
)

func main() {
    app := bootstrap.New("configs/config.yaml")
    app.Run()
}
```

## Running It

```bash
# HTTP API
curl -X POST http://localhost:8080/api/rooms/general/messages \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"content":"Hello!"}'

# gRPC calls
grpcurl -plaintext -d '{"room_id":"general","content":"Hi from gRPC"}' \
  localhost:9090 api.v1.ChatService/SendMessage

# WebSocket connection
wscat -c "ws://localhost:8081/ws?room=general"
```

## Architecture Diagram

```
                    ┌─────────────────────┐
                    │   Chat Service      │
                    │  (bootstrap.App)    │
                    ├─────────────────────┤
  REST API ──────── │  HTTP :8080         │
                    │  ├─ POST /messages  │
                    │  └─ GET /messages   │
                    ├─────────────────────┤
  Internal calls ── │  gRPC :9090         │
                    │  └─ ChatService     │
                    ├─────────────────────┤
  Real-time push ── │  WebSocket :8081/ws │
                    │  └─ Hub.Broadcast   │
                    ├─────────────────────┤
                    │  PostgreSQL         │
                    │  Redis (Pub/Sub)    │
                    │  Consul (Registry)  │
                    └─────────────────────┘
```

## Related Documentation

- [Transport Abstraction](./core-transport.md)
- [Transport Protocol Plugins](./plugins-transport.md)
- [Message Broker Plugin](./plugins-broker.md)
- [Bootstrap Practical Examples](./bootstrap-examples.md)
