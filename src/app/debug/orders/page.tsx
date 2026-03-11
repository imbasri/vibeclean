"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Search, Package, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DebugOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  status: string;
  paymentStatus: string;
  total: number;
  createdAt: string;
}

export default function DebugOrdersPage() {
  const [orders, setOrders] = useState<DebugOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [searchByPhone, setSearchByPhone] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const url = searchByPhone && phone 
        ? `/api/debug/orders?phone=${encodeURIComponent(phone)}`
        : "/api/debug/orders";
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders);
      } else {
        alert(data.error || "Gagal mengambil data");
      }
    } catch (error) {
      alert("Error: " + String(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    washing: "bg-cyan-100 text-cyan-800",
    drying: "bg-indigo-100 text-indigo-800",
    ironing: "bg-purple-100 text-purple-800",
    ready: "bg-green-100 text-green-800",
    delivered: "bg-teal-100 text-teal-800",
    completed: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Debug: Recent Orders
          </h1>
          <p className="text-gray-600">
            Halaman ini untuk debugging. Lihat nomor order yang tersimpan di database.
          </p>
        </motion.div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Cari Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={!searchByPhone ? "default" : "outline"}
                onClick={() => {
                  setSearchByPhone(false);
                  fetchOrders();
                }}
              >
                Semua Order
              </Button>
              <Button
                variant={searchByPhone ? "default" : "outline"}
                onClick={() => setSearchByPhone(true)}
              >
                Cari via HP
              </Button>
            </div>

            {searchByPhone && (
              <div className="flex gap-2">
                <Input
                  placeholder="Masukkan nomor HP..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
                />
                <Button onClick={fetchOrders} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cari"}
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              onClick={fetchOrders}
              disabled={isLoading}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {orders.length} Order Ditemukan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="mt-2 text-gray-500">Memuat...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-gray-300" />
                <p className="mt-2 text-gray-500">Tidak ada order</p>
                <p className="text-sm text-gray-400">
                  Buat order di POS untuk melihatnya di sini
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 border rounded-lg bg-white hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-lg">
                        {order.orderNumber}
                      </span>
                      <Badge className={statusColors[order.status] || "bg-gray-100"}>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Pelanggan:</span>{" "}
                        <span className="font-medium">{order.customerName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">HP:</span>{" "}
                        <span className="font-medium">{order.customerPhone}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total:</span>{" "}
                        <span className="font-medium">{formatCurrency(order.total)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Dibuat:</span>{" "}
                        <span className="font-medium">
                          {new Date(order.createdAt).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <a
                        href={`/track?order=${order.orderNumber}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        → Test Tracking: /track?order={order.orderNumber}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Dev Mode - Only visible in development</p>
        </div>
      </div>
    </div>
  );
}
