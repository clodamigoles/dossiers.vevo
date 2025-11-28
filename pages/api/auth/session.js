import dbConnect from '@/lib/mongodb'
import AuthCode from '@/lib/auth-code-model'
import { parseCookies } from '@/lib/auth-utils'

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    await dbConnect()

    try {
        const cookies = parseCookies(req)
        const sessionToken = cookies.dossiers_session

        if (!sessionToken) {
            return res.status(200).json({
                success: false,
                authenticated: false
            })
        }

        // Vérifier le token de session
        const authCode = await AuthCode.findOne({
            sessionToken,
            used: true
        })

        if (!authCode) {
            return res.status(200).json({
                success: false,
                authenticated: false
            })
        }

        return res.status(200).json({
            success: true,
            authenticated: true,
            estimationId: authCode.estimationId.toString(),
            email: authCode.email
        })

    } catch (error) {
        console.error('Erreur API session:', error)
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}



