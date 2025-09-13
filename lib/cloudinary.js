import { v2 as cloudinary } from 'cloudinary'
import { promises as fs } from 'fs'


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const uploadToCloudinary = async (filePath, options = {}) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: 'auto',
            quality: 'auto',
            fetch_format: 'auto',
            ...options
        })

        // Supprimer le fichier temporaire après upload
        try {
            await fs.unlink(filePath)
        } catch (unlinkError) {
            console.warn('Impossible de supprimer le fichier temporaire:', unlinkError)
        }

        return result
    } catch (error) {
        console.error('Erreur upload Cloudinary:', error)
        throw new Error('Erreur lors de l\'upload de l\'image')
    }
}

export const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId)
        return result
    } catch (error) {
        console.error('Erreur suppression Cloudinary:', error)
        throw new Error('Erreur lors de la suppression de l\'image')
    }
}

export const getOptimizedImageUrl = (publicId, transformations = {}) => {
    return cloudinary.url(publicId, {
        quality: 'auto',
        fetch_format: 'auto',
        ...transformations
    })
}

export default cloudinary