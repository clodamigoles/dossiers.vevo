import dbConnect from '@/lib/mongodb'
import EstimationVoiture from '@/lib/estimation-model'
import AuthCode from '@/lib/auth-code-model'
import { parseCookies } from '@/lib/auth-utils'

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    await dbConnect()
    const { id } = req.query

    try {
        // Vérifier la session
        const cookies = parseCookies(req)
        const sessionToken = cookies.dossiers_session

        console.log('Dashboard API - Vérification session:', {
            hasCookies: !!req.headers.cookie,
            hasSessionToken: !!sessionToken,
            cookiesKeys: Object.keys(cookies),
            estimationId: id
        })

        if (!sessionToken) {
            console.log('Dashboard API - Aucun token de session trouvé')
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            })
        }

        // Vérifier que le token correspond à cette estimation
        const authCode = await AuthCode.findOne({
            sessionToken,
            estimationId: id,
            used: true
        })

        console.log('Dashboard API - AuthCode trouvé:', {
            found: !!authCode,
            estimationId: authCode?.estimationId?.toString(),
            email: authCode?.email
        })

        if (!authCode) {
            console.log('Dashboard API - AuthCode non trouvé pour cette estimation')
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé à ce dossier'
            })
        }

        // Récupérer l'estimation
        const estimation = await EstimationVoiture.findById(id)
        
        if (!estimation) {
            return res.status(404).json({
                success: false,
                message: 'Estimation non trouvée'
            })
        }

        // Vérifier que la procédure est lancée (accepter tous les statuts après le lancement)
        const validStatuses = ['accepted', 'in_progress', 'photos_uploaded', 'under_review', 'approved', 'completed']
        const hasValidStatus = estimation.status === 'accepted' || validStatuses.includes(estimation.saleStatus)
        
        if (!hasValidStatus) {
            return res.status(400).json({
                success: false,
                message: 'La procédure de vente n\'est pas encore lancée'
            })
        }

        // Calculer les jours restants
        let daysRemaining = null
        let isExpired = false
        
        if (estimation.adminEstimation?.validUntil) {
            const now = new Date()
            const validUntil = new Date(estimation.adminEstimation.validUntil)
            const diffTime = validUntil - now
            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            isExpired = daysRemaining <= 0
        }

        // S'assurer que vehiclePhotos est bien structuré
        const responseData = estimation.toObject()
        if (!responseData.vehiclePhotos) {
            responseData.vehiclePhotos = {
                interior: [],
                exterior: [],
                reviewStatus: 'pending'
            }
        }
        if (!Array.isArray(responseData.vehiclePhotos.interior)) {
            responseData.vehiclePhotos.interior = []
        }
        if (!Array.isArray(responseData.vehiclePhotos.exterior)) {
            responseData.vehiclePhotos.exterior = []
        }

        console.log('Dashboard API response:', {
            saleStatus: responseData.saleStatus,
            interiorCount: responseData.vehiclePhotos.interior.length,
            exteriorCount: responseData.vehiclePhotos.exterior.length,
            status: responseData.status
        })

        return res.status(200).json({
            success: true,
            data: {
                ...responseData,
                daysRemaining,
                isExpired
            }
        })

    } catch (error) {
        console.error('Erreur API dashboard:', error)
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}


