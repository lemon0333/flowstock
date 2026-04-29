package com.flowstock.domain.article.service

import com.flowstock.domain.article.dto.ArticleCreateRequest
import com.flowstock.domain.article.dto.ArticleDetail
import com.flowstock.domain.article.dto.ArticleSummary
import com.flowstock.domain.article.dto.ArticleUpdateRequest
import com.flowstock.domain.article.dto.CommentCreateRequest
import com.flowstock.domain.article.dto.CommentDto
import com.flowstock.domain.article.entity.Article
import com.flowstock.domain.article.entity.ArticleCategory
import com.flowstock.domain.article.entity.ArticleLike
import com.flowstock.domain.article.entity.Comment
import com.flowstock.domain.article.repository.ArticleLikeRepository
import com.flowstock.domain.article.repository.ArticleRepository
import com.flowstock.domain.article.repository.CommentRepository
import com.flowstock.domain.member.repository.MemberRepository
import com.flowstock.global.exception.BusinessException
import com.flowstock.global.exception.ErrorCode
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class ArticleService(
    private val articleRepository: ArticleRepository,
    private val commentRepository: CommentRepository,
    private val likeRepository: ArticleLikeRepository,
    private val memberRepository: MemberRepository,
) {

    fun list(category: ArticleCategory?, page: Int, size: Int): Page<ArticleSummary> {
        val pageable = PageRequest.of(page, size)
        val pageResult = if (category != null) {
            articleRepository.findByCategoryOrderByCreatedAtDesc(category, pageable)
        } else {
            articleRepository.findAllByOrderByCreatedAtDesc(pageable)
        }
        return pageResult.map(ArticleSummary::from)
    }

    @Transactional
    fun get(articleId: Long, viewerMemberId: Long?): ArticleDetail {
        val article = articleRepository.findByIdWithMember(articleId)
            ?: throw BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시글을 찾을 수 없습니다.")
        article.incrementView()
        val comments = commentRepository.findByArticleIdWithMember(articleId)
        val likedByMe = viewerMemberId?.let { likeRepository.existsByArticleIdAndMemberId(articleId, it) } ?: false
        return ArticleDetail.from(article, comments, likedByMe)
    }

    @Transactional
    fun create(memberId: Long, req: ArticleCreateRequest): Long {
        val member = memberRepository.findById(memberId)
            .orElseThrow { BusinessException(ErrorCode.USER_NOT_FOUND) }
        val article = Article(
            member = member,
            title = req.title,
            content = req.content,
            category = req.category,
        )
        return articleRepository.save(article).id
    }

    @Transactional
    fun update(memberId: Long, articleId: Long, req: ArticleUpdateRequest): ArticleDetail {
        val article = articleRepository.findById(articleId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시글을 찾을 수 없습니다.") }
        if (article.member.id != memberId) {
            throw BusinessException(ErrorCode.FORBIDDEN, "본인 글만 수정할 수 있습니다.")
        }
        article.title = req.title
        article.content = req.content
        article.category = req.category
        val comments = commentRepository.findByArticleIdWithMember(articleId)
        return ArticleDetail.from(article, comments, likedByMe = false)
    }

    @Transactional
    fun delete(memberId: Long, articleId: Long) {
        val article = articleRepository.findById(articleId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시글을 찾을 수 없습니다.") }
        if (article.member.id != memberId) {
            throw BusinessException(ErrorCode.FORBIDDEN, "본인 글만 삭제할 수 있습니다.")
        }
        articleRepository.delete(article)
    }

    @Transactional
    fun addComment(memberId: Long, articleId: Long, req: CommentCreateRequest): CommentDto {
        val article = articleRepository.findById(articleId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시글을 찾을 수 없습니다.") }
        val member = memberRepository.findById(memberId)
            .orElseThrow { BusinessException(ErrorCode.USER_NOT_FOUND) }
        val comment = Comment(article = article, member = member, content = req.content)
        return CommentDto.from(commentRepository.save(comment))
    }

    @Transactional
    fun deleteComment(memberId: Long, commentId: Long) {
        val comment = commentRepository.findById(commentId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "댓글을 찾을 수 없습니다.") }
        if (comment.member.id != memberId) {
            throw BusinessException(ErrorCode.FORBIDDEN, "본인 댓글만 삭제할 수 있습니다.")
        }
        commentRepository.delete(comment)
    }

    @Transactional
    fun toggleLike(memberId: Long, articleId: Long): Boolean {
        val article = articleRepository.findById(articleId)
            .orElseThrow { BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "게시글을 찾을 수 없습니다.") }
        val existing = likeRepository.findByArticleIdAndMemberId(articleId, memberId)
        return if (existing != null) {
            likeRepository.delete(existing)
            article.likeCount = (article.likeCount - 1).coerceAtLeast(0)
            false
        } else {
            val member = memberRepository.findById(memberId)
                .orElseThrow { BusinessException(ErrorCode.USER_NOT_FOUND) }
            likeRepository.save(ArticleLike(article = article, member = member))
            article.likeCount += 1
            true
        }
    }
}
