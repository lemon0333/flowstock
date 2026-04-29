package com.flowstock.domain.article.repository

import com.flowstock.domain.article.entity.Article
import com.flowstock.domain.article.entity.ArticleCategory
import com.flowstock.domain.article.entity.ArticleLike
import com.flowstock.domain.article.entity.Comment
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface ArticleRepository : JpaRepository<Article, Long> {
    fun findAllByOrderByCreatedAtDesc(pageable: Pageable): Page<Article>
    fun findByCategoryOrderByCreatedAtDesc(category: ArticleCategory, pageable: Pageable): Page<Article>

    @Query("SELECT a FROM Article a JOIN FETCH a.member WHERE a.id = :id")
    fun findByIdWithMember(id: Long): Article?
}

interface CommentRepository : JpaRepository<Comment, Long> {
    @Query("SELECT c FROM Comment c JOIN FETCH c.member WHERE c.article.id = :articleId ORDER BY c.createdAt ASC")
    fun findByArticleIdWithMember(articleId: Long): List<Comment>
}

interface ArticleLikeRepository : JpaRepository<ArticleLike, Long> {
    fun findByArticleIdAndMemberId(articleId: Long, memberId: Long): ArticleLike?
    fun deleteByArticleIdAndMemberId(articleId: Long, memberId: Long): Long
    fun existsByArticleIdAndMemberId(articleId: Long, memberId: Long): Boolean
}
