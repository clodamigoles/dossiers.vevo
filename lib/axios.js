import axios from 'axios'

// Créer une instance axios configurée pour envoyer les cookies automatiquement
const axiosInstance = axios.create({
    withCredentials: true, // Important : envoie les cookies avec les requêtes
    headers: {
        'Content-Type': 'application/json',
    },
})

// Intercepteur de réponse pour gérer les erreurs d'authentification
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Si erreur 401 ou 403, le cookie de session est probablement invalide
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Ne pas rediriger automatiquement ici, laisser chaque composant gérer
            console.warn('Erreur d\'authentification:', error.response?.status)
        }
        return Promise.reject(error)
    }
)

export default axiosInstance


