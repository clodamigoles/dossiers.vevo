import dbConnect from '@/lib/mongodb'
import EstimationVoiture from '@/lib/estimation-model'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    await dbConnect()
    const { id } = req.query
    const { firstName, lastName, phone, photos } = req.body

    try {
        const estimation = await EstimationVoiture.findById(id)
        
        if (!estimation) {
            return res.status(404).json({ 
                success: false,
                message: 'Estimation non trouvée' 
            })
        }

        if (!estimation.adminEstimation) {
            return res.status(400).json({
                success: false,
                message: 'Aucune estimation finale disponible'
            })
        }

        // Vérifier si l'estimation est encore valide (mais permettre même si expirée)
        const now = new Date()
        const validUntil = estimation.adminEstimation.validUntil

        // Accepter l'estimation
        estimation.adminEstimation.clientResponse = 'accepted'
        estimation.adminEstimation.responseAt = now
        estimation.status = 'accepted'
        estimation.saleStatus = 'in_progress'

        // Ajouter les informations du client
        if (firstName || lastName || phone) {
            estimation.additionalInfo = estimation.additionalInfo || {}
            estimation.additionalInfo.saleInfo = {
                firstName: firstName || '',
                lastName: lastName || '',
                phone: phone || '',
                acceptedAt: now
            }
        }

        // Stocker les photos (à implémenter avec upload vers cloud storage)
        if (photos && photos.length > 0) {
            estimation.additionalInfo = estimation.additionalInfo || {}
            estimation.additionalInfo.saleInfo = estimation.additionalInfo.saleInfo || {}
            estimation.additionalInfo.saleInfo.photos = photos
        }

        await estimation.save()

        return res.status(200).json({
            success: true,
            message: 'Estimation acceptée avec succès',
            data: estimation
        })

    } catch (error) {
        console.error('Erreur API accept estimation:', error)
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}




