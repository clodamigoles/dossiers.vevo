import { useRouter } from 'next/router'
import { useState } from 'react'
import Head from 'next/head'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Car, Search, Loader2, Mail, Phone, Hash, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import axios from '@/lib/axios'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function Home() {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [results, setResults] = useState([])
    const [hasSearched, setHasSearched] = useState(false)

    const performSearch = async () => {
        const term = searchTerm.trim()
        
        if (!term) {
            setError('Veuillez saisir un ID, un email ou un numéro de téléphone')
            return
        }

        setLoading(true)
        setError('')
        setHasSearched(true)

        try {
            const response = await axios.get(`/api/estimations/search?q=${encodeURIComponent(term)}`)
            if (response.data.success) {
                setResults(response.data.data || [])
                if (response.data.count === 0) {
                    setError('Aucune estimation trouvée. Vérifiez que l\'ID, l\'email ou le numéro de téléphone est correct.')
                } else {
                    setError('')
                }
            } else {
                setError(response.data.message || 'Erreur lors de la recherche')
                setResults([])
            }
        } catch (err) {
            console.error('Erreur recherche:', err)
            setError(err.response?.data?.message || 'Erreur lors de la recherche')
            setResults([])
        } finally {
            setLoading(false)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            performSearch()
        }
    }

    const handleSelectEstimation = (estimation) => {
        // Si la procédure est lancée, aller à l'auth, sinon à accept-estimation
        if (estimation.status === 'accepted' || estimation.saleStatus === 'in_progress') {
            router.push(`/auth/${estimation._id}`)
        } else {
            router.push(`/accept-estimation?id=${estimation._id}`)
        }
    }

    const getStatusBadge = (status, isExpired) => {
        if (status === 'accepted') {
            return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Acceptée</Badge>
        }
        if (status === 'sent') {
            if (isExpired) {
                return <Badge variant="outline" className="border-orange-500 text-orange-500">Expirée (toujours valable)</Badge>
            }
            return <Badge className="bg-yellow-600">En attente</Badge>
        }
        return <Badge variant="outline">{status}</Badge>
    }

    return (
        <>
            <Head>
                <title>Dossiers Vevo - Accès à votre estimation</title>
                <meta name="description" content="Accédez à votre estimation de véhicule" />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
            </Head>

            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-6 max-w-2xl">
                    <Card className="mb-6">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <Car className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">Dossiers Vevo</CardTitle>
                            <CardDescription>
                                Recherchez votre estimation par ID, email ou téléphone
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">
                                        Rechercher
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="ID, email ou numéro de téléphone (exact)"
                                            className="pl-10"
                                            disabled={loading}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        La recherche doit correspondre exactement à l'ID, l'email ou le numéro de téléphone
                                    </p>
                                    <Button
                                        onClick={performSearch}
                                        disabled={loading || !searchTerm.trim()}
                                        size="default"
                                        className="w-full mt-4"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Recherche...
                                            </>
                                        ) : (
                                            <>
                                                <Search className="h-4 w-4 mr-2" />
                                                Rechercher
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {error && !loading && (
                                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                        <p className="text-sm text-destructive">{error}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Résultats */}
                    {results.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">
                                    {results.length} estimation{results.length > 1 ? 's' : ''} trouvée{results.length > 1 ? 's' : ''}
                                </h2>
                            </div>

                            {results.map((estimation) => {
                                const adminEstimation = estimation.adminEstimation
                                const saleInfo = estimation.additionalInfo?.saleInfo
                                const isExpired = estimation.isExpired

                                return (
                                    <Card
                                        key={estimation._id}
                                        className="hover:border-primary transition-colors"
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Car className="h-5 w-5 text-muted-foreground" />
                                                        <h3 className="font-semibold text-lg">
                                                            {estimation.brand} {estimation.model} {estimation.year}
                                                        </h3>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        {estimation.bodyType} • {estimation.fuelType} • {estimation.mileage?.toLocaleString()} km
                                                    </p>
                                                </div>
                                                {getStatusBadge(estimation.status, isExpired)}
                                            </div>

                                            <div className="grid grid-cols-1 gap-2 mb-3">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-muted-foreground">{estimation.email}</span>
                                                </div>
                                                {saleInfo?.phone && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-muted-foreground">{saleInfo.phone}</span>
                                                    </div>
                                                )}
                                                {adminEstimation?.finalPrice && (
                                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                                        <span className="text-muted-foreground">Prix:</span>
                                                        <span className="text-primary">{adminEstimation.finalPrice.toLocaleString('fr-FR')} €</span>
                                                    </div>
                                                )}
                                                {adminEstimation?.sentAt && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-muted-foreground">
                                                            Envoyée le {format(new Date(adminEstimation.sentAt), 'dd MMM yyyy', { locale: fr })}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {isExpired && estimation.status === 'sent' && (
                                                <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <AlertCircle className="h-4 w-4 text-orange-500" />
                                                        <p className="text-xs text-orange-500">
                                                            Expirée mais offre toujours valable
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {!isExpired && estimation.daysRemaining !== null && (
                                                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4 text-blue-500" />
                                                        <p className="text-xs text-blue-500">
                                                            {estimation.daysRemaining} jour{estimation.daysRemaining > 1 ? 's' : ''} restant{estimation.daysRemaining > 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-3 pt-3 border-t border-border">
                                                {estimation.status === 'accepted' || estimation.saleStatus === 'in_progress' ? (
                                                <Button
                                                    className="w-full"
                                                    size="sm"
                                                    onClick={() => {
                                                        router.push(`/auth/${estimation._id}`)
                                                    }}
                                                >
                                                    Accéder au dossier
                                                </Button>
                                            ) : (
                                                <Button
                                                    className="w-full"
                                                    size="sm"
                                                    onClick={() => {
                                                        router.push(`/accept-estimation?id=${estimation._id}`)
                                                    }}
                                                >
                                                    Lancer la procédure de vente
                                                </Button>
                                            )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}

                    {!loading && hasSearched && results.length === 0 && !error && (
                        <Card>
                            <CardContent className="p-6 text-center">
                                <p className="text-muted-foreground">
                                    Aucune estimation trouvée pour "{searchTerm}"
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Vérifiez que vous avez saisi correctement l'ID, l'email ou le numéro de téléphone
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </>
    )
}
