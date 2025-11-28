import { put } from '@vercel/blob'
import dbConnect from '@/lib/mongodb'
import EstimationVoiture from '@/lib/estimation-model'
import AuthCode from '@/lib/auth-code-model'
import { parseCookies } from '@/lib/auth-utils'

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '100mb', // Pas de limite sur la taille des images
        },
    },
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    // Vérifier la configuration Vercel Blob
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.error('BLOB_READ_WRITE_TOKEN non configuré')
        return res.status(500).json({
            success: false,
            message: 'Configuration du stockage manquante. BLOB_READ_WRITE_TOKEN non défini.'
        })
    }

    await dbConnect()
    const { estimationId, photos, photoType } = req.body

    try {
        // Vérifier la session
        const cookies = parseCookies(req)
        const sessionToken = cookies.dossiers_session

        console.log('Upload API - Vérification session:', {
            hasCookies: !!req.headers.cookie,
            hasSessionToken: !!sessionToken,
            estimationId
        })

        if (!sessionToken) {
            console.log('Upload API - Aucun token de session trouvé')
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            })
        }

        // Vérifier que le token correspond à cette estimation
        const authCode = await AuthCode.findOne({
            sessionToken,
            estimationId,
            used: true
        })

        if (!authCode) {
            console.log('Upload API - AuthCode non trouvé pour cette estimation')
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé à ce dossier'
            })
        }

        // Validation des paramètres
        if (!estimationId || !photos || !Array.isArray(photos) || !photoType) {
            return res.status(400).json({
                success: false,
                message: 'Paramètres manquants'
            })
        }

        if (photoType !== 'interior' && photoType !== 'exterior') {
            return res.status(400).json({
                success: false,
                message: 'Type de photo invalide (interior ou exterior)'
            })
        }

        // Vérifier le nombre de photos
        if (photoType === 'interior' && photos.length > 20) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 20 photos intérieures autorisées'
            })
        }

        if (photoType === 'exterior' && photos.length > 20) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 20 photos extérieures autorisées'
            })
        }

        // Vérifier que l'estimation existe (sans la charger complètement pour l'instant)
        const estimationCheck = await EstimationVoiture.findById(estimationId)
        
        if (!estimationCheck) {
            return res.status(404).json({
                success: false,
                message: 'Estimation non trouvée'
            })
        }

        // Vérifier que la procédure est lancée
        if (estimationCheck.status !== 'accepted' && estimationCheck.saleStatus !== 'in_progress' && estimationCheck.saleStatus !== 'photos_uploaded') {
            return res.status(400).json({
                success: false,
                message: 'La procédure de vente n\'est pas encore lancée'
            })
        }

        // Uploader les photos vers Vercel Blob
        const uploadedUrls = []
        
        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i]
            
            // Vérifier que c'est une image (base64 data URL)
            if (!photo.startsWith('data:image/')) {
                return res.status(400).json({
                    success: false,
                    message: `La photo ${i + 1} n'est pas une image valide`
                })
            }

            // Extraire le type MIME et les données
            // Support des formats : data:image/jpeg;base64, data:image/png;base64, data:image/gif;base64, etc.
            const matches = photo.match(/^data:image\/([\w\+]+);base64,(.+)$/)
            if (!matches || matches.length < 3) {
                console.error(`Format invalide pour photo ${i + 1}:`, photo.substring(0, 50))
                return res.status(400).json({
                    success: false,
                    message: `Format de photo invalide pour la photo ${i + 1}. Format attendu: data:image/[type];base64,[données]`
                })
            }

            const mimeType = matches[1].toLowerCase()
            const base64Data = matches[2]
            
            // Vérifier que les données base64 ne sont pas vides
            if (!base64Data || base64Data.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: `Les données de la photo ${i + 1} sont vides`
                })
            }

            let buffer
            try {
                buffer = Buffer.from(base64Data, 'base64')
                if (buffer.length === 0) {
                    throw new Error('Buffer vide après conversion')
                }
            } catch (bufferError) {
                console.error(`Erreur conversion base64 pour photo ${i + 1}:`, bufferError)
                return res.status(400).json({
                    success: false,
                    message: `Erreur lors de la conversion de la photo ${i + 1}: ${bufferError.message}`
                })
            }

            // Générer un nom de fichier unique
            const timestamp = Date.now()
            const randomStr = Math.random().toString(36).substring(2, 15)
            const filename = `${estimationId}/${photoType}_${timestamp}_${randomStr}.${mimeType}`

            try {
                // Upload vers Vercel Blob
                // Le token est automatiquement lu depuis BLOB_READ_WRITE_TOKEN
                const blob = await put(filename, buffer, {
                    access: 'public',
                    contentType: `image/${mimeType}`
                })

                if (!blob || !blob.url) {
                    throw new Error('Upload réussi mais aucune URL retournée')
                }

                uploadedUrls.push(blob.url)
            } catch (uploadError) {
                console.error(`Erreur upload photo ${i + 1}:`, uploadError)
                console.error('Détails erreur:', {
                    message: uploadError.message,
                    stack: uploadError.stack,
                    name: uploadError.name,
                    code: uploadError.code
                })
                
                // Si c'est une erreur d'authentification, retourner un message spécifique
                if (uploadError.message?.includes('token') || uploadError.message?.includes('unauthorized')) {
                    return res.status(500).json({
                        success: false,
                        message: 'Erreur de configuration : Token Vercel Blob invalide ou manquant',
                        error: process.env.NODE_ENV === 'development' ? uploadError.message : 'Erreur configuration'
                    })
                }
                
                return res.status(500).json({
                    success: false,
                    message: `Erreur lors de l'upload de la photo ${i + 1}: ${uploadError.message}`,
                    error: process.env.NODE_ENV === 'development' ? uploadError.message : 'Erreur upload'
                })
            }
        }

        // Recharger l'estimation depuis la base pour avoir les dernières données
        // (important si on upload les deux types en même temps)
        const freshEstimation = await EstimationVoiture.findById(estimationId)
        if (!freshEstimation) {
            return res.status(404).json({
                success: false,
                message: 'Estimation non trouvée'
            })
        }
        
        // Initialiser vehiclePhotos si nécessaire
        if (!freshEstimation.vehiclePhotos) {
            freshEstimation.vehiclePhotos = {
                interior: [],
                exterior: [],
                reviewStatus: 'pending'
            }
        }
        
        // Mettre à jour l'estimation - ajouter les nouvelles URLs aux existantes
        if (photoType === 'interior') {
            const existingInterior = Array.isArray(freshEstimation.vehiclePhotos.interior) 
                ? freshEstimation.vehiclePhotos.interior 
                : []
            freshEstimation.vehiclePhotos.interior = [
                ...existingInterior,
                ...uploadedUrls
            ]
        } else {
            const existingExterior = Array.isArray(freshEstimation.vehiclePhotos.exterior) 
                ? freshEstimation.vehiclePhotos.exterior 
                : []
            freshEstimation.vehiclePhotos.exterior = [
                ...existingExterior,
                ...uploadedUrls
            ]
        }
        
        freshEstimation.vehiclePhotos.uploadedAt = new Date()
        
        // Ne pas changer le statut automatiquement ici, on le fait dans submit-review
        // Garder in_progress jusqu'à la soumission
        
        await freshEstimation.save()

        // Recharger depuis la base pour s'assurer d'avoir les dernières données
        const savedEstimation = await EstimationVoiture.findById(estimationId)

        const totalInterior = Array.isArray(savedEstimation.vehiclePhotos?.interior) 
            ? savedEstimation.vehiclePhotos.interior.length 
            : 0
        const totalExterior = Array.isArray(savedEstimation.vehiclePhotos?.exterior) 
            ? savedEstimation.vehiclePhotos.exterior.length 
            : 0

        console.log('Photos uploadées et sauvegardées:', {
            photoType,
            uploadedCount: uploadedUrls.length,
            totalInterior,
            totalExterior,
            saleStatus: savedEstimation.saleStatus,
            interiorPhotos: savedEstimation.vehiclePhotos?.interior?.slice(0, 3), // Afficher seulement les 3 premières pour les logs
            exteriorPhotos: savedEstimation.vehiclePhotos?.exterior?.slice(0, 3),
            interiorIsArray: Array.isArray(savedEstimation.vehiclePhotos?.interior),
            exteriorIsArray: Array.isArray(savedEstimation.vehiclePhotos?.exterior)
        })

        return res.status(200).json({
            success: true,
            message: 'Photos uploadées avec succès',
            data: {
                uploadedUrls,
                photoType,
                totalInterior,
                totalExterior
            }
        })

    } catch (error) {
        console.error('Erreur API upload photos:', error)
        console.error('Stack trace:', error.stack)
        return res.status(500).json({
            success: false,
            message: error.message || 'Erreur lors de l\'upload des photos',
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            } : undefined
        })
    }
}

