import dbConnect from '../../../lib/dbConnect'
import User from '../../../models/User'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
    const { method } = req

    await dbConnect()

    switch (method) {
        case 'POST':
            try {
                const { email, otpCode } = req.body

                // Validation des données
                if (!email || !otpCode) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email et code OTP requis'
                    })
                }

                // Validation du format du code (6 chiffres)
                if (!/^\d{6}$/.test(otpCode)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Code OTP invalide (6 chiffres requis)'
                    })
                }

                const normalizedEmail = email.toLowerCase().trim()

                // Chercher l'utilisateur
                const user = await User.findOne({ email: normalizedEmail })

                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: 'Utilisateur non trouvé'
                    })
                }

                // Vérifier le code OTP
                const verificationResult = user.verifyOTP(otpCode)
                
                if (!verificationResult.success) {
                    await user.save() // Sauvegarder les tentatives
                    return res.status(400).json({
                        success: false,
                        message: verificationResult.message
                    })
                }

                // Ajouter à l'historique de connexion
                const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress
                const userAgent = req.headers['user-agent']
                
                await user.addLoginHistory(ipAddress, userAgent, true)

                // Générer le token JWT
                const token = jwt.sign(
                    { 
                        userId: user._id,
                        email: user.email 
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: '7d' }
                )

                res.status(200).json({
                    success: true,
                    message: 'Connexion réussie',
                    data: {
                        token,
                        user: {
                            _id: user._id,
                            email: user.email,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            phone: user.phone,
                            lastLoginAt: user.lastLoginAt
                        }
                    }
                })

            } catch (error) {
                console.error('Erreur lors de la vérification OTP:', error)
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur lors de la vérification du code'
                })
            }
            break

        default:
            res.setHeader('Allow', ['POST'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}