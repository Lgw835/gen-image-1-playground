# JWT 令牌存储与管理文档

## 概述

本项目实现了一个完整的JWT令牌处理系统，用于在iframe嵌入场景下接收和管理用户访问令牌。令牌通过URL参数传递，并存储在React内存中进行管理。

## 功能特性

### 🔐 令牌处理
- **URL参数提取**: 自动从URL查询参数中提取`token`参数
- **JWT解析**: 解析JWT令牌的payload部分（不验证签名）
- **令牌验证**: 检查令牌格式和过期时间
- **URL清理**: 提取令牌后自动清理URL中的敏感参数

### 💾 存储策略
- **内存存储**: 令牌存储在React Context中，页面刷新后需重新传递
- **安全考虑**: 不将令牌存储在localStorage或sessionStorage中，避免XSS攻击
- **自动清理**: 令牌过期时自动清除

### 🔄 状态管理
- **实时监控**: 定期检查令牌是否过期
- **页面可见性**: 页面重新获得焦点时重新验证令牌
- **状态同步**: 全局状态管理，所有组件可访问认证状态

## 技术实现

### 核心文件结构

```
src/
├── lib/
│   └── jwt-utils.ts          # JWT工具函数
├── contexts/
│   └── auth-context.tsx      # 认证上下文
├── components/
│   └── auth-status.tsx       # 认证状态显示组件
└── app/
    ├── layout.tsx            # 根布局（包含AuthProvider）
    └── page.tsx              # 主页面（使用认证功能）
```

### 主要组件

#### 1. JWT工具函数 (`jwt-utils.ts`)

```typescript
// 主要功能
- parseJWTPayload(token: string): JWTPayload | null
- isTokenExpired(payload: JWTPayload): boolean
- getTokenInfo(token: string): TokenInfo
- extractTokenFromUrl(url?: string): string | null
- cleanTokenFromUrl(): string
```

#### 2. 认证上下文 (`auth-context.tsx`)

```typescript
interface AuthContextType {
    token: string | null;
    tokenInfo: TokenInfo | null;
    isAuthenticated: boolean;
    user: UserInfo | null;
    setToken: (token: string | null) => void;
    clearToken: () => void;
    getAuthHeaders: () => Record<string, string>;
}
```

#### 3. 认证状态组件 (`auth-status.tsx`)

提供用户友好的认证状态显示界面，包括：
- 认证状态指示器
- 用户信息显示
- 令牌详细信息
- 操作按钮（清除令牌、刷新状态等）

## 使用方法

### 1. 基本集成

项目已经完全集成了JWT认证系统，无需额外配置。

### 2. URL访问示例

```bash
# 带令牌的访问URL
http://localhost:3301/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 系统会自动：
# 1. 提取token参数
# 2. 解析JWT payload
# 3. 验证令牌有效性
# 4. 清理URL参数
# 5. 存储到内存中
```

### 3. 在组件中使用认证

```typescript
import { useAuth } from '@/contexts/auth-context';

function MyComponent() {
    const { 
        isAuthenticated, 
        user, 
        token, 
        getAuthHeaders 
    } = useAuth();

    // 检查认证状态
    if (!isAuthenticated) {
        return <div>请先登录</div>;
    }

    // 使用用户信息
    return <div>欢迎, {user?.name}</div>;
}
```

### 4. API请求中使用令牌

```typescript
const { getAuthHeaders } = useAuth();

// 在API请求中包含认证头
const response = await fetch('/api/protected', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(), // 自动添加 Authorization: Bearer <token>
    },
    body: JSON.stringify(data),
});
```

## JWT Payload 结构

系统支持标准JWT字段和自定义字段：

```typescript
interface JWTPayload {
    sub?: string;     // 用户ID
    email?: string;   // 用户邮箱
    name?: string;    // 用户名
    role?: string;    // 用户角色
    exp?: number;     // 过期时间（Unix时间戳）
    iat?: number;     // 签发时间（Unix时间戳）
    [key: string]: any; // 其他自定义字段
}
```

## 安全考虑

### ✅ 安全措施
- **内存存储**: 令牌仅存储在内存中，页面关闭后自动清除
- **URL清理**: 提取令牌后立即清理URL参数，避免令牌泄露
- **过期检查**: 定期检查令牌是否过期，过期后自动清除
- **HTTPS推荐**: 生产环境建议使用HTTPS传输令牌

### ⚠️ 注意事项
- **不验证签名**: 当前实现仅解析JWT payload，不验证签名
- **客户端验证**: 所有验证都在客户端进行，服务端应独立验证
- **令牌刷新**: 系统不处理令牌刷新，需要重新传递新令牌

## iframe 嵌入场景

### 父页面传递令牌

```javascript
// 父页面代码
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const iframeUrl = `http://localhost:3301/?token=${encodeURIComponent(token)}`;

document.getElementById('myIframe').src = iframeUrl;
```

### 动态更新令牌

```javascript
// 父页面可以通过postMessage发送新令牌
const iframe = document.getElementById('myIframe');
iframe.contentWindow.postMessage({
    type: 'UPDATE_TOKEN',
    token: newToken
}, 'http://localhost:3301');
```

## 故障排除

### 常见问题

1. **令牌无法识别**
   - 检查URL格式是否正确
   - 确认token参数是否存在
   - 验证JWT格式是否正确

2. **令牌过期**
   - 检查JWT的exp字段
   - 确认系统时间是否正确
   - 重新获取有效令牌

3. **认证状态不更新**
   - 检查AuthProvider是否正确包装应用
   - 确认useAuth hook是否在正确的组件树中使用

### 调试信息

系统会在浏览器控制台输出详细的调试信息：

```
Token found in URL, processing...
Token extracted and URL cleaned
Token set in memory
API call attempt 1/3
```

## 扩展功能

### 可选增强

1. **令牌刷新**: 实现自动令牌刷新机制
2. **签名验证**: 添加JWT签名验证功能
3. **权限控制**: 基于用户角色的权限管理
4. **审计日志**: 记录认证相关操作

### 自定义配置

可以通过环境变量配置系统行为：

```env
# .env.local
NEXT_PUBLIC_JWT_AUTO_REFRESH=true
NEXT_PUBLIC_JWT_REFRESH_THRESHOLD=300  # 5分钟前开始刷新
NEXT_PUBLIC_JWT_DEBUG=true             # 启用调试模式
```

## 更新日志

- **v1.0.0** (2025-08-21): 初始版本，实现基本JWT令牌处理功能
- 支持URL参数提取和内存存储
- 提供完整的React Context集成
- 包含用户友好的状态显示界面
