# src/ai/impulse_detector.py
# AI 기반 충동소비 탐지 모듈
#
# 사용자의 과거 소비 패턴과 현재 지출을 비교하여
# 충동소비 여부를 탐지하고 개인화된 절약 팁을 생성합니다.

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional


# ─── 데이터 모델 ─────────────────────────────────────────────────────────────

@dataclass
class AnalysisResult:
    """충동소비 탐지 결과"""
    is_impulse: bool
    confidence: float          # 0.0 ~ 1.0
    reason: str
    tip: Optional[str]
    estimated_saving: Optional[int]  # 절약 가능 금액 (원)
    alternative: Optional[str]


# ─── 카테고리별 절약 팁 데이터베이스 ────────────────────────────────────────

SAVING_TIPS = {
    "식비": [
        {
            "tip": "오늘처럼 외식 대신 집밥을 해먹으면 한 끼에 평균 8,000원을 절약할 수 있어요! 🍳",
            "alternative": "집밥 요리, 편의점 도시락 활용",
            "saving": 8000,
        },
        {
            "tip": "배달앱 주문을 주 2회 줄이면 한 달에 약 40,000원을 아낄 수 있어요. 🚴",
            "alternative": "포장 주문 (배달비 절약), 도시락 싸오기",
            "saving": 40000,
        },
        {
            "tip": "카페 대신 텀블러에 커피를 담아 다니면 하루 4,500원, 한 달 약 90,000원을 절약해요! ☕",
            "alternative": "편의점 RTD 커피, 믹스커피, 홈카페",
            "saving": 90000,
        },
    ],
    "쇼핑": [
        {
            "tip": "구매 전 24시간 기다려보세요! 충동구매의 60%는 하루가 지나면 욕구가 사라진다고 해요. 🛍️",
            "alternative": "위시리스트에 추가 후 할인 기다리기",
            "saving": 30000,
        },
        {
            "tip": "중고 거래 플랫폼을 이용하면 원하는 물건을 30~70% 저렴하게 구매할 수 있어요! ♻️",
            "alternative": "당근마켓, 번개장터 등 중고 거래",
            "saving": 20000,
        },
    ],
    "교통": [
        {
            "tip": "택시 대신 대중교통을 이용하면 한 번에 평균 12,000원을 절약할 수 있어요. 🚇",
            "alternative": "지하철, 버스, 따릉이(자전거) 이용",
            "saving": 12000,
        },
    ],
    "구독": [
        {
            "tip": "현재 이용 중인 구독 서비스를 점검해보세요. 평균적으로 월 25,000원 상당의 불필요한 구독이 있다고 해요! 📱",
            "alternative": "가족 공유 플랜, 무료 체험 기간 활용",
            "saving": 25000,
        },
    ],
    "여가": [
        {
            "tip": "문화누리카드나 통신사 할인을 이용하면 영화·공연을 최대 50% 할인받을 수 있어요! 🎬",
            "alternative": "조조 영화, 도서관 문화 프로그램 활용",
            "saving": 7000,
        },
    ],
    "기타": [
        {
            "tip": "이 지출이 정말 필요한지 한 번 더 생각해보세요. 절약의 첫걸음은 인식에서 시작돼요! 💪",
            "alternative": "대안 소비 방법 탐색",
            "saving": 10000,
        },
    ],
}


# ─── 충동소비 탐지 클래스 ────────────────────────────────────────────────────

class ImpulseSpendingDetector:
    """
    규칙 기반 + 통계적 분석을 결합한 충동소비 탐지기

    탐지 기준:
    1. 현재 지출이 같은 카테고리 30일 평균 지출의 N배 초과
    2. 현재 지출이 해당 카테고리 일평균의 M배 초과
    3. 야간 시간대(22시~04시) 고액 지출
    """

    # 탐지 임계값 설정
    DAILY_AVG_MULTIPLIER = 3.0    # 일평균의 3배 초과 시 충동소비 의심
    MONTHLY_AVG_MULTIPLIER = 2.0  # 월평균의 2배 초과 시 과소비 경고
    NIGHT_HOUR_START = 22
    NIGHT_HOUR_END = 4
    MIN_TRANSACTION_COUNT = 5     # 분석에 필요한 최소 거래 건수

    def analyze(
        self,
        amount: int,
        category: str,
        spent_at: datetime,
        expense_history: pd.DataFrame,
    ) -> AnalysisResult:
        """
        소비 내역을 분석하여 충동소비 여부를 판단합니다.

        Args:
            amount: 현재 지출 금액 (원)
            category: 소비 카테고리
            spent_at: 지출 일시
            expense_history: 과거 소비 내역 DataFrame
                             컬럼: [amount, category, spent_at]

        Returns:
            AnalysisResult: 탐지 결과
        """
        # 분석에 충분한 데이터가 없는 경우
        if expense_history is None or len(expense_history) < self.MIN_TRANSACTION_COUNT:
            return AnalysisResult(
                is_impulse=False,
                confidence=0.0,
                reason="분석을 위한 충분한 소비 데이터가 없습니다.",
                tip=None, estimated_saving=None, alternative=None,
            )

        # 같은 카테고리 데이터만 필터링
        cat_history = expense_history[expense_history["category"] == category].copy()

        if len(cat_history) < 3:
            return AnalysisResult(
                is_impulse=False, confidence=0.0,
                reason=f"'{category}' 카테고리 데이터가 부족합니다.",
                tip=None, estimated_saving=None, alternative=None,
            )

        # 통계 계산
        cat_history["spent_at"] = pd.to_datetime(cat_history["spent_at"])
        thirty_days_ago = spent_at - timedelta(days=30)
        recent = cat_history[cat_history["spent_at"] >= thirty_days_ago]

        if len(recent) == 0:
            return AnalysisResult(
                is_impulse=False, confidence=0.0,
                reason="최근 30일 내 동일 카테고리 지출 내역이 없습니다.",
                tip=None, estimated_saving=None, alternative=None,
            )

        daily_avg = recent["amount"].sum() / 30
        single_avg = recent["amount"].mean()
        max_single = recent["amount"].max()

        # ── 탐지 규칙 적용 ──
        is_impulse = False
        confidence = 0.0
        reason = ""

        # 규칙 1: 단건 일평균의 3배 초과
        if daily_avg > 0 and amount >= daily_avg * self.DAILY_AVG_MULTIPLIER:
            is_impulse = True
            ratio = amount / daily_avg
            confidence = min(0.9, 0.5 + (ratio - self.DAILY_AVG_MULTIPLIER) * 0.1)
            reason = f"일평균 {category} 지출({int(daily_avg):,}원)의 {ratio:.1f}배에 해당하는 지출이에요."

        # 규칙 2: 단건 평균의 2배 초과 (더 강한 신호)
        elif single_avg > 0 and amount >= single_avg * self.MONTHLY_AVG_MULTIPLIER:
            is_impulse = True
            ratio = amount / single_avg
            confidence = min(0.8, 0.4 + (ratio - self.MONTHLY_AVG_MULTIPLIER) * 0.15)
            reason = f"평소 {category} 건당 지출({int(single_avg):,}원)보다 {ratio:.1f}배 많은 지출이에요."

        # 규칙 3: 야간 고액 지출 (단건 최고 지출 이상)
        hour = spent_at.hour
        is_night = hour >= self.NIGHT_HOUR_START or hour < self.NIGHT_HOUR_END
        if is_night and amount >= max_single and amount >= 20000:
            is_impulse = True
            confidence = max(confidence, 0.6)
            reason = f"야간 시간대({hour}시)의 {category} 지출이 감지되었어요. 충동구매일 수 있어요!"

        if not is_impulse:
            return AnalysisResult(
                is_impulse=False, confidence=0.0,
                reason="정상 소비 범위 내에 있습니다.",
                tip=None, estimated_saving=None, alternative=None,
            )

        # 절약 팁 선택 (카테고리별 랜덤)
        tips = SAVING_TIPS.get(category, SAVING_TIPS["기타"])
        selected_tip = tips[hash(str(amount) + category) % len(tips)]

        return AnalysisResult(
            is_impulse=True,
            confidence=round(confidence, 2),
            reason=reason,
            tip=selected_tip["tip"],
            estimated_saving=selected_tip["saving"],
            alternative=selected_tip["alternative"],
        )


# ─── Flask API 서버 ──────────────────────────────────────────────────────────

from flask import Flask, request, jsonify

app = Flask(__name__)
detector = ImpulseSpendingDetector()


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "module": "impulse-detector"}), 200


@app.route("/analyze", methods=["POST"])
def analyze_spending():
    """
    충동소비 분석 엔드포인트

    Request Body:
        {
            "userId": "uuid-1234",
            "amount": 45000,
            "category": "식비",
            "spentAt": "2026-03-16T22:30:00Z",
            "history": [
                {"amount": 8000, "category": "식비", "spent_at": "2026-03-15T12:00:00Z"},
                ...
            ]
        }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "요청 데이터가 없습니다."}), 400

    required_fields = ["userId", "amount", "category", "spentAt", "history"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"'{field}' 필드가 누락되었습니다."}), 400

    try:
        amount = int(data["amount"])
        category = data["category"]
        spent_at = datetime.fromisoformat(data["spentAt"].replace("Z", "+00:00"))
        history_df = pd.DataFrame(data["history"]) if data["history"] else pd.DataFrame()

        result = detector.analyze(amount, category, spent_at, history_df)

        return jsonify({
            "isImpulse": result.is_impulse,
            "confidence": result.confidence,
            "reason": result.reason,
            "tip": result.tip,
            "estimatedSaving": result.estimated_saving,
            "alternative": result.alternative,
        }), 200

    except (ValueError, KeyError) as e:
        return jsonify({"error": f"데이터 처리 오류: {str(e)}"}), 400
    except Exception as e:
        print(f"[AI] 분석 오류: {e}")
        return jsonify({"error": "분석 중 오류가 발생했습니다."}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
