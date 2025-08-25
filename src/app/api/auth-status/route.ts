import { NextResponse } from 'next/server';

export async function GET() {
    // 系统配置状态检查
    const configured = !!process.env.OPENAI_API_KEY;
    
    return NextResponse.json({ 
        passwordRequired: false, // 不再需要密码
        directConfigMode: true,  // 始终使用JWT认证模式
        configured
    });
}
