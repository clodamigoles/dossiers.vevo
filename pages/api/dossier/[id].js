import dbConnect from '../../../lib/dbConnect'
import Dossier from '../../../models/Dossier'

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
                        message: 'ID de dossier invalide'
                    })
                }

                const dossier = await Dossier.findById(id).populate('estimationId')

                if (!dossier) {
                    return res.status(404).json({
                        success: false,
                        message: 'Dossier non trouvé'
                    })
                }

                res.status(200).json({
                    success: true,
                    data: dossier
                })

            } catch (error) {
                console.error('Erreur lors de la récupération du dossier:', error)
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la récupération du dossier'
                })
            }
            break

        case 'PUT':
            try {
                // Validation de l'ID
                if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
                    return res.status(400).json({
                        success: false,
                        message: 'ID de dossier invalide'
                    })
                }

                const dossier = await Dossier.findById(id)

                if (!dossier) {
                    return res.status(404).json({
                        success: false,
                        message: 'Dossier non trouvé'
                    })
                }

                // Mise à jour des champs autorisés
                const allowedUpdates = ['client', 'status', 'notes', 'saleInfo']
                const updates = {}

                Object.keys(req.body).forEach(key => {
                    if (allowedUpdates.includes(key)) {
                        updates[key] = req.body[key]
                    }
                })

                // Mettre à jour lastActivity
                updates.lastActivity = new Date()

                const updatedDossier = await Dossier.findByIdAndUpdate(
                    id,
                    updates,
                    { new: true, runValidators: true }
                ).populate('estimationId')

                res.status(200).json({
                    success: true,
                    message: 'Dossier mis à jour avec succès',
                    data: updatedDossier
                })

            } catch (error) {
                console.error('Erreur lors de la mise à jour du dossier:', error)
                
                if (error.name === 'ValidationError') {
                    return res.status(400).json({
                        success: false,
                        message: 'Données invalides',
                        errors: Object.values(error.errors).map(e => e.message)
                    })
                }

                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la mise à jour du dossier'
                })
            }
            break

        case 'DELETE':
            try {
                // Validation de l'ID
                if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
                    return res.status(400).json({
                        success: false,
                        message: 'ID de dossier invalide'
                    })
                }

                const dossier = await Dossier.findById(id)

                if (!dossier) {
                    return res.status(404).json({
                        success: false,
                        message: 'Dossier non trouvé'
                    })
                }

                // Vérifier que le dossier peut être supprimé (par exemple, pas encore vendu)
                if (dossier.status === 'sold') {
                    return res.status(400).json({
                        success: false,
                        message: 'Impossible de supprimer un dossier déjà vendu'
                    })
                }

                await Dossier.findByIdAndDelete(id)

                res.status(200).json({
                    success: true,
                    message: 'Dossier supprimé avec succès'
                })

            } catch (error) {
                console.error('Erreur lors de la suppression du dossier:', error)
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la suppression du dossier'
                })
            }
            break

        default:
            res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}