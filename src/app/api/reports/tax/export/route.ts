/**
 * Tax Report Export API
 * 
 * Generate PDF export for tax reports
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, orders, organizationMembers, branches, taxSettings, organizations } from "@/lib/db";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

async function getUserOrgAndBranches(userId: string) {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));

  if (!member) return { orgId: null, branchIds: [] as string[], orgName: null, orgAddress: null };

  const orgBranches = await db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.organizationId, member.organizationId));

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, member.organizationId));

  return {
    orgId: member.organizationId,
    branches: orgBranches,
    orgName: org?.name || null,
    orgAddress: null,
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
    const branchId = searchParams.get("branch");
    const viewMode = searchParams.get("view") || "monthly";
    const quarterParam = searchParams.get("quarter");

    const { orgId, branches, orgName } = await getUserOrgAndBranches(session.user.id);
    
    if (!orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    const branchIds = branchId && branches.find(b => b.id === branchId) 
      ? [branchId] 
      : branches.map(b => b.id);

    const branchName = branchIds.length === 1 
      ? branches.find(b => b.id === branchIds[0])?.name 
      : "Semua Cab";

    // Fetch tax settings
    const [taxConfig] = await db
      .select({
        taxName: taxSettings.taxName,
        taxType: taxSettings.taxType,
        taxRate: taxSettings.taxRate,
        isActive: taxSettings.isActive,
        taxNumber: taxSettings.taxNumber,
        taxAddress: taxSettings.taxAddress,
      })
      .from(taxSettings)
      .where(eq(taxSettings.organizationId, orgId));

    const taxRate = taxConfig?.isActive ? Number(taxConfig?.taxRate || 0) : 0;
    const taxType = taxConfig?.taxType || "percentage";
    const taxName = taxConfig?.taxName || "PPN";

    // Build date range
    let startDate: Date;
    let endDate: Date;

    if (quarterParam) {
      const q = parseInt(quarterParam);
      const qStartMonth = (q - 1) * 3;
      startDate = new Date(year, qStartMonth, 1);
      endDate = new Date(year, qStartMonth + 3, 0, 23, 59, 59);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    }

    const calculateTax = (amount: number): number => {
      if (!taxConfig?.isActive || taxRate === 0) return 0;
      if (taxType === "percentage") {
        return Math.round(amount * (taxRate / 100));
      }
      return taxRate;
    };

    const reportData: Array<{
      period: string;
      totalRevenue: number;
      totalOrders: number;
      taxableAmount: number;
      taxAmount: number;
    }> = [];

    if (viewMode === "quarterly") {
      for (let q = 1; q <= 4; q++) {
        const qStartMonth = (q - 1) * 3;
        const qStart = new Date(year, qStartMonth, 1);
        const qEnd = new Date(year, qStartMonth + 3, 0, 23, 59, 59);

        if (qEnd < startDate || qStart > endDate) continue;

        const effectiveStart = qStart < startDate ? startDate : qStart;
        const effectiveEnd = qEnd > endDate ? endDate : qEnd;

        const [data] = await db
          .select({
            totalRevenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)`,
            totalOrders: sql<number>`COUNT(*)`,
          })
          .from(orders)
          .where(and(
            inArray(orders.branchId, branchIds),
            gte(orders.createdAt, effectiveStart),
            lte(orders.createdAt, effectiveEnd),
            eq(orders.paymentStatus, "paid")
          ));

        const revenue = Number(data?.totalRevenue || 0);
        const orderCount = Number(data?.totalOrders || 0);

        reportData.push({
          period: `Q${q} ${year}`,
          totalRevenue: revenue,
          totalOrders: orderCount,
          taxableAmount: revenue,
          taxAmount: calculateTax(revenue),
        });
      }
    } else {
      const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];

      for (let month = 0; month < 12; month++) {
        const mStart = new Date(year, month, 1);
        const mEnd = new Date(year, month + 1, 0, 23, 59, 59);

        if (mEnd < startDate || mStart > endDate) continue;

        const effectiveStart = mStart < startDate ? startDate : mStart;
        const effectiveEnd = mEnd > endDate ? endDate : mEnd;

        const [data] = await db
          .select({
            totalRevenue: sql<number>`COALESCE(SUM(${orders.total}::numeric), 0)`,
            totalOrders: sql<number>`COUNT(*)`,
          })
          .from(orders)
          .where(and(
            inArray(orders.branchId, branchIds),
            gte(orders.createdAt, effectiveStart),
            lte(orders.createdAt, effectiveEnd),
            eq(orders.paymentStatus, "paid")
          ));

        const revenue = Number(data?.totalRevenue || 0);
        const orderCount = Number(data?.totalOrders || 0);

        reportData.push({
          period: monthNames[month],
          totalRevenue: revenue,
          totalOrders: orderCount,
          taxableAmount: revenue,
          taxAmount: calculateTax(revenue),
        });
      }
    }

    const totals = reportData.reduce((acc, item) => ({
      totalRevenue: acc.totalRevenue + item.totalRevenue,
      totalOrders: acc.totalOrders + item.totalOrders,
      taxableAmount: acc.taxableAmount + item.taxableAmount,
      taxAmount: acc.taxAmount + item.taxAmount,
    }), { totalRevenue: 0, totalOrders: 0, taxableAmount: 0, taxAmount: 0 });

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("LAPORAN PAJAK", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(orgName || "VibeClean", pageWidth / 2, 28, { align: "center" });

    // Report info
    doc.setFontSize(10);
    doc.text(`Tahun: ${year}`, 14, 40);
    doc.text(`Cabang: ${branchName}`, 14, 46);
    doc.text(`Periode: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 52);
    doc.text(`Dicetak: ${formatDate(new Date())}`, 14, 58);

    // Tax settings info
    let taxInfoY = 64;
    if (taxConfig?.isActive) {
      doc.setFontSize(9);
      doc.text(`Pajak: ${taxName} (${taxType === "percentage" ? `${taxRate}%` : formatCurrency(taxRate)})`, 14, taxInfoY);
      if (taxConfig.taxNumber) {
        doc.text(`NPWP: ${taxConfig.taxNumber}`, 14, taxInfoY + 6);
      }
      taxInfoY += 12;
    }

    // Summary box
    doc.setFillColor(245, 245, 245);
    doc.rect(14, taxInfoY, pageWidth - 28, 25, "F");
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("RINGKASAN", 18, taxInfoY + 8);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Total Pendapatan: ${formatCurrency(totals.totalRevenue)}`, 18, taxInfoY + 15);
    doc.text(`Total Pesanan: ${totals.totalOrders}`, 18, taxInfoY + 21);
    doc.text(`Dasar Pengenaan Pajak: ${formatCurrency(totals.taxableAmount)}`, 100, taxInfoY + 15);
    doc.text(`${taxName}: ${formatCurrency(totals.taxAmount)}`, 100, taxInfoY + 21);

    // Table
    const tableStartY = taxInfoY + 32;
    
    const tableHeaders = [["Periode", "Jumlah Pesanan", "Pendapatan", "Dasar Pengenaan", taxName]];
    const tableRows = reportData.map(item => [
      item.period,
      item.totalOrders.toString(),
      formatCurrency(item.totalRevenue),
      formatCurrency(item.taxableAmount),
      formatCurrency(item.taxAmount),
    ]);

    // Add totals row
    tableRows.push([
      "TOTAL",
      totals.totalOrders.toString(),
      formatCurrency(totals.totalRevenue),
      formatCurrency(totals.taxableAmount),
      formatCurrency(totals.taxAmount),
    ]);

    autoTable(doc, {
      startY: tableStartY,
      head: tableHeaders,
      body: tableRows,
      theme: "striped",
      headStyles: {
        fillColor: [66, 66, 66],
        fontStyle: "bold",
      },
      footStyles: {
        fillColor: [220, 220, 220],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25, halign: "right" },
        2: { cellWidth: 35, halign: "right" },
        3: { cellWidth: 35, halign: "right" },
        4: { cellWidth: 35, halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("Dokumen ini Generated secara otomatis oleh VibeClean", pageWidth / 2, finalY, { align: "center" });
    doc.text("Untuk perhitungan pajak final, silakan konsultasikan dengan accountant", pageWidth / 2, finalY + 5, { align: "center" });

    // Signature section
    doc.setFont("helvetica", "normal");
    doc.text(`Diketahui pada tanggal: ${formatDate(new Date())}`, 14, finalY + 20);
    doc.text("Tanda Tangan", 14, finalY + 45);
    doc.text("____________________", 14, finalY + 50);

    // Output PDF
    const pdfBuffer = doc.output("arraybuffer");
    const buffer = Buffer.from(pdfBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="laporan_pajak_${year}_${viewMode}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[Tax Report Export] GET error:", error);
    return NextResponse.json(
      { error: "Failed to generate tax report PDF", details: String(error) },
      { status: 500 }
    );
  }
}
