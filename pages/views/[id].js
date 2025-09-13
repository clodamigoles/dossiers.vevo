import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
import {
    Car,
    Calendar,
    Euro,
    Eye,
    Heart,
    Phone,
    Mail,
    MapPin,
    CheckCircle,
    Clock,
    AlertCircle,
    Play,
    Camera,
    Megaphone,
    Users,
    TrendingUp,
    MessageCircle,
    ArrowLeft,
    ArrowRight,
    Edit,
    X,
    Check,
    DollarSign,
    Target,
    Activity,
    Star,
    Award,
    Zap,
    BarChart3
} from 'lucide-react'

export default function ViewDossierVente() {
    const router = useRouter()
    const { id } = router.query

    const [dossier, setDossier] = useState(null)
    const [estimation, setEstimation] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [activeTab, setActiveTab] = useState('overview')
    const [editingPrice, setEditingPrice] = useState(false)
    const [newPrice, setNewPrice] = useState('')
    const [communications, setCommunications] = useState([])
    const [offers, setOffers] = useState([])

    useEffect(() => {
        if (id) {
            fetchDossier()
            fetchCommunications()
            fetchOffers()
        }
    }, [id])

    const fetchDossier = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/dossier-vente/${id}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message)
            }

            setDossier(data.dossier)
            setEstimation(data.estimation)
            setNewPrice(data.dossier.saleInfo.askingPrice.toString())

        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchCommunications = async () => {
        try {
            const response = await fetch(`/api/dossier-vente/${id}/communications`)
            const data = await response.json()
            if (response.ok) {
                setCommunications(data.communications || [])
            }
        } catch (err) {
            console.error('Erreur communications:', err)
        }
    }

    const fetchOffers = async () => {
        try {
            const response = await fetch(`/api/dossier-vente/${id}/offers`)
            const data = await response.json()
            if (response.ok) {
                setOffers(data.offers || [])
            }
        } catch (err) {
            console.error('Erreur offres:', err)
        }
    }

    const handleActivation = async () => {
        try {
            const response = await fetch(`/api/dossier-vente/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'activate' })
            })

            const data = await response.json()
            if (response.ok) {
                await fetchDossier()
            } else {
                setError(data.message)
            }
        } catch (err) {
            setError(err.message)
        }
    }

    const handlePriceUpdate = async () => {
        try {
            const response = await fetch(`/api/dossier-vente/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_price',
                    data: {
                        price: parseInt(newPrice),
                        negotiable: dossier.saleInfo.negotiable
                    }
                })
            })

            const data = await response.json()
            if (response.ok) {
                setEditingPrice(false)
                await fetchDossier()
            } else {
                setError(data.message)
            }
        } catch (err) {
            setError(err.message)
        }
    }

    // Fonction pour calculer le pourcentage de completion des étapes
    const getCompletionPercentage = () => {
        if (!dossier) return 0

        const steps = dossier.searchSteps
        let completed = 0
        let total = 4

        if (steps.onlineListingCreated.completed) completed++
        if (steps.professionalPhotos.completed) completed++
        if (steps.marketingCampaign.completed) completed++
        if (steps.buyerInterest.totalInquiries > 0) completed++

        return Math.round((completed / total) * 100)
    }

    // Fonction pour obtenir le statut avec couleur
    const getStatusInfo = (status) => {
        const statusMap = {
            'draft': { label: 'Brouillon', color: 'bg-gray-500', icon: Clock },
            'active': { label: 'Recherche en cours', color: 'bg-blue-500', icon: Activity },
            'buyer_found': { label: 'Acheteur trouvé', color: 'bg-green-500', icon: Users },
            'negotiating': { label: 'Négociation', color: 'bg-orange-500', icon: MessageCircle },
            'sold': { label: 'Vendu', color: 'bg-green-600', icon: CheckCircle },
            'cancelled': { label: 'Annulé', color: 'bg-red-500', icon: X },
            'expired': { label: 'Expiré', color: 'bg-gray-600', icon: AlertCircle }
        }

        return statusMap[status] || { label: status, color: 'bg-gray-500', icon: Clock }
    }

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const daysRemaining = dossier ?
        Math.max(0, Math.ceil((new Date(dossier.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))) : 0

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-red-500 text-white p-4 rounded-lg text-center">
                        <AlertCircle className="mx-auto mb-2" size={48} />
                        <p>{error}</p>
                        <button
                            onClick={() => router.back()}
                            className="mt-4 bg-white text-red-500 px-4 py-2 rounded hover:bg-gray-100"
                        >
                            Retour
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const statusInfo = getStatusInfo(dossier.status)
    const StatusIcon = statusInfo.icon
    const completionPercentage = getCompletionPercentage()

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Head>
                <title>Suivi de vente - {estimation?.brand} {estimation?.model}</title>
            </Head>

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-yellow-400 mb-2">
                                Suivi de vente
                            </h1>
                            <p className="text-gray-400">
                                {estimation?.brand} {estimation?.model} ({estimation?.year})
                            </p>
                        </div>
                    </div>

                    {/* Statut principal */}
                    <div className={`px-4 py-2 rounded-full ${statusInfo.color} text-white flex items-center`}>
                        <StatusIcon className="mr-2" size={20} />
                        {/* {statusInfo.label} */}En révision
                    </div>
                </div>

                {/* Cartes de statistiques principales */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {/* Prix demandé */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-400">Prix de vente</h3>
                            {dossier.status === 'active' && (
                                <button
                                    onClick={() => setEditingPrice(true)}
                                    className="text-yellow-400 hover:text-yellow-300"
                                >
                                    <Edit size={16} />
                                </button>
                            )}
                        </div>
                        {editingPrice ? (
                            <div className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    value={newPrice}
                                    onChange={(e) => setNewPrice(e.target.value)}
                                    className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                                />
                                <button onClick={handlePriceUpdate} className="text-green-400">
                                    <Check size={16} />
                                </button>
                                <button onClick={() => setEditingPrice(false)} className="text-red-400">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <p className="text-2xl font-bold text-green-400">
                                {dossier.saleInfo.askingPrice.toLocaleString()} €
                            </p>
                        )}
                    </div>

                    {/* Vues */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <div className="flex items-center mb-2">
                            <Eye className="mr-2 text-blue-400" size={20} />
                            <h3 className="text-sm font-medium text-gray-400">Vues</h3>
                        </div>
                        <p className="text-2xl font-bold">{dossier.metadata.viewCount}</p>
                    </div>

                    {/* Intérêts */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <div className="flex items-center mb-2">
                            <Heart className="mr-2 text-pink-400" size={20} />
                            <h3 className="text-sm font-medium text-gray-400">Intérêts</h3>
                        </div>
                        <p className="text-2xl font-bold">{dossier.searchSteps.buyerInterest.totalInquiries}</p>
                    </div>

                    {/* Jours restants
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <div className="flex items-center mb-2">
                            <Calendar className="mr-2 text-yellow-400" size={20} />
                            <h3 className="text-sm font-medium text-gray-400">Jours restants</h3>
                        </div>
                        <p className={`text-2xl font-bold ${daysRemaining < 7 ? 'text-red-400' : ''}`}>
                            {daysRemaining}
                        </p>
                    </div> */}
                </div>

                {/* Barre de progression */}
                <div className="bg-gray-800 rounded-lg p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold">Progression de la vente</h3>
                        <span className="text-yellow-400 font-bold">{completionPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                        <div
                            className="bg-gradient-to-r from-yellow-400 to-green-400 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${completionPercentage}%` }}
                        ></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Étape 1: Annonce en ligne */}
                        <div className={`p-4 rounded-lg ${dossier.searchSteps.onlineListingCreated.completed ? 'bg-green-900' : 'bg-gray-700'}`}>
                            <div className="flex items-center mb-2">
                                {dossier.searchSteps.onlineListingCreated.completed ? (
                                    <CheckCircle className="text-green-400 mr-2" size={20} />
                                ) : (
                                    <Clock className="text-gray-400 mr-2" size={20} />
                                )}
                                <h4 className="font-medium">Annonce publiée</h4>
                            </div>
                            {dossier.searchSteps.onlineListingCreated.completed ? (
                                <p className="text-sm text-gray-300">
                                    Publié le {formatDate(dossier.searchSteps.onlineListingCreated.completedAt)}
                                </p>
                            ) : (
                                <p className="text-sm text-gray-400">En attente de publication</p>
                            )}
                        </div>

                        {/* Étape 2: Photos professionnelles */}
                        <div className={`p-4 rounded-lg ${dossier.searchSteps.professionalPhotos.completed ? 'bg-green-900' : 'bg-gray-700'}`}>
                            <div className="flex items-center mb-2">
                                {dossier.searchSteps.professionalPhotos.completed ? (
                                    <CheckCircle className="text-green-400 mr-2" size={20} />
                                ) : (
                                    <Camera className="text-gray-400 mr-2" size={20} />
                                )}
                                <h4 className="font-medium">Photos pro</h4>
                            </div>
                            {dossier.searchSteps.professionalPhotos.completed ? (
                                <p className="text-sm text-gray-300">Terminé</p>
                            ) : (
                                <p className="text-sm text-gray-400">Séance photo prévue</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}