import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import axios from '@/lib/axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Loader2, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'

export default function AuthPage() {
    const router = useRouter()
    const { id } = router.query
    const [email, setEmail] = useState('')
    const [code, setCode] = useState('')
    const [step, setStep] = useState('email') // 'email' or 'code'
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [codeSent, setCodeSent] = useState(false)

    const fetchEstimationEmail = async () => {
        try {
            const response = await axios.get(`/api/estimations/${id}`)
            if (response.data.success && response.data.data.email) {
                setEmail(response.data.data.email)
            }
        } catch (err) {
            console.error('Erreur récupération email:', err)
        }
    }

    useEffect(() => {
        // Pré-remplir l'email si on a l'ID
        if (id && !email) {
            fetchEstimationEmail()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    const handleSendCode = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await axios.post('/api/auth/send-code', {
                estimationId: id,
                email: email.trim()
            })

            if (response.data.success) {
                setCodeSent(true)
                setStep('code')
            } else {
                setError(response.data.message || 'Erreur lors de l\'envoi du code')
            }
        } catch (err) {
            console.error('Erreur send code:', err)
            setError(err.response?.data?.message || 'Erreur lors de l\'envoi du code')
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyCode = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await axios.post('/api/auth/verify-code', {
                estimationId: id,
                email: email.trim(),
                code: code.trim()
            })

            if (response.data.success) {
                // Rediriger vers le dashboard après un court délai pour que le cookie soit défini
                // Le cookie est défini côté serveur, donc on attend un peu plus longtemps
                setTimeout(() => {
                    router.push(`/dashboard/${id}`)
                }, 1000)
            } else {
                setError(response.data.message || 'Code invalide')
            }
        } catch (err) {
            console.error('Erreur verify code:', err)
            setError(err.response?.data?.message || 'Code invalide')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Head>
                <title>Authentification - Dossiers Vevo</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
            </Head>

            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.back()}
                            className="mb-4 -ml-2"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Retour
                        </Button>
                        <CardTitle className="text-2xl text-center">
                            Accès sécurisé
                        </CardTitle>
                        <CardDescription className="text-center">
                            {step === 'email' 
                                ? 'Entrez votre email pour recevoir un code d\'accès'
                                : 'Entrez le code reçu par email'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {step === 'email' ? (
                            <form onSubmit={handleSendCode} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Email
                                    </label>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="votre@email.com"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                        <p className="text-sm text-destructive flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" />
                                            {error}
                                        </p>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading || !email.trim()}
                                    className="w-full"
                                    size="lg"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                            Envoi en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="h-5 w-5 mr-2" />
                                            Envoyer le code
                                        </>
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyCode} className="space-y-4">
                                {codeSent && (
                                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 mb-4">
                                        <p className="text-sm text-green-500 flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4" />
                                            Code envoyé à {email}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Code à 6 chiffres
                                    </label>
                                    <Input
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="123456"
                                        maxLength={6}
                                        required
                                        disabled={loading}
                                        className="text-center text-2xl font-mono tracking-widest"
                                        autoFocus
                                    />
                                    <p className="text-xs text-muted-foreground mt-2 text-center">
                                        Vérifiez votre boîte email
                                    </p>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                        <p className="text-sm text-destructive flex items-center gap-2">
                                            <AlertCircle className="h-4 w-4" />
                                            {error}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Button
                                        type="submit"
                                        disabled={loading || code.length !== 6}
                                        className="w-full"
                                        size="lg"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                                Vérification...
                                            </>
                                        ) : (
                                            'Vérifier le code'
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => {
                                            setStep('email')
                                            setCode('')
                                            setError('')
                                            setCodeSent(false)
                                        }}
                                        className="w-full"
                                    >
                                        Changer d'email
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    )
}

