import { useState } from '#app'
import axios from 'axios'

export function useCurrentModel() {
    const localStorageFields = {
        name: '',
        total_tokens: 4096,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    }

    const currentModel = useState('currentModel', () => ({
        ...localStorageFields,
        image_support: false
    }))
    const modelList = useState('modelList', () => [])

    if (process.client) {
        const stored = localStorage.getItem('currentModel')
        if (stored) {
            const savedModel = JSON.parse(stored)
            Object.assign(currentModel.value, {
                ...localStorageFields,
                ...Object.fromEntries(
                    Object.entries(savedModel).filter(([key]) => key in localStorageFields)
                )
            })
        }
    }

    const fetchModels = async () => {
        try {
            const response = await axios.get('/api/chat/language-models/')
            modelList.value = response.data

            if (!currentModel.value?.name && modelList.value.length > 0) {
                const selectedModel = modelList.value[0]
                currentModel.value = {
                    ...currentModel.value,
                    name: selectedModel.name,
                    image_support: selectedModel?.image_support ?? false
                }
            } else if (currentModel.value?.name) {
                const model = modelList.value.find(m => m.name === currentModel.value.name)
                if (model) {
                    currentModel.value.image_support = model?.image_support ?? false
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
