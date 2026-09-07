import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';

/**
 * Middleware that verifies the incoming Bearer token is valid
 * and that the authenticated user has the 'admin' role in public.profiles.
 *
 * If the check fails, responds with 401 or 403.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Token d\'authentification manquant.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    // Verify the JWT with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        success: false,
        message: 'Token invalide ou expiré. Veuillez vous reconnecter.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check the user's role in public.profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      res.status(403).json({
        success: false,
        message: 'Profil utilisateur introuvable.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (profile.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Accès refusé. Cette action est réservée aux administrateurs ZIHAN.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!profile.is_active) {
      res.status(403).json({
        success: false,
        message: 'Votre compte est désactivé. Contactez un administrateur.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Attach user to request for downstream use
    (req as Request & { adminUser: typeof user }).adminUser = user;

    next();
  } catch {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification de l\'authentification.',
      timestamp: new Date().toISOString(),
    });
  }
}
