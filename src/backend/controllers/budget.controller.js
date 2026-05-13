// src/backend/controllers/budget.controller.js
// 예산 설정 및 알림 비즈니스 로직 (FR-020 ~ FR-024)

const { Op } = require("sequelize");
const db = require("../models");

const CATEGORIES = ["식비", "쇼핑", "교통", "구독", "여가", "기타"];

// ─── 전체 월 예산 설정 (FR-020) ──────────────────────────────────────────────
exports.setMonthlyBudget = async (req, res) => {
  const userId = req.user.id;
  const { year, month, totalAmount, carryOver = false } = req.body;

  if (!totalAmount || totalAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_AMOUNT", message: "유효한 예산 금액을 입력해주세요." },
    });
  }

  try {
    // 이전 달 잔여 예산 이월 처리 (FR-024)
    let carryOverAmount = 0;
    if (carryOver) {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevBudget = await db.Budget.findOne({
        where: { userId, year: prevYear, month: prevMonth },
      });
      if (prevBudget) {
        const prevStart = new Date(prevYear, prevMonth - 1, 1);
        const prevEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);
        const prevSpent = await db.Expense.sum("amount", {
          where: { userId, spentAt: { [Op.between]: [prevStart, prevEnd] } },
        }) || 0;
        carryOverAmount = Math.max(0, prevBudget.totalAmount - prevSpent);
      }
    }

    const [budget, created] = await db.Budget.upsert({
      userId,
      year: parseInt(year),
      month: parseInt(month),
      totalAmount: totalAmount + carryOverAmount,
      carryOver,
    });

    return res.status(created ? 201 : 200).json({
      success: true,
      data: {
        budgetId: budget.id,
        year: parseInt(year),
        month: parseInt(month),
        totalAmount: budget.totalAmount,
        carryOverAmount,
      },
    });
  } catch (error) {
    console.error("[Budget] setMonthlyBudget 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "예산 설정에 실패했습니다." },
    });
  }
};

// ─── 카테고리별 예산 설정 (FR-021) ──────────────────────────────────────────
exports.setCategoryBudgets = async (req, res) => {
  const userId = req.user.id;
  const { year, month, categories } = req.body;

  // categories: [{ category: "식비", amount: 300000 }, ...]
  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_INPUT", message: "카테고리 예산 목록을 입력해주세요." },
    });
  }

  const invalid = categories.find(
    (c) => !CATEGORIES.includes(c.category) || c.amount <= 0
  );
  if (invalid) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_CATEGORY", message: "유효하지 않은 카테고리 또는 금액입니다." },
    });
  }

  try {
    const upserts = await Promise.all(
      categories.map((c) =>
        db.CategoryBudget.upsert({
          userId,
          year: parseInt(year),
          month: parseInt(month),
          category: c.category,
          amount: c.amount,
        })
      )
    );

    return res.status(200).json({
      success: true,
      data: {
        year: parseInt(year),
        month: parseInt(month),
        categories: categories.map((c) => ({
          category: c.category,
          amount: c.amount,
        })),
      },
    });
  } catch (error) {
    console.error("[Budget] setCategoryBudgets 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "카테고리 예산 설정에 실패했습니다." },
    });
  }
};

// ─── 예산 달성률 조회 (FR-023) ───────────────────────────────────────────────
exports.getBudgetStatus = async (req, res) => {
  const userId = req.user.id;
  const { year, month } = req.query;

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // 전체 예산 조회
    const budget = await db.Budget.findOne({
      where: { userId, year: parseInt(year), month: parseInt(month) },
    });

    // 이번 달 총 지출
    const totalSpent = await db.Expense.sum("amount", {
      where: { userId, spentAt: { [Op.between]: [startDate, endDate] } },
    }) || 0;

    // 카테고리별 예산 및 지출
    const categoryBudgets = await db.CategoryBudget.findAll({
      where: { userId, year: parseInt(year), month: parseInt(month) },
    });

    const categoryStatus = await Promise.all(
      categoryBudgets.map(async (cb) => {
        const spent = await db.Expense.sum("amount", {
          where: {
            userId,
            category: cb.category,
            spentAt: { [Op.between]: [startDate, endDate] },
          },
        }) || 0;
        const usageRate = Math.round((spent / cb.amount) * 1000) / 10;
        return {
          category: cb.category,
          budget: cb.amount,
          spent,
          usageRate,
          // FR-022: 80% / 100% 임계값 상태
          status: usageRate >= 100 ? "exceeded" : usageRate >= 80 ? "warning" : "normal",
        };
      })
    );

    const totalUsageRate = budget
      ? Math.round((totalSpent / budget.totalAmount) * 1000) / 10
      : null;

    return res.status(200).json({
      success: true,
      data: {
        year: parseInt(year),
        month: parseInt(month),
        total: {
          budget: budget ? budget.totalAmount : null,
          spent: totalSpent,
          remaining: budget ? budget.totalAmount - totalSpent : null,
          usageRate: totalUsageRate,
          status:
            totalUsageRate === null
              ? "no_budget"
              : totalUsageRate >= 100
              ? "exceeded"
              : totalUsageRate >= 80
              ? "warning"
              : "normal",
        },
        categories: categoryStatus,
      },
    });
  } catch (error) {
    console.error("[Budget] getBudgetStatus 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "예산 현황 조회에 실패했습니다." },
    });
  }
};

// ─── 예산 삭제 ───────────────────────────────────────────────────────────────
exports.deleteBudget = async (req, res) => {
  const userId = req.user.id;
  const { year, month } = req.params;

  try {
    const deleted = await db.Budget.destroy({
      where: { userId, year: parseInt(year), month: parseInt(month) },
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "해당 예산을 찾을 수 없습니다." },
      });
    }

    await db.CategoryBudget.destroy({
      where: { userId, year: parseInt(year), month: parseInt(month) },
    });

    return res.status(200).json({ success: true, message: "예산이 삭제되었습니다." });
  } catch (error) {
    console.error("[Budget] deleteBudget 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "예산 삭제에 실패했습니다." },
    });
  }
};
