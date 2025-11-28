import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import axios from '@/lib/axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { CheckCircle, Clock, AlertCircle, Car, Euro, Loader2, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function AcceptEstimation() {
    const router = useRouter()
    const { id } = router.query
    const [estimation, setEstimation] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        postalCode: '',
        city: '',
        country: 'France'
    })

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
                const data = response.data.data
                
                if (!data.adminEstimation) {
                    setError('Aucune estimation finale disponible pour ce véhicule')
                    return
                }

                // Vérifier si la procédure est déjà lancée
                if (data.status === 'accepted' || data.saleStatus === 'in_progress') {
                    // Rediriger vers l'authentification puis le dashboard
                    router.push(`/auth/${id}`)
                    return
                }

                // Pré-remplir les champs avec les données existantes
                const saleInfo = data.additionalInfo?.saleInfo || {}
                setFormData({
                    fullName: saleInfo.fullName || '',
                    email: data.email || '',
                    phone: saleInfo.phone || '',
                    addressLine1: saleInfo.addressLine1 || '',
                    addressLine2: saleInfo.addressLine2 || '',
                    postalCode: saleInfo.postalCode || '',
                    city: saleInfo.city || '',
                    country: saleInfo.country || 'France'
                })

                setEstimation(data)
            } else {
                setError('Estimation non trouvée')
            }
        } catch (err) {
            console.error('Erreur chargement estimation:', err)
            setError('Erreur lors du chargement de l\'estimation')
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        
        // Validation
        if (!formData.fullName.trim()) {
            setError('Le nom complet est requis')
            return
        }
        if (!formData.email.trim()) {
            setError('L\'email est requis')
            return
        }
        if (!formData.phone.trim()) {
            setError('Le téléphone est requis')
            return
        }
        if (!formData.addressLine1.trim()) {
            setError('L\'adresse est requise')
            return
        }
        if (!formData.postalCode.trim()) {
            setError('Le code postal est requis')
            return
        }
        if (!formData.city.trim()) {
            setError('La ville est requise')
            return
        }

        setSubmitting(true)
        try {
            const response = await axios.post(`/api/estimations/${id}/start-sale`, {
                fullName: formData.fullName.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                addressLine1: formData.addressLine1.trim(),
                addressLine2: formData.addressLine2.trim(),
                postalCode: formData.postalCode.trim(),
                city: formData.city.trim(),
                country: formData.country.trim()
            })

            if (response.data.success) {
                // Rediriger vers l'authentification
                router.push(`/auth/${id}`)
            } else {
                setError(response.data.message || 'Erreur lors du lancement de la procédure')
            }
        } catch (err) {
            console.error('Erreur start sale:', err)
            setError(err.response?.data?.message || 'Erreur lors du lancement de la procédure')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Chargement de l'estimation...</p>
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
    const isExpired = estimation.isExpired
    const daysRemaining = estimation.daysRemaining || 0

    return (
        <>
            <Head>
                <title>Lancer la procédure de vente - {estimation.brand} {estimation.model}</title>
                <meta name="description" content="Lancez la procédure de vente pour votre véhicule" />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
            </Head>

            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-card border-b border-border shadow-sm">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.back()}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <div>
                                <h1 className="text-lg font-semibold">Lancer la procédure de vente</h1>
                                <p className="text-sm text-muted-foreground">
                                    {estimation.brand} {estimation.model}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">
                    {/* Carte estimation */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-xl mb-2">
                                        {estimation.brand} {estimation.model} {estimation.year}
                                    </CardTitle>
                                    <CardDescription>
                                        {estimation.bodyType} • {estimation.fuelType} • {estimation.mileage?.toLocaleString()} km
                                    </CardDescription>
                                </div>
                                <Car className="h-8 w-8 text-muted-foreground" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Prix */}
                            <div className="bg-muted/50 rounded-lg p-4 border border-border">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-1">Prix proposé</p>
                                        <p className="text-3xl font-bold flex items-center gap-2">
                                            <Euro className="h-6 w-6" />
                                            {adminEstimation.finalPrice.toLocaleString('fr-FR')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Validité */}
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                                {isExpired ? (
                                    <>
                                        <AlertCircle className="h-5 w-5 text-orange-500" />
                                        <div>
                                            <p className="text-sm font-medium">Offre toujours valable</p>
                                            <p className="text-xs text-muted-foreground">
                                                Bien que la période initiale soit écoulée, cette estimation reste valable
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Clock className="h-5 w-5 text-blue-500" />
                                        <div>
                                            <p className="text-sm font-medium">
                                                {daysRemaining} jour{daysRemaining > 1 ? 's' : ''} restant{daysRemaining > 1 ? 's' : ''}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Valable jusqu'au {format(new Date(adminEstimation.validUntil), 'dd MMMM yyyy', { locale: fr })}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Formulaire */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Informations de contact</CardTitle>
                            <CardDescription>
                                Remplissez vos informations pour lancer la procédure de vente
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && (
                                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                        <p className="text-sm text-destructive">{error}</p>
                                    </div>
                                )}

                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Nom complet *
                                    </label>
                                    <Input
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        placeholder="Jean Dupont"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Email *
                                    </label>
                                    <Input
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="jean.dupont@example.com"
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Vous pouvez modifier l'email si nécessaire
                                    </p>
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Téléphone *
                                    </label>
                                    <Input
                                        name="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="06 12 34 56 78"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Adresse ligne 1 *
                                    </label>
                                    <Input
                                        name="addressLine1"
                                        value={formData.addressLine1}
                                        onChange={handleInputChange}
                                        placeholder="123 rue de la République"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Adresse ligne 2 (optionnel)
                                    </label>
                                    <Input
                                        name="addressLine2"
                                        value={formData.addressLine2}
                                        onChange={handleInputChange}
                                        placeholder="Appartement, étage, etc."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">
                                            Code postal *
                                        </label>
                                        <Input
                                            name="postalCode"
                                            value={formData.postalCode}
                                            onChange={handleInputChange}
                                            placeholder="75001"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">
                                            Ville *
                                        </label>
                                        <Input
                                            name="city"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                            placeholder="Paris"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Pays *
                                    </label>
                                    <Input
                                        name="country"
                                        value={formData.country}
                                        onChange={handleInputChange}
                                        placeholder="France"
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full"
                                    size="lg"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                            Traitement en cours...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-5 w-5 mr-2" />
                                            Lancer la procédure de vente
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}
