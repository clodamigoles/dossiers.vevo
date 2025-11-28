import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import axios from '@/lib/axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, Car, Euro, Phone, Mail, Loader2, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function SaleTracking() {
    const router = useRouter()
    const { id } = router.query
    const [estimation, setEstimation] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (id) {
            fetchEstimation()
        }
    }, [id])

    const fetchEstimation = async () => {
        setLoading(true)
        setError('')
        try {
            const response = await axios.get(`/api/estimations/${id}`)
            if (response.data.success) {
                setEstimation(response.data.data)
            } else {
                setError('Estimation non trouvée')
            }
        } catch (err) {
            console.error('Erreur chargement estimation:', err)
            setError('Erreur lors du chargement')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Chargement...</p>
                </div>
            </div>
        )
    }

    if (error || !estimation) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Erreur</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">{error || 'Estimation non trouvée'}</p>
                        <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                            Retour à l'accueil
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const adminEstimation = estimation.adminEstimation
    const saleInfo = estimation.additionalInfo?.saleInfo

    return (
        <>
            <Head>
                <title>Suivi de vente - {estimation.brand} {estimation.model}</title>
                <meta name="description" content="Suivez l'avancement de votre vente" />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
            </Head>

            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.back()}
                                className="mr-2"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div className="flex-1">
                                <h1 className="text-lg font-semibold">Suivi de vente</h1>
                                <p className="text-sm text-muted-foreground">
                                    {estimation.brand} {estimation.model}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
                    {/* Statut */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                Vente en cours
                            </CardTitle>
                            <CardDescription>
                                Votre estimation a été acceptée et la procédure de vente est lancée
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
                                            <span className="text-sm font-medium">Acceptée le</span>
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
                                <CardTitle>Vos informations</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {saleInfo.firstName && saleInfo.lastName && (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-primary font-semibold">
                                                {saleInfo.firstName[0]}{saleInfo.lastName[0]}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">
                                                {saleInfo.firstName} {saleInfo.lastName}
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
                                    <p className="text-xs text-muted-foreground mb-1">Email de contact</p>
                                    <p className="text-sm font-medium flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        {estimation.email}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Prochaines étapes */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Prochaines étapes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-primary-foreground text-xs font-bold">1</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium mb-1">Vérification des documents</p>
                                        <p className="text-xs text-muted-foreground">
                                            Notre équipe vérifie les documents du véhicule
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-muted-foreground text-xs font-bold">2</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium mb-1">Prise de rendez-vous</p>
                                        <p className="text-xs text-muted-foreground">
                                            Nous vous contacterons pour organiser la remise du véhicule
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <span className="text-muted-foreground text-xs font-bold">3</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium mb-1">Finalisation de la vente</p>
                                        <p className="text-xs text-muted-foreground">
                                            Signature des documents et paiement
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

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

