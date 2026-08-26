import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AlternativeProduct, findBetterAlternatives, searchWebAlternatives } from "../services/alternativeService";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

type Props = {
  ingredients: string[];
  details?: string;
  category?: string;
  productName?: string;
  barcode?: string;
  currentScore?: number | null;
};

const scoreColor = (score: number) => (score >= 80 ? strictlyColors.good : score >= 60 ? "#8A6A13" : strictlyColors.danger);

export const AlternativeSuggestions = ({
  ingredients,
  details,
  category,
  productName,
  barcode,
  currentScore,
}: Props) => {
  const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [webAlternatives, setWebAlternatives] = useState<AlternativeProduct[]>([]);
  const [webLoading, setWebLoading] = useState(false);
  const [webSearched, setWebSearched] = useState(false);

  useEffect(() => {
    let active = true;
    if (!category?.trim()) {
      setAlternatives([]);
      setWebAlternatives([]);
      setWebSearched(false);
      return () => {
        active = false;
      };
    }
    setWebAlternatives([]);
    setWebSearched(false);
    setLoading(true);
    findBetterAlternatives({ ingredients, details, category, productName, barcode, currentScore })
      .then((items) => {
        if (active) setAlternatives(items);
      })
      .catch(() => {
        if (active) setAlternatives([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ingredients, details, category, productName, barcode, currentScore]);

  const handleWebSearch = async () => {
    if (!category?.trim() || webLoading) return;
    setWebLoading(true);
    setWebSearched(true);
    try {
      const items = await searchWebAlternatives({ ingredients, category, productName });
      setWebAlternatives(items);
    } catch {
      setWebAlternatives([]);
    } finally {
      setWebLoading(false);
    }
  };

  if (!category?.trim()) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.eyebrow}>BETTER MATCHES</Text>
          <Text style={styles.title}>Same category, stronger scores</Text>
          <Text style={styles.subtitle}>Ranked against this product type and your Strictly profile.</Text>
        </View>
        <Ionicons name="sparkles-outline" size={19} color={strictlyColors.good} />
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={strictlyColors.good} />
          <Text style={styles.loadingText}>Finding comparable products…</Text>
        </View>
      ) : alternatives.length > 0 || webAlternatives.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsContent}>
          {[...alternatives, ...webAlternatives].map((item) => (
            <TouchableOpacity
              key={item.code}
              activeOpacity={0.86}
              style={styles.card}
              onPress={() => Linking.openURL(item.productUrl).catch(() => undefined)}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="contain" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="leaf-outline" size={22} color={strictlyColors.sage} />
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.scoreLabel}>STRICTLY SCORE</Text>
                <Text style={[styles.score, { color: scoreColor(item.score.score || 0) }]}>{item.score.score}<Text style={styles.scoreOutOf}>/100</Text></Text>
                {typeof item.catalogScore === "number" ? (
                  <Text style={styles.catalogScore}>CATALOG BASELINE {item.catalogScore}/100</Text>
                ) : null}
                <Text numberOfLines={2} style={styles.productName}>{item.productName}</Text>
                {item.brand ? <Text numberOfLines={1} style={styles.brand}>{item.brand}</Text> : null}
                {item.source === "curated" ? (
                  <Text style={styles.curatedLabel}>
                    CURATED{item.verifiedAt ? ` · VERIFIED ${item.verifiedAt.slice(0, 10)}` : ""}
                  </Text>
                ) : null}
                {item.source === "web" ? (
                  <Text style={styles.webLabel}>WEB RESEARCH · {item.verifiedAt ? new Date(item.verifiedAt).toLocaleDateString() : "NOW"}</Text>
                ) : null}
                <Text numberOfLines={2} style={styles.reason}>{item.reason}</Text>
                <View style={styles.viewRow}>
                  <Text style={styles.viewText}>View product</Text>
                  <Ionicons name="open-outline" size={14} color={strictlyColors.good} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View>
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No comparable products with enough ingredient data yet.</Text>
            <Text style={styles.emptySubtext}>Strictly can research current products on the web and look for 90+ matches.</Text>
            <TouchableOpacity style={styles.webSearchButton} activeOpacity={0.8} onPress={handleWebSearch} disabled={webLoading}>
              {webLoading ? <ActivityIndicator size="small" color={strictlyColors.paper} /> : <Ionicons name="globe-outline" size={16} color={strictlyColors.paper} />}
              <Text style={styles.webSearchText}>{webLoading ? "Researching…" : "Find 90+ matches on the web"}</Text>
            </TouchableOpacity>
          </View>
          {webSearched && !webLoading ? <Text style={styles.webEmptyText}>No verified 90+ match was found this time. Try again with a clearer category.</Text> : null}
        </View>
      )}
      <Text style={styles.disclaimer}>Suggestions are informational and based on available labels. Always verify the package yourself.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 18, paddingTop: 3 },
  headingRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  headingCopy: { flex: 1, paddingRight: 14 },
  eyebrow: { color: strictlyColors.textSoft, fontFamily: strictlyType.mono, fontSize: 9, letterSpacing: 1.1, marginBottom: 5 },
  title: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 19, letterSpacing: -0.3 },
  subtitle: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 12, lineHeight: 17, marginTop: 4 },
  loadingRow: { minHeight: 88, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  loadingText: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 12 },
  cardsContent: { gap: 10, paddingRight: 8 },
  card: { width: 176, minHeight: 270, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, backgroundColor: strictlyColors.paper, overflow: "hidden" },
  productImage: { width: "100%", height: 105, backgroundColor: strictlyColors.surfaceMuted },
  imagePlaceholder: { width: "100%", height: 105, backgroundColor: strictlyColors.cream, alignItems: "center", justifyContent: "center" },
  cardBody: { padding: 12, flex: 1 },
  scoreLabel: { color: strictlyColors.textSoft, fontFamily: strictlyType.mono, fontSize: 8, letterSpacing: 0.7 },
  score: { fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 25, letterSpacing: -1, marginTop: 1 },
  scoreOutOf: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 11, letterSpacing: 0 },
  catalogScore: { color: strictlyColors.textSoft, fontFamily: strictlyType.mono, fontSize: 8, letterSpacing: 0.4, marginTop: 1 },
  productName: { color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontWeight: "600", fontSize: 13, lineHeight: 17, marginTop: 8 },
  brand: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 10, marginTop: 2 },
  curatedLabel: { color: strictlyColors.good, fontFamily: strictlyType.mono, fontSize: 8, letterSpacing: 0.5, marginTop: 6 },
  webLabel: { color: strictlyColors.inkSoft, fontFamily: strictlyType.mono, fontSize: 8, letterSpacing: 0.5, marginTop: 6 },
  reason: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 10, lineHeight: 14, marginTop: 8 },
  viewRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: "auto", paddingTop: 10 },
  viewText: { color: strictlyColors.good, fontFamily: strictlyType.sansMedium, fontWeight: "600", fontSize: 10 },
  emptyBox: { borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.medium, padding: 13 },
  emptyText: { color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontSize: 12, lineHeight: 17 },
  emptySubtext: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 11, lineHeight: 16, marginTop: 4 },
  webSearchButton: { minHeight: 42, borderRadius: strictlyRadius.small, backgroundColor: strictlyColors.text, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, marginTop: 12, paddingHorizontal: 13 },
  webSearchText: { color: strictlyColors.paper, fontFamily: strictlyType.sansMedium, fontWeight: "600", fontSize: 12 },
  webEmptyText: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 11, lineHeight: 16, marginTop: 8 },
  disclaimer: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 9, lineHeight: 13, marginTop: 9 },
});
