"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Footprints, Wallet, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type DayStat = {
  date: string;
  walked: boolean;
  duration: number;
  earnings: number;
  type: "STANDARD" | "SUPER" | "OFF" | "PENALTY" | "NONE";
};

type WeeklyStats = {
  totalEarnings: number;
  offDaysUsed: number;
  superWalkUsed: boolean;
  days: DayStat[];
};

type MonthlyStats = {
  totalEarnings: number;
  weeks: WeeklyStats[];
};

type User = {
  id: string;
  name: string;
  balance: number;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // State for popover interaction
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const userRes = await fetch("/api/user");
      const userData = await userRes.json();
      setUser(userData);

      if (userData?.id) {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const statsRes = await fetch(`/api/stats?userId=${userData.id}&year=${year}&month=${month}`);
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      toast.error("Veri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const handleLogClick = async (dateStr: string, duration: number, type: "STANDARD" | "SUPER" | "OFF") => {
    if (!user) return;

    // Check OFF day limit
    if (type === "OFF" && stats) {
        // Find the week this date belongs to
        const clickDate = new Date(dateStr);
        // We need to match it to a week in stats
        // A simple way is to check the days in each week
        let currentOffs = 0;
        let alreadyOff = false;

        for (const week of stats.weeks) {
            const dayFound = week.days.find(d => d.date === dateStr);
            if (dayFound) {
                // Count OFFs in this week logic is tricky because "offDaysUsed" in stats 
                // might include this day if it was already OFF.
                // But week.offDaysUsed is calculated from the backend.
                // Let's count manually from the days array to be sure what's CURRENTLY visible/loaded.
                
                // Actually, week.offDaysUsed is what the backend calculated.
                // If I am changing THIS day to OFF:
                // 1. If it was NOT OFF before, I need to check if offDaysUsed < 2.
                // 2. If it WAS OFF before, then I'm just re-confirming, so it's fine.
                
                alreadyOff = dayFound.type === "OFF";
                currentOffs = week.offDaysUsed;
                break;
            }
        }

        if (!alreadyOff && currentOffs >= 2) {
             toast.error("Haftalık izin (2 gün) hakkınız doldu!");
             return;
        }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/walk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          date: dateStr,
          duration,
          type
        }),
      });

      if (!res.ok) throw new Error("Failed");
      
      toast.success("Güncellendi!");
      await fetchData();
    } catch (error) {
      toast.error("Hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (dateStr: string) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        // Using POST with specific action or DELETE method if we implement it.
        // Let's implement a DELETE endpoint or use Query param. 
        // Plan said /api/walk/delete or similar. Let's send a DELETE request to /api/walk
        const res = await fetch(`/api/walk?userId=${user.id}&date=${dateStr}`, {
            method: "DELETE",
        });

        if (!res.ok) throw new Error("Failed");
        toast.success("Silindi!");
        await fetchData();
    } catch (error) {
        toast.error("Silinemedi");
    } finally {
        setIsSubmitting(false);
    }
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentMonth(newDate);
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-green-600" /></div>;

  const totalBalance = (user?.balance || 0) + (stats?.totalEarnings || 0);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 font-sans">
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white/20">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-stone-800 tracking-tight">
            <div className="bg-green-100 p-2 rounded-xl">
              <Footprints className="text-green-600 w-8 h-8" />
            </div>
            Yürüyüş Takip
          </h1>
          <p className="text-stone-500 ml-14">Finansal özgürlüğe adım adım</p>
        </div>
        <div className="flex items-center gap-3 bg-gradient-to-br from-green-500 to-emerald-600 px-6 py-3 rounded-2xl text-white font-bold shadow-lg shadow-green-200 transform transition hover:scale-105">
          <Wallet size={24} />
          <span className="text-xl">{totalBalance} TL</span>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-xl bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-stone-50/50">
            <CardTitle className="flex items-center gap-2 text-stone-700 text-xl capitalize">
              <CalendarIcon className="w-5 h-5 text-stone-400" /> 
              {format(currentMonth, "MMMM yyyy", { locale: tr })}
            </CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)} className="hover:bg-stone-200 rounded-full">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => changeMonth(1)} className="hover:bg-stone-200 rounded-full">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="grid grid-cols-7 gap-1 sm:gap-3 text-center mb-4">
              {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => (
                <div key={day} className="text-[9px] sm:text-xs font-bold text-stone-400 uppercase tracking-wider">{day}</div>
              ))}
            </div>
            
            <div className="space-y-4">
              {stats?.weeks.map((week, wIndex) => (
                <div key={wIndex} className="grid grid-cols-7 gap-1 sm:gap-3">
                  {week.days.map((day, dIndex) => {
                    let bg = "bg-stone-50 hover:bg-stone-100";
                    let text = "text-stone-400";
                    let border = "border-transparent";
                    let shadow = "";
                    let icon = null;
                    
                    if (day.type === "STANDARD") { 
                      bg = "bg-gradient-to-br from-green-400 to-green-500"; 
                      text = "text-white"; 
                      shadow = "shadow-lg shadow-green-200";
                      icon = "✅";
                    }
                    else if (day.type === "SUPER") { 
                      bg = "bg-gradient-to-br from-purple-500 to-indigo-600"; 
                      text = "text-white"; 
                      shadow = "shadow-lg shadow-purple-200";
                      icon = "🚀";
                    }
                    else if (day.type === "OFF") { 
                      bg = "bg-amber-100 border-amber-200"; 
                      text = "text-amber-600"; 
                      border = "border-amber-200";
                      shadow = "shadow-lg shadow-amber-200"; 
                      icon = "☕";
                    }
                    else if (day.type === "PENALTY") { 
                      bg = "bg-red-50"; 
                      text = "text-red-500"; 
                      border = "border-red-200";
                      icon = "⚠️";
                    }

                    // Check if day belongs to current month visually
                    const isCurrentMonth = new Date(day.date).getMonth() === currentMonth.getMonth();
                    const opacity = isCurrentMonth ? "opacity-100" : "opacity-30 grayscale";
                    
                    const isFuture = new Date(day.date) > new Date();

                    return (
                        <Popover key={`${wIndex}-${dIndex}`}>
                            <PopoverTrigger asChild>
                                <button
                                    disabled={isFuture} 
                                    className={cn(
                                    "aspect-square rounded-xl sm:rounded-2xl flex flex-col items-center justify-center relative transition-all duration-300 group border-2 w-full",
                                    bg, text, border, shadow, opacity,
                                    isFuture ? "cursor-not-allowed" : "cursor-pointer hover:scale-105 active:scale-95"
                                    )}
                                >
                                    <span className="text-[8px] sm:text-[10px] absolute top-0.5 left-0.5 sm:top-1 sm:left-2 font-medium opacity-60">
                                    {new Date(day.date).getDate()}
                                    </span>
                                    
                                    {icon && <span className="text-sm sm:text-lg mb-0.5 sm:mb-1">{icon}</span>}
                                    
                                    <span className="text-[9px] sm:text-xs font-bold leading-none">
                                    {day.type === "OFF" ? "PAS" : (day.earnings !== 0 ? (day.earnings > 0 ? `+${day.earnings}` : day.earnings) : "")}
                                    </span>
                                    
                                    {/* Render distinct badge or invisible spacer to maintain vertical height consistency */}
                                    {day.duration > 0 ? (
                                    <span className="text-[7px] sm:text-[9px] bg-black/10 px-1 py-0.5 sm:px-1.5 rounded-full mt-0.5 sm:mt-1 leading-none">
                                        {day.duration}dk
                                    </span>
                                    ) : (
                                        // Invisible spacer for alignment if it's OFF or PENALTY (and has text)
                                        (day.type === "OFF" || day.type === "PENALTY") && (
                                            <span className="text-[7px] sm:text-[9px] px-1 py-0.5 mt-0.5 sm:mt-1 leading-none opacity-0 select-none">
                                                --
                                            </span>
                                        )
                                    )}
                                </button>
                            </PopoverTrigger>
                            {!isFuture && (
                                <PopoverContent className="w-60 p-4 rounded-xl shadow-xl border-stone-100">
                                    <div className="space-y-3">
                                        <div className="text-center font-bold text-stone-600 border-b pb-2 mb-2">
                                            {format(new Date(day.date), "d MMMM yyyy", { locale: tr })}
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            <Button 
                                                onClick={() => handleLogClick(day.date, 45, "STANDARD")}
                                                variant="outline" 
                                                className="justify-start gap-2 h-auto py-3 border-stone-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                                            >
                                                <span>✅</span> 45 Dakika (Standart)
                                            </Button>
                                            <Button 
                                                onClick={() => handleLogClick(day.date, 60, "SUPER")}
                                                variant="outline" 
                                                className="justify-start gap-2 h-auto py-3 border-stone-200 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
                                            >
                                                <span>🚀</span> 60 Dakika (Süper)
                                            </Button>
                                            <Button 
                                                onClick={() => handleLogClick(day.date, 0, "OFF")}
                                                variant="outline" 
                                                className="justify-start gap-2 h-auto py-3 border-stone-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                                            >
                                                <span>☕</span> Off Gün (Pas)
                                            </Button>
                                        </div>
                                        {(day.walked || day.type === "OFF") && (
                                            <div className="pt-2 border-t mt-2">
                                                <Button 
                                                    onClick={() => handleDelete(day.date)}
                                                    variant="ghost" 
                                                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                                                >
                                                    Temizle / Sil
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </PopoverContent>
                            )}
                        </Popover>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="border-none shadow-lg bg-stone-900 text-stone-200 rounded-3xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <CardHeader>
              <CardTitle className="text-white">Kurallar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center text-white shadow-lg shadow-green-900/50">✅</div>
                <div>
                  <p className="font-bold text-white">Standart (+100 TL)</p>
                  <p className="text-xs opacity-60">45+ dakika yürüyüş</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/50">🚀</div>
                <div>
                  <p className="font-bold text-white">Süper (+150 TL)</p>
                  <p className="text-xs opacity-60">60+ dakika (Haftada 1 kez)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">☕</div>
                <div>
                  <p className="font-bold text-white">Off Gün</p>
                  <p className="text-xs opacity-60">Haftada 2 gün izin</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500 border border-red-500/30">⚠️</div>
                <div>
                  <p className="font-bold text-white">Ceza (-200 TL)</p>
                  <p className="text-xs opacity-60">İzinler bittikten sonra yürünmeyen gün</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
