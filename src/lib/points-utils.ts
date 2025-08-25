/**
 * 积分计算和验证工具函数
 * 用于处理图像生成的积分消耗计算和余额验证
 */

import { type GenerationFormData, type EditingFormData } from '@/components/generation-form';

// 积分消耗标准（按图片质量）
export const POINTS_COST = {
    low: 20,      // 低质量：20积分
    standard: 80, // 标准质量：80积分  
    high: 140     // 高质量：140积分
} as const;

export type QualityLevel = keyof typeof POINTS_COST;

/**
 * 根据质量参数获取质量等级
 * @param quality 质量参数
 * @returns 质量等级
 */
export function getQualityLevel(quality: string): QualityLevel {
    switch (quality) {
        case 'low':
            return 'low';
        case 'high':
            return 'high';
        case 'standard':
        case 'auto':
        default:
            return 'standard';
    }
}

/**
 * 计算单张图片的积分消耗
 * @param quality 图片质量
 * @returns 积分消耗
 */
export function calculatePointsPerImage(quality: string): number {
    const qualityLevel = getQualityLevel(quality);
    return POINTS_COST[qualityLevel];
}

/**
 * 计算总积分消耗
 * @param quality 图片质量
 * @param imageCount 图片数量
 * @returns 总积分消耗
 */
export function calculateTotalPoints(quality: string, imageCount: number): number {
    const pointsPerImage = calculatePointsPerImage(quality);
    return pointsPerImage * imageCount;
}

/**
 * 从表单数据计算积分消耗
 * @param formData 表单数据
 * @returns 积分消耗
 */
export function calculatePointsFromFormData(formData: GenerationFormData | EditingFormData): number {
    const quality = formData.quality || 'standard';
    const imageCount = formData.n || 1;
    return calculateTotalPoints(quality, imageCount);
}

/**
 * 验证用户积分是否足够
 * @param currentPoints 当前积分
 * @param requiredPoints 需要的积分
 * @returns 是否足够
 */
export function hasEnoughPoints(currentPoints: number, requiredPoints: number): boolean {
    return currentPoints >= requiredPoints;
}

/**
 * 格式化积分显示
 * @param points 积分数值
 * @returns 格式化后的字符串
 */
export function formatPointsDisplay(points: number): string {
    if (points >= 10000) {
        return `${(points / 10000).toFixed(1)}万积分`;
    }
    return `${points}积分`;
}

/**
 * 将美元金额转换为积分（向上取整）
 * @param usdAmount 美元金额
 * @returns 积分数量
 */
export function convertUsdToPoints(usdAmount: number): number {
    // 0.061元 = 61积分，所以 1美元 ≈ 1000积分（向上取整）
    const points = Math.ceil(usdAmount * 1000);
    return points;
}

/**
 * 获取积分不足的错误消息
 * @param currentPoints 当前积分
 * @param requiredPoints 需要的积分
 * @returns 错误消息
 */
export function getInsufficientPointsMessage(currentPoints: number, requiredPoints: number): string {
    const shortage = requiredPoints - currentPoints;
    return `积分余额不足！当前积分：${formatPointsDisplay(currentPoints)}，需要积分：${formatPointsDisplay(requiredPoints)}，还需要：${formatPointsDisplay(shortage)}`;
}

/**
 * 获取质量等级的中文描述
 * @param quality 质量参数
 * @returns 中文描述
 */
export function getQualityDescription(quality: string): string {
    const qualityLevel = getQualityLevel(quality);
    switch (qualityLevel) {
        case 'low':
            return '低质量';
        case 'high':
            return '高质量';
        case 'standard':
        default:
            return '标准质量';
    }
}

/**
 * 获取积分消耗详情
 * @param formData 表单数据
 * @returns 积分消耗详情
 */
export interface PointsConsumptionDetails {
    quality: string;
    qualityDescription: string;
    imageCount: number;
    pointsPerImage: number;
    totalPoints: number;
}

export function getPointsConsumptionDetails(formData: GenerationFormData | EditingFormData): PointsConsumptionDetails {
    const quality = formData.quality || 'standard';
    const imageCount = formData.n || 1;
    const pointsPerImage = calculatePointsPerImage(quality);
    const totalPoints = calculateTotalPoints(quality, imageCount);

    return {
        quality,
        qualityDescription: getQualityDescription(quality),
        imageCount,
        pointsPerImage,
        totalPoints
    };
}
