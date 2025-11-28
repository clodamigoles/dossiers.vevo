import dbConnect from '@/lib/mongodb'
import EstimationVoiture from '@/lib/estimation-model'
import AuthCode from '@/lib/auth-code-model'
import { parseCookies } from '@/lib/auth-utils'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    await dbConnect()
    const { estimationId, paymentId, payerId } = req.body

    try {
        // Vérifier la session
        const cookies = parseCookies(req)
        const sessionToken = cookies.dossiers_session

        console.log('Payment API - Vérification session:', {
            hasCookies: !!req.headers.cookie,
            hasSessionToken: !!sessionToken,
            cookiesKeys: Object.keys(cookies),
            estimationId,
            estimationIdType: typeof estimationId
        })

        if (!sessionToken) {
            console.log('Payment API - Aucun token de session trouvé')
            return res.status(401).json({
                success: false,
                message: 'Non authentifié'
            })
        }

        // Convertir estimationId en ObjectId si nécessaire
        const mongoose = require('mongoose')
        let estimationIdObj
        try {
            estimationIdObj = mongoose.Types.ObjectId.isValid(estimationId) 
                ? new mongoose.Types.ObjectId(estimationId) 
                : estimationId
        } catch (err) {
            console.error('Erreur conversion estimationId:', err)
            return res.status(400).json({
                success: false,
                message: 'ID d\'estimation invalide'
            })
        }

        // Vérifier que le token correspond à cette estimation
        // Chercher d'abord avec l'estimationId comme ObjectId
        let authCode = await AuthCode.findOne({
            sessionToken,
            estimationId: estimationIdObj,
            used: true
        })

        // Si non trouvé, chercher avec l'estimationId comme string
        if (!authCode) {
            authCode = await AuthCode.findOne({
                sessionToken,
                $or: [
                    { estimationId: estimationIdObj },
                    { estimationId: estimationId.toString() }
                ],
                used: true
            })
        }

        // Si toujours non trouvé, chercher tous les AuthCode pour ce sessionToken pour debug
        if (!authCode) {
            const allAuthCodes = await AuthCode.find({
                sessionToken,
                used: true
            }).lean()
            
            console.log('Payment API - AuthCodes trouvés pour ce sessionToken:', {
                count: allAuthCodes.length,
                authCodes: allAuthCodes.map(ac => ({
                    estimationId: ac.estimationId?.toString(),
                    estimationIdType: typeof ac.estimationId,
                    email: ac.email
                })),
                requestedEstimationId: estimationId.toString(),
                requestedEstimationIdObj: estimationIdObj.toString()
            })
        }

        console.log('Payment API - AuthCode trouvé:', {
            found: !!authCode,
            estimationId: authCode?.estimationId?.toString(),
            estimationIdType: typeof authCode?.estimationId,
            email: authCode?.email,
            requestedEstimationId: estimationId.toString(),
            requestedEstimationIdObj: estimationIdObj.toString()
        })

        if (!authCode) {
            console.log('Payment API - AuthCode non trouvé pour cette estimation')
            return res.status(403).json({
                success: false,
                message: 'Accès non autorisé à ce dossier. Vérifiez que vous êtes bien connecté à votre compte.'
            })
        }

        // Récupérer l'estimation
        const estimation = await EstimationVoiture.findById(estimationIdObj)

        if (!estimation) {
            return res.status(404).json({
                success: false,
                message: 'Estimation non trouvée'
            })
        }

        // Vérifier que le statut est "completed"
        if (estimation.saleStatus !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Le paiement ne peut être effectué que lorsque le statut est "terminé"'
            })
        }

        // Vérifier que les frais ne sont pas déjà payés
        if (estimation.payment?.feesPaid) {
            return res.status(400).json({
                success: false,
                message: 'Les frais ont déjà été payés'
            })
        }

        // Récupérer le montant des frais depuis l'environnement
        const feesAmount = parseFloat(process.env.FEES || '0')
        
        if (!feesAmount || feesAmount <= 0) {
            return res.status(500).json({
                success: false,
                message: 'Configuration des frais manquante'
            })
        }

        // Ici, vous devriez vérifier le paiement PayPal avec l'API PayPal
        // Pour l'instant, on simule la validation du paiement
        // TODO: Intégrer l'API PayPal pour vérifier le paiement réel
        // const paypalResponse = await verifyPayPalPayment(paymentId, payerId)

        // Mettre à jour l'estimation avec le paiement
        if (!estimation.payment) {
            estimation.payment = {
                feesPaid: false,
                feesAmount: null,
                feesPaidAt: null,
                paymentMethod: null,
                paymentId: null,
                paymentDetails: null
            }
        }

        estimation.payment.feesPaid = true
        estimation.payment.feesAmount = feesAmount
        estimation.payment.feesPaidAt = new Date()
        estimation.payment.paymentMethod = 'paypal'
        estimation.payment.paymentId = paymentId
        estimation.payment.paymentDetails = {
            payerId,
            verified: true,
            verifiedAt: new Date()
        }

        // Mettre à jour le statut de vente
        estimation.saleStatus = 'paid'

        await estimation.save()

        console.log('Paiement enregistré:', {
            estimationId,
            paymentId,
            feesAmount,
            saleStatus: estimation.saleStatus
        })

        return res.status(200).json({
            success: true,
            message: 'Paiement enregistré avec succès',
            data: {
                estimationId: estimation._id,
                feesPaid: true,
                feesAmount,
                saleStatus: estimation.saleStatus
            }
        })

    } catch (error) {
        console.error('Erreur API payment PayPal:', error)
        return res.status(500).json({
            success: false,
            message: error.message || 'Erreur lors du traitement du paiement'
        })
    }
}

