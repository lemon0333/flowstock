package com.flowstock.global.util

/**
 * 작성자 표시 — 닉네임이 default(이메일 prefix)가 아니면 닉네임 그대로 노출,
 * default면 이메일 마스킹 폴백.
 *
 * 정책 (사용자 결정):
 * - 닉네임을 사용자가 직접 수정한 경우 → 닉네임 그대로 노출 (마스킹 X)
 * - 닉네임이 OAuth 가입 시 자동 생성된 default(이메일 또는 이메일 prefix와 동일)면 → 이메일 마스킹
 *
 * 예: andyhyunbin@gmail.com → and***@gmail.com
 *     ab@x.com               → ab***@x.com
 *     "현빈손"(직접 수정한 닉네임)  → "현빈손" (그대로)
 */
object EmailMasker {
    fun mask(email: String?): String {
        if (email.isNullOrBlank()) return "익명"
        val at = email.indexOf("@")
        if (at <= 0) return "***"
        val local = email.substring(0, at)
        val domain = email.substring(at)
        val keep = local.take(3)
        return "$keep***$domain"
    }

    /**
     * 작성자 라벨 결정 — 닉네임 수정 여부에 따라 닉네임 그대로 vs 이메일 마스킹.
     *
     * @param nickname 회원 닉네임 (현재값)
     * @param email 회원 이메일
     * @param isDefault 닉네임이 default(자동 생성)인지 (Member.isProfileCompleted == false 등으로 판단 가능)
     */
    fun authorLabel(nickname: String?, email: String?, isDefault: Boolean): String {
        if (isDefault || nickname.isNullOrBlank()) {
            return mask(email)
        }
        return nickname
    }
}
