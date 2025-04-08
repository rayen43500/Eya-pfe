/**
 * Constantes liées aux commandes et statuts
 */

export const ORDER_STATUS = {
  PENDING: 'en_attente',
  PROCESSING: 'en_traitement',
  READY: 'pret',
  SHIPPING: 'en_livraison',
  DELIVERED: 'livré',
  CANCELLED: 'annulé'
};

export const ORDER_STATUS_DISPLAY = {
  [ORDER_STATUS.PENDING]: 'En attente',
  [ORDER_STATUS.PROCESSING]: 'En traitement',
  [ORDER_STATUS.READY]: 'Prêt à livrer',
  [ORDER_STATUS.SHIPPING]: 'En livraison',
  [ORDER_STATUS.DELIVERED]: 'Livré',
  [ORDER_STATUS.CANCELLED]: 'Annulé'
};

export const ORDER_STATUS_COLOR = {
  [ORDER_STATUS.PENDING]: 'orange',
  [ORDER_STATUS.PROCESSING]: 'blue',
  [ORDER_STATUS.READY]: 'teal',
  [ORDER_STATUS.SHIPPING]: 'purple',
  [ORDER_STATUS.DELIVERED]: 'green',
  [ORDER_STATUS.CANCELLED]: 'red'
};

export const VEHICLE_TYPES = [
  { id: 'velo', label: 'Vélo' },
  { id: 'scooter', label: 'Scooter' },
  { id: 'moto', label: 'Moto' },
  { id: 'voiture', label: 'Voiture' }
];

export const VALIDATION_CODES = {
  DEVELOPMENT: ['1234', '0000'], // Codes de validation autorisés en développement
  LENGTH: 4 // Longueur standard d'un code de validation
}; 