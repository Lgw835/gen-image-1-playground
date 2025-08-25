'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    extractTokenFromUrl,
    getTokenInfo,
    cleanTokenFromUrl,
    type TokenInfo
} from '@/lib/jwt-utils';
import {
    queryPointsBalance,
    validatePointsBalance,
    type PointsBalance
} from '@/lib/points-api';

interface AuthContextType {
    // 令牌状态
    token: string | null;
    tokenInfo: TokenInfo | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // 用户信息
    user: {
        id?: string;
        email?: string;
        name?: string;
        role?: string;
    } | null;

    // 积分信息
    pointsBalance: PointsBalance | null;
    pointsLoading: boolean;
    pointsError: string | null;

    // 认证错误
    authError: string | null;

    // 方法
    setToken: (token: string | null) => void;
    clearToken: () => void;
    refreshTokenInfo: () => void;
    refreshPointsBalance: () => Promise<void>;
    clearAuthError: () => void;
    deductPoints: (points: number) => void;

    // 令牌验证
    isTokenValid: () => boolean;
    getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [token, setTokenState] = useState<string | null>(null);
    const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 积分相关状态
    const [pointsBalance, setPointsBalance] = useState<PointsBalance | null>(null);
    const [pointsLoading, setPointsLoading] = useState(false);
    const [pointsError, setPointsError] = useState<string | null>(null);

    // 认证错误状态
    const [authError, setAuthError] = useState<string | null>(null);

    // 从令牌信息中提取用户信息
    const user = React.useMemo(() => {
        if (!tokenInfo?.payload) return null;
        
        const payload = tokenInfo.payload;
        return {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            role: payload.role,
        };
    }, [tokenInfo]);

    // 检查是否已认证
    const isAuthenticated = React.useMemo(() => {
        return tokenInfo?.isValid === true;
    }, [tokenInfo]);

    // 更新令牌信息
    const refreshTokenInfo = useCallback(() => {
        if (token) {
            const info = getTokenInfo(token);
            setTokenInfo(info);
            
            // 如果令牌无效，清除它
            if (!info.isValid) {
                console.warn('Token is invalid, clearing...');
                setTokenState(null);
                setTokenInfo(null);
            }
        } else {
            setTokenInfo(null);
        }
    }, [token]);

    // 设置令牌
    const setToken = useCallback((newToken: string | null) => {
        setTokenState(newToken);

        if (newToken) {
            // 存储到localStorage
            localStorage.setItem('auth_token', newToken);
            console.log('Token saved to localStorage');
        } else {
            // 从localStorage中移除
            localStorage.removeItem('auth_token');
            console.log('Token removed from localStorage');
        }
    }, []);

    // 清除令牌
    const clearToken = useCallback(() => {
        setTokenState(null);
        setTokenInfo(null);
        setPointsBalance(null);
        setPointsError(null);
        setAuthError(null);
        console.log('Token and all auth data cleared');
    }, []);

    // 检查令牌是否有效
    const isTokenValid = useCallback(() => {
        return tokenInfo?.isValid === true;
    }, [tokenInfo]);

    // 获取认证头
    const getAuthHeaders = useCallback((): Record<string, string> => {
        if (!token || !isTokenValid()) {
            return {};
        }

        return {
            'Authorization': `Bearer ${token}`,
        };
    }, [token, isTokenValid]);

    // 查询积分余额
    const refreshPointsBalance = useCallback(async () => {
        if (!token || !isTokenValid()) {
            setPointsError('无效的认证令牌');
            return;
        }

        setPointsLoading(true);
        setPointsError(null);

        try {
            console.log('Querying points balance...');
            const balance = await queryPointsBalance(token);

            if (!validatePointsBalance(balance)) {
                throw new Error('服务器返回的积分数据格式无效');
            }

            setPointsBalance(balance);
            console.log('Points balance loaded successfully:', balance);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '查询积分余额失败';
            console.error('Error querying points balance:', errorMessage);
            setPointsError(errorMessage);

            // 如果是认证错误，设置认证错误状态
            if (errorMessage.includes('JWT令牌无效') || errorMessage.includes('已过期')) {
                setAuthError('JWT令牌无效或已过期，请刷新页面重新认证');
            }
        } finally {
            setPointsLoading(false);
        }
    }, [token, isTokenValid]);

    // 清除认证错误
    const clearAuthError = useCallback(() => {
        setAuthError(null);
    }, []);

    // 扣除积分（本地更新，实际扣除由后端处理）
    const deductPoints = useCallback((points: number) => {
        setPointsBalance(prevBalance => {
            if (!prevBalance) return null;

            const newBalance = {
                ...prevBalance,
                current_points: Math.max(0, prevBalance.current_points - points),
                today_usage: prevBalance.today_usage + points,
                last_updated: new Date().toISOString()
            };

            console.log(`Points deducted: ${points}, new balance: ${newBalance.current_points}`);
            return newBalance;
        });
    }, []);

    // 初始化：从URL中提取令牌
    useEffect(() => {
        const initializeAuth = () => {
            setIsLoading(true);
            
            try {
                // 尝试从URL中提取令牌
                const urlToken = extractTokenFromUrl();
                
                if (urlToken) {
                    console.log('Token found in URL, processing...');
                    setToken(urlToken);

                    // 清理URL中的token参数
                    const cleanUrl = cleanTokenFromUrl();
                    window.history.replaceState({}, document.title, cleanUrl);

                    console.log('Token extracted and URL cleaned');
                } else {
                    console.log('No token found in URL');
                    setAuthError('未检测到有效的JWT令牌，请刷新页面重新认证');
                }
            } catch (error) {
                console.error('Error during auth initialization:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAuth();
    }, [setToken]);

    // 当令牌变化时，更新令牌信息
    useEffect(() => {
        refreshTokenInfo();
    }, [refreshTokenInfo]);

    // 当认证成功时，自动查询积分余额
    useEffect(() => {
        if (isAuthenticated && token && !pointsBalance && !pointsLoading) {
            console.log('Authentication successful, querying points balance...');
            refreshPointsBalance();
        }
    }, [isAuthenticated, token, pointsBalance, pointsLoading, refreshPointsBalance]);

    // 定期检查令牌是否过期
    useEffect(() => {
        if (!token || !tokenInfo) return;

        const checkTokenExpiry = () => {
            if (tokenInfo.isExpired) {
                console.warn('Token has expired, clearing...');
                clearToken();
            }
        };

        // 立即检查一次
        checkTokenExpiry();

        // 每分钟检查一次
        const interval = setInterval(checkTokenExpiry, 60000);

        return () => clearInterval(interval);
    }, [token, tokenInfo, clearToken]);

    // 初始化时从localStorage获取令牌
    useEffect(() => {
        const savedToken = localStorage.getItem('auth_token');
        if (savedToken) {
            console.log('Loading token from localStorage...');
            setToken(savedToken);
        }
        setIsLoading(false);
    }, [setToken]);

    // 监听页面可见性变化，重新验证令牌
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && token) {
                refreshTokenInfo();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [token, refreshTokenInfo]);

    const contextValue: AuthContextType = {
        token,
        tokenInfo,
        isAuthenticated,
        isLoading,
        user,
        pointsBalance,
        pointsLoading,
        pointsError,
        authError,
        setToken,
        clearToken,
        refreshTokenInfo,
        refreshPointsBalance,
        clearAuthError,
        deductPoints,
        isTokenValid,
        getAuthHeaders,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook for using auth context
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
