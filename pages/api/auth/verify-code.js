import dbConnect from '@/lib/mongodb'
import AuthCode from '@/lib/auth-code-model'
import { generateSessionToken, createSessionCookie } from '@/lib/auth-utils'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    await dbConnect()
    const { estimationId, email, code } = req.body

    try {
        if (!estimationId || !email || !code) {
            return res.status(400).json({
                success: false,
                message: 'Estimation ID, email et code requis'
            })
        }

        // Trouver le code
        const authCode = await AuthCode.findOne({
            estimationId,
            email: email.toLowerCase(),
            code,
            used: false,
            expiresAt: { $gt: new Date() }
        })

        if (!authCode) {
            return res.status(401).json({
                success: false,
                message: 'Code invalide ou expiré'
            })
        }

        // Marquer le code comme utilisé
        authCode.used = true
        authCode.usedAt = new Date()

        // Générer un token de session
        const sessionToken = generateSessionToken()
        authCode.sessionToken = sessionToken

        await authCode.save()

        // Créer le cookie de session
        const cookie = createSessionCookie(sessionToken)

        // Définir le cookie dans la réponse
        res.setHeader('Set-Cookie', cookie)
        
        // Log pour debug
        console.log('Cookie de session créé:', {
            estimationId,
            email,
            sessionToken: sessionToken.substring(0, 10) + '...',
            cookie: cookie.substring(0, 50) + '...'
        })

        return res.status(200).json({
            success: true,
            message: 'Authentification réussie',
            sessionToken
        })

    } catch (error) {
        console.error('Erreur API verify-code:', error)
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}


