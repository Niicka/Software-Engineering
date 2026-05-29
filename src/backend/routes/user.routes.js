// src/backend/routes/user.routes.js
// 사용자 인증 및 계정 관련 API 라우터

const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const { body, validationResult } = require("express-validator");
const userController = require("../controllers/user.controller");

// ─── 유효성 검사 미들웨어 ────────────────────────────────────────────────────
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

const validateRegister = [
  body("email").isEmail().withMessage("유효한 이메일 형식이 아닙니다."),
  body("password")
    .isLength({ min: 8 })
    .withMessage("비밀번호는 8자 이상이어야 합니다."),
  body("nickname")
    .isLength({ min: 2, max: 10 })
    .withMessage("닉네임은 2~10자 사이여야 합니다."),
];

const validateLogin = [
  body("email").isEmail().withMessage("유효한 이메일 형식이 아닙니다."),
  body("password").notEmpty().withMessage("비밀번호를 입력해주세요."),
];

// ─── 라우트 정의 ─────────────────────────────────────────────────────────────

/**
 * POST /users/register
 * 회원가입 (FR-001)
 */
router.post(
  "/register",
  validateRegister,
  handleValidationErrors,
  userController.register
);

/**
 * POST /users/login
 * 로그인 (FR-002)
 */
router.post(
  "/login",
  validateLogin,
  handleValidationErrors,
  userController.login
);

/**
 * GET /users/me
 * 내 프로필 조회 (FR-003)
 */
router.get("/me", authenticate, userController.getProfile);

/**
 * PATCH /users/me
 * 프로필 수정 (FR-004)
 */
router.patch(
  "/me",
  authenticate,
  [
    body("nickname")
      .optional()
      .isLength({ min: 2, max: 10 })
      .withMessage("닉네임은 2~10자 사이여야 합니다."),
    body("profileImageUrl")
      .optional()
      .isURL()
      .withMessage("올바른 이미지 URL 형식이 아닙니다."),
  ],
  handleValidationErrors,
  userController.updateProfile
);

/**
 * PATCH /users/me/password
 * 비밀번호 변경 (FR-005)
 */
router.patch(
  "/me/password",
  authenticate,
  [
    body("currentPassword").notEmpty().withMessage("현재 비밀번호를 입력해주세요."),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("새 비밀번호는 8자 이상이어야 합니다."),
  ],
  handleValidationErrors,
  userController.changePassword
);

/**
 * DELETE /users/me
 * 회원 탈퇴 (FR-006)
 */
router.delete(
  "/me",
  authenticate,
  [body("password").notEmpty().withMessage("비밀번호를 입력해주세요.")],
  handleValidationErrors,
  userController.deleteAccount
);

module.exports = router;
