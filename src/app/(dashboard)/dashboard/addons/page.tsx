'use client';

import { useState, useEffect } from 'react';
import { motion, type Variants, type Easing } from 'framer-motion';
import {
    Globe,
    MessageCircle,
    CreditCard,
    Check,
    Clock,
    Loader2,
    Zap,
    Package,
    Copy,
    CheckCircle,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react';
import { gooeyToast } from 'goey-toast';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDate } from '@/lib/utils';

const easeOut: Easing = [0.16, 1, 0.3, 1];

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            ease: easeOut,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: easeOut },
    },
};

interface AddonProduct {
    id: string;
    type: 'custom_domain' | 'whatsapp_quota';
    name: string;
    description: string;
    price: number;
    durationDays: number;
    quota: number | null;
    isActive: boolean;
}

interface AddonPurchase {
    id: string;
    productId: string;
    status: 'pending' | 'active' | 'expired' | 'cancelled';
    startDate: string | null;
    endDate: string | null;
    customDomain: string | null;
    customDomainVerified: boolean;
    customDomainVerifiedAt: string | null;
    whatsappQuota: number;
    whatsappUsed: number;
}

export default function AddonsPage() {
    const [products, setProducts] = useState<AddonProduct[]>([]);
    const [purchases, setPurchases] = useState<AddonPurchase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<AddonProduct | null>(
        null,
    );
    const [customDomain, setCustomDomain] = useState('');
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showDNSDialog, setShowDNSDialog] = useState(false);
    const [selectedPurchase, setSelectedPurchase] =
        useState<AddonPurchase | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const fetchAddons = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/addons');
            const data = await response.json();

            if (data.success) {
                setProducts(data.products || []);
                setPurchases(data.purchases || []);
            }
        } catch (error) {
            console.error('Error fetching addons:', error);
            gooeyToast.error('Gagal memuat data add-on', {
                description: 'Silakan coba lagi',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAddons();
    }, []);

    const handlePurchase = async () => {
        if (!selectedProduct) return;

        if (selectedProduct.type === 'custom_domain' && !customDomain) {
            gooeyToast.error('Domain diperlukan', {
                description: 'Masukkan nama domain yang diinginkan',
            });
            return;
        }

        setIsPurchasing(true);
        try {
            const response = await fetch('/api/addons/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedProduct.id,
                    customDomain:
                        selectedProduct.type === 'custom_domain'
                            ? customDomain
                            : undefined,
                }),
            });

            const data = await response.json();

            if (data.success) {
                gooeyToast.success('Berhasil', {
                    description: 'Add-on berhasil dibeli!',
                });
                setShowConfirmDialog(false);
                setCustomDomain('');
                setSelectedProduct(null);
                fetchAddons(); // Refresh data
            } else {
                gooeyToast.error('Gagal', {
                    description: data.error || 'Gagal membeli add-on',
                });
            }
        } catch (error) {
            console.error('Error purchasing addon:', error);
            gooeyToast.error('Gagal', {
                description: 'Terjadi kesalahan saat pembelian',
            });
        } finally {
            setIsPurchasing(false);
        }
    };

    const openPurchaseDialog = (product: AddonProduct) => {
        setSelectedProduct(product);
        setCustomDomain('');
        setShowConfirmDialog(true);
    };

    const openDNSDialog = (purchase: AddonPurchase) => {
        setSelectedPurchase(purchase);
        setShowDNSDialog(true);
    };

    const handleVerify = async () => {
        if (!selectedPurchase) return;
        setIsVerifying(true);
        try {
            const response = await fetch(
                `/api/addons/${selectedPurchase.id}/verify`,
                {
                    method: 'POST',
                },
            );
            const data = await response.json();

            if (data.success) {
                gooeyToast.success('Domain Verified', {
                    description: 'Custom domain berhasil diverifikasi!',
                });
                fetchAddons();
                setShowDNSDialog(false);
            } else {
                gooeyToast.error('Verification Failed', {
                    description: data.message || 'Gagal verifikasi domain',
                });
            }
        } catch (error) {
            gooeyToast.error('Error', {
                description: 'Gagal verifikasi domain',
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        gooeyToast.success('Copied', { description: 'Tersalin ke clipboard' });
    };

    const activePurchases = purchases.filter((p) => p.status === 'active');
    const expiredPurchases = purchases.filter((p) => p.status === 'expired');

    const getProductById = (productId: string) =>
        products.find((p) => p.id === productId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Add-ons</h1>
                <p className="text-muted-foreground mt-1">
                    Perluas fitur bisnis laundry Anda dengan add-on tambahan
                </p>
            </div>

            <Tabs defaultValue="available" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="available">Tersedia</TabsTrigger>
                    <TabsTrigger value="active">
                        Aktif ({activePurchases.length})
                    </TabsTrigger>
                    <TabsTrigger value="expired">
                        Expired ({expiredPurchases.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="available">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
                    >
                        {products.map((product) => (
                            <motion.div
                                key={product.id}
                                variants={itemVariants}
                            >
                                <Card className="h-full flex flex-col">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div
                                                className={`p-3 rounded-lg ${
                                                    product.type ===
                                                    'custom_domain'
                                                        ? 'bg-blue-100 dark:bg-blue-900'
                                                        : 'bg-green-100 dark:bg-green-900'
                                                }`}
                                            >
                                                {product.type ===
                                                'custom_domain' ? (
                                                    <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                                ) : (
                                                    <MessageCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                                )}
                                            </div>
                                            <Badge variant="outline">
                                                {product.durationDays} hari
                                            </Badge>
                                        </div>
                                        <CardTitle className="mt-4">
                                            {product.name}
                                        </CardTitle>
                                        <CardDescription>
                                            {product.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        {product.type === 'whatsapp_quota' &&
                                            product.quota && (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                                    <Zap className="h-4 w-4" />
                                                    {product.quota} pesan
                                                    WhatsApp
                                                </div>
                                            )}
                                        {product.type === 'custom_domain' && (
                                            <div className="text-sm text-muted-foreground mb-4">
                                                Contoh: laundryanda.com
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="flex flex-col gap-3">
                                        <div className="text-2xl font-bold">
                                            {formatCurrency(product.price)}
                                        </div>
                                        <Button
                                            className="w-full"
                                            onClick={() =>
                                                openPurchaseDialog(product)
                                            }
                                        >
                                            Beli Sekarang
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}

                        {products.length === 0 && (
                            <div className="col-span-full text-center py-12">
                                <Package className="h-12 w-12 mx-auto text-muted-foreground" />
                                <p className="mt-4 text-muted-foreground">
                                    Tidak ada add-on tersedia saat ini
                                </p>
                            </div>
                        )}
                    </motion.div>
                </TabsContent>

                <TabsContent value="active">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-4"
                    >
                        {activePurchases.length === 0 ? (
                            <Card className="p-12 text-center">
                                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground" />
                                <p className="mt-4 text-muted-foreground">
                                    Anda belum memiliki add-on aktif
                                </p>
                            </Card>
                        ) : (
                            activePurchases.map((purchase) => {
                                const product = getProductById(
                                    purchase.productId,
                                );
                                return (
                                    <motion.div
                                        key={purchase.id}
                                        variants={itemVariants}
                                    >
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className={`p-3 rounded-lg ${
                                                            purchase.customDomain
                                                                ? 'bg-blue-100 dark:bg-blue-900'
                                                                : 'bg-green-100 dark:bg-green-900'
                                                        }`}
                                                    >
                                                        {purchase.customDomain ? (
                                                            <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                                        ) : (
                                                            <MessageCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <CardTitle>
                                                            {product?.name ||
                                                                'Add-on'}
                                                        </CardTitle>
                                                        <CardDescription>
                                                            {purchase.customDomain
                                                                ? purchase.customDomain
                                                                : `${purchase.whatsappQuota - purchase.whatsappUsed} pesan tersisa`}
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                                <Badge className="bg-green-100 text-green-700">
                                                    Aktif
                                                </Badge>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        Berakhir:{' '}
                                                        {purchase.endDate
                                                            ? new Date(
                                                                  purchase.endDate,
                                                              ).toLocaleDateString(
                                                                  'id-ID',
                                                              )
                                                            : '-'}
                                                    </div>
                                                    {!purchase.customDomain && (
                                                        <div>
                                                            Usage:{' '}
                                                            {
                                                                purchase.whatsappUsed
                                                            }{' '}
                                                            /{' '}
                                                            {
                                                                purchase.whatsappQuota
                                                            }
                                                        </div>
                                                    )}
                                                </div>
                                                {purchase.customDomain && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="mt-4"
                                                        onClick={() =>
                                                            openDNSDialog(
                                                                purchase,
                                                            )
                                                        }
                                                    >
                                                        <Globe className="h-4 w-4 mr-2" />
                                                        Setup Domain
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })
                        )}
                    </motion.div>
                </TabsContent>

                <TabsContent value="expired">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-4"
                    >
                        {expiredPurchases.length === 0 ? (
                            <Card className="p-12 text-center">
                                <Check className="h-12 w-12 mx-auto text-green-500" />
                                <p className="mt-4 text-muted-foreground">
                                    Tidak ada add-on yang expired
                                </p>
                            </Card>
                        ) : (
                            expiredPurchases.map((purchase) => {
                                const product = getProductById(
                                    purchase.productId,
                                );
                                return (
                                    <motion.div
                                        key={purchase.id}
                                        variants={itemVariants}
                                    >
                                        <Card className="opacity-75">
                                            <CardHeader className="flex flex-row items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                                                        {purchase.customDomain ? (
                                                            <Globe className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                                                        ) : (
                                                            <MessageCircle className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <CardTitle>
                                                            {product?.name ||
                                                                'Add-on'}
                                                        </CardTitle>
                                                        <CardDescription>
                                                            {purchase.customDomain ||
                                                                `${purchase.whatsappQuota} pesan`}
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                                <Badge variant="secondary">
                                                    Expired
                                                </Badge>
                                            </CardHeader>
                                            <CardFooter>
                                                <Button
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={() => {
                                                        const product =
                                                            getProductById(
                                                                purchase.productId,
                                                            );
                                                        if (product)
                                                            openPurchaseDialog(
                                                                product,
                                                            );
                                                    }}
                                                >
                                                    Perpanjang
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    </motion.div>
                                );
                            })
                        )}
                    </motion.div>
                </TabsContent>
            </Tabs>

            {/* Purchase Confirmation Dialog */}
            <Dialog
                open={showConfirmDialog}
                onOpenChange={setShowConfirmDialog}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Beli {selectedProduct?.name}</DialogTitle>
                        <DialogDescription>
                            Konfirmasi pembelian add-on
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {selectedProduct?.type === 'custom_domain' && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Nama Domain
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="laundryanda"
                                        value={customDomain}
                                        onChange={(e) =>
                                            setCustomDomain(e.target.value)
                                        }
                                        className="flex-1 h-10 px-3 rounded-md border border-input bg-background"
                                    />
                                    <span className="text-muted-foreground">
                                        .com
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Domain akan diverifikasi dengan TXT record
                                </p>
                            </div>
                        )}

                        <div className="bg-muted rounded-lg p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Add-on
                                </span>
                                <span className="font-medium">
                                    {selectedProduct?.name}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Durasi
                                </span>
                                <span className="font-medium">
                                    {selectedProduct?.durationDays} hari
                                </span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>Total</span>
                                <span>
                                    {formatCurrency(
                                        selectedProduct?.price || 0,
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowConfirmDialog(false)}
                            disabled={isPurchasing}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handlePurchase}
                            disabled={isPurchasing}
                        >
                            {isPurchasing ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                'Konfirmasi Pembelian'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DNS Instructions Dialog */}
            <Dialog open={showDNSDialog} onOpenChange={setShowDNSDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Setup Custom Domain
                        </DialogTitle>
                        <DialogDescription>
                            Ikuti langkah berikut untuk mengaktifkan custom
                            domain Anda
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Domain Status */}
                        <div
                            className={`flex items-center gap-3 p-4 rounded-lg ${
                                selectedPurchase?.customDomainVerified
                                    ? 'bg-green-50 dark:bg-green-900/20'
                                    : 'bg-amber-50 dark:bg-amber-900/20'
                            }`}
                        >
                            {selectedPurchase?.customDomainVerified ? (
                                <>
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span className="font-medium text-green-700 dark:text-green-400">
                                        Domain Verified - Aktif
                                    </span>
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                                    <span className="font-medium text-amber-700 dark:text-amber-400">
                                        Menunggu Verifikasi
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Domain Display */}
                        <div className="bg-muted rounded-lg p-4">
                            <p className="text-sm text-muted-foreground mb-1">
                                Domain
                            </p>
                            <p className="font-mono text-lg font-medium">
                                {selectedPurchase?.customDomain}
                            </p>
                        </div>

                        {/* DNS Instructions */}
                        {!selectedPurchase?.customDomainVerified && (
                            <div className="space-y-4">
                                <h4 className="font-medium">
                                    DNS Records yang perlu di-setup:
                                </h4>

                                <div className="space-y-3">
                                    {/* A Record */}
                                    <div className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium">
                                                A Record
                                            </span>
                                            <Badge variant="outline">
                                                Wajib
                                            </Badge>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Type:
                                                </span>
                                                <span className="font-mono">
                                                    A
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Name:
                                                </span>
                                                <span className="font-mono">
                                                    @
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">
                                                    Value:
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-muted px-2 py-1 rounded">
                                                        76.76.21.21
                                                    </code>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() =>
                                                            copyToClipboard(
                                                                '76.76.21.21',
                                                            )
                                                        }
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CNAME Record */}
                                    <div className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium">
                                                CNAME Record
                                            </span>
                                            <Badge variant="outline">
                                                Optional (www)
                                            </Badge>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Type:
                                                </span>
                                                <span className="font-mono">
                                                    CNAME
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">
                                                    Name:
                                                </span>
                                                <span className="font-mono">
                                                    www
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">
                                                    Value:
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-muted px-2 py-1 rounded">
                                                        cname.vercel-dns.com
                                                    </code>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() =>
                                                            copyToClipboard(
                                                                'cname.vercel-dns.com',
                                                            )
                                                        }
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm text-muted-foreground">
                                    Setelah setup DNS, perubahan dapat memakan
                                    waktu hingga 24 jam untuk propagate.
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setShowDNSDialog(false)}
                            >
                                Tutup
                            </Button>
                            {!selectedPurchase?.customDomainVerified && (
                                <Button
                                    onClick={handleVerify}
                                    disabled={isVerifying}
                                >
                                    {isVerifying ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Memverifikasi...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Verifikasi Sekarang
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
