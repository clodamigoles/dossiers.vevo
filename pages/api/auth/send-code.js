import dbConnect from '@/lib/mongodb'
import AuthCode from '@/lib/auth-code-model'
import transporter from '@/lib/email-transport'
import { generateAuthCode } from '@/lib/auth-utils'
import EstimationVoiture from '@/lib/estimation-model'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_PASSWORD) {
        return res.status(500).json({
            success: false,
            message: 'Configuration email manquante'
        })
    }

    await dbConnect()
    const { estimationId, email } = req.body

    try {
        if (!estimationId || !email) {
            return res.status(400).json({
                success: false,
                message: 'Estimation ID et email requis'
            })
        }

        // Vérifier que l'estimation existe
        const estimation = await EstimationVoiture.findById(estimationId)
        if (!estimation) {
            return res.status(404).json({
                success: false,
                message: 'Estimation non trouvée'
            })
        }

        // Vérifier que l'email correspond
        if (estimation.email.toLowerCase() !== email.toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: 'Email ne correspond pas à l\'estimation'
            })
        }

        // Générer un code
        const code = generateAuthCode()
        const expiresAt = new Date()
        expiresAt.setMinutes(expiresAt.getMinutes() + 15) // Code valide 15 minutes

        // Supprimer les anciens codes non utilisés pour cette estimation
        await AuthCode.updateMany(
            {
                estimationId,
                email: email.toLowerCase(),
                used: false,
                expiresAt: { $gt: new Date() }
            },
            { used: true }
        )

        // Créer un nouveau code
        const authCode = new AuthCode({
            estimationId,
            email: email.toLowerCase(),
            code,
            expiresAt
        })
        await authCode.save()

        // Envoyer l'email
        const emailHtml = `
            <div style="max-width: 600px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; color: #1a1a1a;">
                <div style="background: #1a1a1a; padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Code d'accès</h1>
                </div>
                
                <div style="padding: 40px 30px; background: white;">
                    <h2 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">Bonjour,</h2>
                    
                    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Vous avez demandé un code d'accès pour votre dossier de vente.
                    </p>
                    
                    <div style="background: #f5f5f5; padding: 30px; border-radius: 8px; margin: 30px 0; text-align: center; border: 2px dashed #1a1a1a;">
                        <p style="margin: 0 0 10px 0; color: #1a1a1a; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Votre code d'accès</p>
                        <p style="margin: 0; color: #1a1a1a; font-size: 48px; font-weight: 700; letter-spacing: 8px; font-family: monospace;">${code}</p>
                    </div>
                    
                    <p style="color: #6c757d; font-size: 14px; margin: 30px 0 0 0; text-align: center;">
                        Ce code est valide pendant 15 minutes.<br>
                        Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email.
                    </p>
                </div>
            </div>
        `

        try {
            await transporter.sendMail({
                from: `"Vevo" <${process.env.ZOHO_EMAIL}>`,
                to: email,
                subject: 'Code d\'accès - Dossiers Vevo',
                html: emailHtml
            })
        } catch (emailError) {
            console.error('Erreur envoi email:', emailError)
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'envoi de l\'email'
            })
        }

        return res.status(200).json({
            success: true,
            message: 'Code envoyé par email'
        })

    } catch (error) {
        console.error('Erreur API send-code:', error)
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}



