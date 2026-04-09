// src/backend/routes/expense.routes.js
// 소비 내역 관련 API 라우터

const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const { body, query, validationResult } = require("express-validator");
const expenseController = require("../controllers/expense.controller");

// ─── 유효성 검사 미들웨어 ────────────────────────────────────────────────────
const validateExpense = [
  body("amount")
    .isInt({ min: 1 })
    .withMessage("금액은 1원 이상의 정수여야 합니다."),
  body("category")
    .isIn(["식비", "쇼핑", "교통", "구독", "여가", "기타"])
    .withMessage("유효하지 않은 카테고리입니다."),
  body("memo")
    .optional()
    .isLength({ max: 50 })
    .withMessage("메모는 최대 50자까지 입력 가능합니다."),
  body("spentAt")
    .isISO8601()
    .withMessage("올바른 날짜 형식(ISO8601)이 아닙니다."),
];

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

// ─── 라우트 정의 ─────────────────────────────────────────────────────────────

/**
 * POST /expenses
 * 소비 내역 등록
 */
router.post(
  "/",
  authenticate,
  validateExpense,
  handleValidationErrors,
  expenseController.createExpense
);

/**
 * GET /expenses
 * 소비 내역 목록 조회 (필터링, 페이지네이션)
 */
router.get(
  "/",
  authenticate,
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("startDate").optional().isDate(),
    query("endDate").optional().isDate(),
  ],
  handleValidationErrors,
  expenseController.getExpenses
);

/**
 * GET /expenses/report/monthly
 * 월간 소비 리포트
 */
router.get(
  "/report/monthly",
  authenticate,
  [
    query("year").isInt({ min: 2020, max: 2100 }).withMessage("유효한 연도를 입력하세요."),
    query("month").isInt({ min: 1, max: 12 }).withMessage("월은 1~12 사이여야 합니다."),
  ],
  handleValidationErrors,
  expenseController.getMonthlyReport
);

/**
 * DELETE /expenses/:expenseId
 * 소비 내역 삭제
 */
router.delete("/:expenseId", authenticate, expenseController.deleteExpense);

module.exports = router;
