/**
 * JWT 令牌处理工具函数
 * 用于解析、验证和管理用户访问令牌
 */

export interface JWTPayload {
    sub?: string; // 用户ID
    email?: string; // 用户邮箱
    name?: string; // 用户名
    role?: string; // 用户角色
    exp?: number; // 过期时间
    iat?: number; // 签发时间
    [key: string]: any; // 其他自定义字段
}

export interface TokenInfo {
    token: string;
    payload: JWTPayload | null;
    isValid: boolean;
    isExpired: boolean;
    expiresAt: Date | null;
    issuedAt: Date | null;
}

/**
 * 解析JWT令牌（不验证签名，仅解析payload）
 * @param token JWT令牌字符串
 * @returns 解析后的payload或null
 */
export function parseJWTPayload(token: string): JWTPayload | null {
    try {
        // JWT格式：header.payload.signature
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.warn('Invalid JWT format: token must have 3 parts');
            return null;
        }

        // 解码payload部分（Base64URL）
        const payload = parts[1];
        const decodedPayload = base64UrlDecode(payload);
        
        return JSON.parse(decodedPayload) as JWTPayload;
    } catch (error) {
        console.error('Error parsing JWT payload:', error);
        return null;
    }
}

/**
 * 检查JWT令牌是否过期
 * @param payload JWT payload
 * @returns 是否过期
 */
export function isTokenExpired(payload: JWTPayload | null): boolean {
    if (!payload || !payload.exp) {
        return true; // 没有过期时间视为已过期
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
}

/**
 * 获取令牌的完整信息
 * @param token JWT令牌字符串
 * @returns 令牌信息对象
 */
export function getTokenInfo(token: string): TokenInfo {
    const payload = parseJWTPayload(token);
    const isExpired = isTokenExpired(payload);
    const isValid = payload !== null && !isExpired;

    return {
        token,
        payload,
        isValid,
        isExpired,
        expiresAt: payload?.exp ? new Date(payload.exp * 1000) : null,
        issuedAt: payload?.iat ? new Date(payload.iat * 1000) : null,
    };
}

/**
 * Base64URL解码
 * @param str Base64URL编码的字符串
 * @returns 解码后的字符串
 */
function base64UrlDecode(str: string): string {
    // 将Base64URL转换为标准Base64
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // 添加必要的填充
    const padding = base64.length % 4;
    if (padding) {
        base64 += '='.repeat(4 - padding);
    }

    // 解码Base64
    try {
        return atob(base64);
    } catch (error) {
        throw new Error('Invalid Base64URL encoding');
    }
}

/**
 * 从URL查询参数中提取token
 * @param url 完整URL或查询字符串
 * @returns token字符串或null
 */
export function extractTokenFromUrl(url?: string): string | null {
    try {
        let searchParams: URLSearchParams;
        
        if (url) {
            // 如果提供了URL，解析它
            const urlObj = new URL(url);
            searchParams = urlObj.searchParams;
        } else {
            // 否则使用当前页面的查询参数
            searchParams = new URLSearchParams(window.location.search);
        }

        return searchParams.get('token');
    } catch (error) {
        console.error('Error extracting token from URL:', error);
        return null;
    }
}

/**
 * 清理URL中的token参数
 * @returns 清理后的URL
 */
export function cleanTokenFromUrl(): string {
    try {
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        return url.toString();
    } catch (error) {
        console.error('Error cleaning token from URL:', error);
        return window.location.href;
    }
}

/**
 * 格式化令牌信息用于显示
 * @param tokenInfo 令牌信息
 * @returns 格式化的字符串
 */
export function formatTokenInfo(tokenInfo: TokenInfo): string {
    if (!tokenInfo.payload) {
        return 'Invalid token';
    }

    const lines = [
        `Status: ${tokenInfo.isValid ? 'Valid' : 'Invalid'}`,
        `User: ${tokenInfo.payload.name || tokenInfo.payload.email || tokenInfo.payload.sub || 'Unknown'}`,
        `Role: ${tokenInfo.payload.role || 'Not specified'}`,
        `Issued: ${tokenInfo.issuedAt ? tokenInfo.issuedAt.toLocaleString() : 'Unknown'}`,
        `Expires: ${tokenInfo.expiresAt ? tokenInfo.expiresAt.toLocaleString() : 'Never'}`,
    ];

    return lines.join('\n');
}
