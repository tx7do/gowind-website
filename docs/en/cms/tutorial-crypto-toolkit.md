# Encryption and Security Toolkit Tutorial

GoWind CMS shares the encryption toolkit of GoWind Admin, providing AES-GCM encryption, password hashing, API key management, and more. This tutorial explains the usage scenarios and implementation of encryption utilities in the CMS.

## Prerequisites

- Have read [CMS Backend Architecture Overview](./backend-architecture.md)
- It is recommended to read the [GoWind Admin Encryption Toolkit Tutorial](/en/admin/tutorial-crypto-toolkit.md) first

## 1. Encryption Scenarios

### 1.1 Encryption Needs in the CMS

| Scenario | Encryption Method | Description |
|------|---------|------|
| User passwords | bcrypt | Irreversible hashing |
| Sensitive configuration | AES-256-GCM | Reversible encryption |
| API keys | AES-256-GCM | Third-party API keys |
| Database connection passwords | AES-256-GCM | Configuration file encryption |
| Webhook signatures | HMAC-SHA256 | Message integrity |
| Session tokens | JWT + RSA | Identity verification |

## 2. AES-GCM Encryption

### 2.1 Encryption Utility

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
        return nil, errors.New("key must be 32 bytes")
    }
    return &AESGCM{key: []byte(key)}, nil
}

// Encrypt encrypts
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

// Decrypt decrypts
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
        return nil, errors.New("ciphertext too short")
    }

    nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
    return gcm.Open(nil, nonce, ciphertext, nil)
}
```

### 2.2 Configuration Encryption

```go
// Encrypt sensitive configuration
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

// Example: encrypt a third-party API key
apiKey := "sk-xxxxxxxxxxxxxxxxxxxx"
encrypted, _ := EncryptConfig(apiKey, config.EncryptionKey)
// Store encrypted in the database

// Decrypt when using it
decrypted, _ := aes.Decrypt(base64Decode(encrypted))
// decrypted = "sk-xxxxxxxxxxxxxxxxxxxx"
```

## 3. Password Hashing

### 3.1 bcrypt

```go
// Hash a user password
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
    return string(bytes), err
}

func VerifyPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

## 4. API Key Management

### 4.1 Generating an API Key

```go
// Generate an API key for a third-party system
func GenerateAPIKey() (string, string) {
    // Generate a random key
    apiKey := make([]byte, 32)
    rand.Read(apiKey)
    key := hex.EncodeToString(apiKey)

    // Generate a secret
    apiSecret := make([]byte, 64)
    rand.Read(apiSecret)
    secret := hex.EncodeToString(apiSecret)

    return key, secret
}
```

### 4.2 HMAC Signatures

```go
// Sign a webhook request
func SignRequest(secret string, payload []byte) string {
    h := hmac.New(sha256.New, []byte(secret))
    h.Write(payload)
    return hex.EncodeToString(h.Sum(nil))
}

// Verify a signature
func VerifySignature(secret string, payload []byte, signature string) bool {
    expected := SignRequest(secret, payload)
    return hmac.Equal([]byte(expected), []byte(signature))
}
```

## 5. Checklist

| Item | Description |
|--------|------|
| AES-GCM | Encryption of sensitive data |
| bcrypt | Password hashing |
| API keys | Key generation + HMAC signatures |
| Key management | Secure key storage |

## Related Documentation

- [CMS Backend Architecture Overview](./backend-architecture.md)
- [Dual-Client Login Security in Practice](./tutorial-login-security.md)
- [GoWind Admin Encryption Toolkit Tutorial](/en/admin/tutorial-crypto-toolkit.md)
