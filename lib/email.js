import nodemailer from 'nodemailer'

// Configuration du transporteur Zoho
const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 587,
    secure: false, // true pour 465, false pour autres ports
    auth: {
        user: process.env.ZOHO_EMAIL,
        pass: process.env.ZOHO_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
})

// Templates d'email
const emailTemplates = {
    dossier_created: {
        subject: 'Dossier de vente créé avec succès',
        html: (data) => `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #1f2937; color: #fbbf24; padding: 20px; text-align: center; }
                    .content { background: #f9fafb; padding: 30px; }
                    .footer { background: #374151; color: white; padding: 15px; text-align: center; }
                    .button { display: inline-block; background: #fbbf24; color: #1f2937; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; }
                    .car-info { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #fbbf24; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Dossier de vente créé !</h1>
                    </div>
                    <div class="content">
                        <p>Bonjour ${data.firstName},</p>
                        
                        <p>Félicitations ! Votre dossier de vente a été créé avec succès.</p>
                        
                        <div class="car-info">
                            <h3>Détails de votre véhicule :</h3>
                            <p><strong>Véhicule :</strong> ${data.carBrand} ${data.carModel}</p>
                            <p><strong>Prix demandé :</strong> ${data.askingPrice?.toLocaleString()} €</p>
                        </div>
                        
                        <p>Nous allons maintenant commencer la recherche d'acheteurs potentiels pour votre véhicule. Vous pouvez suivre l'avancement en temps réel.</p>
                        
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/views/${data.dossierId}" class="button">
                                Suivre ma vente
                            </a>
                        </p>
                        
                        <p>Nous vous tiendrons informé de chaque étape du processus de vente.</p>
                        
                        <p>Cordialement,<br>L'équipe de vente</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2025 Votre Site. Tous droits réservés.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    },

    buyer_interest: {
        subject: 'Nouveau prospect intéressé par votre véhicule',
        html: (data) => `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #1f2937; color: #fbbf24; padding: 20px; text-align: center; }
                    .content { background: #f9fafb; padding: 30px; }
                    .footer { background: #374151; color: white; padding: 15px; text-align: center; }
                    .button { display: inline-block; background: #fbbf24; color: #1f2937; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; }
                    .prospect-info { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Nouveau prospect !</h1>
                    </div>
                    <div class="content">
                        <p>Bonjour ${data.firstName},</p>
                        
                        <p>Excellente nouvelle ! Nous avons un nouveau prospect intéressé par votre ${data.carBrand} ${data.carModel}.</p>
                        
                        <div class="prospect-info">
                            <h3>Informations sur le prospect :</h3>
                            <p><strong>Nom :</strong> ${data.prospectName}</p>
                            <p><strong>Contact :</strong> ${data.prospectContact}</p>
                            <p><strong>Message :</strong> ${data.prospectMessage}</p>
                        </div>
                        
                        <p>Nous vous recommandons de répondre rapidement pour maximiser vos chances de vente.</p>
                        
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/views/${data.dossierId}" class="button">
                                Voir les détails
                            </a>
                        </p>
                        
                        <p>Cordialement,<br>L'équipe de vente</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2025 Votre Site. Tous droits réservés.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    }
}

export const sendEmail = async ({ to, subject, template, data, html, text }) => {
    try {
        let emailHtml = html
        let emailSubject = subject

        // Si un template est spécifié, l'utiliser
        if (template && emailTemplates[template]) {
            emailHtml = emailTemplates[template].html(data)
            emailSubject = emailTemplates[template].subject
        }

        const mailOptions = {
            from: `"Vente Voiture" <${process.env.ZOHO_EMAIL}>`,
            to: to,
            subject: emailSubject,
            html: emailHtml,
            text: text
        }

        const info = await transporter.sendMail(mailOptions)

        console.log('Email envoyé:', info.messageId)

        return {
            success: true,
            messageId: info.messageId,
            response: info.response
        }

    } catch (error) {
        console.error('Erreur envoi email:', error)
        throw new Error('Erreur lors de l\'envoi de l\'email')
    }
}

// Fonction pour tester la configuration
export const testEmailConnection = async () => {
    try {
        await transporter.verify()
        console.log('Configuration email OK')
        return true
    } catch (error) {
        console.error('Erreur configuration email:', error)
        return false
    }
}

export default transporter