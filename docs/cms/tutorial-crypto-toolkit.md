# 加密与安全工具实战教程

GoWind CMS 共享 GoWind Admin 的加密工具包，提供 AES-GCM 加密、密码哈希、API 密钥管理等功能。本教程讲解 CMS 中加密工具的使用场景和实现方法。

## 前置条件

- 已阅读 [CMS 后端架构总览](./backend-architecture.md)
- 建议先阅读 [GoWind Admin 加密工具教程](/admin/tutorial-crypto-toolkit.md)

## 一、加密场景

### 1.1 CMS 中的加密需求

| 场景 | 加密方式 | 说明 |
|------|---------|------|
| 用户密码 | bcrypt | 不可逆哈希 |
| 敏感配置 | AES-256-GCM | 可逆加密 |
| API 密钥 | AES-256-GCM | 第三方 API Key |
| 数据库连接密码 | AES-256-GCM | 配置文件加密 |
| Webhook 签名 | HMAC-SHA256 | 消息完整性 |
| 会话 Token | JWT + RSA | 身份验证 |

## 二、AES-GCM 加密

### 2.1 加密工具

```go
// pkg/crypto/aes.go
package crypto

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "errors"
    "io"
)

type AESGCM struct {
    key []byte
}

func NewAESGCM(key string) (*AESGCM, error) {
    if len(key) != 32 {
        return nil, errors.New("密钥必须是 32 字节")
    }
    return &AESGCM{key: []byte(key)}, nil
}

// Encrypt 加密
func (a *AESGCM) Encrypt(plaintext []byte) ([]byte, error) {
    block, err := aes.NewCipher(a.key)
    if err != nil {
        return nil, err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }

    nonce := make([]byte, gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return nil, err
    }

    return gcm.Seal(nonce, nonce, plaintext, nil), nil
}

// Decrypt 解密
func (a *AESGCM) Decrypt(ciphertext []byte) ([]byte, error) {
    block, err := aes.NewCipher(a.key)
    if err != nil {
        return nil, err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }

    nonceSize := gcm.NonceSize()
    if len(ciphertext) < nonceSize {
        return nil, errors.New("密文太短")
    }

    nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
    return gcm.Open(nil, nonce, ciphertext, nil)
}
```

### 2.2 配置加密

```go
// 加密敏感配置
func EncryptConfig(rawConfig string, encryptionKey string) (string, error) {
    aes, err := crypto.NewAESGCM(encryptionKey)
    if err != nil {
        return "", err
    }
    encrypted, err := aes.Encrypt([]byte(rawConfig))
    if err != nil {
        return "", err
    }
    return base64.StdEncoding.EncodeToString(encrypted), nil
}

// 使用示例：加密第三方 API Key
apiKey := "sk-xxxxxxxxxxxxxxxxxxxx"
encrypted, _ := EncryptConfig(apiKey, config.EncryptionKey)
// 将 encrypted 存入数据库

// 使用时解密
decrypted, _ := aes.Decrypt(base64Decode(encrypted))
// decrypted = "sk-xxxxxxxxxxxxxxxxxxxx"
```

## 三、密码哈希

### 3.1 bcrypt

```go
// 用户密码哈希
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
    return string(bytes), err
}

func VerifyPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

## 四、API 密钥管理

### 4.1 生成 API Key

```go
// 为第三方系统生成 API Key
func GenerateAPIKey() (string, string) {
    // 生成随机 key
    apiKey := make([]byte, 32)
    rand.Read(apiKey)
    key := hex.EncodeToString(apiKey)

    // 生成 secret
    apiSecret := make([]byte, 64)
    rand.Read(apiSecret)
    secret := hex.EncodeToString(apiSecret)

    return key, secret
}
```

### 4.2 HMAC 签名

```go
// Webhook 请求签名
func SignRequest(secret string, payload []byte) string {
    h := hmac.New(sha256.New, []byte(secret))
    h.Write(payload)
    return hex.EncodeToString(h.Sum(nil))
}

// 验证签名
func VerifySignature(secret string, payload []byte, signature string) bool {
    expected := SignRequest(secret, payload)
    return hmac.Equal([]byte(expected), []byte(signature))
}
```

## 五、检查清单

| 检查项 | 说明 |
|--------|------|
| AES-GCM | 敏感数据加密 |
| bcrypt | 密码哈希 |
| API Key | 密钥生成 + HMAC 签名 |
| 密钥管理 | 密钥安全存储 |

## 相关文档

- [CMS 后端架构总览](./backend-architecture.md)
- [双端登录安全实战](./tutorial-login-security.md)
- [GoWind Admin 加密工具教程](/admin/tutorial-crypto-toolkit.md)
