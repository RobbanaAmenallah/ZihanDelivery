import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { z } from 'zod';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createUserSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit avoir au moins 8 caractères'),
  full_name: z.string().min(2, 'Nom requis'),
  phone: z.string().min(8, 'Téléphone requis'),
  role: z.enum(['driver', 'client', 'admin']),
  company_name: z.string().optional().default(''),
  zone: z.string().optional().default(''),
  vehicle: z.string().optional().default(''),
});

const updateUserSchema = z.object({
  email: z.string().email('Email invalide').optional(),
  full_name: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
  company_name: z.string().optional(),
  zone: z.string().optional(),
  vehicle: z.string().optional(),
  is_active: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  userId: z.string().uuid('ID utilisateur invalide'),
});

const STANDARD_PASSWORD = 'Password123!';

// ─── Helper ───────────────────────────────────────────────────────────────────

function apiError(res: Response, status: number, message: string) {
  return res.status(status).json({ success: false, message, timestamp: new Date().toISOString() });
}

function apiOk<T>(res: Response, data: T, message?: string) {
  return res.json({ success: true, message, data, timestamp: new Date().toISOString() });
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/admin/users
 * Create a new driver or client account.
 * Uses the Service Role Key to bypass RLS.
 */
export async function createUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      apiError(res, 400, parsed.error.errors.map((e) => e.message).join(', '));
      return;
    }

    const { email, password, full_name, phone, role, company_name, zone, vehicle } =
      parsed.data;

    // 1. Create auth user via Supabase Admin API
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // auto-confirm so they can log in immediately
        user_metadata: { full_name, role },
      });

    if (authError || !authData.user) {
      const message =
        authError?.message?.includes('already registered')
          ? `L'adresse email ${email} est déjà utilisée.`
          : (authError?.message ?? 'Erreur lors de la création du compte Supabase');
      apiError(res, 400, message);
      return;
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: authData.user.id,
        email,
        full_name,
        phone,
        role,
        company_name: company_name ?? '',
        zone: zone ?? '',
        vehicle: vehicle ?? '',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (profileError) {
      console.warn('[adminController] Profile upsert warning:', profileError.message);
    }

    // 3. User created and confirmed directly without triggering email rate limits
    apiOk(
      res,
      {
        id: authData.user.id,
        email,
        full_name,
        phone,
        role,
        is_active: true,
      },
      `Compte ${role === 'driver' ? 'livreur' : 'client'} créé avec succès.`,
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/users
 * Return all profiles (drivers + clients). Admins only.
 */
export async function listUsers(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Fetch profiles from DB
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      apiError(res, 500, `Erreur base de données : ${profilesError.message}`);
      return;
    }

    // Enrich with emails from auth.users
    const { data: authList, error: authListError } =
      await supabase.auth.admin.listUsers({ perPage: 1000 });

    if (!authListError && authList?.users) {
      const emailMap = new Map<string, string>(
        authList.users.map((u) => [u.id, u.email ?? '']),
      );
      const enriched = (profiles ?? []).map((p) => ({
        ...p,
        email: emailMap.get(p.id) ?? (p.email || ''),
      }));
      apiOk(res, enriched);
    } else {
      apiOk(res, profiles ?? []);
    }
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/users/:id
 * Update profile fields & auth credentials (email, is_active, zone, vehicle, etc.)
 */
export async function updateUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      apiError(res, 400, parsed.error.errors.map((e) => e.message).join(', '));
      return;
    }

    const { email, full_name, phone, company_name, zone, vehicle, is_active } = parsed.data;

    // 1. If email is being changed, update auth.users via Supabase Admin API
    if (email) {
      const { error: authEmailError } = await supabase.auth.admin.updateUserById(id, {
        email: email.trim().toLowerCase(),
        email_confirm: true,
      });

      if (authEmailError) {
        const msg = authEmailError.message?.includes('already registered')
          ? `L'adresse email ${email} est déjà utilisée.`
          : `Erreur mise à jour email Auth : ${authEmailError.message}`;
        apiError(res, 400, msg);
        return;
      }
    }

    // 2. Also sync display name in auth.users if full_name was changed
    if (full_name) {
      try {
        await supabase.auth.admin.updateUserById(id, {
          user_metadata: { full_name },
        });
      } catch (authErr) {
        console.warn('[adminController] Note sync auth.users metadata:', authErr);
      }
    }

    // 3. Update in public.profiles table
    const profileUpdates: Record<string, unknown> = {};
    if (email !== undefined) profileUpdates.email = email.trim().toLowerCase();
    if (full_name !== undefined) profileUpdates.full_name = full_name;
    if (phone !== undefined) profileUpdates.phone = phone;
    if (company_name !== undefined) profileUpdates.company_name = company_name;
    if (zone !== undefined) profileUpdates.zone = zone;
    if (vehicle !== undefined) profileUpdates.vehicle = vehicle;
    if (is_active !== undefined) profileUpdates.is_active = is_active;

    const { data: updated, error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', id)
      .select()
      .single();

    if (profileError) {
      apiError(res, 500, `Erreur mise à jour profil : ${profileError.message}`);
      return;
    }

    apiOk(res, updated, 'Profil et identifiants de connexion mis à jour avec succès.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/users/reset-password
 * Directly reset a user's password to the standard password (no email sent).
 */
export async function resetUserPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      apiError(res, 400, 'ID utilisateur invalide');
      return;
    }

    const { userId } = parsed.data;

    // Use admin API to directly set the password — no email required
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: STANDARD_PASSWORD,
    });

    if (error) {
      apiError(res, 400, `Erreur réinitialisation : ${error.message}`);
      return;
    }

    apiOk(res, { userId }, `Mot de passe réinitialisé au mot de passe standard.`);
  } catch (err) {
    next(err);
  }
}


/**
 * DELETE /api/admin/users/:id
 * Permanently delete a user (auth + profile + detach parcels).
 */
export async function deleteUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    // 1. Detach parcels assigned to or sent by this user
    await supabase.from('parcels').update({ driver_id: null }).eq('driver_id', id);
    await supabase.from('parcels').update({ sender_id: null }).eq('sender_id', id);

    // 2. Delete public profile row
    const { error: profileError } = await supabase.from('profiles').delete().eq('id', id);
    if (profileError) {
      console.warn('[adminController] Profile delete warning:', profileError.message);
    }

    // 3. Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if (authError && !authError.message?.includes('User not found')) {
      apiError(res, 500, authError.message);
      return;
    }

    apiOk(res, { id }, 'Utilisateur supprimé définitivement (Auth + Profil).');
  } catch (err) {
    next(err);
  }
}
