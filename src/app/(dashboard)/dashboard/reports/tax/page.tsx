"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  FileText, 
  Download, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Printer,
  Loader2,
  Building2,
  ArrowRightLeft,
  Settings,
  Save,
} from "lucide-react";
import { gooeyToast } from "goey-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TaxSettings {
  taxName: string;
  taxType: string;
  taxRate: number;
  isActive: boolean;
  taxNumber?: string | null;
  taxAddress?: string | null;
}

interface Branch {
  id: string;
  name: string;
}

interface TaxReportData {
  year: number;
  viewMode: string;
  branchId: string | null;
  branchName: string;
  branches: Branch[];
  dateRange: {
    start: string;
    end: string;
  };
  taxSettings: TaxSettings;
  report: Array<{
    period: string;
    periodKey: string;
    year: number;
    month?: number;
    quarter?: number;
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    taxableAmount: number;
    taxAmount: number;
  }>;
  summary: {
    yearlyTotal: number;
    yearlyOrders: number;
    avgOrderValue: number;
    totalTaxableAmount: number;
    totalTax: number;
    effectiveTaxRate: number;
  };
  organizationName: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const QUARTERS = [
  { value: "1", label: "Q1 (Jan-Mar)" },
  { value: "2", label: "Q2 (Apr-Jun)" },
  { value: "3", label: "Q3 (Jul-Sep)" },
  { value: "4", label: "Q4 (Okt-Des)" },
];

export default function TaxReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<"monthly" | "quarterly">("monthly");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("");
  const [data, setData] = useState<TaxReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Tax Settings Dialog
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [taxSettings, setTaxSettings] = useState<TaxSettings>({
    taxName: "PPN",
    taxType: "percentage",
    taxRate: 0,
    isActive: false,
    taxNumber: null,
    taxAddress: null,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const fetchTaxReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("year", year.toString());
      params.set("view", viewMode);
      if (selectedBranch !== "all") {
        params.set("branch", selectedBranch);
      }
      if (selectedQuarter) {
        params.set("quarter", selectedQuarter);
      }

      const response = await fetch(`/api/reports/tax?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (err) {
      console.error("Error fetching tax report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [year, viewMode, selectedBranch, selectedQuarter]);

  useEffect(() => {
    fetchTaxReport();
  }, [fetchTaxReport]);

  // Fetch tax settings
  const fetchTaxSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/tax");
      if (response.ok) {
        const result = await response.json();
        if (result) {
          setTaxSettings({
            taxName: result.taxName || "PPN",
            taxType: result.taxType || "percentage",
            taxRate: Number(result.taxRate) || 0,
            isActive: result.isActive ?? false,
            taxNumber: result.taxNumber || null,
            taxAddress: result.taxAddress || null,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching tax settings:", err);
    }
  }, []);

  // Open settings dialog
  const openSettings = () => {
    fetchTaxSettings();
    setSettingsDialogOpen(true);
  };

  // Save tax settings
  const saveTaxSettings = async () => {
    setIsSavingSettings(true);
    try {
      const response = await fetch("/api/settings/tax", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taxSettings),
      });
      
      if (response.ok) {
        gooeyToast.success("Berhasil", { description: "Pengaturan pajak disimpan" });
        setSettingsDialogOpen(false);
        fetchTaxReport();
      } else {
        gooeyToast.error("Gagal", { description: "Tidak dapat menyimpan pengaturan" });
      }
    } catch (err) {
      gooeyToast.error("Error", { description: "Terjadi kesalahan" });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleExportPDF = async () => {
    if (!data) return;
    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      params.set("year", year.toString());
      params.set("view", viewMode);
      if (selectedBranch !== "all") {
        params.set("branch", selectedBranch);
      }
      if (selectedQuarter) {
        params.set("quarter", selectedQuarter);
      }

      const response = await fetch(`/api/reports/tax/export?${params.toString()}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `laporan_pajak_${year}_${viewMode}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Error exporting PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!data) return;
    
    try {
      const rows = [
        ["Laporan Pajak Tahun " + year],
        ["Organization: " + data.organizationName],
        ["Cabang: " + data.branchName],
        ["Periode: " + data.dateRange.start + " - " + data.dateRange.end],
        ["Pajak: " + data.taxSettings.taxName + " (" + (data.taxSettings.taxType === "percentage" ? data.taxSettings.taxRate + "%" : formatCurrency(data.taxSettings.taxRate)) + ")"],
        [],
        ["Periode", "Jumlah Pesanan", "Rata-rata", "Total Pendapatan", "Dasar Pengenaan", data.taxSettings.taxName]
      ];
      
      data.report.forEach(m => {
        rows.push([
          m.period,
          m.totalOrders.toString(),
          m.avgOrderValue.toString(),
          m.totalRevenue.toString(),
          m.taxableAmount.toString(),
          m.taxAmount.toString()
        ]);
      });
      
      rows.push([
        "TOTAL",
        data.summary.yearlyOrders.toString(),
        data.summary.avgOrderValue.toString(),
        data.summary.yearlyTotal.toString(),
        data.summary.totalTaxableAmount.toString(),
        data.summary.totalTax.toString()
      ]);

      const csv = rows.map(row => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `laporan_pajak_${year}.csv`;
      link.click();
    } catch (err) {
      console.error("Error exporting Excel:", err);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (isLoading && !data) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const hasActiveTax = data?.taxSettings?.isActive;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Pajak</h1>
          <p className="text-muted-foreground">
            Laporan pajak{" "}
            {viewMode === "quarterly" ? "per kuartal" : "per bulan"} 
            {" "}untuk bisnis laundry Anda
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} disabled={isExporting || !data}>
            <FileText className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleExportPDF} disabled={isExporting || !data}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="h-5 w-5" />
            Filter Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Year Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={year.toString()} onValueChange={(val) => { if (val) setYear(parseInt(val)); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch Selector */}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedBranch} onValueChange={(val) => setSelectedBranch(val || "all")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Pilih cabang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Cabang</SelectItem>
                  {data?.branches?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Mode */}
            <div className="flex items-center gap-2">
              <Select value={viewMode} onValueChange={(val) => setViewMode(val as "monthly" | "quarterly")}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tipe laporan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Bulanan</SelectItem>
                  <SelectItem value="quarterly">Kuartalan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quarter Selector (only show when quarterly) */}
            {viewMode === "quarterly" && (
              <div className="flex items-center gap-2">
                <Select value={selectedQuarter} onValueChange={(val) => setSelectedQuarter(val || "")}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Semua Q" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Semua Q</SelectItem>
                    {QUARTERS.map((q) => (
                      <SelectItem key={q.value} value={q.value}>
                        {q.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tax Settings Info */}
      <Card className={hasActiveTax ? "bg-blue-50 dark:bg-blue-950 border-blue-200" : "bg-muted"}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Konfigurasi Pajak: {data?.taxSettings?.taxName || "PPN"}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Tipe: {data?.taxSettings?.taxType === "percentage" ? `Persentase (${data?.taxSettings?.taxRate}%)` : `Fixed (${formatCurrency(data?.taxSettings?.taxRate || 0)})`}
                  {data?.taxSettings?.taxNumber && ` • NPWP: ${data?.taxSettings?.taxNumber}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={openSettings}>
                <Settings className="h-4 w-4 mr-1" />
                Pengaturan
              </Button>
              <Badge variant={hasActiveTax ? "default" : "secondary"}>
                {hasActiveTax ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.summary.yearlyTotal || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.summary.yearlyOrders || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dasar Pengenaan</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data?.summary.totalTaxableAmount || 0)}
            </div>
          </CardContent>
        </Card>
        <Card className={hasActiveTax ? "bg-green-50 dark:bg-green-950 border-green-200" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {data?.taxSettings?.taxName || "Pajak"} ({data?.summary.effectiveTaxRate?.toFixed(1)}%)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(data?.summary.totalTax || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Detail Laporan {viewMode === "quarterly" ? "per Kuartal" : "per Bulan"}
          </CardTitle>
          <CardDescription>
            Rincian pendapatan dan pajak {viewMode === "quarterly" ? "per kuartal" : "per bulan"} tahun {year}
            {selectedBranch !== "all" && ` - ${data?.branchName}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{viewMode === "quarterly" ? "Kuartal" : "Bulan"}</TableHead>
                <TableHead className="text-right">Jumlah Pesanan</TableHead>
                <TableHead className="text-right">Rata-rata</TableHead>
                <TableHead className="text-right">Total Pendapatan</TableHead>
                <TableHead className="text-right">Dasar Pengenaan</TableHead>
                <TableHead className="text-right">{data?.taxSettings?.taxName || "Pajak"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.report.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.period}</TableCell>
                  <TableCell className="text-right">{item.totalOrders}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.avgOrderValue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.totalRevenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.taxableAmount)}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    {formatCurrency(item.taxAmount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{data?.summary.yearlyOrders || 0}</TableCell>
                <TableCell className="text-right">{formatCurrency(data?.summary.avgOrderValue || 0)}</TableCell>
                <TableCell className="text-right">{formatCurrency(data?.summary.yearlyTotal || 0)}</TableCell>
                <TableCell className="text-right">{formatCurrency(data?.summary.totalTaxableAmount || 0)}</TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(data?.summary.totalTax || 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Catatan Laporan Pajak
              </p>
              <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1">
                <li>• Laporan ini menampilkan total pendapatan kotor (gross revenue)</li>
                <li>• Dasar pengenaan pajak dihitung dari total pendapatan</li>
                <li>• {data?.taxSettings?.taxName || "Pajak"} dihitung berdasarkan konfigurasi organisasi ({data?.taxSettings?.taxType === "percentage" ? `${data?.taxSettings?.taxRate}%` : formatCurrency(data?.taxSettings?.taxRate || 0)})</li>
                <li>• Untuk perhitungan pajak final (PPh Final), silakan konsultasikan dengan accountant</li>
                <li>• Simpan laporan ini untuk keperluan pajak tahunan (SPT Tahunan)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Pengaturan Pajak
            </DialogTitle>
            <DialogDescription>
              Atur perhitungan pajak untuk laporan keuangan Anda
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Enable/Disable Tax */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Aktifkan Pajak</Label>
                <p className="text-sm text-muted-foreground">
                  Hitung pajak dalam laporan
                </p>
              </div>
              <Switch
                checked={taxSettings.isActive}
                onCheckedChange={(checked) => setTaxSettings({ ...taxSettings, isActive: checked })}
              />
            </div>

            {/* Tax Name */}
            <div className="space-y-2">
              <Label htmlFor="taxName">Nama Pajak</Label>
              <Input
                id="taxName"
                value={taxSettings.taxName}
                onChange={(e) => setTaxSettings({ ...taxSettings, taxName: e.target.value })}
                placeholder="PPN, PPh, etc"
              />
            </div>

            {/* Tax Type */}
            <div className="space-y-2">
              <Label htmlFor="taxType">Tipe Pajak</Label>
              <Select
                value={taxSettings.taxType}
                onValueChange={(val) => setTaxSettings({ ...taxSettings, taxType: val || "percentage" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Persentase (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (Rp)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tax Rate */}
            <div className="space-y-2">
              <Label htmlFor="taxRate">
                {taxSettings.taxType === "percentage" ? "Tarif Pajak (%)" : "Jumlah Fixed (Rp)"}
              </Label>
              <Input
                id="taxRate"
                type="number"
                value={taxSettings.taxRate}
                onChange={(e) => setTaxSettings({ ...taxSettings, taxRate: Number(e.target.value) })}
                placeholder={taxSettings.taxType === "percentage" ? "10" : "5000"}
              />
            </div>

            {/* Tax Number (NPWP) */}
            <div className="space-y-2">
              <Label htmlFor="taxNumber">NPWP (Opsional)</Label>
              <Input
                id="taxNumber"
                value={taxSettings.taxNumber || ""}
                onChange={(e) => setTaxSettings({ ...taxSettings, taxNumber: e.target.value || undefined })}
                placeholder="01.234.567.8-901.000"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={saveTaxSettings} disabled={isSavingSettings}>
              {isSavingSettings ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
