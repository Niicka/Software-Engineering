// src/backend/controllers/expense.controller.js
// 소비 내역 비즈니스 로직

const { Op } = require("sequelize");
const db = require("../models");
const { analyzeImpulseSpending } = require("../../ai/impulseDetector");

const CATEGORIES = ["식비", "쇼핑", "교통", "구독", "여가", "기타"];

// ─── 소비 내역 등록 ──────────────────────────────────────────────────────────
exports.createExpense = async (req, res) => {
  const { amount, category, memo, spentAt } = req.body;
  const userId = req.user.id;

  try {
    // 1. DB에 소비 내역 저장
    const expense = await db.Expense.create({
      userId,
      amount,
      category,
      memo: memo || null,
      spentAt: new Date(spentAt),
    });

    // 2. 예산 초과 여부 확인 → 알림 발송 (비동기, 응답 후 처리)
    checkBudgetAndNotify(userId).catch(console.error);

    // 3. AI 충동소비 탐지 (비동기)
    let aiAlert = { triggered: false };
    try {
      const aiResult = await analyzeImpulseSpending(userId, amount, category);
      if (aiResult.isImpulse) {
        aiAlert = {
          triggered: true,
          tip: aiResult.tip,
          estimatedSaving: aiResult.estimatedSaving,
        };
      }
    } catch (aiError) {
      // AI 오류가 메인 플로우를 막지 않도록 처리
      console.error("[AI] 충동소비 탐지 오류:", aiError.message);
    }

    return res.status(201).json({
      success: true,
      data: {
        expenseId: expense.id,
        amount: expense.amount,
        category: expense.category,
        memo: expense.memo,
        spentAt: expense.spentAt,
        aiAlert,
      },
    });
  } catch (error) {
    console.error("[Expense] createExpense 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "소비 내역 등록에 실패했습니다." },
    });
  }
};

// ─── 소비 내역 목록 조회 ────────────────────────────────────────────────────
exports.getExpenses = async (req, res) => {
  const userId = req.user.id;
  const {
    startDate,
    endDate,
    category,
    page = 1,
    limit = 20,
  } = req.query;

  try {
    const where = { userId };

    if (category) where.category = category;
    if (startDate || endDate) {
      where.spentAt = {};
      if (startDate) where.spentAt[Op.gte] = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.spentAt[Op.lte] = end;
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await db.Expense.findAndCountAll({
      where,
      order: [["spentAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    return res.status(200).json({
      success: true,
      data: {
        expenses: rows.map((e) => ({
          expenseId: e.id,
          amount: e.amount,
          category: e.category,
          memo: e.memo,
          spentAt: e.spentAt,
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalCount: count,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("[Expense] getExpenses 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "소비 내역 조회에 실패했습니다." },
    });
  }
};

// ─── 월간 소비 리포트 ────────────────────────────────────────────────────────
exports.getMonthlyReport = async (req, res) => {
  const userId = req.user.id;
  const { year, month } = req.query;

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // 해당 월 전체 소비 내역 조회
    const expenses = await db.Expense.findAll({
      where: { userId, spentAt: { [Op.between]: [startDate, endDate] } },
      order: [["spentAt", "ASC"]],
    });

    // 카테고리별 집계
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const categoryMap = {};
    CATEGORIES.forEach((cat) => (categoryMap[cat] = 0));
    expenses.forEach((e) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });

    const categoryBreakdown = CATEGORIES
      .filter((cat) => categoryMap[cat] > 0)
      .map((cat) => ({
        category: cat,
        amount: categoryMap[cat],
        ratio: totalAmount > 0
          ? Math.round((categoryMap[cat] / totalAmount) * 1000) / 10
          : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // 주차별 집계
    const weeklyTrend = [1, 2, 3, 4].map((week) => {
      const weekStart = new Date(year, month - 1, (week - 1) * 7 + 1);
      const weekEnd = new Date(year, month - 1, week * 7);
      const weekAmount = expenses
        .filter((e) => e.spentAt >= weekStart && e.spentAt <= weekEnd)
        .reduce((sum, e) => sum + e.amount, 0);
      return { week, amount: weekAmount };
    });

    // 전월 비교
    const prevStartDate = new Date(year, month - 2, 1);
    const prevEndDate = new Date(year, month - 1, 0, 23, 59, 59, 999);
    const prevExpenses = await db.Expense.findAll({
      where: { userId, spentAt: { [Op.between]: [prevStartDate, prevEndDate] } },
    });
    const prevTotal = prevExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 예산 조회
    const budget = await db.Budget.findOne({
      where: { userId, year: parseInt(year), month: parseInt(month) },
    });

    return res.status(200).json({
      success: true,
      data: {
        year: parseInt(year),
        month: parseInt(month),
        totalAmount,
        budget: budget ? budget.totalAmount : null,
        usageRate: budget
          ? Math.round((totalAmount / budget.totalAmount) * 1000) / 10
          : null,
        categoryBreakdown,
        comparedToLastMonth: {
          totalAmount: prevTotal,
          changeAmount: totalAmount - prevTotal,
          changeRate:
            prevTotal > 0
              ? Math.round(((totalAmount - prevTotal) / prevTotal) * 1000) / 10
              : null,
        },
        weeklyTrend,
      },
    });
  } catch (error) {
    console.error("[Expense] getMonthlyReport 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "월간 리포트 조회에 실패했습니다." },
    });
  }
};

// ─── 소비 내역 수정 ──────────────────────────────────────────────────────────
exports.updateExpense = async (req, res) => {
  const userId = req.user.id;
  const { expenseId } = req.params;
  const { amount, category, memo, spentAt } = req.body;

  try {
    const expense = await db.Expense.findOne({ where: { id: expenseId, userId } });
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "소비 내역을 찾을 수 없습니다." },
      });
    }

    await expense.update({
      ...(amount !== undefined && { amount }),
      ...(category !== undefined && { category }),
      ...(memo !== undefined && { memo }),
      ...(spentAt !== undefined && { spentAt: new Date(spentAt) }),
    });

    return res.status(200).json({
      success: true,
      data: {
        expenseId: expense.id,
        amount: expense.amount,
        category: expense.category,
        memo: expense.memo,
        spentAt: expense.spentAt,
      },
    });
  } catch (error) {
    console.error("[Expense] updateExpense 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "소비 내역 수정에 실패했습니다." },
    });
  }
};

// ─── 소비 내역 삭제 ──────────────────────────────────────────────────────────
exports.deleteExpense = async (req, res) => {
  const userId = req.user.id;
  const { expenseId } = req.params;

  try {
    const expense = await db.Expense.findOne({ where: { id: expenseId, userId } });
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "소비 내역을 찾을 수 없습니다." },
      });
    }
    await expense.destroy();
    return res.status(200).json({ success: true, message: "삭제되었습니다." });
  } catch (error) {
    console.error("[Expense] deleteExpense 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "삭제에 실패했습니다." },
    });
  }
};

// ─── 내부 헬퍼: 예산 초과 확인 및 알림 ──────────────────────────────────────
async function checkBudgetAndNotify(userId) {
  const now = new Date();
  const budget = await db.Budget.findOne({
    where: { userId, year: now.getFullYear(), month: now.getMonth() + 1 },
  });
  if (!budget) return;

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalSpent = await db.Expense.sum("amount", {
    where: { userId, spentAt: { "$gte": startOfMonth } },
  });

  const usageRate = totalSpent / budget.totalAmount;

  if (usageRate >= 1.0) {
    await sendPushNotification(userId, {
      title: "⚠️ 예산 초과!",
      body: `이번 달 예산을 ${Math.round((usageRate - 1) * 100)}% 초과했어요. 절약 챌린지에 참여해보세요!`,
    });
  } else if (usageRate >= 0.8) {
    await sendPushNotification(userId, {
      title: "📊 예산 80% 도달",
      body: `이번 달 예산의 ${Math.round(usageRate * 100)}%를 사용했어요. 남은 예산을 확인해보세요.`,
    });
  }
}

// FCM 푸시 알림 발송 (stub)
async function sendPushNotification(userId, { title, body }) {
  // TODO: Firebase Admin SDK를 통한 실제 FCM 발송 구현
  console.log(`[FCM] userId=${userId} | title="${title}" | body="${body}"`);
}
