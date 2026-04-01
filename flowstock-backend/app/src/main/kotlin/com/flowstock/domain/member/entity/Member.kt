package com.flowstock.domain.member.entity

import com.flowstock.global.common.BaseEntity
import com.flowstock.global.exception.BusinessException
import com.flowstock.global.exception.ErrorCode
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.springframework.security.crypto.password.PasswordEncoder

@Entity
@Table(name = "members")
class Member(

    @Column(nullable = false, unique = true, length = 100)
    val email: String,

    @Column(length = 255)
    var password: String? = null,

    @Column(nullable = false, length = 50)
    var nickname: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var role: Role = Role.USER,

    @Column(length = 100)
    var googleId: String? = null,

    @Column(length = 100)
    var naverId: String? = null,

    @Column(length = 20)
    var provider: String? = null,

    @Column(length = 500)
    var profileImageUrl: String? = null,

    @Column(nullable = false)
    var isProfileCompleted: Boolean = false,

) : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    fun verifyPassword(rawPassword: String, encoder: PasswordEncoder) {
        if (password == null || !encoder.matches(rawPassword, password)) {
            throw BusinessException(ErrorCode.USER_INVALID_CREDENTIAL)
        }
    }

    companion object {
        fun createForSignup(
            email: String,
            password: String,
            nickname: String,
            role: Role = Role.USER,
        ) = Member(
            email = email,
            password = password,
            nickname = nickname,
            role = role,
            provider = "LOCAL",
        )

        fun createForOAuth(
            email: String,
            nickname: String,
            googleId: String? = null,
            naverId: String? = null,
            provider: String,
        ) = Member(
            email = email,
            nickname = nickname,
            googleId = googleId,
            naverId = naverId,
            provider = provider,
        )
    }
}

enum class Role {
    USER, ADMIN
}
