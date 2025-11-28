import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import axios from '@/lib/axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, Car, Euro, Phone, Mail, MapPin, Loader2, AlertCircle, User, FileText, Camera, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import VehiclePhotosUpload from '@/components/vehicle-photos-upload'

// Composant PayPal Button simplifié
// Note: axios est déjà importé en haut du fichier avec withCredentials: true
const PayPalButton = ({ estimationId, feesAmount, onPaymentSuccess, onError, axiosInstance }) => {
    const [isLoaded, setIsLoaded] = useState(false)

    // Charger le script PayPal
    useEffect(() => {
        if (window.paypal) {
            setIsLoaded(true)
            return
        }

        const script = document.createElement('script')
        const isProduction = process.env.NODE_ENV === 'production'
        const clientId = isProduction 
            ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
            : process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_SANDBOX || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

        if (!clientId) {
            console.error('PayPal Client ID non configuré')
            if (onError) {
                onError('PayPal Client ID non configuré')
            }
            return
        }

        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=EUR`
        script.async = true
        script.onload = () => setIsLoaded(true)
        document.head.appendChild(script)
    }, [onError])

    // Initialiser les boutons PayPal
    useEffect(() => {
        if (isLoaded && window.paypal && feesAmount > 0) {
            window.paypal
                .Buttons({
                    createOrder: (data, actions) => {
                        return actions.order.create({
                            purchase_units: [{
                                amount: {
                                    value: feesAmount.toFixed(2),
                                    currency_code: 'EUR'
                                },
                                description: 'Frais de dossier'
                            }]
                        })
                    },
                    onApprove: async (data, actions) => {
                        try {
                            console.log('PayPal onApprove - Début:', {
                                orderId: data.orderID,
                                payerID: data.payerID,
                                estimationId,
                                estimationIdType: typeof estimationId
                            })

                            const order = await actions.order.capture()
                            console.log('PayPal onApprove - Order capturé:', {
                                id: order.id,
                                status: order.status,
                                payerId: order.payer.payer_id
                            })
                            
                            // Utiliser l'instance axios passée en prop (avec withCredentials: true)
                            if (!axiosInstance) {
                                console.error('PayPal onApprove - axiosInstance non défini')
                                if (onError) {
                                    onError('Erreur de configuration du paiement')
                                }
                                return
                            }
                            
                            // S'assurer que estimationId est une string
                            const estimationIdStr = estimationId ? estimationId.toString() : estimationId
                            
                            console.log('PayPal onApprove - Envoi requête API:', {
                                estimationId: estimationIdStr,
                                paymentId: order.id,
                                payerId: order.payer.payer_id,
                                hasAxiosInstance: !!axiosInstance,
                                withCredentials: axiosInstance.defaults?.withCredentials
                            })
                            
                            // Envoyer les informations de paiement au serveur
                            const response = await axiosInstance.post('/api/payment/paypal', {
                                estimationId: estimationIdStr,
                                paymentId: order.id,
                                payerId: order.payer.payer_id
                            }, {
                                withCredentials: true // S'assurer que les cookies sont envoyés
                            })
                            
                            console.log('PayPal onApprove - Réponse API:', response.data)

                            if (response.data.success) {
                                if (onPaymentSuccess) {
                                    onPaymentSuccess()
                                }
                            } else {
                                const errorMsg = response.data.message || 'Erreur lors de l\'enregistrement du paiement'
                                if (onError) {
                                    onError(errorMsg)
                                }
                            }
                        } catch (err) {
                            console.error('Erreur paiement PayPal:', err)
                            const errorMsg = err.response?.data?.message || 'Erreur lors du paiement'
                            if (onError) {
                                onError(errorMsg)
                            }
                        }
                    },
                    onError: (err) => {
                        console.error('Erreur PayPal:', err)
                        if (onError) {
                            onError('Erreur lors du traitement du paiement PayPal')
                        }
                    },
                    onCancel: (data) => {
                        console.log('Paiement annulé par l\'utilisateur')
                    }
                })
                .render(`#paypal-button-${estimationId}`)
        }
    }, [isLoaded, estimationId, feesAmount, onPaymentSuccess, onError, axiosInstance])

    return (
        <div>
            {!isLoaded && (
                <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <p className="text-xs text-muted-foreground">Chargement du système de paiement...</p>
                </div>
            )}
            <div id={`paypal-button-${estimationId}`}></div>
        </div>
    )
}

export default function Dashboard() {
    const router = useRouter()
    const { id } = router.query
    const [estimation, setEstimation] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (id) {
            fetchDashboard()
        }
    }, [id])

    const fetchDashboard = async () => {
        setLoading(true)
        setError('')
        try {
            const response = await axios.get(`/api/dashboard/${id}`, {
                // Ajouter un timestamp pour éviter le cache
                params: {
                    _t: Date.now()
                }
            })
            if (response.data.success) {
                console.log('Dashboard data loaded:', {
                    saleStatus: response.data.data.saleStatus,
                    interiorCount: response.data.data.vehiclePhotos?.interior?.length || 0,
                    exteriorCount: response.data.data.vehiclePhotos?.exterior?.length || 0,
                    vehiclePhotos: response.data.data.vehiclePhotos
                })
                setEstimation(response.data.data)
            } else {
                setError(response.data.message || 'Erreur lors du chargement')
                if (response.data.message === 'Non authentifié' || response.data.message === 'Accès non autorisé à ce dossier') {
                    // Rediriger vers l'authentification
                    setTimeout(() => {
                        router.push(`/auth/${id}`)
                    }, 2000)
                }
            }
        } catch (err) {
            console.error('Erreur dashboard:', err)
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Vous devez vous authentifier pour accéder à ce dossier')
                setTimeout(() => {
                    router.push(`/auth/${id}`)
                }, 2000)
            } else {
                setError('Erreur lors du chargement du dossier')
            }
        } finally {
            setLoading(false)
        }
    }


    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Chargement du dossier...</p>
                </div>
            </div>
        )
    }

    if (error && !estimation) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            Erreur
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">{error}</p>
                        {error.includes('authentifier') && (
                            <p className="text-xs text-muted-foreground mb-4">
                                Redirection vers la page d'authentification...
                            </p>
                        )}
                        <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                            Retour à l'accueil
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!estimation) {
        return null
    }

    const adminEstimation = estimation.adminEstimation
    const saleInfo = estimation.additionalInfo?.saleInfo
    const isExpired = estimation.isExpired
    const daysRemaining = estimation.daysRemaining || 0
    const saleStatus = estimation.saleStatus || 'not_started'
    const vehiclePhotos = estimation.vehiclePhotos || { interior: [], exterior: [] }
    const interiorCount = Array.isArray(vehiclePhotos.interior) ? vehiclePhotos.interior.length : 0
    const exteriorCount = Array.isArray(vehiclePhotos.exterior) ? vehiclePhotos.exterior.length : 0
    
    // En cours de validation si le statut l'indique (calculer d'abord)
    const underReview = saleStatus === 'under_review' || saleStatus === 'photos_uploaded' || saleStatus === 'approved'
    
    // Photos uploadées si on a les deux types
    const photosUploaded = interiorCount > 0 && exteriorCount > 0
    
    // Afficher le formulaire seulement si :
    // 1. Le statut n'est PAS under_review (ou plus avancé) ET
    // 2. Le statut est in_progress ou not_started ET
    // 3. Il manque des photos (intérieur OU extérieur) - mais si les deux types sont présents, ne jamais afficher
    // Si le statut est under_review ou plus avancé, ne jamais afficher le formulaire
    // Si les deux types de photos sont présents, ne jamais afficher le formulaire
    const needsPhotos = !underReview && 
                       !photosUploaded &&
                       (saleStatus === 'in_progress' || saleStatus === 'not_started') && 
                       (interiorCount === 0 || exteriorCount === 0)
    
    console.log('Dashboard state:', {
        saleStatus,
        interiorCount,
        exteriorCount,
        needsPhotos,
        photosUploaded,
        underReview,
        vehiclePhotos: {
            interior: vehiclePhotos.interior?.slice(0, 2),
            exterior: vehiclePhotos.exterior?.slice(0, 2)
        }
    })

    return (
        <>
            <Head>
                <title>Mon dossier - {estimation.brand} {estimation.model}</title>
                <meta name="description" content="Suivez l'avancement de votre vente" />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
            </Head>


            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-lg font-semibold">Mon dossier</h1>
                                <p className="text-sm text-muted-foreground">
                                    {estimation.brand} {estimation.model}
                                </p>
                            </div>
                            {saleStatus === 'paid' ? (
                                <Badge className="bg-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Payé
                                </Badge>
                            ) : saleStatus === 'approved' ? (
                                <Badge className="bg-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approuvée
                                </Badge>
                            ) : saleStatus === 'completed' ? (
                                <Badge className="bg-gray-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Terminée
                                </Badge>
                            ) : underReview ? (
                                <Badge className="bg-yellow-600">
                                    <Clock className="h-3 w-3 mr-1" />
                                    En validation
                                </Badge>
                            ) : needsPhotos ? (
                                <Badge className="bg-blue-600">
                                    <Camera className="h-3 w-3 mr-1" />
                                    Photos requises
                                </Badge>
                            ) : (
                                <Badge className="bg-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    En cours
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
                    {/* Statut */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                Procédure de vente en cours
                            </CardTitle>
                            <CardDescription>
                                {saleStatus === 'paid' 
                                    ? 'Les frais de dossier ont été payés. La récupération du véhicule est en cours d\'organisation'
                                    : saleStatus === 'approved' 
                                    ? 'Votre véhicule est en cours de recherche de potentiel client'
                                    : saleStatus === 'completed'
                                    ? 'Un client a été trouvé pour votre véhicule'
                                    : needsPhotos 
                                    ? 'Veuillez ajouter les photos de votre véhicule'
                                    : underReview
                                    ? 'Vos photos sont en cours de validation'
                                    : 'Votre estimation a été acceptée et la procédure de vente est lancée'
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                    <div className="flex items-center gap-2">
                                        <Car className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-sm font-medium">Véhicule</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {estimation.brand} {estimation.model} {estimation.year}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                    <div className="flex items-center gap-2">
                                        <Euro className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-sm font-medium">Prix convenu</span>
                                    </div>
                                    <span className="text-sm font-semibold">
                                        {adminEstimation?.finalPrice?.toLocaleString('fr-FR')} €
                                    </span>
                                </div>

                                {adminEstimation?.responseAt && (
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-5 w-5 text-muted-foreground" />
                                            <span className="text-sm font-medium">Lancée le</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            {format(new Date(adminEstimation.responseAt), 'dd MMM yyyy', { locale: fr })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Informations client */}
                    {saleInfo && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Vos informations
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {saleInfo.fullName && (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-primary font-semibold">
                                                {saleInfo.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">
                                                {saleInfo.fullName}
                                            </p>
                                            {saleInfo.phone && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Phone className="h-3 w-3" />
                                                    {saleInfo.phone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="p-3 rounded-lg bg-muted/30">
                                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        Email de contact
                                    </p>
                                    <p className="text-sm font-medium">
                                        {estimation.email}
                                    </p>
                                </div>

                                {(saleInfo.addressLine1 || saleInfo.city) && (
                                    <div className="p-3 rounded-lg bg-muted/30">
                                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                                            <MapPin className="h-4 w-4" />
                                            Adresse
                                        </p>
                                        <p className="text-sm font-medium">
                                            {saleInfo.addressLine1}
                                            {saleInfo.addressLine2 && `, ${saleInfo.addressLine2}`}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {saleInfo.postalCode} {saleInfo.city}
                                            {saleInfo.country && `, ${saleInfo.country}`}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Upload de photos */}
                    {needsPhotos && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Camera className="h-5 w-5" />
                                    Photos du véhicule
                                </CardTitle>
                                <CardDescription>
                                    Ajoutez des photos intérieures et extérieures de votre véhicule
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <VehiclePhotosUpload
                                    estimationId={id}
                                    existingPhotos={vehiclePhotos}
                                    onUploadComplete={async (type, data) => {
                                        console.log('Upload complete callback:', { type, data })
                                        // Attendre que la base soit à jour
                                        await new Promise(resolve => setTimeout(resolve, 1500))
                                        // Forcer le rafraîchissement des données
                                        await fetchDashboard()
                                        // Rafraîchir une deuxième fois après un délai pour être sûr
                                        setTimeout(async () => {
                                            await fetchDashboard()
                                        }, 1000)
                                    }}
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Message si photos uploadées mais pas encore soumises */}
                    {photosUploaded && !underReview && !needsPhotos && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    Photos uploadées
                                </CardTitle>
                                <CardDescription>
                                    Vos photos sont en attente de soumission pour validation
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                    <p className="text-sm text-blue-500">
                                        Les photos seront automatiquement soumises pour validation. Veuillez patienter...
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Statut approuvé - Recherche de client */}
                    {saleStatus === 'approved' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    Recherche de client en cours
                                </CardTitle>
                                <CardDescription>
                                    Votre véhicule est en cours de recherche de potentiel client
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-green-500 mb-1">
                                                Photos approuvées
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Votre véhicule a été validé par nos agents. 
                                                Nous recherchons maintenant un client potentiel pour votre véhicule.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Statut terminé - Client trouvé */}
                    {saleStatus === 'completed' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    Client trouvé
                                </CardTitle>
                                <CardDescription>
                                    Un client a été trouvé pour votre véhicule
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                        <div className="flex items-start gap-3">
                                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-green-500 mb-1">
                                                    Client trouvé
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Un client a été trouvé pour votre véhicule. 
                                                    Veuillez procéder au paiement des frais de dossier pour finaliser la vente.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Bouton de paiement PayPal */}
                                    {!estimation.payment?.feesPaid && (
                                        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                            <p className="text-sm font-medium mb-2">Paiement des frais de dossier</p>
                                            <p className="text-xs text-muted-foreground mb-4">
                                                Montant : {process.env.NEXT_PUBLIC_FEES || 'XXX'} €
                                            </p>
                                            {error && (
                                                <div className="mb-4 p-2 rounded bg-destructive/10 border border-destructive/20">
                                                    <p className="text-xs text-destructive">{error}</p>
                                                </div>
                                            )}
                                            <PayPalButton
                                                estimationId={id}
                                                feesAmount={parseFloat(process.env.NEXT_PUBLIC_FEES || '0')}
                                                axiosInstance={axios}
                                                onPaymentSuccess={async () => {
                                                    await fetchDashboard()
                                                }}
                                                onError={(errorMsg) => {
                                                    setError(errorMsg)
                                                }}
                                            />
                                        </div>
                                    )}

                                    {estimation.payment?.feesPaid && (
                                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                                            <div className="flex items-start gap-3">
                                                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-green-500 mb-1">
                                                        Frais de dossier payés
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Les frais de dossier ont été payés le {estimation.payment?.feesPaidAt && format(new Date(estimation.payment.feesPaidAt), 'dd MMM yyyy à HH:mm', { locale: fr })}.
                                                        Nous vous contacterons prochainement pour la récupération du véhicule.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                            <p className="text-sm font-medium mb-1">Prochaines étapes :</p>
                                            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                                {!estimation.payment?.feesPaid && (
                                                    <li>Paiement des frais de dossier (en attente)</li>
                                                )}
                                                {estimation.payment?.feesPaid && (
                                                    <li>Paiement des frais de dossier (✓ payé)</li>
                                                )}
                                                <li>Récupération du véhicule à votre adresse</li>
                                                <li>Versement du montant convenu comptant sur votre compte</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Statut en validation - Ne pas afficher si approuvé ou terminé */}
                    {underReview && saleStatus !== 'approved' && saleStatus !== 'completed' && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-yellow-500" />
                                    En cours de validation
                                </CardTitle>
                                <CardDescription>
                                    Vos photos sont en cours de validation par nos agents
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                        <div className="flex items-start gap-3">
                                            <Eye className="h-5 w-5 text-yellow-500 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-yellow-500 mb-1">
                                                    Validation en cours
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Nos agents vérifient les photos que vous avez fournies. 
                                                    Vous serez notifié une fois la validation terminée.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Aperçu des photos uploadées */}
                                    {(vehiclePhotos.interior?.length > 0 || vehiclePhotos.exterior?.length > 0) && (
                                        <div className="space-y-3">
                                            {vehiclePhotos.interior?.length > 0 && (
                                                <div>
                                                    <p className="text-sm font-medium mb-2">
                                                        Photos intérieures ({vehiclePhotos.interior.length})
                                                    </p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {vehiclePhotos.interior.slice(0, 6).map((url, index) => (
                                                            <div key={index} className="aspect-square rounded-lg overflow-hidden border border-border">
                                                                <img
                                                                    src={url}
                                                                    alt={`Intérieur ${index + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {vehiclePhotos.exterior?.length > 0 && (
                                                <div>
                                                    <p className="text-sm font-medium mb-2">
                                                        Photos extérieures ({vehiclePhotos.exterior.length})
                                                    </p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {vehiclePhotos.exterior.slice(0, 6).map((url, index) => (
                                                            <div key={index} className="aspect-square rounded-lg overflow-hidden border border-border">
                                                                <img
                                                                    src={url}
                                                                    alt={`Extérieur ${index + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Prochaines étapes */}
                    {!needsPhotos && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Prochaines étapes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {saleStatus === 'approved' && (
                                        <>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <CheckCircle className="h-4 w-4 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium mb-1">
                                                        Photos validées
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Vos photos ont été approuvées par nos agents
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-primary-foreground text-xs font-bold">2</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium mb-1">Recherche de client</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Nous recherchons un client potentiel pour votre véhicule
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-muted-foreground text-xs font-bold">3</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium mb-1">Client trouvé</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Vous serez notifié lorsqu'un client sera trouvé
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    {saleStatus === 'completed' && (
                                        <>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <CheckCircle className="h-4 w-4 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium mb-1">
                                                        Client trouvé
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Un client a été trouvé pour votre véhicule
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-primary-foreground text-xs font-bold">2</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium mb-1">Paiement des frais de dossier</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Vous devrez payer les frais de dossier pour finaliser la vente
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-muted-foreground text-xs font-bold">3</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium mb-1">Récupération du véhicule</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Nous viendrons chercher votre véhicule à votre adresse
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-muted-foreground text-xs font-bold">4</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium mb-1">Versement de l'argent</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Le montant convenu vous sera versé comptant sur votre compte
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    {saleStatus === 'paid' && (
                                        <>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <CheckCircle className="h-4 w-4 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium mb-1">
                                                        Client trouvé
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Un client a été trouvé pour votre véhicule
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <CheckCircle className="h-4 w-4 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium mb-1">Frais de dossier payés</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Les frais de dossier ont été payés avec succès
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-primary-foreground text-xs font-bold">3</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium mb-1">Récupération du véhicule</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Nous viendrons chercher votre véhicule à votre adresse
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-muted-foreground text-xs font-bold">4</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium mb-1">Versement de l'argent</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Le montant convenu vous sera versé comptant sur votre compte
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    {saleStatus !== 'approved' && saleStatus !== 'completed' && saleStatus !== 'paid' && (
                                        <>
                                            <div className="flex items-start gap-3">
                                                <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${underReview ? 'bg-yellow-500' : 'bg-primary'}`}>
                                                    <span className="text-primary-foreground text-xs font-bold">1</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium mb-1">
                                                        {underReview ? 'Validation des photos' : 'Vérification des documents'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {underReview 
                                                            ? 'Nos agents vérifient les photos que vous avez fournies'
                                                            : 'Notre équipe vérifie les documents du véhicule'
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-muted-foreground text-xs font-bold">2</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium mb-1">Recherche de client</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Nous rechercherons un client potentiel pour votre véhicule
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-muted-foreground text-xs font-bold">3</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium mb-1">Finalisation</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Paiement des frais, récupération du véhicule et versement
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Contact */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Besoin d'aide ?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Notre équipe est à votre disposition pour répondre à toutes vos questions.
                            </p>
                            <div className="space-y-2">
                                <Button variant="outline" className="w-full justify-start" size="lg">
                                    <Phone className="h-5 w-5 mr-2" />
                                    Nous appeler
                                </Button>
                                <Button variant="outline" className="w-full justify-start" size="lg">
                                    <Mail className="h-5 w-5 mr-2" />
                                    Nous envoyer un email
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}


