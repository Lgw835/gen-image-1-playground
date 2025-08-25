'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { formatTokenInfo } from '@/lib/jwt-utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, User, Shield, Info } from 'lucide-react';

interface AuthStatusProps {
    showDetails?: boolean;
    compact?: boolean;
}

export function AuthStatus({ showDetails = false, compact = false }: AuthStatusProps) {
    const { 
        isAuthenticated, 
        isLoading, 
        user, 
        tokenInfo, 
        clearToken,
        refreshTokenInfo 
    } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 animate-spin" />
                <span>检查认证状态...</span>
            </div>
        );
    }

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                {isAuthenticated ? (
                    <>
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            已认证
                        </Badge>
                        {user?.name && (
                            <span className="text-sm text-muted-foreground">
                                {user.name}
                            </span>
                        )}
                    </>
                ) : (
                    <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        未认证
                    </Badge>
                )}
            </div>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        认证状态
                    </CardTitle>
                    {isAuthenticated ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            已认证
                        </Badge>
                    ) : (
                        <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            未认证
                        </Badge>
                    )}
                </div>
                <CardDescription>
                    {isAuthenticated 
                        ? '您已通过JWT令牌成功认证' 
                        : '未检测到有效的认证令牌'
                    }
                </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
                {isAuthenticated && user && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                            <User className="h-4 w-4" />
                            用户信息
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {user.name && (
                                <div>
                                    <span className="text-muted-foreground">姓名:</span>
                                    <span className="ml-2 font-medium">{user.name}</span>
                                </div>
                            )}
                            {user.email && (
                                <div>
                                    <span className="text-muted-foreground">邮箱:</span>
                                    <span className="ml-2 font-medium">{user.email}</span>
                                </div>
                            )}
                            {user.role && (
                                <div>
                                    <span className="text-muted-foreground">角色:</span>
                                    <span className="ml-2 font-medium">{user.role}</span>
                                </div>
                            )}
                            {user.id && (
                                <div>
                                    <span className="text-muted-foreground">ID:</span>
                                    <span className="ml-2 font-mono text-xs">{user.id}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {tokenInfo && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">令牌状态</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-muted-foreground">状态:</span>
                                <span className={`ml-2 font-medium ${
                                    tokenInfo.isValid ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {tokenInfo.isValid ? '有效' : '无效'}
                                </span>
                            </div>
                            {tokenInfo.expiresAt && (
                                <div>
                                    <span className="text-muted-foreground">过期时间:</span>
                                    <span className="ml-2 font-medium text-xs">
                                        {tokenInfo.expiresAt.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!isAuthenticated && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>需要认证</AlertTitle>
                        <AlertDescription>
                            请通过包含token参数的URL访问此页面，例如：
                            <code className="block mt-2 p-2 bg-muted rounded text-xs">
                                http://localhost:3301/?token=your-jwt-token
                            </code>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex gap-2">
                    {isAuthenticated && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={clearToken}
                        >
                            清除令牌
                        </Button>
                    )}
                    
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={refreshTokenInfo}
                    >
                        刷新状态
                    </Button>

                    {showDetails && tokenInfo && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    详细信息
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>令牌详细信息</DialogTitle>
                                    <DialogDescription>
                                        JWT令牌的完整信息
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                                        {formatTokenInfo(tokenInfo)}
                                    </pre>
                                    {tokenInfo.payload && (
                                        <div>
                                            <h4 className="text-sm font-medium mb-2">原始Payload</h4>
                                            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                                                {JSON.stringify(tokenInfo.payload, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
