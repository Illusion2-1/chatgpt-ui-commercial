import { useState } from '#app'
import axios from 'axios'

export function useCurrentModel() {
    const currentModel = useState('currentModel', () => null)
    const modelList = useState('modelList', () => [])

    // 从后端获取模型列表
    const fetchModels = async () => {
        try {
            const response = await axios.get('/api/chat/language-models/')
            modelList.value = response.data
            
            // 如果没有当前模型，设置第一个为默认
            if (!currentModel.value && modelList.value.length > 0) {
                currentModel.value = modelList.value[0]
            }
        } catch (error) {
            console.error('Error fetching models:', error)
        }
    }

    // 初始化
    if (process.client) {
        fetchModels()
    }

    return {
        currentModel,
        modelList
    }
} 