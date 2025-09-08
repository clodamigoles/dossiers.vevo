import dbConnect from '../../../lib/dbConnect'
import User from '../../../models/User'
import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
    const { method } = req

    await dbConnect()

    switch (method) {
        case 'POST':
            try {
                const { token } = req.body

                if (!token) {
                    return res.status(401).json({
                        success: false,
                        message: 'Token requis'
                    })
                }

                // Vérifier et décoder le token
                let decoded
                try {
                    decoded = jwt.verify(token, process.env.JWT_SECRET)
                } catch (jwtError) {
                    return res.status(401).json({
                        success: false,
                        message: 'Token invalide ou expiré'
                    })
                }

                // Récupérer l'utilisateur
                const user = await User.findById(decoded.userId).select('-otpCode -otpExpiresAt -otpAttempts')

                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: 'Utilisateur non trouvé'
                    })
                }

                if (!user.isActive) {
                    return res.status(403).json({
                        success: false,
                        message: 'Compte désactivé'
                    })
                }

                res.status(200).json({
                    success: true,
                    data: {
                        user: {
                            _id: user._id,
                            email: user.email,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            phone: user.phone,
                            isActive: user.isActive,
                            lastLoginAt: user.lastLoginAt,
                            preferences: user.preferences,
                            createdAt: user.createdAt
                        }
                    }
                })

            } catch (error) {
                console.error('Erreur lors de la récupération des infos utilisateur:', error)
                res.status(500).json({
                    success: false,
                    message: 'Erreur serveur'
                })
            }
            break

        default:
            res.setHeader('Allow', ['POST'])
            res.status(405).end(`Method ${method} Not Allowed`)
    }
}