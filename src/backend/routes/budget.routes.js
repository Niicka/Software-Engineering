// src/backend/routes/budget.routes.js
// 예산 설정 관련 API 라우터 (FR-020 ~ FR-024)

const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const { body, query, validationResult } = require("express-validator");
const budgetController = require("../controllers/budget.controller");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: { code: "INVALID_REQUEST", message: errors.array()[0].msg },
    });
  }
  next();
};

/**
 * POST /budgets
 * 전체 월 예산 설정 (FR-020, FR-024 이월)
 */
router.post(
  "/",
  authenticate,
  [
    body("year").isInt({ min: 2020, max: 2100 }).withMessage("유효한 연도를 입력하세요."),
    body("month").isInt({ min: 1, max: 12 }).withMessage("월은 1~12 사이여야 합니다."),
    body("totalAmount").isInt({ min: 1 }).withMessage("예산은 1원 이상이어야 합니다."),
    body("carryOver").optional().isBoolean(),
  ],
  handleValidationErrors,
  budgetController.setMonthlyBudget
);

/**
 * POST /budgets/categories
 * 카테고리별 예산 설정 (FR-021)
 */
router.post(
  "/categories",
  authenticate,
  [
    body("year").isInt({ min: 2020, max: 2100 }).withMessage("유효한 연도를 입력하세요."),
    body("month").isInt({ min: 1, max: 12 }).withMessage("월은 1~12 사이여야 합니다."),
    body("categories").isArray({ min: 1 }).withMessage("카테고리 목록을 입력해주세요."),
  ],
  handleValidationErrors,
  budgetController.setCategoryBudgets
);

/**
 * GET /budgets/status
 * 예산 달성률 및 현황 조회 (FR-022, FR-023)
 */
router.get(
  "/status",
  authenticate,
  [
    query("year").isInt({ min: 2020, max: 2100 }).withMessage("유효한 연도를 입력하세요."),
    query("month").isInt({ min: 1, max: 12 }).withMessage("월은 1~12 사이여야 합니다."),
  ],
  handleValidationErrors,
  budgetController.getBudgetStatus
);

/**
 * DELETE /budgets/:year/:month
 * 예산 삭제
 */
router.delete("/:year/:month", authenticate, budgetController.deleteBudget);

module.exports = router;
