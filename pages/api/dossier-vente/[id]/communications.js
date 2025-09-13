import dbConnect from '@/lib/dbConnect'
import DossierVente from '@/models/DossierVenteSchema'
import { sendEmail } from '@/lib/email'

export default async function handler(req, res) {
    const { id } = req.query

    await dbConnect()

    if (req.method === 'POST') {
        try {
            const { type, content, to, subject, from } = req.body

            const dossier = await DossierVente.findById(id).populate('estimationId')
            if (!dossier) {
                return res.status(404).json({
                    success: false,
                    message: 'Dossier non trouvé'
                })
            }

            // Enregistrer la communication
            await dossier.addCommunication(type, 'outbound', content, from, to, subject)

            // Si c'est un email, l'envoyer
            if (type === 'email') {
                try {
                    await sendEmail({
                        to: to,
                        subject: subject,
                        html: content
                    })

                    res.status(200).json({
                        success: true,
                        message: 'Email envoyé et enregistré avec succès'
                    })
                } catch (emailError) {
                    console.error('Erreur envoi email:', emailError)
                    res.status(500).json({
                        success: false,
                        message: 'Erreur lors de l\'envoi de l\'email'
                    })
                }
            } else {
                res.status(200).json({
                    success: true,
                    message: 'Communication enregistrée avec succès'
                })
            }

        } catch (error) {
            console.error('Erreur communication:', error)
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'enregistrement'
            })
        }
    }
    
    else if (req.method === 'GET') {
        try {
            const dossier = await DossierVente.findById(id)
                .select('communications')
                .lean()

            if (!dossier) {
                return res.status(404).json({
                    success: false,
                    message: 'Dossier non trouvé'
                })
            }

            res.status(200).json({
                success: true,
                communications: dossier.communications.sort((a, b) => 
                    new Date(b.sentAt) - new Date(a.sentAt)
                )
            })

        } catch (error) {
            console.error('Erreur récupération communications:', error)
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