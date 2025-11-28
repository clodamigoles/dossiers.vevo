import dbConnect from '@/lib/mongodb'
import EstimationVoiture from '@/lib/estimation-model'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    await dbConnect()
    const { id } = req.query
    const { fullName, email, phone, addressLine1, addressLine2, postalCode, city, country } = req.body

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

        // Vérifier si la procédure est déjà lancée
        if (estimation.status === 'accepted' || estimation.saleStatus === 'in_progress') {
            return res.status(400).json({
                success: false,
                message: 'La procédure de vente est déjà lancée'
            })
        }

        // Mettre à jour l'estimation
        estimation.status = 'accepted'
        estimation.saleStatus = 'in_progress'
        estimation.adminEstimation.clientResponse = 'accepted'
        estimation.adminEstimation.responseAt = new Date()

        // Mettre à jour ou créer saleInfo
        estimation.additionalInfo = estimation.additionalInfo || {}
        estimation.additionalInfo.saleInfo = {
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            addressLine1: addressLine1.trim(),
            addressLine2: addressLine2 ? addressLine2.trim() : '',
            postalCode: postalCode.trim(),
            city: city.trim(),
            country: country.trim() || 'France',
            startedAt: new Date()
        }

        // Mettre à jour l'email si différent
        if (email.trim().toLowerCase() !== estimation.email.toLowerCase()) {
            estimation.email = email.trim().toLowerCase()
        }

        await estimation.save()

        return res.status(200).json({
            success: true,
            message: 'Procédure de vente lancée avec succès',
            data: estimation
        })

    } catch (error) {
        console.error('Erreur API start-sale:', error)
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}



