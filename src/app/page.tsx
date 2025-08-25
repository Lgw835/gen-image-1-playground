'use client';

import { EditingForm, type EditingFormData } from '@/components/editing-form';
import { GenerationForm, type GenerationFormData } from '@/components/generation-form';
import { ApiHistoryPanel } from '@/components/api-history-panel';
import { ImageOutput } from '@/components/image-output';
import { AutoAuthErrorDialog } from '@/components/auth-error-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { calculateApiCost, type CostDetails } from '@/lib/cost-utils';
import { db, type ImageRecord } from '@/lib/db';
import { useAuth } from '@/contexts/auth-context';
import {
    calculatePointsFromFormData,
    hasEnoughPoints,
    getInsufficientPointsMessage,
    formatPointsDisplay,
    convertUsdToPoints
} from '@/lib/points-utils';
import { uploadImageToStorage, createGenerationRecord } from '@/lib/points-api';
import { LoginPrompt } from '@/components/login-prompt';
import { useLiveQuery } from 'dexie-react-hooks';
import * as React from 'react';

type HistoryImage = {
    filename: string;
};

export type HistoryMetadata = {
    timestamp: number;
    images: HistoryImage[];
    storageModeUsed?: 'fs' | 'indexeddb';
    durationMs: number;
    quality: GenerationFormData['quality'];
    background: GenerationFormData['background'];
    moderation: GenerationFormData['moderation'];
    prompt: string;
    mode: 'generate' | 'edit';
    costDetails: CostDetails | null; // 保留用于向后兼容
    pointsUsed?: number; // 新增积分消耗字段
    output_format?: GenerationFormData['output_format'];
};

type DrawnPoint = {
    x: number;
    y: number;
    size: number;
};

const MAX_EDIT_IMAGES = 10;

// 简化存储模式，只使用文件系统模式
const effectiveStorageModeClient: 'fs' = 'fs';
console.log(`Client Effective Storage Mode: ${effectiveStorageModeClient}`);

type ApiImageResponseItem = {
    filename: string;
    b64_json?: string;
    output_format: string;
    path?: string;
};

export default function HomePage() {
    // 使用认证上下文
    const { isAuthenticated, authError, pointsBalance, deductPoints, token, getAuthHeaders } = useAuth();

    const [mode, setMode] = React.useState<'generate' | 'edit'>('generate');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSendingToEdit, setIsSendingToEdit] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [latestImageBatch, setLatestImageBatch] = React.useState<{ path: string; filename: string }[] | null>(null);
    const [imageUrlMapping, setImageUrlMapping] = React.useState<Record<string, string>>({});
    const [imageOutputView, setImageOutputView] = React.useState<'grid' | number>('grid');
    const [history, setHistory] = React.useState<HistoryMetadata[]>([]);
    const [isInitialLoad, setIsInitialLoad] = React.useState(true);
    const [blobUrlCache, setBlobUrlCache] = React.useState<Record<string, string>>({});
    const [skipDeleteConfirmation, setSkipDeleteConfirmation] = React.useState<boolean>(false);
    const [itemToDeleteConfirm, setItemToDeleteConfirm] = React.useState<HistoryMetadata | null>(null);
    const [dialogCheckboxStateSkipConfirm, setDialogCheckboxStateSkipConfirm] = React.useState<boolean>(false);

    const allDbImages = useLiveQuery<ImageRecord[] | undefined>(() => db.images.toArray(), []);

    const [editImageFiles, setEditImageFiles] = React.useState<File[]>([]);
    const [editSourceImagePreviewUrls, setEditSourceImagePreviewUrls] = React.useState<string[]>([]);
    const [editPrompt, setEditPrompt] = React.useState('');
    const [editN, setEditN] = React.useState([1]);
    const [editSize, setEditSize] = React.useState<EditingFormData['size']>('auto');
    const [editQuality, setEditQuality] = React.useState<EditingFormData['quality']>('auto');
    const [editBrushSize, setEditBrushSize] = React.useState([20]);
    const [editShowMaskEditor, setEditShowMaskEditor] = React.useState(false);
    const [editGeneratedMaskFile, setEditGeneratedMaskFile] = React.useState<File | null>(null);
    const [editIsMaskSaved, setEditIsMaskSaved] = React.useState(false);
    const [editOriginalImageSize, setEditOriginalImageSize] = React.useState<{ width: number; height: number } | null>(
        null
    );
    const [editDrawnPoints, setEditDrawnPoints] = React.useState<DrawnPoint[]>([]);
    const [editMaskPreviewUrl, setEditMaskPreviewUrl] = React.useState<string | null>(null);

    const [genPrompt, setGenPrompt] = React.useState('');
    const [genN, setGenN] = React.useState([1]);
    const [genSize, setGenSize] = React.useState<GenerationFormData['size']>('auto');
    const [genQuality, setGenQuality] = React.useState<GenerationFormData['quality']>('auto');
    const [genOutputFormat, setGenOutputFormat] = React.useState<GenerationFormData['output_format']>('png');
    const [genCompression, setGenCompression] = React.useState([100]);
    const [genBackground, setGenBackground] = React.useState<GenerationFormData['background']>('auto');
    const [genModeration, setGenModeration] = React.useState<GenerationFormData['moderation']>('auto');

    const getImageSrc = React.useCallback(
        (filename: string): string | undefined => {
            if (blobUrlCache[filename]) {
                return blobUrlCache[filename];
            }

            const record = allDbImages?.find((img) => img.filename === filename);
            if (record?.blob) {
                const url = URL.createObjectURL(record.blob);

                return url;
            }

            return undefined;
        },
        [allDbImages, blobUrlCache]
    );

    React.useEffect(() => {
        return () => {
            console.log('Revoking blob URLs:', Object.keys(blobUrlCache).length);
            Object.values(blobUrlCache).forEach((url) => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [blobUrlCache]);

    React.useEffect(() => {
        return () => {
            editSourceImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [editSourceImagePreviewUrls]);

    React.useEffect(() => {
        try {
            const storedHistory = localStorage.getItem('openaiImageHistory');
            if (storedHistory) {
                const parsedHistory: HistoryMetadata[] = JSON.parse(storedHistory);
                if (Array.isArray(parsedHistory)) {
                    setHistory(parsedHistory);
                } else {
                    console.warn('Invalid history data found in localStorage.');
                    localStorage.removeItem('openaiImageHistory');
                }
            }
        } catch (e) {
            console.error('Failed to load or parse history from localStorage:', e);
            localStorage.removeItem('openaiImageHistory');
        }
        setIsInitialLoad(false);
    }, []);

    // 移除了密码相关的认证状态检查

    React.useEffect(() => {
        if (!isInitialLoad) {
            try {
                localStorage.setItem('openaiImageHistory', JSON.stringify(history));
            } catch (e) {
                console.error('Failed to save history to localStorage:', e);
            }
        }
    }, [history, isInitialLoad]);

    React.useEffect(() => {
        return () => {
            editSourceImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [editSourceImagePreviewUrls]);

    React.useEffect(() => {
        const storedPref = localStorage.getItem('imageGenSkipDeleteConfirm');
        if (storedPref === 'true') {
            setSkipDeleteConfirmation(true);
        } else if (storedPref === 'false') {
            setSkipDeleteConfirmation(false);
        }
    }, []);

    React.useEffect(() => {
        localStorage.setItem('imageGenSkipDeleteConfirm', String(skipDeleteConfirmation));
    }, [skipDeleteConfirmation]);

    React.useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            if (mode !== 'edit' || !event.clipboardData) {
                return;
            }

            if (editImageFiles.length >= MAX_EDIT_IMAGES) {
                alert(`Cannot paste: Maximum of ${MAX_EDIT_IMAGES} images reached.`);
                return;
            }

            const items = event.clipboardData.items;
            let imageFound = false;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        event.preventDefault();
                        imageFound = true;

                        const previewUrl = URL.createObjectURL(file);

                        setEditImageFiles((prevFiles) => [...prevFiles, file]);
                        setEditSourceImagePreviewUrls((prevUrls) => [...prevUrls, previewUrl]);

                        console.log('Pasted image added:', file.name);

                        break;
                    }
                }
            }
            if (!imageFound) {
                console.log('Paste event did not contain a recognized image file.');
            }
        };

        window.addEventListener('paste', handlePaste);

        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [mode, editImageFiles.length]);



    const getMimeTypeFromFormat = (format: string): string => {
        if (format === 'jpeg') return 'image/jpeg';
        if (format === 'webp') return 'image/webp';

        return 'image/png';
    };

    const handleApiCall = async (formData: GenerationFormData | EditingFormData) => {
        const startTime = Date.now();
        let durationMs = 0;

        // 检查用户认证状态
        if (!isAuthenticated || !token) {
            setError('用户未认证，请刷新页面重新登录');
            return;
        }

        // 计算所需积分
        const requiredPoints = calculatePointsFromFormData(formData);

        // 检查积分余额
        if (!pointsBalance) {
            setError('无法获取积分余额信息，请刷新页面重试');
            return;
        }

        if (!hasEnoughPoints(pointsBalance.current_points, requiredPoints)) {
            setError(getInsufficientPointsMessage(pointsBalance.current_points, requiredPoints));
            return;
        }

        console.log(`积分检查通过: 当前积分 ${pointsBalance.current_points}, 需要积分 ${requiredPoints}`);

        setIsLoading(true);
        setError(null);
        setLatestImageBatch(null);
        setImageOutputView('grid');

        const apiFormData = new FormData();
        apiFormData.append('mode', mode);

        if (mode === 'generate') {
            const genData = formData as GenerationFormData;
            apiFormData.append('prompt', genPrompt);
            apiFormData.append('n', genN[0].toString());
            apiFormData.append('size', genSize);
            apiFormData.append('quality', genQuality);
            apiFormData.append('output_format', genOutputFormat);
            if (
                (genOutputFormat === 'jpeg' || genOutputFormat === 'webp') &&
                genData.output_compression !== undefined
            ) {
                apiFormData.append('output_compression', genData.output_compression.toString());
            }
            apiFormData.append('background', genBackground);
            apiFormData.append('moderation', genModeration);
        } else {
            apiFormData.append('prompt', editPrompt);
            apiFormData.append('n', editN[0].toString());
            apiFormData.append('size', editSize);
            apiFormData.append('quality', editQuality);

            editImageFiles.forEach((file, index) => {
                apiFormData.append(`image_${index}`, file, file.name);
            });
            if (editGeneratedMaskFile) {
                apiFormData.append('mask', editGeneratedMaskFile, editGeneratedMaskFile.name);
            }
        }

        console.log('Sending request to /api/images with mode:', mode);

        try {
            const response = await fetch('/api/images', {
                method: 'POST',
                headers: {
                    ...getAuthHeaders()
                },
                body: apiFormData
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    setError('未授权：用户身份验证失败，请刷新页面重新登录。');
                    return;
                }
                throw new Error(result.error || `API 请求失败，状态码 ${response.status}`);
            }

            console.log('API Response:', result);

            if (result.images && result.images.length > 0) {
                durationMs = Date.now() - startTime;
                console.log(`API call successful. Duration: ${durationMs}ms`);

                let historyQuality: GenerationFormData['quality'] = 'auto';
                let historyBackground: GenerationFormData['background'] = 'auto';
                let historyModeration: GenerationFormData['moderation'] = 'auto';
                let historyOutputFormat: GenerationFormData['output_format'] = 'png';
                let historyPrompt: string = '';

                if (mode === 'generate') {
                    historyQuality = genQuality;
                    historyBackground = genBackground;
                    historyModeration = genModeration;
                    historyOutputFormat = genOutputFormat;
                    historyPrompt = genPrompt;
                } else {
                    historyQuality = editQuality;
                    historyBackground = 'auto';
                    historyModeration = 'auto';
                    historyOutputFormat = 'png';
                    historyPrompt = editPrompt;
                }

                const costDetails = calculateApiCost(result.usage);
                const pointsUsed = requiredPoints; // 使用之前计算的积分

                const batchTimestamp = Date.now();
                const newHistoryEntry: HistoryMetadata = {
                    timestamp: batchTimestamp,
                    images: result.images.map((img: { filename: string }) => ({ filename: img.filename })),
                    storageModeUsed: effectiveStorageModeClient,
                    durationMs: durationMs,
                    quality: historyQuality,
                    background: historyBackground,
                    moderation: historyModeration,
                    output_format: historyOutputFormat,
                    prompt: historyPrompt,
                    mode: mode,
                    costDetails: costDetails,
                    pointsUsed: pointsUsed
                };

                // 上传图像到存储服务并创建生成记录
                const uploadedImageUrls: string[] = [];
                const processedImages: { path: string; filename: string }[] = [];

                // 上传图像到存储服务并创建生成记录
                try {
                    // 上传每个图像到存储服务
                    for (const img of result.images) {
                        if (img.b64_json) {
                            try {
                                // 将base64转换为Blob
                                const byteCharacters = atob(img.b64_json);
                                const byteNumbers = new Array(byteCharacters.length);
                                for (let i = 0; i < byteCharacters.length; i++) {
                                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                                }
                                const byteArray = new Uint8Array(byteNumbers);
                                const mimeType = getMimeTypeFromFormat(img.output_format);
                                const blob = new Blob([byteArray], { type: mimeType });

                                // 上传到存储服务
                                const uploadedUrl = await uploadImageToStorage(blob, img.filename);
                                uploadedImageUrls.push(uploadedUrl);

                                // 添加到处理后的图像列表用于显示
                                processedImages.push({
                                    path: uploadedUrl,
                                    filename: img.filename
                                });

                                console.log(`Image uploaded: ${img.filename} -> ${uploadedUrl}`);
                            } catch (uploadError) {
                                console.error(`Failed to upload image ${img.filename}:`, uploadError);
                                // 上传失败时跳过该图像
                            }
                        }
                    }

                    // 构建OpenAI请求参数
                    const openaiParams: Record<string, any> = {
                        model: 'gpt-image-1',
                        prompt: historyPrompt,
                        n: mode === 'generate' ? genN[0] : editN[0],
                        size: mode === 'generate' ? genSize : editSize,
                        quality: historyQuality,
                        output_format: historyOutputFormat,
                        background: historyBackground,
                        moderation: historyModeration
                    };

                    // 创建生成记录
                    const generationRecord = {
                        project_category: "6734285177059253106",
                        prompt: historyPrompt,
                        params: openaiParams,
                        image_urls: uploadedImageUrls,
                        source_config_id: "1870234794176292672", // 改为字符串格式
                        is_public: false,
                        points_used: pointsUsed
                    };

                    console.log('About to create generation record with token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
                    console.log('Token valid:', isAuthenticated);

                    await createGenerationRecord(token, generationRecord);
                    console.log('Generation record created successfully');

                    // 扣除积分
                    deductPoints(pointsUsed);
                    console.log(`Points deducted: ${pointsUsed}`);

                } catch (recordError) {
                    console.error('Failed to create generation record:', recordError);
                    // 记录创建失败不影响图像显示，但记录错误
                    setError(`图像生成成功，但记录保存失败: ${recordError instanceof Error ? recordError.message : '未知错误'}`);
                }

                setLatestImageBatch(processedImages);
                setImageOutputView(processedImages.length > 1 ? 'grid' : 0);

                // 不再保存到本地历史记录，历史记录从API获取
            } else {
                setLatestImageBatch(null);
                throw new Error('API 响应不包含有效的图像数据或文件名。');
            }
        } catch (err: unknown) {
            durationMs = Date.now() - startTime;
            console.error(`API Call Error after ${durationMs}ms:`, err);
            const errorMessage = err instanceof Error ? err.message : '发生了意外错误。';
            setError(errorMessage);
            setLatestImageBatch(null);
        } finally {
            if (durationMs === 0) durationMs = Date.now() - startTime;
            setIsLoading(false);
        }
    };

    const handleHistorySelect = (item: HistoryMetadata) => {
        console.log(
            `Selecting history item from ${new Date(item.timestamp).toISOString()}, stored via: ${item.storageModeUsed}`
        );
        const originalStorageMode = item.storageModeUsed || 'fs';

        const selectedBatchPromises = item.images.map(async (imgInfo) => {
            let path: string | undefined;
            if (originalStorageMode === 'indexeddb') {
                path = getImageSrc(imgInfo.filename);
            } else {
                path = `/api/image/${imgInfo.filename}`;
            }

            if (path) {
                return { path, filename: imgInfo.filename };
            } else {
                console.warn(
                    `Could not get image source for history item: ${imgInfo.filename} (mode: ${originalStorageMode})`
                );
                setError(`图像 ${imgInfo.filename} 无法加载。`);
                return null;
            }
        });

        Promise.all(selectedBatchPromises).then((resolvedBatch) => {
            const validImages = resolvedBatch.filter(Boolean) as { path: string; filename: string }[];

            if (validImages.length !== item.images.length && !error) {
                setError(
                    '此历史记录条目中的某些图像无法加载（它们可能已被清除或丢失）。'
                );
            } else if (validImages.length === item.images.length) {
                setError(null);
            }

            setLatestImageBatch(validImages.length > 0 ? validImages : null);
            setImageOutputView(validImages.length > 1 ? 'grid' : 0);
        });
    };

    const handleClearHistory = async () => {
        const confirmationMessage =
            effectiveStorageModeClient === 'indexeddb'
                ? 'Are you sure you want to clear the entire image history? In IndexedDB mode, this will also permanently delete all stored images. This cannot be undone.'
                : 'Are you sure you want to clear the entire image history? This cannot be undone.';

        if (window.confirm(confirmationMessage)) {
            setHistory([]);
            setLatestImageBatch(null);
            setImageOutputView('grid');
            setError(null);

            try {
                localStorage.removeItem('openaiImageHistory');
                console.log('Cleared history metadata from localStorage.');

                if (effectiveStorageModeClient === 'indexeddb') {
                    await db.images.clear();
                    console.log('Cleared images from IndexedDB.');

                    setBlobUrlCache({});
                }
            } catch (e) {
                console.error('Failed during history clearing:', e);
                setError(`Failed to clear history: ${e instanceof Error ? e.message : String(e)}`);
            }
        }
    };

    const handleSendToEdit = async (filenameOrUrl: string) => {
        if (isSendingToEdit) return;
        setIsSendingToEdit(true);
        setError(null);

        // 首先检查是否有URL映射（来自历史记录的虚拟文件名）
        let actualUrl = filenameOrUrl;
        if (imageUrlMapping[filenameOrUrl]) {
            actualUrl = imageUrlMapping[filenameOrUrl];
            console.log(`Found URL mapping: ${filenameOrUrl} -> ${actualUrl}`);
        }

        // 判断是文件名还是URL
        const isUrl = actualUrl.startsWith('http');
        const filename = isUrl ? actualUrl.split('/').pop() || 'image.png' : filenameOrUrl;

        const alreadyExists = editImageFiles.some((file) => file.name === filename);
        if (mode === 'edit' && alreadyExists) {
            console.log(`Image ${filename} already in edit list.`);
            setIsSendingToEdit(false);
            return;
        }

        if (mode === 'edit' && editImageFiles.length >= MAX_EDIT_IMAGES) {
            setError(`无法向编辑表单添加超过 ${MAX_EDIT_IMAGES} 张图像。`);
            setIsSendingToEdit(false);
            return;
        }

        console.log(`Sending image ${filename} to edit...`);

        try {
            let blob: Blob | undefined;
            let mimeType: string = 'image/png';

            if (isUrl) {
                // 从云端URL获取图像
                console.log(`Fetching image from URL: ${actualUrl}`);
                const response = await fetch(actualUrl);
                if (!response.ok) {
                    throw new Error(`获取图像失败: ${response.statusText}`);
                }
                blob = await response.blob();
                mimeType = response.headers.get('Content-Type') || mimeType;
                console.log(`Fetched image from URL: ${actualUrl}`);
            } else if (effectiveStorageModeClient === 'indexeddb') {
                console.log(`Fetching blob ${filename} from IndexedDB...`);

                const record = allDbImages?.find((img) => img.filename === filename);
                if (record?.blob) {
                    blob = record.blob;
                    mimeType = blob.type || mimeType;
                    console.log(`Found blob ${filename} in IndexedDB.`);
                } else {
                    throw new Error(`在本地数据库中未找到图像 ${filename}。`);
                }
            } else {
                console.log(`Fetching image ${filename} from API...`);
                const response = await fetch(`/api/image/${filename}`);
                if (!response.ok) {
                    throw new Error(`获取图像失败: ${response.statusText}`);
                }
                blob = await response.blob();
                mimeType = response.headers.get('Content-Type') || mimeType;
                console.log(`Fetched image ${filename} from API.`);
            }

            if (!blob) {
                throw new Error(`无法检索 ${filename} 的图像数据。`);
            }

            const newFile = new File([blob], filename, { type: mimeType });
            const newPreviewUrl = URL.createObjectURL(blob);

            editSourceImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));

            setEditImageFiles([newFile]);
            setEditSourceImagePreviewUrls([newPreviewUrl]);

            if (mode === 'generate') {
                setMode('edit');
            }

            console.log(`Successfully set ${filename} in edit form.`);
        } catch (err: unknown) {
            console.error('Error sending image to edit:', err);
            const errorMessage = err instanceof Error ? err.message : '无法将图像发送到编辑表单。';
            setError(errorMessage);
        } finally {
            setIsSendingToEdit(false);
        }
    };

    const executeDeleteItem = async (item: HistoryMetadata) => {
        if (!item) return;
        console.log(`Executing delete for history item timestamp: ${item.timestamp}`);
        setError(null); // Clear previous errors

        const { images: imagesInEntry, storageModeUsed, timestamp } = item;
        const filenamesToDelete = imagesInEntry.map((img) => img.filename);

        try {
            if (storageModeUsed === 'indexeddb') {
                console.log('Deleting from IndexedDB:', filenamesToDelete);
                await db.images.where('filename').anyOf(filenamesToDelete).delete();
                setBlobUrlCache((prevCache) => {
                    const newCache = { ...prevCache };
                    filenamesToDelete.forEach((fn) => delete newCache[fn]);
                    return newCache;
                });
                console.log('Successfully deleted from IndexedDB and cleared blob cache.');
            } else if (storageModeUsed === 'fs') {
                console.log('Requesting deletion from filesystem via API:', filenamesToDelete);
                const apiPayload: { filenames: string[]; passwordHash?: string } = { filenames: filenamesToDelete };
                if (isPasswordRequiredByBackend && clientPasswordHash) {
                    apiPayload.passwordHash = clientPasswordHash;
                }

                const response = await fetch('/api/image-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiPayload)
                });

                const result = await response.json();
                if (!response.ok) {
                    console.error('API deletion error:', result);
                    throw new Error(result.error || `API 删除失败，状态码 ${response.status}`);
                }
                console.log('API deletion successful:', result);
            }

            setHistory((prevHistory) => prevHistory.filter((h) => h.timestamp !== timestamp));
            if (latestImageBatch && latestImageBatch.some((img) => filenamesToDelete.includes(img.filename))) {
                setLatestImageBatch(null); // Clear current view if it contained deleted images
            }
        } catch (e: unknown) {
            console.error('Error during item deletion:', e);
            setError(e instanceof Error ? e.message : '删除过程中发生意外错误。');
        } finally {
            setItemToDeleteConfirm(null); // Always close dialog
        }
    };

    const handleRequestDeleteItem = (item: HistoryMetadata) => {
        if (!skipDeleteConfirmation) {
            setDialogCheckboxStateSkipConfirm(skipDeleteConfirmation);
            setItemToDeleteConfirm(item);
        } else {
            executeDeleteItem(item);
        }
    };

    const handleConfirmDeletion = () => {
        if (itemToDeleteConfirm) {
            executeDeleteItem(itemToDeleteConfirm);
            setSkipDeleteConfirmation(dialogCheckboxStateSkipConfirm);
        }
    };

    const handleCancelDeletion = () => {
        setItemToDeleteConfirm(null);
    };

    // 如果用户未认证，显示登录提示
    if (!isAuthenticated && !authError) {
        return (
            <main className='flex min-h-screen flex-col items-center justify-center bg-black p-4 text-white'>
                <LoginPrompt />
            </main>
        );
    }

    // 如果有认证错误，只显示错误弹窗，不加载任何内容
    if (authError) {
        return (
            <main className='flex min-h-screen flex-col items-center justify-center bg-black p-4 text-white'>
                <AutoAuthErrorDialog />
            </main>
        );
    }

    return (
        <main className='flex min-h-screen flex-col items-center bg-black p-4 text-white md:p-8 lg:p-12'>
            {/* 用户状态显示 */}
            {isAuthenticated && pointsBalance && (
                <div className='w-full max-w-7xl mb-6'>
                    <div className='bg-green-900/20 border border-green-500/30 rounded-lg p-4'>
                        <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                                <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                                <span className='text-green-400 font-medium'>认证成功</span>
                            </div>
                            <div className='text-right'>
                                <div className='text-white font-semibold'>积分余额: {formatPointsDisplay(pointsBalance.current_points)}</div>
                                <div className='text-gray-400 text-sm'>用户: {pointsBalance.username}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 移除了密码对话框 */}
            <div className='w-full max-w-7xl space-y-6'>
                <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                    <div className='relative flex h-[70vh] min-h-[600px] flex-col lg:col-span-1'>
                        <div className={mode === 'generate' ? 'block h-full w-full' : 'hidden'}>
                            <GenerationForm
                                onSubmit={handleApiCall}
                                isLoading={isLoading}
                                currentMode={mode}
                                onModeChange={setMode}
                                prompt={genPrompt}
                                setPrompt={setGenPrompt}
                                n={genN}
                                setN={setGenN}
                                size={genSize}
                                setSize={setGenSize}
                                quality={genQuality}
                                setQuality={setGenQuality}
                                outputFormat={genOutputFormat}
                                setOutputFormat={setGenOutputFormat}
                                compression={genCompression}
                                setCompression={setGenCompression}
                                background={genBackground}
                                setBackground={setGenBackground}
                                moderation={genModeration}
                                setModeration={setGenModeration}
                            />
                        </div>
                        <div className={mode === 'edit' ? 'block h-full w-full' : 'hidden'}>
                            <EditingForm
                                onSubmit={handleApiCall}
                                isLoading={isLoading || isSendingToEdit}
                                currentMode={mode}
                                onModeChange={setMode}
                                imageFiles={editImageFiles}
                                sourceImagePreviewUrls={editSourceImagePreviewUrls}
                                setImageFiles={setEditImageFiles}
                                setSourceImagePreviewUrls={setEditSourceImagePreviewUrls}
                                maxImages={MAX_EDIT_IMAGES}
                                editPrompt={editPrompt}
                                setEditPrompt={setEditPrompt}
                                editN={editN}
                                setEditN={setEditN}
                                editSize={editSize}
                                setEditSize={setEditSize}
                                editQuality={editQuality}
                                setEditQuality={setEditQuality}
                                editBrushSize={editBrushSize}
                                setEditBrushSize={setEditBrushSize}
                                editShowMaskEditor={editShowMaskEditor}
                                setEditShowMaskEditor={setEditShowMaskEditor}
                                editGeneratedMaskFile={editGeneratedMaskFile}
                                setEditGeneratedMaskFile={setEditGeneratedMaskFile}
                                editIsMaskSaved={editIsMaskSaved}
                                setEditIsMaskSaved={setEditIsMaskSaved}
                                editOriginalImageSize={editOriginalImageSize}
                                setEditOriginalImageSize={setEditOriginalImageSize}
                                editDrawnPoints={editDrawnPoints}
                                setEditDrawnPoints={setEditDrawnPoints}
                                editMaskPreviewUrl={editMaskPreviewUrl}
                                setEditMaskPreviewUrl={setEditMaskPreviewUrl}
                            />
                        </div>
                    </div>
                    <div className='flex h-[70vh] min-h-[600px] flex-col lg:col-span-1'>
                        {error && (
                            <Alert variant='destructive' className='mb-4 border-red-500/50 bg-red-900/20 text-red-300'>
                                <AlertTitle className='text-red-200'>错误</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <ImageOutput
                            imageBatch={latestImageBatch}
                            viewMode={imageOutputView}
                            onViewChange={setImageOutputView}
                            altText='Generated image output'
                            isLoading={isLoading || isSendingToEdit}
                            onSendToEdit={handleSendToEdit}
                            currentMode={mode}
                            baseImagePreviewUrl={editSourceImagePreviewUrls[0] || null}
                        />
                    </div>
                </div>

                {/* API历史记录面板 */}
                <div className='min-h-[450px]'>
                    <ApiHistoryPanel
                        onSelectImage={(item) => {
                            // 将API记录转换为本地格式以兼容现有的图像显示逻辑
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
                            setImageOutputView(images.length > 1 ? 'grid' : 0);
                        }}
                    />
                </div>
            </div>
        </main>
    );
}
