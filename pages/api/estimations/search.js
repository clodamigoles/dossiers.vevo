import dbConnect from '@/lib/mongodb'
import EstimationVoiture from '@/lib/estimation-model'
import mongoose from 'mongoose'

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    await dbConnect()
    const { q } = req.query

    if (!q || !q.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Paramètre de recherche requis'
        })
    }

    try {
        const searchTermOriginal = q.trim()
        const searchTerm = searchTermOriginal.toLowerCase()
        
        // Ne rechercher que les estimations qui ont une adminEstimation (estimation finale envoyée)
        const baseFilter = {
            adminEstimation: { $exists: true, $ne: null }
        }

        let estimations = []

        // Détecter le type de recherche et chercher uniquement dans le type approprié
        const isObjectId = mongoose.Types.ObjectId.isValid(searchTermOriginal)
        const isEmail = searchTerm.includes('@') && searchTerm.includes('.')
        const searchPhoneDigits = searchTerm.replace(/[^\d]/g, '')
        const isPhone = searchPhoneDigits.length >= 6 && searchPhoneDigits.length <= 15

        if (isObjectId) {
            // Recherche uniquement par ID
            const estimation = await EstimationVoiture.findOne({
                ...baseFilter,
                _id: new mongoose.Types.ObjectId(searchTermOriginal)
            }).lean()

            if (estimation) {
                estimations = [estimation]
            }
        } else if (isEmail) {
            // Recherche uniquement par email (exact, case insensitive)
            const estimation = await EstimationVoiture.findOne({
                ...baseFilter,
                email: { $regex: new RegExp(`^${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            }).lean()

            if (estimation && estimation.email.toLowerCase() === searchTerm) {
                estimations = [estimation]
            }
        } else if (isPhone) {
            // Recherche uniquement par téléphone (exact après nettoyage)
            // Récupérer toutes les estimations qui ont un téléphone
            const allEstimations = await EstimationVoiture.find({
                ...baseFilter,
                $or: [
                    { 'additionalInfo.saleInfo.phone': { $exists: true, $ne: null } },
                    { 'additionalInfo.step3.phoneNumber': { $exists: true, $ne: null } }
                ]
            }).lean()

            // Filtrer pour correspondance exacte après nettoyage
            estimations = allEstimations.filter(est => {
                const saleInfoPhone = est.additionalInfo?.saleInfo?.phone
                const step3Phone = est.additionalInfo?.step3?.phoneNumber
                
                if (saleInfoPhone) {
                    const cleanedPhone = saleInfoPhone.replace(/[^\d]/g, '')
                    if (cleanedPhone === searchPhoneDigits) {
                        return true
                    }
                }
                
                if (step3Phone) {
                    const cleanedPhone = step3Phone.replace(/[^\d]/g, '')
                    if (cleanedPhone === searchPhoneDigits) {
                        return true
                    }
                }
                
                return false
            })
        } else {
            // Recherche dans tous les champs (ID, email, téléphone) avec correspondance exacte
            const filter = {
                ...baseFilter,
                $or: []
            }

            // Essayer par ID si c'est un ObjectId valide
            if (mongoose.Types.ObjectId.isValid(searchTermOriginal)) {
                filter.$or.push({ _id: new mongoose.Types.ObjectId(searchTermOriginal) })
            }

            // Essayer par email
            filter.$or.push({
                email: { $regex: new RegExp(`^${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            })

            // Essayer par téléphone si le terme contient des chiffres
            if (searchPhoneDigits.length >= 6) {
                filter.$or.push({
                    $or: [
                        { 'additionalInfo.saleInfo.phone': { $exists: true, $ne: null } },
                        { 'additionalInfo.step3.phoneNumber': { $exists: true, $ne: null } }
                    ]
                })
            }

            if (filter.$or.length > 0) {
                let allEstimations = await EstimationVoiture.find(filter)
                    .sort({ 'adminEstimation.sentAt': -1 })
                    .limit(50)
                    .lean()

                // Filtrer pour correspondance exacte
                estimations = allEstimations.filter(est => {
                    // Vérifier l'ID
                    if (mongoose.Types.ObjectId.isValid(searchTermOriginal)) {
                        if (est._id.toString() === searchTermOriginal) {
                            return true
                        }
                    }

                    // Vérifier l'email (exact, case insensitive)
                    if (est.email && est.email.toLowerCase() === searchTerm) {
                        return true
                    }

                    // Vérifier le téléphone (exact après nettoyage)
                    if (searchPhoneDigits.length >= 6) {
                        const saleInfoPhone = est.additionalInfo?.saleInfo?.phone
                        const step3Phone = est.additionalInfo?.step3?.phoneNumber
                        
                        if (saleInfoPhone) {
                            const cleanedPhone = saleInfoPhone.replace(/[^\d]/g, '')
                            if (cleanedPhone === searchPhoneDigits) {
                                return true
                            }
                        }
                        
                        if (step3Phone) {
                            const cleanedPhone = step3Phone.replace(/[^\d]/g, '')
                            if (cleanedPhone === searchPhoneDigits) {
                                return true
                            }
                        }
                    }

                    return false
                })

                // Limiter à 20 résultats maximum
                estimations = estimations.slice(0, 20)
            }
        }

        // Calculer les jours restants et isExpired pour chaque estimation
        const estimationsWithDays = estimations.map(est => {
            let daysRemaining = null
            let isExpired = false
            
            if (est.adminEstimation?.validUntil) {
                const now = new Date()
                const validUntil = new Date(est.adminEstimation.validUntil)
                const diffTime = validUntil - now
                daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                isExpired = daysRemaining <= 0
            }

            return {
                ...est,
                daysRemaining,
                isExpired
            }
        })

        return res.status(200).json({
            success: true,
            data: estimationsWithDays,
            count: estimationsWithDays.length
        })

    } catch (error) {
        console.error('Erreur API search estimations:', error)
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

