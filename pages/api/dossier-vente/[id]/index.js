import dbConnect from '@/lib/dbConnect'
import DossierVente from '@/models/DossierVenteSchema'
import EstimationVoiture from '@/models/EstimationVoitureSchema'

export default async function handler(req, res) {
    const { id } = req.query

    await dbConnect()

    if (req.method === 'GET') {
        try {
            const dossier = await DossierVente.findById(id)
                .populate('estimationId')
                .lean()

            if (!dossier) {
                return res.status(404).json({
                    success: false,
                    message: 'Dossier de vente non trouvé'
                })
            }

            // Incrémenter le compteur de vues
            await DossierVente.findByIdAndUpdate(id, {
                $inc: { 'metadata.viewCount': 1 }
            })

            res.status(200).json({
                success: true,
                dossier: {
                    id: dossier._id,
                    status: dossier.status,
                    owner: dossier.owner,
                    saleInfo: dossier.saleInfo,
                    searchSteps: dossier.searchSteps,
                    communications: dossier.communications,
                    buyer: dossier.buyer,
                    metadata: dossier.metadata,
                    createdAt: dossier.createdAt,
                    activatedAt: dossier.activatedAt,
                    soldAt: dossier.soldAt,
                    expiresAt: dossier.expiresAt,
                    carPhotos: dossier.carPhotos,
                    internalNotes: dossier.internalNotes?.filter(note => !note.private) || []
                },
                estimation: dossier.estimationId ? {
                    brand: dossier.estimationId.brand,
                    model: dossier.estimationId.model,
                    year: dossier.estimationId.year,
                    bodyType: dossier.estimationId.bodyType,
                    fuelType: dossier.estimationId.fuelType,
                    mileage: dossier.estimationId.mileage,
                    horsepower: dossier.estimationId.horsepower,
                    transmission: dossier.estimationId.transmission,
                    doors: dossier.estimationId.doors
                } : null
            })

        } catch (error) {
            console.error('Erreur récupération dossier:', error)
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération du dossier'
            })
        }
    }

    else if (req.method === 'PUT') {
        try {
            const { action, data } = req.body

            const dossier = await DossierVente.findById(id)
            if (!dossier) {
                return res.status(404).json({
                    success: false,
                    message: 'Dossier non trouvé'
                })
            }

            switch (action) {
                case 'activate':
                    if (dossier.status === 'draft') {
                        await dossier.activate()
                        res.json({ success: true, message: 'Dossier activé avec succès' })
                    } else {
                        res.status(400).json({ success: false, message: 'Dossier déjà activé' })
                    }
                    break

                case 'update_price':
                    dossier.saleInfo.askingPrice = data.price
                    dossier.saleInfo.negotiable = data.negotiable
                    await dossier.save()
                    res.json({ success: true, message: 'Prix mis à jour' })
                    break

                case 'update_contact_preference':
                    dossier.saleInfo.preferredContactMethod = data.method
                    await dossier.save()
                    res.json({ success: true, message: 'Préférences mises à jour' })
                    break

                case 'mark_sold':
                    await dossier.markAsSold(data.buyerInfo, data.finalPrice)
                    res.json({ success: true, message: 'Dossier marqué comme vendu' })
                    break

                case 'cancel':
                    dossier.status = 'cancelled'
                    await dossier.save()
                    res.json({ success: true, message: 'Dossier annulé' })
                    break

                default:
                    res.status(400).json({ success: false, message: 'Action non reconnue' })
            }

        } catch (error) {
            console.error('Erreur mise à jour dossier:', error)
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour'
            })
        }
    }

    else {
        res.status(405).json({ message: 'Method not allowed' })
    }
}