'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle,
    DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';

interface AuthErrorDialogProps {
    /** 是否显示对话框 */
    isOpen?: boolean;
    /** 对话框开关状态变化回调 */
    onOpenChange?: (open: boolean) => void;
    /** 是否允许手动关闭对话框 */
    allowClose?: boolean;
}

export function AuthErrorDialog({ 
    isOpen, 
    onOpenChange,
    allowClose = false 
}: AuthErrorDialogProps) {
    const { authError, pointsError, clearAuthError, isAuthenticated } = useAuth();

    // 确定是否应该显示对话框
    const shouldShow = isOpen !== undefined ? isOpen : (!!authError || !!pointsError);
    
    // 确定错误信息
    const errorMessage = authError || pointsError || '认证失败，请刷新页面重新认证';

    // 处理刷新页面
    const handleRefresh = () => {
        window.location.reload();
    };

    // 处理关闭对话框
    const handleClose = (open: boolean) => {
        if (allowClose && !open) {
            clearAuthError();
            onOpenChange?.(false);
        }
    };

    // 如果没有错误且已认证，不显示对话框
    if (!shouldShow) {
        return null;
    }

    return (
        <Dialog
            open={shouldShow}
            onOpenChange={allowClose ? handleClose : () => {}}
        >
            <DialogContent className="border-red-200 bg-white text-gray-900 sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-5 w-5" />
                        认证失败
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                        页面访问需要有效的JWT令牌认证
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Alert className="border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                            {errorMessage}
                        </AlertDescription>
                    </Alert>

                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                        <p>可能的原因：</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>JWT令牌无效或已过期</li>
                            <li>网络连接问题</li>
                            <li>服务器暂时不可用</li>
                            <li>URL中缺少必要的认证参数</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter className="flex gap-2">
                    {allowClose && (
                        <Button 
                            variant="outline" 
                            onClick={() => handleClose(false)}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                            取消
                        </Button>
                    )}
                    <Button 
                        onClick={handleRefresh}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        刷新页面
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * 自动显示认证错误的对话框组件
 * 当存在认证错误时自动显示，不允许手动关闭
 */
export function AutoAuthErrorDialog() {
    return <AuthErrorDialog allowClose={false} />;
}
