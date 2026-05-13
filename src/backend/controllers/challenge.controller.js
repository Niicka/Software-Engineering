// src/backend/controllers/challenge.controller.js
// 절약 챌린지 비즈니스 로직 (FR-030 ~ FR-036)
//
// UserChallenge 상태 전이 (hw4 §3.3.3):
//   NONE → IN_PROGRESS → SUCCESS | FAILED | CANCELLED
//   SUCCESS / FAILED → IN_PROGRESS (재참여 시 새 레코드 생성)

const { Op } = require("sequelize");
const db = require("../models");

const STATUS = {
  IN_PROGRESS: "IN_PROGRESS",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
};

// ─── 챌린지 목록 조회 (FR-030) ───────────────────────────────────────────────
exports.getChallenges = async (req, res) => {
  try {
    const challenges = await db.Challenge.findAll({
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({ success: true, data: challenges });
  } catch (error) {
    console.error("[Challenge] getChallenges 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "챌린지 목록 조회에 실패했습니다." },
    });
  }
};

// ─── 챌린지 참여 (FR-031): NONE → IN_PROGRESS ───────────────────────────────
exports.joinChallenge = async (req, res) => {
  const userId = req.user.id;
  const { challengeId } = req.params;

  try {
    const challenge = await db.Challenge.findByPk(challengeId);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "챌린지를 찾을 수 없습니다." },
      });
    }

    // 이미 진행 중인지 확인
    const existing = await db.UserChallenge.findOne({
      where: { userId, challengeId, status: STATUS.IN_PROGRESS },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: "ALREADY_JOINED", message: "이미 참여 중인 챌린지입니다." },
      });
    }

    // 새 UserChallenge 레코드 생성 (NONE → IN_PROGRESS)
    const userChallenge = await db.UserChallenge.create({
      userId,
      challengeId,
      status: STATUS.IN_PROGRESS,
      progressRate: 0,
      joinedAt: new Date(),
    });

    // 챌린지 시작 알림 발송 (비동기)
    sendPushNotification(userId, {
      title: "🎯 챌린지 시작!",
      body: `'${challenge.title}' 챌린지가 시작됐어요. 함께 절약해봐요!`,
    }).catch(console.error);

    return res.status(201).json({
      success: true,
      data: {
        userChallengeId: userChallenge.id,
        challengeId,
        status: STATUS.IN_PROGRESS,
        joinedAt: userChallenge.joinedAt,
      },
    });
  } catch (error) {
    console.error("[Challenge] joinChallenge 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "챌린지 참여에 실패했습니다." },
    });
  }
};

// ─── 챌린지 진행 현황 조회 (FR-031) ─────────────────────────────────────────
exports.getMyChallenges = async (req, res) => {
  const userId = req.user.id;
  const { status } = req.query;

  try {
    const where = { userId };
    if (status) where.status = status;

    const records = await db.UserChallenge.findAll({
      where,
      include: [{ model: db.Challenge }],
      order: [["joinedAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: records.map((uc) => ({
        userChallengeId: uc.id,
        challengeId: uc.challengeId,
        title: uc.Challenge?.title,
        status: uc.status,
        progressRate: uc.progressRate,
        joinedAt: uc.joinedAt,
      })),
    });
  } catch (error) {
    console.error("[Challenge] getMyChallenges 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "챌린지 현황 조회에 실패했습니다." },
    });
  }
};

// ─── 챌린지 참여 취소 (FR-031): IN_PROGRESS → CANCELLED ─────────────────────
exports.cancelChallenge = async (req, res) => {
  const userId = req.user.id;
  const { userChallengeId } = req.params;

  try {
    const uc = await db.UserChallenge.findOne({
      where: { id: userChallengeId, userId },
    });
    if (!uc) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "참여 내역을 찾을 수 없습니다." },
      });
    }
    if (uc.status !== STATUS.IN_PROGRESS) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_STATUS", message: "진행 중인 챌린지만 취소할 수 있습니다." },
      });
    }

    await uc.update({ status: STATUS.CANCELLED });

    return res.status(200).json({ success: true, message: "챌린지 참여가 취소되었습니다." });
  } catch (error) {
    console.error("[Challenge] cancelChallenge 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "챌린지 취소에 실패했습니다." },
    });
  }
};

// ─── 챌린지 성공/실패 판정 (FR-032): IN_PROGRESS → SUCCESS | FAILED ──────────
// 스케줄러 또는 소비 내역 저장 시 호출
exports.judgeChallenge = async (userChallengeId) => {
  const uc = await db.UserChallenge.findByPk(userChallengeId, {
    include: [{ model: db.Challenge }],
  });
  if (!uc || uc.status !== STATUS.IN_PROGRESS) return;

  const challenge = uc.Challenge;
  const now = new Date();

  // 기간 미만료: 진행률만 갱신
  if (now < new Date(challenge.endDate)) {
    const progressRate = await calcProgressRate(uc, challenge);
    await uc.update({ progressRate });
    return;
  }

  // 기간 만료: 최종 성공/실패 판정
  const progressRate = await calcProgressRate(uc, challenge);
  const isSuccess = progressRate >= 100;
  const newStatus = isSuccess ? STATUS.SUCCESS : STATUS.FAILED;

  await uc.update({ status: newStatus, progressRate });

  if (isSuccess) {
    // 포인트·뱃지 지급 (FR-033)
    await db.Point.create({
      userId: uc.userId,
      amount: challenge.rewardPoint,
      reason: `챌린지 성공: ${challenge.title}`,
    });
    await sendPushNotification(uc.userId, {
      title: "🎉 챌린지 성공!",
      body: `'${challenge.title}' 달성! ${challenge.rewardPoint}P 적립됐어요.`,
    });
  } else {
    await sendPushNotification(uc.userId, {
      title: "챌린지 종료",
      body: `'${challenge.title}'에 아쉽게 실패했어요. 다시 도전해볼까요? 💪`,
    });
  }
};

// ─── 내부 헬퍼: 챌린지 달성률 계산 ──────────────────────────────────────────
async function calcProgressRate(uc, challenge) {
  const { joinedAt } = uc;
  const endDate = new Date(challenge.endDate);

  // 챌린지 조건: 기간 내 특정 카테고리 지출이 limitAmount 이하
  const totalSpent = await db.Expense.sum("amount", {
    where: {
      userId: uc.userId,
      category: challenge.targetCategory,
      spentAt: { [Op.between]: [joinedAt, endDate] },
    },
  }) || 0;

  if (!challenge.limitAmount || challenge.limitAmount === 0) return 0;
  // 지출이 한도 이하일수록 달성률 높음
  const saved = Math.max(0, challenge.limitAmount - totalSpent);
  return Math.min(100, Math.round((saved / challenge.limitAmount) * 100));
}

// FCM 푸시 알림 발송 (stub)
async function sendPushNotification(userId, { title, body }) {
  // TODO: Firebase Admin SDK 실제 구현
  console.log(`[FCM] userId=${userId} | title="${title}" | body="${body}"`);
}
