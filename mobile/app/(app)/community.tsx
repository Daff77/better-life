import React, { useState, useMemo } from "react";
import { View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AppText,
  FadeInView,
  Header,
  LineIcon,
  PressableScale,
  SearchField,
  StatusPill,
  Surface,
} from "@/components/ui";

interface ArticleItem {
  id: string;
  type: "Artikel" | "Tips & Trick";
  title: string;
  readTime: string;
  source: string;
  summary: string;
  points: string[];
}

const ARTICLES_AND_TIPS: ArticleItem[] = [
  {
    id: "art-1",
    type: "Tips & Trick",
    title: "5 Trik Defisit Kalori Tanpa Rasa Lapar untuk Pemula",
    readTime: "3 mnt baca",
    source: "Kemenkes RI · Pedoman Gizi Seimbang (Permenkes No. 41/2014)",
    summary:
      "Menurunkan berat badan bukan berarti menahan lapar seharian. Kuncinya ada pada kepadatan nutrisi, protein cukup, serat, dan hidrasi.",
    points: [
      "Minum 1 gelas air putih sebelum waktu makan utama untuk membantu rasa kenyang.",
      "Utamakan sumber protein (telur, dada ayam, tempe, ikan) di setiap porsi makan.",
      "Penuhi setengah piring dengan sayuran dan buah sesuai prinsip Isi Piringku.",
      "Pilih metode masak kukus, rebus, atau tumis dengan minyak secukupnya.",
    ],
  },
  {
    id: "art-2",
    type: "Artikel",
    title: "Mengapa Hidrasi 8 Gelas Sehari Mendukung Kinerja Tubuh?",
    readTime: "4 mnt baca",
    source: "Kemenkes RI · Panduan Konsumsi Air Putih Harian (2 Liter/Hari)",
    summary:
      "Kekurangan cairan ringan sering memicu rasa lelah, kurang fokus, dan dorongan makan berlebih.",
    points: [
      "Kebutuhan cairan orang dewasa umumnya sekitar 8 gelas berukuran 230 ml atau total 2 liter per hari.",
      "Memenuhi hidrasi membantu menjaga konsentrasi dan fungsi pencernaan.",
      "Gunakan pelacak air di Beranda untuk mencatat setiap gelas yang diminum.",
    ],
  },
  {
    id: "art-3",
    type: "Tips & Trick",
    title: "Panduan Meal Prep Hemat Bahan Lokal di Bawah Rp 25.000",
    readTime: "3 mnt baca",
    source: "WHO · Healthy Diet Fact Sheet & Isi Piringku Kemenkes RI",
    summary:
      "Kombinasi bahan lokal yang mudah ditemukan di pasar atau minimarket dengan komposisi karbohidrat kompleks, protein nabati/hewani, dan sayuran.",
    points: [
      "Kombinasi tempe, telur, dan sayuran hijau memberi asupan protein dan serat yang saling melengkapi.",
      "Simpan potongan sayur bersih di wadah tertutup agar lebih cepat diolah.",
      "Manfaatkan fitur Timer Memasak di halaman Resep agar waktu masak lebih terukur.",
    ],
  },
  {
    id: "art-4",
    type: "Artikel",
    title: "Sinergi Aktivitas Jalan Kaki Harian & Pola Makan Seimbang",
    readTime: "4 mnt baca",
    source: "WHO · Guidelines on Physical Activity (150–300 menit/minggu)",
    summary:
      "Aktivitas fisik intensitas sedang yang dilakukan rutin membantu menjaga kesehatan kardiometabolik dan kualitas tidur.",
    points: [
      "Jalan kaki 15–20 menit setelah makan membantu menjaga kestabilan gula darah pasca makan.",
      "Konsistensi langkah harian lebih berkelanjutan daripada olahraga berat yang jarang dilakukan.",
    ],
  },
];

export default function CommunityArticlesScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(
    ARTICLES_AND_TIPS[0].id
  );

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ARTICLES_AND_TIPS;
    return ARTICLES_AND_TIPS.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-canvas">
      <Header
        onBack={() => router.back()}
        title="Artikel & Tips Sehat"
        subtitle="Panduan gizi dengan rujukan"
      />

      <ScrollView
        className="flex-1 pt-1"
        contentContainerStyle={{ paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FadeInView index={0} className="mb-3.5">
          <SearchField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari artikel kesehatan, sumber, atau tips diet..."
            accessibilityLabel="Cari artikel dan tips sehat"
          />
        </FadeInView>

        <View className="gap-3.5">
          {filteredArticles.length === 0 ? (
            <Surface className="items-center py-8 px-5">
              <AppText weight="semibold" className="text-base text-ink text-center">
                Artikel tidak ditemukan
              </AppText>
              <AppText weight="regular" className="text-[13px] text-muted text-center mt-1">
                Coba kata kunci lain seperti hidrasi, protein, atau Kemenkes.
              </AppText>
            </Surface>
          ) : (
            filteredArticles.map((art, idx) => {
              const expanded = expandedArticleId === art.id;
              return (
                <FadeInView key={art.id} index={idx + 1}>
                  <Surface>
                    <PressableScale
                      onPress={() => setExpandedArticleId(expanded ? null : art.id)}
                      pressedScale={0.99}
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                      accessibilityLabel={art.title}
                    >
                      <View className="flex-row items-center justify-between gap-2 mb-2 flex-wrap">
                        <StatusPill
                          label={art.type}
                          tone={art.type === "Tips & Trick" ? "warn" : "accent"}
                          dot={false}
                        />
                        <AppText weight="medium" className="text-[11.5px] text-muted">
                          {art.readTime}
                        </AppText>
                      </View>

                      <AppText weight="bold" className="text-[16px] text-ink leading-snug">
                        {art.title}
                      </AppText>
                      <AppText weight="regular" className="text-[13px] text-muted mt-1 leading-relaxed">
                        {art.summary}
                      </AppText>

                      <View className="mt-2.5 flex-row items-center gap-1.5">
                        <LineIcon name="book" size={13} color="#0b6b47" />
                        <AppText weight="semibold" className="text-[11.5px] text-primary-text flex-1">
                          Sumber: {art.source}
                        </AppText>
                      </View>

                      {expanded && (
                        <View className="mt-3 pt-3 border-t border-line gap-2">
                          {art.points.map((pt, i) => (
                            <View key={i} className="flex-row items-start gap-2.5">
                              <View className="w-5 h-5 rounded-full bg-primary-light items-center justify-center mt-0.5 flex-shrink-0">
                                <LineIcon name="check" size={11} color="#0e7a52" strokeWidth={2.5} />
                              </View>
                              <AppText weight="medium" className="text-[13px] text-ink flex-1 leading-relaxed">
                                {pt}
                              </AppText>
                            </View>
                          ))}
                        </View>
                      )}
                    </PressableScale>
                  </Surface>
                </FadeInView>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
