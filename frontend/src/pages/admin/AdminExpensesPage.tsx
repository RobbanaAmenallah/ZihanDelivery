import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  Fuel,
  Wrench,
  PhoneCall,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  RefreshCw,
  Trash2,
  Edit2,
  Calendar,
  Truck,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Car,
  Receipt,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import {
  getDbExpenses,
  createDbExpense,
  updateDbExpense,
  deleteDbExpense,
  EXPENSE_CATEGORIES,
} from '@/services/expensesDb';
import { getSupabaseClient, getActiveSupabaseConfig } from '@/services/supabase';
import type { CompanyExpense, CreateExpensePayload, ExpenseCategory } from '@/types';

export const AdminExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<CompanyExpense[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month' | 'last_month' | 'year'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<CompanyExpense | null>(null);

  // Form State
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('gasoil');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formVehiclePlate, setFormVehiclePlate] = useState<string>('');
  const [formVehicleModel, setFormVehicleModel] = useState<string>('');
  const [formDriverName, setFormDriverName] = useState<string>('');
  const [formMileage, setFormMileage] = useState<string>('');
  const [formPaymentMethod, setFormPaymentMethod] = useState<'especes' | 'carte' | 'virement' | 'cheque'>('especes');
  const [formReceiptNumber, setFormReceiptNumber] = useState<string>('');
  const [formSupplier, setFormSupplier] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const { expenses: data } = await getDbExpenses();
      setExpenses(data);
    } catch (err) {
      console.error('Erreur chargement dépenses:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExpenses();

    const config = getActiveSupabaseConfig();
    if (config.isConfigured) {
      const client = getSupabaseClient();
      const channel = client
        .channel('realtime_expenses_feed')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'expenses' },
          () => {
            loadExpenses();
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    }
  }, [loadExpenses]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Liste dynamique des véhicules réels ayant déjà des dépenses
  const knownVehicles = useMemo(() => {
    const map = new Map<string, { plate: string; model?: string; driver?: string }>();
    expenses.forEach((e) => {
      if (e.vehicle_plate && e.vehicle_plate.trim()) {
        const p = e.vehicle_plate.trim();
        if (!map.has(p)) {
          map.set(p, {
            plate: p,
            model: e.vehicle_model || '',
            driver: e.driver_name || '',
          });
        }
      }
    });
    return Array.from(map.values());
  }, [expenses]);

  // Quick select company vehicle helper
  const handleVehicleSelect = (plate: string) => {
    setFormVehiclePlate(plate);
    const found = knownVehicles.find((v) => v.plate === plate);
    if (found) {
      if (found.model) setFormVehicleModel(found.model);
      if (found.driver) setFormDriverName(found.driver);
    }
  };

  // Open Add modal (commence avec un formulaire entièrement vierge pour les vraies dépenses)
  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormCategory('gasoil');
    setFormTitle('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormVehiclePlate('');
    setFormVehicleModel('');
    setFormDriverName('');
    setFormMileage('');
    setFormPaymentMethod('especes');
    setFormReceiptNumber('');
    setFormSupplier('');
    setFormNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEditModal = (exp: CompanyExpense) => {
    setEditingExpense(exp);
    setFormCategory(exp.category);
    setFormTitle(exp.title);
    setFormAmount(exp.amount.toString());
    setFormDate(exp.date);
    setFormVehiclePlate(exp.vehicle_plate || '');
    setFormVehicleModel(exp.vehicle_model || '');
    setFormDriverName(exp.driver_name || '');
    setFormMileage(exp.mileage ? exp.mileage.toString() : '');
    setFormPaymentMethod(exp.payment_method);
    setFormReceiptNumber(exp.receipt_number || '');
    setFormSupplier(exp.supplier || '');
    setFormNotes(exp.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const amountNum = parseFloat(formAmount);
    if (!formTitle.trim()) {
      setFormError('Veuillez renseigner un libellé ou une description de la dépense.');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Veuillez renseigner un montant valide en TND.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateExpensePayload = {
        category: formCategory,
        title: formTitle.trim(),
        amount: amountNum,
        date: formDate,
        vehicle_plate: formVehiclePlate.trim() || undefined,
        vehicle_model: formVehicleModel.trim() || undefined,
        driver_name: formDriverName.trim() || undefined,
        mileage: formMileage ? parseFloat(formMileage) : undefined,
        payment_method: formPaymentMethod,
        receipt_number: formReceiptNumber.trim() || undefined,
        supplier: formSupplier.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };

      if (editingExpense) {
        await updateDbExpense(editingExpense.id, payload);
        showToast(`✅ Dépense "${payload.title}" modifiée avec succès`);
      } else {
        await createDbExpense(payload);
        showToast(`✅ Dépense de ${amountNum.toFixed(3)} DT enregistrée avec succès`);
      }

      await loadExpenses();
      setIsModalOpen(false);
    } catch (err) {
      setFormError('Erreur lors de l\'enregistrement de la dépense.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete
  const handleDelete = async (exp: CompanyExpense) => {
    if (!window.confirm(`Supprimer définitivement la dépense "${exp.title}" (${exp.amount.toFixed(3)} DT) ?`)) {
      return;
    }
    try {
      await deleteDbExpense(exp.id);
      showToast('🗑️ Dépense supprimée.');
      await loadExpenses();
    } catch {
      alert('Impossible de supprimer la dépense.');
    }
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return expenses.filter((e) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchPlate = e.vehicle_plate?.toLowerCase().includes(q);
        const matchDriver = e.driver_name?.toLowerCase().includes(q);
        const matchSupplier = e.supplier?.toLowerCase().includes(q);
        const matchReceipt = e.receipt_number?.toLowerCase().includes(q);
        if (!matchTitle && !matchPlate && !matchDriver && !matchSupplier && !matchReceipt) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== 'all' && e.category !== selectedCategory) {
        return false;
      }

      // Vehicle
      if (selectedVehicle !== 'all') {
        if (!e.vehicle_plate || e.vehicle_plate !== selectedVehicle) {
          return false;
        }
      }

      // Period
      if (periodFilter === 'today') {
        return e.date === todayStr;
      }
      if (periodFilter === 'week') {
        const d = new Date(e.date);
        const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        return d >= sevenDaysAgo;
      }
      if (periodFilter === 'month') {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (periodFilter === 'last_month') {
        const d = new Date(e.date);
        const lastM = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const lastMY = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return d.getMonth() === lastM && d.getFullYear() === lastMY;
      }
      if (periodFilter === 'year') {
        const d = new Date(e.date);
        return d.getFullYear() === now.getFullYear();
      }

      return true;
    });
  }, [expenses, searchQuery, selectedCategory, selectedVehicle, periodFilter]);

  // KPIs
  const stats = useMemo(() => {
    let total = 0;
    let gasoil = 0;
    let fleetMaint = 0; // Vidange + Pieces + Entretien
    let telecom = 0;
    let other = 0;

    filteredExpenses.forEach((e) => {
      total += e.amount;
      if (e.category === 'gasoil') {
        gasoil += e.amount;
      } else if (['vidange', 'pieces_rechange', 'entretien'].includes(e.category)) {
        fleetMaint += e.amount;
      } else if (e.category === 'facture_tel') {
        telecom += e.amount;
      } else {
        other += e.amount;
      }
    });

    return {
      total,
      gasoil,
      fleetMaint,
      telecom,
      other,
      count: filteredExpenses.length,
    };
  }, [filteredExpenses]);

  // Vehicle Breakdown
  const vehicleBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; gasoil: number; maint: number; count: number }>();

    filteredExpenses.forEach((e) => {
      if (!e.vehicle_plate) return;
      const key = e.vehicle_plate;
      if (!map.has(key)) {
        map.set(key, { total: 0, gasoil: 0, maint: 0, count: 0 });
      }
      const data = map.get(key)!;
      data.total += e.amount;
      data.count += 1;
      if (e.category === 'gasoil') data.gasoil += e.amount;
      if (['vidange', 'pieces_rechange', 'entretien'].includes(e.category)) data.maint += e.amount;
    });

    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [filteredExpenses]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert('Aucune dépense à exporter.');
      return;
    }

    const headers = [
      'Date',
      'Catégorie',
      'Libellé / Titre',
      'Montant (TND)',
      'Véhicule Société',
      'Modèle',
      'Chauffeur',
      'Kilométrage (km)',
      'Mode Paiement',
      'Fournisseur',
      'N° Bon / Facture',
      'Notes',
    ];

    const rows = filteredExpenses.map((e) => {
      const catMeta = EXPENSE_CATEGORIES.find((c) => c.key === e.category);
      return [
        `"${e.date}"`,
        `"${catMeta?.label || e.category}"`,
        `"${e.title.replace(/"/g, '""')}"`,
        e.amount.toFixed(3),
        `"${e.vehicle_plate || ''}"`,
        `"${e.vehicle_model || ''}"`,
        `"${e.driver_name || ''}"`,
        e.mileage || '',
        `"${e.payment_method}"`,
        `"${e.supplier || ''}"`,
        `"${e.receipt_number || ''}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Depenses_ZIHAN_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20">
              <Wallet className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Dépenses &amp; Frais de Flotte
            </h1>
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold">
              Société ZIHAN
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Gestion intégrale des coûts d'exploitation : <strong>Gasoil</strong>, <strong>vidange</strong>, <strong>pièces de rechange</strong>, <strong>factures téléphoniques</strong> et entretien des véhicules.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadExpenses}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Actualiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
          >
            Export Excel
          </Button>
          <Button
            size="sm"
            onClick={handleOpenAddModal}
            leftIcon={<Plus className="h-4 w-4" />}
            className="bg-[#1B3D87] hover:bg-[#152e66] text-white shadow-sm font-bold"
          >
            Nouvelle Dépense
          </Button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── KPI STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dépenses */}
        <Card className="border-l-4 border-l-[#1B3D87] shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Dépenses
              </p>
              <div className="text-2xl font-black text-foreground mt-1">
                {stats.total.toFixed(3)}{' '}
                <span className="text-xs font-bold text-muted-foreground">TND</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.count} charge(s) enregistrée(s)
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#1B3D87]">
              <TrendingDown className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Gasoil & Carburant */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gasoil &amp; Carburant
              </p>
              <div className="text-2xl font-black text-amber-700 mt-1">
                {stats.gasoil.toFixed(3)}{' '}
                <span className="text-xs font-bold text-muted-foreground">TND</span>
              </div>
              <p className="text-xs text-amber-600 font-medium mt-0.5">
                {stats.total > 0 ? ((stats.gasoil / stats.total) * 100).toFixed(0) : 0}% du total des dépenses
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Fuel className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Entretien Véhicules */}
        <Card className="border-l-4 border-l-blue-600 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Entretien, Vidange &amp; Pièces
              </p>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {stats.fleetMaint.toFixed(3)}{' '}
                <span className="text-xs font-bold text-muted-foreground">TND</span>
              </div>
              <p className="text-xs text-blue-600 font-medium mt-0.5">
                Vidanges, réparations &amp; pièces
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Wrench className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Téléphonie & Autres */}
        <Card className="border-l-4 border-l-emerald-600 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Téléphonie &amp; Charges
              </p>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {(stats.telecom + stats.other).toFixed(3)}{' '}
                <span className="text-xs font-bold text-muted-foreground">TND</span>
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                Tél: {stats.telecom.toFixed(3)} DT • Divers: {stats.other.toFixed(3)} DT
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <PhoneCall className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SYNTHÈSE DES VÉHICULES DE LA SOCIÉTÉ ── */}
      {vehicleBreakdown.length > 0 && (
        <div className="p-4 rounded-xl border border-border bg-gradient-to-r from-blue-50/50 via-white to-amber-50/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-[#1B3D87]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Coûts par Véhicule de la Flotte
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground font-semibold">
              {vehicleBreakdown.length} véhicule(s) actif(s)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {vehicleBreakdown.map(([plate, data]) => {
              const vMeta = knownVehicles.find((v) => v.plate === plate);
              return (
                <div
                  key={plate}
                  onClick={() => setSelectedVehicle(selectedVehicle === plate ? 'all' : plate)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedVehicle === plate
                      ? 'border-[#1B3D87] bg-blue-50/80 shadow-xs ring-1 ring-[#1B3D87]'
                      : 'border-border/70 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-xs text-foreground bg-muted px-1.5 py-0.5 rounded">
                      {plate}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{data.count} frais</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {vMeta?.model || 'Véhicule Société'}
                  </div>
                  <div className="text-sm font-black text-[#1B3D87] mt-1">
                    {data.total.toFixed(3)} <span className="text-[10px] font-normal">TND</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-between mt-1 pt-1 border-t border-border/50">
                    <span>⛽ {data.gasoil.toFixed(1)} DT</span>
                    <span>🔧 {data.maint.toFixed(1)} DT</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BARRE DE FILTRES ET RECHERCHE ── */}
      <div className="bg-card border rounded-lg p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Recherche */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher libellé, matricule, livreur, reçu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-9 bg-background"
          />
        </div>

        {/* Filtres Catégorie, Véhicule & Période */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Catégorie */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs rounded-md border border-input bg-background px-2.5 py-1.5 h-9 font-medium"
            >
              <option value="all">Toutes Catégories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Véhicule */}
          {knownVehicles.length > 0 && (
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="text-xs rounded-md border border-input bg-background px-2.5 py-1.5 h-9 font-medium"
            >
              <option value="all">🚗 Tous les Véhicules</option>
              {knownVehicles.map((v) => (
                <option key={v.plate} value={v.plate}>
                  {v.plate} {v.model ? `(${v.model})` : ''}
                </option>
              ))}
            </select>
          )}

          {/* Période */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md text-xs">
            {(['all', 'month', 'week', 'today', 'last_month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodFilter(p)}
                className={`px-2 py-1 rounded font-medium transition-all ${
                  periodFilter === p
                    ? 'bg-white text-[#1B3D87] shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p === 'all'
                  ? 'Tous'
                  : p === 'month'
                  ? 'Ce mois'
                  : p === 'week'
                  ? '7 jours'
                  : p === 'today'
                  ? "Aujourd'hui"
                  : p === 'last_month'
                  ? 'Mois dernier'
                  : 'Année'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TABLE DES DÉPENSES ── */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#1B3D87]" />
            <h2 className="text-sm font-bold text-foreground">
              Liste des Dépenses ({filteredExpenses.length})
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-semibold">
            Total affiché : <strong className="text-[#1B3D87]">{stats.total.toFixed(3)} TND</strong>
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-foreground">Aucune dépense trouvée</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Aucune dépense ne correspond aux critères de filtre sélectionnés. Cliquez sur « Nouvelle Dépense » pour en ajouter une.
            </p>
            <Button
              size="sm"
              onClick={handleOpenAddModal}
              className="mt-4 bg-[#1B3D87] text-white text-xs font-semibold"
            >
              + Ajouter une dépense
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b text-muted-foreground font-semibold">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Catégorie</th>
                  <th className="py-2.5 px-3">Libellé &amp; Fournisseur</th>
                  <th className="py-2.5 px-3">Véhicule Société &amp; Chauffeur</th>
                  <th className="py-2.5 px-3">Paiement &amp; Reçu</th>
                  <th className="py-2.5 px-3 text-right">Montant (TND)</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredExpenses.map((exp) => {
                  const cat = EXPENSE_CATEGORIES.find((c) => c.key === exp.category);
                  return (
                    <tr key={exp.id} className="hover:bg-muted/20 transition-colors">
                      {/* Date */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            {new Date(exp.date).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Catégorie */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            cat?.badgeClass || 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          <span>{cat?.icon || '💳'}</span>
                          <span>{cat?.label || exp.category}</span>
                        </span>
                      </td>

                      {/* Libellé & Fournisseur */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-foreground">{exp.title}</div>
                        {exp.supplier && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <span>🏢 Fournisseur : {exp.supplier}</span>
                          </div>
                        )}
                        {exp.notes && (
                          <div className="text-[10px] text-muted-foreground italic truncate max-w-xs mt-0.5">
                            Note : {exp.notes}
                          </div>
                        )}
                      </td>

                      {/* Véhicule & Chauffeur */}
                      <td className="py-2.5 px-3">
                        {exp.vehicle_plate ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-foreground px-1.5 py-0.2 rounded border">
                                {exp.vehicle_plate}
                              </span>
                              {exp.vehicle_model && (
                                <span className="text-[11px] text-muted-foreground">({exp.vehicle_model})</span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                              {exp.driver_name && <span>👤 {exp.driver_name}</span>}
                              {exp.mileage && <span>📍 {exp.mileage.toLocaleString()} km</span>}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">Frais généraux (sans véhicule)</span>
                        )}
                      </td>

                      {/* Paiement & Reçu */}
                      <td className="py-2.5 px-3">
                        <div className="capitalize font-semibold text-foreground">
                          {exp.payment_method === 'especes'
                            ? '💵 Espèces'
                            : exp.payment_method === 'carte'
                            ? '💳 Carte'
                            : exp.payment_method === 'virement'
                            ? '🏦 Virement'
                            : '📄 Chèque'}
                        </div>
                        {exp.receipt_number && (
                          <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                            <Receipt className="h-3 w-3" />
                            <span>N° {exp.receipt_number}</span>
                          </div>
                        )}
                      </td>

                      {/* Montant (TND) */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span className="text-sm font-black text-[#1B3D87]">
                          {exp.amount.toFixed(3)}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground ml-1">TND</span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(exp)}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-[#1B3D87]"
                            title="Modifier cette dépense"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp)}
                            className="p-1 rounded hover:bg-rose-50 text-muted-foreground hover:text-rose-600"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/40 font-bold border-t">
                  <td colSpan={5} className="py-2.5 px-3 text-right text-foreground">
                    Total Dépenses ({filteredExpenses.length} lignes) :
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-[#1B3D87] text-sm">
                    {stats.total.toFixed(3)} TND
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL NOUVELLE / MODIFIER DÉPENSE ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExpense ? 'Modifier la Dépense' : 'Enregistrer une Dépense Société'}
      >
        <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Catégorie & Montant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Catégorie de Dépense *
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#1B3D87]"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Montant (TND) *
              </label>
              <Input
                type="number"
                step="0.001"
                placeholder="Ex: 85.000"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="h-9 text-xs font-bold"
                required
              />
            </div>
          </div>

          {/* 2. Titre & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-foreground block mb-1">
                Libellé / Titre de la dépense *
              </label>
              <Input
                placeholder="Ex: Plein Gasoil 50L, Vidange 10 000 km, Facture Ooredoo..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Date de la Dépense *
              </label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* 3. Section Véhicule Société (Pour Gasoil, Vidange, Pièces...) */}
          <div className="p-3 rounded-lg border border-border bg-slate-50 dark:bg-slate-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1B3D87] flex items-center gap-1.5">
                <Car className="h-4 w-4" />
                Véhicule de la Société (Optionnel si frais généraux)
              </span>
              <span className="text-[10px] text-muted-foreground">Flotte 100% ZIHAN</span>
            </div>

            {/* Quick Vehicle Select from known real vehicles */}
            {knownVehicles.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground font-semibold">Véhicules enregistrés :</span>
                {knownVehicles.map((v) => (
                  <button
                    type="button"
                    key={v.plate}
                    onClick={() => handleVehicleSelect(v.plate)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                      formVehiclePlate === v.plate
                        ? 'bg-[#1B3D87] text-white shadow-xs'
                        : 'bg-white border text-foreground hover:bg-muted'
                    }`}
                  >
                    {v.plate}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <Input
                label="Matricule Véhicule"
                placeholder="Ex: 215 TUN 4820"
                value={formVehiclePlate}
                onChange={(e) => setFormVehiclePlate(e.target.value)}
                className="h-8 text-xs font-mono"
              />
              <Input
                label="Modèle"
                placeholder="Ex: Peugeot Partner"
                value={formVehicleModel}
                onChange={(e) => setFormVehicleModel(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                label="Chauffeur / Livreur"
                placeholder="Ex: Karim Mansouri"
                value={formDriverName}
                onChange={(e) => setFormDriverName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input
                type="number"
                label="Kilométrage Compteur (km)"
                placeholder="Ex: 142500"
                value={formMileage}
                onChange={(e) => setFormMileage(e.target.value)}
                className="h-8 text-xs font-mono"
              />
              <Input
                label="Fournisseur / Station / Garage"
                placeholder="Ex: Kiosque Agil, Shell, Total, Garage..."
                value={formSupplier}
                onChange={(e) => setFormSupplier(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* 4. Règlement & N° Facture */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Mode de Paiement
              </label>
              <select
                value={formPaymentMethod}
                onChange={(e) => setFormPaymentMethod(e.target.value as any)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#1B3D87]"
              >
                <option value="especes">💵 Espèces (Cash)</option>
                <option value="carte">💳 Carte Bancaire Société</option>
                <option value="virement">🏦 Virement Bancaire</option>
                <option value="cheque">📄 Chèque</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                N° Bon / Facture / Reçu
              </label>
              <Input
                placeholder="Ex: BL-88412, FAC-2026-09"
                value={formReceiptNumber}
                onChange={(e) => setFormReceiptNumber(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* 5. Notes */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">
              Notes &amp; Observations
            </label>
            <Input
              placeholder="Ex: Remplacement filtre à gazole lors de la vidange..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              className="bg-[#1B3D87] hover:bg-[#152e66] text-white font-bold"
            >
              {editingExpense ? 'Enregistrer Modifications' : 'Ajouter la Dépense'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
