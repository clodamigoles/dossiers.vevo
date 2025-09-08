import axios from 'axios'

const getUserInfos = async (token) => {
    try {
        const response = await axios.post('/api/user/me', { token })
        return { status: response.status, data: response.data }
    } catch (error) {
        return { status: error.response?.status || 500, data: error.response?.data || { error: 'Network error' } }
    }
}

const getEstimation = async (id) => {
    try {
        const response = await axios.get(`/api/estimation/${id}`)
        return { status: response.status, data: response.data }
    } catch (error) {
        return { status: error.response?.status || 500, data: error.response?.data || { error: 'Network error' } }
    }
}

const createDossier = async (estimationId, clientData) => {
    try {
        const response = await axios.post(`/api/dossier/create`, {
            estimationId,
            clientData
        })
        return { status: response.status, data: response.data }
    } catch (error) {
        return { status: error.response?.status || 500, data: error.response?.data || { error: 'Network error' } }
    }
}

const updateClientInfo = async (dossierId, clientData) => {
    try {
        const response = await axios.put(`/api/dossier/${dossierId}/client`, clientData)
        return { status: response.status, data: response.data }
    } catch (error) {
        return { status: error.response?.status || 500, data: error.response?.data || { error: 'Network error' } }
    }
}

const sendOTP = async () => {
}

const verifyOTP = async () => {
    
}

const getDossier = async () => {
    
}

export default {
    getUserInfos,
    sendOTP,
    verifyOTP,
    getEstimation,
    createDossier,
    updateClientInfo,
    getDossier
}