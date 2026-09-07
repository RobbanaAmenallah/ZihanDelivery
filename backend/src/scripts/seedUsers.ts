import { supabase } from '../config/supabase.js';

interface SeedAccount {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: 'admin' | 'driver' | 'client';
  company_name?: string;
  zone?: string;
  vehicle?: string;
}

const SEED_ACCOUNTS: SeedAccount[] = [
  {
    email: 'admin@zihan.tn',
    password: 'Password123!',
    full_name: 'Sami Robbana (Super Admin)',
    phone: '+216 71 000 111',
    role: 'admin',
    company_name: 'ZIHAN Super Delivery Express HQ',
  },
  {
    email: 'livreur@zihan.tn',
    password: 'Password123!',
    full_name: 'Karim Mansouri',
    phone: '+216 98 777 666',
    role: 'driver',
    zone: 'Grand Tunis — Ben Arous / Nouvelle Médina',
    vehicle: 'Citroën Berlingo (194 TUN 8840)',
  },
  {
    email: 'client@zihan.tn',
    password: 'Password123!',
    full_name: 'Mohamed Ben Ali (Boutique Mode)',
    phone: '+216 22 000 000',
    role: 'client',
    company_name: 'Boutique Express Mode',
  },
];

async function seed() {
  console.log('🚀 Initialisation des comptes de démonstration ZIHAN dans Supabase...\n');

  for (const acc of SEED_ACCOUNTS) {
    try {
      // 1. Check if user already exists
      const { data: listData } = await supabase.auth.admin.listUsers();
      const existingUser = listData?.users.find((u) => u.email === acc.email);

      let userId = existingUser?.id;

      if (!existingUser) {
        // Create user in auth.users
        const { data, error } = await supabase.auth.admin.createUser({
          email: acc.email,
          password: acc.password,
          email_confirm: true,
          user_metadata: {
            full_name: acc.full_name,
            role: acc.role,
          },
        });

        if (error) {
          console.error(`❌ Erreur création ${acc.email}:`, error.message);
          continue;
        }

        userId = data.user.id;
        console.log(`✅ Compte Auth créé: ${acc.email}`);
      } else {
        // Update password to ensure it matches Password123!
        await supabase.auth.admin.updateUserById(existingUser.id, {
          password: acc.password,
          email_confirm: true,
        });
        console.log(`ℹ️ Compte Auth existant mis à jour: ${acc.email}`);
      }

      // 2. Insert or update public.profiles
      if (userId) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: userId,
          full_name: acc.full_name,
          phone: acc.phone,
          role: acc.role,
          company_name: acc.company_name ?? '',
          zone: acc.zone ?? '',
          vehicle: acc.vehicle ?? '',
          is_active: true,
        });

        if (profileError) {
          console.error(`⚠️ Erreur profil pour ${acc.email}:`, profileError.message);
        } else {
          console.log(`   └─ Profil ZIHAN (${acc.role}) configuré avec succès.`);
        }
      }
    } catch (err) {
      console.error(`❌ Exception pour ${acc.email}:`, err);
    }
  }

  console.log('\n🎉 Terminé ! Les comptes sont prêts à être utilisés.');
}

seed();
