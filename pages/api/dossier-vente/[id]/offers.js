import dbConnect from '@/lib/dbConnect'
import DossierVente from '@/models/DossierVenteSchema'
import { sendEmail } from '@/lib/email'

export default async function handler(req, res) {
    const { id } = req.query

    await dbConnect()

    if (req.method === 'POST') {
        try {
            const { buyerId, buyerName, buyerEmail, buyerPhone, amount, conditions, message } = req.body

            const dossier = await DossierVente.findById(id).populate('estimationId')
            if (!dossier) {
                return res.status(404).json({
                    success: false,
                    message: 'Dossier non trouvé'
                })
            }

            // Ajouter l'offre
            await dossier.addOffer(buyerId, amount, conditions)

            // Envoyer une notification au propriétaire
            try {
                await sendEmail({
                    to: dossier.owner.email,
                    template: 'buyer_interest',
                    data: {
                        firstName: dossier.owner.firstName,
                        carBrand: dossier.estimationId.brand,
                        carModel: dossier.estimationId.model,
                        prospectName: buyerName,
                        prospectContact: `${buyerEmail} - ${buyerPhone}`,
                        prospectMessage: message,
                        offerAmount: amount,
                        dossierId: dossier._id
                    }
                })

                // Enregistrer la communication
                await dossier.addCommunication(
                    'email',
                    'outbound',
                    `Notification d'offre de ${buyerName} pour ${amount}€`,
                    'noreply@votre-site.com',
                    dossier.owner.email,
                    'Nouvelle offre pour votre véhicule'
                )

            } catch (emailError) {
                console.error('Erreur notification email:', emailError)
            }

            res.status(201).json({
                success: true,
                message: 'Offre enregistrée avec succès',
                offer: {
                    buyerId,
                    amount,
                    conditions,
                    createdAt: new Date()
                }
            })

        } catch (error) {
            console.error('Erreur enregistrement offre:', error)
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'enregistrement de l\'offre'
            })
        }
    }

    else if (req.method === 'PUT') {
        try {
            const { offerId, status, counterOffer } = req.body

            const dossier = await DossierVente.findById(id)
            if (!dossier) {
                return res.status(404).json({
                    success: false,
                    message: 'Dossier non trouvé'
                })
            }

            // Trouver et mettre à jour l'offre
            const offer = dossier.searchSteps.buyerInterest.offers.id(offerId)
            if (!offer) {
                return res.status(404).json({
                    success: false,
                    message: 'Offre non trouvée'
                })
            }

            offer.status = status
            if (counterOffer) {
                offer.counterOffer = counterOffer
            }

            await dossier.save()

            // Si l'offre est acceptée, marquer le dossier comme vendu
            if (status === 'accepted') {
                dossier.status = 'sold'
                dossier.soldAt = new Date()
                await dossier.save()
            }

            res.status(200).json({
                success: true,
                message: 'Offre mise à jour avec succès'
            })

        } catch (error) {
            console.error('Erreur mise à jour offre:', error)
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour'
            })
        }
    }

    else if (req.method === 'GET') {
        try {
            const dossier = await DossierVente.findById(id)
                .select('searchSteps.buyerInterest.offers')
                .lean()

            if (!dossier) {
                return res.status(404).json({
                    success: false,
                    message: 'Dossier non trouvé'
                })
            }

            res.status(200).json({
                success: true,
                offers: dossier.searchSteps.buyerInterest.offers.sort((a, b) => 
                    new Date(b.createdAt) - new Date(a.createdAt)
                )
            })

        } catch (error) {
            console.error('Erreur récupération offres:', error)
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération'
            })
        }
    }

    else {
        res.status(405).json({ message: 'Method not allowed' })
    }
}