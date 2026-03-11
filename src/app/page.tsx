"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Zap,
  Shield,
  BarChart3,
  Users,
  Building2,
  Smartphone,
  Clock,
  Star,
  ArrowRight,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { motion, useAnimation, useInView, type Variants, type Easing } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ThemeToggle } from "@/components/common/theme-toggle";

// Easing constant for consistent typing
const easeOut: Easing = [0.16, 1, 0.3, 1];

// Animation variants
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: easeOut }
  }
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.6, ease: easeOut }
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5, ease: easeOut }
  }
};

const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -60 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.6, ease: easeOut }
  }
};

const slideInRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.6, ease: easeOut }
  }
};

// Animated Section Component
function AnimatedSection({ 
  children, 
  className = "",
  variants = fadeInUp 
}: { 
  children: React.ReactNode; 
  className?: string;
  variants?: typeof fadeInUp;
}) {
  const ref = useState<HTMLDivElement | null>(null);
  const controls = useAnimation();
  const [elementRef, setElementRef] = useState<HTMLDivElement | null>(null);
  const isInView = useInView(elementRef ? { current: elementRef } : { current: null }, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={setElementRef}
      initial="hidden"
      animate={controls}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const features = [
  {
    icon: Zap,
    title: "POS Cepat & Intuitif",
    description: "Proses transaksi dalam hitungan detik dengan antarmuka yang mudah digunakan.",
  },
  {
    icon: Users,
    title: "Multi-Cabang & Multi-Role",
    description: "Kelola banyak cabang dengan peran berbeda untuk setiap staff di setiap lokasi.",
  },
  {
    icon: BarChart3,
    title: "Laporan Real-time",
    description: "Pantau performa bisnis dengan dashboard analitik yang komprehensif.",
  },
  {
    icon: Shield,
    title: "Keamanan Data",
    description: "Data bisnis Anda aman dengan enkripsi end-to-end dan backup otomatis.",
  },
  {
    icon: Smartphone,
    title: "Akses dari Mana Saja",
    description: "Kelola bisnis dari smartphone, tablet, atau komputer kapan saja.",
  },
  {
    icon: Clock,
    title: "Tracking Status Pesanan",
    description: "Pelanggan dapat melacak status cucian mereka secara real-time.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "GRATIS",
    period: "",
    description: "Untuk usaha laundry yang baru memulai",
    features: [
      "1 Cabang",
      "100 Transaksi/bulan",
      "POS & Kasir",
      "Pembayaran QRIS & VA",
      "Notifikasi WhatsApp",
      "Email Support",
    ],
    cta: "Mulai Gratis",
    popular: false,
  },
  {
    name: "Pro",
    price: "Rp 149.000",
    period: "/bulan",
    description: "Untuk usaha laundry yang berkembang",
    features: [
      "Hingga 5 Cabang",
      "Transaksi Unlimited",
      "Semua Fitur Starter",
      "Laporan & Analytics",
      "Kupon & Paket Member",
      "Priority WhatsApp Support",
    ],
    cta: "Mulai 14 Hari Gratis",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Untuk jaringan laundry besar",
    features: [
      "Unlimited Cabang",
      "Unlimited Staff",
      "Semua Fitur Pro",
      "Custom Domain",
      "Dedicated Payment Gateway",
      "Dedicated Account Manager",
      "SLA 99.9%",
    ],
    cta: "Hubungi Sales",
    popular: false,
  },
];

const testimonials = [
  {
    name: "Budi Santoso",
    role: "Owner, Fresh Laundry Jakarta",
    content: "VibeClean membantu kami mengelola 5 cabang dengan mudah. Omzet naik 40% dalam 3 bulan!",
    rating: 5,
    image: "B",
  },
  {
    name: "Siti Rahayu",
    role: "Manager, Clean Express Bandung",
    content: "Fitur multi-role sangat membantu. Sekarang staff di setiap cabang punya akses sesuai tugas mereka.",
    rating: 5,
    image: "S",
  },
  {
    name: "Ahmad Wijaya",
    role: "Owner, Laundry Kilat Surabaya",
    content: "Dashboard laporan real-time memudahkan saya memantau semua cabang dari mana saja.",
    rating: 5,
    image: "A",
  },
  {
    name: "Dewi Kusuma",
    role: "Owner, Sparkling Laundry Medan",
    content: "Sistem POS yang cepat dan mudah digunakan. Staff baru bisa langsung paham dalam 1 hari!",
    rating: 5,
    image: "D",
  },
  {
    name: "Rizky Pratama",
    role: "Manager, Quick Wash Semarang",
    content: "Integrasi WhatsApp sangat membantu untuk notifikasi ke pelanggan. Customer service jadi lebih baik.",
    rating: 5,
    image: "R",
  },
  {
    name: "Linda Wijaya",
    role: "Owner, Premium Laundry Bali",
    content: "Tracking status pesanan membuat pelanggan lebih puas. Komplain berkurang drastis!",
    rating: 5,
    image: "L",
  },
];

// Testimonial Carousel Component
function TestimonialCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
    [Autoplay({ delay: 4000, stopOnInteraction: false })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  return (
    <div className="relative px-6 lg:px-10">
      {/* Carousel Container */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="flex-[0_0_100%] min-w-0 sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] px-3 lg:py-6"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="h-full"
              >
                <Card className="h-full min-h-[280px] border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-card flex flex-col 
                ">
                  <CardContent className="pt-6 flex flex-col h-full">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 flex-grow text-base leading-relaxed line-clamp-4">
                      &ldquo;{testimonial.content}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 mt-auto pt-4 border-t border-border">
                      <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-md flex-shrink-0">
                        <span className="text-primary-foreground font-semibold text-lg">
                          {testimonial.image}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={scrollPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-card shadow-lg flex items-center justify-center hover:bg-muted transition-colors z-10 border border-border"
      >
        <ChevronLeft className="h-6 w-6 text-muted-foreground" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-12 h-12 rounded-full bg-card shadow-lg flex items-center justify-center hover:bg-muted transition-colors z-10 border border-border"
      >
        <ChevronRight className="h-6 w-6 text-muted-foreground" />
      </button>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-8">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              index === selectedIndex
                ? "bg-primary w-8"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();

  const handlePlanClick = (planName: string) => {
    if (sessionLoading) return; // avoid flicker: ignore clicks while session is resolving
    // If user logged in -> go to billing page
    if (session) {
      router.push('/dashboard/billing');
      return;
    }
    // Not logged in -> go to login page, include next param to redirect after login
    router.push(`/login?next=/dashboard/billing`);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        {sessionLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur">
            <div className="inline-flex items-center gap-3 rounded-lg bg-card p-4 shadow-lg border border-border">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-foreground">Memeriksa sesi...</span>
            </div>
          </div>
        )}
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className={`sticky top-0 z-50 border-b border-border transition-all duration-300 ${
          scrolled 
            ? "bg-background/95 backdrop-blur-md shadow-sm" 
            : "bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-md">
                V
              </div>
              <span className="text-xl font-bold text-foreground">VibeClean</span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {["Fitur", "Harga", "Testimoni"].map((item, index) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors relative"
                  whileHover={{ y: -2 }}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {item}
                </motion.a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-4">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
              >
                <ThemeToggle />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Link href="/login">
                  <Button variant="ghost" className="hover:bg-primary/10 hover:text-primary">
                    Masuk
                  </Button>
                </Link>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link href="/register">
                  <Button className="bg-primary hover:bg-primary/90 shadow-md">
                    Daftar Gratis
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* Mobile menu button */}
            <motion.button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              whileTap={{ scale: 0.95 }}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.button>
          </div>

          {/* Mobile Navigation */}
          <motion.div
            initial={false}
            animate={mobileMenuOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden"
          >
            <div className="py-4 border-t border-border">
              <div className="flex flex-col gap-4">
                <a href="#fitur" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Fitur
                </a>
                <a href="#harga" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Harga
                </a>
                <a href="#testimoni" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Testimoni
                </a>
                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-muted-foreground">Tema</span>
                    <ThemeToggle />
                  </div>
                  <Link href="/login">
                    <Button variant="ghost" className="w-full">Masuk</Button>
                  </Link>
                  <Link href="/register">
                    <Button className="w-full">Daftar Gratis</Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-20 sm:py-32">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full opacity-50 blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, 30, 0],
              y: [0, -20, 0]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-40 -left-40 w-96 h-96 bg-accent/20 rounded-full opacity-40 blur-3xl"
            animate={{ 
              scale: [1.2, 1, 1.2],
              x: [0, -20, 0],
              y: [0, 30, 0]
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary border-0">
                Platform #1 untuk Bisnis Laundry di Indonesia
              </Badge>
            </motion.div>
            
            <motion.h1 
              className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Kelola Bisnis Laundry
              <motion.span 
                className="text-primary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                {" "}Lebih Mudah
              </motion.span>
            </motion.h1>
            
            <motion.p 
              className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              VibeClean adalah platform all-in-one untuk mengelola bisnis laundry Anda.
              Dari POS, manajemen cabang, hingga laporan keuangan dalam satu dashboard.
            </motion.p>
            
            <motion.div 
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Link href="/register">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button size="lg" className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 text-base px-8">
                    Mulai Gratis 14 Hari
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.span>
                  </Button>
                </motion.div>
              </Link>
              <Link href="/login">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button variant="outline" size="lg" className="w-full sm:w-auto text-base px-8 border-2">
                    Lihat Demo
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
            
            <motion.p 
              className="mt-4 text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Tidak perlu kartu kredit. Batalkan kapan saja.
            </motion.p>
          </div>

          {/* Hero Image/Dashboard Preview */}
          <motion.div 
            className="mt-16 sm:mt-20"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="relative mx-auto max-w-5xl">
              <motion.div 
                className="rounded-xl bg-gradient-to-b from-foreground/5 to-foreground/10 p-2 ring-1 ring-inset ring-border lg:rounded-2xl lg:p-4"
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="rounded-lg bg-card shadow-2xl ring-1 ring-border overflow-hidden">
                  <div className="p-4 sm:p-8">
                    {/* Mock Dashboard */}
                    <motion.div 
                      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                      variants={staggerContainer}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                    >
                      <motion.div 
                        className="rounded-xl bg-primary/5 p-5 border border-primary/10"
                        variants={scaleIn}
                        whileHover={{ scale: 1.02, y: -2 }}
                      >
                        <p className="text-sm text-muted-foreground font-medium">Total Transaksi Hari Ini</p>
                        <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">Rp 2.450.000</p>
                        <p className="text-sm text-green-600 font-medium mt-1 flex items-center gap-1">
                          <span className="inline-block w-0 h-0 border-l-4 border-r-4 border-b-[6px] border-l-transparent border-r-transparent border-b-green-500" />
                          +12% dari kemarin
                        </p>
                      </motion.div>
                      <motion.div 
                        className="rounded-xl bg-green-500/5 p-5 border border-green-500/10"
                        variants={scaleIn}
                        whileHover={{ scale: 1.02, y: -2 }}
                      >
                        <p className="text-sm text-muted-foreground font-medium">Pesanan Selesai</p>
                        <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">47</p>
                        <p className="text-sm text-green-600 font-medium mt-1">5 menunggu pickup</p>
                      </motion.div>
                      <motion.div 
                        className="rounded-xl bg-accent/50 p-5 border border-accent"
                        variants={scaleIn}
                        whileHover={{ scale: 1.02, y: -2 }}
                      >
                        <p className="text-sm text-muted-foreground font-medium">Pelanggan Baru</p>
                        <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">8</p>
                        <p className="text-sm text-accent-foreground font-medium mt-1">Bulan ini: 124</p>
                      </motion.div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
              
              {/* Floating Elements */}
              <motion.div
                className="absolute -bottom-4 -left-4 bg-card rounded-lg shadow-xl p-3 border border-border hidden sm:flex items-center gap-2"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-foreground">Pesanan #1234 selesai</span>
              </motion.div>
              
              <motion.div
                className="absolute -top-4 -right-4 bg-card rounded-lg shadow-xl p-3 border border-border hidden sm:flex items-center gap-2"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">+3 pelanggan baru</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fitur" className="py-20 sm:py-32 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <Badge variant="outline" className="mb-4">Fitur Lengkap</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Semua yang Anda Butuhkan
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Fitur lengkap untuk mengelola bisnis laundry modern dengan lebih efisien
            </p>
          </motion.div>

          <motion.div 
            className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 group bg-card">
                  <CardHeader>
                    <motion.div 
                      className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary transition-all duration-300"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <feature.icon className="h-7 w-7 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                    </motion.div>
                    <CardTitle className="mt-4 text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base text-muted-foreground">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Multi-Branch Feature Highlight */}
      <section className="bg-gradient-to-b from-muted/50 to-background py-20 sm:py-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={slideInLeft}
            >
              <Badge variant="outline" className="mb-4 bg-primary/10 text-primary border-primary/20">
                Fitur Unggulan
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Multi-Cabang dengan Role Berbeda
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                Satu staff bisa punya role berbeda di setiap cabang. Misalnya, Ahmad bisa jadi
                Manager di Cabang A tapi hanya Kasir di Cabang B.
              </p>
              <motion.ul 
                className="mt-8 space-y-4"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {[
                  "Owner: Akses penuh ke semua fitur dan cabang",
                  "Manager: Kelola operasional dan lihat laporan cabang",
                  "Kasir: Proses transaksi dan kelola pesanan",
                  "Kurir: Update status pengiriman dan pickup",
                ].map((item, index) => (
                  <motion.li 
                    key={item} 
                    className="flex items-start gap-3"
                    variants={fadeInUp}
                  >
                    <div className="mt-1 flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      </div>
                    </div>
                    <span className="text-muted-foreground">{item}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
            
            <motion.div 
              className="relative"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={slideInRight}
            >
              <div className="rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border">
                <motion.div 
                  className="space-y-4"
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  {[
                    { name: "Fresh Laundry - Cabang Sudirman", role: "Manager", active: true },
                    { name: "Fresh Laundry - Cabang Kemang", role: "Kasir", active: false },
                    { name: "Fresh Laundry - Cabang PIK", role: "Kurir", active: false },
                  ].map((branch, index) => (
                    <motion.div
                      key={branch.name}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                        branch.active 
                          ? "bg-primary/5 ring-2 ring-primary/20" 
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                      variants={scaleIn}
                      whileHover={{ scale: 1.02, x: 4 }}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        branch.active ? "bg-primary" : "bg-muted-foreground/20"
                      }`}>
                        <Building2 className={`h-6 w-6 ${branch.active ? "text-primary-foreground" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-grow">
                        <p className="font-semibold text-foreground">{branch.name}</p>
                        <Badge 
                          variant={branch.active ? "default" : "secondary"} 
                          className={`mt-1 ${branch.active ? "bg-primary" : ""}`}
                        >
                          {branch.role}
                        </Badge>
                      </div>
                      {branch.active && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-3 h-3 rounded-full bg-green-500"
                        />
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -z-10 -top-8 -right-8 w-64 h-64 bg-primary/10 rounded-full opacity-50 blur-3xl" />
              <div className="absolute -z-10 -bottom-8 -left-8 w-48 h-48 bg-accent/20 rounded-full opacity-50 blur-3xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="harga" className="py-20 sm:py-32 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Badge variant="outline" className="mb-4">Harga Transparan</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Pilih Paket yang Sesuai
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Mulai gratis 14 hari, tanpa kartu kredit
            </p>
          </motion.div>

          <motion.div 
            className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3 items-stretch"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                variants={fadeInUp}
              >
                <Card className={`relative flex flex-col h-full transition-all duration-300 ${
                    plan.popular ? "border-primary shadow-xl ring-2 ring-primary scale-105 lg:scale-110" : "border-border hover:border-primary/50"
                  }`}>
                  {plan.popular && (
                    <div className="absolute top-3 right-3 z-20">
                      <Badge className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white shadow-lg bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 animate-pulse">
                        <Star className="h-4 w-4 mr-2" />
                        Paling Populer
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2 pt-8">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-base text-muted-foreground">{plan.description}</CardDescription>
                    <div className="mt-6">
                      <span className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">{plan.price}</span>
                      <span className="text-muted-foreground text-lg">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 flex flex-col h-full">
                    <ul className="space-y-4 mb-8 flex-grow">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <span className="p-1 rounded-md bg-gradient-to-r from-primary/30 to-primary/10 text-white inline-flex">
                            <CheckCircle2 className="h-4 w-4" />
                          </span>
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="button"
                          onClick={() => handlePlanClick(plan.name)}
                          className={`w-full h-12 text-base ${plan.popular ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-95 shadow-lg text-white" : ""}`}
                          variant={plan.popular ? "default" : "outline"}
                        >
                          {plan.cta}
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section with Carousel */}
      <section id="testimoni" className="bg-gradient-to-b from-muted/50 to-background py-20 sm:py-32 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <Badge variant="outline" className="mb-4">Testimoni</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Dipercaya oleh 500+ Bisnis Laundry
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Lihat apa kata mereka tentang VibeClean
            </p>
          </motion.div>

          <TestimonialCarousel />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="relative overflow-hidden rounded-3xl bg-primary px-6 py-20 sm:px-12 sm:py-28"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={scaleIn}
          >
            {/* Animated background patterns */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute -top-20 -right-20 w-96 h-96 bg-primary-foreground/10 rounded-full blur-3xl"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 6, repeat: Infinity }}
              />
              <motion.div
                className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary-foreground/10 rounded-full blur-3xl"
                animate={{ 
                  scale: [1.2, 1, 1.2],
                  opacity: [0.1, 0.15, 0.1]
                }}
                transition={{ duration: 8, repeat: Infinity }}
              />
            </div>
            
            <div className="relative text-center">
              <motion.h2 
                className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl lg:text-5xl"
                variants={fadeInUp}
              >
                Siap Mengembangkan Bisnis Laundry Anda?
              </motion.h2>
              <motion.p 
                className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80"
                variants={fadeInUp}
              >
                Bergabung dengan 500+ bisnis laundry yang sudah menggunakan VibeClean.
                Mulai gratis 14 hari sekarang!
              </motion.p>
              <motion.div 
                className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
                variants={fadeInUp}
              >
                <Link href="/register">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button size="lg" variant="secondary" className="w-full sm:w-auto gap-2 text-base px-8 shadow-lg">
                      Daftar Gratis Sekarang
                      <motion.span
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </motion.span>
                    </Button>
                  </motion.div>
                </Link>
                <Link href="/login">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10 hover:border-primary-foreground/50 text-base px-8"
                    >
                      Hubungi Sales
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <motion.div 
                className="flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-md">
                  V
                </div>
                <span className="text-xl font-bold text-foreground">VibeClean</span>
              </motion.div>
              <p className="mt-4 text-sm text-muted-foreground">
                Platform manajemen bisnis laundry #1 di Indonesia.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Produk</h3>
              <ul className="mt-4 space-y-2">
                <li><a href="#fitur" className="text-sm text-muted-foreground hover:text-primary transition-colors">Fitur</a></li>
                <li><a href="#harga" className="text-sm text-muted-foreground hover:text-primary transition-colors">Harga</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Integrasi</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Perusahaan</h3>
              <ul className="mt-4 space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Tentang Kami</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Karir</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Legal</h3>
              <ul className="mt-4 space-y-2">
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Kebijakan Privasi</a></li>
                <li><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Syarat & Ketentuan</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-border pt-8">
            <p className="text-center text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} VibeClean. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
