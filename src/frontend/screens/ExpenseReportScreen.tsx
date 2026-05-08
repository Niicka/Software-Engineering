// src/frontend/screens/ExpenseReportScreen.tsx
// 월간 소비 리포트 화면 - React Native

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getMonthlyReport, MonthlyReport } from "../api/expense.api";

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

interface CategoryItem {
  category: string;
  amount: number;
  ratio: number;
}

// ─── 상수 및 유틸 ────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  식비: "#FF6B6B",
  쇼핑: "#4ECDC4",
  교통: "#45B7D1",
  구독: "#96CEB4",
  여가: "#FFEAA7",
  기타: "#DDA0DD",
};

const formatAmount = (amount: number) =>
  amount.toLocaleString("ko-KR") + "원";

const getStatusColor = (usageRate: number) => {
  if (usageRate >= 100) return "#FF4444";
  if (usageRate >= 80) return "#FF8C00";
  return "#2E75B6";
};

// ─── 컴포넌트: 예산 게이지 바 ──────────────────────────────────────────────

const BudgetGauge: React.FC<{ usageRate: number; totalAmount: number; budget: number }> = ({
  usageRate,
  totalAmount,
  budget,
}) => {
  const clampedRate = Math.min(usageRate, 100);
  const statusColor = getStatusColor(usageRate);

  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeHeader}>
        <Text style={styles.gaugeLabel}>이번 달 예산 사용률</Text>
        <Text style={[styles.gaugePercent, { color: statusColor }]}>
          {usageRate.toFixed(1)}%
        </Text>
      </View>
      <View style={styles.gaugeTrack}>
        <View
          style={[
            styles.gaugeFill,
            { width: `${clampedRate}%` as any, backgroundColor: statusColor },
          ]}
        />
      </View>
      <View style={styles.gaugeFooter}>
        <Text style={styles.gaugeSubText}>지출 {formatAmount(totalAmount)}</Text>
        <Text style={styles.gaugeSubText}>예산 {formatAmount(budget)}</Text>
      </View>
    </View>
  );
};

// ─── 컴포넌트: 카테고리 바 차트 ────────────────────────────────────────────

const CategoryChart: React.FC<{ categories: CategoryItem[]; totalAmount: number }> = ({
  categories,
  totalAmount,
}) => (
  <View style={styles.chartContainer}>
    <Text style={styles.sectionTitle}>카테고리별 지출</Text>
    {categories.map((item) => (
      <View key={item.category} style={styles.categoryRow}>
        <View style={styles.categoryLabelRow}>
          <View
            style={[
              styles.categoryDot,
              { backgroundColor: CATEGORY_COLORS[item.category] || "#999" },
            ]}
          />
          <Text style={styles.categoryName}>{item.category}</Text>
          <Text style={styles.categoryRatio}>{item.ratio}%</Text>
          <Text style={styles.categoryAmount}>{formatAmount(item.amount)}</Text>
        </View>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${item.ratio}%` as any,
                backgroundColor: CATEGORY_COLORS[item.category] || "#999",
              },
            ]}
          />
        </View>
      </View>
    ))}
  </View>
);

// ─── 컴포넌트: 주간 트렌드 차트 ────────────────────────────────────────────

interface WeeklyItem {
  week: number;
  amount: number;
}

const WeeklyTrendChart: React.FC<{ weekly: WeeklyItem[] }> = ({ weekly }) => {
  const maxAmount = Math.max(...weekly.map((w) => w.amount), 1);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.sectionTitle}>주차별 지출 추이</Text>
      <View style={styles.weeklyRow}>
        {weekly.map((item) => (
          <View key={item.week} style={styles.weeklyItem}>
            <Text style={styles.weeklyAmount}>
              {item.amount > 0 ? (item.amount / 10000).toFixed(1) + "만" : "-"}
            </Text>
            <View style={styles.weeklyBarTrack}>
              <View
                style={[
                  styles.weeklyBarFill,
                  { height: `${Math.round((item.amount / maxAmount) * 100)}%` as any },
                ]}
              />
            </View>
            <Text style={styles.weeklyLabel}>{item.week}주</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── 컴포넌트: 전월 비교 카드 ──────────────────────────────────────────────

const ComparisonCard: React.FC<{
  changeAmount: number;
  changeRate: number | null;
}> = ({ changeAmount, changeRate }) => {
  const isIncrease = changeAmount > 0;
  const emoji = isIncrease ? "📈" : "📉";
  const color = isIncrease ? "#FF4444" : "#2E75B6";

  return (
    <View style={styles.comparisonCard}>
      <Text style={styles.sectionTitle}>전월 대비</Text>
      <View style={styles.comparisonContent}>
        <Text style={styles.comparisonEmoji}>{emoji}</Text>
        <View>
          <Text style={[styles.comparisonAmount, { color }]}>
            {isIncrease ? "+" : ""}
            {formatAmount(changeAmount)}
          </Text>
          {changeRate !== null && (
            <Text style={[styles.comparisonRate, { color }]}>
              ({isIncrease ? "+" : ""}
              {changeRate.toFixed(1)}%)
            </Text>
          )}
        </View>
        <Text style={styles.comparisonDesc}>
          {isIncrease
            ? "저번 달보다 더 썼어요.\n챌린지에 참여해볼까요? 💪"
            : "저번 달보다 절약했어요!\n훌륭해요 🎉"}
        </Text>
      </View>
    </View>
  );
};

// ─── 메인 화면 ──────────────────────────────────────────────────────────────

const ExpenseReportScreen: React.FC = () => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getMonthlyReport(selectedYear, selectedMonth);
      setReport(data);
    } catch (e) {
      setError("리포트를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      fetchReport();
    }, [fetchReport])
  );

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    const isCurrentMonth =
      selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
    if (isCurrentMonth) return;

    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const isCurrentMonth =
    selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E75B6" />
        <Text style={styles.loadingText}>리포트 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchReport(true)} />
      }
    >
      {/* 월 선택 네비게이터 */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
          <Text style={styles.navButtonText}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {selectedYear}년 {selectedMonth}월
        </Text>
        <TouchableOpacity
          onPress={handleNextMonth}
          style={[styles.navButton, isCurrentMonth && styles.navButtonDisabled]}
          disabled={isCurrentMonth}
        >
          <Text style={[styles.navButtonText, isCurrentMonth && styles.navButtonTextDisabled]}>
            {">"}
          </Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchReport()} style={styles.retryButton}>
            <Text style={styles.retryText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : report ? (
        <>
          {/* 총 지출 카드 */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>총 지출</Text>
            <Text style={styles.totalAmount}>{formatAmount(report.totalAmount)}</Text>
          </View>

          {/* 예산 게이지 */}
          {report.budget && report.usageRate !== null && (
            <BudgetGauge
              usageRate={report.usageRate}
              totalAmount={report.totalAmount}
              budget={report.budget}
            />
          )}

          {/* 카테고리 차트 */}
          {report.categoryBreakdown.length > 0 && (
            <CategoryChart
              categories={report.categoryBreakdown}
              totalAmount={report.totalAmount}
            />
          )}

          {/* 주간 트렌드 */}
          {report.weeklyTrend && report.weeklyTrend.some((w: WeeklyItem) => w.amount > 0) && (
            <WeeklyTrendChart weekly={report.weeklyTrend} />
          )}

          {/* 전월 비교 */}
          {report.comparedToLastMonth && (
            <ComparisonCard
              changeAmount={report.comparedToLastMonth.changeAmount}
              changeRate={report.comparedToLastMonth.changeRate}
            />
          )}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyText}>이번 달 소비 내역이 없어요.</Text>
          <Text style={styles.emptySubText}>소비를 기록하면 리포트가 생성됩니다!</Text>
        </View>
      )}
    </ScrollView>
  );
};

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#666", fontSize: 14 },

  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  navButton: { padding: 8 },
  navButtonDisabled: { opacity: 0.3 },
  navButtonText: { fontSize: 20, color: "#2E75B6", fontWeight: "bold" },
  navButtonTextDisabled: { color: "#999" },
  monthTitle: { fontSize: 18, fontWeight: "bold", color: "#1F4E79" },

  totalCard: {
    backgroundColor: "#1F4E79",
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  totalLabel: { color: "#A8C8E8", fontSize: 14, marginBottom: 8 },
  totalAmount: { color: "#fff", fontSize: 32, fontWeight: "bold" },

  gaugeContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  gaugeHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  gaugeLabel: { fontSize: 14, color: "#666" },
  gaugePercent: { fontSize: 16, fontWeight: "bold" },
  gaugeTrack: { height: 10, backgroundColor: "#E8EDF2", borderRadius: 5, overflow: "hidden" },
  gaugeFill: { height: "100%", borderRadius: 5 },
  gaugeFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  gaugeSubText: { fontSize: 12, color: "#999" },

  chartContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#1F4E79", marginBottom: 16 },
  categoryRow: { marginBottom: 12 },
  categoryLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  categoryName: { flex: 1, fontSize: 14, color: "#333" },
  categoryRatio: { fontSize: 12, color: "#999", marginRight: 8 },
  categoryAmount: { fontSize: 14, fontWeight: "600", color: "#333" },
  barTrack: { height: 6, backgroundColor: "#F0F0F0", borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },

  comparisonCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  comparisonContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  comparisonEmoji: { fontSize: 32 },
  comparisonAmount: { fontSize: 20, fontWeight: "bold" },
  comparisonRate: { fontSize: 13, marginTop: 2 },
  comparisonDesc: { flex: 1, fontSize: 13, color: "#555", lineHeight: 19 },

  errorContainer: { margin: 24, alignItems: "center" },
  errorText: { color: "#FF4444", fontSize: 14, textAlign: "center", marginBottom: 16 },
  retryButton: { backgroundColor: "#2E75B6", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: "#fff", fontWeight: "bold" },

  emptyContainer: { margin: 40, alignItems: "center" },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: "#555", fontWeight: "600" },
  emptySubText: { fontSize: 13, color: "#999", marginTop: 6 },

  weeklyRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", height: 100 },
  weeklyItem: { alignItems: "center", flex: 1 },
  weeklyAmount: { fontSize: 10, color: "#666", marginBottom: 4 },
  weeklyBarTrack: { width: 28, height: 64, backgroundColor: "#F0F0F0", borderRadius: 4, justifyContent: "flex-end", overflow: "hidden" },
  weeklyBarFill: { width: "100%", backgroundColor: "#2E75B6", borderRadius: 4 },
  weeklyLabel: { fontSize: 12, color: "#999", marginTop: 6 },
});

export default ExpenseReportScreen;
