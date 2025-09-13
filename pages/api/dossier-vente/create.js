import { IncomingForm } from 'formidable'

import dbConnect from '@/lib/dbConnect'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { sendEmail } from '@/lib/email'
import DossierVente from '@/models/DossierVenteSchema'
import EstimationVoiture from '@/models/EstimationVoitureSchema'

export const config = {
    api: {
        bodyParser: false,
    },
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    try {
        await dbConnect()

        const form = new IncomingForm({
            multiples: true,
            keepExtensions: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB
        })

        const [fields, files] = await form.parse(req)

        const {
            estimationId,
            firstName,
            lastName,
            email,
            phone,
            street,
            city,
            postalCode,
            country,
            askingPrice,
            negotiable,
            urgentSale,
            availableForViewing,
            preferredContactMethod
        } = fields

        // Vérifier que l'estimation existe et est valide
        const estimation = await EstimationVoiture.findById(estimationId[0])
        if (!estimation) {
            return res.status(404).json({ message: 'Estimation non trouvée' })
        }

        /* if (estimation.status !== 'accepted') {
            return res.status(400).json({
                message: 'L\'estimation doit être acceptée avant de créer un dossier de vente'
            })
        } */

        // Vérifier si un dossier de vente existe déjà pour cette estimation
        const existingDossier = await DossierVente.findOne({ estimationId: estimationId[0] })
        if (existingDossier) {
            return res.status(409).json({
                message: 'Un dossier de vente existe déjà pour cette estimation',
                dossierId: existingDossier._id
            })
        }

        // Upload des photos
        const photoUploads = {
            exterior: [],
            interior: [],
            documents: []
        }

        // Fonction helper pour upload
        const uploadPhotos = async (fileArray, category) => {
            if (!fileArray) return []

            const uploads = Array.isArray(fileArray) ? fileArray : [fileArray]
            const uploadPromises = uploads.map(async (file) => {
                const cloudinaryResult = await uploadToCloudinary(file.filepath, {
                    folder: `dossiers-vente/${estimationId[0]}/${category}`,
                    transformation: category === 'documents' ?
                        { quality: 'auto', format: 'auto' } :
                        { quality: 'auto', format: 'auto', width: 1200, height: 800, crop: 'limit' }
                })

                return {
                    url: cloudinaryResult.secure_url,
                    description: file.originalFilename || `Photo ${category}`,
                    uploadedAt: new Date()
                }
            })

            return Promise.all(uploadPromises)
        }

        // Upload des différents types de photos
        if (files.exteriorPhotos) {
            photoUploads.exterior = await uploadPhotos(files.exteriorPhotos, 'exterior')
        }

        if (files.interiorPhotos) {
            photoUploads.interior = await uploadPhotos(files.interiorPhotos, 'interior')
        }

        if (files.documents) {
            photoUploads.documents = await uploadPhotos(files.documents, 'documents')
        }

        // Créer le dossier de vente
        const dossierVente = new DossierVente({
            estimationId: estimationId[0],
            owner: {
                firstName: firstName[0],
                lastName: lastName[0],
                email: email[0],
                phone: phone[0],
                address: {
                    street: street[0],
                    city: city[0],
                    postalCode: postalCode[0],
                    country: country[0] || 'France'
                }
            },
            carPhotos: photoUploads,
            saleInfo: {
                askingPrice: estimation.finalEstimation.amount,
                negotiable: negotiable[0] === 'true',
                urgentSale: urgentSale[0] === 'true',
                availableForViewing: availableForViewing[0] === 'true',
                preferredContactMethod: preferredContactMethod[0]
            },
            status: 'draft'
        })

        await dossierVente.save()

        // Mettre à jour le statut de l'estimation
        estimation.saleStatus = 'in_progress'
        await estimation.save()

        // Envoyer un email de confirmation
        try {
            await sendEmail({
                to: email[0],
                subject: 'Dossier de vente créé avec succès',
                template: 'dossier_created',
                data: {
                    firstName: firstName[0],
                    carBrand: estimation.brand,
                    carModel: estimation.model,
                    dossierId: dossierVente._id,
                    askingPrice: askingPrice[0]
                }
            })

            dossierVente.addCommunication(
                'email',
                'outbound',
                'Email de confirmation de création du dossier de vente',
                'noreply@votre-site.com',
                email[0],
                'Dossier de vente créé avec succès'
            )
        } catch (emailError) {
            console.error('Erreur envoi email:', emailError)
            // Ne pas faire échouer la création pour un problème d'email
        }

        res.status(201).json({
            success: true,
            message: 'Dossier de vente créé avec succès',
            dossier: {
                id: dossierVente._id,
                status: dossierVente.status,
                owner: dossierVente.owner,
                saleInfo: dossierVente.saleInfo,
                photoCount: {
                    exterior: photoUploads.exterior.length,
                    interior: photoUploads.interior.length,
                    documents: photoUploads.documents.length
                }
            }
        })

    } catch (error) {
        console.error('Erreur création dossier:', error)
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du dossier de vente',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        })
    }
}