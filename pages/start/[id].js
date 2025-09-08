import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function StartDossierPage() {
    const router = useRouter();
    const { id } = router.query;

    // Données d'estimation exemple (normalement viendraient du backend)
    const [estimation, setEstimation] = useState({
        brand: "Toyota",
        model: "Corolla",
        year: 2020,
        bodyType: "Berline",
        fuelType: "Essence",
        horsepower: 122,
        transmission: "Manuelle",
        doors: "4",
        mileage: 45000,
        email: "client@example.com",
        adminEstimation: {
            finalPrice: 18500,
            message: "Votre véhicule est en excellent état"
        }
    });

    // Données client à remplir
    const [clientData, setClientData] = useState({
        firstName: '',
        lastName: '',
        email: estimation.email, // Auto-rempli
        phone: '',
        address: {
            street: '',
            city: '',
            postalCode: '',
            country: 'France'
        }
    });

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Auto-remplir l'email depuis l'estimation
        setClientData(prev => ({
            ...prev,
            email: estimation.email
        }));
    }, [estimation.email]);

    const handleInputChange = (field, value) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setClientData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setClientData(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);

        // Simulation de création du dossier
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('Dossier créé:', { estimation, clientData });
        setIsLoading(false);

        // Redirection vers l'app principale
        // router.push('/app/dossier');
    };

    const isFormValid = clientData.firstName &&
        clientData.lastName &&
        clientData.phone &&
        clientData.address.street &&
        clientData.address.city &&
        clientData.address.postalCode;

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                    <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-semibold">Création du dossier</h1>
                </div>
            </div>

            <div className="px-6 py-6 space-y-6">
                {/* Résumé Estimation */}
                <div className="bg-gray-800 rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                        <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Estimation validée
                    </h2>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-gray-400">Véhicule</p>
                            <p className="font-medium">{estimation.brand} {estimation.model}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Année</p>
                            <p className="font-medium">{estimation.year}</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Kilométrage</p>
                            <p className="font-medium">{estimation.mileage?.toLocaleString()} km</p>
                        </div>
                        <div>
                            <p className="text-gray-400">Prix estimé</p>
                            <p className="font-medium text-yellow-500">{estimation.adminEstimation?.finalPrice?.toLocaleString()} €</p>
                        </div>
                    </div>
                </div>

                {/* Formulaire Client */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Vos informations</h2>

                    {/* Nom Prénom */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Prénom *
                            </label>
                            <input
                                type="text"
                                value={clientData.firstName}
                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                placeholder="Votre prénom"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Nom *
                            </label>
                            <input
                                type="text"
                                value={clientData.lastName}
                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                placeholder="Votre nom"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={clientData.email}
                            disabled
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">Email automatiquement rempli depuis votre estimation</p>
                    </div>

                    {/* Téléphone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Téléphone *
                        </label>
                        <input
                            type="tel"
                            value={clientData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            placeholder="06 12 34 56 78"
                        />
                    </div>

                    {/* Adresse */}
                    <div className="space-y-4">
                        <h3 className="text-md font-medium">Adresse</h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Rue *
                            </label>
                            <input
                                type="text"
                                value={clientData.address.street}
                                onChange={(e) => handleInputChange('address.street', e.target.value)}
                                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                placeholder="123 rue de la République"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Ville *
                                </label>
                                <input
                                    type="text"
                                    value={clientData.address.city}
                                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    placeholder="Paris"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    CP *
                                </label>
                                <input
                                    type="text"
                                    value={clientData.address.postalCode}
                                    onChange={(e) => handleInputChange('address.postalCode', e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                    placeholder="75001"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bouton de soumission */}
                <div className="pt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid || isSubmitting}
                        className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-semibold py-4 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mr-2"></div>
                                Création du dossier...
                            </>
                        ) : (
                            'Créer mon dossier de vente'
                        )}
                    </button>
                </div>

                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        En créant votre dossier, vous acceptez nos conditions de vente
                    </p>
                </div>
            </div>
        </div>
    );
}