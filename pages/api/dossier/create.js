import dbConnect from '../../../lib/dbConnect'
import Dossier from '../../../models/Dossier'
import EstimationVoiture from '../../../models/EstimationVoiture'

export default async function handler(req, res) {
    const { method } = req

    await dbConnect()

    switch (method) {
        case 'POST':
            try {
                const { estimationId, clientData } = req.body

                // Validation des données requises
                if (!estimationId || !clientData) {
                    return res.status(400).json({
                        success: false,
                        message: 'ID d\'estimation et données client requis'
                    })
                }

                // Validation de l'ID d'estimation
                if (!estimationId.match(/^[0-9a-fA-F]{24}$/)) {
                    return res.status(400).json({
                        success: false,
                        message: 'ID d\'estimation invalide'
                    })
                }

                // Vérifier que l'estimation existe
                const estimation = await EstimationVoiture.findById(estimationId)
                if (!estimation) {
                    return res.status(404).json({
                        success: false,
                        message: 'Estimation non trouvée'
                    })
                }

                // Vérifier que l'estimation est dans un état valide
                if (!['sent', 'accepted'].includes(estimation.status)) {
                    return res.status(400).json({
                        success: false,
                        message: 'L\'estimation doit être finalisée pour créer un dossier'
                    })
                }

                // Vérifier que l'estimation n'est pas expirée
                if (estimation.isExpired) {
                    return res.status(400).json({
                        success: false,
                        message: 'Cette estimation a expiré'
                    })
                }

                // Vérifier qu'un dossier n'existe pas déjà pour cette estimation
                const existingDossier = await Dossier.findOne({ estimationId })
                if (existingDossier) {
                    return res.status(400).json({
                        success: false,
                        message: 'Un dossier existe déjà pour cette estimation',
                        dossierId: existingDossier._id
                    })
                }

                // Validation des données client
                const { firstName, lastName, email, phone, address } = clientData
                if (!firstName || !lastName || !email || !phone || !address) {
                    return res.status(400).json({
                        success: false,
                        message: 'Toutes les informations client sont requises'
                    })
                }

                if (!address.street || !address.city || !address.postalCode) {
                    return res.status(400).json({
                        success: false,
                        message: 'Adresse complète requise'
                    })
                }

                // Vérifier que l'email correspond à celui de l'estimation
                if (email !== estimation.email) {
                    return res.status(400).json({
                        success: false,
                        message: 'L\'email doit correspondre à celui de l\'estimation'
                    })
                }

                // Créer le dossier
                const dossier = new Dossier({
                    estimationId,
                    client: {
                        firstName: firstName.trim(),
                        lastName: lastName.trim(),
                        email: email.toLowerCase().trim(),
                        phone: phone.trim(),
                        address: {
                            street: address.street.trim(),
                            city: address.city.trim(),
                            postalCode: address.postalCode.trim(),
                            country: address.country || 'France'
                        }
                    },
                    status: 'draft'
                })

                await dossier.save()

                // Marquer l'étape de création comme complétée
                await dossier.markStepComplete('client_info')

                // Mettre à jour le statut de l'estimation si nécessaire
                if (estimation.status === 'sent') {
                    estimation.status = 'accepted'
                    estimation.saleStatus = 'in_progress'
                    await estimation.save()
                }

                // Populate les données d'estimation pour la réponse
                await dossier.populate('estimationId')

                res.status(201).json({
                    success: true,
                    message: 'Dossier créé avec succès',
                    data: {
                        _id: dossier._id,
                        dossierId: dossier._id,
                        status: dossier.status,
                        client: dossier.client,
                        estimation: dossier.estimationId,
                        createdAt: dossier.createdAt
                    }
                })

            } catch (error) {
                console.error('Erreur lors de la création du dossier:', error)

                if (error.name === 'ValidationError') {
                    return res.status(400).json({
                        success: false,
                        message: 'Données invalides',
                        errors: Object.values(error.errors).map(e => e.message)
                    })
                }

                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la création du dossier'
                })
            }
            break

        default:
            res.setHeader('Allow', ['POST'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}