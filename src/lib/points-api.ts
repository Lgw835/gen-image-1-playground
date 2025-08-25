/**
 * 积分查询API工具函数
 * 用于调用后端积分相关接口
 */

// 管理后台URL，从环境变量获取，默认为localhost:8000
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:8000';

export interface PointsBalance {
    user_id: number;
    username: string;
    current_points: number;
    last_updated: string;
    today_usage: number;
    month_usage: number;
}

export interface PointsBalanceResponse {
    message: string;
    balance: PointsBalance;
}

export interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
    status_code?: number;
    detail?: string;
}

/**
 * 查询用户积分余额
 * @param token JWT访问令牌
 * @returns 积分余额信息
 */
export async function queryPointsBalance(token: string): Promise<PointsBalance> {
    const url = `${ADMIN_URL}/api/auth/points/balance/`;
    
    try {
        console.log('Querying points balance from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        console.log('Points balance response status:', response.status);

        if (!response.ok) {
            // 处理HTTP错误状态
            let errorMessage = `HTTP ${response.status}`;
            
            try {
                const errorData: ApiError = await response.json();
                errorMessage = errorData.message || errorData.detail || errorMessage;
                
                // 特殊处理认证错误
                if (response.status === 401) {
                    throw new Error('JWT令牌无效或已过期');
                }
                
                if (response.status === 403) {
                    throw new Error('权限不足，无法访问积分信息');
                }
                
                throw new Error(errorMessage);
            } catch {
                // 如果无法解析错误响应，使用默认错误信息
                if (response.status === 401) {
                    throw new Error('JWT令牌无效或已过期');
                }
                throw new Error(`服务器响应错误 (${response.status})`);
            }
        }

        const data: PointsBalanceResponse = await response.json();
        console.log('Points balance data received:', data);

        if (!data.balance) {
            throw new Error('服务器响应格式错误：缺少积分信息');
        }

        return data.balance;
    } catch (error) {
        console.error('Error querying points balance:', error);
        
        if (error instanceof Error) {
            throw error;
        }
        
        // 处理网络错误或其他未知错误
        throw new Error('网络连接失败，请检查网络连接或稍后重试');
    }
}

/**
 * 验证积分余额数据的有效性
 * @param balance 积分余额数据
 * @returns 是否有效
 */
export function validatePointsBalance(balance: PointsBalance): boolean {
    return (
        typeof balance.user_id === 'number' &&
        typeof balance.username === 'string' &&
        typeof balance.current_points === 'number' &&
        typeof balance.last_updated === 'string' &&
        typeof balance.today_usage === 'number' &&
        typeof balance.month_usage === 'number' &&
        balance.current_points >= 0 &&
        balance.today_usage >= 0 &&
        balance.month_usage >= 0
    );
}

/**
 * 格式化积分数值显示
 * @param points 积分数值
 * @returns 格式化后的字符串
 */
export function formatPoints(points: number): string {
    if (points >= 10000) {
        return `${(points / 10000).toFixed(1)}万`;
    }
    return points.toString();
}

/**
 * 格式化最后更新时间
 * @param lastUpdated ISO时间字符串
 * @returns 格式化后的时间字符串
 */
export function formatLastUpdated(lastUpdated: string): string {
    try {
        const date = new Date(lastUpdated);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return lastUpdated;
    }
}

/**
 * 图像上传到存储服务的响应接口
 */
export interface ImageUploadResponse {
    success: boolean;
    url: string;
}

/**
 * 图像生成记录接口（用于创建）
 */
export interface GenerationRecord {
    project_category: string;
    prompt: string;
    params: Record<string, any>;
    image_urls: string[];
    source_config_id: string;
    is_public: boolean;
    points_used: number;
}

/**
 * API返回的历史记录项接口
 */
export interface HistoryRecordItem {
    id: string;
    owner: number;
    owner_username: string;
    project_category: number;
    project_category_name: string;
    project_category_code: string;
    prompt: string;
    params: {
        n: number;
        size: string;
        model: string;
        prompt: string;
        quality: string;
        background: string;
        moderation: string;
        output_format: string;
    };
    image_urls: string[];
    thumbnail_url: string;
    source_config_id: number;
    is_public: boolean;
    visible_from: string | null;
    visible_to: string | null;
    created_at: string;
}

/**
 * API返回的历史记录响应接口
 */
export interface HistoryResponse {
    results: HistoryRecordItem[];
    category_info: {
        category_id: number;
        category_name: string;
        category_code: string;
        total_records: number;
        public_records: number;
    };
}

/**
 * 上传图像到存储服务
 * @param imageBlob 图像Blob数据
 * @param filename 文件名
 * @returns 上传后的URL
 */
export async function uploadImageToStorage(imageBlob: Blob, filename: string): Promise<string> {
    const STORAGE_URL = 'https://store.20250131.xyz/api/upload';

    try {
        // 将Blob转换为base64
        const base64Content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // 移除data:image/xxx;base64,前缀
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(imageBlob);
        });

        const response = await fetch(STORAGE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileName: filename,
                fileContent: base64Content
            })
        });

        if (!response.ok) {
            throw new Error(`图像上传失败: HTTP ${response.status}`);
        }

        const result: ImageUploadResponse = await response.json();

        if (!result.success || !result.url) {
            throw new Error('图像上传失败: 服务器响应无效');
        }

        console.log('Image uploaded successfully:', result.url);
        return result.url;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error(`图像上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
}

/**
 * 创建图像生成记录
 * @param token JWT访问令牌
 * @param record 生成记录数据
 * @returns 创建结果
 */
export async function createGenerationRecord(token: string, record: GenerationRecord): Promise<any> {
    const url = `${ADMIN_URL}/api/auth/generations/create/`;

    try {
        console.log('Creating generation record at URL:', url);
        console.log('Request payload:', JSON.stringify(record, null, 2));
        console.log('Authorization token length:', token ? token.length : 'No token');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(record)
        });

        console.log('Generation record response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            let errorDetails = null;

            try {
                const responseText = await response.text();
                console.log('Error response body:', responseText);

                // 尝试解析为JSON
                if (responseText) {
                    try {
                        const errorData = JSON.parse(responseText);
                        errorDetails = errorData;
                        errorMessage = errorData.message || errorData.detail || errorData.error || errorMessage;
                    } catch (parseError) {
                        console.log('Response is not valid JSON, using as text:', responseText);
                        errorMessage = responseText || errorMessage;
                    }
                }

                if (response.status === 401) {
                    throw new Error('JWT令牌无效或已过期');
                }

                if (response.status === 403) {
                    throw new Error('权限不足，无法创建生成记录');
                }

                if (response.status === 500) {
                    throw new Error(`服务器内部错误: ${errorMessage}`);
                }

                throw new Error(`${errorMessage} (状态码: ${response.status})`);
            } catch (parseError) {
                console.error('Error parsing error response:', parseError);
                if (response.status === 401) {
                    throw new Error('JWT令牌无效或已过期');
                }
                throw new Error(`服务器响应错误 (${response.status})`);
            }
        }

        const result = await response.json();
        console.log('Generation record created successfully:', result);
        return result;
    } catch (error) {
        console.error('Error creating generation record:', error);

        if (error instanceof Error) {
            throw error;
        }

        throw new Error('网络连接失败，请检查网络连接或稍后重试');
    }
}

/**
 * 获取历史记录
 * @param token JWT访问令牌
 * @returns 历史记录数据
 */
export async function getHistoryRecords(token: string): Promise<HistoryResponse> {
    const url = `${ADMIN_URL}/api/auth/generations/category/6734285177059253106/`;

    try {
        console.log('Fetching history records from:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            }
        });

        console.log('History records response status:', response.status);

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;

            try {
                const responseText = await response.text();
                console.log('Error response body:', responseText);

                if (responseText) {
                    try {
                        const errorData = JSON.parse(responseText);
                        errorMessage = errorData.message || errorData.detail || errorData.error || errorMessage;
                    } catch (parseError) {
                        errorMessage = responseText || errorMessage;
                    }
                }

                if (response.status === 401) {
                    throw new Error('JWT令牌无效或已过期');
                }

                if (response.status === 403) {
                    throw new Error('权限不足，无法获取历史记录');
                }

                throw new Error(`获取历史记录失败: ${errorMessage}`);
            } catch (parseError) {
                if (response.status === 401) {
                    throw new Error('JWT令牌无效或已过期');
                }
                throw new Error(`服务器响应错误 (${response.status})`);
            }
        }

        const result: HistoryResponse = await response.json();
        console.log('History records fetched successfully:', result.results.length, 'records');
        return result;
    } catch (error) {
        console.error('Error fetching history records:', error);

        if (error instanceof Error) {
            throw error;
        }

        throw new Error('网络连接失败，请检查网络连接或稍后重试');
    }
}

/**
 * 删除生成记录
 * @param token JWT访问令牌
 * @param recordId 记录ID
 * @returns 删除结果
 */
export async function deleteGenerationRecord(token: string, recordId: string): Promise<any> {
    const url = `${ADMIN_URL}/api/auth/generations/${recordId}/`;

    try {
        console.log('Deleting generation record:', recordId);

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
            }
        });

        console.log('Delete record response status:', response.status);

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;

            try {
                const responseText = await response.text();
                console.log('Delete error response body:', responseText);

                if (responseText) {
                    try {
                        const errorData = JSON.parse(responseText);
                        errorMessage = errorData.message || errorData.detail || errorData.error || errorMessage;
                    } catch (parseError) {
                        errorMessage = responseText || errorMessage;
                    }
                }

                if (response.status === 401) {
                    throw new Error('JWT令牌无效或已过期');
                }

                if (response.status === 403) {
                    throw new Error('权限不足，无法删除记录');
                }

                if (response.status === 404) {
                    throw new Error('记录不存在或已被删除');
                }

                throw new Error(`删除记录失败: ${errorMessage}`);
            } catch (parseError) {
                if (response.status === 401) {
                    throw new Error('JWT令牌无效或已过期');
                }
                throw new Error(`服务器响应错误 (${response.status})`);
            }
        }

        // DELETE请求可能返回空响应
        let result = null;
        const responseText = await response.text();
        if (responseText) {
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                // 忽略解析错误，DELETE成功即可
            }
        }

        console.log('Generation record deleted successfully:', recordId);
        return result;
    } catch (error) {
        console.error('Error deleting generation record:', error);

        if (error instanceof Error) {
            throw error;
        }

        throw new Error('网络连接失败，请检查网络连接或稍后重试');
    }
}
