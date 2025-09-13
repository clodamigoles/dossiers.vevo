import dbConnect from '@/lib/dbConnect'
import EstimationVoiture from '@/models/EstimationVoitureSchema'
import DossierVente from '@/models/DossierVenteSchema'

export default async function handler(req, res) {
    const { id } = req.query

    if (req.method === 'GET') {
        try {
            await dbConnect()

            const estimation = await EstimationVoiture.findById(id)
            if (!estimation) {
                return res.status(404).json({ message: 'Estimation non trouvée' })
            }

            // Vérifier si un dossier de vente existe déjà
            const existingDossier = await DossierVente.findOne({ estimationId: id })

            res.status(200).json({
                success: true,
                estimation: {
                    id: estimation._id,
                    brand: estimation.brand,
                    model: estimation.model,
                    year: estimation.year,
                    bodyType: estimation.bodyType,
                    fuelType: estimation.fuelType,
                    horsepower: estimation.horsepower,
                    transmission: estimation.transmission,
                    doors: estimation.doors,
                    mileage: estimation.mileage,
                    email: estimation.email,
                    status: estimation.status,
                    saleStatus: estimation.saleStatus,
                    adminEstimation: estimation.adminEstimation,
                    isExpired: estimation.isExpired,
                    daysRemaining: estimation.daysRemaining,
                    finale: estimation.finalEstimation.amount
                },
                hasExistingDossier: !!existingDossier,
                existingDossierId: existingDossier?._id
            })

        } catch (error) {
            console.error('Erreur récupération estimation:', error)
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de l\'estimation'
            })
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' })
    }
}