import { notFound } from "next/navigation";
import Link from "next/link";
import { db, organizations, branches } from "@/lib/db";
import { eq } from "drizzle-orm";
import { QrCode } from "lucide-react";

interface PageProps {
  params: Promise<{
    orgSlug: string;
  }>;
}

export default async function PaymentPage({ params }: PageProps) {
  const { orgSlug } = await params;

  // Get organization by slug
  const [organization] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
    })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug));

  if (!organization) {
    notFound();
  }

  // Get all active branches for this organization
  const branchList = await db
    .select({
      id: branches.id,
      name: branches.name,
      address: branches.address,
      phone: branches.phone,
    })
    .from(branches)
    .where(eq(branches.organizationId, organization.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <QrCode className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Pembayaran {organization.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Pilih cabang untuk melakukan pembayaran
          </p>
        </div>

        {/* Branch Cards */}
        <div className="max-w-2xl mx-auto space-y-4">
          {branchList.map((branch) => (
            <Link
              key={branch.id}
              href={`/pay/${organization.slug}/${branch.id}`}
              className="block"
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all p-6 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {branch.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {branch.address}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {branch.phone}
                    </p>
                  </div>
                  <div className="text-blue-600">
                    <QrCode className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {branchList.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                Tidak ada cabang tersedia
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Powered by{" "}
            <Link href="/" className="text-blue-600 hover:underline">
              VibeClean
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
