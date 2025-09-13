import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Image from 'next/image'
import { 
    Camera, 
    Upload, 
    Car, 
    User, 
    Mail, 
    Phone, 
    MapPin, 
    Euro,
    CheckCircle,
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    X
} from 'lucide-react'

export default function CreateDossierVente() {
    const router = useRouter()
    const { id } = router.query
    
    const [estimation, setEstimation] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    
    // États du formulaire
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        street: '',
        city: '',
        postalCode: '',
        country: 'France',
        negotiable: true,
        urgentSale: false,
        availableForViewing: true,
        preferredContactMethod: 'both'
    })
    
    const [photos, setPhotos] = useState({
        exterior: [],
        interior: [],
        documents: []
    })
    
    const [previews, setPreviews] = useState({
        exterior: [],
        interior: [],
        documents: []
    })

    // Charger l'estimation au chargement de la page
    useEffect(() => {
        if (id) {
            fetchEstimation()
        }
    }, [id])

    const fetchEstimation = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/estimations/${id}`)
            const data = await response.json()
            
            if (!response.ok) {
                throw new Error(data.message)
            }
            
            if (data.hasExistingDossier) {
                router.push(`/views/${data.existingDossierId}`)
                return
            }
            
            /* if (data.estimation.status !== 'accepted') {
                setError('Cette estimation doit être acceptée avant de créer un dossier de vente')
                return
            } */
            
            setEstimation(data.estimation)
            setFormData(prev => ({
                ...prev,
                email: data.estimation.email
            }))
            
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handlePhotoChange = (category, files) => {
        const fileArray = Array.from(files)
        
        // Validation
        const maxFiles = category === 'documents' ? 5 : 8
        if (photos[category].length + fileArray.length > maxFiles) {
            setError(`Maximum ${maxFiles} fichiers pour ${category}`)
            return
        }
        
        const validTypes = category === 'documents' ? 
            ['image/jpeg', 'image/png', 'application/pdf'] :
            ['image/jpeg', 'image/png', 'image/webp']
            
        const invalidFiles = fileArray.filter(file => !validTypes.includes(file.type))
        if (invalidFiles.length > 0) {
            setError('Types de fichiers non valides')
            return
        }
        
        // Ajouter les fichiers
        setPhotos(prev => ({
            ...prev,
            [category]: [...prev[category], ...fileArray]
        }))
        
        // Créer les aperçus
        fileArray.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader()
                reader.onload = (e) => {
                    setPreviews(prev => ({
                        ...prev,
                        [category]: [...prev[category], {
                            file,
                            url: e.target.result,
                            name: file.name
                        }]
                    }))
                }
                reader.readAsDataURL(file)
            } else {
                setPreviews(prev => ({
                    ...prev,
                    [category]: [...prev[category], {
                        file,
                        url: null,
                        name: file.name
                    }]
                }))
            }
        })
    }

    const removePhoto = (category, index) => {
        setPhotos(prev => ({
            ...prev,
            [category]: prev[category].filter((_, i) => i !== index)
        }))
        setPreviews(prev => ({
            ...prev,
            [category]: prev[category].filter((_, i) => i !== index)
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSubmitting(true)
        setError('')

        try {
            // Validation
            if (!formData.firstName || !formData.lastName || !formData.phone) {
                throw new Error('Veuillez remplir tous les champs obligatoires')
            }
            
            if (photos.exterior.length === 0) {
                throw new Error('Au moins une photo extérieure est requise')
            }
            
            if (photos.interior.length === 0) {
                throw new Error('Au moins une photo intérieure est requise')
            }

            // Préparer FormData
            const form = new FormData()
            
            // Ajouter les données du formulaire
            Object.keys(formData).forEach(key => {
                form.append(key, formData[key])
            })
            form.append('estimationId', id)
            
            // Ajouter les photos
            photos.exterior.forEach(file => {
                form.append('exteriorPhotos', file)
            })
            photos.interior.forEach(file => {
                form.append('interiorPhotos', file)
            })
            photos.documents.forEach(file => {
                form.append('documents', file)
            })

            const response = await fetch('/api/dossier-vente/create', {
                method: 'POST',
                body: form
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message)
            }

            setSuccess(true)
            setTimeout(() => {
                router.push(`/views/${data.dossier.id}`)
            }, 2000)

        } catch (err) {
            setError(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400"></div>
            </div>
        )
    }

    if (error && !estimation) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-red-500 text-white p-4 rounded-lg text-center">
                        <AlertTriangle className="mx-auto mb-2" size={48} />
                        <p>{error}</p>
                    </div>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="max-w-md w-full mx-4">
                    <div className="bg-green-500 text-white p-8 rounded-lg text-center">
                        <CheckCircle className="mx-auto mb-4" size={64} />
                        <h2 className="text-2xl font-bold mb-2">Dossier créé avec succès !</h2>
                        <p className="mb-4">Redirection vers le suivi de votre vente...</p>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Head>
                <title>Créer un dossier de vente - {estimation?.brand} {estimation?.model}</title>
            </Head>

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-yellow-400 mb-2">
                            Créer un dossier de vente
                        </h1>
                        <p className="text-gray-400">
                            {estimation?.brand} {estimation?.model} ({estimation?.year})
                        </p>
                    </div>
                </div>

                {/* Résumé de l'estimation */}
                <div className="bg-gray-800 rounded-lg p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4 flex items-center">
                        <Car className="mr-2 text-yellow-400" />
                        Récapitulatif de votre estimation
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-700 p-4 rounded">
                            <p className="text-gray-400 text-sm">Prix estimé</p>
                            <p className="text-2xl font-bold text-green-400">
                                {estimation?.finale?.toLocaleString()} €
                            </p>
                        </div>
                        <div className="bg-gray-700 p-4 rounded">
                            <p className="text-gray-400 text-sm">Véhicule</p>
                            <p className="font-semibold">
                                {estimation?.brand} {estimation?.model}
                            </p>
                            <p className="text-sm text-gray-400">
                                {estimation?.year} • {estimation?.mileage?.toLocaleString()} km
                            </p>
                        </div>
                        <div className="bg-gray-700 p-4 rounded">
                            <p className="text-gray-400 text-sm">Statut</p>
                            <p className="text-green-400 font-semibold">Estimation acceptée</p>
                        </div>
                    </div>
                </div>

                {/* Formulaire de création */}
                <form onSubmit={handleSubmit} className="space-y-8">
                    
                    {/* Informations personnelles */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-xl font-semibold mb-6 flex items-center">
                            <User className="mr-2 text-yellow-400" />
                            Vos informations personnelles
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Prénom *
                                </label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                                    placeholder="Votre prénom"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Nom *
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                                    placeholder="Votre nom"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2 flex items-center">
                                    <Mail className="mr-1" size={16} />
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                                    placeholder="votre@email.com"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2 flex items-center">
                                    <Phone className="mr-1" size={16} />
                                    Téléphone *
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                                    placeholder="+33 6 12 34 56 78"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Adresse */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-xl font-semibold mb-6 flex items-center">
                            <MapPin className="mr-2 text-yellow-400" />
                            Adresse complète
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Adresse *
                                </label>
                                <input
                                    type="text"
                                    name="street"
                                    value={formData.street}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                                    placeholder="Numéro et nom de rue"
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Ville *
                                    </label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                                        placeholder="Ville"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Code postal *
                                    </label>
                                    <input
                                        type="text"
                                        name="postalCode"
                                        value={formData.postalCode}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                                        placeholder="12345"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Pays
                                    </label>
                                    <select
                                        name="country"
                                        value={formData.country}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                                    >
                                        <option value="France">France</option>
                                        <option value="Belgique">Belgique</option>
                                        <option value="Suisse">Suisse</option>
                                        <option value="Luxembourg">Luxembourg</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Photos de la voiture */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-xl font-semibold mb-6 flex items-center">
                            <Camera className="mr-2 text-yellow-400" />
                            Photos de votre véhicule
                        </h3>
                        
                        {/* Photos extérieures */}
                        <div className="mb-8">
                            <h4 className="text-lg font-medium mb-4 text-yellow-400">
                                Photos extérieures * (max 8)
                            </h4>
                            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-yellow-400 transition-colors">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => handlePhotoChange('exterior', e.target.files)}
                                    className="hidden"
                                    id="exterior-photos"
                                />
                                <label htmlFor="exterior-photos" className="cursor-pointer">
                                    <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                                    <p className="text-lg mb-2">Cliquez pour ajouter des photos extérieures</p>
                                    <p className="text-sm text-gray-400">JPEG, PNG, WebP - Max 10MB par fichier</p>
                                </label>
                            </div>
                            
                            {previews.exterior.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                    {previews.exterior.map((preview, index) => (
                                        <div key={index} className="relative">
                                            <Image
                                                src={preview.url}
                                                alt={`Extérieur ${index + 1}`}
                                                width={200}
                                                height={150}
                                                className="w-full h-32 object-cover rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto('exterior', index)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Photos intérieures */}
                        <div className="mb-8">
                            <h4 className="text-lg font-medium mb-4 text-yellow-400">
                                Photos intérieures * (max 8)
                            </h4>
                            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-yellow-400 transition-colors">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => handlePhotoChange('interior', e.target.files)}
                                    className="hidden"
                                    id="interior-photos"
                                />
                                <label htmlFor="interior-photos" className="cursor-pointer">
                                    <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                                    <p className="text-lg mb-2">Cliquez pour ajouter des photos intérieures</p>
                                    <p className="text-sm text-gray-400">JPEG, PNG, WebP - Max 10MB par fichier</p>
                                </label>
                            </div>
                            
                            {previews.interior.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                    {previews.interior.map((preview, index) => (
                                        <div key={index} className="relative">
                                            <Image
                                                src={preview.url}
                                                alt={`Intérieur ${index + 1}`}
                                                width={200}
                                                height={150}
                                                className="w-full h-32 object-cover rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto('interior', index)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        {/* Documents */}
                        <div>
                            <h4 className="text-lg font-medium mb-4 text-yellow-400">
                                Documents (optionnel - max 5)
                            </h4>
                            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-yellow-400 transition-colors">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,application/pdf"
                                    onChange={(e) => handlePhotoChange('documents', e.target.files)}
                                    className="hidden"
                                    id="documents"
                                />
                                <label htmlFor="documents" className="cursor-pointer">
                                    <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                                    <p className="text-lg mb-2">Carte grise, contrôle technique, factures...</p>
                                    <p className="text-sm text-gray-400">JPEG, PNG, PDF - Max 10MB par fichier</p>
                                </label>
                            </div>
                            
                            {previews.documents.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {previews.documents.map((preview, index) => (
                                        <div key={index} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
                                            <span className="text-sm truncate">{preview.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => removePhoto('documents', index)}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Messages d'erreur */}
                    {error && (
                        <div className="bg-red-500 text-white p-4 rounded-lg flex items-center">
                            <AlertTriangle className="mr-2" size={20} />
                            {error}
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-6">
                    
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-3 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center font-semibold"
                        >
                            {submitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mr-2"></div>
                                    Création en cours...
                                </>
                            ) : (
                                <>
                                    Créer le dossier de vente
                                    <ArrowRight className="ml-2" size={20} />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}