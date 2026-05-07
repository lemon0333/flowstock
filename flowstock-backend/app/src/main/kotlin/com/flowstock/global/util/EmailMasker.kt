package com.flowstock.global.util

/**
 * 이메일 마스킹 — 앞 3자만 남기고 나머지는 *.
 * 도메인 그대로 유지.
 *
 * 예: andyhyunbin@gmail.com → and***@gmail.com
 *     ab@x.com               → ab***@x.com
 *     a@x.com                → a***@x.com
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
     * 닉네임 마스킹 — 앞 1-2자만 남기고 나머지는 *.
     * 한글은 1글자 의미 단위라 1자만 노출.
     */
    fun maskNickname(nickname: String?): String {
        if (nickname.isNullOrBlank()) return "익명"
        val len = nickname.length
        return when {
            len <= 1 -> nickname
            len <= 3 -> nickname.take(1) + "*".repeat(len - 1)
            else -> nickname.take(2) + "*".repeat(len - 2)
        }
    }
}
