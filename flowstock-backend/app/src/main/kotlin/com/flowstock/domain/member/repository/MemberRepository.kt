package com.flowstock.domain.member.repository

import com.flowstock.domain.member.entity.Member
import org.springframework.data.jpa.repository.JpaRepository

interface MemberRepository : JpaRepository<Member, Long> {

    fun findByEmail(email: String): Member?

    fun existsByEmail(email: String): Boolean

    fun findByGoogleId(googleId: String): Member?

    fun findByNaverId(naverId: String): Member?
}
