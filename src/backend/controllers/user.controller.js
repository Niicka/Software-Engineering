// src/backend/controllers/user.controller.js
// 사용자 인증 및 계정 관리 비즈니스 로직

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "moneysani_secret";
const JWT_EXPIRES_IN = "7d";

// ─── 회원가입 (FR-001) ───────────────────────────────────────────────────────
exports.register = async (req, res) => {
  const { email, password, nickname } = req.body;

  try {
    const existing = await db.User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: "EMAIL_DUPLICATE", message: "이미 사용 중인 이메일입니다." },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.User.create({ email, passwordHash, nickname });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(201).json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        nickname: user.nickname,
        token,
      },
    });
  } catch (error) {
    console.error("[User] register 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "회원가입에 실패했습니다." },
    });
  }
};

// ─── 로그인 (FR-002) ─────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await db.User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "이메일 또는 비밀번호가 올바르지 않습니다." },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: "INVALID_CREDENTIALS", message: "이메일 또는 비밀번호가 올바르지 않습니다." },
      });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(200).json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        nickname: user.nickname,
        token,
      },
    });
  } catch (error) {
    console.error("[User] login 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "로그인에 실패했습니다." },
    });
  }
};

// ─── 내 프로필 조회 (FR-003) ─────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await db.User.findByPk(userId, {
      attributes: ["id", "email", "nickname", "profileImageUrl", "createdAt"],
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        nickname: user.nickname,
        profileImageUrl: user.profileImageUrl,
        joinedAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("[User] getProfile 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "프로필 조회에 실패했습니다." },
    });
  }
};

// ─── 프로필 수정 (FR-004) ─────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { nickname, profileImageUrl } = req.body;

  try {
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." },
      });
    }

    await user.update({
      ...(nickname !== undefined && { nickname }),
      ...(profileImageUrl !== undefined && { profileImageUrl }),
    });

    return res.status(200).json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        nickname: user.nickname,
        profileImageUrl: user.profileImageUrl,
      },
    });
  } catch (error) {
    console.error("[User] updateProfile 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "프로필 수정에 실패했습니다." },
    });
  }
};

// ─── 비밀번호 변경 (FR-005) ──────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." },
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: "INVALID_PASSWORD", message: "현재 비밀번호가 올바르지 않습니다." },
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await user.update({ passwordHash: newHash });

    return res.status(200).json({ success: true, message: "비밀번호가 변경되었습니다." });
  } catch (error) {
    console.error("[User] changePassword 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "비밀번호 변경에 실패했습니다." },
    });
  }
};

// ─── 회원 탈퇴 (FR-006) ──────────────────────────────────────────────────────
exports.deleteAccount = async (req, res) => {
  const userId = req.user.id;
  const { password } = req.body;

  try {
    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: "INVALID_PASSWORD", message: "비밀번호가 올바르지 않습니다." },
      });
    }

    await user.destroy();
    return res.status(200).json({ success: true, message: "계정이 삭제되었습니다." });
  } catch (error) {
    console.error("[User] deleteAccount 오류:", error);
    return res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "회원 탈퇴에 실패했습니다." },
    });
  }
};
