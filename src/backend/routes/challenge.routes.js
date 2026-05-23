// src/backend/routes/challenge.routes.js
// 절약 챌린지 관련 API 라우터 (FR-030 ~ FR-033)

const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const { query, validationResult } = require("express-validator");
const challengeController = require("../controllers/challenge.controller");

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
 * GET /challenges
 * 챌린지 목록 조회 (FR-030)
 */
router.get("/", authenticate, challengeController.getChallenges);

/**
 * GET /challenges/me
 * 내 챌린지 진행 현황 조회 (FR-031)
 */
router.get(
  "/me",
  authenticate,
  [
    query("status")
      .optional()
      .isIn(["IN_PROGRESS", "SUCCESS", "FAILED", "CANCELLED"])
      .withMessage("유효하지 않은 상태값입니다."),
  ],
  handleValidationErrors,
  challengeController.getMyChallenges
);

/**
 * POST /challenges/:challengeId/join
 * 챌린지 참여: NONE → IN_PROGRESS (FR-031)
 */
router.post("/:challengeId/join", authenticate, challengeController.joinChallenge);

/**
 * PATCH /challenges/me/:userChallengeId/cancel
 * 챌린지 취소: IN_PROGRESS → CANCELLED (FR-031)
 */
router.patch("/me/:userChallengeId/cancel", authenticate, challengeController.cancelChallenge);

module.exports = router;
