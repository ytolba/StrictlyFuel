import React, { useCallback, useMemo, useState } from "react";
import { Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { loadNutritionProfile } from "../services/nutritionProfileService";
import { getKnowledgeCoverage } from "../services/knowledgeBaseService";
import { EMPTY_NUTRITION_PROFILE, NutritionProfile } from "../types/nutritionProfile";
import { scoreIngredients } from "../utils/nutritionScore";
import type { ScoreMetric } from "../utils/nutritionScore";
import { strictlyColors, strictlyRadius, strictlyType } from "../theme/strictlyTheme";

type Props = {
  ingredients: string[];
  details?: string;
  rawText?: string;
  unknown?: boolean;
  compact?: boolean;
};

const scoreColor = (score: number) => {
  if (score >= 80) return strictlyColors.good;
  if (score >= 60) return "#8A6A13";
  return strictlyColors.danger;
};

const tierColor = (tier: string) => {
  if (tier === "Watch") return "#C79516";
  if (tier === "Moderate concern") return "#D66A1F";
  if (tier === "High concern" || tier === "Critical concern") return strictlyColors.danger;
  if (tier === "Positive") return strictlyColors.good;
  return strictlyColors.textSoft;
};

export const PersonalizedScoreCard = ({ ingredients, details, rawText, unknown, compact = false }: Props) => {
  const [profile, setProfile] = useState<NutritionProfile>(EMPTY_NUTRITION_PROFILE);
  const [knowledgeCoverage, setKnowledgeCoverage] = useState({ matchedEntities: 0, publishedClaims: 0 });
  const [selectedMetric, setSelectedMetric] = useState<ScoreMetric | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadNutritionProfile().then(setProfile);
      let active = true;
      getKnowledgeCoverage(ingredients).then((coverage) => {
        if (active) setKnowledgeCoverage(coverage);
      }).catch(() => undefined);
      return () => { active = false; };
    }, [ingredients])
  );

  const result = useMemo(
    () => scoreIngredients({ ingredients, details, rawText, unknown, profile }),
    [ingredients, details, rawText, unknown, profile]
  );

  if (result.score === null) {
    return (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <Text style={styles.eyebrow}>STRICTLY SCORE</Text>
        <Text style={styles.emptyTitle}>{result.label}</Text>
        <Text style={styles.summary}>{result.summary}</Text>
      </View>
    );
  }

  const fitMetric = result.metrics.find((metric) => metric.key === "fit");

  return (
    <View>
      <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.scoreHeader}>
        <View style={styles.scoreCopy}>
          <Text style={styles.eyebrow}>STRICTLY SCORE</Text>
          <View style={styles.scoreLine}>
            <Text style={styles.score}>{result.score}</Text>
            <Text style={styles.scoreOutOf}>/100</Text>
          </View>
        </View>
        <View style={[styles.statusIcon, { backgroundColor: result.score < 55 ? strictlyColors.dangerSurface : strictlyColors.cream }]}>
          <Ionicons name={result.score < 55 ? "alert-circle-outline" : "sparkles-outline"} size={21} color={result.score < 55 ? strictlyColors.danger : strictlyColors.good} />
        </View>
      </View>
      <Text style={styles.label}>{result.label}</Text>
      <Text style={styles.summary}>{result.summary}</Text>

      {!compact && (
        <View style={styles.metrics}>
          {result.metrics.filter((metric) => metric.key !== "fit").map((metric, index, visibleMetrics) => (
            <TouchableOpacity
              key={metric.key}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel={`View ${metric.title} details`}
              onPress={() => setSelectedMetric(metric)}
              style={[styles.metricRow, index === visibleMetrics.length - 1 && styles.metricRowLast]}
            >
              <Text style={styles.metricNumber}>{metric.number}</Text>
              <View style={styles.metricCopy}>
                <Text style={styles.metricTitle}>{metric.title}</Text>
                <Text style={styles.metricSummary}>{metric.summary}</Text>
              </View>
              <Text style={[styles.metricScore, { color: scoreColor(metric.score) }]}>{metric.key === "fit" && !result.isPersonalized ? "—" : metric.score}</Text>
              <Ionicons name="arrow-forward" size={15} color={strictlyColors.textSoft} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {knowledgeCoverage.publishedClaims > 0 && (
        <Text style={styles.evidenceNote}>
          Evidence-backed context available for {knowledgeCoverage.matchedEntities} ingredient{knowledgeCoverage.matchedEntities === 1 ? "" : "s"}.
        </Text>
      )}
      <Text style={styles.disclaimer}>Informational only—not medical advice. Always verify allergy warnings on the package.</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.78}
        style={[styles.fitCard, result.notAFit && styles.fitPanelDanger]}
        onPress={() => fitMetric && setSelectedMetric(fitMetric)}
        accessibilityRole="button"
        accessibilityLabel="View fit for you details"
      >
        <View style={styles.fitPanelCopy}>
          <Text style={styles.fitEyebrow}>FIT FOR YOU</Text>
          <Text style={[styles.fitLabel, result.notAFit && styles.fitLabelDanger]}>{result.fitLabel}</Text>
          <Text style={styles.fitHint}>Personalized to your sensitivities, conditions, and priorities · separate from Strictly Score</Text>
        </View>
        <View style={styles.fitScoreWrap}>
          <Text style={[styles.fitScore, result.notAFit && styles.fitLabelDanger]}>
            {result.isPersonalized ? result.fitScore : "—"}{result.isPersonalized ? <Text style={styles.fitOutOf}>/100</Text> : null}
          </Text>
          <Ionicons name="arrow-forward" size={15} color={strictlyColors.textSoft} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={selectedMetric !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedMetric(null)}
      >
        <View style={styles.metricModalBackdrop}>
          <View style={styles.metricModalCard}>
            <View style={styles.metricModalHeader}>
              <View>
                <Text style={styles.metricModalEyebrow}>{selectedMetric?.number} · SCORE DETAIL</Text>
                <Text style={styles.metricModalTitle}>{selectedMetric?.title}</Text>
              </View>
              <TouchableOpacity
                style={styles.metricModalClose}
                onPress={() => setSelectedMetric(null)}
                accessibilityLabel="Close score detail"
              >
                <Ionicons name="close" size={19} color={strictlyColors.textSoft} />
              </TouchableOpacity>
            </View>
            <Text style={styles.metricModalScore}>{selectedMetric?.score}<Text style={styles.metricModalScoreOutOf}>/100</Text></Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.metricModalContent}>
              {(selectedMetric?.details || []).map((flag, index) => (
                <View key={`${flag.ingredient}-${index}`} style={styles.flagRow}>
                  <View style={[styles.flagBullet, { backgroundColor: tierColor(flag.tier) }]} />
                  <View style={styles.flagCopy}>
                    <View style={styles.flagTitleRow}>
                      <Text style={styles.flagIngredient}>{flag.ingredient}</Text>
                      <Text style={styles.flagImpact}>{flag.impact}</Text>
                    </View>
                    <Text style={[styles.flagTier, { color: tierColor(flag.tier) }]}>{flag.tier}</Text>
                    <Text style={styles.flagExplanation}>{flag.explanation}</Text>
                    {flag.sourceUrl ? (
                      <TouchableOpacity onPress={() => Linking.openURL(flag.sourceUrl!).catch(() => undefined)}>
                        <Text style={styles.flagSource}>View research source ↗</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: strictlyColors.surface, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, padding: 18, marginBottom: 16 },
  cardCompact: { padding: 15, marginBottom: 10 },
  scoreHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  scoreCopy: { flex: 1 },
  eyebrow: { color: strictlyColors.textSoft, fontFamily: strictlyType.mono, fontSize: 9, letterSpacing: 1.1, marginBottom: 5 },
  scoreLine: { flexDirection: "row", alignItems: "baseline" },
  score: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 50, letterSpacing: -2.2 },
  scoreOutOf: { color: strictlyColors.textSoft, fontFamily: strictlyType.sansMedium, fontSize: 14, marginLeft: 3 },
  statusIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  label: { color: strictlyColors.good, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 20, letterSpacing: -0.4 },
  labelDanger: { color: strictlyColors.danger },
  fitCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: strictlyColors.cream, borderWidth: 1, borderColor: strictlyColors.border, borderRadius: strictlyRadius.large, padding: 15, marginBottom: 16 },
  fitPanelDanger: { backgroundColor: strictlyColors.dangerSurface },
  fitPanelCopy: { flex: 1, paddingRight: 10 },
  fitEyebrow: { color: strictlyColors.textSoft, fontFamily: strictlyType.mono, fontSize: 8, letterSpacing: 0.7, marginBottom: 4 },
  fitLabel: { color: strictlyColors.good, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 15 },
  fitLabelDanger: { color: strictlyColors.danger },
  fitScore: { color: strictlyColors.good, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 24 },
  fitScoreWrap: { alignItems: "flex-end", gap: 4 },
  fitOutOf: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 11 },
  fitHint: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 10, lineHeight: 14, marginTop: 4 },
  emptyTitle: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 20 },
  summary: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 13, lineHeight: 19, marginTop: 5 },
  metrics: { borderTopWidth: 1, borderTopColor: strictlyColors.border, marginTop: 17 },
  metricRow: { minHeight: 69, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: strictlyColors.border },
  metricRowLast: { borderBottomWidth: 0 },
  metricNumber: { width: 27, color: strictlyColors.textSoft, fontFamily: strictlyType.mono, fontSize: 10 },
  metricCopy: { flex: 1, paddingRight: 8 },
  metricTitle: { color: strictlyColors.text, fontFamily: strictlyType.sansMedium, fontWeight: "600", fontSize: 14 },
  metricSummary: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 11, lineHeight: 15, marginTop: 3 },
  metricScore: { width: 28, textAlign: "right", fontFamily: strictlyType.mono, fontWeight: "700", fontSize: 13, marginRight: 9 },
  disclaimer: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 10, lineHeight: 14, marginTop: 12 },
  evidenceNote: { color: strictlyColors.good, fontFamily: strictlyType.sansMedium, fontSize: 10, lineHeight: 14, marginTop: 12 },
  metricModalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(7,28,20,0.6)" },
  metricModalCard: { maxHeight: "78%", backgroundColor: strictlyColors.paper, borderTopLeftRadius: strictlyRadius.large, borderTopRightRadius: strictlyRadius.large, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 },
  metricModalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  metricModalEyebrow: { color: strictlyColors.textSoft, fontFamily: strictlyType.mono, fontSize: 9, letterSpacing: 1 },
  metricModalTitle: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 23, letterSpacing: -0.5, marginTop: 4 },
  metricModalClose: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: strictlyColors.cream },
  metricModalScore: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 40, letterSpacing: -1.5, marginTop: 10 },
  metricModalScoreOutOf: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 14, letterSpacing: 0 },
  metricModalContent: { paddingTop: 12, paddingBottom: 10 },
  flagRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: strictlyColors.border, paddingVertical: 13 },
  flagBullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: strictlyColors.danger, marginTop: 5, marginRight: 10 },
  flagCopy: { flex: 1 },
  flagTitleRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  flagIngredient: { color: strictlyColors.text, fontFamily: strictlyType.sansBold, fontWeight: "700", fontSize: 14, flex: 1 },
  flagImpact: { color: strictlyColors.danger, fontFamily: strictlyType.mono, fontSize: 9 },
  flagTier: { color: strictlyColors.textSoft, fontFamily: strictlyType.mono, fontSize: 8, letterSpacing: 0.8, marginTop: 3 },
  flagExplanation: { color: strictlyColors.textSoft, fontFamily: strictlyType.sans, fontSize: 12, lineHeight: 17, marginTop: 5 },
  flagSource: { color: strictlyColors.good, fontFamily: strictlyType.sansMedium, fontSize: 11, marginTop: 7 },
});
