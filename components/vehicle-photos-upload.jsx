import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, Upload, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import axios from '@/lib/axios'

export default function VehiclePhotosUpload({ estimationId, existingPhotos, onUploadComplete }) {
    const [interiorPhotos, setInteriorPhotos] = useState([])
    const [exteriorPhotos, setExteriorPhotos] = useState([])
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    
    const interiorInputRef = useRef(null)
    const exteriorInputRef = useRef(null)

    // Initialiser avec les photos existantes si disponibles
    useEffect(() => {
        if (existingPhotos?.interior && interiorPhotos.length === 0) {
            setInteriorPhotos(existingPhotos.interior.map(url => ({ url, isExisting: true })))
        }
        if (existingPhotos?.exterior && exteriorPhotos.length === 0) {
            setExteriorPhotos(existingPhotos.exterior.map(url => ({ url, isExisting: true })))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingPhotos])

    const handleFileSelect = (e, type) => {
        const files = Array.from(e.target.files)
        const maxPhotos = 20
        const currentPhotos = type === 'interior' ? interiorPhotos : exteriorPhotos
        const newPhotosCount = files.length
        const currentCount = currentPhotos.filter(p => !p.isExisting && !p.url).length

        if (currentCount + newPhotosCount > maxPhotos) {
            setError(`Maximum ${maxPhotos} photos ${type === 'interior' ? 'intérieures' : 'extérieures'} autorisées`)
            return
        }

        // Vérifier que ce sont des images ou GIF
        const validFiles = files.filter(file => {
            const isValid = file.type.startsWith('image/')
            if (!isValid) {
                setError(`${file.name} n'est pas une image valide`)
            }
            return isValid
        })

        if (validFiles.length === 0) {
            return
        }

        // Convertir en base64 pour prévisualisation
        validFiles.forEach(file => {
            const reader = new FileReader()
            reader.onload = (e) => {
                const photoData = {
                    file,
                    preview: e.target.result,
                    name: file.name
                }

                if (type === 'interior') {
                    setInteriorPhotos(prev => [...prev, photoData])
                } else {
                    setExteriorPhotos(prev => [...prev, photoData])
                }
            }
            reader.readAsDataURL(file)
        })

        // Réinitialiser l'input
        e.target.value = ''
        setError('')
    }

    const removePhoto = (index, type) => {
        if (type === 'interior') {
            setInteriorPhotos(prev => prev.filter((_, i) => i !== index))
        } else {
            setExteriorPhotos(prev => prev.filter((_, i) => i !== index))
        }
    }

    const uploadAllPhotos = async () => {
        const newInteriorPhotos = interiorPhotos.filter(p => !p.isExisting && !p.url && p.file)
        const newExteriorPhotos = exteriorPhotos.filter(p => !p.isExisting && !p.url && p.file)

        if (newInteriorPhotos.length === 0 && newExteriorPhotos.length === 0) {
            setError('Aucune nouvelle photo à uploader')
            return
        }

        setUploading(true)
        setError('')
        setSuccess('')

        let interiorResponse = null
        let exteriorResponse = null

        try {
            // Uploader les photos intérieures
            if (newInteriorPhotos.length > 0) {
                console.log('Upload photos intérieures:', newInteriorPhotos.length)
                const interiorBase64 = await Promise.all(
                    newInteriorPhotos.map(photo => {
                        return new Promise((resolve) => {
                            const reader = new FileReader()
                            reader.onload = () => resolve(reader.result)
                            reader.readAsDataURL(photo.file)
                        })
                    })
                )

                interiorResponse = await axios.post('/api/upload/vehicle-photos', {
                    estimationId,
                    photos: interiorBase64,
                    photoType: 'interior'
                })

                if (interiorResponse.data.success) {
                    console.log('Photos intérieures uploadées:', interiorResponse.data.data)
                    setInteriorPhotos(prev => {
                        const existing = prev.filter(p => p.isExisting || p.url)
                        const uploaded = interiorResponse.data.data.uploadedUrls.map(url => ({ url, isExisting: true }))
                        return [...existing, ...uploaded]
                    })
                    // Attendre un peu pour que la base soit à jour
                    await new Promise(resolve => setTimeout(resolve, 300))
                } else {
                    throw new Error(interiorResponse.data.message || 'Erreur upload photos intérieures')
                }
            }

            // Uploader les photos extérieures
            if (newExteriorPhotos.length > 0) {
                console.log('Upload photos extérieures:', newExteriorPhotos.length)
                const exteriorBase64 = await Promise.all(
                    newExteriorPhotos.map(photo => {
                        return new Promise((resolve) => {
                            const reader = new FileReader()
                            reader.onload = () => resolve(reader.result)
                            reader.readAsDataURL(photo.file)
                        })
                    })
                )

                exteriorResponse = await axios.post('/api/upload/vehicle-photos', {
                    estimationId,
                    photos: exteriorBase64,
                    photoType: 'exterior'
                })

                if (exteriorResponse.data.success) {
                    console.log('Photos extérieures uploadées:', exteriorResponse.data.data)
                    setExteriorPhotos(prev => {
                        const existing = prev.filter(p => p.isExisting || p.url)
                        const uploaded = exteriorResponse.data.data.uploadedUrls.map(url => ({ url, isExisting: true }))
                        return [...existing, ...uploaded]
                    })
                    // Attendre un peu pour que la base soit à jour
                    await new Promise(resolve => setTimeout(resolve, 300))
                } else {
                    throw new Error(exteriorResponse.data.message || 'Erreur upload photos extérieures')
                }
            }

            // Vérifier si on doit soumettre pour validation
            // Utiliser directement les totaux retournés par les APIs qui sont calculés depuis la base de données
            const totalInteriorFromAPI = interiorResponse?.data?.data?.totalInterior || 0
            const totalExteriorFromAPI = exteriorResponse?.data?.data?.totalExterior || 0
            
            // Si on n'a pas uploadé de photos intérieures dans cette session, vérifier celles qui étaient déjà là
            const existingInteriorBefore = interiorPhotos.filter(p => p.isExisting || p.url).length - (interiorResponse?.data?.data?.uploadedUrls?.length || 0)
            const existingExteriorBefore = exteriorPhotos.filter(p => p.isExisting || p.url).length - (exteriorResponse?.data?.data?.uploadedUrls?.length || 0)
            
            // Le total réel = max entre ce que l'API retourne (le plus fiable) et ce qu'on avait avant + nouveau
            const totalInterior = totalInteriorFromAPI > 0 
                ? totalInteriorFromAPI 
                : (existingInteriorBefore + (interiorResponse?.data?.data?.uploadedUrls?.length || 0))
            const totalExterior = totalExteriorFromAPI > 0 
                ? totalExteriorFromAPI 
                : (existingExteriorBefore + (exteriorResponse?.data?.data?.uploadedUrls?.length || 0))

            console.log('Vérification soumission:', {
                totalInteriorFromAPI,
                totalExteriorFromAPI,
                totalInterior,
                totalExterior,
                interiorResponse: interiorResponse?.data?.data,
                exteriorResponse: exteriorResponse?.data?.data,
                existingInteriorBefore,
                existingExteriorBefore,
                newInteriorUploaded: interiorResponse?.data?.data?.uploadedUrls?.length || 0,
                newExteriorUploaded: exteriorResponse?.data?.data?.uploadedUrls?.length || 0
            })

            // Soumettre seulement si on a au moins une photo de chaque type
            if (totalInterior > 0 && totalExterior > 0) {
                // Attendre que la base de données soit à jour (les uploads ont déjà attendu 300ms chacun)
                await new Promise(resolve => setTimeout(resolve, 1000))
                
                console.log('Tentative de soumission pour validation...')
                
                // Soumettre automatiquement pour validation
                try {
                    const submitResponse = await axios.post(`/api/dashboard/${estimationId}/submit-review`)
                    console.log('Réponse soumission:', submitResponse.data)
                    
                    if (submitResponse.data.success) {
                        setSuccess('Photos uploadées et soumises pour validation avec succès')
                        
                        // Rafraîchir le dashboard après succès
                        if (onUploadComplete) {
                            onUploadComplete('all', { submitted: true })
                        }
                    } else {
                        console.error('Erreur soumission:', submitResponse.data)
                        setError(submitResponse.data.message || 'Erreur lors de la soumission')
                        
                        // Rafraîchir quand même pour voir l'état actuel
                        if (onUploadComplete) {
                            onUploadComplete('all', { submitted: false })
                        }
                    }
                } catch (submitError) {
                    console.error('Erreur soumission complète:', submitError.response?.data || submitError)
                    const errorMsg = submitError.response?.data?.message || submitError.message || 'Erreur lors de la soumission'
                    const errorDetails = submitError.response?.data
                    console.error('Détails erreur:', errorDetails)
                    
                    // Afficher le message d'erreur avec les détails
                    if (errorDetails?.interiorCount !== undefined && errorDetails?.exteriorCount !== undefined) {
                        setError(`Photos manquantes dans la base: Intérieures: ${errorDetails.interiorCount}, Extérieures: ${errorDetails.exteriorCount}. Les photos peuvent prendre quelques secondes à être sauvegardées.`)
                    } else {
                        setError(`Erreur lors de la soumission: ${errorMsg}`)
                    }
                    
                    setSuccess('Photos uploadées avec succès')
                    
                    // Rafraîchir pour voir l'état actuel
                    if (onUploadComplete) {
                        onUploadComplete('all', { submitted: false, error: errorMsg })
                    }
                }
            } else {
                const missing = []
                if (totalInterior === 0) missing.push('intérieures')
                if (totalExterior === 0) missing.push('extérieures')
                setSuccess(`Photos uploadées avec succès. Ajoutez des photos ${missing.join(' et ')} pour soumettre.`)
                
                // Rafraîchir pour mettre à jour les compteurs
                if (onUploadComplete) {
                    onUploadComplete('all', {})
                }
            }
        } catch (err) {
            console.error('Erreur upload photos:', err)
            const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de l\'upload des photos'
            setError(errorMessage)
        } finally {
            setUploading(false)
        }
    }

    const interiorCount = interiorPhotos.filter(p => p.isExisting || p.url || p.file).length
    const exteriorCount = exteriorPhotos.filter(p => p.isExisting || p.url || p.file).length

    return (
        <div className="space-y-6">
            {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                    </p>
                </div>
            )}

            {success && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-500 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {success}
                    </p>
                </div>
            )}

            {/* Photos intérieures */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        Photos intérieures
                    </CardTitle>
                    <CardDescription>
                        Ajoutez jusqu'à 20 photos de l'intérieur du véhicule ({interiorCount}/20)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <input
                        ref={interiorInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileSelect(e, 'interior')}
                        className="hidden"
                        id="interior-photos"
                        disabled={uploading}
                    />
                    <label
                        htmlFor="interior-photos"
                        className="flex items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                        <div className="text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                Cliquez pour ajouter des photos
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Images ou GIF acceptés
                            </p>
                        </div>
                    </label>

                    {interiorPhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                            {interiorPhotos.map((photo, index) => (
                                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                                    <img
                                        src={photo.url || photo.preview}
                                        alt={`Intérieur ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    {!photo.isExisting && (
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(index, 'interior')}
                                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            disabled={uploading}
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Photos extérieures */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        Photos extérieures
                    </CardTitle>
                    <CardDescription>
                        Ajoutez jusqu'à 20 photos de l'extérieur du véhicule ({exteriorCount}/20)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <input
                        ref={exteriorInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileSelect(e, 'exterior')}
                        className="hidden"
                        id="exterior-photos"
                        disabled={uploading}
                    />
                    <label
                        htmlFor="exterior-photos"
                        className="flex items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                        <div className="text-center">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                Cliquez pour ajouter des photos
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Images ou GIF acceptés
                            </p>
                        </div>
                    </label>

                    {exteriorPhotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                            {exteriorPhotos.map((photo, index) => (
                                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                                    <img
                                        src={photo.url || photo.preview}
                                        alt={`Extérieur ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    {!photo.isExisting && (
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(index, 'exterior')}
                                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            disabled={uploading}
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Bouton d'upload unique */}
            {(interiorPhotos.filter(p => !p.isExisting && !p.url && p.file).length > 0 || 
              exteriorPhotos.filter(p => !p.isExisting && !p.url && p.file).length > 0) && (
                <Card>
                    <CardContent className="pt-6">
                        <Button
                            onClick={uploadAllPhotos}
                            disabled={uploading}
                            className="w-full"
                            size="lg"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                    Upload en cours...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-5 w-5 mr-2" />
                                    Uploader toutes les photos
                                </>
                            )}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center mt-2">
                            Les photos seront automatiquement soumises pour validation une fois uploadées
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
