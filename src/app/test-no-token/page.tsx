'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, AlertTriangle } from 'lucide-react';

export default function TestNoTokenPage() {
    const testUrls = [
        {
            name: '无token测试',
            url: 'http://localhost:3302/',
            description: '直接访问主页面，不带任何token参数'
        },
        {
            name: '空token测试',
            url: 'http://localhost:3302/?token=',
            description: '带空的token参数'
        },
        {
            name: '无效token测试',
            url: 'http://localhost:3302/?token=invalid_token',
            description: '带无效的token参数'
        },
        {
            name: '过期token测试',
            url: 'http://localhost:3302/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid',
            description: '带过期的token参数'
        }
    ];

    const openTestUrl = (url: string) => {
        window.open(url, '_blank');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        无Token错误处理测试
                    </h1>
                    <p className="text-gray-600">
                        测试在没有有效JWT令牌时的错误处理行为
                    </p>
                </div>

                <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                        <strong>预期行为</strong>: 点击下面的测试链接后，应该只显示红色错误弹窗，不加载任何页面内容。
                        弹窗不能通过点击外部区域关闭，只能点击"刷新页面"按钮。
                    </AlertDescription>
                </Alert>

                <div className="grid gap-4">
                    {testUrls.map((test, index) => (
                        <Card key={index}>
                            <CardHeader>
                                <CardTitle className="text-lg">{test.name}</CardTitle>
                                <CardDescription>{test.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-gray-100 p-3 rounded-md font-mono text-sm break-all">
                                    {test.url}
                                </div>
                                <Button
                                    onClick={() => openTestUrl(test.url)}
                                    className="flex items-center gap-2"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    在新窗口中测试
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>测试检查清单</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <input type="checkbox" className="mt-1" />
                                <div>
                                    <strong>错误弹窗显示</strong>
                                    <p className="text-sm text-gray-600">页面应该显示红色的认证错误弹窗</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                                <input type="checkbox" className="mt-1" />
                                <div>
                                    <strong>页面内容隐藏</strong>
                                    <p className="text-sm text-gray-600">除了错误弹窗外，不应该显示任何页面内容（表单、按钮等）</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                                <input type="checkbox" className="mt-1" />
                                <div>
                                    <strong>弹窗无法关闭</strong>
                                    <p className="text-sm text-gray-600">点击弹窗外部区域或ESC键不能关闭弹窗</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                                <input type="checkbox" className="mt-1" />
                                <div>
                                    <strong>刷新按钮工作</strong>
                                    <p className="text-sm text-gray-600">点击"刷新页面"按钮能够重新加载页面</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                                <input type="checkbox" className="mt-1" />
                                <div>
                                    <strong>错误信息准确</strong>
                                    <p className="text-sm text-gray-600">弹窗显示的错误信息应该准确描述问题</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>控制台日志检查</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-600 mb-3">
                            打开浏览器开发者工具的Console标签，应该看到以下日志：
                        </p>
                        <div className="bg-gray-900 text-green-400 p-3 rounded-md font-mono text-sm">
                            <div>No token found in URL</div>
                            <div>Error during auth initialization: ...</div>
                        </div>
                    </CardContent>
                </Card>

                <div className="text-center">
                    <Button
                        onClick={() => window.location.href = '/get-started'}
                        variant="outline"
                    >
                        返回测试页面
                    </Button>
                </div>
            </div>
        </div>
    );
}
