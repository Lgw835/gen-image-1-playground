'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/auth-context';
import { Key, AlertCircle, CheckCircle } from 'lucide-react';

export function LoginPrompt() {
    const { setToken, isAuthenticated, authError } = useAuth();
    const [tokenInput, setTokenInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!tokenInput.trim()) {
            setSubmitError('请输入JWT令牌');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            // 设置令牌
            setToken(tokenInput.trim());
            
            // 给一点时间让认证上下文处理令牌
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('JWT token set successfully');
        } catch (error) {
            console.error('Error setting token:', error);
            setSubmitError('设置令牌时出错，请检查令牌格式');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isAuthenticated) {
        return (
            <Card className="w-full max-w-md mx-auto bg-green-50 border-green-200">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle size={20} />
                        <span className="font-medium">认证成功</span>
                    </div>
                    <p className="text-sm text-green-600 mt-2">
                        您已成功登录，可以开始使用图像生成功能。
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                    <Key className="h-8 w-8 text-blue-500" />
                </div>
                <CardTitle className="text-xl">身份认证</CardTitle>
                <CardDescription>
                    请输入您的JWT访问令牌以使用图像生成功能
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                            JWT令牌
                        </label>
                        <Textarea
                            id="token"
                            value={tokenInput}
                            onChange={(e) => setTokenInput(e.target.value)}
                            placeholder="请粘贴您的JWT令牌..."
                            className="min-h-[120px] font-mono text-sm"
                            disabled={isSubmitting}
                        />
                    </div>

                    {(submitError || authError) && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {submitError || authError}
                            </AlertDescription>
                        </Alert>
                    )}

                    <Button 
                        type="submit" 
                        className="w-full"
                        disabled={isSubmitting || !tokenInput.trim()}
                    >
                        {isSubmitting ? '验证中...' : '设置令牌'}
                    </Button>
                </form>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700">
                        <strong>提示：</strong> JWT令牌用于身份认证和积分管理。
                        令牌将安全保存在浏览器本地存储中。
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
