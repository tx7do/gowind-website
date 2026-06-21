# 多协议同时监听教程

本教程展示如何在一个 GoWind 服务中同时运行 HTTP、gRPC 和 WebSocket 三种协议。

## 场景

一个在线聊天服务需要：
- HTTP：REST API（用户注册、登录、获取历史消息）
- gRPC：内部服务间调用（用户服务、通知服务）
- WebSocket：实时消息推送（客户端长连接）

## 第一步：配置文件

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
  redis:                    # 用 Redis Pub/Sub 做消息分发
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

## 第二步：定义 Protobuf

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

## 第三步：WebSocket Hub

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

## 第四步：消息处理

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

    // 存储到数据库
    s.db.Message.Create().
        SetID(msg.ID).
        SetRoomID(roomID).
        SetUserID(userID).
        SetContent(content).
        Save(ctx)

    // 通过 WebSocket 推送给当前房间的在线用户
    data, _ := json.Marshal(msg)
    s.hub.Broadcast(roomID, data)

    // 同时发布到 Broker（跨实例推送）
    s.broker.Publish(ctx, "chat.messages", &broker.Message{Body: data})

    return msg, nil
}
```

## 第五步：HTTP Handler

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

## 第六步：gRPC Handler

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
    // 服务端流式推送
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

## 第七步：组装

```go
// internal/app.go
package internal

func init() {
    bootstrap.OnReady(func(app *bootstrap.App) {
        hub := ws.NewHub()
        chatSvc := service.NewChatService(app.DB(), hub, app.Broker())

        // HTTP 路由
        mux := http.NewServeMux()
        httpHandler := handler.NewHTTPHandler(chatSvc)
        for pattern, h := range httpHandler.Routes() {
            mux.HandleFunc(pattern, h)
        }
        app.SetHTTPHandler(mux)

        // gRPC 服务注册
        grpcHandler := handler.NewGRPCChatHandler(chatSvc)
        app.RegisterGRPC(func(s *grpc.Server) {
            pb.RegisterChatServiceServer(s, grpcHandler)
        })

        // WebSocket 处理器
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

## 第八步：入口

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

## 运行效果

```bash
# HTTP API
curl -X POST http://localhost:8080/api/rooms/general/messages \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"content":"Hello!"}'

# gRPC 调用
grpcurl -plaintext -d '{"room_id":"general","content":"Hi from gRPC"}' \
  localhost:9090 api.v1.ChatService/SendMessage

# WebSocket 连接
wscat -c "ws://localhost:8081/ws?room=general"
```

## 架构图

```
                    ┌─────────────────────┐
                    │   Chat Service      │
                    │  (bootstrap.App)    │
                    ├─────────────────────┤
  REST API ──────── │  HTTP :8080         │
                    │  ├─ POST /messages  │
                    │  └─ GET /messages   │
                    ├─────────────────────┤
  内部调用 ──────── │  gRPC :9090         │
                    │  └─ ChatService     │
                    ├─────────────────────┤
  实时推送 ──────── │  WebSocket :8081/ws │
                    │  └─ Hub.Broadcast   │
                    ├─────────────────────┤
                    │  PostgreSQL         │
                    │  Redis (Pub/Sub)    │
                    │  Consul (Registry)  │
                    └─────────────────────┘
```

## 相关文档

- [Transport 抽象](./core-transport.md)
- [传输协议插件](./plugins-transport.md)
- [消息中间件插件](./plugins-broker.md)
- [Bootstrap 实战示例](./bootstrap-examples.md)
