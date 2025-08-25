# URL映射修复文档

## 问题描述
用户点击历史记录中的图像时，系统尝试从不存在的本地API端点获取图像：
```
Sending image api-image-2047106819783748874-0 to edit...
Fetching image api-image-2047106819783748874-0 from API...
Failed to load resource: the server responded with a status of 404 (Not Found)
```

## 根本原因
1. `onSelectImage` 回调创建了虚拟文件名 `api-image-${item.id}-${index}`
2. `handleSendToEdit` 函数无法识别这些虚拟文件名对应的实际云端URL
3. 系统尝试从不存在的本地API端点 `/api/image/api-image-xxx` 获取图像

## 解决方案

### 1. 添加URL映射机制
在主页面状态中添加文件名到URL的映射：
```typescript
const [imageUrlMapping, setImageUrlMapping] = React.useState<Record<string, string>>({});
```

### 2. 修改 `handleSendToEdit` 函数
添加URL映射查找逻辑：
```typescript
const handleSendToEdit = async (filenameOrUrl: string) => {
    // 首先检查是否有URL映射（来自历史记录的虚拟文件名）
    let actualUrl = filenameOrUrl;
    if (imageUrlMapping[filenameOrUrl]) {
        actualUrl = imageUrlMapping[filenameOrUrl];
        console.log(`Found URL mapping: ${filenameOrUrl} -> ${actualUrl}`);
    }
    
    // 使用实际URL进行后续处理
    const isUrl = actualUrl.startsWith('http');
    // ...
}
```

### 3. 修改 `onSelectImage` 回调
创建文件名到URL的映射：
```typescript
onSelectImage={(item) => {
    const images = item.image_urls.map((url, index) => ({
        filename: `api-image-${item.id}-${index}`,
        url: url
    }));
    
    // 创建文件名到URL的映射
    const newMapping: Record<string, string> = {};
    images.forEach(img => {
        newMapping[img.filename] = img.url;
    });
    setImageUrlMapping(prevMapping => ({
        ...prevMapping,
        ...newMapping
    }));
    
    // 设置图像显示
    setLatestImageBatch(images.map(img => ({
        path: img.url,
        filename: img.filename
    })));
}}
```

## 工作流程

### 修复后的完整流程：
1. **历史记录加载**: API返回真实的云端图像URL
2. **图像选择**: 用户点击历史记录中的图像
3. **映射创建**: 系统创建虚拟文件名到真实URL的映射
4. **图像显示**: 使用真实URL显示图像
5. **发送编辑**: 用户点击"发送到编辑"按钮
6. **映射查找**: 系统查找虚拟文件名对应的真实URL
7. **图像下载**: 从真实URL下载图像数据
8. **编辑设置**: 将图像设置到编辑表单

### 数据流示例：
```
API数据: {
  image_urls: ["https://s3.20250131.xyz/gh/usst-502s/welcome/2025/8/1755847822846-382.png"]
}

↓ onSelectImage 处理

虚拟文件名: "api-image-2047106819783748874-0"
URL映射: {
  "api-image-2047106819783748874-0": "https://s3.20250131.xyz/gh/usst-502s/welcome/2025/8/1755847822846-382.png"
}

↓ handleSendToEdit 处理

实际URL: "https://s3.20250131.xyz/gh/usst-502s/welcome/2025/8/1755847822846-382.png"
```

## 测试验证

### 测试步骤：
1. **登录系统**: 确保有有效的JWT令牌
2. **查看历史**: 打开历史记录面板，确认有记录
3. **选择图像**: 点击任意历史记录的图像
4. **检查映射**: 在浏览器控制台查看URL映射日志
5. **发送编辑**: 点击图像下方的"Edit"按钮
6. **验证成功**: 确认图像成功加载到编辑表单

### 预期日志输出：
```
Found URL mapping: api-image-2047106819783748874-0 -> https://s3.20250131.xyz/gh/usst-502s/welcome/2025/8/1755847822846-382.png
Fetching image from URL: https://s3.20250131.xyz/gh/usst-502s/welcome/2025/8/1755847822846-382.png
Fetched image from URL: https://s3.20250131.xyz/gh/usst-502s/welcome/2025/8/1755847822846-382.png
Successfully set api-image-2047106819783748874-0 in edit form.
```

### 错误情况处理：
- ✅ 无效的虚拟文件名：回退到原始逻辑
- ✅ 网络连接问题：显示友好错误信息
- ✅ 图像格式不支持：显示格式错误信息

## 兼容性保证

### 支持的场景：
1. **云端图像**: 通过URL映射正确处理 ✅
2. **本地IndexedDB**: 直接使用原有逻辑 ✅
3. **本地文件系统**: 直接使用原有逻辑 ✅
4. **直接URL**: 直接处理，无需映射 ✅

### 向后兼容：
- 不影响现有的本地图像处理逻辑
- 不影响直接URL的处理
- 只为虚拟文件名添加映射机制

## 性能考虑

### 内存使用：
- URL映射存储在内存中
- 映射数据量很小（文件名 -> URL字符串）
- 不会显著影响性能

### 查找效率：
- O(1) 时间复杂度的哈希表查找
- 非常高效的映射查找

## 相关文件

### 修改的文件：
- `src/app/page.tsx`: 主页面逻辑

### 新增功能：
- URL映射状态管理
- 映射查找逻辑
- 改进的日志记录

### 测试文件：
- `URL_MAPPING_FIX.md`: 本文档

## 后续优化建议

1. **缓存优化**: 考虑添加LRU缓存限制映射大小
2. **持久化**: 考虑将映射保存到localStorage
3. **清理机制**: 定期清理不再使用的映射
4. **错误恢复**: 添加映射失效时的自动恢复机制
