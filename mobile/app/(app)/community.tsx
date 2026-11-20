import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "@/components/layout/ScreenWrapper";
import {
  AnimatedHeart,
  AppText,
  Avatar,
  FadeInView,
  Header,
  LineIcon,
  PillButton,
  PressableScale,
  RingButton,
  RowIcon,
  SearchField,
  Segmented,
  StatusPill,
  Surface,
  CardHead,
  ColorBlock,
} from "@/components/ui";
import { useAuthStore } from "@/stores/useAuthStore";

type CommunityTab = "feed" | "consult" | "articles";

interface CommentItem {
  id: string;
  author: string;
  text: string;
  time: string;
}

interface CommunityPost {
  id: string;
  author: string;
  badge: string;
  time: string;
  content: string;
  tag: string;
  likes: number;
  likedByMe?: boolean;
  comments: CommentItem[];
}

interface NutritionistItem {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  status: "Tersedia" | "Jadwal Penuh";
  bio: string;
  initialMessage: string;
}

interface ArticleItem {
  id: string;
  type: "Artikel" | "Tips & Trick";
  title: string;
  readTime: string;
  summary: string;
  points: string[];
}

const INITIAL_POSTS: CommunityPost[] = [
  {
    id: "post-1",
    author: "Anisa Rahma",
    badge: "Turun 3.5 kg",
    time: "2 jam lalu",
    tag: "Progres Diet",
    content:
      "Minggu ke-4 pakai Better Life di kost! Ternyata masak dada ayam + tumis brokoli pakai timer memasak cuma butuh 15 menit dan hemat banget dibanding beli luar.",
    likes: 24,
    likedByMe: false,
    comments: [
      {
        id: "c-1",
        author: "Faiz Harby",
        text: "Keren banget kak! Aku juga lagi rutin catat air minum 8 gelas sehari.",
        time: "1 jam lalu",
      },
    ],
  },
  {
    id: "post-2",
    author: "Faiz Harby",
    badge: "Gizi Seimbang",
    time: "5 jam lalu",
    tag: "Menu Anak Kost",
    content:
      "Rekomendasi sarapan murah meriah: Oatmeal pisang + 1 telur rebus cuma sekitar 340 kcal tapi kenyang sampai jam makan siang.",
    likes: 18,
    likedByMe: false,
    comments: [
      {
        id: "c-2",
        author: "Bella Salsabila",
        text: "Setuju! Aku tambahin sedikit chia seeds biar seratnya makin cukup.",
        time: "3 jam lalu",
      },
    ],
  },
  {
    id: "post-3",
    author: "Jasmine Putri",
    badge: "Konsisten 14 Hari",
    time: "Kemarin",
    tag: "Motivasi",
    content:
      "Sejak atur jam makan malam sebelum jam 8 malam dan jalan kaki 6.000 langkah, tidur jadi jauh lebih nyenyak dan bangun pagi nggak lemas lagi.",
    likes: 31,
    likedByMe: false,
    comments: [],
  },
];

const NUTRITIONISTS: NutritionistItem[] = [
  {
    id: "nutri-1",
    name: "dr. Nadia Kusuma, Sp.GK",
    specialty: "Spesialis Gizi Klinik & Manajemen Berat Badan",
    experience: "8 tahun pengalaman",
    status: "Tersedia",
    bio: "Fokus pada defisit kalori aman tanpa rasa lapar ekstrem serta perencanaan gizi seimbang untuk usia produktif.",
    initialMessage:
      "Halo! Saya dr. Nadia. Ceritakan target berat badan atau kendala pola makan harian Anda, saya bantu berikan saran nutrisi yang tepat.",
  },
  {
    id: "nutri-2",
    name: "Rizky Pratama, S.Gz, RD",
    specialty: "Dietisien Terdaftar · Nutrisi Olahraga & Mahasiswa",
    experience: "5 tahun pengalaman",
    status: "Tersedia",
    bio: "Membantu menyusun menu tinggi protein dengan bahan lokal terjangkau untuk anak kost dan pekerja aktif.",
    initialMessage:
      "Halo! Saya Rizky, ahli gizi Better Life. Ada yang ingin ditanyakan soal porsi protein, meal prep hemat, atau jadwal makan?",
  },
];

const ARTICLES_AND_TIPS: ArticleItem[] = [
  {
    id: "art-1",
    type: "Tips & Trick",
    title: "5 Trik Defisit Kalori Tanpa Rasa Lapar untuk Pemula",
    readTime: "3 mnt baca",
    summary:
      "Menurunkan berat badan bukan berarti menahan lapar seharian. Kuncinya ada pada kepadatan nutrisi dan hidrasi.",
    points: [
      "Minum 1 gelas air putih 15–20 menit sebelum waktu makan utama.",
      "Utamakan sumber protein (telur, dada ayam, tempe, ikan) di setiap porsi makan.",
      "Penuhi setengah piring dengan sayuran tinggi serat agar kenyang lebih lama.",
      "Gunakan metode masak kukus, rebus, atau tumis minim minyak.",
    ],
  },
  {
    id: "art-2",
    type: "Artikel",
    title: "Mengapa Hidrasi 8 Gelas Sehari Mempercepat Metabolisme?",
    readTime: "4 mnt baca",
    summary:
      "Kurang minum air sering disalahartikan oleh tubuh sebagai rasa lapar dan membuat tubuh cepat lemas.",
    points: [
      "Air membantu proses lipolisis (pemecahan lemak menjadi energi).",
      "Meningkatkan fokus dan mencegah keinginan ngemil manis di sore hari.",
      "Gunakan pelacak air di Beranda untuk mencatat setiap gelas yang diminum.",
    ],
  },
  {
    id: "art-3",
    type: "Tips & Trick",
    title: "Panduan Meal Prep Hemat Anak Kost di Bawah Rp 25.000",
    readTime: "3 mnt baca",
    summary:
      "Kombinasi bahan lokal yang mudah ditemukan di pasar atau minimarket dengan kandungan gizi lengkap.",
    points: [
      "Kombinasi Tempe + Telur + Sayur Bayam memiliki profil asam amino lengkap.",
      "Simpan potongan sayur bersih di wadah tertutup agar siap dimasak dalam 10 menit.",
      "Manfaatkan fitur Timer Memasak di halaman Resep agar kematangan pas.",
    ],
  },
  {
    id: "art-4",
    type: "Artikel",
    title: "Sinergi 6.000 Langkah Harian & Pola Makan Seimbang",
    readTime: "4 mnt baca",
    summary:
      "Aktivitas fisik ringan yang dilakukan konsisten setiap hari menjaga sensitivitas insulin dan kualitas tidur.",
    points: [
      "Jalan kaki 15 menit setelah makan siang membantu menstabilkan gula darah.",
      "Tidak perlu olahraga ekstrem: konsistensi langkah harian jauh lebih efektif.",
    ],
  },
];

export default function CommunityScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<CommunityTab>("feed");
  const [searchQuery, setSearchQuery] = useState("");

  // Community Feed state
  const [posts, setPosts] = useState<CommunityPost[]>(INITIAL_POSTS);
  const [newPostText, setNewPostText] = useState("");
  const [newPostTag, setNewPostTag] = useState("Progres Diet");
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");

  // Consultation state
  const [selectedExpertId, setSelectedExpertId] = useState<string>(NUTRITIONISTS[0].id);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Record<string, Array<{ id: string; sender: "expert" | "user"; text: string }>>
  >({
    "nutri-1": [{ id: "m-0", sender: "expert", text: NUTRITIONISTS[0].initialMessage }],
    "nutri-2": [{ id: "m-1", sender: "expert", text: NUTRITIONISTS[1].initialMessage }],
  });

  // Expanded article state
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(ARTICLES_AND_TIPS[0].id);

  const handlePublishPost = () => {
    const clean = newPostText.trim();
    if (!clean) return;
    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      author: user?.name || "Pengguna Better Life",
      badge: "Anggota Aktif",
      time: "Baru saja",
      tag: newPostTag,
      content: clean,
      likes: 1,
      likedByMe: true,
      comments: [],
    };
    setPosts((prev) => [newPost, ...prev]);
    setNewPostText("");
  };

  const handleToggleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextLiked = !p.likedByMe;
        return {
          ...p,
          likedByMe: nextLiked,
          likes: nextLiked ? p.likes + 1 : Math.max(0, p.likes - 1),
        };
      })
    );
  };

  const handleAddComment = (postId: string) => {
    const clean = commentInput.trim();
    if (!clean) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [
                ...p.comments,
                {
                  id: `c-${Date.now()}`,
                  author: user?.name || "Saya",
                  text: clean,
                  time: "Baru saja",
                },
              ],
            }
          : p
      )
    );
    setCommentInput("");
  };

  const handleSendConsultation = () => {
    const clean = chatInput.trim();
    if (!clean) return;
    const expert = NUTRITIONISTS.find((n) => n.id === selectedExpertId) || NUTRITIONISTS[0];
    const userMsg = { id: `u-${Date.now()}`, sender: "user" as const, text: clean };

    let replyText =
      "Terima kasih atas pertanyaannya! Untuk hasil optimal, pastikan kebutuhan protein harian terpenuhi di setiap waktu makan dan jaga hidrasi minimal 8 gelas air per hari.";
    if (/kalori|defisit|turun|berat/i.test(clean)) {
      replyText =
        "Untuk penurunan berat badan yang sehat (0,5 kg/minggu), pertahankan defisit sekitar 300–400 kcal dari TDEE Anda dan utamakan lauk tinggi protein seperti dada ayam, telur, tahu, atau tempe.";
    } else if (/kost|murah|hemat|resep/i.test(clean)) {
      replyText =
        "Untuk menu hemat anak kost, kombinasikan karbohidrat kompleks (nasi merah/oatmeal) dengan telur rebus, tempe panggang, dan sayur bening/tumis. Biayanya di bawah Rp 20.000 per porsi.";
    } else if (/air|minum|lapar|ngemil/i.test(clean)) {
      replyText =
        "Jika sering lapar di jam tanggung, minum 1 gelas air terlebih dahulu dan pilih camilan tinggi serat seperti potongan apel, pepaya, atau edamame rebus.";
    }

    const expertReply = {
      id: `e-${Date.now() + 1}`,
      sender: "expert" as const,
      text: `${replyText} · ${expert.name}`,
    };

    setChatHistory((prev) => ({
      ...prev,
      [selectedExpertId]: [...(prev[selectedExpertId] || []), userMsg, expertReply],
    }));
    setChatInput("");
  };

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.content.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.tag.toLowerCase().includes(q)
    );
  }, [posts, searchQuery]);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ARTICLES_AND_TIPS;
    return ARTICLES_AND_TIPS.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <ScreenWrapper maxWidth="wide" className="flex-1 bg-canvas">
      <Header
        onBack={() => router.back()}
        title="Komunitas & Edukasi"
        subtitle="Berbagi motivasi, konsultasi ahli gizi, serta artikel & tips sehat"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1 pt-1"
          contentContainerStyle={{ paddingBottom: 96 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FadeInView index={0} className="mb-3.5">
            <Segmented<CommunityTab>
              stretch
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { value: "feed", label: "Postingan" },
                { value: "consult", label: "Konsultasi Ahli" },
                { value: "articles", label: "Artikel & Tips" },
              ]}
            />
          </FadeInView>

          {activeTab !== "consult" && (
            <FadeInView index={1} className="mb-3.5">
              <SearchField
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={
                  activeTab === "feed"
                    ? "Cari postingan komunitas atau topik..."
                    : "Cari artikel kesehatan atau tips diet..."
                }
                accessibilityLabel="Cari di komunitas dan artikel"
              />
            </FadeInView>
          )}

          {/* TAB 1: POSTINGAN KOMUNITAS (UPLOAD + FEED + KOMENTAR) */}
          {activeTab === "feed" && (
            <View className="gap-3.5">
              <FadeInView index={2}>
                <Surface>
                  <CardHead
                    title="Bagikan progres & pengalaman"
                    caption="Beri semangat sesama pejuang pola hidup sehat"
                  />
                  <View className="flex-row gap-2 mb-2.5">
                    {["Progres Diet", "Menu Anak Kost", "Motivasi"].map((tag) => {
                      const selected = newPostTag === tag;
                      return (
                        <PressableScale
                          key={tag}
                          onPress={() => setNewPostTag(tag)}
                          pressedScale={0.96}
                          className={`px-3 py-1.5 rounded-full border ${
                            selected ? "bg-block-ink border-block-ink" : "bg-card-2 border-line"
                          }`}
                        >
                          <AppText
                            weight="semibold"
                            className={`text-[11.5px] ${selected ? "text-white" : "text-ink"}`}
                          >
                            {tag}
                          </AppText>
                        </PressableScale>
                      );
                    })}
                  </View>

                  <TextInput
                    value={newPostText}
                    onChangeText={setNewPostText}
                    placeholder="Ceritakan menu sehat atau pencapaian Anda hari ini..."
                    placeholderTextColor="#7d8781"
                    multiline
                    className="w-full min-h-[76px] bg-card-2 border border-line rounded-[16px] p-3 text-ink text-[13.5px]"
                    style={{ textAlignVertical: "top", fontFamily: "Urbanist-Medium" }}
                  />

                  <View className="flex-row justify-end mt-3">
                    <PillButton
                      label="Posting"
                      variant="primary"
                      size="sm"
                      icon="plus"
                      onPress={handlePublishPost}
                    />
                  </View>
                </Surface>
              </FadeInView>

              {filteredPosts.map((post, idx) => {
                const isCommenting = activeCommentPostId === post.id;
                return (
                  <FadeInView key={post.id} index={idx + 3}>
                    <Surface>
                      <View className="flex-row items-center justify-between mb-2.5">
                        <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
                          <Avatar name={post.author} size={40} />
                          <View className="flex-1 min-w-0">
                            <AppText weight="semibold" numberOfLines={1} className="text-[14.5px] text-ink">
                              {post.author}
                            </AppText>
                            <AppText weight="medium" className="text-[11.5px] text-muted">
                              {post.time} · {post.tag}
                            </AppText>
                          </View>
                        </View>
                        <StatusPill label={post.badge} tone="accent" dot={false} />
                      </View>

                      <AppText weight="regular" className="text-[13.5px] text-ink leading-relaxed mb-3">
                        {post.content}
                      </AppText>

                      <View className="flex-row items-center gap-3 pt-2.5 border-t border-line">
                        <PressableScale
                          onPress={() => handleToggleLike(post.id)}
                          pressedScale={0.94}
                          className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
                            post.likedByMe
                              ? "bg-primary-light border-primary/30"
                              : "bg-card-2 border-line"
                          }`}
                        >
                          <AnimatedHeart
                            filled={Boolean(post.likedByMe)}
                            size={14}
                            activeColor="#0e7a52"
                            inactiveColor="#56605a"
                          />
                          <AppText
                            weight="semibold"
                            className={`text-xs ${
                              post.likedByMe ? "text-primary-text" : "text-muted"
                            }`}
                          >
                            {post.likes} Suka
                          </AppText>
                        </PressableScale>

                        <PressableScale
                          onPress={() =>
                            setActiveCommentPostId(isCommenting ? null : post.id)
                          }
                          pressedScale={0.94}
                          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-card-2 border border-line"
                        >
                          <AppText weight="semibold" className="text-xs text-muted">
                            {post.comments.length} Komentar
                          </AppText>
                        </PressableScale>
                      </View>

                      {post.comments.length > 0 && (
                        <View className="mt-3 gap-2 bg-card-2 rounded-[14px] p-3 border border-line">
                          {post.comments.map((c) => (
                            <View key={c.id}>
                              <View className="flex-row items-center justify-between">
                                <AppText weight="bold" className="text-[12px] text-ink">
                                  {c.author}
                                </AppText>
                                <AppText weight="medium" className="text-[10.5px] text-muted">
                                  {c.time}
                                </AppText>
                              </View>
                              <AppText weight="regular" className="text-[12.5px] text-ink mt-0.5">
                                {c.text}
                              </AppText>
                            </View>
                          ))}
                        </View>
                      )}

                      {isCommenting && (
                        <View className="flex-row items-center gap-2 mt-3">
                          <TextInput
                            value={commentInput}
                            onChangeText={setCommentInput}
                            placeholder="Tulis komentar dukungan..."
                            placeholderTextColor="#7d8781"
                            className="flex-1 h-10 bg-card-2 border border-line rounded-full px-3.5 text-ink text-[13px]"
                            style={{ fontFamily: "Urbanist-Medium" }}
                          />
                          <PillButton
                            label="Kirim"
                            size="sm"
                            variant="primary"
                            onPress={() => handleAddComment(post.id)}
                          />
                        </View>
                      )}
                    </Surface>
                  </FadeInView>
                );
              })}
            </View>
          )}

          {/* TAB 2: KONSULTASI AHLI GIZI */}
          {activeTab === "consult" && (
            <View className="gap-3.5">
              <FadeInView index={1}>
                <ColorBlock tone="green">
                  <View className="flex-row items-center justify-between mb-1">
                    <AppText weight="bold" className="text-[11.5px] uppercase tracking-wider text-white/80">
                      Konsultasi Pakar Gizi
                    </AppText>
                    <StatusPill label="Sesi Gratis Aktif" tone="good" dot={false} />
                  </View>
                  <AppText weight="semibold" className="text-[18px] text-white">
                    Tanya langsung ke Ahli Gizi Bersertifikat
                  </AppText>
                  <AppText weight="regular" className="text-[12.5px] text-white/85 mt-1 leading-relaxed">
                    Dapatkan rekomendasi porsi makan, solusi defisit kalori, serta pemilihan bahan makanan sesuai alergi dan kondisi tubuh Anda.
                  </AppText>
                </ColorBlock>
              </FadeInView>

              <FadeInView index={2} className="gap-2.5">
                {NUTRITIONISTS.map((expert) => {
                  const selected = selectedExpertId === expert.id;
                  return (
                    <PressableScale
                      key={expert.id}
                      onPress={() => setSelectedExpertId(expert.id)}
                      pressedScale={0.99}
                      className={`p-4 rounded-[20px] border ${
                        selected ? "bg-card border-primary" : "bg-card border-line"
                      }`}
                    >
                      <View className="flex-row items-center justify-between gap-2">
                        <View className="flex-row items-center gap-3 flex-1 min-w-0">
                          <Avatar name={expert.name} size={46} showBadge />
                          <View className="flex-1 min-w-0">
                            <AppText weight="bold" numberOfLines={1} className="text-[15px] text-ink">
                              {expert.name}
                            </AppText>
                            <AppText weight="medium" numberOfLines={1} className="text-[12px] text-muted mt-0.5">
                              {expert.specialty}
                            </AppText>
                          </View>
                        </View>
                        <StatusPill label={expert.status} tone="good" />
                      </View>
                      <AppText weight="regular" className="text-[12.5px] text-muted mt-2.5 leading-relaxed">
                        {expert.bio}
                      </AppText>
                    </PressableScale>
                  );
                })}
              </FadeInView>

              <FadeInView index={3}>
                <Surface>
                  <CardHead
                    title="Ruang Konsultasi"
                    caption="Tanyakan seputar target kalori, menu kost, atau nutrisi harian"
                  />

                  <View className="gap-2.5 mb-3">
                    {(chatHistory[selectedExpertId] || []).map((msg) => (
                      <View
                        key={msg.id}
                        className={`p-3 rounded-[16px] max-w-[88%] ${
                          msg.sender === "user"
                            ? "bg-primary self-end"
                            : "bg-card-2 border border-line self-start"
                        }`}
                      >
                        <AppText
                          weight="medium"
                          className={`text-[13px] leading-relaxed ${
                            msg.sender === "user" ? "text-white" : "text-ink"
                          }`}
                        >
                          {msg.text}
                        </AppText>
                      </View>
                    ))}
                  </View>

                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={chatInput}
                      onChangeText={setChatInput}
                      placeholder="Ketik pertanyaan untuk ahli gizi..."
                      placeholderTextColor="#7d8781"
                      className="flex-1 h-11 bg-card-2 border border-line rounded-full px-4 text-ink text-[13.5px]"
                      style={{ fontFamily: "Urbanist-Medium" }}
                    />
                    <PillButton
                      label="Kirim"
                      variant="primary"
                      size="sm"
                      onPress={handleSendConsultation}
                    />
                  </View>
                </Surface>
              </FadeInView>
            </View>
          )}

          {/* TAB 3: ARTIKEL KESEHATAN & TIPS & TRICK */}
          {activeTab === "articles" && (
            <View className="gap-3.5">
              {filteredArticles.map((art, idx) => {
                const expanded = expandedArticleId === art.id;
                return (
                  <FadeInView key={art.id} index={idx + 2}>
                    <Surface>
                      <PressableScale
                        onPress={() => setExpandedArticleId(expanded ? null : art.id)}
                        pressedScale={0.99}
                      >
                        <View className="flex-row items-center justify-between mb-2">
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
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

