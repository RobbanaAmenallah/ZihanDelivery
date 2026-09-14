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
  full_name: z.string().min(2).optional(),
  phone: z.string().min(8).optional(),
  company_name: z.string().optional(),
  zone: z.string().optional(),
  vehicle: z.string().optional(),
  is_active: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
});

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
        email: emailMap.get(p.id) ?? '',
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
 * Update profile fields (is_active, zone, vehicle, etc.)
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

    // 1. Update in public.profiles table
    const { data: updated, error: profileError } = await supabase
      .from('profiles')
      .update({ ...parsed.data })
      .eq('id', id)
      .select()
      .single();

    if (profileError) {
      apiError(res, 500, `Erreur mise à jour profil : ${profileError.message}`);
      return;
    }

    // 2. Also sync display name in auth.users if full_name was changed
    if (parsed.data.full_name) {
      try {
        await supabase.auth.admin.updateUserById(id, {
          user_metadata: { full_name: parsed.data.full_name },
        });
      } catch (authErr) {
        console.warn('[adminController] Note sync auth.users metadata:', authErr);
      }
    }

    apiOk(res, updated, 'Profil mis à jour avec succès dans la base de données.');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/users/reset-password
 * Send a password reset email via Supabase.
 */
export async function resetUserPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      apiError(res, 400, 'Email invalide');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/login`,
    });

    if (error) {
      apiError(res, 400, error.message);
      return;
    }

    apiOk(res, null, `Email de réinitialisation envoyé à ${parsed.data.email}.`);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/users/:id
 * Permanently delete a user (auth + profile).
 */
export async function deleteUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;

    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
      apiError(res, 500, error.message);
      return;
    }

    apiOk(res, { id }, 'Utilisateur supprimé définitivement.');
  } catch (err) {
    next(err);
  }
}
