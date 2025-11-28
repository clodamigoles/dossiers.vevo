import dbConnect from '@/lib/mongodb'
import EstimationVoiture from '@/lib/estimation-model'
import AuthCode from '@/lib/auth-code-model'
import { parseCookies } from '@/lib/auth-utils'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    await dbConnect()
    const { id } = req.query

    try {
        // Vérifier la session
        const cookies = parseCookies(req)
        const sessionToken = cookies.dossiers_session

        console.log('Submit-review API - Vérification session:', {
            hasCookies: !!req.headers.cookie,
            hasSessionToken: !!sessionToken,
            estimationId: id
        })

        if (!sessionToken) {
            console.log('Submit-review API - Aucun token de session trouvé')
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

        if (!authCode) {
            console.log('Submit-review API - AuthCode non trouvé pour cette estimation')
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé à ce dossier'
            })
        }

        // Récupérer l'estimation fraîche depuis la base
        const estimation = await EstimationVoiture.findById(id)
        
        if (!estimation) {
            return res.status(404).json({
                success: false,
                message: 'Estimation non trouvée'
            })
        }

        // Initialiser vehiclePhotos si nécessaire
        if (!estimation.vehiclePhotos) {
            estimation.vehiclePhotos = {
                interior: [],
                exterior: [],
                reviewStatus: 'pending'
            }
        }

        // S'assurer que vehiclePhotos existe
        if (!estimation.vehiclePhotos) {
            estimation.vehiclePhotos = {
                interior: [],
                exterior: [],
                reviewStatus: 'pending'
            }
        }

        // Vérifier que les photos sont uploadées
        // S'assurer que ce sont des arrays
        if (!Array.isArray(estimation.vehiclePhotos.interior)) {
            estimation.vehiclePhotos.interior = []
        }
        if (!Array.isArray(estimation.vehiclePhotos.exterior)) {
            estimation.vehiclePhotos.exterior = []
        }

        const interiorCount = estimation.vehiclePhotos.interior.length
        const exteriorCount = estimation.vehiclePhotos.exterior.length

        console.log('Vérification photos pour soumission:', {
            interiorCount,
            exteriorCount,
            interiorPhotos: estimation.vehiclePhotos.interior.slice(0, 3),
            exteriorPhotos: estimation.vehiclePhotos.exterior.slice(0, 3),
            interiorIsArray: Array.isArray(estimation.vehiclePhotos.interior),
            exteriorIsArray: Array.isArray(estimation.vehiclePhotos.exterior),
            saleStatus: estimation.saleStatus,
            status: estimation.status
        })

        if (interiorCount === 0 || exteriorCount === 0) {
            return res.status(400).json({
                success: false,
                message: `Veuillez uploader toutes les photos avant de soumettre. Intérieures: ${interiorCount}, Extérieures: ${exteriorCount}`,
                interiorCount,
                exteriorCount,
                vehiclePhotos: {
                    interior: estimation.vehiclePhotos.interior,
                    exterior: estimation.vehiclePhotos.exterior
                }
            })
        }

        // Passer au statut "en cours de validation"
        estimation.saleStatus = 'under_review'
        
        // Initialiser vehiclePhotos si nécessaire
        if (!estimation.vehiclePhotos) {
            estimation.vehiclePhotos = {
                interior: [],
                exterior: [],
                reviewStatus: 'pending'
            }
        }
        
        estimation.vehiclePhotos.reviewStatus = 'pending'
        if (!estimation.vehiclePhotos.uploadedAt) {
            estimation.vehiclePhotos.uploadedAt = new Date()
        }

        await estimation.save()

        console.log('Statut mis à jour:', {
            saleStatus: estimation.saleStatus,
            interiorCount: estimation.vehiclePhotos.interior?.length,
            exteriorCount: estimation.vehiclePhotos.exterior?.length
        })

        return res.status(200).json({
            success: true,
            message: 'Photos soumises pour validation',
            data: estimation
        })

    } catch (error) {
        console.error('Erreur API submit-review:', error)
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

