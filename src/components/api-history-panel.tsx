'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    Copy,
    Check,
    Layers,
    Coins,
    Sparkles as SparklesIcon,
    Trash2,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import { formatPointsDisplay, convertUsdToPoints } from '@/lib/points-utils';
import { getHistoryRecords, deleteGenerationRecord, type HistoryRecordItem, type HistoryResponse } from '@/lib/points-api';
import { useAuth } from '@/contexts/auth-context';
// import Image from 'next/image'; // 暂时不使用Next.js Image组件，避免域名配置问题

type ApiHistoryPanelProps = {
    onSelectImage?: (item: HistoryRecordItem) => void;
};

export function ApiHistoryPanel({ onSelectImage }: ApiHistoryPanelProps) {
    const { token, isAuthenticated } = useAuth();
    const [historyData, setHistoryData] = useState<HistoryResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
    const [openPointsDialogId, setOpenPointsDialogId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // 获取历史记录
    const fetchHistory = async () => {
        if (!token || !isAuthenticated) {
            setError('用户未认证');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const data = await getHistoryRecords(token);
            setHistoryData(data);
            console.log('History data loaded:', data.results.length, 'records');
        } catch (err) {
            console.error('Failed to fetch history:', err);
            setError(err instanceof Error ? err.message : '获取历史记录失败');
        } finally {
            setIsLoading(false);
        }
    };

    // 删除记录
    const handleDelete = async (recordId: string) => {
        if (!token || !isAuthenticated) {
            setError('用户未认证');
            return;
        }

        setDeletingId(recordId);

        try {
            await deleteGenerationRecord(token, recordId);
            console.log('Record deleted successfully:', recordId);
            
            // 重新获取历史记录
            await fetchHistory();
        } catch (err) {
            console.error('Failed to delete record:', err);
            setError(err instanceof Error ? err.message : '删除记录失败');
        } finally {
            setDeletingId(null);
        }
    };

    // 复制提示词
    const handleCopyPrompt = async (prompt: string) => {
        try {
            await navigator.clipboard.writeText(prompt);
            setCopiedPrompt(prompt);
            setTimeout(() => setCopiedPrompt(null), 2000);
        } catch (err) {
            console.error('Failed to copy prompt:', err);
        }
    };

    // 初始加载
    useEffect(() => {
        if (isAuthenticated && token) {
            fetchHistory();
        }
    }, [isAuthenticated, token]);

    // 计算积分消耗
    const calculatePoints = (params: HistoryRecordItem['params']) => {
        const quality = params.quality || 'standard';
        const n = params.n || 1;
        
        let pointsPerImage = 80; // 默认标准质量
        if (quality === 'low') pointsPerImage = 20;
        else if (quality === 'high') pointsPerImage = 140;
        
        return pointsPerImage * n;
    };

    if (!isAuthenticated) {
        return (
            <Card className='h-full bg-neutral-900 border-neutral-700'>
                <CardHeader>
                    <CardTitle className='text-white'>历史记录</CardTitle>
                </CardHeader>
                <CardContent className='flex items-center justify-center h-64'>
                    <p className='text-neutral-400'>请先登录以查看历史记录</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className='h-full bg-neutral-900 border-neutral-700'>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-white'>历史记录</CardTitle>
                <div className='flex items-center gap-2'>
                    {historyData && (
                        <span className='text-sm text-neutral-400'>
                            共 {historyData.category_info.total_records} 条记录
                        </span>
                    )}
                    <Button
                        variant='outline'
                        size='sm'
                        onClick={fetchHistory}
                        disabled={isLoading}
                        className='border-neutral-600 text-neutral-300 hover:bg-neutral-800'
                    >
                        <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto p-6'>
                {error && (
                    <div className='flex items-center gap-2 p-3 bg-red-900/20 border border-red-700 rounded-lg'>
                        <AlertCircle className='h-4 w-4 text-red-400' />
                        <span className='text-red-300 text-sm'>{error}</span>
                    </div>
                )}

                {isLoading && (
                    <div className='flex items-center justify-center h-32'>
                        <div className='flex items-center gap-2 text-neutral-400'>
                            <RefreshCw className='h-4 w-4 animate-spin' />
                            <span>加载中...</span>
                        </div>
                    </div>
                )}

                {historyData && historyData.results.length === 0 && !isLoading && (
                    <div className='flex items-center justify-center h-32'>
                        <p className='text-neutral-400'>暂无历史记录</p>
                    </div>
                )}

                {historyData?.results.map((item) => {
                    const points = calculatePoints(item.params);
                    const createdDate = new Date(item.created_at);
                    
                    return (
                        <div
                            key={item.id}
                            className='relative group border border-neutral-600/60 rounded-xl p-3 hover:border-neutral-500 hover:bg-neutral-800/60 transition-all duration-300 bg-gradient-to-br from-neutral-800/30 to-neutral-900/40 shadow-lg hover:shadow-xl'
                        >
                            {/* 图像显示区域 */}
                            <div className='flex flex-col gap-3'>
                                {/* 图像 */}
                                <div className='relative w-full'>
                                    <div className='w-full aspect-square relative rounded-lg overflow-hidden bg-neutral-800/60 border border-neutral-500/60 shadow-lg'>
                                        {item.image_urls[0] && (
                                            <img
                                                src={item.image_urls[0]}
                                                alt={item.prompt}
                                                className='w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform'
                                                onClick={() => onSelectImage?.(item)}
                                                onError={(e) => {
                                                    console.error('Failed to load image:', item.image_urls[0]);
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        )}
                                    </div>
                                    
                                    {/* 积分显示 */}
                                    <Dialog
                                        open={openPointsDialogId === item.id}
                                        onOpenChange={(isOpen) => !isOpen && setOpenPointsDialogId(null)}
                                    >
                                        <DialogTrigger asChild>
                                            <button
                                                onClick={() => setOpenPointsDialogId(item.id)}
                                                className='absolute top-1 right-1 flex items-center gap-0.5 rounded-full bg-blue-600/80 px-1.5 py-0.5 text-[11px] text-white transition-colors hover:bg-blue-500/90'
                                            >
                                                <Coins size={12} />
                                                {formatPointsDisplay(points)}
                                            </button>
                                        </DialogTrigger>
                                        <DialogContent className='border-neutral-700 bg-neutral-900 text-white sm:max-w-[450px]'>
                                            <DialogHeader>
                                                <DialogTitle className='text-white'>积分消耗详情</DialogTitle>
                                            </DialogHeader>
                                            <div className='space-y-2 py-4 text-sm text-neutral-300'>
                                                <div className='flex justify-between'>
                                                    <span>图像质量:</span>
                                                    <span>{item.params.quality}</span>
                                                </div>
                                                <div className='flex justify-between'>
                                                    <span>图像数量:</span>
                                                    <span>{item.params.n}张</span>
                                                </div>
                                                <div className='flex justify-between'>
                                                    <span>单张积分:</span>
                                                    <span>{formatPointsDisplay(Math.round(points / item.params.n))}</span>
                                                </div>
                                                <hr className='my-2 border-neutral-700' />
                                                <div className='flex justify-between font-medium text-white'>
                                                    <span>总积分消耗:</span>
                                                    <span>{formatPointsDisplay(points)}</span>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                {/* 信息区域 */}
                                <div className='w-full'>
                                    <div className='space-y-2 text-center px-2'>
                                         <div className='w-full'>
                                             <p className='text-white text-sm md:text-xs font-bold line-clamp-2 mb-2 leading-relaxed px-1'>
                                                 {item.prompt}
                                             </p>
                                             <div className='text-[11px] md:text-[10px] text-neutral-300 space-y-1 font-medium'>
                                                <div className='flex items-center justify-center gap-2 md:gap-4 flex-wrap'>
                                                    <span className='font-semibold'>尺寸: <span className='font-normal'>{item.params.size}</span></span>
                                                    <span className='font-semibold'>格式: <span className='font-normal'>{item.params.output_format}</span></span>
                                                </div>
                                                <div className='flex items-center justify-center gap-2 md:gap-4 flex-wrap'>
                                                    <span className='font-semibold'>背景: <span className='font-normal'>{item.params.background}</span></span>
                                                    <span className='font-semibold'>时间: <span className='font-normal'>{createdDate.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 操作按钮 */}
                                        <div className='flex items-center justify-center gap-2'>
                                            <Button
                                                variant='ghost'
                                                size='sm'
                                                onClick={() => handleCopyPrompt(item.prompt)}
                                                className='h-6 w-6 p-0 text-neutral-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-all duration-200'
                                                title='复制提示词'
                                            >
                                                {copiedPrompt === item.prompt ? (
                                                    <Check size={12} />
                                                ) : (
                                                    <Copy size={12} />
                                                )}
                                            </Button>

                                            <Button
                                                variant='ghost'
                                                size='sm'
                                                onClick={() => handleDelete(item.id)}
                                                disabled={deletingId === item.id}
                                                className='h-6 w-6 p-0 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all duration-200'
                                                title='删除记录'
                                            >
                                                <Trash2 size={12} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
