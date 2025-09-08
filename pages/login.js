import { useState } from 'react'
import { useRouter } from 'next/router'
import Image from 'next/image'
import userService from '../services/userService'
import { APP_NAME } from '@/constants/config'

export default function LoginPage() {
    const router = useRouter()
    const [step, setStep] = useState('email') // 'email' ou 'otp'
    const [email, setEmail] = useState('')
    const [otpCode, setOtpCode] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')

    const handleSendOTP = async () => {
        if (!email) return
        
        setIsLoading(true)
        setError('')
        
        try {
            const result = await userService.sendOTP(email)
            
            if (result.status === 200) {
                setSuccessMessage('Code envoyé ! Vérifiez votre email.')
                setStep('otp')
            } else {
                setError(result.data?.message || 'Erreur lors de l\'envoi du code')
            }
        } catch (err) {
            setError('Erreur réseau')
        } finally {
            setIsLoading(false)
        }
    }

    const handleVerifyOTP = async () => {
        if (!otpCode || otpCode.length !== 6) {
            setError('Veuillez saisir un code à 6 chiffres')
            return
        }
        
        setIsLoading(true)
        setError('')
        
        try {
            const result = await userService.verifyOTP(email, otpCode)
            
            if (result.status === 200) {
                // Sauvegarder le token
                localStorage.setItem('auth_token', result.data.data.token)
                localStorage.setItem('user_data', JSON.stringify(result.data.data.user))
                
                // Redirection vers l'app
                router.push('/app')
            } else {
                setError(result.data?.message || 'Code incorrect')
            }
        } catch (err) {
            setError('Erreur réseau')
        } finally {
            setIsLoading(false)
        }
    }

    const handleBackToEmail = () => {
        setStep('email')
        setOtpCode('')
        setError('')
        setSuccessMessage('')
    }

    const handleResendCode = async () => {
        await handleSendOTP()
    }

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 pt-16 pb-8 px-6">
                <div className="text-center">
                    <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Image
                            src="/images/logo.png"
                            width={64}
                            height={64}
                            alt={`Logo ${APP_NAME}`}
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {step === 'email' ? 'Connexion' : 'Vérification'}
                    </h1>
                    <p className="text-gray-400">
                        {step === 'email' 
                            ? 'Saisissez votre email pour continuer'
                            : 'Saisissez le code reçu par email'
                        }
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-6">
                {/* Messages */}
                {error && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L5.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {successMessage && (
                    <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <p className="text-green-400 text-sm">{successMessage}</p>
                        </div>
                    </div>
                )}

                {/* Email Step */}
                {step === 'email' && (
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                                Adresse email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                placeholder="votre@email.com"
                                disabled={isLoading}
                            />
                        </div>

                        <button
                            onClick={handleSendOTP}
                            disabled={isLoading || !email}
                            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-semibold py-4 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Envoi en cours...
                                </>
                            ) : (
                                'Envoyer le code'
                            )}
                        </button>
                    </div>
                )}

                {/* OTP Step */}
                {step === 'otp' && (
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-2">
                                Code à 6 chiffres
                            </label>
                            <input
                                type="text"
                                id="otp"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                placeholder="123456"
                                maxLength={6}
                                disabled={isLoading}
                            />
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                Code envoyé à <span className="text-yellow-400">{email}</span>
                            </p>
                        </div>

                        <button
                            onClick={handleVerifyOTP}
                            disabled={isLoading || otpCode.length !== 6}
                            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-semibold py-4 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2"></div>
                                    Vérification...
                                </>
                            ) : (
                                'Se connecter'
                            )}
                        </button>

                        {/* Actions secondaires */}
                        <div className="flex flex-col space-y-3">
                            <button
                                onClick={handleResendCode}
                                disabled={isLoading}
                                className="text-yellow-400 hover:text-yellow-300 text-sm font-medium"
                            >
                                Renvoyer le code
                            </button>
                            
                            <button
                                onClick={handleBackToEmail}
                                disabled={isLoading}
                                className="text-gray-400 hover:text-gray-300 text-sm"
                            >
                                ← Modifier l'email
                            </button>
                        </div>
                    </div>
                )}

                {/* Info text */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500">
                        {step === 'email' 
                            ? 'Un code de connexion sera envoyé à votre adresse email'
                            : 'Le code est valide pendant 10 minutes'
                        }
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-6 text-center">
                <p className="text-xs text-gray-600">
                    © 2025 {APP_NAME}
                </p>
            </div>
        </div>
    )
}