package com.flowstock.domain.article.dto

import com.flowstock.domain.article.entity.Article
import com.flowstock.domain.article.entity.ArticleCategory
import com.flowstock.domain.article.entity.Comment
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.LocalDateTime

data class ArticleSummary(
    val id: Long,
    val title: String,
    val category: ArticleCategory,
    val authorId: Long,
    val authorName: String,
    val viewCount: Int,
    val likeCount: Int,
    val commentCount: Int,
    val createdAt: LocalDateTime,
) {
    companion object {
        fun from(a: Article): ArticleSummary = ArticleSummary(
            id = a.id,
            title = a.title,
            category = a.category,
            authorId = a.member.id,
            authorName = a.member.nickname,
            viewCount = a.viewCount,
            likeCount = a.likeCount,
            commentCount = a.comments.size,
            createdAt = a.createdAt,
        )
    }
}

data class ArticleDetail(
    val id: Long,
    val title: String,
    val content: String,
    val category: ArticleCategory,
    val authorId: Long,
    val authorName: String,
    val viewCount: Int,
    val likeCount: Int,
    val likedByMe: Boolean,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime,
    val comments: List<CommentDto>,
) {
    companion object {
        fun from(a: Article, comments: List<Comment>, likedByMe: Boolean): ArticleDetail =
            ArticleDetail(
                id = a.id,
                title = a.title,
                content = a.content,
                category = a.category,
                authorId = a.member.id,
                authorName = a.member.nickname,
                viewCount = a.viewCount,
                likeCount = a.likeCount,
                likedByMe = likedByMe,
                createdAt = a.createdAt,
                updatedAt = a.updatedAt,
                comments = comments.map(CommentDto::from),
            )
    }
}

data class CommentDto(
    val id: Long,
    val authorId: Long,
    val authorName: String,
    val content: String,
    val createdAt: LocalDateTime,
) {
    companion object {
        fun from(c: Comment): CommentDto = CommentDto(
            id = c.id,
            authorId = c.member.id,
            authorName = c.member.nickname,
            content = c.content,
            createdAt = c.createdAt,
        )
    }
}

data class ArticleCreateRequest(
    @field:NotBlank @field:Size(max = 200) val title: String,
    @field:NotBlank @field:Size(max = 50_000) val content: String,
    val category: ArticleCategory = ArticleCategory.GENERAL,
)

data class ArticleUpdateRequest(
    @field:NotBlank @field:Size(max = 200) val title: String,
    @field:NotBlank @field:Size(max = 50_000) val content: String,
    val category: ArticleCategory = ArticleCategory.GENERAL,
)

data class CommentCreateRequest(
    @field:NotBlank @field:Size(max = 5_000) val content: String,
)
