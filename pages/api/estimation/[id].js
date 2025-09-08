import dbConnect from '../../../lib/dbConnect'
import EstimationVoiture from '../../../models/EstimationVoiture'

export default async function handler(req, res) {
    const { method } = req
    const { id } = req.query

    await dbConnect()

    switch (method) {
        case 'GET':
            try {
                // Validation de l'ID
                if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
                    return res.status(400).json({
                        success: false,
                        message: 'ID d\'estimation invalide'
                    })
                }

                const estimation = await EstimationVoiture.findById(id)

                if (!estimation) {
                    return res.status(404).json({
                        success: false,
                        message: 'Estimation non trouvée'
                    })
                }

                // Vérifier si l'estimation est dans un état valide pour créer un dossier
                if (!['sent', 'accepted'].includes(estimation.status)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cette estimation n\'est pas encore finalisée'
                    })
                }

                // Vérifier si l'estimation n'est pas expirée
                if (estimation.isExpired) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cette estimation a expiré'
                    })
                }

                res.status(200).json({
                    success: true,
                    data: estimation
                })

            } catch (error) {
                console.error('Erreur lors de la récupération de l\'estimation:', error)
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la récupération de l\'estimation'
                })
            }
            break

        default:
            res.setHeader('Allow', ['GET'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}