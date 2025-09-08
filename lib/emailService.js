import nodemailer from 'nodemailer'

// Configuration du transporteur email
const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

// Fonction pour envoyer le code OTP
export const sendOTPEmail = async (email, otpCode, firstName = '') => {
    const subject = 'Code de connexion - VehicleSale App'
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #1f2937; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .logo { width: 60px; height: 60px; background-color: #fbbf24; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; }
                .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                .otp-code { font-size: 32px; font-weight: bold; color: #fbbf24; text-align: center; letter-spacing: 8px; margin: 30px 0; padding: 20px; background-color: white; border-radius: 10px; border: 2px solid #fbbf24; }
                .info { background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #fbbf24; }
                .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🚗</div>
                    <h1>Code de connexion</h1>
                </div>
                
                <div class="content">
                    <p>Bonjour${firstName ? ` ${firstName}` : ''},</p>
                    
                    <p>Voici votre code de connexion pour accéder à votre espace VehicleSale :</p>
                    
                    <div class="otp-code">${otpCode}</div>
                    
                    <div class="info">
                        <strong>⏱️ Important :</strong> Ce code est valide pendant <strong>10 minutes</strong> uniquement.
                    </div>
                    
                    <p>Si vous n'avez pas demandé ce code, vous pouvez ignorer cet email en toute sécurité.</p>
                    
                    <p>Pour des raisons de sécurité, ne partagez jamais ce code avec qui que ce soit.</p>
                    
                    <p>Cordialement,<br>L'équipe VehicleSale</p>
                </div>
                
                <div class="footer">
                    <p>© 2025 VehicleSale App - Tous droits réservés</p>
                    <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                </div>
            </div>
        </body>
        </html>
    `

    const textContent = `
        Code de connexion - VehicleSale App
        
        Bonjour${firstName ? ` ${firstName}` : ''},
        
        Voici votre code de connexion : ${otpCode}
        
        Ce code est valide pendant 10 minutes uniquement.
        
        Si vous n'avez pas demandé ce code, ignorez cet email.
        
        Cordialement,
        L'équipe VehicleSale
    `

    const mailOptions = {
        from: `"VehicleSale App" <${process.env.SMTP_FROM}>`,
        to: email,
        subject: subject,
        text: textContent,
        html: htmlContent
    }

    try {
        const info = await transporter.sendMail(mailOptions)
        console.log('Email OTP envoyé:', info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.error('Erreur envoi email OTP:', error)
        throw error
    }
}

// Fonction pour tester la configuration email
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