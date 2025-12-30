export interface Plan {
  id: string;
  name: string;
  price: string;
  billingPeriod: string;
  features: string[];
  paymentLink: string;
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'test',
    name: 'Test Payment',
    price: '1,00',
    billingPeriod: 'einmalig',
    features: [
      'Test-Zugang',
      'Alle Features freischalten',
      'Kein monatliches Abo'
    ],
    paymentLink: process.env.NEXT_PUBLIC_PAYMENT_LINK_TEST || '',
    highlighted: false
  },
  {
    id: 'social-media',
    name: 'Social Media Abo',
    price: '29,99',
    billingPeriod: 'monatlich',
    features: [
      '50 Videos pro Monat',
      'Unbegrenzte Mitarbeiter',
      'Social Media Integration',
      'Automatische Uploads',
      'Priority Support'
    ],
    paymentLink: process.env.NEXT_PUBLIC_PAYMENT_LINK_SOCIAL_MEDIA || '',
    highlighted: true
  }
];

