import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  Search,
  ArrowUpDown,
  ShieldAlert,
  CheckCircle2,
  Package,
  Phone,
  Radio,
  Eye,
  Building2,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getDbUsers } from '@/services/usersDb';
import { getDbParcels } from '@/services/parcelsDb';
import { getSupabaseClient, getActiveSupabaseConfig } from '@/services/supabase';
import type { Parcel, UserProfile } from '@/types';

export interface ClientReturnStat {
  clientId?: string;
  senderName: string;
  companyName: string;
  senderPhone: string;
  senderEmail?: string;
  senderAddress: string;
  isRegisteredInDb: boolean;
  totalParcels: number;
  delivered: number;
  inTransit: number;
  pending: number;
  returned: number;
  strictReturned: number;
  returnRate: number;
  deliveryRate: number;
  totalCOD: number;
  returnedCOD: number;
  riskLevel: 'high' | 'medium' | 'low';
  parcels: Parcel[];
}

interface ClientReturnRateAnalysisProps {
  parcels?: Parcel[];
  title?: string;
  compact?: boolean;
  limit?: number;
}

export const ClientReturnRateAnalysis: React.FC<ClientReturnRateAnalysisProps> = ({
  parcels: initialParcels,
  title = 'Taux de Retour Réel par Client & Expéditeur (Base Supabase)',
  compact = false,
  limit,
}) => {
  const [dbUsers, setDbUsers] = useState<UserProfile[]>([]);
  const [dbParcels, setDbParcels] = useState<Parcel[]>(initialParcels || []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialParcels);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);
  const [selectedClientForDrilldown, setSelectedClientForDrilldown] = useState<ClientReturnStat | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'returnRate' | 'returnedCount' | 'totalParcels' | 'returnedCOD'>('returnRate');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Load real clients and parcels directly from Supabase
  const loadRealData = useCallback(async () => {
    setIsLoading(true);
    const [usersRes, parcelsRes] = await Promise.all([
      getDbUsers(),
      getDbParcels(),
    ]);

    setDbUsers(usersRes.users || []);
    setDbParcels(parcelsRes.parcels || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadRealData();

    // Supabase Realtime Subscription for live updates
    const { isConfigured } = getActiveSupabaseConfig();
    if (isConfigured) {
      const client = getSupabaseClient();
      const channel = client
        .channel('realtime:superadmin:returns')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'parcels' }, () => {
          loadRealData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          loadRealData();
        })
        .subscribe((status) => {
          setIsRealtimeActive(status === 'SUBSCRIBED');
        });

      return () => {
        client.removeChannel(channel);
      };
    }
  }, [loadRealData]);

  // Keep dbParcels in sync if prop changes
  useEffect(() => {
    if (initialParcels !== undefined) {
      setDbParcels(initialParcels);
    }
  }, [initialParcels]);

  // Merge Registered DB Clients (profiles) with actual Parcels in DB
  const clientStats = useMemo(() => {
    const registeredClients = dbUsers.filter((u) => u.role === 'client');
    const clientMap: Record<string, ClientReturnStat> = {};

    // 1. Initialize with all registered clients in DB
    registeredClients.forEach((client) => {
      const primaryKey = client.id;
      const displayName = client.company_name || client.full_name || 'Client Inconnu';
      clientMap[primaryKey] = {
        clientId: client.id,
        senderName: client.full_name,
        companyName: client.company_name || client.full_name || displayName,
        senderPhone: client.phone || '',
        senderEmail: client.email || '',
        senderAddress: client.zone || '',
        isRegisteredInDb: true,
        totalParcels: 0,
        delivered: 0,
        inTransit: 0,
        pending: 0,
        returned: 0,
        strictReturned: 0,
        returnRate: 0,
        deliveryRate: 0,
        totalCOD: 0,
        returnedCOD: 0,
        riskLevel: 'low',
        parcels: [],
      };
    });

    // 2. Aggregate each parcel to its corresponding client
    dbParcels.forEach((p) => {
      let matchedKey: string | null = null;

      // Match by sender_id if UUID matches registered client
      if (p.sender_id && clientMap[p.sender_id]) {
        matchedKey = p.sender_id;
      } else {
        // Match by company name or sender name or phone
        const pSenderName = (p.sender_name || '').trim().toLowerCase();
        const pSenderPhone = (p.sender_phone || '').trim();

        for (const [key, c] of Object.entries(clientMap)) {
          if (
            (c.companyName && c.companyName.trim().toLowerCase() === pSenderName) ||
            (c.senderName && c.senderName.trim().toLowerCase() === pSenderName) ||
            (pSenderPhone && c.senderPhone && c.senderPhone.includes(pSenderPhone))
          ) {
            matchedKey = key;
            break;
          }
        }
      }

      // If parcel belongs to a sender not yet in profiles, create an entry
      if (!matchedKey) {
        const fallbackKey = (p.sender_name || 'Expéditeur Inconnu').trim();
        if (!clientMap[fallbackKey]) {
          clientMap[fallbackKey] = {
            senderName: p.sender_name || 'Expéditeur Inconnu',
            companyName: p.sender_name || 'Expéditeur Inconnu',
            senderPhone: p.sender_phone || '',
            senderAddress: p.sender_address || '',
            isRegisteredInDb: false,
            totalParcels: 0,
            delivered: 0,
            inTransit: 0,
            pending: 0,
            returned: 0,
            strictReturned: 0,
            returnRate: 0,
            deliveryRate: 0,
            totalCOD: 0,
            returnedCOD: 0,
            riskLevel: 'low',
            parcels: [],
          };
        }
        matchedKey = fallbackKey;
      }

      const target = clientMap[matchedKey];
      target.parcels.push(p);
      target.totalParcels += 1;

      if (p.status === 'delivered') {
        target.delivered += 1;
        target.totalCOD += p.total_amount || 0;
      } else if (['accepted', 'assigned', 'picked_up', 'in_transit'].includes(p.status)) {
        target.inTransit += 1;
      } else if (p.status === 'pending') {
        target.pending += 1;
      } else if (['returned', 'refused', 'failed', 'customer_absent', 'wrong_address'].includes(p.status)) {
        target.returned += 1;
        target.returnedCOD += p.total_amount || 0;
        if (['returned', 'refused'].includes(p.status)) {
          target.strictReturned += 1;
        }
      }
    });

    // 3. Compute final return rates and risk levels
    return Object.values(clientMap).map((item) => {
      const returnRate = item.totalParcels > 0
        ? Number(((item.returned / item.totalParcels) * 100).toFixed(1))
        : 0;
      const deliveryRate = item.totalParcels > 0
        ? Number(((item.delivered / item.totalParcels) * 100).toFixed(1))
        : 0;

      let riskLevel: 'high' | 'medium' | 'low' = 'low';
      if (returnRate >= 25 && item.totalParcels >= 2) {
        riskLevel = 'high';
      } else if (returnRate >= 12 && item.totalParcels >= 2) {
        riskLevel = 'medium';
      }

      return {
        ...item,
        returnRate,
        deliveryRate,
        riskLevel,
      };
    });
  }, [dbUsers, dbParcels]);

  // Global aggregate metrics for returns
  const summary = useMemo(() => {
    const totalParcels = dbParcels.length;
    const totalReturned = dbParcels.filter((p) =>
      ['returned', 'refused', 'failed', 'customer_absent', 'wrong_address'].includes(p.status)
    ).length;
    const totalReturnedCOD = dbParcels
      .filter((p) => ['returned', 'refused', 'failed', 'customer_absent', 'wrong_address'].includes(p.status))
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const globalReturnRate = totalParcels > 0
      ? Number(((totalReturned / totalParcels) * 100).toFixed(1))
      : 0;
    const highRiskClientsCount = clientStats.filter((c) => c.riskLevel === 'high').length;

    return {
      totalParcels,
      totalReturned,
      totalReturnedCOD,
      globalReturnRate,
      highRiskClientsCount,
      totalClients: clientStats.length,
    };
  }, [dbParcels, clientStats]);

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    let list = [...clientStats];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.senderName.toLowerCase().includes(q) ||
          c.senderPhone.toLowerCase().includes(q) ||
          c.senderAddress.toLowerCase().includes(q)
      );
    }

    // Risk level filter
    if (riskFilter !== 'all') {
      list = list.filter((c) => c.riskLevel === riskFilter);
    }

    // Sorting
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'returnRate') {
        comparison = b.returnRate - a.returnRate;
      } else if (sortBy === 'returnedCount') {
        comparison = b.returned - a.returned;
      } else if (sortBy === 'totalParcels') {
        comparison = b.totalParcels - a.totalParcels;
      } else if (sortBy === 'returnedCOD') {
        comparison = b.returnedCOD - a.returnedCOD;
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });

    if (limit && limit > 0) {
      return list.slice(0, limit);
    }

    return list;
  }, [clientStats, searchQuery, riskFilter, sortBy, sortOrder, limit]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Client / Raison Sociale',
      'Contact',
      'Téléphone',
      'Inscrit en Base',
      'Total Colis Confiés',
      'Colis Livrés',
      'Colis Retournés/Échecs',
      'Taux de Retour (%)',
      'Taux de Livraison (%)',
      'COD Bloqué Retours (DT)',
      'Niveau de Risque',
    ];

    const rows = filteredAndSortedClients.map((c) => [
      `"${c.companyName || c.senderName}"`,
      `"${c.senderName}"`,
      `"${c.senderPhone}"`,
      `"${c.isRegisteredInDb ? 'Oui (Compte DB)' : 'Non (Expéditeur)'}"`,
      c.totalParcels,
      c.delivered,
      c.returned,
      `${c.returnRate}%`,
      `${c.deliveryRate}%`,
      c.returnedCOD.toFixed(3),
      `"${c.riskLevel === 'high' ? 'CRITIQUE' : c.riskLevel === 'medium' ? 'MODÉRÉ' : 'FIABLE'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `analyse_retours_clients_zihan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="border-border/80 shadow-sm overflow-hidden">
      <CardHeader className="bg-card border-b border-border/60 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-[#EA4E52]">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-[#1B3D87] dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <Radio className={`h-2.5 w-2.5 ${isRealtimeActive ? 'text-emerald-500 animate-pulse' : 'text-blue-500'}`} />
                  {isRealtimeActive ? 'Live Realtime' : 'Supabase Sync'}
                </span>
              </div>
              <CardDescription className="text-xs">
                Données réelles des clients enregistrés en base : identification des clients générant un fort volume de retours
              </CardDescription>
            </div>
          </div>

          {/* Quick Actions & Summary */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadRealData}
              isLoading={isLoading}
              className="h-8 text-xs font-bold gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualiser
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 text-xs font-bold gap-1 text-[#1B3D87]"
            >
              <Download className="h-3.5 w-3.5" />
              Exporter CSV
            </Button>
          </div>
        </div>

        {/* Global Return KPI Bar */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-border/40">
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Taux de Retour Global</p>
            <p className="text-xl font-black text-foreground">
              {summary.globalReturnRate}% <span className="text-xs font-normal text-muted-foreground">({summary.totalReturned}/{summary.totalParcels})</span>
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
            <p className="text-[10px] uppercase font-bold text-red-700 dark:text-red-300">Clients Critiques (&gt;25%)</p>
            <p className="text-xl font-black text-red-600 dark:text-red-400">
              {summary.highRiskClientsCount} <span className="text-xs font-normal text-red-500">client{summary.highRiskClientsCount > 1 ? 's' : ''}</span>
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
            <p className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">Valeur COD Bloquée Retours</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400">
              {summary.totalReturnedCOD.toFixed(3)} <span className="text-xs font-bold">DT</span>
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
            <p className="text-[10px] uppercase font-bold text-[#1B3D87] dark:text-blue-300">Clients Analysés en Base</p>
            <p className="text-xl font-black text-[#1B3D87] dark:text-blue-400">
              {summary.totalClients} <span className="text-xs font-normal text-muted-foreground">comptes</span>
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        {!compact && (
          <div className="mt-3 pt-3 border-t border-border/40 flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par raison sociale, nom, tél..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground text-[11px] font-semibold mr-1">Filtrer :</span>
              <button
                onClick={() => setRiskFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  riskFilter === 'all'
                    ? 'bg-[#1B3D87] text-white shadow-xs'
                    : 'bg-muted/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                Tous ({clientStats.length})
              </button>
              <button
                onClick={() => setRiskFilter('high')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  riskFilter === 'high'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100'
                }`}
              >
                🔴 Fort (&gt;25%)
              </button>
              <button
                onClick={() => setRiskFilter('medium')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  riskFilter === 'medium'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                🟡 Moyen (12-25%)
              </button>
              <button
                onClick={() => setRiskFilter('low')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  riskFilter === 'low'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                🟢 Fiable (&lt;12%)
              </button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {filteredAndSortedClients.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
            Aucun client ne correspond aux filtres sélectionnés.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EEF3F9] dark:bg-slate-800/80 border-b border-border font-bold text-[#667085]">
                <tr>
                  <th className="p-3 px-4">Client / Société (DB)</th>
                  <th className="p-3 text-center">Colis Confiés</th>
                  <th className="p-3 text-center">Livrés</th>
                  <th className="p-3 text-center">Retours / Échecs</th>
                  <th className="p-3 min-w-[170px]">
                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => {
                      if (sortBy === 'returnRate') {
                        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                      } else {
                        setSortBy('returnRate');
                        setSortOrder('desc');
                      }
                    }}>
                      <span>Taux de Retour</span>
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </th>
                  <th className="p-3 text-right">COD Bloqué</th>
                  <th className="p-3 text-center">Diagnostic Risque</th>
                  <th className="p-3 text-right px-4">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAndSortedClients.map((client) => {
                  return (
                    <tr
                      key={client.clientId || client.senderName}
                      className={`hover:bg-muted/30 transition-colors ${
                        client.riskLevel === 'high'
                          ? 'bg-red-50/30 dark:bg-red-950/10'
                          : ''
                      }`}
                    >
                      <td className="p-3 px-4">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0 mt-0.5 ${
                              client.riskLevel === 'high'
                                ? 'bg-red-600'
                                : client.riskLevel === 'medium'
                                ? 'bg-amber-500'
                                : 'bg-[#1B3D87]'
                            }`}
                          >
                            {(client.companyName || client.senderName).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-foreground text-xs leading-tight">
                                {client.companyName || client.senderName}
                              </p>
                              {client.isRegisteredInDb && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#1B3D87] dark:bg-blue-950 dark:text-blue-300">
                                  Compte DB
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                              {client.senderPhone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-2.5 w-2.5" />
                                  {client.senderPhone}
                                </span>
                              )}
                              {client.senderName && client.senderName !== client.companyName && (
                                <span>• Gérant : {client.senderName}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-center font-bold text-foreground">
                        {client.totalParcels}
                      </td>

                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full text-[11px]">
                          <CheckCircle2 className="h-3 w-3" />
                          {client.delivered}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] ${
                            client.returned > 0
                              ? client.riskLevel === 'high'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-black'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <RotateCcw className="h-3 w-3" />
                          {client.returned}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span
                              className={`font-black ${
                                client.riskLevel === 'high'
                                  ? 'text-red-600 dark:text-red-400'
                                  : client.riskLevel === 'medium'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {client.returnRate}% de retour
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {client.deliveryRate}% livrés
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${client.deliveryRate}%` }}
                              title={`Livrés : ${client.deliveryRate}%`}
                            />
                            <div
                              className="h-full bg-[#1B3D87]"
                              style={{ width: `${client.totalParcels > 0 ? (client.inTransit / client.totalParcels) * 100 : 0}%` }}
                              title="En cours"
                            />
                            <div
                              className="h-full bg-[#EA4E52]"
                              style={{ width: `${client.returnRate}%` }}
                              title={`Retours : ${client.returnRate}%`}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        {client.returnedCOD > 0 ? (
                          <span className="text-red-600 dark:text-red-400">
                            {client.returnedCOD.toFixed(3)} DT
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0.000 DT</span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        {client.riskLevel === 'high' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800">
                            <ShieldAlert className="h-3 w-3" />
                            Client Critique
                          </span>
                        ) : client.riskLevel === 'medium' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <AlertTriangle className="h-3 w-3" />
                            À Surveiller
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Client Fiable
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedClientForDrilldown(client)}
                          className="h-7 px-2 text-[11px] font-bold text-[#1B3D87] bg-blue-50/60 hover:bg-blue-100 gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Colis ({client.parcels.length})
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* ── Client Parcels Drilldown Modal ────────────────────────────────────── */}
      {selectedClientForDrilldown && (
        <Modal
          isOpen={Boolean(selectedClientForDrilldown)}
          onClose={() => setSelectedClientForDrilldown(null)}
          title={
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#1B3D87]" />
              <span>Colis & Retours de : {selectedClientForDrilldown.companyName || selectedClientForDrilldown.senderName}</span>
            </div>
          }
          description={
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
              <span>📞 {selectedClientForDrilldown.senderPhone || 'Sans téléphone'}</span>
              <span>• Total : <b>{selectedClientForDrilldown.totalParcels} colis</b></span>
              <span className="text-red-600 font-bold">• {selectedClientForDrilldown.returned} retours ({selectedClientForDrilldown.returnRate}%)</span>
              <span className="text-emerald-600 font-bold">• {selectedClientForDrilldown.delivered} livrés</span>
            </div>
          }
          size="xl"
        >
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {selectedClientForDrilldown.parcels.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Aucun colis enregistré pour ce client dans la base de données.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-[#EEF3F9] dark:bg-slate-800 border-b border-border font-bold text-[#667085]">
                  <tr>
                    <th className="p-2.5">N° Suivi</th>
                    <th className="p-2.5">Destinataire</th>
                    <th className="p-2.5">Gouvernorat</th>
                    <th className="p-2.5">Statut</th>
                    <th className="p-2.5 text-right">COD</th>
                    <th className="p-2.5">Motif / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedClientForDrilldown.parcels.map((p) => {
                    const isReturn = ['returned', 'refused', 'failed', 'customer_absent', 'wrong_address'].includes(p.status);
                    return (
                      <tr
                        key={p.id || p.tracking_number}
                        className={`hover:bg-muted/40 ${isReturn ? 'bg-red-50/40 dark:bg-red-950/20' : ''}`}
                      >
                        <td className="p-2.5 font-mono font-bold text-[#1B3D87] dark:text-blue-400">
                          {p.tracking_number}
                        </td>
                        <td className="p-2.5 font-semibold text-foreground">
                          {p.recipient_name}
                          <span className="block text-[10px] text-muted-foreground font-normal">{p.recipient_phone}</span>
                        </td>
                        <td className="p-2.5 text-muted-foreground">
                          {p.recipient_governorate}
                        </td>
                        <td className="p-2.5">
                          <StatusBadge status={p.status} size="sm" />
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-foreground">
                          {p.total_amount?.toFixed(3)} DT
                        </td>
                        <td className="p-2.5 text-xs text-muted-foreground">
                          {p.notes || (isReturn ? <span className="text-red-500 italic">Échec/Retour</span> : '—')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}
    </Card>
  );
};

export default ClientReturnRateAnalysis;
