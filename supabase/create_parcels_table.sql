-- ==============================================================================
-- TABLE DES COLIS : ZIHAN SUPER DELIVERY EXPRESS
-- À exécuter dans le SQL Editor de Supabase
-- https://supabase.com/dashboard/project/oszoyestzrxzfmopvocy/sql
-- ==============================================================================

-- 1. Création de la table des colis
CREATE TABLE IF NOT EXISTS public.parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number TEXT UNIQUE NOT NULL,
  
  -- Expéditeur
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL DEFAULT '',
  sender_phone TEXT NOT NULL DEFAULT '',
  sender_address TEXT NOT NULL DEFAULT '',
  
  -- Destinataire
  recipient_name TEXT NOT NULL DEFAULT '',
  recipient_phone TEXT NOT NULL DEFAULT '',
  recipient_secondary_phone TEXT DEFAULT '',
  recipient_governorate TEXT NOT NULL DEFAULT 'Tunis',
  recipient_delegation TEXT DEFAULT '',
  recipient_address TEXT NOT NULL DEFAULT '',
  recipient_postal_code TEXT DEFAULT '',
  
  -- Colis & Marchandise
  description TEXT NOT NULL DEFAULT 'Marchandise',
  quantity INT NOT NULL DEFAULT 1,
  weight NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
  is_fragile BOOLEAN NOT NULL DEFAULT false,
  
  -- Tarification ZIHAN (en Dinars Tunisiens DT)
  goods_amount NUMERIC(10, 3) NOT NULL DEFAULT 0.000, -- Prix article / COD
  delivery_fee NUMERIC(10, 3) NOT NULL DEFAULT 7.000, -- Grand Tunis: 7 DT, Hors Grand Tunis: 10 DT
  total_amount NUMERIC(10, 3) NOT NULL DEFAULT 7.000, -- goods_amount + delivery_fee
  
  -- Affectation & Statut
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending', 'accepted', 'assigned', 'picked_up', 'in_transit',
      'contacted', 'delivered', 'rescheduled', 'customer_absent',
      'wrong_address', 'failed', 'returned', 'cancelled', 'refused'
    )
  ),
  notes TEXT DEFAULT '',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Désactiver RLS ou autoriser l'accès pour une fluidité totale
ALTER TABLE public.parcels DISABLE ROW LEVEL SECURITY;

-- 3. Données de démonstration réalistes pour ZIHAN
INSERT INTO public.parcels (
  tracking_number, sender_name, sender_phone, sender_address,
  recipient_name, recipient_phone, recipient_secondary_phone,
  recipient_governorate, recipient_delegation, recipient_address, recipient_postal_code,
  description, quantity, weight, is_fragile,
  goods_amount, delivery_fee, total_amount,
  driver_name, status, notes
) VALUES
(
  'ZH000153', 'Boutique Express Mode', '+216 71 888 999', '12 Rue des Entrepreneurs, Charguia 2, Tunis',
  'Mohamed Ben Ali', '+216 22 000 000', '+216 98 111 222',
  'Ben Arous', 'Nouvelle Médina', 'Résidence Ennasr, Bloc B, Apt 14', '2063',
  'Chaussures Sport ZIHAN Runner Pro (Taille 42)', 1, 1.2, false,
  70.000, 7.000, 77.000,
  'Karim Mansouri', 'in_transit', 'Appeler avant livraison'
),
(
  'ZH000154', 'Boutique Express Mode', '+216 71 888 999', '12 Rue des Entrepreneurs, Charguia 2, Tunis',
  'Sonia Trabelsi', '+216 55 123 456', '',
  'Tunis', 'Menzah 6', '14 Rue des Jasmins', '1004',
  'Robe de soirée élégante noire (Taille M)', 1, 0.8, false,
  120.000, 7.000, 127.000,
  'Karim Mansouri', 'delivered', 'Livré et encaissé en espèces'
),
(
  'ZH000155', 'Tech Express TN', '+216 70 555 444', 'Centre Urbain Nord, Tunis',
  'Khaled Ayari', '+216 98 444 333', '',
  'Sousse', 'Sousse Ville', 'Avenue Habib Bourguiba, Résidence du Port', '4000',
  'Écouteurs sans fil Bluetooth Pro + Coque', 2, 0.4, true,
  95.000, 10.000, 105.000,
  '', 'accepted', 'Colis fragile - Hors Grand Tunis'
),
(
  'ZH000156', 'Cosmétique Bio Tunisie', '+216 72 333 222', 'Nabeul',
  'Amira Dridi', '+216 24 999 888', '',
  'Ariana', 'Ennasr 2', 'Avenue Hédi Nouira, Immeuble Panorama', '2037',
  'Pack Soins Visage Naturel Argan & Rose', 1, 1.5, true,
  65.000, 7.000, 72.000,
  'Karim Mansouri', 'pending', 'À récupérer chez le commerçant'
),
(
  'ZH000160', 'Boutique Express Mode', '+216 71 888 999', '12 Rue des Entrepreneurs, Charguia 2, Tunis',
  'Yassine Trabelsi', '+216 29 456 789', '+216 50 112 233',
  'Ben Arous', 'Nouvelle Médina', 'Rue des Anémones, Résidence El Yasmine, Apt 4', '2063',
  'Costume Homme Slim Fit Bleu Marine + Chemise Blanche', 1, 1.8, false,
  185.000, 7.000, 192.000,
  'Karim Mansouri', 'in_transit', 'Client prévenu par SMS - Paiement en espèces'
),
(
  'ZH000161', 'Parfumerie Alyssa', '+216 71 334 556', 'Avenue Habib Bourguiba, Tunis',
  'Mariem Khemir', '+216 93 888 777', '',
  'Tunis', 'Menzah 9', 'Résidence Les Pins, Bloc C, 3ème étage', '1013',
  'Coffret Parfum Luxe Oriental Eau de Parfum 100ml', 1, 0.6, true,
  145.000, 7.000, 152.000,
  'Karim Mansouri', 'assigned', 'Attention très fragile - Livraison avant 16h souhaitée'
),
(
  'ZH000162', 'Tech Express TN', '+216 70 555 444', 'Centre Urbain Nord, Tunis',
  'Anis Bouazizi', '+216 52 345 678', '',
  'Ariana', 'Ennasr 2', 'Avenue Hédi Nouira, Immeuble Golden Towers', '2037',
  'Montre Connectée Smartwatch Ultra + 2 Bracelets Sport', 1, 0.5, true,
  220.000, 7.000, 227.000,
  'Karim Mansouri', 'contacted', 'Client contacté par téléphone - Rdv fixé à 14h30'
),
(
  'ZH000163', 'Maison du Cuir', '+216 71 998 877', 'Rue de Rome, Tunis',
  'Nadia Belhadj', '+216 26 777 999', '',
  'Ben Arous', 'Megrine Riadh', '18 Rue Ibn Khaldoun', '2033',
  'Sac à main en cuir véritable bordeaux artisanal', 1, 1.1, false,
  130.000, 7.000, 137.000,
  'Karim Mansouri', 'picked_up', 'Colis ramassé à l’entrepôt - En cours d’acheminement'
)
ON CONFLICT (tracking_number) DO NOTHING;
