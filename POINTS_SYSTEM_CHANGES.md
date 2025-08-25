# 积分系统实现总结

## 概述
已成功将图像生成系统从美元计费改为积分制，实现了完整的积分管理功能。

## 主要修改

### 1. 积分API扩展 (`src/lib/points-api.ts`)
- ✅ 添加了图像上传到存储服务的功能 (`uploadImageToStorage`)
- ✅ 添加了创建生成记录的功能 (`createGenerationRecord`)
- ✅ 支持上传图像到 `https://store.20250131.xyz/api/upload`
- ✅ 支持调用 `/api/auth/generations/create/` 接口存储记录

### 2. 认证上下文增强 (`src/contexts/auth-context.tsx`)
- ✅ 添加了 `deductPoints` 方法用于本地积分扣除
- ✅ 实现了积分余额的实时更新

### 3. 主页面逻辑修改 (`src/app/page.tsx`)
- ✅ 添加了积分检查：生成前验证用户积分是否足够
- ✅ 实现了积分扣除：生成成功后自动扣除相应积分
- ✅ 集成了图像上传和记录存储功能
- ✅ 添加了积分余额显示界面
- ✅ 修改了历史记录结构，支持积分字段

### 4. 界面组件更新

#### 历史面板 (`src/components/history-panel.tsx`)
- ✅ 将美元显示替换为积分显示
- ✅ 修改了总成本摘要为总积分摘要
- ✅ 更新了单个项目的积分详情对话框
- ✅ 支持向后兼容（自动转换旧的美元记录为积分）

#### 生成表单 (`src/components/generation-form.tsx`)
- ✅ 添加了预估积分消耗显示
- ✅ 实时计算并显示所需积分

#### 编辑表单 (`src/components/editing-form.tsx`)
- ✅ 添加了预估积分消耗显示
- ✅ 实时计算并显示所需积分

### 5. 积分计算规则
- **低质量**: 20积分/张
- **标准质量**: 80积分/张  
- **高质量**: 140积分/张
- **自动质量**: 按标准质量计算（80积分/张）

### 6. 美元转积分规则
- 按照 `0.061元 = 61积分` 的比例
- 1美元 ≈ 1000积分（向上取整）

## 功能流程

### 图像生成流程
1. **积分检查**: 计算所需积分，验证用户余额
2. **生成请求**: 如果积分足够，发送OpenAI API请求
3. **图像处理**: 生成成功后处理图像数据
4. **图像上传**: 将图像上传到存储服务获取URL
5. **记录存储**: 调用后端API存储生成记录
6. **积分扣除**: 从用户积分余额中扣除相应积分
7. **界面更新**: 更新历史记录和积分显示

### 错误处理
- ✅ 积分不足时显示详细错误信息
- ✅ 图像上传失败时的降级处理
- ✅ 记录存储失败时的错误提示
- ✅ 网络错误的友好提示

## 向后兼容性
- ✅ 保留了原有的 `costDetails` 字段
- ✅ 自动将旧的美元记录转换为积分显示
- ✅ 支持混合显示新旧记录

## 配置要求

### 环境变量
- `ADMIN_URL`: 后端管理系统地址（默认: http://localhost:8000）
- `OPENAI_API_KEY`: OpenAI API密钥

### 后端API接口
- `GET /api/auth/points/balance/`: 查询积分余额
- `POST /api/auth/generations/create/`: 创建生成记录

#### 生成记录API格式
调用 `POST /api/auth/generations/create/` 接口的请求格式：
```json
{
    "project_category": "6734285177059253106",
    "prompt": "用户输入的提示词",
    "params": {
        "model": "gpt-image-1",
        "prompt": "用户输入的提示词",
        "n": 1,
        "size": "auto",
        "quality": "standard",
        "output_format": "png",
        "background": "transparent",
        "moderation": "auto"
    },
    "image_urls": [
        "https://store.20250131.xyz/uploaded-image-url-1.png"
    ],
    "source_config_id": 1870234794176292672,
    "is_public": false,
    "points_used": 80
}
```

### 存储服务
- `POST https://store.20250131.xyz/api/upload`: 图像上传接口

## 测试验证
- ✅ 创建了测试文件验证积分计算逻辑
- ✅ 所有积分计算和转换功能正常工作
- ✅ 格式化显示功能正确

## 注意事项
1. 图像会同时保存在本地和云存储
2. 积分扣除是在生成成功后进行的
3. 如果记录存储失败，不会影响图像生成和显示
4. 系统支持实时积分余额更新
5. 所有积分相关的错误都有中文提示

## 问题解决记录

### JWT认证问题
**问题**: 图像生成成功但记录保存失败，返回500错误
**原因**: JWT令牌未正确设置，导致API调用时认证失败
**解决方案**:
1. 实现了JWT令牌的localStorage持久化存储
2. 添加了登录提示组件，用户可以手动输入JWT令牌
3. 在未认证时显示友好的登录界面

### 认证系统改进
- ✅ JWT令牌持久化存储到localStorage
- ✅ 添加了登录提示组件 (`src/components/login-prompt.tsx`)
- ✅ 未认证时显示登录界面而不是错误
- ✅ 认证成功后自动显示积分余额
- ✅ API调用返回201状态码确认系统正常

### 历史记录系统重构
**重大改进**: 将历史记录从本地存储改为API获取
- ✅ 创建了新的API历史面板组件 (`src/components/api-history-panel.tsx`)
- ✅ 添加了获取历史记录API (`getHistoryRecords`)
- ✅ 添加了删除记录API (`deleteGenerationRecord`)
- ✅ 移除了本地图像保存逻辑，图像只保存在云端
- ✅ 实现了从API数据到界面显示的完整流程

**API接口**:
- `GET /api/auth/generations/category/6734285177059253106/`: 获取历史记录
- `DELETE /api/auth/generations/{id}/`: 删除指定记录

**界面改进**:
- 历史记录实时从服务器获取
- 支持删除单条记录
- 显示积分消耗详情
- 图像直接从云端URL显示
- 移除了"Edit"和"Create"标签
- 优化了参数信息显示

**图像配置问题解决**:
- ✅ 在 `next.config.ts` 中配置了外部图像域名 `s3.20250131.xyz`
- ✅ 使用普通 `<img>` 标签替代Next.js Image组件作为备用方案
- ✅ 添加了图像加载错误处理
- ✅ 创建了详细的配置测试文档 (`IMAGE_CONFIG_TEST.md`)

**发送到编辑功能修复**:
- ✅ 修复了"获取图像失败: Not Found"错误
- ✅ 修改 `handleSendToEdit` 函数支持云端图像URL
- ✅ 在历史面板中添加了"发送到编辑"按钮
- ✅ 实现了云端图像到编辑界面的完整流程
- ✅ 保持了对本地存储的向后兼容性
- ✅ 创建了详细的修复文档 (`SEND_TO_EDIT_FIX.md`)

**URL映射机制实现**:
- ✅ 添加了虚拟文件名到真实URL的映射机制
- ✅ 修复了虚拟文件名 `api-image-xxx` 无法找到对应URL的问题
- ✅ 实现了O(1)时间复杂度的高效URL查找
- ✅ 保证了完整的向后兼容性
- ✅ 创建了详细的技术文档 (`URL_MAPPING_FIX.md`)

## 下一步建议
1. 建议添加积分充值功能
2. 可以考虑添加积分使用历史查询
3. 建议添加积分不足时的充值引导
4. 可以考虑添加积分预警功能
5. 建议实现JWT令牌自动刷新机制
6. 建议添加历史记录分页功能
7. 可以考虑添加历史记录搜索和筛选功能
