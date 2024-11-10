import { useState } from '#app'
import axios from 'axios'

export function useCurrentModel() {
    const defaultModel = {
        name: '',
        total_tokens: 4096,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    }

    const currentModel = useState('currentModel', () => defaultModel)
    const modelList = useState('modelList', () => [])

    if (process.client) {
        const stored = localStorage.getItem('currentModel')
        if (stored) {
            const savedModel = JSON.parse(stored)
            Object.assign(currentModel.value, { ...defaultModel, ...savedModel })
        }
    }

    const fetchModels = async () => {
        try {
            const response = await axios.get('/api/chat/language-models/')
            modelList.value = response.data

            if (!currentModel.value.name && modelList.value.length > 0) {
                currentModel.value = {
                    ...currentModel.value,
                    name: modelList.value[0].name
                }
            }
        } catch (error) {
            console.error('Error fetching models:', error)
        }
    }

    return {
        currentModel,
        modelList,
        fetchModels
    }
}
