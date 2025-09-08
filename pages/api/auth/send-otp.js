import dbConnect from '../../../lib/dbConnect'
import User from '../../../models/User'
import { sendOTPEmail } from '../../../lib/emailService'

export default async function handler(req, res) {
    const { method } = req

    await dbConnect()

    switch (method) {
        case 'POST':
            try {
                const { email } = req.body

                // Validation de l'email
                if (!email) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email requis'
                    })
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if (!emailRegex.test(email)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Format d\'email invalide'
                    })
                }

                const normalizedEmail = email.toLowerCase().trim()

                // Chercher l'utilisateur
                let user = await User.findOne({ email: normalizedEmail })

                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: 'Aucun compte trouvé avec cette adresse email'
                    })
                }

                // Vérifier si l'utilisateur est actif
                if (!user.isActive) {
                    return res.status(403).json({
                        success: false,
                        message: 'Compte désactivé, contactez le support'
                    })
                }

                // Vérifier si un OTP n'a pas été envoyé récemment (limite: 1 par minute)
                if (user.otpExpiresAt && new Date() < new Date(user.otpExpiresAt.getTime() - 9 * 60 * 1000)) {
                    return res.status(429).json({
                        success: false,
                        message: 'Un code a déjà été envoyé, veuillez patienter avant de redemander'
                    })
                }

                // Générer le code OTP
                const otpCode = user.generateOTP()
                await user.save()

                // Envoyer l'email avec le code OTP
                try {
                    await sendOTPEmail(user.email, otpCode, user.firstName)
                    
                    res.status(200).json({
                        success: true,
                        message: 'Code de connexion envoyé par email',
                        data: {
                            email: user.email,
                            expiresIn: 10 // minutes
                        }
                    })

                } catch (emailError) {
                    console.error('Erreur envoi email OTP:', emailError)
                    
                    // Nettoyer l'OTP en cas d'erreur d'envoi
                    user.otpCode = undefined
                    user.otpExpiresAt = undefined
                    await user.save()

                    return res.status(500).json({
                        success: false,
                        message: 'Erreur lors de l\'envoi de l\'email, veuillez réessayer'
                    })
                }

            } catch (error) {
                console.error('Erreur lors de l\'envoi OTP:', error)
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de l\'envoi du code'
                })
            }
            break

        default:
            res.setHeader('Allow', ['POST'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}